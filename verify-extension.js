/* ============================================================
 * GHL Tab Renamer — Quality Gate Verifier
 * Run:  node verify-extension.js
 *
 * Scans the extension directory for:
 *   1. JS syntax errors (all .js files)
 *   2. CSS brace balance (all .css files)
 *   3. Manifest.json structural validation
 *   4. Anti-patterns (ghost shortcuts, missing guards, stale versions)
 *   5. Accessibility gaps (missing role/tabindex, no focus-visible, hidden inputs)
 *
 * Exit code 0 = all clear. Exit code 1 = issues found.
 * ============================================================ */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
let errors = 0;
let warnings = 0;
let passes = 0;

function fail(msg)  { console.log("  ❌ FAIL  " + msg); errors++; }
function warn(msg)  { console.log("  ⚠️ WARN  " + msg); warnings++; }
function ok(msg)    { console.log("  ✅ PASS  " + msg); passes++; }

function read(f)    { return fs.readFileSync(path.join(ROOT, f), "utf-8"); }
function exists(f)  { return fs.existsSync(path.join(ROOT, f)); }

/* ================================================================
 * 1. JAVASCRIPT SYNTAX CHECK
 * ================================================================ */
console.log("\n── JS Syntax ──");
const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".js") && !f.startsWith("verify-"));
for (const f of jsFiles) {
  try { new Function(read(f)); ok(f); }
  catch (e) { fail(f + " — " + e.message.slice(0, 100)); }
}

/* ================================================================
 * 2. CSS BRACE BALANCE
 * ================================================================ */
console.log("\n── CSS Brace Balance ──");
const cssFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".css"));
for (const f of cssFiles) {
  const code = read(f);
  let depth = 0;
  for (const ch of code) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) { fail(f + " — unmatched '}'"); depth = 0; break; }
  }
  if (depth === 0) ok(f);
  else if (depth > 0) warn(f + " — " + depth + " unclosed '{' (may be template literal)");
}

/* ================================================================
 * 3. MANIFEST VALIDATION
 * ================================================================ */
console.log("\n── Manifest ──");
let manifest;
try {
  manifest = JSON.parse(read("manifest.json"));
  ok("manifest.json is valid JSON");
} catch (e) {
  fail("manifest.json — invalid JSON: " + e.message);
  manifest = {};
}

if (manifest.manifest_version === 3) ok("manifest_version: 3");
else if (manifest.manifest_version) fail("manifest_version must be 3, got " + manifest.manifest_version);
else fail("manifest_version missing");

if (manifest.name) ok("name: " + manifest.name);
else fail("name missing");

if (manifest.version) ok("version: " + manifest.version);
else fail("version missing");

// Commands: max 4
if (manifest.commands) {
  const cmdKeys = Object.keys(manifest.commands);
  if (cmdKeys.length <= 4) ok("commands: " + cmdKeys.length + " (max 4 allowed)");
  else fail("commands: " + cmdKeys.length + " — Chrome hard limit is 4, extension will fail to load");

  // Check for known Chrome conflicts
  const knownConflicts = {
    "Ctrl+Shift+G": "Find Previous (Chrome built-in)",
    "Ctrl+Shift+N": "New Incognito Window (Chrome built-in)",
    "Ctrl+Shift+A": "Search Tabs (Chrome built-in)",
    "Ctrl+Shift+T": "Reopen Closed Tab (Chrome built-in)",
    "Ctrl+Shift+M": "Device Mode DevTools (Chrome built-in)",
    "Ctrl+Shift+J": "DevTools Console (Chrome built-in)",
    "Ctrl+Shift+B": "Toggle Bookmarks Bar (Chrome built-in)",
    "Ctrl+Shift+O": "Bookmarks Manager (Chrome built-in)",
  };
  for (const [cmdName, cmdObj] of Object.entries(manifest.commands)) {
    const key = (cmdObj.suggested_key && cmdObj.suggested_key.default) || "";
    if (knownConflicts[key]) {
      warn("command '" + cmdName + "' uses " + key + " — CONFLICTS with " + knownConflicts[key] + " (shortcut silently dropped, extension still loads)");
    }
  }
} else {
  warn("no commands defined");
}

// Permissions
if (manifest.permissions) {
  ok("permissions: " + manifest.permissions.length + " declared");
} else {
  warn("no permissions declared");
}

// Content scripts: check config.js/utils.js is included
if (manifest.content_scripts) {
  for (const cs of manifest.content_scripts) {
    const jsList = cs.js || [];
    const hasConfig = jsList.some(f => f === "config.js" || f === "utils.js");
    if (hasConfig) ok("content_scripts includes config/utils: " + jsList.join(", "));
    else warn("content_scripts missing config/utils.js — may cause ReferenceError");
  }
}

/* ================================================================
 * 4. HTML ANTI-PATTERNS
 * ================================================================ */
console.log("\n── HTML Anti-Patterns ──");
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
for (const f of htmlFiles) {
  const html = read(f);

  // Ghost shortcuts: shortcut text that doesn't match manifest commands
  const shortcutMentions = html.match(/Ctrl\+Shift\+\w/g) || [];
  if (manifest.commands) {
    const validKeys = Object.values(manifest.commands)
      .map(c => (c.suggested_key && c.suggested_key.default) || "")
      .filter(Boolean);
    for (const mention of shortcutMentions) {
      if (!validKeys.includes(mention)) {
        fail(f + " mentions ghost shortcut " + mention + " — not defined in manifest commands");
      }
    }
    if (shortcutMentions.length === 0) ok(f + " — no shortcut mentions (or none found)");
  }

  // Version mismatch with manifest
  const versionMatch = html.match(/v(\d+\.\d+\.\d+)/g);
  if (versionMatch && manifest.version) {
    for (const v of versionMatch) {
      const ver = v.replace("v", "");
      if (ver !== manifest.version) {
        fail(f + " shows version " + v + " but manifest.json is v" + manifest.version);
      }
    }
  }
}

/* ================================================================
 * 5. JS ANTI-PATTERNS
 * ================================================================ */
console.log("\n── JS Anti-Patterns ──");
for (const f of jsFiles) {
  const code = read(f);
  const nm = f;

  // importScripts in non-background files
  if (nm !== "background.js" && code.includes("importScripts(")) {
    fail(nm + " uses importScripts() — only works in service workers, use <script> tag instead");
  }

  // chrome.tabGroups without runtime guard
  if (code.includes("chrome.tabGroups") && !code.includes("if (!chrome.tabGroups)")) {
    warn(nm + " uses chrome.tabGroups without runtime guard — may break on Vivaldi/forks");
  }

  // onclick= instead of addEventListener (brittle, can't use AbortController)
  const onclickCount = (code.match(/\.onclick\s*=/g) || []).length;
  if (onclickCount > 0) {
    warn(nm + " uses .onclick = ... (" + onclickCount + " occurrences) — prefer addEventListener with {signal}");
  }
}

/* ================================================================
 * 6. CSS ANTI-PATTERNS
 * ================================================================ */
console.log("\n── CSS Anti-Patterns ──");
for (const f of cssFiles) {
  const code = read(f);

  // display:none on inputs (hides from accessibility tree)
  const hiddenInputs = code.match(/input\s*\{[^}]*display\s*:\s*none[^}]*\}/gi) || [];
  if (hiddenInputs.length > 0) {
    warn(f + " — input{display:none} found (" + hiddenInputs.length + "x) — use visually-hidden pattern instead");
  }

  // opacity:0 on inputs without focus-visible fallback
  if (code.includes("opacity: 0") || code.includes("opacity:0")) {
    if (code.includes("focus-visible")) {
      ok(f + " — has opacity:0 inputs AND focus-visible fallback");
    } else {
      warn(f + " — opacity:0 on inputs but NO focus-visible rule — keyboard focus is invisible");
    }
  }

  // No focus-visible at all
  if (!code.includes("focus-visible")) {
    fail(f + " — NO :focus-visible rules — keyboard users can't see focus");
  } else {
    ok(f + " — focus-visible rules present");
  }
}

/* ================================================================
 * 7. ACCESSIBILITY PATTERNS
 * ================================================================ */
console.log("\n── Accessibility Patterns ──");
for (const f of jsFiles) {
  const code = read(f);

  // Divs with click/addEventListener but no role/tabindex
  // Simple heuristic: find .addEventListener("click" patterns and check nearby for role/tabindex
  const clickLines = code.split("\n")
    .map((line, i) => ({ line, idx: i + 1 }))
    .filter(l => l.line.includes('.addEventListener("click"') || l.line.includes('.addEventListener(\'click\''));

  // This is a heuristic — not perfect. We'll flag if a file has many click handlers
  // and very few role/tabindex assignments.
  const roleCount = (code.match(/setAttribute\("role"/g) || []).length;
  const tabindexCount = (code.match(/setAttribute\("tabindex"/g) || []).length;
  const ariaLabelCount = (code.match(/setAttribute\("aria-label"/g) || []).length;

  if (f === "content.js" && clickLines.length > 5 && roleCount === 0) {
    warn(f + " — " + clickLines.length + " click handlers but ZERO role assignments — check for divs used as buttons");
  }
}

/* ================================================================
 * 8. STORAGE KEY CONSISTENCY
 * ================================================================ */
console.log("\n── Storage Consistency ──");
const allCode = jsFiles.map(f => read(f)).join("\n");
// Check that storage keys used in get/set match across files (basic heuristic)
const storageGets = allCode.match(/chrome\.storage\.\w+\.get\([^)]*\)/g) || [];
const storageSets = allCode.match(/chrome\.storage\.\w+\.set\([^)]*\)/g) || [];
if (storageGets.length > 0 && storageSets.length > 0) {
  ok("storage reads: " + storageGets.length + ", writes: " + storageSets.length);
}

/* ================================================================
 * SUMMARY
 * ================================================================ */
console.log("\n══════════════════════════════════════");
console.log("  RESULTS:  " + passes + " passed, " + warnings + " warnings, " + errors + " errors");
console.log("══════════════════════════════════════");

if (errors > 0) {
  console.log("\n❌ QUALITY GATE FAILED — fix the errors above before shipping.\n");
  console.log("   Reload reminder: chrome://extensions → refresh icon on GHL Tab Renamer card\n");
  process.exit(1);
} else if (warnings > 0) {
  console.log("\n⚠️  QUALITY GATE PASSED WITH WARNINGS — review warnings above.\n");
  console.log("   Reload reminder: chrome://extensions → refresh icon on GHL Tab Renamer card\n");
  process.exit(0);
} else {
  console.log("\n✅ QUALITY GATE PASSED — all checks clean.\n");
  console.log("   Reload reminder: chrome://extensions → refresh icon on GHL Tab Renamer card\n");
  process.exit(0);
}
