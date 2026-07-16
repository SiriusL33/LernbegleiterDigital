const sqlite3 = require('sqlite3').verbose();
const argon2 = require('argon2');
const db = new sqlite3.Database('./database.sqlite');

async function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function registerUser(username, password) {
    try {
        const hash = await argon2.hash(password);
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function(dbErr) {
                if (dbErr) return reject(dbErr);
                resolve({ id: this.lastID, username });
            });
        });
    } catch (error) {
        throw error;
    }
}

async function verifyPassword(hash, password) {
    try {
        return await argon2.verify(hash, password);
    } catch (error) {
        return false;
    }
}

module.exports = {
    findUserByUsername,
    registerUser,
    verifyPassword
};
