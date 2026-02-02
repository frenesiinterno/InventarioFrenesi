/**
 * Migración: OP como documento padre
 * - ordenes_produccion: origen_pdf, total_costo_mp, pdf_ruta
 * - orden_produccion_consumo_mp: trazabilidad PEPS por item
 */

const db = require('../database/db');

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function run() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log('🚀 Migración: OP como documento padre\n');

    const table = 'ordenes_produccion';
    for (const { col, def } of [
      { col: 'origen_pdf', def: "ADD COLUMN origen_pdf VARCHAR(500) NULL COMMENT 'PDF origen' AFTER observaciones" },
      { col: 'total_costo_mp', def: "ADD COLUMN total_costo_mp DECIMAL(14, 4) NULL COMMENT 'Total costo MP' AFTER cantidad_producir" },
      { col: 'pdf_ruta', def: "ADD COLUMN pdf_ruta VARCHAR(500) NULL COMMENT 'PDF costeado' AFTER origen_pdf" }
    ]) {
      if (await columnExists(connection, table, col)) {
        console.log(`⏭ Columna ${table}.${col} ya existe`);
      } else {
        await connection.execute(`ALTER TABLE ${table} ${def}`);
        console.log(`✓ Agregada ${table}.${col}`);
      }
    }

    console.log('\n📝 Creando tabla orden_produccion_consumo_mp...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orden_produccion_consumo_mp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orden_produccion_item_id INT NOT NULL,
        materia_prima_id INT NOT NULL,
        cantidad_consumida DECIMAL(14, 4) NOT NULL,
        costo_unitario_peps DECIMAL(14, 4) NOT NULL DEFAULT 0,
        costo_total DECIMAL(14, 4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_consumo_op_item (orden_produccion_item_id),
        INDEX idx_consumo_materia (materia_prima_id),
        FOREIGN KEY (orden_produccion_item_id) REFERENCES op_items(id) ON DELETE CASCADE,
        FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('✓ Tabla orden_produccion_consumo_mp lista\n');

    await connection.commit();
    console.log('✅ Migración completada.');
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

run();
