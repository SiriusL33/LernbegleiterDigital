require('dotenv').config();

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const { PORT, HOST, SESSION_COOKIE_NAME, NODE_ENV, IS_PRODUCTION, SESSION_MAX_AGE_MS } = require('./config/constants');

const app = express();
if (IS_PRODUCTION) app.set('trust proxy', 1);

// Database connection
const db = new sqlite3.Database('./database.sqlite');

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
    throw new Error('SESSION_SECRET muss gesetzt sein.');
}

// Middleware
app.use(express.json());
app.use(session({
    name: SESSION_COOKIE_NAME,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_MS,
        path: '/'
    }
}));

// TEMPORÄRER ENTWICKLUNGSZUGANG – als Block zusammen mit
// middleware/developmentAccess.js nach Ende der Vorschau leicht entfernbar.
if (process.env.DEV_ACCESS_ENABLED === 'true') {
    const { createDevelopmentAccess } = require('./middleware/developmentAccess');
    app.use(createDevelopmentAccess());
}

// Import Routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// WBT Data Route (Simple for now, can be moved to routes/wbt.js later)
const wbtService = require('./services/wbtService');
app.get('/api/wbts', (req, res) => {
    wbtService.getAllWbts()
        .then(data => res.json(data))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'Datenbankfehler' });
        });
});

// Public files only. Do not expose database.sqlite, .env or server source files.
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Start Server
app.listen(PORT, HOST, () => {
    console.log('\n🔓 Klartext Medizin (Open Access Edition) läuft!');
    console.log(`👉 Klicke hier (Strg+Klick): http://localhost:${PORT}\n`);
});
