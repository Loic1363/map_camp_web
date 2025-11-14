## MapCamp | Account-Based Marker Workspace

MapCamp is a focused field-operations tool that combines a modern authentication flow with a Leaflet-powered workspace. Each user works in a private SQLite-backed map where they can add, label, and review geo‑referenced markers, export the data, and pick up the session on any device. Everything is implemented with a lightweight Node.js/Express stack so it can run in a single process without extra infrastructure.

---

### Core Capabilities

- **Secure workspace per user**
  - Email/password registration and login
  - Password hashing with `bcrypt` and stateless JWT sessions
  - Markers stored per user in SQLite (`db.sqlite`)

- **Interactive map tooling**
  - Leaflet 1.9 map with OpenStreetMap tiles
  - Marker creation directly from map clicks
  - Inline editing popup with name + date metadata
  - Sidebar overview to jump to specific markers
  - Search bar with Nominatim-powered suggestions (cities, addresses, POIs)

- **Productivity enhancements**
  - JSON export/import to move datasets between accounts or environments
  - Responsive dark UI usable on laptops and tablets
  - Persistent layout state (sidebar visibility, language, etc.)

---

### Project Layout

```
├── public/                # Static assets served by Express
│   ├── index.html         # Authenticated workspace UI
│   ├── login.html         # Authentication screen
│   ├── css/style.css      # Shared styling
│   └── js/                # Front-end logic (main.js, login.js)
├── server.js              # Express API + SQLite access layer
├── db.sqlite              # SQLite database file (created automatically)
├── package.json           # Node.js dependencies + scripts
└── README.md
```

---

### Prerequisites

- Node.js 18+ (Express 5 requires a recent runtime)
- npm (ships with Node.js)
- SQLite (bundled via `sqlite3` npm package; no external service needed)

---

### Installation & Local Run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) edit the JWT secret in server.js
#    const SECRET = 'change-moi-par-un-secret-plus-long';

# 3. Start the API + static server
npm start

# 4. Visit the app
open http://localhost:3000/login
```

The server seeds no default users; register via the login page to create your first account.

---

### Typical Workflow

1. **Register / sign in** from `/login`.
2. **Add markers** by toggling “Add marker” and clicking the map, then fill in label/date via the popup form.
3. **Search for locations** using the top search bar; select a suggestion to recenter the map.
4. **Review markers** from the sidebar list or via the permanent tooltips on the map.
5. **Export / import** your dataset using the JSON actions in the toolbar.

All mutations go through the API, so refreshing the page or switching devices keeps your workspace intact.

---

### Environment & Configuration Notes

- **JWT secret** – replace the placeholder `SECRET` constant in `server.js` before deploying.
- **Database file** – `db.sqlite` is committed for convenience; delete it to reset, or point the `sqlite3.Database` constructor to another path.
- **Ports** – the server listens on `3000` by default (`const PORT = 3000;`).
- **Static hosting** – Express serves everything from `public/`; no build step is required.

---

### Available npm Scripts

| Command      | Description                           |
|--------------|---------------------------------------|
| `npm start`  | Runs `node server.js` (API + frontend)|
| `npm test`   | Placeholder (no automated tests yet)  |

---

### Extending the Project

- Add rate limiting, HTTPS, and production-ready JWT storage before exposing publicly.
- Replace the hardcoded secret with an environment variable (e.g., `process.env.JWT_SECRET`).
- Layer on additional map tooling (clustering, marker categories, etc.) by editing `public/js/main.js`.
- Swap SQLite for PostgreSQL or another RDBMS if you need concurrent writers or cloud hosting.

---

### License

This project is published under the ISC License. See the `LICENSE` field in `package.json` for details.
