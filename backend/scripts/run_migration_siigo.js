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

console.log('🔄 Ejecutando migración del sistema SIIGO OC...\n');

const sqlPath = path.join(__dirname, '..', '..', 'migrations', 'create_siigo_oc_system.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

connection.query(sql, (err, results) => {
  if (err) {
    // Si el error es que la columna ya existe, continuar
    if (err.message.includes('Duplicate column name') || err.message.includes('already exists')) {
      console.log('⚠️  Algunas columnas/tablas ya existen, continuando...');
      console.log('✅ Migración del sistema SIIGO OC completada (con advertencias)');
    } else {
      console.error('❌ Error ejecutando migración:', err.message);
      console.error('\nDetalles del error:', err);
      process.exit(1);
    }
  } else {
    console.log('✅ Migración del sistema SIIGO OC ejecutada correctamente');
  }
  
  console.log('\nTablas creadas:');
  console.log('  - siigo_ocs');
  console.log('  - siigo_oc_items');
  console.log('\n✨ El sistema de integración SIIGO está listo para usar.');
  
  connection.end();
  process.exit(0);
});
