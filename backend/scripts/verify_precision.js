const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../database/db');

async function verifyPrecision() {
    const connection = await db.getConnection();
    try {
        console.log('Verificando precisión de la base de datos...');

        // Check column type informationSchema
        const [columns] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'fichas_tecnicas' AND COLUMN_NAME = 'cantidad'
    `, [process.env.DB_NAME || 'inventario_frenesi']);

        console.log('Tipo de columna cantidad:', columns[0].COLUMN_TYPE);

        if (columns[0].COLUMN_TYPE.includes('decimal(15,6)')) {
            console.log('✅ La columna cantidad tiene la precisión correcta DECIMAL(15,6).');
        } else {
            console.error('❌ La columna cantidad NO tiene la precisión correcta.');
        }

        // Insert test value if possible (requires valid IDs)
        // We can just rely on schema check for safety if we don't want to insert garbage data.
        // Or we can try to select an existing row and see if it returns expected precision if we update it temporarily.
        // Let's NOT modify data blindly. Schema check is strong evidence.

    } catch (error) {
        console.error('Error durante la verificación:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

verifyPrecision();
