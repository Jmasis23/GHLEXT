/* GHL Tab Renamer — popup.js */
let currentSettings = {};

document.addEventListener("DOMContentLoaded", () => {
  getSettings((settings) => {
    currentSettings = settings;
    const toggle = document.getElementById("enabled-toggle");
    toggle.checked = settings.enabled;
    updateStatus(settings.enabled);

    toggle.addEventListener("change", (e) => {
      settings.enabled = e.target.checked;
      currentSettings = settings;
      saveSettings(settings, () => {
        updateStatus(settings.enabled);
        broadcastSettings(settings);
      });
    });
  });

  document.getElementById("settings-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());

  loadActiveTab();
  loadRecents();
  loadActivity();
  loadSuggestions();
  setupBackup();
});

function updateStatus(enabled) {
  const t = document.getElementById("status-text");
  t.textContent = enabled ? "Active" : "Disabled";
  t.classList.toggle("off", !enabled);
}

function broadcastSettings(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: "settingsUpdated", settings }, () => {
        if (chrome.runtime.lastError) {}
      });
    });
  });
}

function fmtDur(sec) { return formatDuration(sec); }

function loadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    const url = tab.url || "";
    const title = tab.title || "";
    document.getElementById("client-title").textContent = title || "—";

    if (!isGhlUrl(url)) {
      document.getElementById("client-name").textContent = "Non-GHL Page";
      document.getElementById("client-name").classList.add("muted");
      document.getElementById("client-section").textContent = "—";
      return;
    }

    let locId = null, section = "Dashboard";
    try {
      const parts = new URL(url).pathname.split("/").filter(Boolean);
      const li = parts.indexOf("location");
      if (li !== -1 && parts[li + 1]) locId = parts[li + 1];
      if (li !== -1 && parts[li + 2]) section = parts[li + 2].charAt(0).toUpperCase() + parts[li + 2].slice(1);
    } catch (e) {}

    document.getElementById("client-section").textContent = section;

    const nameParts = title.split("|").map((s) => s.trim());
    const name = nameParts.length >= 2 ? nameParts[0] : locId ? "GHL Client" : "Reading…";
    document.getElementById("client-name").textContent = name;
    document.getElementById("client-name").classList.toggle("muted", name === "Reading…");

    // avatar color
    getSettings((s) => {
      const color = (s.clientColors && s.clientColors[locId]) || "#8b5cf6";
      const av = document.getElementById("client-avatar");
      av.style.background = color;
      av.textContent = (name && name !== "Reading…" && name !== "GHL Client") ? name.charAt(0) : "G";
    });

    // activity today
    if (locId) {
      const today = new Date().toISOString().split("T")[0];
      chrome.storage.local.get("activity_timer", (res) => {
        const sec = (res.activity_timer || {})[today]?.[locId] || 0;
        document.getElementById("time-today").textContent = fmtDur(sec);
      });
    }

    // unread + open tabs
    chrome.action.getBadgeText({}, (text) => {
      document.getElementById("total-unread").textContent = text || "0";
      const cu = document.getElementById("client-unread");
      const n = parseInt(text || "0");
      if (n > 0) { cu.style.display = ""; cu.textContent = n; } else cu.style.display = "none";
    });
    chrome.runtime.sendMessage({ action: "getGHLTabs" }, (res) => {
      document.getElementById("open-tabs").textContent = (res && res.tabs) ? res.tabs.length : 0;
    });
  });
}

function loadRecents() {
  chrome.storage.local.get(["recent_clients", "activity_timer"], (res) => {
    const recents = res.recent_clients || [];
    const list = document.getElementById("recents-list");
    if (!recents.length) { list.innerHTML = '<div class="empty">No recent clients yet.</div>'; return; }
    list.innerHTML = "";
    const today = new Date().toISOString().split("T")[0];
    recents.slice(0, 5).forEach((c) => {
      const a = document.createElement("a");
      a.className = "recent";
      getSettings((s) => {
        const color = (s.clientColors && s.clientColors[c.locationId]) || "#8b5cf6";
        const av = document.createElement("span");
        av.className = "recent-avatar"; av.style.background = color; av.textContent = c.clientName.charAt(0);
        a.appendChild(av);
      });
      const info = document.createElement("div"); info.className = "recent-info";
      const nm = document.createElement("div"); nm.className = "recent-name"; nm.textContent = c.clientName;
      const sc = document.createElement("div"); sc.className = "recent-sec"; sc.textContent = c.section;
      info.appendChild(nm); info.appendChild(sc);
      const sec = (res.activity_timer || {})[today]?.[c.locationId] || 0;
      const tm = document.createElement("span"); tm.className = "recent-time"; tm.textContent = sec > 0 ? fmtDur(sec).slice(3) : "";
      a.appendChild(info); a.appendChild(tm);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: "getGHLTabs" }, (r) => {
          if (r && r.tabs) {
            const m = r.tabs.find((t) => t.url.includes(`/location/${c.locationId}`));
            if (m) { chrome.runtime.sendMessage({ action: "activateTab", tabId: m.tabId }); window.close(); return; }
          }
          chrome.tabs.create({ url: c.url }); window.close();
        });
      });
      list.appendChild(a);
    });
  });
}

function loadActivity() {
  chrome.runtime.sendMessage({ action: "getActivityData" }, (activity) => {
    activity = activity || {};
    const chart = document.getElementById("activity-chart");
    chart.innerHTML = "";
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayActivity = activity[key] || {};
      const total = Object.values(dayActivity).reduce((a, b) => a + b, 0);
      days.push({ key, total, dow: d.toLocaleDateString([], { weekday: "narrow" }), isToday: i === 0 });
    }
    const max = Math.max(...days.map((d) => d.total), 1);
    days.forEach((d) => {
      const wrap = document.createElement("div"); wrap.className = "activity-bar-wrap";
      const bar = document.createElement("div");
      bar.className = "activity-bar" + (d.isToday ? " today" : "");
      bar.style.height = ((d.total / max) * 48 + 3) + "px";
      bar.title = fmtDur(d.total);
      const lbl = document.createElement("div"); lbl.className = "activity-label"; lbl.textContent = d.dow;
      wrap.appendChild(bar); wrap.appendChild(lbl);
      chart.appendChild(wrap);
    });
  });
}

function loadSuggestions() {
  if (!currentSettings.smartGroupingSuggestions) return;
  chrome.runtime.sendMessage({ action: "getSmartSuggestions" }, (list) => {
    list = list || [];
    if (!list.length) return;
    const sec = document.getElementById("suggestions-section");
    const ul = document.getElementById("suggestions-list");
    sec.style.display = "";
    ul.innerHTML = "";
    list.forEach((sug) => {
      const row = document.createElement("div"); row.className = "suggestion";
      const color = (currentSettings.clientColors && currentSettings.clientColors[sug.locationId]) || "#8b5cf6";
      row.innerHTML =
        `<span class="recent-avatar" style="background:${color}">${sug.clientName.charAt(0)}</span>` +
        `<div class="suggestion-info"><div class="suggestion-name">${sug.clientName}</div>` +
        `<div class="suggestion-msg">${sug.tabCount} tab${sug.tabCount > 1 ? "s" : ""} open · no color set</div></div>` +
        `<div class="suggestion-actions">` +
          `<button class="suggestion-btn primary" data-act="color">Color</button>` +
          `<button class="suggestion-btn ghost" data-act="dismiss">×</button>` +
        `</div>`;
      row.querySelector('[data-act="color"]').addEventListener("click", () => {
        // assign a random pleasant color and open options
        const palette = ["#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
        const c = palette[Math.floor(Math.random() * palette.length)];
        currentSettings.clientColors = currentSettings.clientColors || {};
        currentSettings.clientColors[sug.locationId] = c;
        saveSettings(currentSettings, () => {
          broadcastSettings(currentSettings);
          chrome.runtime.openOptionsPage();
        });
      });
      row.querySelector('[data-act="dismiss"]').addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "dismissSuggestion", locationId: sug.locationId }, () => loadSuggestions());
      });
      ul.appendChild(row);
    });
  });
}

function setupBackup() {
  document.getElementById("export-notes-btn").addEventListener("click", () => {
    chrome.storage.local.get(null, (all) => {
      const notes = {};
      Object.keys(all).forEach((k) => {
        if (k.startsWith("ghl_notes_") || k.startsWith("ghl_pin_") || k.startsWith("ghl_hist_") || k.startsWith("ghl_reminder_")) notes[k] = all[k];
      });
      getSettings((s) => {
        const bundle = { version: "2.0.0", timestamp: Date.now(), type: "notes_backup", notes, clientColors: s.clientColors, clientNicknames: s.clientNicknames, customTemplates: s.customTemplates };
        download(bundle, `ghl-notes-backup-${new Date().toISOString().split("T")[0]}.json`);
      });
    });
  });

  document.getElementById("import-notes-file").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    readJson(f, (bundle) => {
      if (bundle.type !== "notes_backup" || !bundle.notes) { alert("Invalid notes backup file!"); return; }
      chrome.storage.local.set(bundle.notes, () => {
        getSettings((s) => {
          if (bundle.clientColors) s.clientColors = { ...s.clientColors, ...bundle.clientColors };
          if (bundle.clientNicknames) s.clientNicknames = { ...s.clientNicknames, ...bundle.clientNicknames };
          if (bundle.customTemplates) s.customTemplates = bundle.customTemplates;
          saveSettings(s, () => { alert("Notes imported successfully!"); location.reload(); });
        });
      });
    });
  });

  document.getElementById("export-session-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "getGHLTabs" }, (res) => {
      if (!res || !res.tabs || !res.tabs.length) { alert("No active GHL tabs to save!"); return; }
      const session = { type: "session_backup", timestamp: Date.now(), tabs: res.tabs.map((t) => ({ url: t.url, clientName: t.clientName })) };
      download(session, `ghl-session-${new Date().toISOString().split("T")[0]}.json`);
    });
  });

  document.getElementById("import-session-file").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    readJson(f, (session) => {
      if (session.type !== "session_backup" || !session.tabs) { alert("Invalid session file!"); return; }
      session.tabs.forEach((t) => chrome.tabs.create({ url: t.url }));
      window.close();
    });
  });
}

/* helpers */
function download(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function readJson(file, cb) {
  const r = new FileReader();
  r.onload = (ev) => { try { cb(JSON.parse(ev.target.result)); } catch (err) { alert("Failed to parse JSON: " + err.message); } };
  r.readAsText(file);
}
