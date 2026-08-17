const fs = require('fs');
const filePath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\content.css';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace(/--ghl-surface:\s*rgba\(17,\s*20,\s*29,\s*0\.9\);/g, '--ghl-surface: rgba(0, 0, 0, 0.95);');
c = c.replace(/--ghl-surface-solid:\s*#11141d;/g, '--ghl-surface-solid: #000000;');
c = c.replace(/--ghl-chip-bg:\s*rgba\(15,\s*17,\s*26,\s*0\.82\);/g, '--ghl-chip-bg: #000000;');
c = c.replace(/--ghl-border:\s*rgba\(255,\s*255,\s*255,\s*0\.1\);/g, '--ghl-border: rgba(255, 255, 255, 0.18);');
c = c.replace(/--ghl-border-soft:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, '--ghl-border-soft: rgba(255, 255, 255, 0.1);');
c = c.replace(/--ghl-text:\s*#e2e8f0;/g, '--ghl-text: #ffffff;');
c = c.replace(/--ghl-text-muted:\s*#64748b;/g, '--ghl-text-muted: #cbd5e1;');
c = c.replace(/--ghl-text-faint:\s*#475569;/g, '--ghl-text-faint: #64748b;');
c = c.replace(/--ghl-input-bg:\s*rgba\(15,\s*17,\s*23,\s*0\.9\);/g, '--ghl-input-bg: #0d0d0d;');
c = c.replace(/--ghl-hover:\s*rgba\(255,\s*255,\s*255,\s*0\.07\);/g, '--ghl-hover: rgba(255, 255, 255, 0.12);');
c = c.replace(/--ghl-shadow:\s*0\s*16px\s*44px\s*rgba\(0,\s*0,\s*0,\s*0\.5\);/g, '--ghl-shadow: 0 16px 44px rgba(0, 0, 0, 0.6);');
c = c.replace(/--ghl-shadow-chip:\s*0\s*8px\s*28px\s*rgba\(0,\s*0,\s*0,\s*0\.4\);/g, '--ghl-shadow-chip: 0 8px 28px rgba(0, 0, 0, 0.5);');

fs.writeFileSync(filePath, c, 'utf8');
console.log('Successfully updated content.css with pure black theme variables.');
