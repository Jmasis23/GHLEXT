/* ============================================================
 * GHL Tab Renamer — utils.js
 * Shared constants, default settings, and storage helpers.
 * Loaded by background.js, content.js, popup.js, options.js.
 * ============================================================ */

const DEFAULT_DOMAINS = [
  "app.leadjuicehub.com",
  "app.leadjuice.com",
  "app.gohighlevel.com",
  "app.highlevel.com"
];

const SECTIONS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "conversations", label: "Conversations" },
  { slug: "contacts", label: "Contacts" },
  { slug: "opportunities", label: "Opportunities" },
  { slug: "payments", label: "Payments" },
  { slug: "calendars", label: "Calendars" },
  { slug: "workflows", label: "Workflows" },
  { slug: "automation", label: "Automation" },
  { slug: "marketing", label: "Marketing" },
  { slug: "funnels", label: "Funnels" },
  { slug: "sites", label: "Sites" },
  { slug: "social-planner", label: "Social" },
  { slug: "email", label: "Email" },
  { slug: "reporting", label: "Reporting" },
  { slug: "reputation", label: "Reputation" },
  { slug: "settings", label: "Settings" },
  { slug: "phone-system", label: "Phone" },
  { slug: "memberships", label: "Memberships" },
  { slug: "affiliate-manager", label: "Affiliates" },
  { slug: "media", label: "Media" },
  { slug: "prospecting", label: "Prospecting" },
  { slug: "templates", label: "Templates" },
  { slug: "triggers", label: "Triggers" },
  { slug: "integrations", label: "Integrations" },
  { slug: "app", label: "Apps" },
  { slug: "page-builder", label: "Page Builder" }
];

const DEFAULT_SETTINGS = {
  // Core
  enabled: true,
  titleTemplate: "{client} | {section}",
  onlyLeadjuice: false,
  activeAsanaTaskUrl: "",
  panelWidth: 308,
  panelHeight: 500,

  // Badge / floater appearance
  badgePosition: "top-center",      // top-left|top-center|top-right|bottom-left|bottom-center|bottom-right
  badgeSize: "medium",             // small|medium|large
  badgeOpacity: 0.95,
  badgeAutoHide: false,
  theme: "dark",                   // dark|light|auto

  // White-label domains
  customDomains: [...DEFAULT_DOMAINS],

  // Client identity
  clientColors: {},                // { locationId: "#hex" }
  clientGroupIcons: {},            // { locationId: "🏥" } — emoji/icon prepended to tab group name
  clientGroupColors: {},           // { locationId: "blue" } — explicit Chrome group color override
  clientNicknames: {},             // { locationId: "Friendly Name" }

  // Tab management
  autoGroup: true,
  sortGroupsAlpha: true,        // keep Chrome tab groups sorted A-Z
  shortTitleWhenGrouped: false,
  enableCustomGroupers: true,
  autoCollapseGroups: true,
  autoCollapseDelay: 0,   // seconds before collapsing inactive groups (0 = instant)
  enableRamSaver: true,
  ramSaverIdleMinutes: 30,
  smartGroupingSuggestions: true,
  customGroupers: [
    { id: "asana-default", name: "Asana", pattern: "asana.com", color: "green", enabled: true },
    { id: "sheets-default", name: "Sheets", pattern: "docs.google.com/spreadsheets", color: "green", enabled: true }
  ],

  // Notes
  customTemplates: [
    { id: "tpl_onboard", name: "New Client Onboarding", text: "## Onboarding\n- [ ] Account setup\n- [ ] Integrations\n- [ ] Welcome email\n- [ ] Kickoff call booked" },
    { id: "tpl_audit", name: "Monthly Audit", text: "## Monthly Audit\n- [ ] Verify lead flow\n- [ ] Check billing status\n- [ ] Review active workflows\n- [ ] Confirm integrations healthy" },
    { id: "tpl_call", name: "Discovery Call", text: "## Discovery Call — {date}\n**Attendee:**\n**Goal:**\n- [ ] Current challenges\n- [ ] Tech stack\n- [ ] Budget & timeline\n\n**Next steps:**" }
  ],
  templateVariables: true,        // substitute {client} {date} {section} {user} in templates
  enableNoteReminders: true,      // snooze/follow-up on pinned notes
  enableUndo: true,               // Cmd/Ctrl+Z walks note history

  // Sync
  syncNotes: false,               // mirror notes to chrome.storage.sync

  // Webhooks
  portfolioWebhookUrl: "",
  enableWebhook: false,

  // Asana Integration
  asanaToken: "",
  asanaWorkspaceId: "",
  asanaUserId: "",

  // Onboarding
  onboardingCompleted: false
};

/* -------------------- Settings I/O -------------------- */

function getSettings(callback) {
  try {
    chrome.storage.sync.get("settings", (data) => {
      if (data && data.settings) {
        const merged = deepMerge(DEFAULT_SETTINGS, data.settings);
        callback(merged);
      } else {
        callback({ ...DEFAULT_SETTINGS });
      }
    });
  } catch (e) {
    callback({ ...DEFAULT_SETTINGS });
  }
}

function saveSettings(settings, callback) {
  try {
    chrome.storage.sync.set({ settings }, () => {
      if (callback) callback();
    });
  } catch (e) {
    if (callback) callback();
  }
}

/* -------------------- Helpers -------------------- */

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (override && typeof override === "object" && !Array.isArray(override)) {
    for (const k of Object.keys(override)) {
      if (
        base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) &&
        override[k] && typeof override[k] === "object" && !Array.isArray(override[k])
      ) {
        out[k] = deepMerge(base[k], override[k]);
      } else if (override[k] !== undefined) {
        out[k] = override[k];
      }
    }
  }
  return out;
}

function truncate(str, max) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max - 1).trimEnd() + "\u2026";
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "00:00:00";
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatRelative(ts) {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Map any HEX to the nearest Chrome tab-group color
function mapHexToGroupColor(hex) {
  if (!hex) return "blue";
  hex = hex.toLowerCase().replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  if (hex.length !== 6) return "blue";

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const chromeColors = {
    grey: [128, 128, 128], blue: [26, 115, 232], red: [217, 48, 37],
    yellow: [244, 180, 0], green: [15, 157, 88], pink: [255, 105, 180],
    purple: [161, 66, 244], cyan: [0, 191, 255], orange: [255, 140, 0]
  };

  let closest = "blue";
  let min = Infinity;
  for (const [name, rgb] of Object.entries(chromeColors)) {
    const d = Math.pow(r - rgb[0], 2) + Math.pow(g - rgb[1], 2) + Math.pow(b - rgb[2], 2);
    if (d < min) { min = d; closest = name; }
  }
  return closest;
}

const CHROME_COLOR_HEX = {
  grey: "#5f6368", blue: "#1a73e8", red: "#d93025", yellow: "#f4b400",
  green: "#0f9d58", pink: "#ff69b4", purple: "#a142f4", cyan: "#00bfff", orange: "#ff8c00"
};

// Whether the URL looks like a GHL location dashboard
function isGhlUrl(url) {
  if (!url) return false;
  return url.includes("gohighlevel.com") || url.includes("highlevel.com") || url.includes("leadjuicehub.com") || url.includes("leadjuice.com");
}


/* ============================================================
 * Memory Bank Integration
 * Passive telemetry tracking, skills mapping, and accomplishments logging.
 * ============================================================ */

const DEFAULT_MEMORY_BANK = {
  profile: {
    name: "Jmasis23",
    title: "LeadJuice & GHL Specialist",
    bio: "Automating workflows, organizing clients, and maximizing sub-account performance dynamically."
  },
  badgePosition: "top-center",
  customDomains: [...DEFAULT_DOMAINS],
  telemetry: {
    total_hours_logged: 0,
    total_clients_managed: 0,
    streak_days: 1,
    last_active: null
  },
  skills_matrix: {},
  accomplishments: [],
  client_highlights: []
};

const SECTION_SKILL_MAP = {
  "dashboard": "Business Analytics & Dashboards",
  "conversations": "Client Communications & CRM",
  "contacts": "Contact & List Management",
  "opportunities": "Pipeline & Sales Operations",
  "payments": "Financial Systems & Billing",
  "calendars": "Scheduling & Booking Operations",
  "workflows": "Workflow Automation & Architecture",
  "automation": "Workflow Automation & Architecture",
  "triggers": "Workflow Automation & Architecture",
  "marketing": "Marketing Automation & Strategy",
  "email": "Marketing Automation & Strategy",
  "templates": "Marketing Automation & Strategy",
  "funnels": "Funnel & Landing Page Design",
  "sites": "Funnel & Landing Page Design",
  "page-builder": "Funnel & Landing Page Design",
  "social-planner": "Social Media Operations",
  "reporting": "Data Analytics & Reporting",
  "reputation": "Online Reputation Management",
  "settings": "Systems Administration & Config",
  "integrations": "Third-Party API Integrations",
  "phone-system": "VoIP & Telecom Administration",
  "app": "Custom App Implementations",
  "memberships": "Membership & Portal Design",
  "affiliate-manager": "Affiliate Program Operations"
};

function getMemoryBank(callback) {
  try {
    chrome.storage.local.get("portfolio_memory_bank", (data) => {
      if (data && data.portfolio_memory_bank) {
        callback(data.portfolio_memory_bank);
      } else {
        callback({ ...DEFAULT_MEMORY_BANK });
      }
    });
  } catch (e) {
    callback({ ...DEFAULT_MEMORY_BANK });
  }
}

function saveMemoryBank(bank, callback) {
  try {
    chrome.storage.local.set({ "portfolio_memory_bank": bank }, () => {
      if (callback) callback();
    });
  } catch (e) {
    if (callback) callback();
  }
}

function updateMemoryBankActivity(locId, clientName, sectionSlug, seconds, callback) {
  getMemoryBank((bank) => {
    // 1. Update telemetry hours
    const hours = (seconds / 3600);
    bank.telemetry.total_hours_logged = parseFloat((bank.telemetry.total_hours_logged + hours).toFixed(2));
    
    // Streak calculations
    const todayStr = new Date().toISOString().split("T")[0];
    const lastActiveStr = bank.telemetry.last_active ? new Date(bank.telemetry.last_active).toISOString().split("T")[0] : null;
    if (lastActiveStr && lastActiveStr !== todayStr) {
      const diffTime = Math.abs(new Date(todayStr) - new Date(lastActiveStr));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        bank.telemetry.streak_days += 1;
      } else if (diffDays > 1) {
        bank.telemetry.streak_days = 1;
      }
    }
    bank.telemetry.last_active = Date.now();

    // 2. Update skills matrix
    const skillName = SECTION_SKILL_MAP[sectionSlug] || "Systems Integration & Administration";
    if (!bank.skills_matrix[skillName]) {
      bank.skills_matrix[skillName] = { minutes: 0, weight: 0, level: "Intermediate" };
    }
    bank.skills_matrix[skillName].minutes += Math.max(1, Math.round(seconds / 60));
    
    // Recompute weights
    let totalMinutes = 0;
    for (const key of Object.keys(bank.skills_matrix)) {
      totalMinutes += bank.skills_matrix[key].minutes;
    }
    for (const key of Object.keys(bank.skills_matrix)) {
      const minutes = bank.skills_matrix[key].minutes;
      bank.skills_matrix[key].weight = parseFloat((minutes / totalMinutes).toFixed(2));
      if (minutes > 300) bank.skills_matrix[key].level = "Expert";
      else if (minutes > 120) bank.skills_matrix[key].level = "Advanced";
      else bank.skills_matrix[key].level = "Intermediate";
    }

    // 3. Update Client Highlights
    if (clientName && clientName !== "GHL Client") {
      let client = bank.client_highlights.find(c => c.name === clientName);
      if (!client) {
        client = { name: clientName, total_time_spent: "0m", minutes: 0, top_activity: skillName };
        bank.client_highlights.push(client);
      }
      client.minutes += Math.max(1, Math.round(seconds / 60));
      client.total_time_spent = client.minutes > 60 ? (client.minutes / 60).toFixed(1) + "h" : client.minutes + "m";
      client.top_activity = skillName;
      
      // Update total clients managed count
      bank.telemetry.total_clients_managed = bank.client_highlights.length;
    }

    saveMemoryBank(bank, callback);
  });
}

function addMemoryBankAccomplishment(clientName, task, callback) {
  getMemoryBank((bank) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const exists = bank.accomplishments.some(a => a.client === clientName && a.task === task);
    if (!exists) {
      bank.accomplishments.unshift({
        client: clientName || "General",
        task: task,
        date: todayStr
      });
      // Limit to 50 items
      bank.accomplishments = bank.accomplishments.slice(0, 50);
    }
    saveMemoryBank(bank, callback);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { 
    DEFAULT_SETTINGS, SECTIONS, DEFAULT_DOMAINS, getSettings, saveSettings, mapHexToGroupColor, CHROME_COLOR_HEX, 
    formatDuration, formatRelative, isGhlUrl, DEFAULT_MEMORY_BANK, SECTION_SKILL_MAP, 
    getMemoryBank, saveMemoryBank, updateMemoryBankActivity, addMemoryBankAccomplishment 
  };
}
