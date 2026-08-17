const fs = require('fs');

// ============================================================
// 1. Update content.css
// ============================================================
const cssPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Update/Add custom select styles for Asana dropdown & position handle inside
const cssAdditions = `
/* Asana dropdown filter */
.ghl-asana-task-select {
  background: var(--ghl-input-bg);
  border: 1px solid var(--ghl-border);
  color: var(--ghl-text);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 6px;
  outline: none;
  max-width: 195px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.ghl-asana-task-select:focus {
  border-color: var(--ghl-accent);
}

/* Custom Resize Handle Styles - Positioned Inside Rounded Corner */
.ghl-resize-handle {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  cursor: se-resize;
  z-index: 2147483647;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  pointer-events: auto;
}
.ghl-resize-handle::after {
  content: "";
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--ghl-text-muted);
  border-bottom: 2px solid var(--ghl-text-muted);
  opacity: 0.5;
  margin-right: 2px;
  margin-bottom: 2px;
  transition: opacity 0.15s, border-color 0.15s;
}
.ghl-resize-handle:hover::after {
  opacity: 1;
  border-color: var(--ghl-accent);
}
`;

// Remove the old resize handle definition
css = css.replace(/\/\* Custom Resize Handle Styles \*\/[\s\S]*?opacity:\s*0\.8;\s*\}/g, '');

if (!css.includes('.ghl-asana-task-select')) {
  css += '\n' + cssAdditions;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('1. content.css updated successfully.');

// ============================================================
// 2. Update content.js
// ============================================================
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let js = fs.readFileSync(jsPath, 'utf8');

// We want to update:
// A. The HTML template for ghl-asana-view in content.js to use select dropdown instead of static text
const oldAsanaHeaderHtml = '`<span>Asana Tasks for <b>${clientName}</b></span>`';
const newAsanaHeaderHtml = '`<select class="ghl-asana-task-select" title="Filter tasks"><option value="all">All Tasks</option></select>`';

if (js.includes(oldAsanaHeaderHtml)) {
  js = js.replace(oldAsanaHeaderHtml, newAsanaHeaderHtml);
}

// B. We want to update loadAsanaTasks() to populate this select and dynamically filter rendering!
const oldLoaderBody = `          listContainer.innerHTML = "";
          if (myTasks.length === 0) {
            listContainer.innerHTML = '<div class="ghl-asana-empty">No active tasks assigned to you in this project.</div>';
            return;
          }
          
          myTasks.forEach((t) => {
            // Render Parent Task (Always render as header to group subtasks properly!)
            const row = document.createElement("div");
            row.className = "ghl-asana-task-item";
            row.innerHTML = \`
              <input type="checkbox" \${t.completed ? "checked" : ""} disabled style="pointer-events:none">
              <span class="ghl-asana-task-text \${t.completed ? "completed" : ""}"><b>\${t.name}</b></span>
            \`;
            listContainer.appendChild(row);
            
            // Render Child Subtasks (Render ALL subtasks under this parent task!)
            if (t.subtasks && t.subtasks.length > 0) {
              t.subtasks.forEach((sub) => {
                const subRow = document.createElement("div");
                subRow.className = "ghl-asana-subtask-item";
                subRow.innerHTML = \`
                  <input type="checkbox" \${sub.completed ? "checked" : ""} disabled style="pointer-events:none">
                  <span class="ghl-asana-subtask-text \s\${sub.completed ? "completed" : ""}">\${sub.name}</span>
                \`;
                listContainer.appendChild(subRow);
              });
            }
          });`;

const oldLoaderBodyCRLF = `          listContainer.innerHTML = "";
          if (myTasks.length === 0) {
            listContainer.innerHTML = '<div class="ghl-asana-empty">No active tasks assigned to you in this project.</div>';
            return;
          }
          
          myTasks.forEach((t) => {
            // Render Parent Task (Always render as header to group subtasks properly!)
            const row = document.createElement("div");
            row.className = "ghl-asana-task-item";
            row.innerHTML = \`
              <input type="checkbox" \${t.completed ? "checked" : ""} disabled style="pointer-events:none">
              <span class="ghl-asana-task-text \${t.completed ? "completed" : ""}"><b>\${t.name}</b></span>
            \`;
            listContainer.appendChild(row);
            
            // Render Child Subtasks (Render ALL subtasks under this parent task!)
            if (t.subtasks && t.subtasks.length > 0) {
              t.subtasks.forEach((sub) => {
                const subRow = document.createElement("div");
                subRow.className = "ghl-asana-subtask-item";
                subRow.innerHTML = \`
                  <input type="checkbox" \${sub.completed ? "checked" : ""} disabled style="pointer-events:none">
                  <span class="ghl-asana-subtask-text \${sub.completed ? "completed" : ""}">\${sub.name}</span>
                \`;
                listContainer.appendChild(subRow);
              });
            }
          });`;

const newLoaderBody = `          // Populate the Dropdown Filter with assigned Parent Tasks
          const select = panel.querySelector(".ghl-asana-task-select");
          if (select) {
            const currentSelected = select.value || "all";
            select.innerHTML = '<option value="all">All Tasks</option>';
            myTasks.forEach((t) => {
              const opt = document.createElement("option");
              opt.value = t.gid;
              opt.textContent = t.name.length > 28 ? t.name.slice(0, 28) + "..." : t.name;
              if (t.gid === currentSelected) opt.selected = true;
              select.appendChild(opt);
            });
            
            // Wire Select Filter Change
            if (select.onchange === null) {
              select.onchange = (e) => {
                renderAsanaTasksList(myTasks, e.target.value, listContainer);
              };
            }
            
            renderAsanaTasksList(myTasks, select.value, listContainer);
          } else {
            renderAsanaTasksList(myTasks, "all", listContainer);
          }`;

if (js.includes(oldLoaderBodyCRLF)) {
  js = js.replace(oldLoaderBodyCRLF, newLoaderBody);
} else if (js.includes(oldLoaderBody)) {
  js = js.replace(oldLoaderBody, newLoaderBody);
}

// D. Add the helper function renderAsanaTasksList() to options or content.js inside IIFE
const asanaRendererJs = `
  /* Helper to render Asana Tasks cleanly (interactive local checkoffs, no-sync) */
  function renderAsanaTasksList(tasks, filterGid, container) {
    container.innerHTML = "";
    if (tasks.length === 0) {
      container.innerHTML = '<div class="ghl-asana-empty">No active tasks.</div>';
      return;
    }
    
    // Sort tasks so completed ones go to bottom (very satisfying!)
    const sortedTasks = [...tasks].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    
    sortedTasks.forEach((t) => {
      // If we filtered by a specific parent task GID, skip others
      if (filterGid !== "all" && t.gid !== filterGid) return;
      
      // Render Parent Task
      const row = document.createElement("div");
      row.className = "ghl-asana-task-item";
      row.innerHTML = \`
        <input type="checkbox" \${t.completed ? "checked" : ""} class="ghl-asana-cb">
        <span class="ghl-asana-task-text \${t.completed ? "completed" : ""}"><b>\${t.name}</b></span>
      \`;
      
      // Make checkboxes fully interactive on the front-end (no Asana sync!)
      const cb = row.querySelector(".ghl-asana-cb");
      cb.addEventListener("change", (e) => {
        const txt = row.querySelector(".ghl-asana-task-text");
        if (e.target.checked) txt.classList.add("completed");
        else txt.classList.remove("completed");
      });
      container.appendChild(row);
      
      // Render Nested Subtasks
      if (t.subtasks && t.subtasks.length > 0) {
        t.subtasks.forEach((sub) => {
          const subRow = document.createElement("div");
          subRow.className = "ghl-asana-subtask-item";
          subRow.innerHTML = \`
            <input type="checkbox" \${sub.completed ? "checked" : ""} class="ghl-asana-cb">
            <span class="ghl-asana-subtask-text \${sub.completed ? "completed" : ""}">\${sub.name}</span>
          \`;
          
          const subCb = subRow.querySelector(".ghl-asana-cb");
          subCb.addEventListener("change", (e) => {
            const subTxt = subRow.querySelector(".ghl-asana-subtask-text");
            if (e.target.checked) subTxt.classList.add("completed");
            else subTxt.classList.remove("completed");
          });
          container.appendChild(subRow);
        });
      }
    });
    
    if (container.innerHTML === "") {
      container.innerHTML = '<div class="ghl-asana-empty">No active tasks matching this filter.</div>';
    }
  }
`;

const oldClosing = '})();';
if (js.includes(oldClosing)) {
  js = js.replace(oldClosing, asanaRendererJs + '\n})();');
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('2. content.js updated successfully.');
