/* ============================================================
 * GHL Tab Renamer — content.js
 * Injected into GHL pages. Builds the redesigned floater chip,
 * notes panel, quick-nav, and global tab switcher.
 *
 * Features:
 *  - Dynamic tab title + favicon (per-client color + initial)
 *  - Draggable floater chip (click vs drag threshold)
 *  - Per-client rich notepad (markdown, checklists, pin, history)
 *  - Note reminders (snooze) — chip pulses amber when due
 *  - Undo (Cmd/Ctrl+Z) walks note history
 *  - Note templates with variable substitution
 *  - Quick section navigation dropdown
 *  - Global tab switcher (search open tabs + known clients + notes)
 *  - Per-client context snapshot
 *  - Activity time tracking
 *  - Unread conversation observer
 *  - First-run onboarding tooltip
 * ============================================================ */
(() => {
  "use strict";

  /* -------------------- State -------------------- */
  let settings = {};
  let currentLocId = null;
  let clientName = "GHL Client";
  let sectionName = "Dashboard";

  let wrapper = null;
  let chip = null;
  let panel = null;
  let editor = null;
  let quickNav = null;
  let switcherOverlay = null;

  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0, dragStartY = 0, dragOrigX = 0, dragOrigY = 0;
  let chipPos = { x: null, y: null };

  let panelOpen = false;
  let historyOpen = false;
  let tplMenuOpen = false;
  let reminderMenuOpen = false;
  let sectionMenuOpen = false;

  let saveTimer = null;
  let savedAgo = 0;
  let charCount = 0;
  let undoStack = []; // recent html states for undo
  let lastClientSeen = null;

  let unreadObserver = null;
  let activityTimer = null;

  // Multi-Note System (Floatnote-inspired)
  let notesV2 = [];           // array of {id, name, content, createdAt, updatedAt}
  let activeNoteIdV2 = null;  // currently active note ID
  let noteTabBar = null;
  let mdContainer = null;
  let mdEditor = null;        // markdown textarea
  let mdPreview = null;       // markdown preview pane
  let markdownMode = false;   // whether markdown mode is active
  let reminderChecker = null;
  let savedAgoTimer = null;
  let accumulatedSeconds = 0;
  let asanaViewMode = "list";

  /* -------------------- Icon set (inline SVG) -------------------- */
  const ICON = {
    grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    chevron: '<svg class="ghl-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.76a2 2 0 0 0 .59 1.41l1.7 1.7A1 1 0 0 1 16.59 16H7.41a1 1 0 0 1-.7-1.71l1.7-1.71A2 2 0 0 0 9 10.76z"/></svg>',
    pinOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.34a2 2 0 0 1-.59 1.41l-1.7 1.7A1 1 0 0 0 7.41 15h9.18a1 1 0 0 0 .7-1.71l-1.7-1.7A2 2 0 0 1 15 9.34z"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/></svg>',
    italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
    checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M4 6l1 1 2-2"/><path d="M4 12l1 1 2-2"/><path d="M4 18l1 1 2-2"/></svg>',
    template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h14"/><path d="M3 13l8-8 7 7-8 8H6z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    corner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
  };

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* -------------------- Markdown <-> HTML -------------------- */
  function mdToHtml(md) {
    if (!md) return "";
    let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    h = h.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    h = h.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\*(.*?)\*/g, "<em>$1</em>");
    h = h.replace(/^- \[x\] (.*)$/gm, '<div class="ghl-todo"><input type="checkbox" checked><span class="ghl-todo-text done">$1</span></div>');
    h = h.replace(/^- \[ \] (.*)$/gm, '<div class="ghl-todo"><input type="checkbox"><span class="ghl-todo-text">$1</span></div>');
    h = h.replace(/\n/g, "<br>");
    return h;
  }

  function htmlToMd(html) {
    if (!html) return "";
    const tmp = el("div", null, html);
    // todos
    tmp.querySelectorAll(".ghl-todo").forEach(row => {
      const cb = row.querySelector("input[type=checkbox]");
      const txt = row.querySelector(".ghl-todo-text");
      const text = txt ? txt.textContent : "";
      const checked = cb && (cb.checked || cb.hasAttribute("checked"));
      row.replaceWith(document.createTextNode(checked ? `- [x] ${text}` : `- [ ] ${text}`));
    });
    let s = tmp.innerHTML;
    s = s.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
    s = s.replace(/<b>(.*?)<\/b>/gi, "**$1**");
    s = s.replace(/<em>(.*?)<\/em>/gi, "*$1**");
    s = s.replace(/<i>(.*?)<\/i>/gi, "*$1**");
    s = s.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/div>/gi, "\n").replace(/<div[^>]*>/gi, "");
    s = s.replace(/<[^>]+>/g, "");
    s = s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return s.replace(/\n{3,}/g, "\n\n").trim();
  }

  /* -------------------- Markdown Parser (Floatnote-inspired) -------------------- */
  function parseMD(src) {
    if (!src) return "";
    const lines = src.split("\n");
    let out = "", inCode = false, codeBuf = "";
    function flushInline(s) {
      s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
      s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
      s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      return s;
    }
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (/^```/.test(line.trim())) {
        if (!inCode) { inCode = true; codeBuf = ""; continue; }
        else { out += "<pre><code>" + escMD(codeBuf.trimEnd()) + "</code></pre>\n"; inCode = false; codeBuf = ""; continue; }
      }
      if (inCode) { codeBuf += line + "\n"; continue; }
      const trimmed = line.trim();
      if (!trimmed) { out += "\n"; continue; }
      if (/^(-{3,}|\*{3,})$/.test(trimmed)) { out += "<hr>\n"; continue; }
      const hdr = trimmed.match(/^(#{1,6})\s+(.+)/);
      if (hdr) { out += "<h" + hdr[1].length + ">" + flushInline(hdr[2]) + "</h" + hdr[1].length + ">\n"; continue; }
      if (trimmed.startsWith("> ")) { out += "<blockquote><p>" + flushInline(trimmed.slice(2)) + "</p></blockquote>\n"; continue; }
      const task = trimmed.match(/^[-*+]\s+\[([ x])\]\s+(.+)/i);
      if (task) {
        const checked = task[1].toLowerCase() === "x";
        out += "<div class=\"ghl-md-task" + (checked ? " ghl-md-checked" : "") + "\">" +
               "<input type=\"checkbox\" " + (checked ? "checked" : "") + " disabled>" +
               "<span>" + flushInline(task[2]) + "</span></div>\n";
        continue;
      }
      const ul = trimmed.match(/^[-*+]\s+(.+)/);
      if (ul) { out += "<li>" + flushInline(ul[1]) + "</li>\n"; continue; }
      out += "<p>" + flushInline(line) + "</p>\n";
    }
    if (inCode) out += "<pre><code>" + escMD(codeBuf.trimEnd()) + "</code></pre>\n";
    out = out.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");
    return out;
  }
  function escMD(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // Resolve template variables
  function resolveTemplateVars(text) {
    if (!settings.templateVariables) return text;
    const today = new Date().toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    return text
      .replace(/\{client\}/g, clientName)
      .replace(/\{section\}/g, sectionName)
      .replace(/\{date\}/g, today)
      .replace(/\{user\}/g, "Me");
  }

  /* -------------------- Location / Section / Client -------------------- */
  function getLocationId() {
    const p = window.location.pathname.split("/").filter(Boolean);
    const i = p.indexOf("location");
    return i !== -1 ? p[i + 1] : null;
  }

  function getSection() {
    const p = window.location.pathname.split("/").filter(Boolean);
    const i = p.indexOf("location");
    if (i === -1) return "Dashboard";
    const slug = p[i + 2];
    if (!slug) return "Dashboard";
    const found = SECTIONS.find(s => s.slug === slug.toLowerCase());
    return found ? found.label : (slug.charAt(0).toUpperCase() + slug.slice(1));
  }

  function getClientName() {
    const locId = getLocationId();
    // prefer nickname from settings
    if (locId && settings.clientNicknames && settings.clientNicknames[locId]) {
      return settings.clientNicknames[locId];
    }
    const node = document.querySelector(".hl_switcher-loc-name");
    if (node && node.textContent.trim()) {
      const name = node.textContent.trim();
      if (locId) {
        sessionStorage.setItem(`ghl_name_${locId}`, name);
        // persist to extension storage for cross-tab use
        try {
          chrome.storage.local.get("client_names", (res) => {
            const map = res.client_names || {};
            if (map[locId] !== name) {
              map[locId] = name;
              chrome.storage.local.set({ client_names: map });
            }
          });
          // also cache the URL for this client so the command palette can open it later
          const url = window.location.href;
          chrome.storage.local.get("ghl_client_urls", (res2) => {
            const urls = res2.ghl_client_urls || {};
            urls[locId] = url;
            chrome.storage.local.set({ ghl_client_urls: urls });
          });
        } catch (e) {}
      }
      return name;
    }
    const alt = document.querySelector('[class*="switcher-loc-name"],[class*="location-name"],[class*="loc-name"]');
    if (alt && alt.textContent.trim()) return alt.textContent.trim();
    if (locId) {
      const cached = sessionStorage.getItem(`ghl_name_${locId}`);
      if (cached) return cached;
    }
    return "GHL Client";
  }

  function getAccentColor() {
    return (settings.clientColors && settings.clientColors[currentLocId]) || "#8b5cf6";
  }

  function buildTitle(cl, sec, isGrouped) {
    if (!cl && !sec) return null;
    cl = cl || "GHL Client";
    sec = sec || "Dashboard";
    let tpl = settings.titleTemplate || "{client} | {section}";
    if (isGrouped && settings.shortTitleWhenGrouped) {
      tpl = "{unread} {section}";
    }
    const unread = parseInt(sessionStorage.getItem("ghl_unread_count") || "0");
    const unreadStr = unread > 0 ? `(${unread})` : "";
    let r = tpl
      .replace("{client}", cl)
      .replace("{section}", sec)
      .replace("{unread}", unreadStr)
      .trim();
    r = r.replace(/\s*\|\s*\|\s*/g, " | ").replace(/^\|/, "").replace(/\|$/, "").trim();
    return r;
  }

  /* -------------------- Favicon -------------------- */
  function generateFavicon(color, letter) {
    if (!settings.enabled) return;
    const canvas = document.createElement("canvas");
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d");
    // rounded square
    const r = 8;
    ctx.fillStyle = color || "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(32, 0, 32, 32, r);
    ctx.arcTo(32, 32, 0, 32, r);
    ctx.arcTo(0, 32, 0, 0, r);
    ctx.arcTo(0, 0, 32, 0, r);
    ctx.fill();
    ctx.font = "bold 19px -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((letter || "G").toUpperCase(), 16, 17);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = canvas.toDataURL("image/x-icon");
  }

  /* -------------------- Storage helpers -------------------- */
  function noteKey(id) { return `ghl_notes_${id}`; }
  function noteKeyV2(id) { return `ghl_notes_v2_${id}`; }
  function pinKey(id) { return `ghl_pin_${id}`; }
  function histKey(id) { return `ghl_hist_${id}`; }
  function reminderKey(id) { return `ghl_reminder_${id}`; }
  function activityKey() { return "activity_timer"; }
  function lastWorkedKey(id) { return `ghl_last_worked_${id}`; }

  function getLocal(key) {
    return new Promise((res) => {
      try { chrome.storage.local.get(key, (d) => res(d && d[key])); }
      catch (e) { res(null); }
    });
  }
  function setLocal(obj) {
    try { chrome.storage.local.set(obj); } catch (e) {}
  }

  /* -------------------- Build wrapper + chip -------------------- */
  function buildWrapper() {
    if (wrapper) return;
    wrapper = el("div");
    wrapper.id = "ghl-wrapper";
    applyTheme();
    applyLayout();
    document.body.appendChild(wrapper);
  }

  function applyTheme() {
    if (!wrapper) return;
    let t = settings.theme || "dark";
    if (t === "auto") {
      t = document.documentElement.classList.contains("dark") ||
           document.body.classList.contains("dark") ||
           window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    }
    wrapper.classList.remove("theme-dark", "theme-light");
    wrapper.classList.add(t === "light" ? "theme-light" : "theme-dark");
    const accent = getAccentColor();
    wrapper.style.setProperty("--ghl-accent", accent);
    wrapper.style.setProperty("--ghl-accent-soft", hexToRgba(accent, 0.14));
  }

  function applyLayout() {
    if (!wrapper) return;
    const pos = settings.badgePosition || "top-right";
    wrapper.style.left = wrapper.style.right = wrapper.style.top = wrapper.style.bottom = "";
    wrapper.style.transform = "";
    wrapper.classList.remove("docked-bottom");
    if (chip) chip.classList.remove("bottom-tab");

    if (chipPos.x != null) {
      wrapper.style.left = chipPos.x + "px";
      wrapper.style.top = chipPos.y + "px";
      wrapper.style.right = "auto";
      wrapper.style.alignItems = "flex-start";
    } else if (pos === "bottom-tab") {
      wrapper.classList.add("docked-bottom");
      if (chip) chip.classList.add("bottom-tab");
    } else {
      if (pos.startsWith("top")) wrapper.style.top = (pos === "top-center" ? "6px" : "14px");
      else wrapper.style.bottom = "14px";
      if (pos.endsWith("left")) wrapper.style.left = "22px";
      else if (pos.endsWith("right")) { wrapper.style.right = "22px"; wrapper.style.alignItems = "flex-end"; }
      else { wrapper.style.left = "50%"; wrapper.style.transform = "translateX(-50%)"; wrapper.style.alignItems = "center"; }
    }
    wrapper.style.opacity = settings.badgeOpacity ?? 0.95;
    if (settings.badgeAutoHide) {
      wrapper.style.opacity = "0.08";
      wrapper.onmouseenter = () => { wrapper.style.opacity = settings.badgeOpacity; };
      wrapper.onmouseleave = () => { wrapper.style.opacity = "0.08"; };
    } else {
      wrapper.onmouseenter = wrapper.onmouseleave = null;
    }
  }

  function buildChip(titleText) {
    chip = el("div", "ghl-chip");
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-label", `Toggle client hub — ${clientName} · ${sectionName}`);
    chip.innerHTML =
      `<span class="ghl-chip-accent"></span>` +
      `<span class="ghl-chip-grip">${ICON.grip}</span>` +
      `<span class="ghl-dot"></span>` +
      `<span class="ghl-chip-label">` +
        `<span class="ghl-chip-name">${clientName}</span>` +
        `<span class="ghl-chip-sep">·</span>` +
        `<span class="ghl-chip-section">${sectionName}</span>` +
      `</span>` +
      `<span class="ghl-unread" style="display:none"></span>` +
      `<span class="ghl-chip-timer">${ICON.clock}<span class="ghl-timer-val">00:00</span></span>` +
      `<button class="ghl-chip-btn ghl-chip-collapse" title="Collapse to icon">−</button>` +
      `<button class="ghl-chip-btn" title="Toggle notes (Ctrl+Shift+E)">${ICON.chevron}</button>`;
    wrapper.appendChild(chip);

    // click vs drag
    chip.addEventListener("pointerdown", onChipPointerDown);
    chip.addEventListener("pointermove", onChipPointerMove);
    chip.addEventListener("pointerup", onChipPointerUp);

    // expand button
    chip.querySelector(".ghl-chip-btn:not(.ghl-chip-collapse)").addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // collapse toggle button — shrinks chip to icon-only mode
    const collapseBtn = chip.querySelector(".ghl-chip-collapse");
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const collapsed = chip.classList.toggle("collapsed");
      collapseBtn.title = collapsed ? "Expand chip" : "Collapse to icon";
      collapseBtn.textContent = collapsed ? "+" : "−";
      chip.setAttribute("aria-label", collapsed
        ? `Expand chip — ${clientName} · ${sectionName}`
        : `Toggle client hub — ${clientName} · ${sectionName}`);
      sessionStorage.setItem("ghl_chip_collapsed", collapsed ? "1" : "0");
    });

    // Restore collapsed state from previous session
    if (sessionStorage.getItem("ghl_chip_collapsed") === "1") {
      chip.classList.add("collapsed");
      collapseBtn.title = "Expand chip";
      collapseBtn.textContent = "+";
      chip.setAttribute("aria-label", `Expand chip — ${clientName} · ${sectionName}`);
    }

    // Keyboard: Enter/Space toggles panel (skip if on any chip button)
    chip.addEventListener("keydown", (e) => {
      if (e.target.closest(".ghl-chip-btn")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        togglePanel();
      }
    });

    updateChipTitle(titleText);
  }

  function updateChipTitle(titleText) {
    if (!chip) return;
    chip.querySelector(".ghl-chip-name").textContent = clientName;
    chip.querySelector(".ghl-chip-section").textContent = sectionName;
    // Keep aria-label in sync with current client/section
    chip.setAttribute("aria-label", `Toggle client hub — ${clientName} · ${sectionName}`);
    const unread = parseInt(sessionStorage.getItem("ghl_unread_count") || "0");
    const ub = chip.querySelector(".ghl-unread");
    if (unread > 0) { ub.style.display = ""; ub.textContent = unread; chip.querySelector(".ghl-dot").classList.add("pulse"); }
    else { ub.style.display = "none"; chip.querySelector(".ghl-dot").classList.remove("pulse"); }
  }

  /* -------------------- Drag (click vs drag threshold) -------------------- */
  function onChipPointerDown(e) {
    if (e.target.closest(".ghl-chip-btn")) return;
    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    dragOrigX = rect.left;
    dragOrigY = rect.top;
    chip.setPointerCapture(e.pointerId);
    chip.classList.add("dragging");
  }
  function onChipPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!dragMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) dragMoved = true;
    if (!dragMoved) return;
    const nx = Math.max(8, Math.min(dragOrigX + dx, window.innerWidth - (wrapper.offsetWidth || 300) - 8));
    const ny = Math.max(8, Math.min(dragOrigY + dy, window.innerHeight - 50 - 8));
    chipPos = { x: nx, y: ny };
    wrapper.style.left = nx + "px";
    wrapper.style.top = ny + "px";
    wrapper.style.right = "auto";
    wrapper.style.bottom = "auto";
    wrapper.style.transform = "none";
    wrapper.style.alignItems = "flex-start";
  }
  function onChipPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    chip.classList.remove("dragging");
    try { chip.releasePointerCapture(e.pointerId); } catch (err) {}
    if (dragMoved) {
      setLocal({ ghl_chip_pos: chipPos });
    } else {
      togglePanel();
    }
  }

  /* -------------------- Panel toggle -------------------- */
  function togglePanel() {
    panelOpen = !panelOpen;
    const btn = chip ? chip.querySelector(".ghl-chip-btn") : null;
    if (panelOpen) {
      buildPanel();
      if (btn) btn.classList.add("expanded");
      if (panel) panel.style.display = "";
      loadNotes();
      savedAgo = 0;
    } else {
      // Flush any pending save before closing the panel
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveCurrentNoteContent();  // sync editor → v2 array before persisting
      saveNotes();
      if (editor) saveNotesV2();
      if (btn) btn.classList.remove("expanded");
      if (panel) {
        panel.style.display = "none";
      }
      closeAllDropdowns();
    }
  }

  function closeAllDropdowns() {
    historyOpen = tplMenuOpen = reminderMenuOpen = sectionMenuOpen = false;
    renderPanelState();
  }

  /* -------------------- Build notes panel -------------------- */
  function buildPanel() {
    if (panel) { loadNotes(); return; }
    panel = el("div", "ghl-panel");
    panel.style.display = "";
    
    // Apply saved dimensions from settings to survive refreshes!
    let savedWidth = settings.panelWidth || 308;
    let savedHeight = settings.panelHeight || 500;
    
    // Safety Clamping: Ensure the panel always fits comfortably inside the browser viewport!
    const maxWidthLimit = window.innerWidth - 40;
    const maxHeightLimit = window.innerHeight - 100; // Leaves 100px padding to stay above taskbar
    
    if (savedWidth > maxWidthLimit) savedWidth = maxWidthLimit;
    if (savedHeight > maxHeightLimit) savedHeight = maxHeightLimit;
    
    panel.style.width = savedWidth + "px";
    panel.style.height = savedHeight + "px";

    // header
    const header = el("div", "ghl-panel-header");
    header.innerHTML =
      `<span class="ghl-avatar">${clientName.charAt(0)}</span>` +
      `<div class="ghl-panel-title">` +
        `<div class="ghl-panel-name">${clientName}</div>` +
        `<div class="ghl-panel-sub"><span class="ghl-sub-sec">${sectionName}</span><span>·</span><span class="ghl-sub-time">00:00</span></div>` +
      `</div>` +
      `<div class="ghl-panel-actions">` +
        `<button class="ghl-icon-btn ghl-btn-theme" title="Toggle theme">${settings.theme === "light" ? ICON.moon : ICON.sun}</button>` +
        `<button class="ghl-icon-btn ghl-btn-reminder" title="Set reminder">${ICON.bell}</button>` +
        `<button class="ghl-icon-btn ghl-btn-pin" title="Pin note">${ICON.pin}</button>` +
        `<button class="ghl-icon-btn ghl-btn-history" title="History (Alt+Shift+H)">${ICON.history}</button>` +
        `<button class="ghl-icon-btn ghl-btn-close" title="Close">${ICON.close}</button>` +
      `</div>`;
    panel.appendChild(header);

    // snapshot line
    const snap = el("div", "ghl-snapshot");
    snap.innerHTML = `${ICON.info}<span class="ghl-snap-text">Loading…</span>`;
    panel.appendChild(snap);

    // Tab Switcher Bar
    const tabSwitch = el("div", "ghl-panel-tabs");
    tabSwitch.innerHTML = 
      `<button class="ghl-tab-btn active" data-tab="notes">Notes</button>` +
      `<button class="ghl-tab-btn" data-tab="asana">Asana Tasks</button>`;
    panel.appendChild(tabSwitch);

    // Create Views
    const notesView = el("div", "ghl-notes-view");
    panel.appendChild(notesView);

    const asanaView = el("div", "ghl-asana-view");
    asanaView.style.display = "none";
    asanaView.innerHTML = 
      `<div class="ghl-asana-header" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--ghl-border);">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">` +
          `<span style="font-size:11px;font-weight:700;color:var(--ghl-text-muted);text-transform:uppercase;letter-spacing:0.5px;">My Board Tasks</span>` +
          `<div style="display:flex;align-items:center;gap:6px;">` +
            `<button class="ghl-asana-fetch-btn" title="Load task from the pasted link" style="background:var(--ghl-accent); color:#ffffff; border:none; border-radius:6px; padding:4px 10px; font-size:9.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:opacity 0.15s; height:24px; line-height:1; box-shadow:0 1px 3px rgba(0,0,0,0.15);">Fetch Task</button>` +
            `<button class="ghl-asana-refresh" title="Refresh task card" style="background:none;border:none;color:var(--ghl-text-muted);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:color 0.15s,background-color 0.15s;">${ICON.history}</button>` +
          `</div>` +
        `</div>` +
        `<input type="text" class="ghl-asana-link-input" placeholder="Paste Asana Task Link to quick-load & post proof..." style="width:100%; border:1px solid var(--ghl-border); border-radius:6px; background:var(--ghl-input-bg); color:var(--ghl-text); padding:5px 8px; font-size:10px; outline:none; box-sizing:border-box;">` +
      `</div>` +
      `<div class="ghl-asana-list-container">` +
        `<div class="ghl-asana-loading">Select "Asana Tasks" to load...</div>` +
      `</div>`;
    panel.appendChild(asanaView);

    // pinned strip
    const pinned = el("div", "ghl-pinned");
    pinned.style.display = "none";
    pinned.innerHTML = `${ICON.pin}<div class="ghl-pinned-body"></div>`;
    panel.appendChild(pinned);

    // Note Tab Bar (multi-note tabs, Floatnote-inspired)
    noteTabBar = el("div", "ghl-note-tab-bar");
    notesView.appendChild(noteTabBar);

    // history drawer
    const hist = el("div", "ghl-history");
    hist.style.display = "none";
    panel.appendChild(hist);

    // toolbar
    const toolbar = el("div", "ghl-toolbar");
    toolbar.innerHTML =
      `<button class="ghl-tool ghl-t-bold" title="Bold">${ICON.bold}</button>` +
      `<button class="ghl-tool ghl-t-italic" title="Italic">${ICON.italic}</button>` +
      `<button class="ghl-tool ghl-t-check" title="Checklist">${ICON.checklist}</button>` +
      `<span class="ghl-tool-sep"></span>` +
      `<button class="ghl-tool ghl-t-md" title="Toggle Markdown mode">MD</button>` +
      `<div style="position:relative">` +
        `<button class="ghl-tool ghl-t-tpl" title="Templates">${ICON.template}<span>Template</span>${ICON.chevron}</button>` +
      `</div>` +
      `<div style="position:relative">` +
        `<button class="ghl-tool ghl-t-undo" title="Undo (Ctrl+Z)">${ICON.undo}</button>` +
      `</div>` +
      `<span class="ghl-tool-spacer"></span>` +
      `<button class="ghl-tool ghl-t-clear" title="Clear">${ICON.eraser}</button>`;
    notesView.appendChild(toolbar);

    // editor
    editor = el("div", "ghl-editor");
    editor.contentEditable = "true";
    editor.spellcheck = true;
    editor.setAttribute("data-placeholder", "Start typing notes for this client…");
    notesView.appendChild(editor);

    // Markdown container (textarea + preview pane)
    mdContainer = el("div", "ghl-md-container");
    mdEditor = el("textarea", "ghl-md-editor");
    mdEditor.placeholder = "Write markdown…";
    mdEditor.spellcheck = false;
    mdContainer.appendChild(mdEditor);
    mdPreview = el("div", "ghl-md-preview");
    mdContainer.appendChild(mdPreview);
    notesView.appendChild(mdContainer);

    // footer
    const footer = el("div", "ghl-panel-footer");
    footer.style.justifyContent = "flex-end";
    footer.innerHTML =
      `<div class="ghl-footer-meta">` +
        `<span class="ghl-char-count">0 ch</span><span>·</span>` +
        `<span class="ghl-saved-dot"></span><span class="ghl-saved-text">Saved just now</span>` +
      `</div>`;
    notesView.appendChild(footer);

    // insert into wrapper after chip
    // wrapper order: chip, [quicknav], panel
    wrapper.appendChild(panel);

// Easy-Grab Transparent Resizer Bars
    const resizerLeft = el("div", "ghl-panel-resizer-left");
    resizerLeft.style.cssText = "position:absolute; left:-4px; top:0; width:8px; height:100%; cursor:ew-resize; z-index:99999; background:transparent;";
    panel.appendChild(resizerLeft);

    const resizerBottom = el("div", "ghl-panel-resizer-bottom");
    resizerBottom.style.cssText = "position:absolute; left:0; bottom:-4px; width:100%; height:8px; cursor:ns-resize; z-index:99999; background:transparent;";
    panel.appendChild(resizerBottom);

    // Left Border Width Resizing (Horizontal)
    resizerLeft.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startWidth = parseFloat(getComputedStyle(panel).width);
      const startX = e.clientX;
      panel.style.transition = "none"; // disable transitions during drag
      
      const maxW = window.innerWidth - 40;
      
      function doResize(evt) {
        // Dragging left (negative ClientX difference) increases the width!
        const dx = startX - evt.clientX;
        const newWidth = Math.max(280, Math.min(startWidth + dx, maxW));
        panel.style.width = newWidth + "px";
      }
      
      function stopResize() {
        document.removeEventListener("mousemove", doResize);
        document.removeEventListener("mouseup", stopResize);
        panel.style.transition = ""; // restore transitions
        
        // Auto-save the new width to settings!
        settings.panelWidth = parseInt(panel.style.width);
        saveSettings(settings);
      }
      
      document.addEventListener("mousemove", doResize);
      document.addEventListener("mouseup", stopResize);
    });

    // Bottom Border Height Resizing (Vertical)
    resizerBottom.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startHeight = parseFloat(getComputedStyle(panel).height);
      const startY = e.clientY;
      panel.style.transition = "none"; // disable transitions during drag
      
      const maxH = window.innerHeight - 100; // Enforces leaving 100px safety boundary to stay above taskbar
      
      function doResize(evt) {
        const dy = evt.clientY - startY;
        const newHeight = Math.max(300, Math.min(startHeight + dy, maxH));
        panel.style.height = newHeight + "px";
      }
      
      function stopResize() {
        document.removeEventListener("mousemove", doResize);
        document.removeEventListener("mouseup", stopResize);
        panel.style.transition = ""; // restore transitions
        
        // Auto-save the new height to settings!
        settings.panelHeight = parseInt(panel.style.height);
        saveSettings(settings);
      }
      
      document.addEventListener("mousemove", doResize);
      document.addEventListener("mouseup", stopResize);
    });

    // Fail-Safe Reset: Double-clicking any drag edge instantly resets dimensions to default 308px x 500px!
    resizerLeft.addEventListener("dblclick", () => {
      panel.style.width = "308px";
      settings.panelWidth = 308;
      saveSettings(settings);
    });
    resizerBottom.addEventListener("dblclick", () => {
      panel.style.height = "500px";
      settings.panelHeight = 500;
      saveSettings(settings);
    });

    wirePanel();
    loadNotes();
    refreshSnapshot();
    refreshTimer();
  }

  function wirePanel() {
    if (!panel) return;

    // 1. Tab Switching & Refresh Wiring
    try {
      const tabSwitch = panel.querySelector(".ghl-panel-tabs");
      const notesView = panel.querySelector(".ghl-notes-view");
      const asanaView = panel.querySelector(".ghl-asana-view");
      
      if (tabSwitch && notesView && asanaView) {
        tabSwitch.querySelectorAll(".ghl-tab-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            tabSwitch.querySelectorAll(".ghl-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (btn.dataset.tab === "notes") {
              notesView.style.display = "";
              asanaView.style.display = "none";
            } else {
              notesView.style.display = "none";
              asanaView.style.display = "";
              
              const listContainer = panel.querySelector(".ghl-asana-list-container");
              const hasLoadedContent = listContainer && (listContainer.querySelector(".ghl-asana-card") || listContainer.querySelector(".ghl-asana-empty"));
              if (!hasLoadedContent) {
                loadAsanaTasks();
              }
            }
          });
        });
        
        const asanaRefresh = asanaView.querySelector(".ghl-asana-refresh");
        if (asanaRefresh) {
          asanaRefresh.addEventListener("click", () => {
            loadAsanaTasks();
          });
        }

        const linkInput = asanaView.querySelector(".ghl-asana-link-input");
        if (linkInput) {
          linkInput.addEventListener("paste", () => {
            setTimeout(() => {
              const url = linkInput.value.trim();
              if (url) {
                loadSpecificAsanaTask(url);
              }
            }, 50);
          });
          linkInput.addEventListener("change", () => {
            const url = linkInput.value.trim();
            if (url) {
              loadSpecificAsanaTask(url);
            }
          });
        }

        const fetchBtn = asanaView.querySelector(".ghl-asana-fetch-btn");
        if (fetchBtn) {
          fetchBtn.addEventListener("click", () => {
            const linkInput = asanaView.querySelector(".ghl-asana-link-input");
            const url = linkInput ? linkInput.value.trim() : "";
            if (url) {
              loadSpecificAsanaTask(url);
            } else {
              const originalText = fetchBtn.textContent;
              fetchBtn.textContent = "⚠️ Paste link first";
              fetchBtn.style.background = "var(--ghl-red)";
              setTimeout(() => {
                fetchBtn.textContent = originalText;
                fetchBtn.style.background = "var(--ghl-accent)";
              }, 2000);
            }
          });
        }
      }
    } catch(err) {
      console.error("Tab switching wiring error:", err);
    }

    // 2. Panel Action Buttons (Close, Theme, Pin, History, Reminders)
    try {
      const closeBtn = panel.querySelector(".ghl-btn-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => togglePanel());
      }
      
      const themeBtn = panel.querySelector(".ghl-btn-theme");
      if (themeBtn) {
        themeBtn.addEventListener("click", () => {
          const nextTheme = settings.theme === "light" ? "dark" : "light";
          settings.theme = nextTheme;
          saveSettings(settings, () => {
            applyTheme();
            if (themeBtn) themeBtn.innerHTML = nextTheme === "light" ? ICON.moon : ICON.sun;
          });
        });
      }
      
      const pinBtn = panel.querySelector(".ghl-btn-pin");
      if (pinBtn) pinBtn.addEventListener("click", togglePin);
      
      const histBtn = panel.querySelector(".ghl-btn-history");
      if (histBtn) {
        histBtn.addEventListener("click", () => {
          historyOpen = !historyOpen;
          tplMenuOpen = false;
          renderPanelState();
        });
      }
      
      const remBtn = panel.querySelector(".ghl-btn-reminder");
      if (remBtn) {
        remBtn.addEventListener("click", () => {
          reminderMenuOpen = !reminderMenuOpen;
          tplMenuOpen = false;
          historyOpen = false;
          renderPanelState();
        });
      }
    } catch(err) {
      console.error("Action buttons wiring error:", err);
    }

    // 3. Formatting Toolbar & Keyboard Inputs
    try {
      const tBold = panel.querySelector(".ghl-t-bold");
      if (tBold) tBold.addEventListener("click", () => exec("bold"));
      
      const tMd = panel.querySelector(".ghl-t-md");
      if (tMd) tMd.addEventListener("click", toggleMarkdown);
      
      const tItalic = panel.querySelector(".ghl-t-italic");
      if (tItalic) tItalic.addEventListener("click", () => exec("italic"));
      
      const tCheck = panel.querySelector(".ghl-t-check");
      if (tCheck) tCheck.addEventListener("click", insertChecklist);
      
      const tTpl = panel.querySelector(".ghl-t-tpl");
      if (tTpl) {
        tTpl.addEventListener("click", (e) => {
          e.stopPropagation();
          tplMenuOpen = !tplMenuOpen;
          historyOpen = false;
          reminderMenuOpen = false;
          renderPanelState();
        });
      }
      
      const tUndo = panel.querySelector(".ghl-t-undo");
      if (tUndo) tUndo.addEventListener("click", undo);
      
      const tClear = panel.querySelector(".ghl-t-clear");
      if (tClear) tClear.addEventListener("click", clearNotes);

      if (editor) {
        editor.addEventListener("input", onEditorInput);
        editor.addEventListener("keydown", onEditorKeydown);
        editor.addEventListener("focus", () => { if (undoStack.length === 0) pushUndo(); });
        editor.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e.originalEvent || e).clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        });

      // Markdown editor listeners
      if (mdEditor) {
        mdEditor.addEventListener("input", () => {
          saveCurrentNoteContent();
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            saveNotes();
            saveNotesV2();
          }, 700);
          setCharCount();
        });
        mdEditor.addEventListener("keydown", onMdEditorKey);
      }
        
        editor.addEventListener("click", (e) => {
          if (e.target.matches('.ghl-todo input[type=checkbox]')) {
            const txt = e.target.parentElement.querySelector(".ghl-todo-text");
            if (e.target.checked) {
              txt.classList.add("done");
              const taskText = txt.textContent.trim();
              if (taskText && taskText !== "New item") {
                try { addMemoryBankAccomplishment(clientName, taskText); } catch (err) {}
              }
            } else {
              txt.classList.remove("done");
            }
            pushUndo();
            onEditorInput();
          }
        });
      }
    } catch(err) {
      console.error("Toolbar wiring error:", err);
    }

    // 4. Global Document Click Outside
    try {
      document.addEventListener("click", (e) => {
        if (!panelOpen) return;
        if (e.target.closest(".ghl-dropdown") || e.target.closest(".ghl-tool")) return;
        if (tplMenuOpen || reminderMenuOpen || sectionMenuOpen) {
          tplMenuOpen = reminderMenuOpen = sectionMenuOpen = false;
          renderPanelState();
        }
      });
    } catch(err) {}
  }

  /* -------------------- Editor actions -------------------- */
  function exec(cmd) {
    editor.focus();
    document.execCommand(cmd, false);
    pushUndo();
    onEditorInput();
  }

  function insertChecklist() {
    editor.focus();
    const node = el("div", "ghl-todo");
    node.innerHTML = '<input type="checkbox"><span class="ghl-todo-text">New item</span>';
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      const span = node.querySelector(".ghl-todo-text");
      range.setStart(span, 0);
      range.setEnd(span, 0);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.appendChild(node);
    }
    pushUndo();
    onEditorInput();
  }

  function loadTemplate(text) {
    const resolved = resolveTemplateVars(text);
    editor.innerHTML = mdToHtml(resolved);
    tplMenuOpen = false;
    pushUndo();
    onEditorInput();
    renderPanelState();
  }

  function clearNotes() {
    if (markdownMode && mdEditor) {
      mdEditor.value = "";
      saveTimer = setTimeout(saveNotes, 700);
      setCharCount();
      mdEditor.focus();
    } else if (editor) {
      editor.innerHTML = "";
      pushUndo();
      saveTimer = setTimeout(saveNotes, 700);
      setCharCount();
      editor.focus();
    }
  }

  /* -------------------- Markdown Mode Toggle & Preview -------------------- */
  function toggleMarkdown() {
    markdownMode = !markdownMode;
    const mdBtn = panel ? panel.querySelector(".ghl-t-md") : null;
    
    // Save current content first
    saveCurrentNoteContent();
    
    if (markdownMode) {
      // Switch to markdown mode
      if (editor) editor.style.display = "none";
      if (mdContainer) { mdContainer.style.display = ""; mdContainer.classList.add("ghl-md-active"); }
      if (mdBtn) mdBtn.classList.add("active");
      loadActiveNoteContent();
      if (mdEditor) mdEditor.focus();
    } else {
      // Switch back to rich-text mode
      if (mdContainer) { mdContainer.style.display = "none"; mdContainer.classList.remove("ghl-md-active"); }
      if (editor) editor.style.display = "";
      if (mdBtn) mdBtn.classList.remove("active");
      // Convert markdown content to HTML for rich-text editor
      const n = notesV2.find((x) => x.id === activeNoteIdV2);
      if (n && editor) {
        const mdContent = mdEditor ? mdEditor.value : n.content;
        n.content = mdContent; // Save raw md
        if (mdContent.trim()) {
          editor.innerHTML = mdToHtml(mdContent);
        } else {
          editor.innerHTML = "";
        }
        undoStack = [editor.innerHTML];
        setCharCount();
      }
      if (editor) editor.focus();
    }
  }
  
  function renderMdPreview() {
    if (!mdPreview || !mdEditor) return;
    mdPreview.innerHTML = parseMD(mdEditor.value);
    mdPreview.classList.add("ghl-md-visible");
    mdEditor.style.display = "none";
  }
  
  function hideMdPreview() {
    if (!mdPreview || !mdEditor) return;
    mdPreview.classList.remove("ghl-md-visible");
    mdEditor.style.display = "";
    mdEditor.focus();
  }
  /* -------------------- Undo -------------------- */
  function pushUndo() {
    if (!settings.enableUndo || !editor) return;
    const html = editor.innerHTML;
    if (undoStack[0] === html) return;
    undoStack.unshift(html);
    if (undoStack.length > 30) undoStack.length = 30;
  }
  function undo() {
    if (!settings.enableUndo) return;
    if (undoStack.length < 2) return;
    undoStack.shift(); // discard current
    const prev = undoStack[0];
    editor.innerHTML = prev;
    onEditorInput();
  }
  function onEditorKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  function onMdEditorKey(e) {
    // Ctrl+Enter -> toggle preview (safe in-page, only fires when textarea is focused)
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); 
      if (mdPreview && mdPreview.classList.contains("ghl-md-visible")) hideMdPreview();
      else renderMdPreview();
      return; 
    }
    // Ctrl+Shift+] -> next tab (safe in-page, only fires when textarea is focused)
    if (e.ctrlKey && e.shiftKey && e.key === "]") {
      e.preventDefault();
      const idx = notesV2.findIndex((n) => n.id === activeNoteIdV2);
      if (idx < notesV2.length - 1) switchNote(notesV2[idx + 1].id);
      return;
    }
    // Ctrl+Shift+[ -> prev tab (safe in-page, only fires when textarea is focused)
    if (e.ctrlKey && e.shiftKey && e.key === "[") {
      e.preventDefault();
      const idx = notesV2.findIndex((n) => n.id === activeNoteIdV2);
      if (idx > 0) switchNote(notesV2[idx - 1].id);
      return;
    }
    // Escape -> close panel (blur editor first)
    if (e.key === "Escape") {
      if (document.activeElement === mdEditor) { mdEditor.blur(); }
      else if (panelOpen) { togglePanel(); }
    }
  }

  // Note: Ctrl+N (new note), Ctrl+Delete (delete note), Ctrl+Shift+E (toggle preview)
  // are now configurable Chrome commands — customize at chrome://extensions/shortcuts

  }

  /* -------------------- Notes load / save -------------------- */
  function onEditorInput() {
    if (saveTimer) clearTimeout(saveTimer);
    panel.querySelector(".ghl-saved-dot").classList.add("saving");
    panel.querySelector(".ghl-saved-text").textContent = "Saving…";
    saveCurrentNoteContent();  // update the active note in the v2 array
    saveTimer = setTimeout(() => {
      saveNotes();             // legacy v1 backup
      saveNotesV2();           // persist the full v2 multi-note array
    }, 700);
  }

  async function loadNotes() {
    if (!currentLocId) return;

    // Load multi-note data (v2) first, fall back to legacy single note (v1)
    const [v2Data, legacyNote, pinStored, reminder] = await Promise.all([
      getLocal(noteKeyV2(currentLocId)),
      getLocal(noteKey(currentLocId)),
      getLocal(pinKey(currentLocId)),
      getLocal(reminderKey(currentLocId))
    ]);

    if (v2Data && v2Data.notes && v2Data.notes.length > 0) {
      notesV2 = v2Data.notes;
      activeNoteIdV2 = v2Data.activeId || notesV2[0].id;
    } else if (legacyNote) {
      // Migrate legacy single note into multi-note system
      const n = { id: "n" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
                  name: "Notes", content: legacyNote, createdAt: Date.now(), updatedAt: Date.now() };
      notesV2 = [n];
      activeNoteIdV2 = n.id;
      await saveNotesV2();
    } else {
      notesV2 = [{ id: "n" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
                   name: "Notes", content: "", createdAt: Date.now(), updatedAt: Date.now() }];
      activeNoteIdV2 = notesV2[0].id;
    }

    if (panelOpen) {
      loadActiveNoteContent();
      renderNoteTabs();
    }

    // Pin / reminder rendering (unchanged)
    const pinBtn = panel ? panel.querySelector(".ghl-btn-pin") : null;
    const pinnedEl = panel ? panel.querySelector(".ghl-pinned") : null;
    if (pinStored && pinnedEl) {
      pinnedEl.querySelector(".ghl-pinned-body").innerHTML = pinStored;
      pinnedEl.style.display = "flex";
      if (pinBtn) { pinBtn.classList.add("active"); pinBtn.innerHTML = ICON.pinOff; }
      const remLine = pinnedEl.querySelector(".ghl-pinned-reminder");
      if (reminder && reminder > Date.now()) {
        if (!remLine) {
          const r = el("div", "ghl-pinned-reminder");
          r.innerHTML = `${ICON.bell}<span class="ghl-rem-text"></span>`;
          pinnedEl.querySelector(".ghl-pinned-body").appendChild(r);
        }
        updateReminderText(reminder);
      } else if (remLine) { remLine.remove(); }
    } else if (pinnedEl) {
      pinnedEl.style.display = "none";
      if (pinBtn) { pinBtn.classList.remove("active"); pinBtn.innerHTML = ICON.pin; }
    }
    renderPanelState();
  }

  function loadActiveNoteContent() {
    const n = notesV2.find((x) => x.id === activeNoteIdV2);
    if (!n) return;
    if (!markdownMode && editor) {
      editor.innerHTML = n.content || "";
      setCharCount();
      undoStack = n.content ? [n.content] : [];
    } else if (markdownMode && mdEditor) {
      mdEditor.value = n.content || "";
    }
  }

  function renderNoteTabs() {
    if (!noteTabBar) return;
    noteTabBar.innerHTML = "";
    for (const n of notesV2) {
      const tab = el("div", "ghl-note-tab" + (n.id === activeNoteIdV2 ? " ghl-note-active" : ""));
      tab.addEventListener("click", () => switchNote(n.id));
      const name = el("span", "ghl-note-tab-name", n.name || "…");
      tab.appendChild(name);
      if (notesV2.length > 1) {
        const x = el("button", "ghl-note-tab-close", "×");
        x.addEventListener("click", (e) => { e.stopPropagation(); deleteNote(n.id); });
        tab.appendChild(x);
      }
      noteTabBar.appendChild(tab);
    }
    const addBtn = el("button", "ghl-note-tab-add", "+");
    addBtn.title = "New note (Ctrl+N)";
    addBtn.addEventListener("click", addNote);
    noteTabBar.appendChild(addBtn);
  }

  async function switchNote(id) {
    if (id === activeNoteIdV2) return;
    saveCurrentNoteContent();
    activeNoteIdV2 = id;
    await saveNotesV2();
    loadActiveNoteContent();
    renderNoteTabs();
    if (mdEditor && markdownMode) mdEditor.focus();
  }

  async function addNote() {
    saveCurrentNoteContent();
    const n = { id: "n" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
                name: "Note " + (notesV2.length + 1), content: "",
                createdAt: Date.now(), updatedAt: Date.now() };
    notesV2.push(n);
    activeNoteIdV2 = n.id;
    await saveNotesV2();
    loadActiveNoteContent();
    renderNoteTabs();
    if (mdEditor && markdownMode) mdEditor.focus();
  }

  async function deleteNote(id) {
    if (notesV2.length <= 1) return;
    saveCurrentNoteContent();
    const idx = notesV2.findIndex((n) => n.id === id);
    if (idx === -1) return;
    notesV2.splice(idx, 1);
    if (activeNoteIdV2 === id) activeNoteIdV2 = notesV2[Math.min(idx, notesV2.length - 1)].id;
    await saveNotesV2();
    loadActiveNoteContent();
    renderNoteTabs();
    if (mdEditor && markdownMode) mdEditor.focus();
  }

  function saveCurrentNoteContent() {
    const n = notesV2.find((x) => x.id === activeNoteIdV2);
    if (!n) return;
    if (markdownMode && mdEditor) {
      n.content = mdEditor.value;
    } else if (editor) {
      n.content = editor.innerHTML;
    }
    n.updatedAt = Date.now();
  }

  async function saveNotesV2() {
    if (!currentLocId) return;
    await setLocal({ [noteKeyV2(currentLocId)]: { notes: notesV2, activeId: activeNoteIdV2 } });
  }

  function saveNotes() {
    if (!currentLocId || !editor) return;
    const html = editor.innerHTML;
    const payload = {};
    payload[noteKey(currentLocId)] = html;
    setLocal(payload);
    // sync mirror
    if (settings.syncNotes) {
      try {
        const md = htmlToMd(html);
        const syncPayload = {};
        syncPayload[noteKey(currentLocId)] = md.slice(0, 8000); // sync quota
        chrome.storage.sync.set(syncPayload);
      } catch (e) {}
    }
    setCharCount();
    savedAgo = 0;
    if (panel) {
      panel.querySelector(".ghl-saved-dot").classList.remove("saving");
      panel.querySelector(".ghl-saved-text").textContent = "Saved just now";
    }
    // history (throttled 60s bucket)
    pushHistory(html);
    // last worked
    setLocal({ [lastWorkedKey(currentLocId)]: Date.now() });
  }

  function setCharCount() {
    if (!editor || !panel) return;
    charCount = editor.innerText.replace(/\n/g, "").length;
    panel.querySelector(".ghl-char-count").textContent = `${charCount} ch`;
  }

  async function pushHistory(html) {
    const list = (await getLocal(histKey(currentLocId))) || [];
    const now = Date.now();
    if (list[0] && now - list[0].ts < 60000) {
      list[0] = { ts: now, html };
    } else {
      list.unshift({ ts: now, html });
      if (list.length > 15) list.length = 15;
    }
    const payload = {};
    payload[histKey(currentLocId)] = list;
    setLocal(payload);
  }

  /* -------------------- Pin / Reminder -------------------- */
  async function togglePin() {
    if (!currentLocId) return;
    const existing = await getLocal(pinKey(currentLocId));
    const payload = {};
    if (existing) {
      payload[pinKey(currentLocId)] = null;
      payload[reminderKey(currentLocId)] = null;
      setLocal(payload);
    } else {
      payload[pinKey(currentLocId)] = editor.innerHTML;
      setLocal(payload);
    }
    loadNotes();
  }

  async function setReminder(minutes) {
    if (!currentLocId) return;
    const due = Date.now() + minutes * 60000;
    const payload = {};
    payload[reminderKey(currentLocId)] = due;
    setLocal(payload);
    reminderMenuOpen = false;
    renderPanelState();
    loadNotes();
    checkReminders();
  }

  async function clearReminder() {
    if (!currentLocId) return;
    const payload = {};
    payload[reminderKey(currentLocId)] = null;
    setLocal(payload);
    reminderMenuOpen = false;
    renderPanelState();
    loadNotes();
    checkReminders();
  }

  function updateReminderText(due) {
    if (!panel) return;
    const remLine = panel.querySelector(".ghl-pinned-reminder .ghl-rem-text");
    if (!remLine) return;
    const mins = Math.max(0, Math.round((due - Date.now()) / 60000));
    if (mins <= 0) remLine.textContent = "Reminder due now";
    else if (mins < 60) remLine.textContent = `Reminder in ${mins}m`;
    else remLine.textContent = `Reminder in ${Math.round(mins / 60)}h ${mins % 60}m`;
  }

  async function checkReminders() {
    if (!settings.enableNoteReminders || !currentLocId) return;
    const due = await getLocal(reminderKey(currentLocId));
    const pin = await getLocal(pinKey(currentLocId));
    if (due && pin && due <= Date.now()) {
      if (chip) chip.classList.add("reminder-due");
      // notify once
      const notifiedKey = `ghl_reminded_${currentLocId}`;
      const notified = await getLocal(notifiedKey);
      if (!notified) {
        try {
          chrome.notifications.create(`ghl-rem-${currentLocId}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
            title: `Reminder: ${clientName}`,
            message: "A pinned note reminder is due.",
            priority: 2
          });
        } catch (e) {}
        setLocal({ [notifiedKey]: true });
      }
    } else {
      if (chip) chip.classList.remove("reminder-due");
    }
  }

  /* -------------------- Render dynamic panel state -------------------- */
  function renderPanelState() {
    if (!panel) return;
    try {
      // Dynamic Header Synchronization
      // Automatically updates the panel title and avatar with the new active client's details on account switches!
      const panelName = panel.querySelector(".ghl-panel-name");
      if (panelName) panelName.textContent = clientName;

      const avatar = panel.querySelector(".ghl-avatar");
      if (avatar) {
        avatar.textContent = clientName ? clientName.charAt(0) : "N";
        avatar.style.background = getAccentColor();
      }

      const subSec = panel.querySelector(".ghl-sub-sec");
      if (subSec) subSec.textContent = sectionName;

      renderHistory();
      renderTemplateMenu();
      renderReminderMenu();
    } catch(err) {
      console.error("renderPanelState error:", err);
    }
  }

  async function renderHistory() {
    const drawer = panel.querySelector(".ghl-history");
    if (!historyOpen) { drawer.style.display = "none"; return; }
    drawer.style.display = "";
    const list = (await getLocal(histKey(currentLocId))) || [];
    drawer.innerHTML = "";
    if (!list.length) {
      drawer.innerHTML = '<div class="ghl-history-empty">No saved revisions yet.</div>';
      return;
    }
    list.forEach((item) => {
      const row = el("div", "ghl-history-item");
      const time = new Date(item.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const date = new Date(item.ts).toLocaleDateString([], { month: "short", day: "numeric" });
      row.innerHTML = `<span class="ghl-hist-time">${time} · ${date}</span>${ICON.corner}`;
      row.addEventListener("click", () => {
        editor.innerHTML = item.html;
        pushUndo();
        onEditorInput();
        historyOpen = false;
        renderPanelState();
      });
      drawer.appendChild(row);
    });
  }

  function renderTemplateMenu() {
    const wrap = panel.querySelector(".ghl-t-tpl").parentElement;
    let menu = wrap.querySelector(".ghl-dropdown");
    if (!tplMenuOpen) { if (menu) menu.remove(); return; }
    if (menu) menu.remove();
    menu = el("div", "ghl-dropdown down");
    settings.customTemplates.forEach((t) => {
      const item = el("button", "ghl-drop-item");
      item.innerHTML = `<span class="ghl-drop-item-title">${t.name}</span>` +
        `<span class="ghl-drop-item-preview">${t.text.split("\n")[0].replace(/[#*\[\]]/g, "")}</span>`;
      item.addEventListener("click", (e) => { e.stopPropagation(); loadTemplate(t.text); });
      menu.appendChild(item);
    });
    if (!settings.customTemplates.length) {
      menu.innerHTML = '<div class="ghl-history-empty">No templates. Add some in Options.</div>';
    }
    wrap.appendChild(menu);
  }

  function renderReminderMenu() {
    const wrap = panel.querySelector(".ghl-btn-reminder").parentElement.parentElement;
    let menu = panel.querySelector(".ghl-reminder-menu");
    if (!reminderMenuOpen) { if (menu) menu.remove(); return; }
    if (menu) menu.remove();
    menu = el("div", "ghl-dropdown down ghl-reminder-menu");
    menu.style.minWidth = "180px";
    const grid = el("div", "ghl-reminder-grid");
    [
      { m: 15, label: "In 15 min" },
      { m: 30, label: "In 30 min" },
      { m: 60, label: "In 1 hour" },
      { m: 120, label: "In 2 hours" },
      { m: 240, label: "In 4 hours" },
      { m: 1440, label: "Tomorrow" }
    ].forEach((opt) => {
      const b = el("button", "ghl-reminder-opt", opt.label);
      b.addEventListener("click", (e) => { e.stopPropagation(); setReminder(opt.m); });
      grid.appendChild(b);
    });
    menu.appendChild(grid);
    const clear = el("button", "ghl-reminder-opt", "Clear reminder");
    clear.style.borderTop = "1px solid var(--ghl-border-soft)";
    clear.style.marginTop = "4px";
    clear.addEventListener("click", (e) => { e.stopPropagation(); clearReminder(); });
    menu.appendChild(clear);
    panel.appendChild(menu);
  }

  

  /* -------------------- Snapshot -------------------- */
  async function refreshSnapshot() {
    if (!panel) return;
    const snap = panel.querySelector(".ghl-snap-text");
    if (!snap) return;
    const last = await getLocal(lastWorkedKey(currentLocId));
    const unread = parseInt(sessionStorage.getItem("ghl_unread_count") || "0");
    const activity = (await getLocal(activityKey())) || {};
    const today = new Date().toISOString().split("T")[0];
    const todaySec = (activity[today] && activity[today][currentLocId]) || 0;
    const parts = [];
    parts.push(`Last worked <b>${last ? formatRelativeShort(last) : "never"}</b>`);
    if (unread > 0) parts.push(`<b>${unread}</b> unread`);
    parts.push(`<b>${formatDuration(todaySec).slice(3)}</b> today`);
    snap.innerHTML = parts.join(" · ");
  }

  function formatRelativeShort(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  /* -------------------- Timer / activity -------------------- */
  function refreshTimer() {
    if (!panel) return;
    const sub = panel.querySelector(".ghl-sub-time");
    const chipTimer = chip && chip.querySelector(".ghl-timer-val");
    getLocal(activityKey()).then((activity) => {
      activity = activity || {};
      const today = new Date().toISOString().split("T")[0];
      const sec = (activity[today] && activity[today][currentLocId]) || 0;
      const dur = formatDuration(sec).slice(3);
      if (sub) sub.textContent = dur;
      if (chipTimer) chipTimer.textContent = dur;
    });
  }

  function startActivityTracker() {
    if (activityTimer) clearInterval(activityTimer);
    accumulatedSeconds = 0;
    activityTimer = setInterval(async () => {
      if (!settings.enabled || !currentLocId) return;
      if (document.hidden) return;
      
      const activity = (await getLocal(activityKey())) || {};
      const today = new Date().toISOString().split("T")[0];
      if (!activity[today]) activity[today] = {};
      activity[today][currentLocId] = (activity[today][currentLocId] || 0) + 1;
      setLocal({ [activityKey()]: activity });
      refreshTimer();
      
      // Memory Bank Telemetry Accumulator
      accumulatedSeconds++;
      if (accumulatedSeconds >= 15) {
        const pathParts = window.location.pathname.split("/location/")[1]?.split("/") || [];
        const slug = pathParts[1] || "dashboard";
        try {
          updateMemoryBankActivity(currentLocId, clientName, slug, accumulatedSeconds);
        } catch (err) {}
        accumulatedSeconds = 0;
      }
    }, 1000);
  }

  function startSavedAgoTicker() {
    if (savedAgoTimer) clearInterval(savedAgoTimer);
    savedAgoTimer = setInterval(() => {
      savedAgo++;
      if (!panel || !panelOpen) return;
      const dot = panel.querySelector(".ghl-saved-dot");
      if (dot.classList.contains("saving")) return;
      const txt = panel.querySelector(".ghl-saved-text");
      txt.textContent = `Saved ${savedAgo < 60 ? savedAgo + "s" : Math.floor(savedAgo / 60) + "m"} ago`;
    }, 1000);
  }

  function startReminderChecker() {
    if (reminderChecker) clearInterval(reminderChecker);
    reminderChecker = setInterval(() => { checkReminders(); if (panel && panelOpen) refreshReminderLabels(); }, 15000);
    checkReminders();
  }

  async function refreshReminderLabels() {
    if (!currentLocId) return;
    const due = await getLocal(reminderKey(currentLocId));
    if (due && due > Date.now()) updateReminderText(due);
  }

  /* -------------------- Quick nav -------------------- */
  // (rendered on demand via the chip's secondary action — kept minimal)
  function toggleQuickNav() {
    if (quickNav) { quickNav.remove(); quickNav = null; return; }
    quickNav = el("div", "ghl-quicknav");
    SECTIONS.slice(0, 12).forEach((s) => {
      const a = el("a", "ghl-quicknav-item", s.label);
      a.href = `${window.location.pathname.split("/location/")[0]}/location/${currentLocId}/${s.slug}`;
      quickNav.appendChild(a);
    });
    wrapper.insertBefore(quickNav, panel || null);
  }

  /* -------------------- Tab switcher overlay -------------------- */
  let swSelected = 0;
  let swList = [];
  let swFilter = "all"; // all | tabs | notes

  async function openSwitcher() {
    if (switcherOverlay) { closeSwitcher(); return; }
    switcherOverlay = el("div");
    switcherOverlay.id = "ghl-switcher-overlay";
    switcherOverlay.innerHTML =
      `<div class="ghl-switcher">` +
        `<div class="ghl-switcher-search">` +
          `${ICON.search}` +
          `<input class="ghl-switcher-input" placeholder="Search clients, tabs, notes…" autofocus>` +
          `<span class="ghl-switcher-kbd">Esc</span>` +
        `</div>` +
        `<div class="ghl-switcher-filters">` +
          `<button class="ghl-filter-chip active" data-f="all">All</button>` +
          `<button class="ghl-filter-chip" data-f="tabs">Open Tabs</button>` +
          `<button class="ghl-filter-chip" data-f="notes">Notes</button>` +
        `</div>` +
        `<div class="ghl-switcher-list"></div>` +
        `<div class="ghl-switcher-footer">` +
          `<span><kbd>↑↓</kbd> navigate</span>` +
          `<span><kbd>Enter</kbd> jump</span>` +
          `<span><kbd>1-9</kbd> quick select</span>` +
        `</div>` +
      `</div>`;
    document.body.appendChild(switcherOverlay);

    const input = switcherOverlay.querySelector(".ghl-switcher-input");
    input.addEventListener("input", () => renderSwitcherList(input.value));
    input.addEventListener("keydown", onSwitcherKey);

    switcherOverlay.querySelectorAll(".ghl-filter-chip").forEach((c) => {
      c.addEventListener("click", () => {
        switcherOverlay.querySelectorAll(".ghl-filter-chip").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        swFilter = c.dataset.f;
        renderSwitcherList(input.value);
      });
    });
    switcherOverlay.addEventListener("click", (e) => { if (e.target === switcherOverlay) closeSwitcher(); });

    input.focus();
    renderSwitcherList("");
  }

  async function renderSwitcherList(query) {
    const listEl = switcherOverlay.querySelector(".ghl-switcher-list");
    query = query.toLowerCase().trim();
    swList = [];

    // 1. open GHL tabs
    const tabsRes = await new Promise((res) => {
      try { chrome.runtime.sendMessage({ action: "getGHLTabs" }, res); }
      catch (e) { res({ tabs: [] }); }
    });
    const tabs = (tabsRes && tabsRes.tabs) || [];

    // 2. known clients from storage (names + URLs for palette recall)
    const clientNames = (await getLocal("client_names")) || {};
    const clientUrls = (await getLocal("ghl_client_urls")) || {};
    const allClients = {};
    tabs.forEach((t) => { allClients[t.locationId] = t.clientName; });
    Object.keys(clientNames).forEach((id) => { if (!allClients[id]) allClients[id] = clientNames[id]; });

    // 3. notes content
    const allLocal = await new Promise((res) => { try { chrome.storage.local.get(null, res); } catch (e) { res({}); } });

    // build tab items
    let tabItems = tabs.map((t) => ({
      type: "tab", id: t.tabId, locationId: t.locationId, name: t.clientName,
      section: t.section || "", url: t.url, notePreview: ""
    }));
    // known client items (not open) — now with stored URLs from history
    const openIds = new Set(tabs.map((t) => t.locationId));
    let clientItems = Object.keys(allClients).filter((id) => !openIds.has(id)).map((id) => ({
      type: "client", id: id, locationId: id, name: allClients[id],
      section: "", url: clientUrls[id] || null, notePreview: ""
    }));
    // note items (clients with notes, searched by content)
    let noteItems = [];
    Object.keys(allLocal).forEach((key) => {
      const m = key.match(/^ghl_notes_(.+)$/);
      if (!m) return;
      const locId = m[1];
      const html = allLocal[key] || "";
      const text = htmlToMd(html).toLowerCase();
      const name = allClients[locId] || "GHL Client";
      noteItems.push({ type: "note", id: locId, locationId: locId, name, section: "", url: clientUrls[locId] || null, notePreview: htmlToMd(html).slice(0, 80) });
    });

    // filter
    if (swFilter === "tabs") { clientItems = []; noteItems = []; }
    if (swFilter === "notes") { tabItems = []; clientItems = []; }

    let all = [...tabItems, ...clientItems, ...noteItems];
    if (query) {
      all = all.filter((it) => {
        const hay = (it.name + " " + it.section + " " + it.notePreview).toLowerCase();
        return hay.includes(query);
      });
    }
    // dedupe by locationId keeping tab type priority
    const seen = new Set();
    all = all.filter((it) => {
      const k = it.locationId + ":" + it.type;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    swList = all;
    swSelected = 0;
    listEl.innerHTML = "";

    if (!all.length) {
      listEl.innerHTML = '<div class="ghl-sw-empty">No matches. Open a GHL dashboard to see clients here.</div>';
      return;
    }

    // group: open tabs, then clients, then notes
    const groups = { tab: "Open Tabs", client: "Recently Visited", note: "Notes" };
    ["tab", "client", "note"].forEach((type) => {
      const items = all.filter((it) => it.type === type);
      if (!items.length) return;
      const label = el("div", "ghl-sw-group-label", groups[type]);
      listEl.appendChild(label);
      items.forEach((it, idx) => {
        const globalIdx = all.indexOf(it);
        const row = el("div", "ghl-sw-item" + (globalIdx === swSelected ? " selected" : ""));
        const color = (settings.clientColors && settings.clientColors[it.locationId]) || "#8b5cf6";
        let meta = "";
        if (it.type === "tab") meta = `<span class="ghl-sw-sec">${it.section || "Dashboard"}</span>`;
        else if (it.type === "note") meta = `<span class="ghl-sw-note-preview">${it.notePreview || "Empty note"}</span>`;
        else meta = `<span class="ghl-sw-sec">Not open</span>`;
        row.innerHTML =
          `<span class="ghl-sw-avatar" style="background:${color}">${it.name.charAt(0)}</span>` +
          `<div class="ghl-sw-info"><div class="ghl-sw-name">${it.name}</div>` +
          `<div class="ghl-sw-meta">${meta}</div></div>` +
          (it.type === "tab" ? `<span class="ghl-sw-shortcut">Tab</span>` : "");
        row.addEventListener("click", () => activateSwitcherItem(it));
        row.addEventListener("mouseenter", () => { swSelected = globalIdx; updateSwSelected(); });
        listEl.appendChild(row);
      });
    });
  }

  function updateSwSelected() {
    switcherOverlay.querySelectorAll(".ghl-sw-item").forEach((r, i) => {
      r.classList.toggle("selected", i === swSelected);
    });
  }

  function onSwitcherKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); swSelected = Math.min(swSelected + 1, swList.length - 1); updateSwSelected(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); swSelected = Math.max(swSelected - 1, 0); updateSwSelected(); }
    else if (e.key === "Enter") { e.preventDefault(); if (swList[swSelected]) activateSwitcherItem(swList[swSelected]); }
    else if (e.key === "Escape") { e.preventDefault(); closeSwitcher(); }
    else if (/^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key) - 1;
      if (swList[idx]) activateSwitcherItem(swList[idx]);
    }
  }

  function activateSwitcherItem(it) {
    if (it.type === "tab") {
      try { chrome.runtime.sendMessage({ action: "activateTab", tabId: it.id }); } catch (e) {}
      closeSwitcher();
    } else if (it.url) {
      // use the stored URL from history — preserves white-label domain
      chrome.tabs.create({ url: it.url });
      closeSwitcher();
    } else {
      // fallback: construct URL from locationId using current domain
      const base = window.location.origin || "https://app.gohighlevel.com";
      chrome.tabs.create({ url: `${base}/v2/location/${it.locationId}/dashboard` });
      closeSwitcher();
    }
  }

  function closeSwitcher() {
    if (switcherOverlay) { switcherOverlay.remove(); switcherOverlay = null; }
  }

  /* -------------------- Onboarding -------------------- */
  async function maybeShowOnboarding() {
    if (settings.onboardingCompleted) return;
    if (!currentLocId) return;
    // wait a beat for chip to render
    setTimeout(() => {
      if (!chip) return;
      const onboard = el("div", "ghl-onboard");
      const rect = chip.getBoundingClientRect();
      onboard.style.top = (rect.bottom + 10) + "px";
      onboard.style.right = "22px";
      onboard.innerHTML =
        `<h3>Welcome to GHL Tab Renamer</h3>` +
        `<p>Your tabs are now auto-named by client. Try the notepad — click the chip or press <span class="ghl-onboard-kbd">Ctrl+Shift+E</span> to toggle it.</p>` +
        `<div class="ghl-onboard-actions">` +
          `<button class="ghl-onboard-btn ghost ghl-ob-skip">Skip</button>` +
          `<button class="ghl-onboard-btn primary ghl-ob-ok">Got it</button>` +
        `</div>`;
      document.body.appendChild(onboard);
      onboard.querySelector(".ghl-ob-ok").addEventListener("click", () => dismissOnboard(onboard));
      onboard.querySelector(".ghl-ob-skip").addEventListener("click", () => dismissOnboard(onboard));
    }, 1200);
  }

  function dismissOnboard(node) {
    node.remove();
    settings.onboardingCompleted = true;
    saveSettings(settings);
  }

  /* -------------------- Unread observer -------------------- */
  function setupUnreadObserver() {
    if (unreadObserver) return;
    unreadObserver = new MutationObserver(() => {
      const conv = document.querySelector('a[href*="/conversations"], [id*="conversations"], [class*="conversations"]');
      let count = 0;
      if (conv) {
        const badge = conv.querySelector('[class*="badge"], [class*="unread"], [class*="counter"], span');
        if (badge && badge.textContent.trim()) {
          const p = parseInt(badge.textContent.trim().replace(/[^0-9]/g, ""));
          if (!isNaN(p)) count = p;
        } else if (conv.querySelector('[class*="dot"], [class*="indicator"]')) count = 1;
      }
      const cur = parseInt(sessionStorage.getItem("ghl_unread_count") || "0");
      if (count !== cur) {
        sessionStorage.setItem("ghl_unread_count", count);
        try { chrome.runtime.sendMessage({ action: "updateUnreadCount", count }); } catch (e) {}
        updateChipTitle();
        if (panel && panelOpen) refreshSnapshot();
      }
    });
    unreadObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  /* -------------------- Utilities -------------------- */
  function hexToRgba(hex, a) {
    hex = (hex || "#8b5cf6").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* -------------------- Update UI -------------------- */
  function updateUI(titleText) {
    // Leadjuice Only Mode filter
    if (settings.onlyLeadjuice) {
      const hostname = window.location.hostname;
      if (!hostname.includes("leadjuice")) {
        if (wrapper) { wrapper.remove(); wrapper = null; chip = null; panel = null; }
        return;
      }
    }

    if (!settings.enabled) {
      if (wrapper) { wrapper.remove(); wrapper = null; chip = null; panel = null; }
      return;
    }
    if (!wrapper) {
      buildWrapper();
      buildChip(titleText);
      maybeShowOnboarding();
    } else {
      applyTheme();
      applyLayout();
      updateChipTitle(titleText);
      if (panel && panelOpen) {
        loadNotes(); // Dynamically reload notes for the new sub-account immediately!
        renderPanelState();
        refreshSnapshot();
      }
    }
    if (chip) {
      const color = getAccentColor();
      chip.querySelector(".ghl-dot").style.background = color;
    }
  }

  function updateTitle() {
    if (!settings.enabled) return;
    const cl = getClientName();
    const sec = getSection();
    const locId = getLocationId();
    const clientChanged = cl !== clientName;
    clientName = cl;
    sectionName = sec;
    if (locId) currentLocId = locId;
    
    try {
      chrome.runtime.sendMessage({ action: "isTabGrouped" }, (res) => {
        const isGrouped = res && res.grouped;
        const t = buildTitle(cl, sec, isGrouped);
        if (t && document.title !== t) document.title = t;
        updateUI(t);
        if (cl && cl !== "GHL Client") {
          const color = getAccentColor();
          generateFavicon(color, cl.charAt(0));
        }
      });
    } catch (err) {
      const t = buildTitle(cl, sec, false);
      if (t && document.title !== t) document.title = t;
      updateUI(t);
      if (cl && cl !== "GHL Client") {
        const color = getAccentColor();
        generateFavicon(color, cl.charAt(0));
      }
    }
    
    // notify background
    if (currentLocId && clientChanged) {
      try {
        chrome.runtime.sendMessage({
          action: "updateClientTab",
          locationId: currentLocId,
          clientName: cl,
          section: sec
        });
      } catch (e) {}
      checkReminders();
    }
  }

  /* -------------------- Message listener -------------------- */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "settingsUpdated") {
      settings = message.settings || settings;
      if (settings.enabled) {
        applyTheme();
        applyLayout();
        updateTitle();
      } else {
        if (wrapper) { wrapper.remove(); wrapper = null; chip = null; panel = null; }
      }
      sendResponse({ success: true });
    } else if (message.action === "toggleSwitcherOverlay") {
      openSwitcher();
      sendResponse({ success: true });
    } else if (message.action === "openPalette") {
      openSwitcher();
      sendResponse({ success: true });
    } else if (message.action === "toggleNotes") {
      if (!panelOpen) togglePanel();
      sendResponse({ success: true });
    } else if (message.action === "toggleHistory") {
      if (panelOpen) { historyOpen = !historyOpen; renderPanelState(); }
      sendResponse({ success: true });
    } else if (message.action === "togglePin") {
      if (panelOpen) togglePin();
      sendResponse({ success: true });
    } else if (message.action === "mdNewNote") {
      if (panelOpen && notesV2 && notesV2.length > 0) addNote();
      sendResponse({ success: true });
    } else if (message.action === "mdDeleteNote") {
      if (panelOpen && notesV2 && notesV2.length > 1) deleteNote(activeNoteIdV2);
      sendResponse({ success: true });
    } else if (message.action === "mdTogglePreview") {
      if (panelOpen && markdownMode) {
        if (mdPreview && mdPreview.classList.contains("ghl-md-visible")) hideMdPreview();
        else if (mdEditor) renderMdPreview();
      }
      sendResponse({ success: true });
    }
    return true;
  });

  /* -------------------- Tick engine -------------------- */
  let lastPath = window.location.pathname, retry = 0;
  function tick() {
    if (!settings.enabled) return;
    const pc = window.location.pathname !== lastPath;
    const c = getClientName();
    if (pc || c !== clientName) {
      lastPath = window.location.pathname;
      if (c !== "GHL Client") retry = 0;
      updateTitle();
    } else if (c === "GHL Client" && retry < 20) {
      retry++;
      updateTitle();
    }
  }

  /* -------------------- Init -------------------- */
  function init() {
    getSettings((saved) => {
      settings = saved;
      if (!settings.enabled) return;
      getLocal("ghl_chip_pos").then((savedPos) => {
        if (savedPos && typeof savedPos.x === "number" && typeof savedPos.y === "number") {
          chipPos = savedPos;
        }
        const locId = getLocationId();
        if (locId) {
          currentLocId = locId;
          clientName = getClientName();
          sectionName = getSection();
          try {
            chrome.runtime.sendMessage({
              action: "updateClientTab",
              locationId: currentLocId,
              clientName: clientName,
              section: sectionName
            });
          } catch (e) {}
        }
        // inject content.css is handled by manifest registration; but ensure styles load
        updateTitle();
        setupUnreadObserver();
        startActivityTracker();
        startSavedAgoTicker();
        startReminderChecker();

        new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        setInterval(tick, 1500);

        // global keyboard shortcut for switcher as fallback (if command doesn't fire)
        document.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
            e.preventDefault();
            openSwitcher();
          }
          if (e.key === "Escape" && panelOpen) {
            e.preventDefault();
            togglePanel();
          }
        });
      });
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") init();
  else window.addEventListener("DOMContentLoaded", init);

  // Helper to calculate current week dates (Mon-Fri)
  function getWeekDates() {
    const current = new Date();
    const day = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const mondayOffset = day === 0 ? -6 : 1 - day; // offset to Monday
    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);
    
    const dates = [];
    const daysName = ["MON", "TUE", "WED", "THU", "FRI"];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      dates.push({
        name: daysName[i],
        dayNum: d.getDate(),
        dateStr: dateStr,
        isToday: dateStr === current.toISOString().split("T")[0]
      });
    }
    return dates;
  }

  /* -------------------- Asana Tasks Client Fetcher -------------------- */
  // Helper to upload base64 image as an attachment to an Asana task/subtask
  async function uploadAsanaAttachment(taskGid, imageDataUrl, filename, token) {
    try {
      const resBlob = await fetch(imageDataUrl);
      const blob = await resBlob.blob();
      
      const fd = new FormData();
      // Use your notes text as the filename of the attachment to pack both into a SINGLE gorgeous card!
      fd.append("file", blob, (filename || "proof_" + Date.now()) + ".png");
      fd.append("parent", taskGid); // Links the attachment directly to the subtask GID
      
      const r = await fetch("https://app.asana.com/api/1.0/attachments", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      });
      return r.ok;
    } catch(err) {
      console.error("Attachment upload error:", err);
      return false;
    }
  }

  // Helper to post a comment story to an Asana task/subtask
  async function postAsanaComment(taskGid, text, token) {
    try {
      const r = await fetch(`https://app.asana.com/api/1.0/tasks/${taskGid}/stories`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: { text: text }
        })
      });
      return r.ok;
    } catch(err) {
      console.error("Comment post error:", err);
      return false;
    }
  }

  // Helper to render specific Asana task and its subtasks with inline commenting on each
  function loadSpecificAsanaTask(url) {
    const listContainer = panel.querySelector(".ghl-asana-list-container");
    if (!listContainer) return;
    
    // Extract task GID
    let taskGid = null;
    const segments = url.split("/").filter(s => /^\d+$/.test(s));
    if (segments.length > 0) {
      taskGid = segments[segments.length - 1];
    } else {
      const digits = url.match(/\b\d{12,}\b/);
      if (digits) taskGid = digits[0];
    }
    
    if (!taskGid) {
      listContainer.innerHTML = `<div class="ghl-asana-empty" style="color:var(--ghl-red)">Could not parse a valid Task GID from that link.</div>`;
      return;
    }
    
    listContainer.innerHTML = '<div class="ghl-asana-loading">Loading specific task from Asana...</div>';
    
    const token = settings.asanaToken;
    
    // Simple inline relative time formatter
    function formatRelativeTime(dateStr) {
      try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.round(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        return `${days}d ago`;
      } catch(e) {
        return "Just now";
      }
    }

    // Fetch Task, Subtasks, and Comments (Stories) in parallel
    Promise.all([
      fetch(`https://app.asana.com/api/1.1/tasks/${taskGid}?opt_fields=name,completed,permalink_url,projects.name,due_on,notes,parent.name,parent.gid`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`https://app.asana.com/api/1.1/tasks/${taskGid}/subtasks?opt_fields=name,completed,permalink_url`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`https://app.asana.com/api/1.1/tasks/${taskGid}/stories?opt_fields=text,created_at,type,created_by.name`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json())
    ])
    .then(([taskRes, subtasksRes, storiesRes]) => {
      if (!taskRes.data) throw new Error("Task not found or private");
      
      // Successfully loaded! Persist the active URL to settings so it survives refreshes
      if (settings.activeAsanaTaskUrl !== url) {
        settings.activeAsanaTaskUrl = url;
        saveSettings(settings);
      }
      
      const t = taskRes.data;
      const subtasks = subtasksRes.data || [];
      const stories = storiesRes.data || [];
      
      // Filter out system pings (only user-generated comments)
      const comments = stories.filter(s => s.type === "comment");
      
      listContainer.innerHTML = '<div class="ghl-asana-loading">Fetching subtask comments count...</div>';
      
      // Fetch comment counts for each subtask in parallel
      const subtaskCommentPromises = subtasks.map(sub => {
        return fetch(`https://app.asana.com/api/1.1/tasks/${sub.gid}/stories?opt_fields=type`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(res => {
          const subStories = res.data || [];
          const count = subStories.filter(s => s.type === "comment").length;
          return { gid: sub.gid, count: count };
        })
        .catch(() => {
          return { gid: sub.gid, count: 0 };
        });
      });
      
      return Promise.all(subtaskCommentPromises).then(counts => {
        const countMap = {};
        counts.forEach(c => { countMap[c.gid] = c.count; });
        return { task: t, subtasks: subtasks, comments: comments, subtaskCommentCounts: countMap };
      });
    })
    .then(({ task: t, subtasks: subtasks, comments: comments, subtaskCommentCounts: countMap }) => {
      listContainer.innerHTML = "";
      
      const colors = ["#f06a6a", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#3b82f6"];
      let projName = (t.projects && t.projects[0] && t.projects[0].name) || "";
      let hash = 0;
      for (let i = 0; i < projName.length; i++) {
        hash = projName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const accentColor = colors[Math.abs(hash) % colors.length];
      
      const card = document.createElement("div");
      card.className = "ghl-asana-card";
      card.style.cssText = `border-left: 3.5px solid ${accentColor} !important;`;

      let displayProj = projName || "Task Board";
      if (displayProj.length > 20) displayProj = displayProj.slice(0, 18) + "..";
      
      let dueStr = t.due_on ? `📅 Due: ${t.due_on}` : "📅 No due date";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size: 9px; color: var(--ghl-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.3px;">
          <span>📁 ${displayProj}</span>
          <span>${dueStr}</span>
        </div>
        
        <div class="ghl-asana-task-item" style="border:none; padding:0; background:transparent; display: flex; gap: 6px; align-items: flex-start; line-height: 1.35; width: 100%;">
          <input type="checkbox" class="ghl-parent-cb" ${t.completed ? "checked" : ""} style="cursor:pointer; margin-top:2.5px; flex-shrink:0;">
          <span class="ghl-parent-title" style="${t.completed ? "text-decoration: line-through; opacity: 0.5;" : ""}">${t.name}</span>
        </div>
        
        <div class="ghl-card-subtasks-list" style="margin-left: 12px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;"></div>
        
        <!-- Comments Section -->
        <div class="ghl-card-comments-section" style="border-top: 1px solid var(--ghl-border-soft); padding-top: 8px; margin-top: 4px; display:flex; flex-direction:column; gap:6px;">
          <div class="ghl-comments-toggle" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-size:9.5px; font-weight:700; color:var(--ghl-text-muted); text-transform:uppercase; letter-spacing:0.3px; padding:2px 0;">
            <span>💬 Task Activity (${comments.length})</span>
            <span class="ghl-comments-arrow" style="font-size:8px; transition:transform 0.15s;">▼</span>
          </div>
          <div class="ghl-comments-feed" style="display:none; flex-direction:column; gap:6px; max-height:120px; overflow-y:auto; padding-right:2px; box-sizing:border-box;"></div>
        </div>
      `;
      
      listContainer.appendChild(card);
      
      // Wire parent checkbox
      const parentCb = card.querySelector(".ghl-parent-cb");
      parentCb.addEventListener("change", (e) => {
        const title = card.querySelector(".ghl-parent-title");
        if (e.target.checked) {
          title.style.textDecoration = "line-through";
          title.style.opacity = "0.5";
          try { addMemoryBankAccomplishment(clientName, t.name); } catch(err) {}
        } else {
          title.style.textDecoration = "none";
          title.style.opacity = "1";
        }
      });
      
      // Populate subtasks inside the card
      const subContainer = card.querySelector(".ghl-card-subtasks-list");
      if (subtasks.length === 0) {
        subContainer.innerHTML = `<div style="font-size:9.5px; color:var(--ghl-text-muted); font-style:italic;">No subtasks assigned.</div>`;
      } else {
        subtasks.forEach((sub) => {
          const subRow = document.createElement("div");
          subRow.style.cssText = "display: flex; flex-direction: column; gap: 4px; box-sizing: border-box;";
          
          const commentCount = countMap[sub.gid] || 0;
          let commentPill = commentCount > 0 ? 
            `<span class="ghl-sub-comment-trigger" title="Toggle Comment / Proof" style="font-size: 10px; color: var(--ghl-accent); font-weight:700; padding: 0 4px; border-radius: 4px; display:flex; align-items:center; gap:3px;">💬 ${commentCount}</span>` :
            `<span class="ghl-sub-comment-trigger" title="Toggle Comment / Proof" style="font-size: 10.5px; color: var(--ghl-text-muted); padding: 0 4px; border-radius: 4px; transition: color 0.15s, background-color 0.15s;">💬</span>`;

          subRow.innerHTML = `
            <div class="ghl-subtask-row-header ghl-asana-subtask-item" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; cursor: pointer; padding: 2px 0; border:none; background:transparent; width: 100%;">
              <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
                <input type="checkbox" class="ghl-sub-cb" ${sub.completed ? "checked" : ""} style="cursor:pointer; margin-top: 2px; flex-shrink: 0;">
                <span class="ghl-sub-title" style="font-size: 10.5px; color: var(--ghl-text); line-height: 1.35; ${sub.completed ? "text-decoration: line-through; opacity: 0.5;" : ""}">${sub.name}</span>
              </div>
              ${commentPill}
            </div>
            
            <!-- Expanded Subtask Proof Drawer -->
            <div class="ghl-subtask-comment-drawer" style="display: none; flex-direction: column; gap: 6px; margin-top: 4px; padding: 6px 8px; margin-left: 14px; border-radius: 6px; box-sizing: border-box;">
              <div style="font-size: 9px; font-weight: 700; color: var(--ghl-text-muted); text-transform: uppercase;">Submit Proof of Work</div>
              
              <div style="display: flex; gap: 4px; align-items: center;">
                <div class="ghl-sub-paste-dropzone" style="flex: 1; border-radius: 4px; padding: 6px; text-align: center; font-size: 8.5px; cursor: pointer; transition: border-color 0.15s;" tabindex="0">
                  📋 Paste screenshot (Ctrl+V)
                </div>
                <div class="ghl-sub-preview" style="display: none; border-radius: 4px; border: 1px solid var(--ghl-border); overflow: hidden; max-height: 24px;">
                  <img src="" style="height: 22px; display: block;">
                </div>
              </div>
              
              <div style="display: flex; gap: 4px; align-items: center; width: 100%;">
                <input type="text" class="ghl-sub-comment-input" placeholder="Comment for this subtask..." style="flex: 1; border: 1px solid var(--ghl-border); border-radius: 4px; background: var(--ghl-surface); color: var(--ghl-text); padding: 4px 6px; font-size: 9px; outline: none; box-sizing:border-box;">
                <button class="ghl-sub-post-btn" style="background: var(--ghl-accent); color: #ffffff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 8.5px; font-weight: 700; cursor: pointer; flex-shrink:0;">Post Proof</button>
              </div>
            </div>
          `;

          // Wire subtask checkbox
          const subCb = subRow.querySelector(".ghl-sub-cb");
          subCb.addEventListener("click", (e) => e.stopPropagation());
          subCb.addEventListener("change", (e) => {
            const title = subRow.querySelector(".ghl-sub-title");
            if (e.target.checked) {
              title.style.textDecoration = "line-through";
              title.style.opacity = "0.5";
              try { addMemoryBankAccomplishment(clientName, sub.name); } catch(err) {}
            } else {
              title.style.textDecoration = "none";
              title.style.opacity = "1";
            }
          });

          // Wire drawer expand toggle
          const triggerHeader = subRow.querySelector(".ghl-subtask-row-header");
          const drawer = subRow.querySelector(".ghl-subtask-comment-drawer");
          const triggerIcon = subRow.querySelector(".ghl-sub-comment-trigger");
          
          triggerHeader.addEventListener("click", () => {
            const isShown = drawer.style.display === "flex";
            drawer.style.display = isShown ? "none" : "flex";
            triggerIcon.style.color = isShown ? "var(--ghl-text-muted)" : "var(--ghl-accent)";
            triggerIcon.style.backgroundColor = isShown ? "transparent" : "var(--ghl-input-bg)";
          });

          // Wire paste image inside drawer
          const dropzone = subRow.querySelector(".ghl-sub-paste-dropzone");
          const preview = subRow.querySelector(".ghl-sub-preview");
          const previewImg = preview.querySelector("img");
          
          dropzone.addEventListener("click", (e) => {
            e.stopPropagation();
            dropzone.focus();
          });
          dropzone.addEventListener("paste", (e) => {
            const items = (e.clipboardData || window.clipboardData).items;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                  dropzone.dataset.imageData = event.target.result;
                  previewImg.src = event.target.result;
                  preview.style.display = "block";
                  dropzone.textContent = "✓ Image Loaded";
                  dropzone.style.borderColor = "var(--ghl-accent)";
                };
                reader.readAsDataURL(blob);
                break;
              }
            }
          });
          dropzone.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            dropzone.dataset.imageData = "";
            previewImg.src = "";
            preview.style.display = "none";
            dropzone.style.borderColor = "var(--ghl-border)";
            dropzone.textContent = "📋 Paste screenshot (Ctrl+V)";
          });

          // Wire Post Proof Button inside drawer
          const postBtn = subRow.querySelector(".ghl-sub-post-btn");
          const commentInput = subRow.querySelector(".ghl-sub-comment-input");
          
          commentInput.addEventListener("click", (e) => e.stopPropagation());

          postBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const text = commentInput.value.trim();
            const img = dropzone.dataset.imageData || "";
            if (!text && !img) return;

            postBtn.textContent = "Posting...";
            postBtn.disabled = true;
            postBtn.style.opacity = "0.5";

            try {
              let isSuccess = false;

              if (img) {
                // Combined Attachment-Comment Flow:
                // We use your typed comment text directly as the filename of the attachment!
                // This displays your notes in the card header, showing strictly ONE clean comment block with the large image!
                const cleanText = text ? text.replace(/[\/\\?%*:|"<>.]/g, "_").trim().slice(0, 100) : "";
                const filename = cleanText || "proof_" + Date.now();
                isSuccess = await uploadAsanaAttachment(sub.gid, img, filename, token);
              } else if (text) {
                // If there is ONLY text (no image), post a standard clean comment story bubble!
                isSuccess = await postAsanaComment(sub.gid, text, token);
              }} catch(err) {
              postBtn.textContent = "Failed. Retry";
              postBtn.style.background = "var(--ghl-red)";
              postBtn.disabled = false;
              postBtn.style.opacity = "1";
            }
          });

          subContainer.appendChild(subRow);
        });
      }
      
      // Populate standard comments / stories list inside the card
      const commentContainer = card.querySelector(".ghl-comments-feed");
      if (comments.length === 0) {
        commentContainer.innerHTML = `<div style="font-size:9px; color:var(--ghl-text-muted); font-style:italic; padding:4px 0;">No comments on this task yet.</div>`;
      } else {
        comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        comments.forEach((c) => {
          const comDiv = document.createElement("div");
          comDiv.className = "ghl-comments-feed-item";
          
          const timeStr = formatRelativeTime(c.created_at);
          
          comDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; font-size:8.5px; color:var(--ghl-text-muted);">
              <span style="font-weight:700; color:var(--ghl-accent);">${c.created_by?.name || "Asana User"}</span>
              <span>${timeStr}</span>
            </div>
            <div style="font-size:9.5px; color:var(--ghl-text); line-height:1.45; white-space:pre-wrap; word-break:break-word;">${c.text}</div>
          `;
          commentContainer.appendChild(comDiv);
        });
      }
      
      // Wire comments toggle expand/collapse
      const commToggle = card.querySelector(".ghl-comments-toggle");
      const commArrow = card.querySelector(".ghl-comments-arrow");
      commToggle.addEventListener("click", () => {
        const isShown = commentContainer.style.display === "flex";
        commentContainer.style.display = isShown ? "none" : "flex";
        commArrow.style.transform = isShown ? "none" : "rotate(180deg)";
      });
    })
    .catch(err => {
      listContainer.innerHTML = `<div class="ghl-asana-empty" style="color:var(--ghl-red)">Error loading from Asana: ${err.message}</div>`;
    });
}

  


  /* -------------------- Asana Tasks Client Fetcher -------------------- */
  function loadAsanaTasks() {
    const listContainer = panel.querySelector(".ghl-asana-list-container");
    if (!listContainer) return;
    
    const linkInput = panel.querySelector(".ghl-asana-link-input");
    
    // Auto Pre-populate and Load active task on refresh/initial load if saved in settings!
    if (linkInput && !linkInput.value.trim() && settings.activeAsanaTaskUrl) {
      linkInput.value = settings.activeAsanaTaskUrl;
      loadSpecificAsanaTask(settings.activeAsanaTaskUrl);
      return;
    }
    
    const currentUrl = linkInput ? linkInput.value.trim() : "";
    if (currentUrl) {
      loadSpecificAsanaTask(currentUrl);
      return;
    }
    
    // Default Landing State (Clean, non-grid placeholder)
    listContainer.innerHTML = `
      <div class="ghl-asana-empty" style="padding: 40px 16px; text-align: center; color: var(--ghl-text-muted); box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
        <div style="font-size: 24px;">📌</div>
        <div style="font-size: 11.5px; font-weight: 700; color: var(--ghl-text);">Load an Asana Task</div>
        <div style="font-size: 10px; line-height: 1.45; max-width: 220px; margin: 0 auto; opacity: 0.85;">
          Paste your active Asana task link into the box above to load your checklist and post proof of work.
        </div>
      </div>
    `;
  }

})();
