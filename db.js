const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./text_classification.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        originalText TEXT NOT NULL,
        classification TEXT NOT NULL
    )`);
});
module.exports = db;