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

## Zeitlich begrenzte Entwicklungsvorschau

Der optionale Vorschauzugang liegt vollständig in `middleware/developmentAccess.js` und dem direkt markierten Block in `server.js`. Er zeigt zuerst eine Rechenaufgabe und löst danach den nativen HTTP-Basic-Auth-Dialog des Browsers aus.

### Lokale Konfiguration

1. `.env.example` als `.env` kopieren. `.env` ist durch `.gitignore` ausgeschlossen.
2. `DEV_ACCESS_ENABLED=true` setzen.
3. Benutzername und Passwort getrennt mit Argon2id hashen; nur die Hashes in `.env` ablegen:

   ```bash
   node -e "require('argon2').hash(process.argv[1],{type:require('argon2').argon2id}).then(console.log)" 'WERT_HIER_EINGEBEN'
   ```

4. Die Resultate als `DEV_ACCESS_USERNAME_HASH` und `DEV_ACCESS_PASSWORD_HASH` eintragen.
5. Anwendung neu starten. Ein laufender Node-Prozess übernimmt Änderungen an `.env` nicht automatisch.

Hashes verhindern Klartext-Zugangsdaten im Repository. Sie ersetzen weder TLS noch starke, individuelle Passwörter. Dieser Zugang ist nur für eine kurzfristige Entwicklungsvorschau vorgesehen.

### Eigener Cloudflare Tunnel

Im Cloudflare-Dashboard unter **Zero Trust → Networks → Tunnels** einen benannten Tunnel anlegen, die eigene Subdomain als Public Hostname konfigurieren und als Service `http://localhost:3000` setzen. Auf dem Server anschließend den angezeigten Connector starten:

```bash
cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN"
```

`CLOUDFLARE_TUNNEL_TOKEN` ausschließlich im Secret Store oder in der geschützten Service-Umgebung des Servers ablegen. Der Express-Port muss nicht öffentlich in der Firewall geöffnet werden; `cloudflared` baut die Verbindung ausgehend auf.

### Vollständige Entfernung nach der Vorschau

1. `DEV_ACCESS_ENABLED=false` setzen.
2. Den markierten Entwicklungszugangsblock aus `server.js` entfernen.
3. `middleware/developmentAccess.js` löschen.
4. `DEV_ACCESS_*` aus der Serverumgebung entfernen und den Cloudflare Tunnel deaktivieren.

Die reguläre Anwendung bleibt davon unberührt.
