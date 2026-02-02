#!/usr/bin/env node

/**
 * Script para ejecutar la migración de agregar campos PDF a op_items
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inventario_frenesi',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Conexión establecida\n');

    // Leer el archivo de migración
    const migrationFile = path.join(__dirname, '../../migrations/add_pdf_fields_to_op_items.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    // Dividir por punto y coma y ejecutar cada statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    console.log(`📋 Ejecutando ${statements.length} statements de migración...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`  [${i + 1}/${statements.length}] Ejecutando: ${statement.substring(0, 60)}...`);
        try {
          await connection.execute(statement);
          console.log(`  ✅ OK\n`);
        } catch (error) {
          // Si el error es porque la columna ya existe, continuar
          if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
            console.log(`  ⚠️  Columna ya existe (ignorado)\n`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✨ Migración completada exitosamente');
    console.log('\n📌 Campos agregados a op_items:');
    console.log('   - costo_materia_prima: Costo total de materia prima');
    console.log('   - precio_calculado: Precio unitario calculado');
    console.log('   - total_calculado: Total calculado (precio × cantidad)');
    console.log('   - detalles_costos: Detalles JSON del desglose de costos');
    console.log('   - procesado: Si el item ha sido procesado');
    console.log('   - fecha_procesamiento: Fecha de procesamiento');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n⚠️  La tabla op_items no existe. Ejecuta la migración op_items primero:');
      console.error('   npm run migrate:op-items');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar migración
runMigration();
