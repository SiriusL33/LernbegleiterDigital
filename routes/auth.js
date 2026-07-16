const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authRateLimiter, enforceLoginBackoff, registerLoginFailure, resetLoginFailure } = require('../middleware/auth');
const { ensureCsrfToken, requireCsrfToken, sendError } = require('../middleware/csrf');
const { SESSION_COOKIE_NAME, IS_PRODUCTION } = require('../config/constants');
    router.use(ensureCsrfToken);

// Helper to create session (moved from server.js)
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

// @route   GET /api/me
router.get('/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// @route   GET /api/csrf-token
router.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});

// @route   POST /api/login
router.post('/login', authRateLimiter, requireCsrfToken, enforceLoginBackoff, async (req, res) => {
    const { username, password } = req.body;
    const invalidLoginMessage = 'Ungültiger Benutzername oder Passwort.';

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        registerLoginFailure(req);
        return sendError(res, 401, invalidLoginMessage);
    }

    try {
        const user = await userService.findUserByUsername(username);
        if (!user) {
            registerLoginFailure(req);
            return sendError(res, 401, invalidLoginMessage);
        }

        const isMatch = await userService.verifyPassword(user.password_hash, password);
        if (!isMatch) {
            registerLoginFailure(req);
            return sendError(res, 401, invalidLoginMessage);
        }

        resetLoginFailure(req);
        return createSessionForUser(req, user, res);
    } catch (error) {
        return sendError(res, 500, 'Fehler beim Login');
    }
});

// @route   POST /api/register
router.post('/register', authRateLimiter, requireCsrfToken, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return sendError(res, 400, 'Ungültige Eingaben.');
    }

    try {
        const existingUser = await userService.findUserByUsername(username);
        if (existingUser) return sendError(res, 400, 'Ungültige Eingaben.');

        const user = await userService.registerUser(username, password);
        return createSessionForUser(req, user, res);
    } catch (error) {
        return sendError(res, 500, 'Fehler bei der Registrierung');
    }
});

// @route   POST /api/logout
router.post('/logout', authRateLimiter, requireCsrfToken, (req, res) => {
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

module.exports = router;
