/*
 * Klartext Medizin - Security Migration
 * Erstellt die Nutzer-Tabellen und einen initialen Admin mit Argon2-Hash.
 */

const sqlite3 = require('sqlite3').verbose();
const argon2 = require('argon2');

const db = new sqlite3.Database('./database.sqlite');

async function runMigration() {
    console.log("🔒 Starte Security-Migration...");

    db.serialize(() => {
        // 1. Tabelle für die Benutzer erstellen
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'user'
        )`);

        // 2. Tabelle für den Lernfortschritt erstellen
        db.run(`CREATE TABLE IF NOT EXISTS user_progress (
            user_id INTEGER,
            wbt_id TEXT,
            status TEXT,        -- z.B. 'started', 'completed'
            progress INTEGER,   -- in Prozent (0-100)
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
    });

    // 3. Einen Test-Nutzer mit sicherem Argon2-Hash anlegen
    const testUser = "admin";
    const testPassword = "ChangeMe123!"; // Das Passwort im Klartext (nur für uns hier)

    try {
        // Hier passiert die Magie: Argon2 verschlüsselt das Passwort
        const hash = await argon2.hash(testPassword);

        // Wir fügen den Nutzer ein (IGNORE verhindert Fehler, falls das Skript 2x läuft)
        db.run(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`, 
            [testUser, hash, 'admin'], 
            (err) => {
                if (err) {
                    console.error("❌ Fehler beim Einfügen:", err.message);
                } else {
                    console.log('✅ Migration erfolgreich!');
                    console.log(`👤 Test-User angelegt -> Benutzer: ${testUser} | Passwort: ${testPassword}`);
                }
                db.close();
            }
        );
    } catch (err) {
        console.error("❌ Fehler beim Hashing:", err);
        db.close();
    }
}

runMigration();