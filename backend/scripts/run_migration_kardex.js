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

const baseSqlPath = path.join(__dirname, '..', '..', 'migrations', 'create_kardex_system.sql');
const extraSqlPath = path.join(__dirname, '..', '..', 'migrations', '20260203_create_kardex_table.sql');
let sql = '';
if (fs.existsSync(baseSqlPath)) {
  sql += fs.readFileSync(baseSqlPath, 'utf8') + '\n';
}
if (fs.existsSync(extraSqlPath)) {
  sql += fs.readFileSync(extraSqlPath, 'utf8') + '\n';
}

connection.query(sql, (err, results) => {
  if (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    console.error('\nDetalles del error:', err);
    process.exit(1);
  }
  
  console.log('✅ Migración del Kardex ejecutada correctamente');
  console.log('\nTablas creadas o verificadas:');
  console.log('  - kardex');
  console.log('  - lotes_materia_prima (verificar existencia)');
  console.log('\n✨ El sistema de Kardex está listo para usar.');
  
  connection.end();
  process.exit(0);
});

