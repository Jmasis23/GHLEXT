const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add accumulatedSeconds definition under other state variables
const oldStates = '  let savedAgoTimer = null;';
const newStates = '  let savedAgoTimer = null;\n  let accumulatedSeconds = 0;';

if (content.includes(oldStates)) {
  content = content.replace(oldStates, newStates);
}

// 2. Modify startActivityTracker to batch-update the memory bank
const oldTracker = `  function startActivityTracker() {
    if (activityTimer) clearInterval(activityTimer);
    activityTimer = setInterval(async () => {
      if (!settings.enabled || !currentLocId) return;
      if (document.hidden) return;
      const activity = (await getLocal(activityKey())) || {};
      const today = new Date().toISOString().split("T")[0];
      if (!activity[today]) activity[today] = {};
      activity[today][currentLocId] = (activity[today][currentLocId] || 0) + 1;
      setLocal({ [activityKey()]: activity });
      refreshTimer();
    }, 1000);
  }`;

const oldTrackerLF = `  function startActivityTracker() {
    if (activityTimer) clearInterval(activityTimer);
    activityTimer = setInterval(async () => {
      if (!settings.enabled || !currentLocId) return;
      if (document.hidden) return;
      const activity = (await getLocal(activityKey())) || {};
      const today = new Date().toISOString().split("T")[0];
      if (!activity[today]) activity[today] = {};
      activity[today][currentLocId] = (activity[today][currentLocId] || 0) + 1;
      setLocal({ [activityKey()]: activity });
      refreshTimer();
    }, 1000);
  }`;

const newTracker = `  function startActivityTracker() {
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
  }`;

if (content.includes(oldTracker)) {
  content = content.replace(oldTracker, newTracker);
} else if (content.includes(oldTrackerLF)) {
  content = content.replace(oldTrackerLF, newTracker);
} else {
  // Regex fallback
  content = content.replace(/function startActivityTracker\(\) \{[\s\S]*?refreshTimer\(\);[\s\S]*?\}, 1000\);[\s\S]*?\}/, newTracker);
}

// 3. Update checkbox event listener to log to Portfolio Memory Bank
const oldCheckboxCode = `    editor.addEventListener("click", (e) => {
      if (e.target.matches('.ghl-todo input[type=checkbox]')) {
        const txt = e.target.parentElement.querySelector(".ghl-todo-text");
        if (e.target.checked) txt.classList.add("done"); else txt.classList.remove("done");
        pushUndo();
        onEditorInput();
      }
    });`;

const oldCheckboxCodeLF = `    editor.addEventListener("click", (e) => {
      if (e.target.matches('.ghl-todo input[type=checkbox]')) {
        const txt = e.target.parentElement.querySelector(".ghl-todo-text");
        if (e.target.checked) txt.classList.add("done"); else txt.classList.remove("done");
        pushUndo();
        onEditorInput();
      }
    });`;

const newCheckboxCode = `    editor.addEventListener("click", (e) => {
      if (e.target.matches('.ghl-todo input[type=checkbox]')) {
        const txt = e.target.parentElement.querySelector(".ghl-todo-text");
        if (e.target.checked) {
          txt.classList.add("done");
          const taskText = txt.textContent.trim();
          if (taskText && taskText !== "New item") {
            try {
              addMemoryBankAccomplishment(clientName, taskText);
            } catch (err) {}
          }
        } else {
          txt.classList.remove("done");
        }
        pushUndo();
        onEditorInput();
      }
    });`;

if (content.includes(oldCheckboxCode)) {
  content = content.replace(oldCheckboxCode, newCheckboxCode);
} else if (content.includes(oldCheckboxCodeLF)) {
  content = content.replace(oldCheckboxCodeLF, newCheckboxCode);
} else {
  // Regex fallback
  content = content.replace(/editor\.addEventListener\("click", \(e\) => \{\s*if \(e\.target\.matches\('\.ghl-todo input\[type=checkbox\]'\)\) \{[\s\S]*?onEditorInput\(\);\s*\}\s*\}\);/, newCheckboxCode);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully integrated memory bank background logging inside content.js!');
