## MapCamp – Account-Based Marker Workspace

MapCamp is a lightweight field-operations application built with Node.js/Express and SQLite. It delivers:

1. A secure login/register screen with show/hide password controls.
2. A Leaflet 1.9 workspace where authenticated users create, edit, and manage markers that persist per account.
3. A centralized `API` helper (`public/js/api.js`) that wraps every HTTP call, attaches JWT headers, and exposes convenience methods such as `API.login`, `API.getMarkers`, etc. This keeps `main.js` and `login.js` declarative and lets you shift API paths in a single place.

---

### Highlights

- **Authentication & session storage**
  - Email/password registration
  - Password hashing via `bcrypt`
  - JWT sessions (7-day expiry) handled by the API helper (`API.setToken`, `API.clearToken`)
- **Map tooling**
  - Leaflet map with OpenStreetMap tiles
  - Marker creation by map clicks, inline editing popup (name + date)
  - Sidebar list that now zooms in farther when you select a marker
  - Search bar with debounced, keyboard-navigable Nominatim suggestions that overlay above the map
  - Language selector (FR / EN / NL) updating UI copy and default marker names
- **Data portability**
  - JSON export/import actions
  - SQLite persistence per user account

---

### Repository Layout

```
├── public/
│   ├── index.html           # Authenticated workspace UI
│   ├── login.html           # Auth UI (password toggle markup)
│   ├── css/style.css        # Shared styling (map, login, search suggestions)
│   └── js/
│       ├── api.js           # Central fetch wrapper (token store, helper methods)
│       ├── login.js         # Login/register logic using API.login / API.register
│       └── main.js          # Map + sidebar + search logic, translations, state
├── server.js                # Express + SQLite routes (/api/register, /api/markers, …)
├── db.sqlite                # SQLite database (auto-created)
├── docs/API.md              # Detailed HTTP API reference
├── package.json / lock
└── README.md
```

---

### Prerequisites

- Node.js 18 or newer (Express 5 requires a modern runtime)
- npm (bundled with Node)
- No external DB is needed; SQLite ships via the `sqlite3` package

---

### Setup & Run

```bash
# Install dependencies
npm install

# Configure the JWT secret (edit server.js -> const SECRET = '...'
# or load it via an environment variable before start).

# Start API + static frontend
npm start

# Visit the login screen
# (Windows) start http://localhost:3000/login
# (macOS/Linux) open http://localhost:3000/login
```

Register a user via `/login` to seed the database. All subsequent actions use your JWT, stored by `API.setToken`.

---

### Typical Workflow

1. **Register / log in** – the token is persisted by the API helper.
2. **Add markers** – toggle “Add marker”, click the map, edit name/date in the popup form.
3. **Search** – type an address or POI; choose from the suggestion overlay to recenter.
4. **Review** – use the sidebar list or map tooltips; clicking a list item zooms tighter.
5. **Export / import** – move datasets via the toolbar buttons.
6. **Logout** – the token is cleared and you return to `/login`.

---

### Configuration Notes

- **JWT secret** – replace the placeholder `SECRET` in `server.js`. For production, use an env variable (e.g., `process.env.JWT_SECRET`).
- **Port** – default is `3000` (`const PORT = 3000`). Change it or set `process.env.PORT`.
- **Database file** – `db.sqlite` sits at the repo root. Remove it to reset data or point `sqlite3.Database` to another location.
- **Reverse proxy** – ensure the `Authorization` header is forwarded if running behind Nginx/Apache.
- **Security** – add HTTPS termination, rate limiting, and CSRF protections before public deployment.

---

### npm Scripts

| Command     | Description                               |
|-------------|-------------------------------------------|
| `npm start` | Runs `node server.js` (API + static files) |
| `npm test`  | Placeholder (no automated tests yet)      |

---

### API Overview

All endpoints live under `/api` and return JSON (see `docs/API.md` for full details):

- `POST /api/register` – `{ email, password }` → `{ "success": true }`
- `POST /api/login` – `{ email, password }` → `{ "token": "<jwt>" }`
- `GET /api/markers` – list markers for the authenticated user
- `POST /api/markers` – add marker `{ lat, lng, name, date }`
- `PUT /api/markers/:id` – update marker
- `DELETE /api/markers/:id` – remove marker

Missing/invalid tokens return `401/403`. Errors follow `{ "error": "message" }`.

---

### Extending MapCamp

- Swap SQLite for PostgreSQL/MySQL for multi-writer deployments.
- Add marker categories, clustering, or attachments by extending `main.js`.
- Integrate `dotenv` and load secrets via environment variables.
- Add automated tests that import `public/js/api.js` to validate auth/marker flows.

---

### License

MapCamp is published under the ISC License (see `package.json`).
