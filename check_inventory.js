const db = require('./backend/database/db');

async function checkInventory() {
  console.log('--- Checking Inventory Value ---');
  const [materias] = await db.execute('SELECT nombre, stock_actual, precio_unitario FROM materia_prima WHERE stock_actual > 0');
  
  let totalCalculado = 0;
  let countWithPrice = 0;
  let countZeroPrice = 0;

  console.log(`Found ${materias.length} materias with stock > 0`);
  
  materias.forEach(m => {
    const val = parseFloat(m.stock_actual) * parseFloat(m.precio_unitario);
    totalCalculado += val;
    if (parseFloat(m.precio_unitario) > 0) {
      countWithPrice++;
    } else {
      countZeroPrice++;
      if (countZeroPrice <= 5) {
         console.log(`Zero Price Sample: ${m.nombre} (Stock: ${m.stock_actual})`);
      }
    }
  });

  console.log(`Total Inventory Value Calculated: ${totalCalculado.toLocaleString('es-CO')}`);
  console.log(`Items with Price > 0: ${countWithPrice}`);
  console.log(`Items with Price = 0: ${countZeroPrice}`);
  
  process.exit();
}

checkInventory();
