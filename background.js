/* ============================================================
 * GHL Tab Renamer — background.js (service worker)
 * Handles: tab client tracking, unread badge, dynamic content
 * script registration, tab grouping (auto + custom), group
 * collapse, RAM saver, activity aggregation, smart grouping
 * suggestions, note sync relay, and keyboard command routing.
 * ============================================================ */
importScripts("utils.js");

// In-memory trackers (service worker is ephemeral; persisted data lives in storage)
let tabClients = {};      // { tabId: { locationId, clientName } }
let tabUnreads = {};      // { tabId: count }
let lastActiveTimes = {}; // { tabId: timestamp }
let collapseTimer = null;  // setTimeout ID for delayed auto-collapse

/* -------------------- Dynamic content script registration -------------------- */
function registerDynamicScripts(domains) {
  if (!chrome.scripting) return;
  const matches = (domains && domains.length ? domains : DEFAULT_DOMAINS)
    .map((d) => `https://${d}/*`);
  const details = {
    id: "ghl-renamer-content",
    matches,
    js: ["utils.js", "content.js"],
    css: ["content.css"],
    runAt: "document_idle"
  };
  chrome.scripting.getRegisteredContentScripts({ ids: ["ghl-renamer-content"] }, (scripts) => {
    const exists = scripts && scripts.length > 0;
    const fn = exists ? chrome.scripting.updateContentScripts : chrome.scripting.registerContentScripts;
    fn.call(chrome.scripting, [details], () => {
      if (chrome.runtime.lastError) console.warn("[GHL] script reg:", chrome.runtime.lastError.message);
    });
  });
}

/* -------------------- Badge -------------------- */
function updateBadgeText() {
  let total = 0;
  for (const c of Object.values(tabUnreads)) total += c;
  chrome.action.setBadgeText({ text: total > 0 ? String(total) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#f43f5e" });
}

/* -------------------- Lifecycle -------------------- */
chrome.runtime.onInstalled.addListener(() => {
  getSettings((settings) => {
    chrome.storage.sync.set({ settings }, () => registerDynamicScripts(settings.customDomains));
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabClients[tabId];
  delete tabUnreads[tabId];
  delete lastActiveTimes[tabId];
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
  updateBadgeText();
  computeSmartSuggestions();
});

/* -------------------- Message router -------------------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  if (message.action === "updateClientTab") {
    if (tabId) {
      const { locationId, clientName, section } = message;
      tabClients[tabId] = { locationId, clientName };

      // track recent client
      if (locationId && clientName && clientName !== "GHL Client") {
        chrome.storage.local.get("recent_clients", (res) => {
          let recents = res.recent_clients || [];
          recents = recents.filter((r) => r.locationId !== locationId);
          recents.unshift({
            locationId, clientName,
            section: section || "Dashboard",
            url: sender.tab.url,
            timestamp: Date.now()
          });
          recents = recents.slice(0, 15);
          chrome.storage.local.set({ recent_clients: recents });
        });
        // persist client name map
        chrome.storage.local.get("client_names", (res) => {
          const map = res.client_names || {};
          if (map[locationId] !== clientName) {
            map[locationId] = clientName;
            chrome.storage.local.set({ client_names: map });
          }
        });
      }

      // tab grouping
      getSettings((settings) => {
        if (settings.enabled && settings.autoGroup && clientName && clientName !== "GHL Client") {
          groupTabByClient(tabId, clientName, locationId, settings);
        }
      });
    }
    sendResponse({ success: true });
  }

  else if (message.action === "updateUnreadCount") {
    if (tabId) {
      tabUnreads[tabId] = message.count || 0;
      updateBadgeText();
      computeSmartSuggestions();
    }
    sendResponse({ success: true });
  }

  else if (message.action === "getGHLTabs") {
    chrome.tabs.query({}, (tabs) => {
      const list = tabs
        .map((tab) => {
          const info = tabClients[tab.id] || {};
          return {
            tabId: tab.id,
            title: tab.title,
            url: tab.url,
            clientName: info.clientName || "GHL Client",
            locationId: info.locationId || null,
            section: info.section || null
          };
        })
        .filter((t) => t.locationId !== null);
      sendResponse({ tabs: list });
    });
    return true; // async
  }

  else if (message.action === "activateTab") {
    if (message.tabId) {
      chrome.tabs.update(message.tabId, { active: true }, () => {
        chrome.tabs.get(message.tabId, (tab) => {
          if (tab) chrome.windows.update(tab.windowId, { focused: true });
        });
      });
    }
    sendResponse({ success: true });
  }

  else if (message.action === "reloadSettings") {
    getSettings((settings) => registerDynamicScripts(settings.customDomains));
    sendResponse({ success: true });
  }

  else if (message.action === "isTabGrouped") {
    if (tabId) {
      // Guard: tabGroups API unavailable
      if (!chrome.tabGroups) { sendResponse({ grouped: false }); return true; }
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          sendResponse({ grouped: false });
        } else {
          sendResponse({ grouped: tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE });
        }
      });
      return true;
    }
    sendResponse({ grouped: false });
  }

  else if (message.action === "getActivityData") {
    chrome.storage.local.get("activity_timer", (res) => sendResponse(res.activity_timer || {}));
    return true;
  }

  else if (message.action === "getSmartSuggestions") {
    chrome.storage.local.get("smart_suggestions", (res) => sendResponse(res.smart_suggestions || []));
    return true;
  }

  else if (message.action === "dismissSuggestion") {
    chrome.storage.local.get("smart_suggestions", (res) => {
      let list = res.smart_suggestions || [];
      list = list.filter((s) => s.locationId !== message.locationId);
      chrome.storage.local.set({ smart_suggestions: list });
      sendResponse({ success: true });
    });
    return true;
  }

  return true;
});

/* -------------------- Tab grouping by client -------------------- */
function collapseOtherGroups(allGroups, activeGroupId) {
  if (!chrome.tabGroups) return;
  allGroups.forEach((g) => {
    if (g.id !== activeGroupId && !g.collapsed) {
      chrome.tabGroups.update(g.id, { collapsed: true });
    }
  });
}

/** Sort all tab groups in the window alphabetically by title. */
function sortGroupsAlphabetically(windowId) {
  if (!chrome.tabGroups || !chrome.tabGroups.move) return;
  chrome.tabGroups.query({ windowId }, (groups) => {
    if (chrome.runtime.lastError || !groups || groups.length < 2) return;
    // Strip leading emoji/icon from group titles for sorting
    var stripIcon = function(title) {
      return (title || "").replace(/^[^\w]+/, "").trim();
    };
    var sorted = groups.slice().sort(function(a, b) {
      return stripIcon(a.title || "").localeCompare(stripIcon(b.title || ""), undefined, { sensitivity: "base" });
    });
    sorted.forEach(function(g, i) {
      chrome.tabGroups.move(g.id, { index: i });
    });
  });
}


function groupTabByClient(tabId, clientName, locationId, settings) {
  // Guard: some Chromium browsers (Vivaldi) may not support tabGroups API
  if (!chrome.tabGroups || !chrome.tabs.group) {
    console.warn("[GHL] chrome.tabGroups API unavailable. Skipping auto-group.");
    return;
  }
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    chrome.tabGroups.query({ windowId: tab.windowId }, (groups) => {
      if (chrome.runtime.lastError || !groups) return;
      
      // Look up the current tab group (if any)
      const currentGroup = groups.find((g) => g.id === tab.groupId);
      const currentGroupTitle = currentGroup ? currentGroup.title : "";
      
      // If the current tab is already in a group matching the client's name, we are done!
      if (currentGroupTitle === clientName) {
        chrome.tabGroups.update(tab.groupId, { collapsed: false }); // Ensure it is expanded/open!
        // Collapse all other groups to keep the active client's group visually at the top!
        collapseOtherGroups(groups, tab.groupId);
        return;
      }
      
      // If the current tab group title does NOT match the client name (or tab is ungrouped):
      // Look up if a group representing this client's name already exists in the window
      const match = groups.find((g) => g.title === clientName);
      
      if (match) {
        // If a group with this client's name already exists, move this tab to it!
        chrome.tabs.group({ tabIds: [tabId], groupId: match.id }, () => {
          const icon = (settings.clientGroupIcons && settings.clientGroupIcons[locationId]) || "";
          const groupColor = (settings.clientGroupColors && settings.clientGroupColors[locationId]) || "";
          const updateOpts = { collapsed: false };
          if (icon) updateOpts.title = icon + " " + clientName;
          if (groupColor) updateOpts.color = groupColor;
          chrome.tabGroups.update(match.id, updateOpts); // Expand / Open!
          collapseOtherGroups(groups, match.id); // Collapse other groups to keep this at top!
          if (settings.sortGroupsAlpha) sortGroupsAlphabetically(tab.windowId);
        });
      } else {
        // Automatically create a BRAND NEW group specifically for this client name!
        chrome.tabs.group({ tabIds: [tabId] }, (newGroupId) => {
          if (chrome.runtime.lastError) return;
          const hex = (settings.clientColors && settings.clientColors[locationId]) || "";
          const icon = (settings.clientGroupIcons && settings.clientGroupIcons[locationId]) || "";
          const groupColor = (settings.clientGroupColors && settings.clientGroupColors[locationId]) || mapHexToGroupColor(hex);
          chrome.tabGroups.update(newGroupId, {
            title: icon ? icon + " " + clientName : clientName,
            color: groupColor,
            collapsed: false // Expand / Open!
          });
          collapseOtherGroups(groups, newGroupId); // Collapse other groups to keep new one at top!
          if (settings.sortGroupsAlpha) sortGroupsAlphabetically(tab.windowId);
        });
      }
    });
  });
}

/* -------------------- Custom tab groupers -------------------- */
function handleCustomTabGrouping(tabId, tab) {
  if (!tab || !tab.url) return;
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) return;
  getSettings((settings) => {
    if (!settings.enabled || !settings.enableCustomGroupers || !settings.customGroupers) return;
    if (!chrome.tabGroups || !chrome.tabs.group) return; // guard for Vivaldi
    const rule = settings.customGroupers.find((g) => g.enabled && g.pattern && tab.url.toLowerCase().includes(g.pattern.toLowerCase()));
    if (!rule) return;
    chrome.tabGroups.query({ windowId: tab.windowId }, (groups) => {
      if (chrome.runtime.lastError) return;
      const existing = groups.find((g) => g.title === rule.name);
      if (existing) {
        if (tab.groupId !== existing.id) chrome.tabs.group({ tabIds: [tabId], groupId: existing.id });
      } else {
        chrome.tabs.group({ tabIds: [tabId] }, (newGroupId) => {
          if (chrome.runtime.lastError) return;
          chrome.tabGroups.update(newGroupId, { title: rule.name, color: rule.color || "grey" });
        });
      }
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") handleCustomTabGrouping(tabId, tab);
});

/* -------------------- Tab focus: collapse + RAM saver -------------------- */
chrome.tabs.onActivated.addListener((activeInfo) => {
  const now = Date.now();
  lastActiveTimes[activeInfo.tabId] = now;

  getSettings((settings) => {
    if (!settings.enabled) return;

    // 1. Auto-collapse inactive groups (with configurable delay)
    if (settings.autoCollapseGroups && chrome.tabGroups) {
      // Clear any existing collapse timer — user switched tabs, restart countdown
      if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }

      const delayMs = (settings.autoCollapseDelay || 0) * 1000; // seconds → ms

      const doCollapse = () => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) return;
          if (!tab.groupId || tab.groupId === chrome.tabs.TAB_GROUP_ID_NONE) return;
          chrome.tabGroups.query({ windowId: tab.windowId }, (groups) => {
            if (chrome.runtime.lastError || !groups) return;
            groups.forEach((g) => {
              const shouldCollapse = g.id !== tab.groupId;
              if (g.collapsed !== shouldCollapse) {
                chrome.tabGroups.update(g.id, { collapsed: shouldCollapse });
              }
            });
          });
        });
      };

      if (delayMs <= 0) {
        doCollapse();                           // instant
      } else {
        collapseTimer = setTimeout(() => {
          doCollapse();
          collapseTimer = null;
        }, delayMs);                            // wait N seconds then collapse
      }
    }

    // 2. RAM saver
    if (settings.enableRamSaver) {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError || !tabs) return;
        const threshold = (settings.ramSaverIdleMinutes || 30) * 60000;
        tabs.forEach((tab) => {
          if (tab.active || tab.pinned || tab.discarded) return;
          if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:"))) return;
          if (!lastActiveTimes[tab.id]) { lastActiveTimes[tab.id] = now; return; }
          if (now - lastActiveTimes[tab.id] > threshold) {
            chrome.tabs.discard(tab.id);
          }
        });
      });
    }

    // 3. recompute smart suggestions
    computeSmartSuggestions();
  });
});

/* -------------------- Smart grouping suggestions -------------------- */
function computeSmartSuggestions() {
  getSettings((settings) => {
    if (!settings.enabled || !settings.smartGroupingSuggestions) return;
    // count open tabs per client without a color assigned
    const counts = {};
    Object.entries(tabClients).forEach(([tabId, info]) => {
      if (!info.locationId || !info.clientName || info.clientName === "GHL Client") return;
      if (settings.clientColors && settings.clientColors[info.locationId]) return; // has color
      counts[info.locationId] = (counts[info.locationId] || 0) + 1;
    });
    const suggestions = Object.entries(counts)
      .filter(([_, n]) => n >= 1)
      .map(([locationId, count]) => {
        const info = Object.values(tabClients).find((c) => c.locationId === locationId);
        return { locationId, clientName: info ? info.clientName : "GHL Client", tabCount: count };
      })
      .slice(0, 5);
    chrome.storage.local.set({ smart_suggestions: suggestions });
  });
}

/* -------------------- Command routing -------------------- */
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    if (command === "toggle-notes") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleNotes" }, () => {
        if (chrome.runtime.lastError) { /* content script not loaded */ }
      });
    } else if (command === "open-palette") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "openPalette" }, () => {
        if (chrome.runtime.lastError) { /* content script not loaded */ }
      });
    }
  });
});
