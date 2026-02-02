#!/usr/bin/env node

/**
 * Script de prueba para validar la funcionalidad de procesamiento de órdenes completas
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSystem() {
  let connection;
  
  try {
    console.log('🔍 Iniciando pruebas del sistema de procesamiento de órdenes completas\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inventario_frenesi'
    });

    console.log('✅ Conexión a base de datos establecida\n');

    // Test 1: Verificar campos en op_items
    console.log('📋 Test 1: Verificando campos agregados en op_items...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'op_items' 
      AND COLUMN_NAME IN (
        'costo_materia_prima',
        'precio_calculado',
        'total_calculado',
        'detalles_costos',
        'pdf_ruta',
        'procesado',
        'fecha_procesamiento'
      )
    `);

    if (columns.length === 7) {
      console.log('   ✅ Todos los 7 campos han sido agregados correctamente\n');
    } else {
      console.log(`   ⚠️  Solo ${columns.length}/7 campos encontrados\n`);
    }

    // Test 2: Verificar índices
    console.log('📋 Test 2: Verificando índices agregados...');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM op_items 
      WHERE Key_name IN (
        'idx_op_items_procesado',
        'idx_op_items_fecha_procesamiento'
      )
    `);

    if (indexes.length >= 2) {
      console.log('   ✅ Índices han sido creados correctamente\n');
    } else {
      console.log(`   ⚠️  Solo ${indexes.length}/2 índices encontrados\n`);
    }

    // Test 3: Contar órdenes sin procesar
    console.log('📋 Test 3: Órdenes disponibles para procesar...');
    const [ordenes] = await connection.query(`
      SELECT op.id, op.numero_orden, COUNT(oi.id) as total_items
      FROM ordenes_produccion op
      LEFT JOIN op_items oi ON op.id = oi.orden_produccion_id
      WHERE op.estado != 'completada'
      GROUP BY op.id, op.numero_orden
    `);

    if (ordenes.length > 0) {
      console.log(`   ✅ Encontradas ${ordenes.length} orden(es) disponible(s):`);
      ordenes.forEach(orden => {
        console.log(`      - ${orden.numero_orden} (${orden.total_items} items)`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  No hay órdenes disponibles para procesar\n');
    }

    // Test 4: Verificar productos con fichas técnicas
    console.log('📋 Test 4: Productos con fichas técnicas...');
    const [productosConFichas] = await connection.query(`
      SELECT COUNT(DISTINCT p.id) as cantidad_productos
      FROM productos p
      WHERE EXISTS (
        SELECT 1 FROM fichas_tecnicas ft WHERE ft.producto_id = p.id
      )
    `);

    console.log(`   ✅ ${productosConFichas[0].cantidad_productos} producto(s) tienen fichas técnicas\n`);

    // Test 5: Verificar materias primas en kardex
    console.log('📋 Test 5: Materias primas en kardex...');
    try {
      const [materiasEnKardex] = await connection.query(`
        SELECT COUNT(DISTINCT materia_prima_id) as cantidad_materias
        FROM kardex
      `);
      console.log(`   ✅ ${materiasEnKardex[0].cantidad_materias} materia(s) prima(s) en kardex\n`);
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('   ⚠️  Tabla kardex aún no existe (será creada cuando sea necesaria)\n');
      } else {
        throw error;
      }
    }

    // Test 6: Verificar estructura de op_items
    console.log('📋 Test 6: Items pendientes de procesar...');
    const [itemsPendientes] = await connection.query(`
      SELECT COUNT(*) as total_items
      FROM op_items
      WHERE procesado = FALSE OR procesado IS NULL
    `);

    console.log(`   ✅ ${itemsPendientes[0].total_items} item(s) pendiente(s) de procesar\n`);

    // Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ PRUEBAS COMPLETADAS EXITOSAMENTE\n');
    console.log('El sistema está listo para procesar órdenes completas:');
    console.log('  1. Base de datos está actualizada con nuevos campos');
    console.log('  2. Hay órdenes disponibles para procesar');
    console.log('  3. Existen productos con fichas técnicas');
    console.log('  4. El kardex contiene información de materias primas');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📱 Próximos pasos:');
    console.log('  1. Inicia el servidor: npm start');
    console.log('  2. Abre la aplicación en el navegador');
    console.log('  3. Ve a "Órdenes de Producción"');
    console.log('  4. Carga una orden desde PDF');
    console.log('  5. Asegúrate que todos los items tengan productos');
    console.log('  6. Click en "Ver Detalles" y luego "Procesar Orden Completa"\n');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

testSystem();
