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

async function verify() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('=== VERIFICANDO IMPORTACIÓN ===\n');
    
    // 1. Buscar el producto específico
    const [productos] = await connection.execute(
      "SELECT id, nombre FROM productos WHERE nombre LIKE '%ENTERIZO MANGA LARGA LICRA CORTA SIN COSTURAS MUJER%'"
    );
    
    if (productos.length === 0) {
      console.error('❌ No se encontró el producto');
      return;
    }
    
    const producto = productos[0];
    console.log(`Producto encontrado: ${producto.nombre} (ID: ${producto.id})`);
    
    // 2. Obtener fichas técnicas y calcular total
    const [fichas] = await connection.execute(`
      SELECT 
        mp.nombre as materia,
        ft.cantidad,
        ft.precio_unitario,
        (ft.cantidad * ft.precio_unitario) as subtotal
      FROM fichas_tecnicas ft
      JOIN materia_prima mp ON ft.materia_prima_id = mp.id
      WHERE ft.producto_id = ?
    `, [producto.id]);
    
    console.log('\n--- Detalle de Costos ---');
    let total = 0;
    fichas.forEach(f => {
      const subtotal = parseFloat(f.subtotal);
      total += subtotal;
      console.log(`${f.materia}: ${f.cantidad} x $${f.precio_unitario} = $${subtotal.toFixed(2)}`);
    });
    
    console.log(`\nTOTAL EN BASE DE DATOS: $${total.toFixed(2)}`);
    console.log(`TOTAL ESPERADO (EXCEL): $92,119.77`);
    
    const diff = Math.abs(total - 92119.77);
    if (diff < 1) {
      console.log('\n✅ VERIFICACIÓN EXITOSA: El total coincide.');
    } else {
      console.log('\n❌ VERIFICACIÓN FALLIDA: Hay una diferencia de $' + diff.toFixed(2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

verify();
