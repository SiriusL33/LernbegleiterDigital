/*
 * Login-Seite deaktiviert — Weiterleitung zur Startseite
 * Diese Datei bleibt vorhanden, führt aber keine Auth-Interaktion aus.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Kurz warten und dann hart zur Startseite
    setTimeout(() => {
        try { window.location.replace('/'); } catch(e) { location.href = '/'; }
    }, 250);
});