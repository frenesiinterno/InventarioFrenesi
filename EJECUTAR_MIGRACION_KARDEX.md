# Ejecutar Migración del Kardex

## Problema
El error 500 indica que las tablas del Kardex no existen en la base de datos.

## Solución

Ejecuta el siguiente script SQL en tu base de datos MySQL:

### Opción 1: Desde MySQL Workbench o cliente MySQL

1. Abre MySQL Workbench o tu cliente MySQL favorito
2. Conéctate a tu base de datos `inventario_frenesi`
3. Copia y pega el contenido del archivo `migrations/create_kardex_system.sql`
4. Ejecuta el script

### Opción 2: Desde la línea de comandos

```bash
# Si tienes MySQL en la línea de comandos:
mysql -u root -p inventario_frenesi < migrations/create_kardex_system.sql
```

### Opción 3: Desde Node.js (Script temporal)

Puedes crear un script temporal para ejecutar la migración:

```javascript
// ejecutar_migracion.js
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_frenesi',
  multipleStatements: true
});

const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'create_kardex_system.sql'), 'utf8');

connection.query(sql, (err, results) => {
  if (err) {
    console.error('Error ejecutando migración:', err);
    process.exit(1);
  }
  console.log('✅ Migración del Kardex ejecutada correctamente');
  connection.end();
});
```

Luego ejecuta:
```bash
node ejecutar_migracion.js
```

## Verificar que las tablas se crearon

Ejecuta en MySQL:
```sql
SHOW TABLES LIKE 'kardex%';
```

Deberías ver:
- `kardex_movimientos`
- `kardex_capas`

## Después de ejecutar la migración

1. Reinicia el servidor Node.js si está corriendo
2. Intenta nuevamente hacer clic en el botón de Kardex en la página de Materia Prima
3. El error debería desaparecer

