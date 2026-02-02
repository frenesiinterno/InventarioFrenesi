# 🚀 INSTRUCCIONES DE DESPLIEGUE Y INICIO RÁPIDO

## Estado: LISTO PARA INICIAR

Fecha: 15 de enero de 2025

---

## ⚡ INICIO RÁPIDO (3 pasos)

### Paso 1: Verificar que todo está listo
```bash
npm run test:procesar-ordenes
```

Deberías ver:
```
✨ PRUEBAS COMPLETADAS EXITOSAMENTE
El sistema está listo para procesar órdenes completas
```

### Paso 2: Iniciar el servidor
```bash
npm start
```

Deberías ver:
```
✅ Servidor ejecutándose en puerto 5000
✅ Base de datos conectada
```

### Paso 3: Abrir en navegador
```
http://localhost:3000
```

---

## 📋 VERIFICACIÓN PRE-INICIO

Antes de iniciar, asegúrate que:

- [ ] `.env` existe con variables correctas:
  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=inventario_frenesi
  ```

- [ ] Node.js está instalado:
  ```bash
  node --version  # Debe ser v14 o superior
  ```

- [ ] npm está actualizado:
  ```bash
  npm --version
  ```

- [ ] MySQL está corriendo:
  ```bash
  mysql -u root -p -e "SELECT 1;"
  ```

- [ ] Base de datos existe:
  ```bash
  mysql -u root -p inventario_frenesi -e "SHOW TABLES;"
  ```

- [ ] Carpeta de uploads existe:
  ```bash
  mkdir -p uploads/ordenes-produccion
  ```

---

## 🔧 INSTALACIÓN COMPLETA (Para nuevo servidor)

### 1. Clonar/Descargar el Proyecto
```bash
cd /ruta/del/proyecto
```

### 2. Instalar Dependencias Backend
```bash
npm install
```

Verifica que se instaló pdfkit:
```bash
npm list pdfkit
```

Resultado esperado:
```
└── pdfkit@0.13.0
```

### 3. Instalar Dependencias Frontend
```bash
cd client
npm install
cd ..
```

### 4. Configurar Base de Datos
```bash
# Crear base de datos si no existe
mysql -u root -p < backend/database/database.sql
```

### 5. Ejecutar Migración
```bash
npm run migrate:pdf-fields
```

Esperado:
```
✨ Migración completada exitosamente
📌 Campos agregados a op_items:
   - costo_materia_prima
   - precio_calculado
   - ... (7 campos total)
```

### 6. Ejecutar Tests
```bash
npm run test:procesar-ordenes
```

### 7. Crear Carpetas de Upload
```bash
mkdir -p uploads/ordenes-produccion
mkdir -p uploads/siigo_ocs
```

### 8. Iniciar Sistema
```bash
npm start
```

---

## 📱 MODO DESARROLLO

Para desarrollo con recarga automática:

```bash
# Terminal 1 - Backend con nodemon
npm run server

# Terminal 2 - Frontend con hot reload
npm run client

# O en una sola terminal (si tienes concurrently)
npm run dev:all
```

---

## 📝 ESTRUCTURA DE DIRECTORIO ESPERADA

```
InventarioFrenesi/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── costoMateriaPrimaService.js      ✅ NUEVO
│   │   ├── ordenProduccionPDFService.js     ✅ NUEVO
│   │   └── ...
│   ├── scripts/
│   │   ├── run_migration_pdf_fields.js      ✅ NUEVO
│   │   ├── test_procesar_ordenes.js         ✅ NUEVO
│   │   └── ...
│   ├── database/
│   │   └── db.js
│   └── migrations/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── OrdenesProduccion.js         ✏️ MODIFICADO
│   │   └── services/
│   │       └── api.js                       ✏️ MODIFICADO
│   └── ...
├── migrations/
│   ├── add_pdf_fields_to_op_items.sql       ✅ NUEVO
│   └── ...
├── uploads/
│   ├── ordenes-produccion/                  📁 REQUERIDA
│   └── siigo_ocs/
├── server.js
├── package.json                             ✏️ MODIFICADO
└── .env
```

---

## 🔐 VARIABLES DE ENTORNO

Asegúrate que `.env` contiene:

```env
# Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=inventario_frenesi

# Puerto (opcional)
PORT=5000
CLIENT_PORT=3000

# Otros (si existen)
JWT_SECRET=tu_secret_aqui
```

---

## ✅ CHECKLIST DE DESPLIEGUE

### Antes de Iniciar
- [ ] Dependencies instaladas (`npm install`)
- [ ] Base de datos existe
- [ ] Migración ejecutada (`npm run migrate:pdf-fields`)
- [ ] Tests pasados (`npm run test:procesar-ordenes`)
- [ ] Carpetas de upload creadas
- [ ] `.env` configurado

### Primer Inicio
- [ ] Servidor inicia sin errores
- [ ] Frontend carga en localhost:3000
- [ ] Puedes navegar a Órdenes de Producción
- [ ] Botones funcionan correctamente

### Funcionalidad
- [ ] Puedes cargar PDF
- [ ] Puedes ver detalles de orden
- [ ] Botón "Procesar Orden Completa" aparece cuando debe
- [ ] Procesamiento genera resultados correctos
- [ ] PDF se crea en `/uploads/ordenes-produccion/`

---

## 🚨 SOLUCIÓN DE PROBLEMAS DE INICIO

### Error: "Cannot find module 'pdfkit'"
```bash
npm install pdfkit@0.13.0
npm list pdfkit  # Verifica instalación
```

### Error: "ECONNREFUSED" (DB)
```bash
# Verifica que MySQL está corriendo
mysql -u root -p -e "SELECT 1;"
# Si no funciona, inicia MySQL
# Windows: net start MySQL80
# Mac: brew services start mysql
# Linux: sudo service mysql start
```

### Error: "Table doesn't exist"
```bash
npm run migrate:pdf-fields
npm run test:procesar-ordenes
```

### Error: "Permission denied" (carpetas)
```bash
# En Windows
mkdir uploads\ordenes-produccion

# En Mac/Linux
mkdir -p uploads/ordenes-produccion
chmod 755 uploads
```

### Error: "EADDRINUSE" (puerto ocupado)
```bash
# Cambia puerto en .env o inicio
# O mata proceso en puerto 5000
lsof -ti:5000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5000   # Windows (encontrar PID y taskkill)
```

### Frontend no se conecta al backend
```
1. Verifica que servidor está en http://localhost:5000
2. Revisa Network tab en DevTools
3. Verifica CORS está habilitado
4. Reinicia ambos (backend y frontend)
```

---

## 📊 VALIDACIÓN POST-INICIO

Después de iniciar, valida que funciona:

### 1. Backend Está Corriendo
```bash
curl http://localhost:5000/api/health
```

Esperado: `{"status":"ok"}`

### 2. Frontend Carga
```
Abre http://localhost:3000 en navegador
Deberías ver la interfaz principal
```

### 3. Base de Datos Conectada
```bash
npm run test:procesar-ordenes
```

Esperado: `✨ PRUEBAS COMPLETADAS EXITOSAMENTE`

### 4. Puedo Navegar
- Click en "Órdenes de Producción"
- Deberías ver tabla vacía o con órdenes existentes
- Botones funcionan sin errores en consola

---

## 🎯 FLUJO DE PRUEBA INICIAL

Para validar que todo funciona:

1. **Carga Orden de Prueba**
   - Click en "Cargar desde PDF"
   - Selecciona un PDF de SIIGO
   - Espera importación

2. **Verifica Detalles**
   - Click en búsqueda (ícono)
   - Revisa tabla de items
   - Todos deben tener producto asignado

3. **Procesa Orden**
   - Click en "Procesar Orden Completa"
   - Confirma en diálogo
   - Espera procesamiento (5-30 segundos)

4. **Valida Resultados**
   - Modal muestra resumen
   - Items con costos calculados
   - PDF path mostrado

5. **Revisa PDF**
   - Ve a `/uploads/ordenes-produccion/`
   - Abre PDF generado
   - Verifica estructura y costos

---

## 📈 MONITOREO DE RENDIMIENTO

### Ver Logs en Tiempo Real
```bash
# Terminal con logs detallados
npm run server
```

### Verificar Uso de BD
```bash
mysql -u root inventario_frenesi -e "
  SELECT TABLE_NAME, TABLE_ROWS 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = 'inventario_frenesi'
  ORDER BY TABLE_ROWS DESC
  LIMIT 10;
"
```

### Verificar PDFs Generados
```bash
ls -lah uploads/ordenes-produccion/
du -sh uploads/  # Tamaño total
```

---

## 🔄 ACTUALIZACIÓN FUTURA

Si necesitas actualizar el código:

```bash
# 1. Detén servidor (Ctrl+C)

# 2. Instala nuevas dependencias si hay
npm install

# 3. Ejecuta nuevas migraciones si hay
npm run migrate:pdf-fields

# 4. Reinicia
npm start
```

---

## 🆘 CONTACTO Y SOPORTE

### Documentación Disponible
- `GUIA_RAPIDA_PROCESAR_ORDENES.md` - Guía de usuario
- `PROCESAMIENTO_ORDENES_COMPLETAS.md` - Documentación técnica
- `CAMBIOS_DETALLADOS.md` - Cambios realizados
- `IMPLEMENTACION_COMPLETADA.md` - Resumen de implementación

### Scripts Útiles
```bash
npm start                      # Iniciar servidor
npm run dev                    # Iniciar con nodemon
npm run server                 # Solo backend
npm run client                 # Solo frontend
npm run dev:all                # Backend + Frontend
npm run test:procesar-ordenes # Validar sistema
npm run migrate:pdf-fields    # Ejecutar migración
```

### Archivos Clave
- `server.js` - Punto de entrada del backend
- `client/src/index.js` - Punto de entrada del frontend
- `.env` - Configuración
- `package.json` - Dependencias

---

## ✨ ¡LISTO!

Ahora puedes:

1. ✅ Cargar órdenes desde PDFs
2. ✅ Asignar productos automáticamente
3. ✅ Procesar órdenes completas
4. ✅ Generar PDFs con costos calculados
5. ✅ Auditar y rastrear cambios

**¡Disfruta del nuevo sistema!** 🎉

---

*Sistema de Inventario Frenesi - Procesamiento de Órdenes de Producción*
*© 2024-2025 DISEÑOS Y TEXTILES FRENESI S.A.S.*

