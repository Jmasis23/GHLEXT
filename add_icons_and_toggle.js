const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add sun and moon to ICON
const sparklesText = "sparkles: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z\"/></svg>',";
const sparklesTextWithIcons = sparklesText + "\n    sun: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/></svg>',\n    moon: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z\"/></svg>',";

if (content.includes(sparklesText)) {
  content = content.replace(sparklesText, sparklesTextWithIcons);
}

// 2. Add ghl-btn-theme in buildPanel()
const oldActionsHtml = '`<div class="ghl-panel-actions">` +\r\n        `<button class="ghl-icon-btn ghl-btn-reminder" title="Set reminder">${ICON.bell}</button>` +\r\n        `<button class="ghl-icon-btn ghl-btn-pin" title="Pin note">${ICON.pin}</button>` +\r\n        `<button class="ghl-icon-btn ghl-btn-history" title="History (Alt+Shift+H)">${ICON.history}</button>` +\r\n        `<button class="ghl-icon-btn ghl-btn-close" title="Close">${ICON.close}</button>` +\r\n      `</div>`';

const oldActionsHtmlLF = '`<div class="ghl-panel-actions">` +\n        `<button class="ghl-icon-btn ghl-btn-reminder" title="Set reminder">${ICON.bell}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-pin" title="Pin note">${ICON.pin}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-history" title="History (Alt+Shift+H)">${ICON.history}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-close" title="Close">${ICON.close}</button>` +\n      `</div>`';

const newActionsHtml = '`<div class="ghl-panel-actions">` +\n        `<button class="ghl-icon-btn ghl-btn-theme" title="Toggle theme">${settings.theme === "light" ? ICON.moon : ICON.sun}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-reminder" title="Set reminder">${ICON.bell}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-pin" title="Pin note">${ICON.pin}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-history" title="History (Alt+Shift+H)">${ICON.history}</button>` +\n        `<button class="ghl-icon-btn ghl-btn-close" title="Close">${ICON.close}</button>` +\n      `</div>`';

if (content.includes(oldActionsHtml)) {
  content = content.replace(oldActionsHtml, newActionsHtml);
} else if (content.includes(oldActionsHtmlLF)) {
  content = content.replace(oldActionsHtmlLF, newActionsHtml);
}

// 3. Add event listener in wirePanel()
const oldWireLine = '    panel.querySelector(".ghl-btn-close").addEventListener("click", () => togglePanel());';
const newWireLine = '    panel.querySelector(".ghl-btn-close").addEventListener("click", () => togglePanel());\n    panel.querySelector(".ghl-btn-theme").addEventListener("click", () => {\n      const nextTheme = settings.theme === "light" ? "dark" : "light";\n      settings.theme = nextTheme;\n      saveSettings(settings, () => {\n        applyTheme();\n        const btn = panel.querySelector(".ghl-btn-theme");\n        if (btn) btn.innerHTML = nextTheme === "light" ? ICON.moon : ICON.sun;\n      });\n    });';

if (content.includes(oldWireLine)) {
  content = content.replace(oldWireLine, newWireLine);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added theme toggle button and icons to content.js');
