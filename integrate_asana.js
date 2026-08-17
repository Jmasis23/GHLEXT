const fs = require('fs');

// ============================================================
// 1. Update utils.js to include Asana settings
// ============================================================
const utilsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\utils.js';
let utils = fs.readFileSync(utilsPath, 'utf8');

const oldSettingsEnd = '  // Onboarding\n  onboardingCompleted: false\n};';
const oldSettingsEndCRLF = '  // Onboarding\r\n  onboardingCompleted: false\r\n};';

const newAsanaSettings = `  // Asana Integration
  asanaToken: "",
  asanaWorkspaceId: "",
  asanaUserId: "",

  // Onboarding
  onboardingCompleted: false
};`;

if (utils.includes(oldSettingsEndCRLF)) {
  utils = utils.replace(oldSettingsEndCRLF, newAsanaSettings);
} else if (utils.includes(oldSettingsEnd)) {
  utils = utils.replace(oldSettingsEnd, newAsanaSettings);
}
fs.writeFileSync(utilsPath, utils, 'utf8');
console.log('1. utils.js updated with Asana settings.');

// ============================================================
// 2. Update options.html to add Asana Integration card
// ============================================================
const htmlPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const oldGeneralEnd = '          <div class="row">\n            <div class="row-info"><div class="row-title">Smart Grouping Suggestions</div><div class="row-desc">Suggest colors for clients you open frequently but haven\'t tagged</div></div>\n            <label class="switch"><input type="checkbox" id="smart-suggestions-toggle"><span class="slider"></span></label>\n          </div>\n        </div>';
const oldGeneralEndCRLF = '          <div class="row">\r\n            <div class="row-info"><div class="row-title">Smart Grouping Suggestions</div><div class="row-desc">Suggest colors for clients you open frequently but haven\'t tagged</div></div>\r\n            <label class="switch"><input type="checkbox" id="smart-suggestions-toggle"><span class="slider"></span></label>\r\n          </div>\r\n        </div>';

const asanaCardHtml = `          <div class="row">
            <div class="row-info"><div class="row-title">Smart Grouping Suggestions</div><div class="row-desc">Suggest colors for clients you open frequently but haven\'t tagged</div></div>
            <label class="switch"><input type="checkbox" id="smart-suggestions-toggle"><span class="slider"></span></label>
          </div>
        </div>

        <!-- Asana Integration Card -->
        <div class="card">
          <div class="sub-title">📌 Asana Integration</div>
          <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.4">
            Connect to Asana to automatically pull in project tasks and subtasks assigned to you matching the active Client name.
          </p>
          <div class="col" style="gap:12px">
            <div class="col">
              <label class="lbl">Asana Personal Access Token (PAT)</label>
              <input type="password" id="asana-token-input" class="text-input" placeholder="0/1204812048120...">
            </div>
            <div class="grid-2">
              <div class="col">
                <label class="lbl">Workspace</label>
                <select id="asana-workspace-select" class="select"><option value="">Select workspace...</option></select>
              </div>
              <div class="col">
                <label class="lbl">Status</label>
                <div id="asana-status-badge" style="font-size:12.5px;font-weight:600;color:var(--muted);margin-top:10px">Not connected</div>
              </div>
            </div>
          </div>
        </div>`;

if (html.includes(oldGeneralEndCRLF)) {
  html = html.replace(oldGeneralEndCRLF, asanaCardHtml);
} else if (html.includes(oldGeneralEnd)) {
  html = html.replace(oldGeneralEnd, asanaCardHtml);
}
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('2. options.html updated with Asana Integration UI.');

// ============================================================
// 3. Update options.js to bind Asana Token and Workspace lists
// ============================================================
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.js';
let js = fs.readFileSync(jsPath, 'utf8');

const oldJsInitEnd = '    renderDomains();\n    renderClients();\n    renderTemplates();\n    renderGroupers();\n  });\n}';
const oldJsInitEndCRLF = '    renderDomains();\r\n    renderClients();\r\n    renderTemplates();\r\n    renderGroupers();\r\n  });\r\n}';

const newAsanaJsInit = `    renderDomains();
    renderClients();
    renderTemplates();
    renderGroupers();
    
    // Bind Asana fields
    const tokInp = document.getElementById("asana-token-input");
    tokInp.value = s.asanaToken || "";
    tokInp.addEventListener("change", (e) => {
      updateSetting("asanaToken", e.target.value);
      testAsanaConnection(e.target.value);
    });
    
    if (s.asanaToken) {
      testAsanaConnection(s.asanaToken);
    }
  });
}`;

if (js.includes(oldJsInitEndCRLF)) {
  js = js.replace(oldJsInitEndCRLF, newAsanaJsInit);
} else if (js.includes(oldJsInitEnd)) {
  js = js.replace(oldJsInitEnd, newAsanaJsInit);
}

// Add the Asana connection test and loading functions to the end of options.js
const asanaHelperFunctions = `
/* -------------------- Asana Options Helper -------------------- */
function testAsanaConnection(token) {
  const badge = document.getElementById("asana-status-badge");
  const wsSelect = document.getElementById("asana-workspace-select");
  if (!token) {
    badge.textContent = "Not connected";
    badge.style.color = "var(--muted)";
    wsSelect.innerHTML = '<option value="">Select workspace...</option>';
    return;
  }
  
  badge.textContent = "Connecting...";
  badge.style.color = "var(--amber)";
  
  // 1. Fetch user
  fetch("https://app.asana.com/api/1.1/users/me", {
    headers: { "Authorization": \`Bearer \${token}\` }
  })
  .then(r => {
    if (!r.ok) throw new Error("Auth failed");
    return r.json();
  })
  .then(res => {
    const user = res.data;
    badge.textContent = \`Connected as \${user.name}\`;
    badge.style.color = "var(--green)";
    S.asanaUserId = user.gid;
    saveSettings(S);
    
    // 2. Fetch workspaces
    return fetch("https://app.asana.com/api/1.1/workspaces", {
      headers: { "Authorization": \`Bearer \${token}\` }
    });
  })
  .then(r => r ? r.json() : null)
  .then(res => {
    if (!res) return;
    wsSelect.innerHTML = "";
    res.data.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w.gid;
      opt.textContent = w.name;
      if (w.gid === S.asanaWorkspaceId) opt.selected = true;
      wsSelect.appendChild(opt);
    });
    
    // bind workspace change
    if (wsSelect.onchange === null) {
      wsSelect.onchange = (e) => {
        updateSetting("asanaWorkspaceId", e.target.value);
      };
    }
    
    if (!S.asanaWorkspaceId && res.data.length > 0) {
      updateSetting("asanaWorkspaceId", res.data[0].gid);
    }
  })
  .catch(err => {
    badge.textContent = "Connection failed";
    badge.style.color = "var(--red)";
    wsSelect.innerHTML = '<option value="">Select workspace...</option>';
  });
}
`;

if (!js.includes('testAsanaConnection')) {
  js += '\n' + asanaHelperFunctions;
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('3. options.js updated with Asana validation & dropdown discover bindings.');
