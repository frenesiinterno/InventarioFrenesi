const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de la conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'inventariofrenesi',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
  
// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Promesa para usar async/await
const promisePool = pool.promise();

// Probar conexión
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión a MySQL establecida correctamente');
  connection.release();
});

module.exports = promisePool;

