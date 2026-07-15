/*
 * Klartext Medizin - Backend Server (Open Access Edition)
 */

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const argon2 = require('argon2');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database('./database.sqlite');

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'connect.sid';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 8);
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
const LOGIN_LOCKOUT_BASE_MS = Number(process.env.LOGIN_LOCKOUT_BASE_MS || 1000);
const LOGIN_LOCKOUT_MAX_MS = Number(process.env.LOGIN_LOCKOUT_MAX_MS || 5 * 60 * 1000);
const LOGIN_LOCKOUT_THRESHOLD = Number(process.env.LOGIN_LOCKOUT_THRESHOLD || 5);

const sessionSecrets = (process.env.SESSION_SECRET || '')
    .split(',')
    .map((secret) => secret.trim())
    .filter(Boolean);

if (sessionSecrets.length === 0) {
    throw new Error('SESSION_SECRET fehlt. Bitte mindestens ein Secret setzen.');
}

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

app.use(express.json());

function readCookies(req) {
    const rawCookies = req.headers.cookie;
    if (!rawCookies) return {};

    return rawCookies.split(';').reduce((acc, cookieValue) => {
        const separatorIdx = cookieValue.indexOf('=');
        if (separatorIdx < 0) return acc;

        const key = cookieValue.slice(0, separatorIdx).trim();
        const value = cookieValue.slice(separatorIdx + 1).trim();
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

function setCsrfCookie(res, token) {
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_MS,
        path: '/'
    });
}

function ensureCsrfToken(req, res, next) {
    const cookies = readCookies(req);
    const existingToken = cookies[CSRF_COOKIE_NAME];

    if (existingToken) {
        req.csrfToken = existingToken;
        return next();
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    req.csrfToken = newToken;
    setCsrfCookie(res, newToken);
    next();
}

function requireCsrfToken(req, res, next) {
    const cookies = readCookies(req);
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken) {
        return sendError(res, 403, 'Ungültige Anfrage. Bitte erneut versuchen.');
    }

    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        return sendError(res, 403, 'Ungültige Anfrage. Bitte erneut versuchen.');
    }

    return next();
}

function validateUsername(username) {
    const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
    const USERNAME_MIN = 3;
    const USERNAME_MAX = 32;

    if (typeof username !== 'string') return false;
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return false;
    return USERNAME_REGEX.test(username);
}

function validatePassword(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 10 || password.length > 128) return false;

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    return hasUpper && hasLower && hasNumber && hasSpecial;
}

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

function getAuthKey(req) {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'unknown';
    return `${req.ip}|${username}`;
}

const authRateLimitStore = new Map();
const loginAttemptsStore = new Map();

function authRateLimiter(req, res, next) {
    const now = Date.now();
    const key = getAuthKey(req);
    const entry = authRateLimitStore.get(key) || { count: 0, firstRequestTs: now };

    if (now - entry.firstRequestTs > AUTH_RATE_LIMIT_WINDOW_MS) {
        entry.count = 0;
        entry.firstRequestTs = now;
    }

    entry.count += 1;
    authRateLimitStore.set(key, entry);

    if (entry.count > AUTH_RATE_LIMIT_MAX) {
        return sendError(res, 429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
    }

    return next();
}

function enforceLoginBackoff(req, res, next) {
    const key = getAuthKey(req);
    const now = Date.now();
    const state = loginAttemptsStore.get(key);

    if (!state || !state.lockUntil || state.lockUntil <= now) {
        return next();
    }

    const retryAfterSec = Math.ceil((state.lockUntil - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return sendError(res, 429, 'Zu viele fehlgeschlagene Login-Versuche. Bitte später erneut versuchen.');
}

function registerLoginFailure(req) {
    const key = getAuthKey(req);
    const now = Date.now();
    const state = loginAttemptsStore.get(key) || { failures: 0, lockUntil: 0 };

    state.failures += 1;
    if (state.failures >= LOGIN_LOCKOUT_THRESHOLD) {
        const exponent = state.failures - LOGIN_LOCKOUT_THRESHOLD;
        const lockMs = Math.min(LOGIN_LOCKOUT_BASE_MS * (2 ** exponent), LOGIN_LOCKOUT_MAX_MS);
        state.lockUntil = now + lockMs;
    }

    loginAttemptsStore.set(key, state);
}

function resetLoginFailure(req) {
    loginAttemptsStore.delete(getAuthKey(req));
}

function createSessionForUser(req, user, res) {
    req.session.regenerate((sessionError) => {
        if (sessionError) {
            return sendError(res, 500, 'Sitzung konnte nicht erstellt werden.');
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.save((saveError) => {
            if (saveError) {
                return sendError(res, 500, 'Sitzung konnte nicht gespeichert werden.');
            }

            return res.json({ success: true, message: 'Erfolgreich angemeldet.' });
        });
    });
}

// ==========================================
// 🔒 Session-Management
// ==========================================
app.use(session({
    name: SESSION_COOKIE_NAME,
    secret: sessionSecrets,
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
app.use(ensureCsrfToken);

// ==========================================
// 🧑 ROUTE: Wer bin ich? (Profil-Check)
// ==========================================
app.get('/api/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});

// ==========================================
// 🔑 ROUTE: Login
// ==========================================
app.post('/api/login', authRateLimiter, requireCsrfToken, enforceLoginBackoff, (req, res) => {
    const { username, password } = req.body;
    const invalidLoginMessage = 'Ungültiger Benutzername oder Passwort.';

    if (!validateUsername(username) || typeof password !== 'string') {
        registerLoginFailure(req);
        return sendError(res, 401, invalidLoginMessage);
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return sendError(res, 500, 'Datenbankfehler');
        if (!user) {
            registerLoginFailure(req);
            return sendError(res, 401, invalidLoginMessage);
        }

        try {
            const isMatch = await argon2.verify(user.password_hash, password);
            if (!isMatch) {
                registerLoginFailure(req);
                return sendError(res, 401, invalidLoginMessage);
            }

            resetLoginFailure(req);
            return createSessionForUser(req, user, res);
        } catch (error) {
            return sendError(res, 500, 'Kryptographie-Fehler beim Login');
        }
    });
});

// ==========================================
// 📝 ROUTE: Registrierung
// ==========================================
app.post('/api/register', authRateLimiter, requireCsrfToken, async (req, res) => {
    const { username, password } = req.body;

    if (!validateUsername(username) || !validatePassword(password)) {
        return sendError(res, 400, 'Ungültige Eingaben.');
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) return sendError(res, 500, 'Datenbankfehler');
        if (row) return sendError(res, 400, 'Ungültige Eingaben.');

        try {
            const hash = await argon2.hash(password);

            db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function(dbErr) {
                if (dbErr) return sendError(res, 500, 'Fehler beim Anlegen des Benutzers.');

                return createSessionForUser(req, { id: this.lastID, username }, res);
            });
        } catch (error) {
            return sendError(res, 500, 'Kryptographie-Fehler bei Registrierung');
        }
    });
});

// ==========================================
// 🚪 ROUTE: Logout (Echtes Abmelden)
// ==========================================
app.post('/api/logout', authRateLimiter, requireCsrfToken, (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie(SESSION_COOKIE_NAME, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            path: '/'
        });

        if (err) {
            return sendError(res, 500, 'Logout fehlgeschlagen.');
        }

        return res.json({ success: true });
    });
});

// ==========================================
// 📦 ROUTE: WBT-Daten (Für alle offen!)
// ==========================================
app.get('/api/wbts', (req, res) => {
    db.all('SELECT * FROM wbts', [], (err, rows) => {
        if (err) return sendError(res, 500, 'Datenbankfehler');

        const formattedRows = rows.map((row) => ({
            ...row,
            tags: JSON.parse(row.tags),
            featured: row.featured === 1
        }));
        res.json(formattedRows);
    });
});

// ==========================================
// 🌐 STATISCHE DATEIEN (BARRIEREFREI)
// ==========================================
// Das hier fixt den Startseiten-Error. Der Server liefert alle HTML/JS/CSS-Dateien
// völlig automatisch genau so aus, wie sie im Ordner liegen. Keine fehlenden Pfade mehr!
app.use(express.static(__dirname));


// Server starten
app.listen(PORT, () => {
    console.log('\n🔓 Klartext Medizin (Open Access Edition) läuft!');
    console.log(`👉 Klicke hier (Strg+Klick): http://localhost:${PORT}\n`);
});
