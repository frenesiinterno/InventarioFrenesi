const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventario_frenesi',
    port: process.env.DB_PORT || 3306
  };

  const connection = await mysql.createConnection(dbConfig);
  try {
    const [provCols] = await connection.execute("SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='proveedores'");
    console.log('proveedores:', provCols);

    const [movCols] = await connection.execute("SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movimientos_inventario'");
    console.log('movimientos_inventario:', movCols);

    const [comprasCols] = await connection.execute("SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='compras'");
    console.log('compras:', comprasCols);

  } catch (err) {
    console.error('Error querying information_schema:', err.message);
  } finally {
    await connection.end();
  }
})();