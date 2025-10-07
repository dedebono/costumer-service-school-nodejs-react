const { db } = require('./db');

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.query('SELECT value FROM settings WHERE `key` = ?', [key], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] ? results[0].value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    if (!key || value === undefined) {
      return reject(new Error('Key and value are required'));
    }
    db.query(
      'INSERT INTO settings (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
      [key, String(value)],
      (err, result) => {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.query('SELECT `key`, value FROM settings ORDER BY `key`', [], (err, results) => {
      if (err) reject(err);
      else {
        const settings = {};
        results.forEach(row => {
          settings[row.key] = row.value;
        });
        resolve(settings);
      }
    });
  });
}

function deleteSetting(key) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM settings WHERE `key` = ?', [key], (err, result) => {
      if (err) reject(err);
      else resolve(result.affectedRows);
    });
  });
}

module.exports = {
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
};
