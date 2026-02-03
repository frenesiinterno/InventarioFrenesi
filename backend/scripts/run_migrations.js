const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const migrationsDir = path.join(__dirname, '..', '..', 'migrations');

async function run() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventariofrenesi',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  };

  const connection = await mysql.createConnection(dbConfig);
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('Ejecutando migraciones:', files);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log('Ejecutando', file);
      try {
        const [result] = await connection.query(sql);
        console.log('OK:', file);
      } catch (err) {
        console.error('Error ejecutando', file, err.message);
      }
    }

    console.log('Migraciones finalizadas');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Error en run_migrations:', err);
  process.exit(1);
});