const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\utils.js';
let content = fs.readFileSync(filePath, 'utf8');

const newCode = `
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
`;

// Replace exports line to include our new functions
const oldExports = 'if (typeof module !== "undefined" && module.exports) {\r\n  module.exports = { DEFAULT_SETTINGS, SECTIONS, DEFAULT_DOMAINS, getSettings, saveSettings, mapHexToGroupColor, formatDuration, formatRelative, isGhlUrl };\r\n}';
const oldExportsLF = 'if (typeof module !== "undefined" && module.exports) {\n  module.exports = { DEFAULT_SETTINGS, SECTIONS, DEFAULT_DOMAINS, getSettings, saveSettings, mapHexToGroupColor, formatDuration, formatRelative, isGhlUrl };\n}';

const newExports = `if (typeof module !== "undefined" && module.exports) {
  module.exports = { 
    DEFAULT_SETTINGS, SECTIONS, DEFAULT_DOMAINS, getSettings, saveSettings, mapHexToGroupColor, 
    formatDuration, formatRelative, isGhlUrl, DEFAULT_MEMORY_BANK, SECTION_SKILL_MAP, 
    getMemoryBank, saveMemoryBank, updateMemoryBankActivity, addMemoryBankAccomplishment 
  };
}`;

if (content.includes(oldExports)) {
  content = content.replace(oldExports, newCode + '\n' + newExports);
} else if (content.includes(oldExportsLF)) {
  content = content.replace(oldExportsLF, newCode + '\n' + newExports);
} else {
  // Regex fallback or append
  content += '\n' + newCode + '\n' + newExports;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added memory bank utility code to utils.js');
