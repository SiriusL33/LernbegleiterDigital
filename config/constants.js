const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
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

module.exports = {
    PORT,
    HOST,
    SESSION_COOKIE_NAME,
    NODE_ENV,
    IS_PRODUCTION,
    SESSION_MAX_AGE_MS,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX,
    LOGIN_LOCKOUT_BASE_MS,
    LOGIN_LOCKOUT_MAX_MS,
    LOGIN_LOCKOUT_THRESHOLD
};
