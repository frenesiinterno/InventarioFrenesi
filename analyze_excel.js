const XLSX = require('xlsx');
const fs = require('fs');

// Leer el archivo Excel
const workbook = XLSX.readFile('FICHA TECNICA MODULO PRODUCCION.xlsx');
const worksheet = workbook.Sheets['fichas tecnicas'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Buscar la prenda específica y todas sus materias primas
const nombrePrenda = 'ENTERIZO MANGA LARGA LICRA CORTA SIN COSTURAS MUJER';
let encontrado = false;
const materiasPrima = [];
let totalCalculado = 0;

console.log(`=== FICHA TÉCNICA: ${nombrePrenda} ===\n`);

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  
  // Encontramos la prenda
  if (row[0] === nombrePrenda) {
    encontrado = true;
    console.log(`Encontrado en fila ${i + 1}\n`);
  }
  
  // Si ya encontramos la prenda, recolectar materias primas
  if (encontrado) {
    // Si llegamos a una fila de Total, terminamos
    if (row[0] && row[0].toString().startsWith('Total')) {
      console.log(`\n=== TOTAL EN EXCEL ===`);
      console.log(`Cantidad Total: ${row[4]}`);
      console.log(`Precio Total (Excel): $${row[5]}`);
      break;
    }
    
    // Si tiene materia prima (columna 2)
    if (row[2]) {
      const materia = {
        tipo: row[1] || 'N/A',
        nombre: row[2],
        unidad: row[3],
        cantidad: row[4] || 0,
        precioUnitario: row[5] || 0,
        subtotal: (row[4] || 0) * (row[5] || 0)
      };
      
      materiasPrima.push(materia);
      totalCalculado += materia.subtotal;
      
      console.log(`${materiasPrima.length}. ${materia.nombre}`);
      console.log(`   Tipo: ${materia.tipo}`);
      console.log(`   Cantidad: ${materia.cantidad} ${materia.unidad}`);
      console.log(`   Precio Unitario: $${materia.precioUnitario.toFixed(2)}`);
      console.log(`   Subtotal: $${materia.subtotal.toFixed(2)}`);
      console.log('');
    }
  }
}

console.log(`\n=== TOTAL CALCULADO ===`);
console.log(`Total de materias primas: ${materiasPrima.length}`);
console.log(`Precio Total Calculado: $${totalCalculado.toFixed(2)}`);

// Guardar detalles
fs.writeFileSync('enterizo_detalle.json', JSON.stringify({
  nombre: nombrePrenda,
  materias: materiasPrima,
  totalCalculado: totalCalculado
}, null, 2));

console.log('\n\nDetalles guardados en: enterizo_detalle.json');

// Ahora verificar qué hay en la base de datos
console.log('\n\n=== VERIFICANDO BASE DE DATOS ===');
console.log('Ejecutar query para comparar...\n');
