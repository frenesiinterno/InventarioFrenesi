const db = require('../database/db');

(async () => {
  try {
    const [descMp] = await db.execute('DESCRIBE materias_primas');
    console.log('materias_primas columns:', descMp.map(r=>r.Field));
    const [descUm] = await db.execute('DESCRIBE unidades_medida');
    console.log('unidades_medida columns:', descUm.map(r=>r.Field));
    const [descOp] = await db.execute("DESCRIBE ordenes_produccion");
    console.log('ordenes_produccion columns:', descOp.map(r=>r.Field));
    const [descC] = await db.execute("DESCRIBE compras");
    console.log('compras columns:', descC.map(r=>r.Field));
    const [descP] = await db.execute("DESCRIBE proveedores");
    console.log('proveedores columns:', descP.map(r=>r.Field));
  } catch (err) {
    console.error('ERR:', err.message);
  }
  process.exit(0);
})();