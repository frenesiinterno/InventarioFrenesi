/**
 * Script para ejecutar la migración de op_items
 * Ejecuta el SQL de creación de la tabla op_items y modificación de ordenes_produccion
 */

const fs = require('fs');
const path = require('path');
const db = require('../database/db');

async function ejecutarMigracion() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log('🚀 Ejecutando migración: Crear tabla op_items y modificar ordenes_produccion...\n');

    // 1. Hacer producto_id nullable en ordenes_produccion primero
    console.log('📝 Paso 1: Modificando tabla ordenes_produccion para hacer producto_id nullable...');
    try {
      // Verificar si la columna existe y es NOT NULL
      const [columns] = await connection.execute(`
        SELECT IS_NULLABLE, COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ordenes_produccion' 
        AND COLUMN_NAME = 'producto_id'
      `);
      
      if (columns.length > 0 && columns[0].IS_NULLABLE === 'NO') {
        await connection.execute(`
          ALTER TABLE ordenes_produccion 
          MODIFY COLUMN producto_id INT NULL
        `);
        console.log('✓ producto_id ahora es nullable\n');
      } else if (columns.length > 0) {
        console.log('✓ producto_id ya es nullable\n');
      } else {
        console.log('⚠ Columna producto_id no encontrada en ordenes_produccion\n');
      }
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠ Tabla ordenes_produccion no existe, se creará con la estructura completa\n');
      } else {
        throw error;
      }
    }

    // 2. Crear la tabla op_items
    console.log('📝 Paso 2: Creando tabla op_items...');
    try {
      const sqlPath = path.join(__dirname, '../../migrations/create_op_items_table.sql');
      let sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Remover comentarios de una línea que estén solos
      sql = sql.replace(/^--.*$/gm, '');
      
      // Ejecutar el SQL completo
      await connection.query(sql);
      console.log('✓ Tabla op_items creada exitosamente\n');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠ Tabla op_items ya existe, continuando...\n');
      } else {
        throw error;
      }
    }

    await connection.commit();
    console.log('✅ Migración completada exitosamente');
    console.log('\n📋 Resumen:');
    console.log('  - Tabla op_items: lista para usar');
    console.log('  - Columna producto_id en ordenes_produccion: nullable');
    process.exit(0);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('\n❌ Error en migración:', error.message);
    if (error.code) {
      console.error('   Código de error:', error.code);
    }
    console.error('\nDetalles completos:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

ejecutarMigracion();

