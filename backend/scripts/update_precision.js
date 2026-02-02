const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../database/db');

async function updatePrecision() {
    try {
        console.log('Iniciando actualización de precisión de decimales...');

        // 1. Update fichas_tecnicas
        console.log('Actualizando tabla fichas_tecnicas...');
        await db.query("ALTER TABLE `fichas_tecnicas` MODIFY `cantidad` DECIMAL(15,6) NOT NULL");
        console.log('fichas_tecnicas actualizada.');

        // 2. Update movimientos_inventario
        // Note: 'cantidad' in movimientos_inventario might need a default or just NOT NULL depending on existing data, 
        // but MODIFY usually preserves data if compatible.
        console.log('Actualizando tabla movimientos_inventario...');
        await db.query("ALTER TABLE `movimientos_inventario` MODIFY `cantidad` DECIMAL(15,6) NOT NULL");
        console.log('movimientos_inventario actualizada.');

        // 3. Update materia_prima
        console.log('Actualizando tabla materia_prima...');
        await db.query("ALTER TABLE `materia_prima` MODIFY `stock_actual` DECIMAL(15,6) NOT NULL DEFAULT 0.000000");
        console.log('materia_prima actualizada.');

        console.log('¡Actualización completada con éxito!');
        process.exit(0);
    } catch (error) {
        console.error('Error durante la actualización:', error);
        process.exit(1);
    }
}

updatePrecision();
