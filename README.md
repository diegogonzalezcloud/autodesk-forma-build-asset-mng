# Forma Asset Manager

A browser-based tool for managing **Asset Categories** in Autodesk Forma / Autodesk Construction Cloud (ACC) projects — no coding required.

- **Import** categories in bulk from a CSV file
- **Export** a project's category structure to CSV
- **Copy** categories between projects (export → import)
- Visual hub & project selector with real-time import log

Built with Node.js + Express backend and vanilla JS frontend. Runs entirely on your local machine.

---

## Video Tutorial

[![Watch the video](https://img.youtube.com/vi/tyOhEaYZe88/maxresdefault.jpg)](https://www.youtube.com/watch?v=tyOhEaYZe88)

> Click the image above to watch the full tutorial on YouTube.

---

## Prerequisites

- **Node.js 18+** — uses the built-in `fetch` API
- An **Autodesk Platform Services (APS) app** — [create one here](https://aps.autodesk.com)
  - App type: **Traditional Web App**
  - Callback URL: `http://localhost:3000/auth/callback`
  - API enabled: **Autodesk Construction Cloud API**

---

## Installation

```bash
git clone https://github.com/diegogonzalezcloud/autodesk-forma-build-asset-mng.git
cd autodesk-forma-build-asset-mng
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. **Configure** — Enter your APS Client ID and Client Secret on the setup screen.
2. **Authenticate** — Sign in with your Autodesk account (OAuth 2.0 — 3-legged).
3. **Select a project** — Browse your hubs and projects from the dropdown inside each feature.
4. **Import / Export** — Upload a CSV to import, or click Export to download your category structure.

See the in-app **Tutorial** page for detailed instructions and CSV column reference.

---

## CSV Format

| Column | Required | Description |
|---|---|---|
| `name` | ✓ | Category name |
| `description` | ✓ | Category description (defaults to name if empty) |
| `parentId` | one of two | Raw parent category GUID |
| `parentPath` | one of two | Parent path, e.g. `Bridges/Foundations` |
| `statusSetName` | — | Status Set name (root-level categories only) |

---

## Project Structure

```
forma-asset-manager/
├── server.js               # Express server + session middleware
├── routes/
│   ├── auth.js             # OAuth2 config, login, callback, status
│   └── api.js              # Categories, hubs/projects API proxy
├── services/
│   ├── aps.js              # APS API client
│   ├── import.js           # CSV import logic with SSE streaming
│   └── export.js           # Category tree export to CSV
└── public/
    ├── index.html
    ├── css/app.css
    └── js/
        ├── app.js          # Router, state, toast, setup/auth pages
        ├── api.js          # Frontend HTTP client
        ├── components/
        │   └── project-selector.js
        └── pages/
            ├── categories-import.js
            ├── categories-export.js
            ├── help.js
            └── about.js
```

---

## APIs Used

- [APS Authentication API](https://aps.autodesk.com/en/docs/oauth/v2/reference/http/authorize-GET/) — OAuth 2.0 3-legged
- [ACC Assets API](https://aps.autodesk.com/en/docs/acc/v1/reference/http/assets-categories-GET/) — Asset Categories & Status Sets
- [APS Data Management API](https://aps.autodesk.com/en/docs/data/v2/reference/http/hubs-GET/) — Hubs & Projects

---

## Author

**Diego González Pascual**

- GitHub: [diegogonzalezcloud](https://github.com/diegogonzalezcloud)
- LinkedIn: [diegogonzalezpascual](https://www.linkedin.com/in/diegogonzalezpascual/)
- YouTube: [Flujos Digitales](https://www.youtube.com/@diegogonzalezcloud)

---

## License

MIT License — free to use, modify, and distribute.

> This tool is not an official Autodesk product and is not affiliated with or endorsed by Autodesk, Inc.
> Autodesk, Forma, BIM 360, and ACC are trademarks of Autodesk, Inc.
