const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.css';
let content = fs.readFileSync(filePath, 'utf8');

// Replace overflow: hidden; with overflow: visible; under .ghl-panel
const oldPanelText = '.ghl-panel {\r\n  width: 308px;\r\n  border-radius: var(--ghl-radius);\r\n  border: 1px solid var(--ghl-border);\r\n  background: var(--ghl-surface);\r\n  -webkit-backdrop-filter: blur(24px);\r\n  backdrop-filter: blur(24px);\r\n  box-shadow: var(--ghl-shadow);\r\n  overflow: hidden;\r\n  animation: ghl-pop 160ms ease-out;\r\n}';
const oldPanelTextLF = '.ghl-panel {\n  width: 308px;\n  border-radius: var(--ghl-radius);\n  border: 1px solid var(--ghl-border);\n  background: var(--ghl-surface);\n  -webkit-backdrop-filter: blur(24px);\n  backdrop-filter: blur(24px);\n  box-shadow: var(--ghl-shadow);\n  overflow: hidden;\n  animation: ghl-pop 160ms ease-out;\n}';

const newPanelText = '.ghl-panel {\n  width: 308px;\n  border-radius: var(--ghl-radius);\n  border: 1px solid var(--ghl-border);\n  background: var(--ghl-surface);\n  -webkit-backdrop-filter: blur(24px);\n  backdrop-filter: blur(24px);\n  box-shadow: var(--ghl-shadow);\n  overflow: visible;\n  animation: ghl-pop 160ms ease-out;\n}';

if (content.includes(oldPanelText)) {
  content = content.replace(oldPanelText, newPanelText);
} else if (content.includes(oldPanelTextLF)) {
  content = content.replace(oldPanelTextLF, newPanelText);
} else {
  // Regex fallback
  content = content.replace(/\.ghl-panel\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/g, (match) => {
    return match.replace('overflow: hidden;', 'overflow: visible;');
  });
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated .ghl-panel overflow to visible in content.css');
