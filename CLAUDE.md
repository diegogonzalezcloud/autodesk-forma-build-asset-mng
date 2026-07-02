# Forma Asset Manager — Project Context

## What this app does
Browser-based tool for managing Asset Categories in Autodesk Forma / ACC projects.
- Import categories from CSV (with SSE streaming log and dry-run mode)
- Export categories to CSV
- Hub + project selector using APS Data Management API
- 3-legged OAuth2 via APS

## Stack
- **Backend**: Node.js 18+, Express, express-session, multer
- **Frontend**: Vanilla JS ES modules (no build step), CSS custom properties
- **Run**: `npm start` → http://localhost:3000

## APS APIs used
- Auth: `https://developer.api.autodesk.com/authentication/v2/`
- Assets: `https://developer.api.autodesk.com/construction/assets/v1`
- Data Management: `https://developer.api.autodesk.com/project/v1`

## File structure
```
server.js                          # Express entry point
routes/auth.js                     # OAuth2 config, login, callback, status, logout
routes/api.js                      # All API routes (hubs, projects, categories, import, export)
services/aps.js                    # APS API client (fetch wrapper)
services/import.js                 # CSV import logic with SSE emit
services/export.js                 # Category tree export to CSV
public/js/app.js                   # Router, state, toasts, setup/auth pages, NAV_ITEMS
public/js/api.js                   # Frontend HTTP client
public/js/components/project-selector.js  # Reusable hub+project dropdown
public/js/pages/categories-import.js
public/js/pages/categories-export.js
public/js/pages/help.js
public/js/pages/about.js
public/css/app.css                 # All styles (CSS variables, no framework)
```

## How to add a new feature/page
1. Add service in `services/` if new APS API calls are needed
2. Add routes in `routes/api.js` (or new route file mounted in `server.js`)
3. Add page in `public/js/pages/<feature>.js` — export `render(container)`
4. Add nav entry to `NAV_ITEMS` array in `public/js/app.js`
5. Add route case in the `routeTo()` function in `public/js/app.js`

## Key patterns
- Project ID is passed per-request (query param in GET, form field in POST) — not stored in session
- Session stores: clientId, clientSecret, accessToken, tokenExpiry
- Import uses SSE streaming: server writes `data: {...}\n\n`, frontend reads with fetch + ReadableStream
- Last selected project is persisted in localStorage (key: `forma-last-project`)
- NAV_ITEMS in app.js drives both the sidebar and the router — add here to register a new page

## GitHub
https://github.com/diegogonzalezcloud/autodesk-forma-build-asset-mng
