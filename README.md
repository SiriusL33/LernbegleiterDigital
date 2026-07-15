# WBT Companion

## Security Configuration

Die folgenden Umgebungsvariablen steuern Session-, CSRF- und Auth-Sicherheit:

- `SESSION_SECRET` (**Pflicht**): Kommagetrennte Liste mit mindestens einem Secret für `express-session`.
  - Beispiel Rotation: `SESSION_SECRET="new_secret,old_secret"`
  - Das erste Secret wird zum Signieren neuer Cookies verwendet, nachfolgende Secrets validieren alte Cookies.
- `NODE_ENV`: Bei `production` werden Cookies mit `secure: true` gesetzt.
- `SESSION_COOKIE_NAME` (optional, Default `connect.sid`): Name des Session-Cookies.
- `SESSION_MAX_AGE_MS` (optional, Default `28800000`): Session-Laufzeit in Millisekunden.
- `CSRF_COOKIE_NAME` (optional, Default `csrf-token`): Name des CSRF-Cookies.
- `AUTH_RATE_LIMIT_WINDOW_MS` (optional, Default `900000`): Zeitfenster für Auth-Rate-Limit in Millisekunden.
- `AUTH_RATE_LIMIT_MAX` (optional, Default `20`): Max. Auth-Anfragen pro `IP + Username` innerhalb des Fensters.
- `LOGIN_LOCKOUT_THRESHOLD` (optional, Default `5`): Anzahl fehlgeschlagener Logins bis Backoff aktiv wird.
- `LOGIN_LOCKOUT_BASE_MS` (optional, Default `1000`): Startdauer des Backoff in Millisekunden.
- `LOGIN_LOCKOUT_MAX_MS` (optional, Default `300000`): Obergrenze des exponentiellen Backoff in Millisekunden.

### Hinweise für Deployments

1. Ohne `SESSION_SECRET` startet der Server nicht.
2. Für mutierende Auth-Endpoints (`/api/login`, `/api/register`, `/api/logout`) muss ein passender CSRF-Header `x-csrf-token` gesendet werden.
3. Beim Logout wird die Session serverseitig zerstört und der Cookie mit denselben Sicherheits-Flags gelöscht.
