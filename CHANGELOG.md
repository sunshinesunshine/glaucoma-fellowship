# 📖 Glaucoma Fellowship App — Version Diary & Core Function Changelog

All notable changes, architectural milestones, and core function evolutions of the **Glaucoma Fellowship Web Platform** are documented in this diary.

## 🚀 [v6.3.0] - 2026-08-17 — *Competency Targets Summary, Dynamic Today Month, Pre-Op OR Clean-Up, Deletion Tombstones & Time-Scoped Case Filters*

### ⚕️ Case Volume Summary & Competency Targets
- **Dynamic Competency Targets Display**: Case Volume Summary in the Completed Case Log now automatically renders all configured procedures from **Competency Case Targets** (Settings tab) along with logged case counts, percentage bars, and completion indicators (`✅ Target Met`).

### 📅 Today-Centric Calendar Default
- **Dynamic Initial Month**: Calendar views across all tabs (Summary, Rotation Schedule, On-Call, Case Log) now automatically open to the current active month (e.g. August 2026 for August dates) instead of hardcoding to July.

### 🧹 Pre-Op List Auto-Removal & Promotion
- **Clean Promotion to OR**: When a pre-op patient is promoted (`→ OR`) or marked as `Done`, the case is automatically removed from the Pre-Op List and appended to the Completed Case Log without leaving ghost entries.

### 🛡️ Deletion Tombstone & Ghost Case Elimination
- **Tombstone Registry (`gf_deleted_ids`)**: Fixed the database synchronization bug where deleted cases resurfaced upon sync. Explicit user deletions are marked with tombstones and excluded from bidirectional merging and real-time Firestore snapshots.

### ⏱️ Time-Scoped Case Filters (Day / Week / Month / All)
- **Time Scope Switcher**: Added interactive filter pills (`ทั้งหมด (All)`, `วัน (Day)`, `สัปดาห์ (Week)`, `เดือน (Month)`) in the Cases List View with period navigation (`‹ ›`), date picker shortcuts, and instant `Today` reset.

---

## 🔬 [v6.2.1] - 2026-08-17 — *IOL Type Configuration & Logging Support*

### 🔬 IOL Type Logging & Settings Presets
- **Conditional IOL Field**: Operation/Procedure selection containing `"IOL"` (e.g. `PE c IOL`, `Phaco+Trab`, `Ahmed + PE c IOL`) automatically reveals the dedicated **IOL Type** selection dropdown in the Add/Edit Case Modal.
- **Preset Management in Settings**: Added **🔬 IOL Types (Presets)** management card in the Settings tab with add and delete capabilities (default presets include Monofocal Alcon/TECNIS/Bausch, Toric, EDOF, Multifocal PanOptix, CTR, Sulcus PMMA).
- **Drilldown Modal Display**: Case drilldown popup now displays the selected IOL Type alongside diagnosis and supervisor metadata.
- **Pre-Op to OR Promotion**: `promoteToOR()` safely migrates selected `iolType` and patient name when moving confirmed pre-op cases to completed OR logs.
- **Excel & CSV Export**: Updated `exportMultiSheetExcel()` and `exportORcsv()` to include `IOL Type` columns and settings preset documentation.

---

## 🛡️ [v6.2.0] - 2026-08-15 — *4-Layer Backup & Recovery System*

### 🛡️ Backup Engine (Prevents Future Data Loss)
- **Layer 1 — Versioned LocalStorage Snapshots**: Auto-saves a timestamped snapshot of all case data to `localStorage` on every data change (debounced 2s). Keeps 14 rolling snapshots per device.
- **Layer 2 — Daily Firestore Cloud Snapshots**: Writes a full backup to `gf_v6_backups/{YYYY-MM-DD}` collection once per day (forced on every app open). 14 days of cloud history.
- **Layer 3 — App-open Forced Backup**: Every time the app loads and syncs successfully, it immediately writes a local + cloud snapshot — so even just opening the app protects your data.
- **Backup & Recovery Center** (Settings tab): Full UI showing all local + cloud snapshots with one-tap **Merge** or **Overwrite** restore.
- **🛡️ Backup Now** button for on-demand snapshots.
- **Non-destructive merge**: `restoreFromSnapshot()` uses `mergeEntries()` — restoring never deletes existing cases.

---

## 🔧 [v6.1.2] - 2026-08-15 — *Device Storage Recovery*

### 📲 Non-Destructive Sync & Device Recovery Engine
- **Device Storage Recovery Button**: Added `📲 Recover Local Device Storage` button in Settings to automatically pull and merge any unsynced cases logged locally on a phone or laptop.
- **Smart Bidirectional Merging**: Snapshot sync uses `mergeEntries()` by unique ID so remote Firestore snapshots never overwrite or erase local device log entries.
- **Completed Cases Restoration**: Recovered completed cases from pre-op database records into Firestore `logbook`.
- **Diagnostic Tool Link**: Integrated direct link to `recover.html` for deep storage diagnostics.

---

## 🚀 [v6.1.0] - 2026-08-07 — *Claude Design System Modernization & Version Control*

### 🎨 Visual & UI Overhaul (Claude Design System)
- **Warm Charcoal Palette**: Transformed theme from dark navy to Warm Midnight Charcoal (`#141416`).
- **Glassmorphic Surface Cards**: Upgraded container cards with deep charcoal glass (`rgba(24, 24, 28, 0.75)` + `backdrop-filter: blur(16px)`), subtle borders (`border-white/8`), and shadow elevations.
- **Floating Capsule Navigation**: Re-architected bottom navigation bar into a floating capsule with active sliding amber pill indicators (`#f97316`) and scale micro-feedback.
- **Fellow Branding Accents**: Distinct visual indicators for Fellow **SS** (Electric Sapphire Blue `#3b82f6`) and Fellow **MN** (Warm Terracotta Amber `#f97316`).

### 📦 Version Management & Repository Integration
- Initialized official git repository with version tracking (`v6.1.0`).
- Integrated version badges into main portal header and companion tracker footer.
- Prepared GitHub repository deployment guide for automatic version synchronization.

---

## 🔧 [v6.0.1] - 2026-08-01 — *LINE Notify & Timezone Bug Fixes*

### 📲 LINE Worker & Timezone Engine Fixes
- **Month Index Off-By-One Fix**: Corrected `buildDayMsg` passing `m + 1` to `resolveCell`. Rotation records are 0-indexed, matching JS `getMonth()`.
- **Webhook Schedule Fetching**: Added `schedule` Firestore document to the webhook `Promise.all` fetch list, resolving blank chatbot replies for `today`/`tomorrow` commands.
- **Bangkok Timezone Double-Shift Fix (+14h)**: Resolved double UTC+7 conversion bug where 20:00 Bangkok daily cron displayed Monday's date on Saturday.
- **Manual LINE Push Guard Removal**: Allowed manual "Send Today" notification pushes on weekends & public holidays so on-call shifts can always be notified.

---

## 🏥 [v6.0.0] - 2026-07-01 — *Follow-up Companion App (`tracker.html`)*

### 🔍 Follow-Up Companion Tracker
- **Separate Companion Web App**: Launched `tracker.html` for fellow patient follow-up without password gating.
- **Real-Time Patient Synchronization**: Automatic sync with Firestore `orLog` and `preop` database collections.
- **Interactive IOP & Medication Tracking**: Historical IOP timeline, eye laterality, procedure filters, and medications count.
- **Dynamic Table Column Sorting**: Clickable headers (`HN`, `Name`, `Procedure`, `Supervisor`, `Date`, `IOP`, `Meds`) with persistent visual direction markers (`▲`, `▼`, `↕`).

---

## 🔥 [v5.0.0] - 2026-06-24 — *Live Firestore Real-Time Sync & Customization*

### ☁️ Cloud Persistence & Administration
- **Firebase Firestore Integration**: Replaced local-only storage with real-time multi-device database sync (`gf_v6` collection).
- **Custom Diagnoses Management**: Added dynamic Diagnosis Settings panel allowing custom diagnosis entries.
- **Patient Name Integration**: Added Patient Name fields across OR case logging, pre-op lists, and summary cards.
- **Administrative Passcode Locking**: Lockable settings and schedule tabs (`appPassword` security gate).

---

## ⚕️ [v4.0.0] - 2026-06-15 — *Surgical Logbook & Case Management*

### 🩺 Surgical Logbook & Target Tracking
- **OR Case Logger**: Log completed surgical cases with procedure, eye laterality (OD/OS/OU), supervisor, diagnosis, and notes.
- **Procedure Target Counter**: Target counter vs actual logged cases for Trabeculectomy, Ahmed Valve, MIGS (iStent/KDB), CPC, SLT, YAG PI, etc.
- **Pre-Op Waiting List**: Schedule upcoming pre-op surgical candidates with readiness checkboxes and status badges.

---

## 🤖 [v3.0.0] - 2026-06-01 — *Cloudflare Worker & LINE Messaging API*

### 💬 LINE Chatbot & Daily Notifications
- **Automated Daily Cron**: Scheduled 20:00 Bangkok daily preview notifications pushing tomorrow's rotation, ward round, and on-call status.
- **Interactive Chatbot Guided Flow**: Responds to LINE user messages for `today`, `tomorrow`, `stats`, `offday`, `swap` (duty shift trade), and `log` (log case directly from LINE).

---

## 📅 [v2.0.0] - 2026-05-15 — *Rotation Planner & On-Call Roster*

### 🗓️ Rotation Templates & Shift Swaps
- **W1–W5 Monthly Rotation Grids**: AM/PM duty template assignment for fellows SS & MN across 12 calendar months.
- **On-Call Night Duty Manager**: Assign night duty calls and record booked off-duty days with custom reasons.
- **ICS Calendar Export**: Export rotation and on-call schedules into Apple Calendar & Google Calendar (`.ics` format).

---

## 🐣 [v1.0.0] - 2026-05-01 — *Initial Release*

### 🏁 Core Foundation
- Initial single-page HTML application for Glaucoma Fellowship schedule viewing.
