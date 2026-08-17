const fs = require('fs');

// ============================================================
// 1. Add CSS to content.css
// ============================================================
const cssPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.css';
let css = fs.readFileSync(cssPath, 'utf8');

const asanaStyles = `
/* ---------- Asana Custom Styles ---------- */
.ghl-panel-tabs {
  display: flex;
  background: var(--ghl-border-soft);
  border-bottom: 1px solid var(--ghl-border-soft);
  padding: 2px;
  gap: 2px;
}
.ghl-tab-btn {
  flex: 1;
  padding: 6px 0;
  background: none;
  border: none;
  color: var(--ghl-text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--ghl-radius-sm);
  transition: background 0.15s, color 0.15s;
}
.ghl-tab-btn:hover {
  background: var(--ghl-hover);
  color: var(--ghl-text);
}
.ghl-tab-btn.active {
  background: var(--ghl-surface-solid);
  color: var(--ghl-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.ghl-asana-view {
  display: flex;
  flex-direction: column;
  height: 280px;
}
.ghl-asana-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ghl-border-soft);
  font-size: 11px;
  color: var(--ghl-text);
}
.ghl-asana-refresh {
  background: none;
  border: none;
  color: var(--ghl-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ghl-asana-refresh:hover {
  background: var(--ghl-hover);
  color: var(--ghl-text);
}
.ghl-asana-refresh svg {
  width: 13px;
  height: 13px;
}
.ghl-asana-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}
.ghl-asana-loading {
  text-align: center;
  color: var(--ghl-text-muted);
  padding: 20px;
  font-size: 11.5px;
}
.ghl-asana-empty {
  text-align: center;
  color: var(--ghl-text-muted);
  padding: 20px;
  font-size: 11px;
}

.ghl-asana-task-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--ghl-text);
  border-bottom: 1px solid rgba(255,255,255,0.02);
}
.ghl-asana-subtask-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0 4px 18px;
  font-size: 11px;
  color: var(--ghl-text-muted);
}
.ghl-asana-task-item input, .ghl-asana-subtask-item input {
  margin-top: 2px;
}
.ghl-asana-task-text.completed, .ghl-asana-subtask-text.completed {
  text-decoration: line-through;
  opacity: 0.5;
}
`;

if (!css.includes('.ghl-panel-tabs')) {
  css += '\n' + asanaStyles;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('1. content.css updated with Asana list/tab switcher styles.');

// ============================================================
// 2. Update content.js buildPanel() and wirePanel() and add loadAsanaTasks()
// ============================================================
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let js = fs.readFileSync(jsPath, 'utf8');

// We need to wrap toolbar, editor, and footer in a .ghl-notes-view, and add .ghl-asana-view
// Let's locate buildPanel code
const oldBuildPanelStart = '  function buildPanel() {\n    if (panel) { loadNotes(); return; }\n    panel = el("div", "ghl-panel");\n    panel.style.display = "";';
const oldBuildPanelStartCRLF = '  function buildPanel() {\r\n    if (panel) { loadNotes(); return; }\r\n    panel = el("div", "ghl-panel");\r\n    panel.style.display = "";';

// Let's replace buildPanel entirely using a robust script replacement
const oldBuildPanelBlock = `  function buildPanel() {
    if (panel) { loadNotes(); return; }
    panel = el("div", "ghl-panel");
    panel.style.display = "";

    // header
    const header = el("div", "ghl-panel-header");
    header.innerHTML =
      \`<span class="ghl-avatar">\${clientName.charAt(0)}</span>\` +
      \`<div class="ghl-panel-title">\` +
        \`<div class="ghl-panel-name">\${clientName}</div>\` +
        \`<div class="ghl-panel-sub"><span class="ghl-sub-sec">\${sectionName}</span><span>·</span><span class="ghl-sub-time">00:00</span></div>\` +
      \`</div>\` +
      \`<div class="ghl-panel-actions">\` +
        \`<button class="ghl-icon-btn ghl-btn-theme" title="Toggle theme">\${settings.theme === "light" ? ICON.moon : ICON.sun}</button>\` +
        \`<button class="ghl-icon-btn ghl-btn-reminder" title="Set reminder">\${settings.theme === "light" ? ICON.moon : ICON.sun}</button>\` + // wait, sometimes icons vary, let's keep the user's exactly!
`;

// Let's read buildPanel lines and replace them in a clean way without guessing innerHTML spacing
// We can find '    // toolbar' in buildPanel and wrap it!
const oldBuildBodySection = `    // toolbar
    const toolbar = el("div", "ghl-toolbar");`;

const oldBuildBodySectionCRLF = `    // toolbar\r\n    const toolbar = el("div", "ghl-toolbar");`;

// Instead of rewriting buildPanel, let's just do file string replacements!
// We find:
// 1. Snapshot line append, and insert the tab switch right after it
const oldSnapCode = `    // snapshot line
    const snap = el("div", "ghl-snapshot");
    snap.innerHTML = \`\${ICON.info}<span class="ghl-snap-text">Loading…</span>\`;
    panel.appendChild(snap);`;

const oldSnapCodeCRLF = `    // snapshot line\r\n    const snap = el("div", \"ghl-snapshot\");\r\n    snap.innerHTML = \`\${ICON.info}<span class="ghl-snap-text">Loading…</span>\`;\r\n    panel.appendChild(snap);`;

const newSnapCode = `    // snapshot line
    const snap = el("div", "ghl-snapshot");
    snap.innerHTML = \`\${ICON.info}<span class="ghl-snap-text">Loading…</span>\`;
    panel.appendChild(snap);

    // Tab Switcher Bar
    const tabSwitch = el("div", "ghl-panel-tabs");
    tabSwitch.innerHTML = 
      \`<button class="ghl-tab-btn active" data-tab="notes">Notes</button>\` +
      \`<button class="ghl-tab-btn" data-tab="asana">Asana Tasks</button>\`;
    panel.appendChild(tabSwitch);

    // Create Views
    const notesView = el("div", "ghl-notes-view");
    panel.appendChild(notesView);

    const asanaView = el("div", "ghl-asana-view");
    asanaView.style.display = "none";
    asanaView.innerHTML = 
      \`<div class="ghl-asana-header">\` +
        \`<span>Asana Tasks for <b>\${clientName}</b></span>\` +
        \`<button class="ghl-asana-refresh" title="Refresh tasks">\${ICON.history}</button>\` +
      \`</div>\` +
      \`<div class="ghl-asana-list-container">\` +
        \`<div class="ghl-asana-loading">Select "Asana Tasks" to load...</div>\` +
      \`</div>\`;
    panel.appendChild(asanaView);`;

if (js.includes(oldSnapCodeCRLF)) {
  js = js.replace(oldSnapCodeCRLF, newSnapCode);
} else if (js.includes(oldSnapCode)) {
  js = js.replace(oldSnapCode, newSnapCode);
}

// 2. We change the parent elements from 'panel' to 'notesView' for:
// - toolbar
// - editor
// - footer
// Let's replace 'panel.appendChild(toolbar);' with 'notesView.appendChild(toolbar);'
js = js.replace('panel.appendChild(toolbar);', 'notesView.appendChild(toolbar);');
js = js.replace('panel.appendChild(editor);', 'notesView.appendChild(editor);');
js = js.replace('panel.appendChild(footer);', 'notesView.appendChild(footer);');

// 3. Add tab click listeners inside wirePanel()
const oldWireStart = '  function wirePanel() {';
const oldWireStartCRLF = '  function wirePanel() {\r\n';

const newWireStart = `  function wirePanel() {
    // Tab Switching Logic
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
            loadAsanaTasks();
          }
        });
      });
      
      asanaView.querySelector(".ghl-asana-refresh").addEventListener("click", () => {
        loadAsanaTasks();
      });
    }`;

if (js.includes(oldWireStartCRLF)) {
  js = js.replace(oldWireStartCRLF, newWireStart + '\n');
} else if (js.includes(oldWireStart)) {
  js = js.replace(oldWireStart, newWireStart);
}

// 4. Append loadAsanaTasks() function to the end of content.js (inside IIFE)
const asanaLoaderJs = `
  /* -------------------- Asana Tasks Client Fetcher -------------------- */
  function loadAsanaTasks() {
    const listContainer = panel.querySelector(".ghl-asana-list-container");
    if (!listContainer) return;
    
    if (!settings.asanaToken || !settings.asanaWorkspaceId) {
      listContainer.innerHTML = '<div class="ghl-asana-empty">Asana is not connected. Configure your token in the extension options page.</div>';
      return;
    }
    
    listContainer.innerHTML = '<div class="ghl-asana-loading">Searching Asana project matching client...</div>';
    
    const token = settings.asanaToken;
    const ws = settings.asanaWorkspaceId;
    const userGid = settings.asanaUserId;
    
    // Fetch user me if not cached
    let fetchUserPromise = userGid ? Promise.resolve(userGid) : 
      fetch("https://app.asana.com/api/1.1/users/me", {
        headers: { "Authorization": \`Bearer \${token}\` }
      })
      .then(r => r.json())
      .then(res => {
        settings.asanaUserId = res.data.gid;
        try { chrome.storage.sync.set({ settings }); } catch(err) {}
        return res.data.gid;
      });
      
    fetchUserPromise.then((activeUserGid) => {
      // 1. Search projects in workspace
      return fetch(\`https://app.asana.com/api/1.1/projects?workspace=\${ws}&opt_fields=name,gid\`, {
        headers: { "Authorization": \`Bearer \${token}\` }
      })
      .then(r => r.json())
      .then(res => {
        if (!res.data) throw new Error("No projects returned");
        const match = res.data.find(p => p.name.toLowerCase().includes(clientName.toLowerCase()));
        if (!match) {
          listContainer.innerHTML = \`<div class="ghl-asana-empty">No active Asana project found matching "\${clientName}".</div>\`;
          return;
        }
        
        listContainer.innerHTML = \`<div class="ghl-asana-loading">Project "\${match.name}" found. Loading tasks...</div>\`;
        
        // 2. Fetch tasks in project including subtasks
        return fetch(\`https://app.asana.com/api/1.1/tasks?project=\${match.gid}&opt_fields=name,completed,assignee.gid,due_on,subtasks.name,subtasks.completed,subtasks.assignee.gid\`, {
          headers: { "Authorization": \`Bearer \${token}\` }
        })
        .then(r => r.json())
        .then(res => {
          if (!res.data) throw new Error("No tasks returned");
          
          // 3. Filter tasks or subtasks assigned to me
          const myTasks = res.data.filter(t => {
            const isTaskAssigned = t.assignee && t.assignee.gid === activeUserGid;
            const hasMySubtask = t.subtasks && t.subtasks.some(s => s.assignee && s.assignee.gid === activeUserGid);
            return isTaskAssigned || hasMySubtask;
          });
          
          listContainer.innerHTML = "";
          if (myTasks.length === 0) {
            listContainer.innerHTML = '<div class="ghl-asana-empty">No active tasks assigned to you in this project.</div>';
            return;
          }
          
          myTasks.forEach((t) => {
            const tAssigned = t.assignee && t.assignee.gid === activeUserGid;
            
            // Render Parent Task if assigned
            if (tAssigned) {
              const row = document.createElement("div");
              row.className = "ghl-asana-task-item";
              row.innerHTML = \`
                <input type="checkbox" \${t.completed ? "checked" : ""} disabled style="pointer-events:none">
                <span class="ghl-asana-task-text \${t.completed ? "completed" : ""}">\${t.name}</span>
              \`;
              listContainer.appendChild(row);
            }
            
            // Render Child Subtasks
            if (t.subtasks && t.subtasks.length > 0) {
              t.subtasks.forEach((sub) => {
                const isSubAssigned = sub.assignee && sub.assignee.gid === activeUserGid;
                if (isSubAssigned) {
                  const subRow = document.createElement("div");
                  subRow.className = "ghl-asana-subtask-item";
                  subRow.innerHTML = \`
                    <input type="checkbox" \${sub.completed ? "checked" : ""} disabled style="pointer-events:none">
                    <span class="ghl-asana-subtask-text \${sub.completed ? "completed" : ""}">\${sub.name} <small style="color:var(--ghl-text-faint);font-size:8.5px;margin-left:4px">(subtask)</small></span>
                  \`;
                  listContainer.appendChild(subRow);
                }
              });
            }
          });
        });
      });
    })
    .catch(err => {
      listContainer.innerHTML = \`<div class="ghl-asana-empty" style="color:var(--ghl-red)">Error loading from Asana: \${err.message}</div>\`;
    });
  }
`;

// Insert the loader right before the closing wrapper of the IIFE
const oldClosing = '})();';
if (js.includes(oldClosing)) {
  js = js.replace(oldClosing, asanaLoaderJs + '\n})();');
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('2. content.js updated with Asana Tasks switcher UI, click listeners, and fetch/filter asynchronous API connector.');
