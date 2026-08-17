const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove .ghl-section-jump from footer innerHTML
const oldFooterText = '    const footer = el("div", "ghl-panel-footer");\r\n    footer.innerHTML =\r\n      `<div class="ghl-section-jump">` +\r\n        `<button class="ghl-section-jump-btn"><span class="ghl-sj-label">${sectionName}</span>${ICON.chevron}</button>` +\r\n      `</div>` +\r\n      `<div class="ghl-footer-meta">` +\r\n        `<span class="ghl-char-count">0 ch</span><span>·</span>` +\r\n        `<span class="ghl-saved-dot"></span><span class="ghl-saved-text">Saved just now</span>` +\r\n      `</div>`;';

const oldFooterTextLF = '    const footer = el("div", "ghl-panel-footer");\n    footer.innerHTML =\n      `<div class="ghl-section-jump">` +\n        `<button class="ghl-section-jump-btn"><span class="ghl-sj-label">${sectionName}</span>${ICON.chevron}</button>` +\n      `</div>` +\n      `<div class="ghl-footer-meta">` +\n        `<span class="ghl-char-count">0 ch</span><span>·</span>` +\n        `<span class="ghl-saved-dot"></span><span class="ghl-saved-text">Saved just now</span>` +\n      `</div>`;';

const newFooterText = '    const footer = el("div", "ghl-panel-footer");\n    footer.style.justifyContent = "flex-end";\n    footer.innerHTML =\n      `<div class="ghl-footer-meta">` +\n        `<span class="ghl-char-count">0 ch</span><span>·</span>` +\n        `<span class="ghl-saved-dot"></span><span class="ghl-saved-text">Saved just now</span>` +\n      `</div>`;';

if (content.includes(oldFooterText)) {
  content = content.replace(oldFooterText, newFooterText);
} else if (content.includes(oldFooterTextLF)) {
  content = content.replace(oldFooterTextLF, newFooterText);
} else {
  // Regex fallback
  content = content.replace(/const footer = el\("div", "ghl-panel-footer"\);[\s\S]*?footer\.innerHTML[\s\S]*?`<div class="ghl-section-jump">`[\s\S]*?<\/div>`[\s\S]*?Saved just now<\/span>`\s*\+?\s*`<\/div>`;/g, 
    'const footer = el("div", "ghl-panel-footer");\n    footer.style.justifyContent = "flex-end";\n    footer.innerHTML =\n      `<div class="ghl-footer-meta">` +\n        `<span class="ghl-char-count">0 ch</span><span>·</span>` +\n        `<span class="ghl-saved-dot"></span><span class="ghl-saved-text">Saved just now</span>` +\n      `</div>`;');
}

// 2. Remove the event listener for .ghl-section-jump-btn
const oldListener = '    panel.querySelector(".ghl-section-jump-btn").addEventListener("click", (e) => { e.stopPropagation(); sectionMenuOpen = !sectionMenuOpen; renderPanelState(); });';
content = content.replace(oldListener, '');

// 3. Remove renderSectionMenu() call inside renderPanelState()
content = content.replace('    // section menu\r\n    renderSectionMenu();', '');
content = content.replace('    // section menu\n    renderSectionMenu();', '');

// 4. Remove the renderSectionMenu function entirely
const renderSectionMenuRegex = /function renderSectionMenu\(\) \{[\s\S]*?\n  \}/g;
content = content.replace(renderSectionMenuRegex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully removed section-jump navigation links from content.js');
