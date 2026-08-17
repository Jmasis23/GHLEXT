/* GHL Tab Renamer — options.js */
let S = {}; // current settings

document.addEventListener("DOMContentLoaded", () => {
  // nav
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((c) => c.classList.remove("active"));
      item.classList.add("active");
      document.getElementById(item.dataset.tab + "-tab").classList.add("active");
      if (item.dataset.tab === "activity") renderActivity();
      if (item.dataset.tab === "clients") renderClients();
      if (item.dataset.tab === "memory") renderMemoryBank();
    });
  });

  init();
});

function init() {
  getSettings((s) => {
    S = s;
    // general
    set("enabled-toggle", s.enabled, "enabled");
    set("autogroup-toggle", s.autoGroup, "autoGroup");
    set("short-title-toggle", s.shortTitleWhenGrouped, "shortTitleWhenGrouped");
    document.getElementById("short-title-row").style.display = s.autoGroup ? "flex" : "none";
    set("auto-collapse-toggle", s.autoCollapseGroups, "autoCollapseGroups");
    val("collapse-delay-select", s.autoCollapseDelay, "autoCollapseDelay");
    document.getElementById("collapse-delay-row").style.display = s.autoCollapseGroups ? "flex" : "none";
    set("ram-saver-toggle", s.enableRamSaver, "enableRamSaver");
    val("ram-saver-minutes", s.ramSaverIdleMinutes, "ramSaverIdleMinutes", "number");
    document.getElementById("ram-duration-row").style.display = s.enableRamSaver ? "flex" : "none";
    set("smart-suggestions-toggle", s.smartGroupingSuggestions, "smartGroupingSuggestions");
    set("sort-alpha-toggle", s.sortGroupsAlpha, "sortGroupsAlpha");
    val("title-template", s.titleTemplate, "titleTemplate", "text");
    updateTitlePreview();

    // appearance
    val("theme-select", s.theme, "theme");
    val("position-select", s.badgePosition, "badgePosition");
    val("size-select", s.badgeSize, "badgeSize");
    document.getElementById("opacity-slider").value = s.badgeOpacity;
    document.getElementById("opacity-val").textContent = Math.round(s.badgeOpacity * 100) + "%";
    set("autohide-toggle", s.badgeAutoHide, "badgeAutoHide");
    set("only-leadjuice-toggle", s.onlyLeadjuice, "onlyLeadjuice");
    set("reminders-toggle", s.enableNoteReminders, "enableNoteReminders");
    set("undo-toggle", s.enableUndo, "enableUndo");
    set("tplvars-toggle", s.templateVariables, "templateVariables");
    set("sync-toggle", s.syncNotes, "syncNotes");

    // groupers
    set("groupers-toggle", s.enableCustomGroupers, "enableCustomGroupers");

    renderDomains();
    renderClients();
    renderTemplates();
    renderGroupers();
    
    // Bind Asana fields
    const tokInp = document.getElementById("asana-token-input");
    const connBtn = document.getElementById("asana-connect-btn");
    
    tokInp.value = s.asanaToken || "";
    
    connBtn.addEventListener("click", () => {
      const token = tokInp.value.trim();
      updateSetting("asanaToken", token);
      testAsanaConnection(token);
    });
    
    if (s.asanaToken) {
      testAsanaConnection(s.asanaToken);
    }
  });
}

function set(id, value, key) {
  const el = document.getElementById(id);
  el.checked = value;
  el.addEventListener("change", (e) => updateSetting(key, e.target.checked));
}
function val(id, value, key, type) {
  const el = document.getElementById(id);
  el.value = value;
  if (type === "number") {
    el.addEventListener("change", (e) => {
      let v = parseInt(e.target.value); if (isNaN(v) || v < 1) v = 1; if (v > 1440) v = 1440;
      e.target.value = v; updateSetting(key, v);
    });
  } else {
    el.addEventListener("change", (e) => updateSetting(key, e.target.value));
  }
}

function updateSetting(key, value) {
  S[key] = value;
  saveSettings(S, () => {
    showToast();
    broadcast();
    if (key === "customDomains") chrome.runtime.sendMessage({ action: "reloadSettings" });
    if (key === "autoGroup") document.getElementById("short-title-row").style.display = value ? "flex" : "none";
    if (key === "autoCollapseGroups") document.getElementById("collapse-delay-row").style.display = value ? "flex" : "none";
    if (key === "enableRamSaver") document.getElementById("ram-duration-row").style.display = value ? "flex" : "none";
  });
}
function broadcast() {
  chrome.tabs.query({}, (tabs) => tabs.forEach((t) => chrome.tabs.sendMessage(t.id, { action: "settingsUpdated", settings: S }, () => { if (chrome.runtime.lastError) {} })));
}
function showToast() {
  const t = document.getElementById("toast");
  t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Title template ---------- */
function updateTitlePreview() {
  const tpl = document.getElementById("title-template").value;
  const p = tpl.replace("{client}", "Acme Corp").replace("{section}", "Contacts").replace("{unread}", "(3)");
  document.getElementById("title-preview").textContent = p || "—";
}
document.getElementById("title-template").addEventListener("input", (e) => { updateSetting("titleTemplate", e.target.value); updateTitlePreview(); });
document.querySelectorAll(".token").forEach((b) => b.addEventListener("click", () => {
  const inp = document.getElementById("title-template");
  const s = inp.selectionStart, en = inp.selectionEnd;
  inp.value = inp.value.slice(0, s) + b.dataset.token + inp.value.slice(en);
  inp.focus(); inp.selectionStart = inp.selectionEnd = s + b.dataset.token.length;
  updateSetting("titleTemplate", inp.value); updateTitlePreview();
}));
document.getElementById("ram-saver-toggle").addEventListener("change", (e) => updateSetting("enableRamSaver", e.target.checked));
document.getElementById("sort-alpha-toggle").addEventListener("change", (e) => updateSetting("sortGroupsAlpha", e.target.checked));
document.getElementById("opacity-slider").addEventListener("input", (e) => {
  const v = parseFloat(e.target.value);
  document.getElementById("opacity-val").textContent = Math.round(v * 100) + "%";
  updateSetting("badgeOpacity", v);
});

/* ---------- Domains ---------- */
function renderDomains() {
  const list = document.getElementById("domains-list");
  list.innerHTML = "";
  S.customDomains.forEach((d, idx) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `<code>${d}</code>`;
    const btn = document.createElement("button");
    btn.className = "btn-sm danger"; btn.textContent = "Remove";
    btn.addEventListener("click", () => { S.customDomains.splice(idx, 1); updateSetting("customDomains", S.customDomains); renderDomains(); });
    li.appendChild(btn);
    list.appendChild(li);
  });
}
document.getElementById("add-domain").addEventListener("click", () => {
  const inp = document.getElementById("new-domain"); const err = document.getElementById("domain-err"); err.textContent = "";
  let v = inp.value.trim().toLowerCase(); if (!v) return;
  v = v.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  if (S.customDomains.includes(v)) { err.textContent = "Domain already exists."; return; }
  S.customDomains.push(v); updateSetting("customDomains", S.customDomains); renderDomains(); inp.value = "";
});

/* ---------- Clients ---------- */
function renderClients() {
  const tbody = document.getElementById("clients-tbody");
  tbody.innerHTML = "";
  chrome.storage.local.get("client_names", (res) => {
    const map = res.client_names || {};
    const keys = Object.keys(map);
    document.getElementById("client-count").textContent = keys.length;
    document.getElementById("no-clients").style.display = keys.length ? "none" : "block";
    keys.forEach((locId) => {
      const name = map[locId];
      const color = (S.clientColors && S.clientColors[locId]) || "#8b5cf6";
      const nick = (S.clientNicknames && S.clientNicknames[locId]) || "";
      const tr = document.createElement("tr");
      const icon = (S.clientGroupIcons && S.clientGroupIcons[locId]) || "";
      const groupColor = (S.clientGroupColors && S.clientGroupColors[locId]) || "blue";
      const chromeColors = ["grey","blue","red","yellow","green","pink","purple","cyan","orange"];
      const colorOptions = chromeColors.map(c => `<option value="${c}" ${c === groupColor ? "selected" : ""}>${c}</option>`).join("");
      
      tr.innerHTML =
        `<td><input type="checkbox" class="client-check" data-loc="${locId}"></td>` +
        `<td><b>${name}</b></td>` +
        `<td><code>${locId.slice(0, 12)}…</code></td>` +
        `<td><input type="text" class="text-input nick-input" value="${nick}" data-loc="${locId}" placeholder="—" style="padding:5px 9px;font-size:12px"></td>` +
        `<td><input type="text" class="text-input icon-input" value="${icon}" data-loc="${locId}" placeholder="🏥" style="padding:5px 6px;font-size:14px;width:36px;text-align:center" maxlength="4"></td>` +
        `<td><div class="color-cell"><input type="color" class="color-pick" value="${color}" data-loc="${locId}"><span class="color-hex">${color.toUpperCase()}</span></div></td>` +
        `<td><select class="select group-color-select" data-loc="${locId}" style="padding:4px 6px;font-size:11px;width:80px">${colorOptions}</select></td>` +
        `<td><button class="btn-sm danger reset-color" data-loc="${locId}">Reset</button></td>`;
      tbody.appendChild(tr);
    });
    // wire
    tbody.querySelectorAll(".color-pick").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const loc = e.target.dataset.loc;
        S.clientColors = S.clientColors || {};
        S.clientColors[loc] = e.target.value;
        e.target.parentElement.querySelector(".color-hex").textContent = e.target.value.toUpperCase();
        updateSetting("clientColors", S.clientColors);
      });
    });
    tbody.querySelectorAll(".nick-input").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const loc = e.target.dataset.loc;
        S.clientNicknames = S.clientNicknames || {};
        S.clientNicknames[loc] = e.target.value;
        updateSetting("clientNicknames", S.clientNicknames);
      });
    });
    tbody.querySelectorAll(".icon-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const loc = e.target.dataset.loc;
        S.clientGroupIcons = S.clientGroupIcons || {};
        S.clientGroupIcons[loc] = e.target.value.trim();
        updateSetting("clientGroupIcons", S.clientGroupIcons);
      });
    });
    tbody.querySelectorAll(".group-color-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const loc = e.target.dataset.loc;
        S.clientGroupColors = S.clientGroupColors || {};
        S.clientGroupColors[loc] = e.target.value;
        updateSetting("clientGroupColors", S.clientGroupColors);
      });
    });
    tbody.querySelectorAll(".reset-color").forEach((b) => {
      b.addEventListener("click", () => {
        const loc = b.dataset.loc;
        delete S.clientColors[loc];
        updateSetting("clientColors", S.clientColors);
        renderClients();
      });
    });

    // select all
    document.getElementById("select-all").onchange = (e) => {
      tbody.querySelectorAll(".client-check").forEach((c) => c.checked = e.target.checked);
    };
  });
}

document.getElementById("bulk-clear").addEventListener("click", () => {
  const sel = document.querySelectorAll(".client-check:checked");
  if (!sel.length) { alert("Select clients first."); return; }
  sel.forEach((c) => delete S.clientColors[c.dataset.loc]);
  updateSetting("clientColors", S.clientColors);
  renderClients();
});
document.getElementById("bulk-export").addEventListener("click", () => {
  const sel = document.querySelectorAll(".client-check:checked");
  if (!sel.length) { alert("Select clients first."); return; }
  chrome.storage.local.get(null, (all) => {
    const notes = {};
    sel.forEach((c) => {
      const loc = c.dataset.loc;
      Object.keys(all).forEach((k) => { if (k.endsWith(loc)) notes[k] = all[k]; });
    });
    const bundle = { type: "notes_backup", timestamp: Date.now(), notes, clientColors: S.clientColors, clientNicknames: S.clientNicknames, customTemplates: S.customTemplates };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ghl-clients-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });
});

/* ---------- Templates ---------- */
function renderTemplates() {
  const c = document.getElementById("tpl-list"); c.innerHTML = "";
  S.customTemplates.forEach((t, idx) => {
    const card = document.createElement("div"); card.className = "tpl-card";
    card.innerHTML = `<div><h4>${t.name}</h4><p>${t.text}</p></div>`;
    const del = document.createElement("button"); del.className = "btn-sm danger"; del.textContent = "Delete"; del.style.alignSelf = "flex-end";
    del.addEventListener("click", () => { S.customTemplates.splice(idx, 1); updateSetting("customTemplates", S.customTemplates); renderTemplates(); });
    card.appendChild(del); c.appendChild(card);
  });
}
document.getElementById("add-tpl").addEventListener("click", () => {
  const n = document.getElementById("tpl-name").value.trim();
  const t = document.getElementById("tpl-text").value.trim();
  if (!n || !t) return;
  S.customTemplates.push({ id: "tpl_" + Date.now(), name: n, text: t });
  updateSetting("customTemplates", S.customTemplates); renderTemplates();
  document.getElementById("tpl-name").value = ""; document.getElementById("tpl-text").value = "";
});

/* ---------- Groupers ---------- */
function renderGroupers() {
  const tb = document.getElementById("groupers-tbody"); const empty = document.getElementById("no-groupers");
  tb.innerHTML = "";
  if (!S.customGroupers || !S.customGroupers.length) { empty.style.display = "block"; return; }
  empty.style.display = "none";
  S.customGroupers.forEach((g, idx) => {
    const tr = document.createElement("tr");
    const hex = CHROME_COLOR_HEX[g.color] || "#5f6368";
    tr.innerHTML =
      `<td><b>${g.name}</b></td>` +
      `<td><code>${g.pattern}</code></td>` +
      `<td><span class="color-cell"><span style="width:10px;height:10px;border-radius:50%;background:${hex}"></span>${g.color}</span></td>` +
      `<td><label class="switch-mini"><input type="checkbox" ${g.enabled ? "checked" : ""}><span class="slider"></span></label></td>` +
      `<td><button class="btn-sm danger">Remove</button></td>`;
    tr.querySelector("input").addEventListener("change", (e) => { g.enabled = e.target.checked; updateSetting("customGroupers", S.customGroupers); });
    tr.querySelector("button").addEventListener("click", () => { S.customGroupers.splice(idx, 1); updateSetting("customGroupers", S.customGroupers); renderGroupers(); });
    tb.appendChild(tr);
  });
}
document.getElementById("add-grouper").addEventListener("click", () => {
  const n = document.getElementById("grouper-name").value.trim();
  const p = document.getElementById("grouper-pattern").value.trim().toLowerCase();
  const c = document.getElementById("grouper-color").value;
  const err = document.getElementById("grouper-err"); err.textContent = "";
  if (!n) { err.textContent = "Enter a group title."; return; }
  if (!p) { err.textContent = "Enter a URL pattern."; return; }
  if (S.customGroupers.some((g) => g.pattern === p)) { err.textContent = "A rule with this pattern already exists."; return; }
  S.customGroupers.push({ id: "grouper_" + Date.now(), name: n, pattern: p, color: c, enabled: true });
  updateSetting("customGroupers", S.customGroupers); renderGroupers();
  document.getElementById("grouper-name").value = ""; document.getElementById("grouper-pattern").value = ""; document.getElementById("grouper-color").value = "green";
});

/* ---------- Activity ---------- */
function renderActivity() {
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
      `<div class="summary-stat"><div class="lbl">This Week</div><div class="val mono">${formatDuration(weekSec)}</div><div class="sub">${(weekSec/3600).toFixed(1)}h total</div></div>` +
      `<div class="summary-stat"><div class="lbl">Today</div><div class="val mono">${formatDuration(todaySec)}</div><div class="sub">${new Date().toLocaleDateString([],{weekday:"long"})}</div></div>` +
      `<div class="summary-stat"><div class="lbl">Clients Tracked</div><div class="val">${allClients.size}</div><div class="sub">unique sub-accounts</div></div>`;

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
        row.innerHTML = `<div class="ca-avatar" style="background:${color}">${name.charAt(0)}</div><div class="ca-info"><div class="ca-name">${name}</div><div class="ca-bar"><div class="ca-bar-fill" style="width:${(sec/topMax)*100}%;background:${color}"></div></div></div><div class="ca-time mono">${formatDuration(sec).slice(3)}</div>`;
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
      dayCell.className = `mb-day-cell ${levelClass}`;
      
      const formatOption = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
      const formattedDateStr = cellDate.toLocaleDateString([], formatOption);
      dayCell.title = hoursLogged > 0 
        ? `${hoursLogged.toFixed(2)} hours logged on ${formattedDateStr}`
        : `No activity on ${formattedDateStr}`;
        
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
  
  totalDaysSpan.textContent = `${activeDaysCount} active days in the last year`;
}



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
    headers: { "Authorization": `Bearer ${token}` }
  })
  .then(r => {
    if (!r.ok) throw new Error("Auth failed");
    return r.json();
  })
  .then(res => {
    const user = res.data;
    badge.textContent = `Connected as ${user.name}`;
    badge.style.color = "var(--green)";
    S.asanaUserId = user.gid;
    saveSettings(S);
    
    // 2. Fetch workspaces
    return fetch("https://app.asana.com/api/1.1/workspaces", {
      headers: { "Authorization": `Bearer ${token}` }
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
        row.innerHTML = `
          <div class="mb-skill-header">
            <span class="mb-skill-name">${key}</span>
            <span class="mb-skill-badge ${skill.level.toLowerCase()}">${skill.level}</span>
          </div>
          <div class="mb-skill-progress-bg">
            <div class="mb-skill-progress-bar" style="width: ${Math.max(8, pct)}%"></div>
          </div>
          <div class="mb-skill-footer">
            <span>${skill.minutes} minutes logged</span>
            <span>${pct}% weight</span>
          </div>
        `;
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
        row.innerHTML = `
          <div class="mb-ch-left">
            <span class="mb-ch-avatar" style="background: var(--accent, #8b5cf6)">${c.name.charAt(0)}</span>
            <div class="mb-ch-info">
              <span class="mb-ch-name">${c.name}</span>
              <span class="mb-ch-activity">${c.top_activity}</span>
            </div>
          </div>
          <span class="mb-ch-time">${c.total_time_spent} spent</span>
        `;
        clientList.appendChild(row);
      });
    }

    // 5. JSON Live Preview
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
