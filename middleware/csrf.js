const crypto = require('crypto');
const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, IS_PRODUCTION, SESSION_MAX_AGE_MS } = require('../config/constants');

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

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

module.exports = {
    ensureCsrfToken,
    requireCsrfToken,
    sendError
};
