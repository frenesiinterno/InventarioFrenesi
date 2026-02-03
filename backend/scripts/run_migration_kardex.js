const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_frenesi',
  multipleStatements: true
});

console.log('🔄 Ejecutando migración del sistema de Kardex...\n');

const sqlPath = path.join(__dirname, '..', '..', 'migrations', 'create_kardex_system.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

connection.query(sql, (err, results) => {
  if (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    console.error('\nDetalles del error:', err);
    process.exit(1);
  }
  
  console.log('✅ Migración del Kardex ejecutada correctamente');
  console.log('\nTablas creadas:');
  console.log('  - kardex_movimientos');
  console.log('  - kardex_capas');
  console.log('\n✨ El sistema de Kardex está listo para usar.');
  
  connection.end();
  process.exit(0);
});

