/*
 * Klartext Medizin - Datenbank-Migration
 * Wandelt die wbts.json in eine relationale SQLite-Datenbank um.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 1. Verbindung zur Datenbankdatei herstellen (wird automatisch erstellt!)
const db = new sqlite3.Database('./database.sqlite');

// 2. WBT-Daten aus der JSON-Datei einlesen
const rawData = fs.readFileSync('./data/wbts.json', 'utf8');
const wbts = JSON.parse(rawData);

db.serialize(() => {
    // 3. Tabelle erstellen
    db.run(`CREATE TABLE IF NOT EXISTS wbts (
        id TEXT PRIMARY KEY,
        title TEXT,
        subtitle TEXT,
        description TEXT,
        thumbnail TEXT,
        themeColor TEXT,
        format TEXT,
        duration TEXT,
        xp INTEGER,
        tags TEXT,
        link TEXT,
        featured BOOLEAN
    )`);

    // 4. Vorhandene Daten löschen (falls du das Skript mal doppelt ausführst)
    db.run(`DELETE FROM wbts`);

    // 5. Daten einfügen (Prepared Statement für maximale Sicherheit)
    const stmt = db.prepare(`INSERT INTO wbts (id, title, subtitle, description, thumbnail, themeColor, format, duration, xp, tags, link, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    wbts.forEach(wbt => {
        // Arrays und Booleans müssen für SQLite in Text/Zahlen gewandelt werden
        stmt.run(
            wbt.id, wbt.title, wbt.subtitle, wbt.description,
            wbt.thumbnail, wbt.themeColor, wbt.format, wbt.duration,
            wbt.xp, JSON.stringify(wbt.tags), wbt.link, wbt.featured ? 1 : 0
        );
    });

    stmt.finalize();
    console.log('✅ Migration erfolgreich! Alle WBTs wurden in die SQLite-Datenbank geschrieben.');
});

db.close();