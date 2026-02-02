const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_frenesi'
};

// Función para normalizar nombres (quitar espacios extras, convertir a mayúsculas)
function normalizarNombre(nombre) {
  if (!nombre) return '';
  return nombre.toString().trim().toUpperCase();
}

// Función principal de importación
async function importarFichasTecnicas() {
  let connection;
  
  try {
    console.log('=== INICIANDO IMPORTACIÓN DE FICHAS TÉCNICAS ===\n');
    
    // Conectar a la base de datos
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Conexión establecida\n');
    
    // Leer el archivo Excel
    console.log('Leyendo archivo Excel...');
    const workbook = XLSX.readFile(path.join(__dirname, '../../FICHA TECNICA MODULO PRODUCCION.xlsx'));
    const worksheet = workbook.Sheets['fichas tecnicas'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`✓ Archivo leído: ${data.length} filas\n`);
    
    // Estadísticas
    let stats = {
      prendasProcesadas: 0,
      prendasCreadas: 0,
      prendasActualizadas: 0,
      materiasCreadas: 0,
      fichasCreadas: 0,
      fichasActualizadas: 0,
      errores: []
    };
    
    // Procesar datos
    let prendaActual = null;
    let productoId = null;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Si la primera columna tiene valor y no es "Total"
      if (row[0] && !row[0].toString().startsWith('Total')) {
        const nombrePrenda = normalizarNombre(row[0]);
        
        // Nueva prenda
        if (nombrePrenda !== prendaActual) {
          prendaActual = nombrePrenda;
          stats.prendasProcesadas++;
          
          console.log(`\n[${stats.prendasProcesadas}] Procesando: ${nombrePrenda}`);
          
          // Buscar o crear producto
          const [productos] = await connection.execute(
            'SELECT id FROM productos WHERE UPPER(nombre) = ?',
            [nombrePrenda]
          );
          
          if (productos.length > 0) {
            productoId = productos[0].id;
            stats.prendasActualizadas++;
            console.log(`  ✓ Producto encontrado (ID: ${productoId})`);
          } else {
            // Crear nuevo producto
            const [result] = await connection.execute(
              'INSERT INTO productos (nombre, codigo, activo) VALUES (?, ?, 1)',
              [nombrePrenda, `PROD-${Date.now()}`]
            );
            productoId = result.insertId;
            stats.prendasCreadas++;
            console.log(`  ✓ Producto creado (ID: ${productoId})`);
          }
        }
      }
      
      // Procesar materia prima (si existe en la fila)
      if (productoId && row[2]) {
        const nombreMateria = normalizarNombre(row[2]);
        const tipoMateria = row[1] ? normalizarNombre(row[1]) : 'OTROS';
        const unidadMedida = row[3] || 'Und.';
        const cantidad = parseFloat(row[4]) || 0;
        const costoTotalExcel = parseFloat(row[5]) || 0;
        
        // El Excel "PRECIO UNITARIO" es en realidad el Costo Total del insumo para esta prenda
        // Necesitamos calcular el precio unitario real (por metro/unidad)
        let precioUnitario = 0;
        if (cantidad > 0) {
          precioUnitario = costoTotalExcel / cantidad;
        }
        
        try {
          // 1. Buscar o crear tipo de materia prima
          let [tipos] = await connection.execute(
            'SELECT id FROM tipos_materia_prima WHERE UPPER(nombre) = ?',
            [tipoMateria]
          );
          
          let tipoId;
          if (tipos.length > 0) {
            tipoId = tipos[0].id;
          } else {
            const [result] = await connection.execute(
              'INSERT INTO tipos_materia_prima (nombre) VALUES (?)',
              [tipoMateria]
            );
            tipoId = result.insertId;
          }
          
          // 2. Buscar o crear unidad de medida
          let [unidades] = await connection.execute(
            'SELECT id FROM unidades_medida WHERE codigo = ? OR nombre = ?',
            [unidadMedida, unidadMedida]
          );
          
          let unidadId;
          if (unidades.length > 0) {
            unidadId = unidades[0].id;
          } else {
            const [result] = await connection.execute(
              'INSERT INTO unidades_medida (codigo, nombre) VALUES (?, ?)',
              [unidadMedida, unidadMedida]
            );
            unidadId = result.insertId;
          }
          
          // 3. Buscar o crear materia prima
          let [materias] = await connection.execute(
            'SELECT id FROM materia_prima WHERE UPPER(nombre) = ?',
            [nombreMateria]
          );
          
          let materiaId;
          if (materias.length > 0) {
            materiaId = materias[0].id;
          } else {
            const [result] = await connection.execute(
              `INSERT INTO materia_prima 
               (nombre, codigo, tipo_id, unidad_medida_id, precio_unitario, stock_actual, stock_minimo, activo) 
               VALUES (?, ?, ?, ?, ?, 0, 0, 1)`,
              [nombreMateria, `MAT-${Date.now()}`, tipoId, unidadId, precioUnitario]
            );
            materiaId = result.insertId;
            stats.materiasCreadas++;
          }
          
          // 4. Crear o actualizar ficha técnica con precio específico
          const [fichasExistentes] = await connection.execute(
            'SELECT id FROM fichas_tecnicas WHERE producto_id = ? AND materia_prima_id = ?',
            [productoId, materiaId]
          );
          
          if (fichasExistentes.length > 0) {
            // Actualizar
            await connection.execute(
              'UPDATE fichas_tecnicas SET cantidad = ?, precio_unitario = ? WHERE id = ?',
              [cantidad, precioUnitario, fichasExistentes[0].id]
            );
            stats.fichasActualizadas++;
          } else {
            // Crear
            await connection.execute(
              'INSERT INTO fichas_tecnicas (producto_id, materia_prima_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
              [productoId, materiaId, cantidad, precioUnitario]
            );
            stats.fichasCreadas++;
          }
          
          console.log(`    + ${nombreMateria}: ${cantidad} x $${precioUnitario.toFixed(2)}`);
          
        } catch (error) {
          stats.errores.push({
            fila: i + 1,
            prenda: prendaActual,
            materia: nombreMateria,
            error: error.message
          });
          console.error(`    ✗ Error: ${error.message}`);
        }
      }
    }
    
    // Mostrar resumen
    console.log('\n\n=== RESUMEN DE IMPORTACIÓN ===');
    console.log(`Prendas procesadas: ${stats.prendasProcesadas}`);
    console.log(`  - Nuevas: ${stats.prendasCreadas}`);
    console.log(`  - Actualizadas: ${stats.prendasActualizadas}`);
    console.log(`Materias primas creadas: ${stats.materiasCreadas}`);
    console.log(`Fichas técnicas:`);
    console.log(`  - Creadas: ${stats.fichasCreadas}`);
    console.log(`  - Actualizadas: ${stats.fichasActualizadas}`);
    
    if (stats.errores.length > 0) {
      console.log(`\n⚠ Errores encontrados: ${stats.errores.length}`);
      stats.errores.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Fila ${err.fila} - ${err.prenda} / ${err.materia}: ${err.error}`);
      });
    }
    
    console.log('\n✓ Importación completada\n');
    
  } catch (error) {
    console.error('\n✗ Error fatal:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar
importarFichasTecnicas()
  .then(() => {
    console.log('\n=== PROCESO FINALIZADO ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== PROCESO FALLIDO ===');
    console.error(error);
    process.exit(1);
  });
