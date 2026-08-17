# GHL Tab Renamer — v2.0.0

A redesigned Chrome extension (Manifest V3) for agencies and operators who manage many
**GoHighLevel (GHL)** client sub-accounts at once. It renames tabs dynamically so every
tab shows the client name + section, color-codes them, adds a per-client notepad, a
global client switcher, activity tracking, and memory-saving tab management.

## What's new in 2.0 (full rebuild)

This version incorporates a complete visual redesign and every feature suggested in the
design review:

### Redesigned surfaces
- **Floater chip** — a compact, draggable glassmorphic pill with a per-client accent bar,
  color dot (pulses on unread), live activity timer, and click-vs-drag threshold.
- **Notes panel** — identity-driven header (colored avatar tile), rich contentEditable
  editor with markdown checklists, pin strip, revision history, and a live "saved Xs ago"
  indicator.
- **Global tab switcher** — Spotlight-style overlay (Ctrl+Shift+G) that searches across
  open tabs **and** known clients **and** note content, with keyboard navigation and
  filter chips.
- **Popup** — client card, recent sub-accounts, 7-day activity sparkline, smart
  suggestions, and backup actions.
- **Options** — 7-section settings hub with an **Activity Dashboard**, bulk client
  actions, and inline SVG icons (no more emoji-as-icons).

### New features
1. **Per-client context snapshot** — a one-line summary in the notes panel: *Last worked
   2h ago · 3 unread · 00:42 today*.
2. **Cross-client global search** — the switcher finds clients and notes even when their
   tabs aren't open.
3. **Note templates with variables** — `{client}`, `{date}`, `{section}`, `{user}` are
   substituted on load.
4. **Snooze / follow-up reminders** — set a timer on a pinned note; the chip pulses amber
   when due and a Chrome notification fires.
5. **Bulk client actions** — multi-select clients in Options to export their notes or
   clear colors.
6. **Activity dashboard** — a weekly time-per-client breakdown with a 7-day chart and
   top-clients ranking (great for billing).
7. **Smart grouping suggestions** — detects clients you open often but haven't color-tagged
   and offers to assign a color from the popup.
8. **Note sync across devices** — optional mirror of notes to `chrome.storage.sync`.
9. **Quick-action keyboard shortcuts**:
   - `Ctrl+Shift+G` — tab switcher
   - `Ctrl+Shift+N` — toggle notepad
   - `Ctrl+Shift+P` — pin / unpin note
   - `Alt+Shift+H` — open revision history
   - `Ctrl+Z` (in editor) — undo through history
10. **Undo for note edits** — Cmd/Ctrl+Z walks back through up to 30 revisions.

### Design-system improvements
- Lucide-style inline SVG icons everywhere (consistent, professional, no emoji).
- A single design-token system (CSS custom properties) for both dark and light themes.
- In-page styles extracted to `content.css` (registered alongside the content script).
- Per-client color identity flows consistently across favicon, chip, avatar tile,
  checkbox tint, tab group, and the options table.
- Proper empty states, loading indicators, restrained motion, and an accessible
  switch/keyboard model.

## File structure

```
ghl-tab-renamer/
├── manifest.json        MV3 manifest (permissions, 4 commands, content scripts)
├── background.js        Service worker: grouping, RAM saver, activity, suggestions, command routing
├── content.js           In-page UI: chip, notes panel, switcher, quick-nav
├── content.css          In-page design system (scoped under #ghl-wrapper)
├── utils.js             Shared constants, default settings, storage helpers
├── popup.html/.css/.js  Browser-action popup
├── options.html/.css/.js  Full settings page (7 sections)
├── icons/               16/48/128 px PNGs
└── README.md
```

## Install (developer / unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Pin the extension for quick access.
5. Open a GoHighLevel sub-account dashboard — your tab will rename automatically and the
   floating chip will appear.

## Usage

| Action | How |
|---|---|
| See client + section on every tab | Automatic |
| Open the notepad | Click the floating chip, or `Ctrl+Shift+N` |
| Pin a note | Click the pin icon, or `Ctrl+Shift+P` |
| Set a reminder | Click the bell icon → choose a duration |
| View note history | Click the history icon, or `Alt+Shift+H` |
| Undo an edit | `Ctrl+Z` while editing |
| Jump between clients/tabs | `Ctrl+Shift+G` → type to search |
| Change a client's color | Options → Clients |
| Add a white-label domain | Options → Domains |
| Review your week | Options → Activity |

## Permissions & privacy

- `storage` — notes, settings, activity data (local; sync optional).
- `tabs`, `tabGroups` — renaming, grouping, and the switcher.
- `scripting`, `activeTab` — injecting the content script into GHL pages.
- `notifications` — reminder alerts (only when a snoozed note comes due).
- `host_permissions: https://*/*` — required so content scripts can be dynamically
  registered for your white-label domains.

All data stays in your browser. Nothing is sent anywhere.

## Compatibility

Chrome / Edge / Brave / Arc — any Chromium browser supporting Manifest V3.
