const db = require('../database/db');

(async () => {
  try {
    const [rows] = await db.execute("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kardex'");
    console.log('kardex exists:', rows[0].cnt);

    // try a simple select from kardex to see actual error
    try {
      const [k] = await db.execute('SELECT * FROM kardex LIMIT 1');
      console.log('kardex row sample:', k[0] || null);
    } catch (err) {
      console.error('select kardex error:', err.message);
    }

    // Check that lotes_materia_prima exists
    const [rows2] = await db.execute("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lotes_materia_prima'");
    console.log('lotes_materia_prima exists:', rows2[0].cnt);
  } catch (err) {
    console.error('ERR:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();