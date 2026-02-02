const db = require('./backend/database/db');

async function checkData() {
  console.log('--- Checking Inventory Value ---');
  const [materias] = await db.execute('SELECT nombre, stock_actual, precio_unitario FROM materia_prima WHERE stock_actual > 0');
  
  let totalCalculado = 0;
  let countWithPrice = 0;
  let countZeroPrice = 0;

  console.log(`Found ${materias.length} materias with stock > 0`);
  
  materias.forEach(m => {
    const val = parseFloat(m.stock_actual) * parseFloat(m.precio_unitario);
    totalCalculado += val;
    if (parseFloat(m.precio_unitario) > 0) countWithPrice++;
    else countZeroPrice++;
    
    // Print a few examples
    if (Math.random() < 0.05) {
       console.log(`Sample: ${m.nombre} | Stock: ${m.stock_actual} | Precio: ${m.precio_unitario} | Total: ${val}`);
    }
  });

  console.log(`Total Inventory Value Calculated: ${totalCalculado.toLocaleString('es-CO')}`);
  console.log(`Items with Price > 0: ${countWithPrice}`);
  console.log(`Items with Price = 0: ${countZeroPrice}`);


  console.log('\n--- Checking Top Costly Products ---');
  const query = `
      SELECT p.nombre, SUM(ft.cantidad * ft.precio_unitario) as costo
      FROM productos p
      JOIN fichas_tecnicas ft ON p.id = ft.producto_id
      WHERE p.activo = 1
      GROUP BY p.id, p.nombre
      ORDER BY costo DESC
      LIMIT 10
    `;
  const [costosos] = await db.execute(query);
  console.log('Top 10 Costosos Results:');
  console.table(costosos);

  process.exit();
}

checkData();
