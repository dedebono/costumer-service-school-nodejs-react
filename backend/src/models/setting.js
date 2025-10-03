const { db } = require('./db');

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    if (!key || value === undefined) {
      return reject(new Error('Key and value are required'));
    }
    db.run(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, String(value)],
      function (err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings ORDER BY key', [], (err, rows) => {
      if (err) reject(err);
      else {
        const settings = {};
        rows.forEach(row => {
          settings[row.key] = row.value;
        });
        resolve(settings);
      }
    });
  });
}

function deleteSetting(key) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM settings WHERE key = ?', [key], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = {
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
};
