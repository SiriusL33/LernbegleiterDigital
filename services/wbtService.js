const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

async function getAllWbts() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM wbts', [], (err, rows) => {
            if (err) return reject(err);
            const formattedRows = rows.map((row) => ({
                ...row,
                tags: JSON.parse(row.tags),
                featured: row.featured === 1
            }));
            resolve(formattedRows);
        });
    });
}

module.exports = {
    getAllWbts
};
