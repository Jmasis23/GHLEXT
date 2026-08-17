const fs = require('fs');

// ============================================================
// 1. Update options.html to swap old 7-day chart with the Contribution Heatmap
// ============================================================
const htmlPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const oldChartBlock = `<div class="activity-chart-wrap">
            <div class="sub-title">Last 7 Days</div>
            <div class="activity-chart" id="activity-7day"></div>
          </div>`;

const oldChartBlockCRLF = `<div class="activity-chart-wrap">\r\n            <div class="sub-title">Last 7 Days</div>\r\n            <div class="activity-chart" id="activity-7day"></div>\r\n          </div>`;

const newHeatmapBlock = `<div class="activity-contrib-wrap">
            <div class="row" style="margin-bottom:14px">
              <div class="row-info">
                <div class="sub-title" style="margin-bottom:0">Productivity Heatmap</div>
              </div>
              <!-- Filters -->
              <div style="display:flex;gap:10px;align-items:center">
                <select id="contrib-client-filter" class="select" style="padding:4px 8px;font-size:11px;min-width:140px;cursor:pointer;margin-top:0"></select>
                <select id="contrib-hour-filter" class="select" style="padding:4px 8px;font-size:11px;cursor:pointer;margin-top:0">
                  <option value="0">All Active Days</option>
                  <option value="0.5">Min 30 mins</option>
                  <option value="1">Min 1.0 hour</option>
                  <option value="2">Min 2.0 hours</option>
                </select>
              </div>
            </div>
            
            <div class="contrib-heatmap-card" style="background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:16px 20px;display:flex;flex-direction:column;gap:4px;">
              <div class="contrib-months-header" id="contrib-months-header" style="display:flex;padding-left:35px;font-size:10px;color:#8b949e;justify-content:space-between;max-width:720px;font-family:var(--mono);"></div>
              <div style="display:flex;gap:8px">
                <div class="contrib-days-labels" style="display:flex;flex-direction:column;justify-content:space-around;font-size:10px;color:#8b949e;padding:4px 0;height:84px;font-family:var(--mono);">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>
                <div class="contrib-grid-wrapper" id="contrib-grid-wrapper" style="display:flex;gap:3px;overflow-x:auto;padding-bottom:5px"></div>
              </div>
              <div class="contrib-footer" style="display:flex;justify-content:space-between;font-size:11px;color:#8b949e;margin-top:6px;align-items:center">
                <span id="contrib-total-days">0 active days in the last year</span>
                <div style="display:flex;align-items:center;gap:4px">
                  <span>Less</span>
                  <span class="contrib-legend-cell level-0"></span>
                  <span class="contrib-legend-cell level-1"></span>
                  <span class="contrib-legend-cell level-2"></span>
                  <span class="contrib-legend-cell level-3"></span>
                  <span class="contrib-legend-cell level-4"></span>
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>`;

if (html.includes(oldChartBlock)) {
  html = html.replace(oldChartBlock, newHeatmapBlock);
} else if (html.includes(oldChartBlockCRLF)) {
  html = html.replace(oldChartBlockCRLF, newHeatmapBlock);
} else {
  // Regex fallback
  html = html.replace(/<div class="activity-chart-wrap">[\s\S]*?<\/div>\s*<\/div>/, newHeatmapBlock + '\n</div>');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('1. options.html patched successfully.');

// ============================================================
// 2. Update options.css to add heatmap specific styles
// ============================================================
const cssPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.css';
let css = fs.readFileSync(cssPath, 'utf8');

const heatmapStyles = `
/* ---------- GitHub Contribution Heatmap Styles ---------- */
.contrib-legend-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.contrib-legend-cell.level-0, .mb-day-cell.level-0 { background: #161b22; }
.contrib-legend-cell.level-1, .mb-day-cell.level-1 { background: #0e4429; }
.contrib-legend-cell.level-2, .mb-day-cell.level-2 { background: #006d32; }
.contrib-legend-cell.level-3, .mb-day-cell.level-3 { background: #26a641; }
.contrib-legend-cell.level-4, .mb-day-cell.level-4 { background: #39d353; }

.mb-contrib-column {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mb-day-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  transition: transform 0.1s, outline 0.1s;
}
.mb-day-cell:hover {
  transform: scale(1.18);
  outline: 1.5px solid rgba(255, 255, 255, 0.5);
  z-index: 5;
}
`;

if (!css.includes('.contrib-legend-cell')) {
  css += '\n' + heatmapStyles;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('2. options.css patched successfully.');

// ============================================================
// 3. Update options.js to render 365-day Heatmap with filtering
// ============================================================
const jsPath = 'C:\\LJ EXT 2\\ghl-tab-renamer-v2\\options.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Replace old renderActivity function definition
const oldRenderActivityStart = 'function renderActivity() {';
const oldRenderActivityBlock = `function renderActivity() {
  chrome.runtime.sendMessage({ action: "getActivityData" }, (activity) => {
    activity = activity || {};
    const today = new Date().toISOString().split("T")[0];
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split("T")[0]); }
    // summary
    const weekSec = days.reduce((sum, dk) => {
      const dayAct = activity[dk] || {};
      return sum + Object.values(dayAct).reduce((a, b) => a + b, 0);
    }, 0);
    const todaySec = Object.values(activity[today] || {}).reduce((a, b) => a + b, 0);
    const allClients = new Set();
    Object.values(activity).forEach((day) => Object.keys(day).forEach((k) => allClients.add(k)));
    document.getElementById("activity-summary").innerHTML =
      \`<div class="summary-stat"><div class="lbl">This Week</div><div class="val mono">\${formatDuration(weekSec)}</div><div class="sub">\${(weekSec/3600).toFixed(1)}h total</div></div>\` +
      \`<div class="summary-stat"><div class="lbl">Today</div><div class="val mono">\${formatDuration(todaySec)}</div><div class="sub">\${new Date().toLocaleDateString([],{weekday:"long"})}</div></div>\` +
      \`<div class="summary-stat"><div class="lbl">Clients Tracked</div><div class="val">\${allClients.size}</div><div class="sub">unique sub-accounts</div></div>\`;

    // 7-day chart
    const max = Math.max(...days.map((dk) => Object.values(activity[dk] || {}).reduce((a,b)=>a+b,0)), 1);
    const chart = document.getElementById("activity-7day"); chart.innerHTML = "";
    days.forEach((dk) => {
      const sec = Object.values(activity[dk] || {}).reduce((a,b)=>a+b,0);
      const d = new Date(dk);
      const col = document.createElement("div"); col.className = "act-col";
      col.innerHTML = \`<div class="act-bar \${dk===today?"today":""}" style="height:\${(sec/max)*80+4}px" title="\${formatDuration(sec)}"></div><div class="act-val">\${sec>0?formatDuration(sec).slice(3):""}</div><div class="act-dow">\${d.toLocaleDateString([],{weekday:"narrow"})}</div>\`;
      chart.appendChild(col);
    });

    // top clients this week
    const clientTotals = {};
    days.forEach((dk) => { const dayAct = activity[dk] || {}; for (const [loc, sec] of Object.entries(dayAct)) clientTotals[loc] = (clientTotals[loc]||0)+sec; });
    const sorted = Object.entries(clientTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const list = document.getElementById("activity-clients"); list.innerHTML = "";
    document.getElementById("no-activity").style.display = sorted.length ? "none" : "block";
    const topMax = sorted.length ? sorted[0][1] : 1;
    chrome.storage.local.get(["client_names"], (res) => {
      const names = res.client_names || {};
      sorted.forEach(([loc, sec]) => {
        const name = names[loc] || "GHL Client";
        const color = (S.clientColors && S.clientColors[loc]) || "#8b5cf6";
        const row = document.createElement("div"); row.className = "ca-row";
        row.innerHTML = \`<div class="ca-avatar" style="background:\${color}">\${name.charAt(0)}</div><div class="ca-info"><div class="ca-name">\s\${name}</div><div class="ca-bar"><div class="ca-bar-fill" style="width:\${(sec/topMax)*100}%;background:\${color}"></div></div></div><div class="ca-time mono">\${formatDuration(sec).slice(3)}</div>\`;
        list.appendChild(row);
      });
    });
  });
}`;

// Helper to slice old renderActivity dynamically using braces matching
function getOldActivityBlock() {
  const startIdx = js.indexOf(oldRenderActivityStart);
  if (startIdx === -1) return '';
  let braces = 0;
  for (let i = startIdx; i < js.length; i++) {
    if (js[i] === '{') braces++;
    if (js[i] === '}') {
      braces--;
      if (braces === 0) {
        return js.slice(startIdx, i + 1);
      }
    }
  }
  return '';
}

const matchActivityBlock = getOldActivityBlock();

const newRenderActivityBlock = `function renderActivity() {
  chrome.runtime.sendMessage({ action: "getActivityData" }, (activity) => {
    activity = activity || {};
    const today = new Date().toISOString().split("T")[0];
    
    // 1. Calculate Summary Card Stats (Today & This Week)
    const weekDays = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); weekDays.push(d.toISOString().split("T")[0]); }
    const weekSec = weekDays.reduce((sum, dk) => {
      const dayAct = activity[dk] || {};
      return sum + Object.values(dayAct).reduce((a, b) => a + b, 0);
    }, 0);
    const todaySec = Object.values(activity[today] || {}).reduce((a, b) => a + b, 0);
    const allClients = new Set();
    Object.values(activity).forEach((day) => Object.keys(day).forEach((k) => allClients.add(k)));
    
    document.getElementById("activity-summary").innerHTML =
      \`<div class="summary-stat"><div class="lbl">This Week</div><div class="val mono">\${formatDuration(weekSec)}</div><div class="sub">\${(weekSec/3600).toFixed(1)}h total</div></div>\` +
      \`<div class="summary-stat"><div class="lbl">Today</div><div class="val mono">\${formatDuration(todaySec)}</div><div class="sub">\${new Date().toLocaleDateString([],{weekday:"long"})}</div></div>\` +
      \`<div class="summary-stat"><div class="lbl">Clients Tracked</div><div class="val">\${allClients.size}</div><div class="sub">unique sub-accounts</div></div>\`;

    // 2. Fetch Client Names to populate Client Filter & top clients list
    chrome.storage.local.get(["client_names"], (namesRes) => {
      const clientNames = namesRes.client_names || {};
      
      // Populate Client Filter Dropdown once
      const clientFilter = document.getElementById("contrib-client-filter");
      if (clientFilter && clientFilter.innerHTML === "") {
        clientFilter.innerHTML = '<option value="all">All Clients</option>';
        Object.keys(clientNames).forEach((locId) => {
          const opt = document.createElement("option");
          opt.value = locId;
          opt.textContent = clientNames[locId];
          clientFilter.appendChild(opt);
        });
        
        // Re-render Heatmap on filter changes
        clientFilter.onchange = () => buildContributionHeatmap(activity, clientNames);
        document.getElementById("contrib-hour-filter").onchange = () => buildContributionHeatmap(activity, clientNames);
      }
      
      // Render heat contribution grid
      buildContributionHeatmap(activity, clientNames);
      
      // 3. Render Top Clients list below the heatmap
      const clientTotals = {};
      weekDays.forEach((dk) => { 
        const dayAct = activity[dk] || {}; 
        for (const [loc, sec] of Object.entries(dayAct)) {
          clientTotals[loc] = (clientTotals[loc] || 0) + sec; 
        }
      });
      const sorted = Object.entries(clientTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const list = document.getElementById("activity-clients"); 
      list.innerHTML = "";
      document.getElementById("no-activity").style.display = sorted.length ? "none" : "block";
      const topMax = sorted.length ? sorted[0][1] : 1;
      
      sorted.forEach(([loc, sec]) => {
        const name = clientNames[loc] || "GHL Client";
        const color = (S.clientColors && S.clientColors[loc]) || "#8b5cf6";
        const row = document.createElement("div"); 
        row.className = "ca-row";
        row.innerHTML = \`<div class="ca-avatar" style="background:\${color}">\${name.charAt(0)}</div><div class="ca-info"><div class="ca-name">\${name}</div><div class="ca-bar"><div class="ca-bar-fill" style="width:\${(sec/topMax)*100}%;background:\${color}"></div></div></div><div class="ca-time mono">\${formatDuration(sec).slice(3)}</div>\`;
        list.appendChild(row);
      });
    });
  });
}

/* -------------------- GitHub-Style Heatmap Builder -------------------- */
function buildContributionHeatmap(activity, clientNames) {
  const gridWrapper = document.getElementById("contrib-grid-wrapper");
  const monthsHeader = document.getElementById("contrib-months-header");
  const totalDaysSpan = document.getElementById("contrib-total-days");
  
  const clientFilterVal = document.getElementById("contrib-client-filter").value;
  const hourThreshold = parseFloat(document.getElementById("contrib-hour-filter").value);
  
  gridWrapper.innerHTML = "";
  monthsHeader.innerHTML = "";
  
  // Calculate date range for the past 371 days (53 weeks) starting on Sunday to Monday
  const today = new Date();
  const daysOffset = (today.getDay() === 0 ? 6 : today.getDay() - 1); // Get days since Monday
  const startDate = new Date();
  startDate.setDate(today.getDate() - (52 * 7) - daysOffset); // Go back 52 full weeks + align with Monday
  
  let activeDaysCount = 0;
  let currentMonthStr = "";
  const monthPositions = [];
  
  // Outer loop: 53 columns (weeks)
  for (let week = 0; week < 53; week++) {
    const weekCol = document.createElement("div");
    weekCol.className = "mb-contrib-column";
    
    // Inner loop: 7 days of the week (Mon to Sun)
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + (week * 7) + d);
      
      const dateKey = cellDate.toISOString().split("T")[0];
      const dayAct = activity[dateKey] || {};
      
      // Calculate hours logged matching filters
      let secondsLogged = 0;
      if (clientFilterVal === "all") {
        secondsLogged = Object.values(dayAct).reduce((a, b) => a + b, 0);
      } else {
        secondsLogged = dayAct[clientFilterVal] || 0;
      }
      
      const hoursLogged = parseFloat((secondsLogged / 3600).toFixed(2));
      const isDayActive = hoursLogged >= hourThreshold && hoursLogged > 0;
      if (isDayActive) activeDaysCount++;
      
      // Determine contribution levels
      let levelClass = "level-0";
      if (isDayActive) {
        if (hoursLogged <= 0.5) levelClass = "level-1";
        else if (hoursLogged <= 1.5) levelClass = "level-2";
        else if (hoursLogged <= 3.0) levelClass = "level-3";
        else levelClass = "level-4";
      }
      
      // Month Header Position Track
      if (d === 0 && week % 4 === 0) {
        const monthName = cellDate.toLocaleDateString([], { month: "short" });
        monthPositions.push(monthName);
      }
      
      // Create Day Cell
      const dayCell = document.createElement("div");
      dayCell.className = \`mb-day-cell \${levelClass}\`;
      
      const formatOption = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
      const formattedDateStr = cellDate.toLocaleDateString([], formatOption);
      dayCell.title = hoursLogged > 0 
        ? \`\${hoursLogged.toFixed(2)} hours logged on \${formattedDateStr}\`
        : \`No activity on \${formattedDateStr}\`;
        
      weekCol.appendChild(dayCell);
    }
    gridWrapper.appendChild(weekCol);
  }
  
  // Render months labels
  monthPositions.forEach(m => {
    const span = document.createElement("span");
    span.textContent = m;
    span.style.flex = "1";
    span.style.textAlign = "left";
    monthsHeader.appendChild(span);
  });
  
  totalDaysSpan.textContent = \`\${activeDaysCount} active days in the last year\`;
}
`;

if (matchActivityBlock) {
  js = js.replace(matchActivityBlock, newRenderActivityBlock);
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('3. options.js patched successfully.');
