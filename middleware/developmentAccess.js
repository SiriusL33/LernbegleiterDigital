const crypto = require('crypto');
const argon2 = require('argon2');

const CAPTCHA_PATH = '/__development-access/captcha';
const CAPTCHA_TTL_MS = Number(process.env.DEV_ACCESS_CAPTCHA_TTL_MS || 30 * 60 * 1000);
const REALM = String(process.env.DEV_ACCESS_REALM || 'Geschützte Vorschau').replace(/["\\]/g, '');

function noStore(res) {
    res.set({
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
    });
}

function issueCaptcha(req) {
    const left = crypto.randomInt(2, 10);
    const right = crypto.randomInt(2, 10);
    req.session.developmentCaptcha = {
        answerHash: crypto.createHash('sha256').update(String(left + right)).digest('hex'),
        createdAt: Date.now(),
        attempts: 0
    };
    return `${left} + ${right}`;
}

function captchaPage(question, error = '') {
    const safeQuestion = question.replace(/[^0-9+ ]/g, '');
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zugangsschutz · SonoABCD</title><style>color-scheme:dark;*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#071011;color:#dcecea;font-family:system-ui,sans-serif}.card{width:min(100%,420px);padding:32px;border:1px solid #294244;border-radius:24px;background:#0d1b1d;box-shadow:0 24px 70px #0008}small{color:#38d7d2;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:10px 0 8px;font-size:1.55rem}p{color:#93aaa8;line-height:1.55}.challenge{margin:24px 0 12px;padding:20px;border-radius:14px;background:#071011;text-align:center;font:800 1.5rem monospace;letter-spacing:.08em}label{display:block;margin:15px 0 7px;font-size:.85rem;font-weight:700}input,button{width:100%;border-radius:12px;padding:13px 15px;font:inherit}input{border:1px solid #365052;background:#071011;color:#fff}button{margin-top:14px;border:0;background:#38d7d2;color:#061011;font-weight:800;cursor:pointer}.error{color:#fca5a5}</style></head><body><main class="card"><small>Geschützte Entwicklungsvorschau</small><h1>Kurzer Sicherheitscheck</h1><p>Lösen Sie die Aufgabe. Anschließend fragt der Browser nach Benutzername und Passwort.</p>${error ? `<p class="error">${error}</p>` : ''}<div class="challenge" aria-label="Rechenaufgabe">${safeQuestion} = ?</div><form method="post" action="${CAPTCHA_PATH}"><label for="answer">Ergebnis</label><input id="answer" name="answer" inputmode="numeric" pattern="[0-9]+" required autofocus autocomplete="off"><button type="submit">Prüfen und fortfahren</button></form></main></body></html>`;
}

function parseForm(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024) reject(new Error('Formular zu groß'));
        });
        req.on('end', () => resolve(new URLSearchParams(body)));
        req.on('error', reject);
    });
}

function safeEqualHash(actual, expected) {
    const actualBuffer = Buffer.from(actual || '', 'hex');
    const expectedBuffer = Buffer.from(expected || '', 'hex');
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function challengeBasicAuth(res) {
    noStore(res);
    res.set('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`);
    return res.status(401).send('Authentifizierung erforderlich.');
}

function createDevelopmentAccess() {
    const usernameHash = process.env.DEV_ACCESS_USERNAME_HASH;
    const passwordHash = process.env.DEV_ACCESS_PASSWORD_HASH;
    if (!usernameHash || !passwordHash) {
        throw new Error('DEV_ACCESS_ENABLED ist aktiv, aber die Zugangshashes fehlen.');
    }

    return async function developmentAccess(req, res, next) {
        noStore(res);
        const captcha = req.session.developmentCaptcha;
        const captchaValid = captcha?.passedAt && Date.now() - captcha.passedAt < CAPTCHA_TTL_MS;

        if (!captchaValid) {
            if (req.path === CAPTCHA_PATH && req.method === 'POST') {
                try {
                    const form = await parseForm(req);
                    const state = req.session.developmentCaptcha;
                    const submittedHash = crypto.createHash('sha256').update(form.get('answer') || '').digest('hex');
                    const current = state && Date.now() - state.createdAt < 5 * 60 * 1000 && state.attempts < 5;
                    if (current && safeEqualHash(submittedHash, state.answerHash)) {
                        req.session.developmentCaptcha = { passedAt: Date.now() };
                        return req.session.save(() => res.redirect('/'));
                    }
                    const question = issueCaptcha(req);
                    return res.status(403).send(captchaPage(question, 'Die Antwort war nicht korrekt. Bitte erneut versuchen.'));
                } catch {
                    return res.status(400).send('Ungültige Anfrage.');
                }
            }

            const question = issueCaptcha(req);
            return res.status(200).send(captchaPage(question));
        }

        if (req.session.developmentAccessGrantedAt
            && Date.now() - req.session.developmentAccessGrantedAt < CAPTCHA_TTL_MS) {
            return next();
        }

        const authorization = req.get('authorization') || '';
        if (!authorization.startsWith('Basic ')) return challengeBasicAuth(res);

        try {
            const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
            const separator = decoded.indexOf(':');
            if (separator < 0) return challengeBasicAuth(res);
            const username = decoded.slice(0, separator);
            const password = decoded.slice(separator + 1);
            const [validUsername, validPassword] = await Promise.all([
                argon2.verify(usernameHash, username),
                argon2.verify(passwordHash, password)
            ]);
            if (!validUsername || !validPassword) return challengeBasicAuth(res);
            req.session.developmentAccessGrantedAt = Date.now();
            return req.session.save(() => next());
        } catch {
            return challengeBasicAuth(res);
        }
    };
}

module.exports = { createDevelopmentAccess };
