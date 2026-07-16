const { 
    AUTH_RATE_LIMIT_WINDOW_MS, 
    AUTH_RATE_LIMIT_MAX, 
    LOGIN_LOCKOUT_BASE_MS, 
    LOGIN_LOCKOUT_MAX_MS, 
    LOGIN_LOCKOUT_THRESHOLD 
} = require('../config/constants');

const authRateLimitStore = new Map();
const loginAttemptsStore = new Map();

function getAuthKey(req) {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'unknown';
    return `${req.ip}|${username}`;
}

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

// Helper to be used by middleware
function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

module.exports = {
    authRateLimiter,
    enforceLoginBackoff,
    registerLoginFailure,
    resetLoginFailure,
    getAuthKey,
    sendError
};
