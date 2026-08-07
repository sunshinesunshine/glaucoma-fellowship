# Webapp Sub-Project — Glaucoma Tracker & Clinical Web Tools

This project is the **Web Application & Clinical Deployment Hub** hosted within the Central AI Sandbox at `projects/Webapp/`.

---

## 📁 Directory Structure

```
Webapp/
├── glaucoma/                      # Glaucoma Fellow Clinical Tracker source files
│   ├── fellowship_v6.html         # Main tracker UI (v6 release)
│   ├── tracker.html               # Rapid log entry module
│   ├── cloudflare_worker.js       # Cloudflare Worker backend API
│   └── wrangler.toml              # Cloudflare deployment config
├── web_deploy/                    # Production deployment root for Firebase & PWA
│   ├── index.html                 # Active web app entrypoint
│   ├── sw.js                      # Service Worker for PWA offline capabilities
│   ├── manifest.json              # Web app manifest
│   ├── tracker.html               # Tracker module
│   └── tracker_glaucoma.html      # Glaucoma specialized tracker
├── Corneal SIA ToolV101.xlsm      # Surgical Induced Astigmatism calculator
├── firebase.json                  # Firebase Hosting configuration
├── firestore.rules                # Firestore security rules
├── DESIGN.md                      # UI/UX design specifications
├── PRODUCT.md                     # Product features & vision
└── README.md                      # Project documentation
```

---

## 🚀 Key Applications

1. **Glaucoma Fellow Clinical Tracker**:
   - Progressive Web App (PWA) designed for logging clinical procedures, patient stats, and glaucoma surgical outcomes.
   - Deployed via Firebase Hosting and backed by Cloudflare Workers (`cloudflare_worker.js`).

2. **Corneal SIA Tool**:
   - Vector analysis calculator for Corneal Surgically Induced Astigmatism (SIA).

---

## 🤖 AI Agent & Sandbox Integration

- **Firebase & Cloudflare Configs**: Managed via local `firebase.json`, `firestore.rules`, and `glaucoma/wrangler.toml`.
- **Central Workspace Logging**: Deployment milestones, release versions, and web app updates are logged to the workspace central knowledge base:
  - Central Diary: [`../../knowledge/diary/`](file:///Users/CO/AI%20sandbox/knowledge/diary)
  - Master Index: [`../../knowledge/projects-summary.md`](file:///Users/CO/AI%20sandbox/knowledge/projects-summary.md)
