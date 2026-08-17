const fs = require('fs');

// ============================================================
// 1. Update content.css
// ============================================================
const cssPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Custom checkboxes for Asana
const asanaCheckboxCss = `
/* Custom styled checkboxes for Asana Task/Subtask Items */
.ghl-asana-task-item input[type="checkbox"],
.ghl-asana-subtask-item input[type="checkbox"] {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--ghl-border);
  border-radius: 4px;
  background: var(--ghl-input-bg);
  outline: none;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
.ghl-asana-task-item input[type="checkbox"]:checked,
.ghl-asana-subtask-item input[type="checkbox"]:checked {
  background: var(--ghl-accent);
  border-color: var(--ghl-accent);
}
.ghl-asana-task-item input[type="checkbox"]:checked::after,
.ghl-asana-subtask-item input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 3px;
  height: 6px;
  border: solid #ffffff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

/* Custom Resize Handle Styles */
.ghl-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: se-resize;
  z-index: 30;
  background: transparent;
}
.ghl-resize-handle::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--ghl-text-muted);
  border-bottom: 2px solid var(--ghl-text-muted);
  opacity: 0.4;
  transition: opacity 0.15s;
}
.ghl-resize-handle:hover::after {
  opacity: 0.8;
}
`;

if (!css.includes('.ghl-resize-handle')) {
  css += '\n' + asanaCheckboxCss;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('1. content.css updated with Asana checkbox and resize handle styles.');

// ============================================================
// 2. Update content.js
// ============================================================
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let js = fs.readFileSync(jsPath, 'utf8');

// A. Plain text paste event on editor inside buildPanel / wirePanel
const oldFocusLine = '    editor.addEventListener("focus", () => { if (undoStack.length === 0) pushUndo(); });';
const oldFocusLineCRLF = '    editor.addEventListener("focus", () => { if (undoStack.length === 0) pushUndo(); });\r\n';

const newFocusLine = '    editor.addEventListener("focus", () => { if (undoStack.length === 0) pushUndo(); });\n    // Force plain text paste only\n    editor.addEventListener("paste", (e) => {\n      e.preventDefault();\n      const text = (e.originalEvent || e).clipboardData.getData("text/plain");\n      document.execCommand("insertText", false, text);\n    });';

if (js.includes(oldFocusLineCRLF)) {
  js = js.replace(oldFocusLineCRLF, newFocusLine + '\n');
} else if (js.includes(oldFocusLine)) {
  js = js.replace(oldFocusLine, newFocusLine);
}

// B. Append custom resize handle to panel and add drag listeners inside buildPanel()
const oldAppendFooter = '    panel.appendChild(footer);\n\n    // insert into wrapper after chip';
const oldAppendFooterCRLF = '    panel.appendChild(footer);\r\n\r\n    // insert into wrapper after chip';

const newAppendFooter = `    panel.appendChild(footer);

    // Custom JS Resize Handle
    const resizeHandle = el("div", "ghl-resize-handle");
    panel.appendChild(resizeHandle);
    
    let isResizing = false;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;
    let resizeStartX = 0;
    let resizeStartY = 0;
    
    resizeHandle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
      resizeStartWidth = panel.offsetWidth;
      resizeStartHeight = panel.offsetHeight;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeHandle.setPointerCapture(e.pointerId);
    });
    
    resizeHandle.addEventListener("pointermove", (e) => {
      if (!isResizing) return;
      e.stopPropagation();
      const dw = e.clientX - resizeStartX;
      const dh = e.clientY - resizeStartY;
      const newWidth = Math.max(260, Math.min(600, resizeStartWidth + dw));
      const newHeight = Math.max(200, Math.min(700, resizeStartHeight + dh));
      
      panel.style.width = newWidth + "px";
      
      const editorEl = panel.querySelector(".ghl-editor");
      if (editorEl) {
        editorEl.style.maxHeight = (newHeight - 165) + "px";
      }
      
      const asanaEl = panel.querySelector(".ghl-asana-view");
      if (asanaEl) {
        asanaEl.style.height = (newHeight - 110) + "px";
      }
    });
    
    resizeHandle.addEventListener("pointerup", (e) => {
      if (!isResizing) return;
      isResizing = false;
      try { resizeHandle.releasePointerCapture(e.pointerId); } catch(err) {}
    });

    // insert into wrapper after chip`;

if (js.includes(oldAppendFooterCRLF)) {
  js = js.replace(oldAppendFooterCRLF, newAppendFooter);
} else if (js.includes(oldAppendFooter)) {
  js = js.replace(oldAppendFooter, newAppendFooter);
}

// C. Update loadAsanaTasks() subtask loop to render ALL subtasks and always render parent task
const oldAsanaLoop = `          myTasks.forEach((t) => {
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
          });`;

const newAsanaLoop = `          myTasks.forEach((t) => {
            // Render Parent Task (Always render as header to group subtasks properly!)
            const row = document.createElement("div");
            row.className = "ghl-asana-task-item";
            row.innerHTML = \`
              <input type="checkbox" \${t.completed ? "checked" : ""} disabled style="pointer-events:none">
              <span class="ghl-asana-task-text \s\${t.completed ? "completed" : ""}"><b>\${t.name}</b></span>
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

// Clean up backslashes for node template string write
const cleanNewAsanaLoop = newAsanaLoop.replace(/\\s/g, '');

if (js.includes(oldAsanaLoop)) {
  js = js.replace(oldAsanaLoop, cleanNewAsanaLoop);
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('2. content.js updated successfully with plain text paste, drag resize, and complete subtask list rendering.');
