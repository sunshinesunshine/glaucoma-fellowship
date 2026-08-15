# 📖 Glaucoma Fellowship App — Version Diary & Core Function Changelog

All notable changes, architectural milestones, and core function evolutions of the **Glaucoma Fellowship Web Platform** are documented in this diary.

## 🚀 [v6.1.2] - 2026-08-15 — *Data Recovery & Device Storage Recovery*

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
