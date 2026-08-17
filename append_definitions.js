const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.js';
let content = fs.readFileSync(filePath, 'utf8');

const asanaCode = `
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
          <span class="mb-ch-time">\${c.total_time_spent} spent</span>
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

// Cleanly append both blocks of code
content += '\n' + asanaCode + '\n' + memoryBankCode;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully appended Asana and Memory Bank definitions to options.js');
