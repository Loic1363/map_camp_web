# MapCamp – Account-based marker workspace

MapCamp is a minimalist, production-style web application that lets you create,
edit and manage geolocated markers on top of an interactive Leaflet map.

Each marker is stored **per user account** in a SQLite database via a small
Node.js/Express backend. Close your browser, change device – your workspace is
still there when you come back.

---

## Features

- 🔐 **Account system**
  - Email + password authentication
  - Passwords hashed with `bcrypt`
  - JWT-based sessions

- 🗺️ **Interactive map**
  - Leaflet-powered map with OpenStreetMap tiles
  - Draggable markers with labels and date metadata
  - Focus a marker from the right-hand panel

- 🧵 **Marker relationships**
  - “Link markers” mode to visually connect two markers with a polyline
  - Useful for routes, dependencies or point-to-point operations

- 💾 **Persistent storage**
  - All markers are stored per-user in a SQLite database
  - No browser-only localStorage – true multi-device persistence

- 📤 **Export / Import**
  - Export your markers as a JSON file
  - Re-import them into another account or environment

- 💼 **Enterprise-style UI**
  - Dark, focused workspace layout
  - Clear separation between login experience and map workspace
  - Responsive design that works on laptops and tablets

---

## Tech stack

- **Frontend**
  - Vanilla HTML/CSS/JS
  - Leaflet 1.9.x
- **Backend**
  - Node.js + Express
  - SQLite (`sqlite3`)
  - `bcrypt` for password hashing
  - `jsonwebtoken` for JWT auth

---

## Getting started

### 1. Clone the repository

```bash
git clone git@github.com:Loic1363/map_camp_web.git
cd map_camp_web
