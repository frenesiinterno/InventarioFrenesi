const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_frenesi',
  port: process.env.DB_PORT || 3306
};

async function checkPrices() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('=== VERIFICACIÓN DE PRECIOS MATERIA PRIMA ===\n');
    const [rows] = await connection.execute('SELECT nombre, precio_unitario FROM materia_prima LIMIT 20');
    
    rows.forEach(r => {
      console.log(`${r.nombre}: $${parseFloat(r.precio_unitario).toFixed(2)}`);
    });
  } catch(e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

checkPrices();
