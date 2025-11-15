const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os'); 
const IS_CI = process.env.CI === 'true';

const SECRET = 'change-moi-par-un-secret-plus-long';

const app = express();
const db = new sqlite3.Database('./db.sqlite');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== Création des tables si besoin ======
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS markers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            name TEXT,
            date TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);
});

// ====== Middleware d'authentification (JWT) ======
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide' });
        req.user = user; // { id, email }
        next();
    });
}

// ====== Routes auth ======
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email et mot de passe requis' });

    const hash = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, hash],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Email déjà utilisé' });
                }
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            res.json({ success: true });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            if (!user) return res.status(400).json({ error: 'Identifiants invalides' });

            const ok = bcrypt.compareSync(password, user.password_hash);
            if (!ok) return res.status(400).json({ error: 'Identifiants invalides' });

            const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
            res.json({ token });
        }
    );
});

// ====== Routes markers (protégées) ======

app.get('/api/markers', authMiddleware, (req, res) => {
    db.all(
        'SELECT * FROM markers WHERE user_id = ?',
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            res.json(rows);
        }
    );
});

app.post('/api/markers', authMiddleware, (req, res) => {
    const { lat, lng, name, date } = req.body;
    if (lat == null || lng == null) {
        return res.status(400).json({ error: 'lat et lng sont requis' });
    }

    db.run(
        'INSERT INTO markers (user_id, lat, lng, name, date) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, lat, lng, name || null, date || null],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            res.json({
                id: this.lastID,
                user_id: req.user.id,
                lat,
                lng,
                name,
                date
            });
        }
    );
});

app.put('/api/markers/:id', authMiddleware, (req, res) => {
    const markerId = req.params.id;
    const { lat, lng, name, date } = req.body;

    db.run(
        `UPDATE markers
         SET lat = ?, lng = ?, name = ?, date = ?
         WHERE id = ? AND user_id = ?`,
        [lat, lng, name, date, markerId, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            if (this.changes === 0) return res.status(404).json({ error: 'Repère introuvable' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/markers/:id', authMiddleware, (req, res) => {
    const markerId = req.params.id;

    db.run(
        'DELETE FROM markers WHERE id = ? AND user_id = ?',
        [markerId, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            if (this.changes === 0) return res.status(404).json({ error: 'Repère introuvable' });
            res.json({ success: true });
        }
    );
});

// ====== Utilitaire pour récupérer l'IP locale (pour Debian / réseau) ======
function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return null;
}

// ====== Démarrage ======
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

if (!IS_CI) {
    app.listen(PORT, HOST, () => {
        console.log('Serveur démarré en local sur: http://localhost:' + PORT);

        const ip = getLocalIp();
        if (ip) {
            console.log('Accessible depuis un autre appareil sur le même réseau:');
            console.log(`  -> http://${ip}:${PORT}/index.html`);
            console.log(`  -> https://${ip}/index.html`);
        } else {
            console.log("Impossible de détecter l'adresse IP locale. Vérifie 'ip a' sur Debian.");
        }
    });
}

module.exports = app;
