const fs = require('fs');

// 1. Patch options.html
const htmlPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Insert nav link
const oldNav = '        <a href="#appearance" class="nav-item" data-tab="appearance">';
const newNav = '        <a href="#memory" class="nav-item" data-tab="memory">\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>\n          Memory Bank\n        </a>\n        <a href="#appearance" class="nav-item" data-tab="appearance">';

if (html.includes(oldNav)) {
  html = html.replace(oldNav, newNav);
}

// Insert tab section
const oldSection = '      <!-- APPEARANCE -->';
const memoryTabHtml = `      <!-- MEMORY BANK -->
      <section id="memory-tab" class="tab">
        <div class="head">
          <h1>Professional Memory Bank</h1>
          <p>Autonomous work telemetry, skills computation, and proof of work harvested from your browser.</p>
        </div>
        
        <!-- Profile Card & Stats -->
        <div class="grid-2">
          <div class="card" style="margin-bottom:0">
            <div class="mb-profile-header">
              <div class="mb-profile-avatar">J</div>
              <div>
                <h2 id="mb-profile-name" style="font-size:16px;font-weight:700">Jmasis23</h2>
                <div id="mb-profile-title" style="font-size:12px;color:var(--accent);font-weight:600;margin-top:2px">LeadJuice Automation Architect</div>
              </div>
            </div>
            <div class="div" style="margin:14px 0"></div>
            <p id="mb-profile-bio" style="font-size:12.5px;color:var(--muted);line-height:1.5">Learning your focus areas as you work in GHL...</p>
          </div>
          
          <div class="card" style="margin-bottom:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:center;padding:18px">
            <div class="mb-counter">
              <div class="mb-counter-val" id="mb-telemetry-hours">0h</div>
              <div class="mb-counter-lbl">Hours Logged</div>
            </div>
            <div class="mb-counter">
              <div class="mb-counter-val" id="mb-telemetry-clients">0</div>
              <div class="mb-counter-lbl">Clients Scaled</div>
            </div>
            <div class="mb-counter">
              <div class="mb-counter-val" id="mb-telemetry-streak" style="color:var(--amber)">1d</div>
              <div class="mb-counter-lbl">Work Streak</div>
            </div>
          </div>
        </div>
        
        <div style="height:20px"></div>
        
        <!-- Skills Matrix & Discovered Clients -->
        <div class="grid-2">
          <div class="card" style="margin-bottom:0">
            <div class="sub-title">🤖 Computed Skills Distribution</div>
            <div id="mb-skills-list" style="display:flex;flex-direction:column;gap:14px">
              <div class="empty-state">No automated skills tracked yet. Keep working in GHL!</div>
            </div>
          </div>
          
          <div class="card" style="margin-bottom:0">
            <div class="sub-title">🏢 Sub-Account Highlights</div>
            <div id="mb-clients-list" style="display:flex;flex-direction:column;gap:10px">
              <div class="empty-state">No client metrics recorded yet.</div>
            </div>
          </div>
        </div>
        
        <div style="height:20px"></div>
        
        <!-- Accomplishments & Portfolio Integration -->
        <div class="card">
          <div class="sub-title">✅ Proof of Work Feed (Accomplishments)</div>
          <div id="mb-accomplishments-list" style="display:flex;flex-direction:column;gap:12px;max-height:220px;overflow-y:auto;padding-right:4px">
            <div class="empty-state">No accomplishments logged. Check off tasks in your client notepad checklists to auto-log them here!</div>
          </div>
        </div>
        
        <!-- Portfolio Engine & JSON Export -->
        <div class="card">
          <div class="row">
            <div class="row-info">
              <div class="row-title">Portfolio &amp; Landing Page Engine</div>
              <div class="row-desc">Copy your self-improving Memory Bank JSON payload to feed your external landing page or resume website.</div>
            </div>
            <button class="btn-primary" id="mb-export-btn">Copy JSON Payload</button>
          </div>
          <div class="div"></div>
          <div class="sub-title">Live Memory Bank JSON</div>
          <pre id="mb-json-preview" style="font-family:var(--mono);font-size:11px;background:var(--surface-2);padding:14px;border-radius:var(--radius-sm);max-height:160px;overflow-y:auto;color:#10b981;border:1px solid rgba(16,185,129,0.15)"></pre>
        </div>
      </section>\n\n      <!-- APPEARANCE -->`;

if (html.includes(oldSection)) {
  html = html.replace(oldSection, memoryTabHtml);
}
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('1. options.html patched successfully.');

// 2. Patch options.css
const cssPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.css';
let css = fs.readFileSync(cssPath, 'utf8');

const newStyles = `
/* ---------- Memory Bank Styles ---------- */
.mb-profile-header { display: flex; align-items: center; gap: 14px; }
.mb-profile-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #4f46e5);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 18px; color: #fff;
}
.mb-counter { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.mb-counter-val { font-size: 26px; font-weight: 800; color: #ffffff; text-shadow: 0 0 10px rgba(255,255,255,0.1); }
.mb-counter-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 4px; }

.mb-skill-row { display: flex; flex-direction: column; gap: 5px; }
.mb-skill-header { display: flex; justify-content: space-between; align-items: center; }
.mb-skill-name { font-size: 12.5px; font-weight: 600; color: var(--text); }
.mb-skill-badge { font-size: 9px; padding: 2px 6px; border-radius: 99px; font-weight: 700; text-transform: uppercase; }
.mb-skill-badge.expert { background: rgba(16,185,129,0.12); color: #10b981; }
.mb-skill-badge.advanced { background: rgba(139,92,246,0.12); color: var(--accent); }
.mb-skill-badge.intermediate { background: rgba(245,158,11,0.12); color: #f59e0b; }
.mb-skill-progress-bg { height: 6px; background: rgba(255,255,255,0.04); border-radius: 99px; overflow: hidden; }
.mb-skill-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #6366f1); border-radius: 99px; }
.mb-skill-footer { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--muted); }

.mb-client-highlight-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-soft); border-radius: var(--radius-sm); }
.mb-ch-left { display: flex; align-items: center; gap: 10px; }
.mb-ch-avatar { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; }
.mb-ch-info { display: flex; flex-direction: column; }
.mb-ch-name { font-size: 12.5px; font-weight: 600; }
.mb-ch-activity { font-size: 10px; color: var(--muted); }
.mb-ch-time { font-size: 11px; font-family: var(--mono); color: var(--accent); font-weight: 500; }

.mb-acc-row { display: flex; gap: 12px; align-items: flex-start; padding: 6px 0; }
.mb-acc-marker { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); border: 2px solid #000; box-shadow: 0 0 0 2px var(--accent-soft); flex-shrink: 0; margin-top: 5px; }
.mb-acc-content { flex: 1; }
.mb-acc-title { font-size: 12.5px; font-weight: 600; color: #ffffff; }
.mb-acc-meta { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
`;

if (!css.includes('.mb-profile-header')) {
  css += '\n' + newStyles;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('2. options.css patched successfully.');

// 3. Patch options.js
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Update menu click listener logic to include rendering of memory bank
const oldNavClick = '      if (item.dataset.tab === "activity") renderActivity();\r\n      if (item.dataset.tab === "clients") renderClients();';
const oldNavClickLF = '      if (item.dataset.tab === "activity") renderActivity();\n      if (item.dataset.tab === "clients") renderClients();';

const newNavClick = '      if (item.dataset.tab === "activity") renderActivity();\n      if (item.dataset.tab === "clients") renderClients();\n      if (item.dataset.tab === "memory") renderMemoryBank();';

if (js.includes(oldNavClick)) {
  js = js.replace(oldNavClick, newNavClick);
} else if (js.includes(oldNavClickLF)) {
  js = js.replace(oldNavClickLF, newNavClick);
}

// Add copy listener and renderMemoryBank to the end of options.js
const memoryBankCode = `
/* -------------------- Memory Bank Rendering -------------------- */
function renderMemoryBank() {
  getMemoryBank((bank) => {
    // 1. Profile
    document.getElementById("mb-profile-name").textContent = bank.profile.name || "Jmasis23";
    document.getElementById("mb-profile-title").textContent = bank.profile.title || bank.profile.computed_title || "LeadJuice & GHL Specialist";
    document.getElementById("mb-profile-bio").textContent = bank.profile.bio || bank.profile.bio_summary || "Automating GHL sub-accounts.";

    // 2. Counters
    document.getElementById("mb-telemetry-hours").textContent = bank.telemetry.total_hours_logged ? bank.telemetry.total_hours_logged.toFixed(1) + "h" : "0h";
    document.getElementById("mb-telemetry-clients").textContent = bank.telemetry.total_clients_managed || "0";
    document.getElementById("mb-telemetry-streak").textContent = (bank.telemetry.streak_days || 1) + "d";

    // 3. Skills Matrix
    const skillsList = document.getElementById("mb-skills-list");
    skillsList.innerHTML = "";
    const skillsKeys = Object.keys(bank.skills_matrix || {});
    if (skillsKeys.length === 0) {
      skillsList.innerHTML = '<div class="empty-state">No automated skills tracked yet. Keep working in GHL to train your skills matrix!</div>';
    } else {
      skillsKeys.sort((a, b) => bank.skills_matrix[b].minutes - bank.skills_matrix[a].minutes);
      skillsKeys.forEach((key) => {
        const skill = bank.skills_matrix[key];
        const pct = Math.round(skill.weight * 100);
        const row = document.createElement("div");
        row.className = "mb-skill-row";
        row.innerHTML = \`
          <div class="mb-skill-header">
            <span class="mb-skill-name">\${key}</span>
            <span class="mb-skill-badge \${skill.level.toLowerCase()}">\${skill.level}</span>
          </div>
          <div class="mb-skill-progress-bg">
            <div class="mb-skill-progress-bar" style="width: \${Math.max(8, pct)}%"></div>
          </div>
          <div class="mb-skill-footer">
            <span>\${skill.minutes} minutes logged</span>
            <span>\${pct}% weight</span>
          </div>
        \`;
        skillsList.appendChild(row);
      });
    }

    // 4. Discovered Clients
    const clientList = document.getElementById("mb-clients-list");
    clientList.innerHTML = "";
    if (!bank.client_highlights || bank.client_highlights.length === 0) {
      clientList.innerHTML = '<div class="empty-state">No client metrics recorded yet.</div>';
    } else {
      bank.client_highlights.forEach((c) => {
        const row = document.createElement("div");
        row.className = "mb-client-highlight-row";
        row.innerHTML = \`
          <div class="mb-ch-left">
            <span class="mb-ch-avatar" style="background: var(--accent, #8b5cf6)">\${c.name.charAt(0)}</span>
            <div class="mb-ch-info">
              <span class="mb-ch-name">\${c.name}</span>
              <span class="mb-ch-activity">\${c.top_activity}</span>
            </div>
          </div>
          <span class="mb-ch-time">\${c.total_time_spent}spent</span>
        \`;
        clientList.appendChild(row);
      });
    }

    // 5. Accomplishments
    const accList = document.getElementById("mb-accomplishments-list");
    accList.innerHTML = "";
    if (!bank.accomplishments || bank.accomplishments.length === 0) {
      accList.innerHTML = '<div class="empty-state">No achievements logged. Check off tasks in your client notepad checklists to auto-log them here!</div>';
    } else {
      bank.accomplishments.forEach((a) => {
        const row = document.createElement("div");
        row.className = "mb-acc-row";
        row.innerHTML = \`
          <div class="mb-acc-marker"></div>
          <div class="mb-acc-content">
            <div class="mb-acc-title">\${a.task}</div>
            <div class="mb-acc-meta">Logged for <b>\${a.client}</b> on \${a.date}</div>
          </div>
        \`;
        accList.appendChild(row);
      });
    }

    // 6. JSON Live Preview
    document.getElementById("mb-json-preview").textContent = JSON.stringify(bank, null, 2);
  });
}

// Add copy button listener
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("mb-export-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      getMemoryBank((bank) => {
        navigator.clipboard.writeText(JSON.stringify(bank, null, 2)).then(() => {
          const originalText = btn.textContent;
          btn.textContent = "Copied Payload!";
          btn.style.background = "#10b981";
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "";
          }, 1500);
        });
      });
    });
  }
});
`;

if (!js.includes('renderMemoryBank')) {
  js += '\n' + memoryBankCode;
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('3. options.js patched successfully.');
