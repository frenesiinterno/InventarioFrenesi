const db = require('../database/db');

(async () => {
  try {
    const [exists] = await db.execute("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas'");
    console.log('alertas exists:', exists[0].cnt);
    if (exists[0].cnt) {
      const [desc] = await db.execute('DESCRIBE alertas');
      console.log('alertas columns:', desc.map(r=>r.Field));
    }
  } catch (err) {
    console.error('ERR:', err.message);
  }
  process.exit(0);
})();