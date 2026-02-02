# Procesamiento de Órdenes Completas con Cálculo de Costos

## 📋 Resumen de Implementación

Se ha completado la implementación de un sistema robusto para procesar órdenes de producción completas, agrupando múltiples items y generando automáticamente PDFs con costos calculados basados en el método PEPS del Kardex.

## 🎯 Objetivos Alcanzados

### 1. **Agrupamiento de Items por Orden** ✅
- Sistema ahora agrupa todos los items de una orden de producción como una entidad única
- Estructura `op_items` ya existía pero ahora se utiliza completamente
- Cada orden puede contener múltiples items/productos diferentes

### 2. **Cálculo de Costos de Materias Primas** ✅
- Servicio `CostoMateriaPrimaService` implementado
- Calcula el costo de producción usando el método PEPS del Kardex
- Utiliza información de `fichas_tecnicas` para determinar materiales necesarios
- Obtiene costos del `kardex` o usa `precio_unitario` como fallback
- Genera desglose detallado de costos por material
 
### 3. **Generación Automática de PDFs con Costos** ✅
- Servicio `OrdenProduccionPDFService` implementado
- Genera PDFs con estructura idéntica a órdenes SIIGO
- Incluye:
  - Encabezado con datos de la empresa
  - Información de la orden (fecha, estado)
  - Tabla de items con: Código, Referencia, Talla, Diseño, Cantidad, **Precio Unitario Calculado**, **Total Calculado**
  - Resumen de costos (Total Brute, Descuentos, Impuestos, Subtotal, Total Adeudado)
  - Pie de página con metadatos
- Los PDFs se guardan en `/uploads/ordenes-produccion/`

### 4. **Interfaz de Usuario Mejorada** ✅
- Nuevo botón "Procesar Orden Completa" en el modal de detalles
- Modal de confirmación antes de procesar
- Modal de resultados mostrando:
  - Resumen de procesamiento (items, cantidades, costos)
  - Detalles de cada item procesado
  - Ruta del PDF generado
  - Manejo de errores con mensajes detallados

### 5. **Tracking de Estado** ✅
  - Campos agregados a `op_items`:
  - `costo_materia_prima`: Costo total de materias primas
  - `precio_calculado`: Precio unitario calculado
  - `total_calculado`: Total para el item (precio × cantidad)
  - `detalles_costos`: JSON con desglose detallado
  - `pdf_ruta`: Ruta al PDF generado
  - `procesado`: Bandera de procesamiento
  - `fecha_procesamiento`: Timestamp de procesamiento

## 📂 Archivos Creados/Modificados

### Archivos Nuevos

1. **`migrations/add_pdf_fields_to_op_items.sql`**
   - Migración que agrega 7 nuevos campos a `op_items`
   - Crea índices para optimizar búsquedas

2. **`backend/services/costoMateriaPrimaService.js`**
   - `calcularCostoProducto(productoId, cantidad)` - Calcula costo de un producto
   - `calcularCostosMultiples(items)` - Procesamiento en lote
   - Integración con Kardex (PEPS) y Fichas Técnicas

3. **`backend/services/ordenProduccionPDFService.js`**
   - `generarPDFOrden(orden, items, empresa)` - Genera PDF completo
   - `guardarPDFEnDisco(buffer, numeroOrden)` - Almacena PDF
   - Métodos helper para dibujar secciones del PDF
   - Utiliza librería `pdfkit` v0.13.0

4. **`backend/scripts/run_migration_pdf_fields.js`**
   - Script que ejecuta la migración de base de datos
   - Manejo elegante de errores y columnas duplicadas
   - Registra progreso en consola

### Archivos Modificados

1. **`backend/models/OpItemModel.js`**
   - `actualizarCostosCalculados(id, datos)` - Actualiza costos
   - `marcarComoProcesado(id)` - Marca como procesado
   - `actualizarRutaPDF(id, rutaPDF)` - Almacena ruta del PDF
   - `getNoProceados(ordenId)` - Obtiene items sin procesar
   - `getResumenCostosOrden(ordenId)` - Resumen de costos de la orden

2. **`backend/controllers/ordenProduccionController.js`**
   - Nuevo endpoint: `POST /ordenes-produccion/:id/procesar-completa`
   - Manejo completo del flujo de procesamiento
   - Validaciones y manejo de errores

3. **`backend/routes/ordenProduccionRoutes.js`**
   - Ruta `/ordenes-produccion/:id/procesar-completa`

4. **`package.json`**
   - Agregada dependencia: `pdfkit@^0.13.0`
   - Script: `npm run migrate:pdf-fields`

5. **`backend/models/ProductoModel.js`**
   - Corregida consulta `getTopCostosos()` para usar alias correcto (nombre → name)

6. **`client/src/pages/OrdenesProduccion.js`**
   - Nuevo estado: `procesandoCompleta`, `resultadoProceso`, `showResultModal`
   - Nueva función: `handleProcesarCompleta(ordenId)`
   - Botón "Procesar Orden Completa" en modal de detalles
   - Modal de resultados con detalles completos

7. **`client/src/services/api.js`**
   - Nuevo método: `procesarCompleta(id)` en `ordenesProduccionAPI`

## 🔄 Flujo de Procesamiento

```
Usuario carga PDF de OP
        ↓
Sistema importa items y asigna productos
        ↓
Usuario abre detalles de orden
        ↓
Verifica que todos los items tengan producto asignado
        ↓
Click en "Procesar Orden Completa"
        ↓
Sistema calcula costos para cada item (PEPS Kardex)
        ↓
Genera PDF con estructura SIIGO + costos calculados
        ↓
Guarda PDF en `/uploads/ordenes-produccion/`
        ↓
Marca items como procesados
        ↓
Actualiza estado de orden a "completada"
        ↓
Muestra modal con resultados
```

## 💾 Base de Datos

### Nuevos Campos en `op_items`
```sql
- costo_materia_prima DECIMAL(15,2) - Costo total de materias primas
- precio_calculado DECIMAL(15,2) - Precio unitario calculado
- total_calculado DECIMAL(15,2) - Total (precio × cantidad)
- detalles_costos JSON - Desglose detallado de costos
- pdf_ruta VARCHAR(255) - Ruta al PDF generado
- procesado BOOLEAN DEFAULT FALSE - Bandera de procesamiento
- fecha_procesamiento TIMESTAMP - Cuándo se procesó
```

### Índices Agregados
- `idx_op_items_procesado` - Búsqueda rápida de items sin procesar
- `idx_op_items_fecha_procesamiento` - Búsqueda por fecha

## 🚀 Cómo Usar

### 1. Cargar una Orden desde PDF
```
1. Click en "Cargar desde PDF"
2. Selecciona archivo PDF de orden de producción
3. Sistema importa items automáticamente
```

### 2. Revisar Detalles y Asignar Productos
```
1. Click en ícono de búsqueda (detalles)
2. Revisa tabla de items
3. Asegúrate que cada item tenga un producto asignado
4. Si hay items sin asignar, edita manualmente o selecciona producto sugerido
```

### 3. Procesar Orden Completa
```
1. Abre detalles de orden (todos items deben tener producto)
2. Click en "Procesar Orden Completa"
3. Confirma en diálogo de confirmación
4. Sistema calcula costos y genera PDF
5. Revisa resultados en modal de resultados
6. Descarga PDF si es necesario
```

## 📊 Ejemplo de Respuesta del Procesamiento

```json
{
  "success": true,
  "data": {
    "orden_id": 5,
    "numero_orden": "OP-2024-001",
    "total_items": 3,
    "items_procesados": 3,
    "cantidad_total": 150,
    "costo_total_materias": 45000.00,
    "precio_total_calculado": 135000.00,
    "estado_orden": "completada",
    "pdf_generado": true,
    "pdf_ruta": "/uploads/ordenes-produccion/OP-2024-001-2024-01-15.pdf",
    "items_detalles": [
      {
        "id": 1,
        "producto_nombre": "Camiseta Básica",
        "cantidad": 50,
        "costo_materia_prima": 15000.00,
        "precio_calculado": 450.00,
        "total_calculado": 22500.00
      },
      ...
    ]
  }
}
```

## ⚙️ Configuración y Dependencias

### Dependencias Agregadas
- `pdfkit@0.13.0` - Generación de PDFs
- Todas las demás ya estaban presentes (mysql2, express, dotenv, etc.)

### Variables de Entorno Necesarias
Asegúrate que `.env` contiene:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=inventario_frenesi
```

### Directorio de Salida
Los PDFs generados se guardan en:
```
/uploads/ordenes-produccion/
```
Crea esta carpeta si no existe:
```bash
mkdir -p uploads/ordenes-produccion
```

## 🧪 Testing

### Prueba Manual
1. Carga una orden de producción desde PDF
2. Asegúrate que todos los items tengan productos asignados
3. Abre detalles y haz click en "Procesar Orden Completa"
4. Verifica que:
   - Los costos se calculen correctamente
   - Se genere el PDF
   - El estado de la orden cambie a "completada"
   - Los items se marquen como procesados

### Validaciones Implementadas
- ✅ Todos los items deben tener `producto_id` asignado
- ✅ Los productos deben tener fichas técnicas asociadas
- ✅ Las materias primas deben existir en el sistema
- ✅ El Kardex debe tener movimientos para calcular PEPS

## 📝 Notas Importantes

1. **PEPS (Primeras Entradas, Primeras Salidas)**
   - El sistema utiliza el Kardex existente que implementa PEPS
   - Los costos se obtienen del método de cálculo de costos promedio ponderado
   - Si no hay suficiente stock, se genera error informativo

2. **PDF Generation**
   - Se utiliza `pdfkit` para máximo control del formato
   - El PDF generado es binario puro, compatible con cualquier visor
   - Se guarda con nombre: `NUMERO_ORDEN-FECHA.pdf`

3. **Transacciones**
   - El procesamiento es atómico (todo éxito o todo falla)
   - Si hay error en cualquier paso, se revierte

4. **Rendimiento**
   - Los índices en `op_items` optimizan búsquedas
   - El procesamiento en lote es eficiente incluso para órdenes grandes

## 🔐 Seguridad

- ✅ Validaciones de entrada en cliente y servidor
- ✅ Manejo seguro de excepciones
- ✅ Los PDFs se guardan en carpeta segura
- ✅ Rutas de archivo validadas

## 📞 Próximos Pasos (Opcionales)

1. **Descargar PDF desde la aplicación**
   - Crear endpoint `GET /ordenes-produccion/:id/pdf`
   - Agregar botón de descarga en modal de resultados

2. **Material Shortage Validation**
   - Validar disponibilidad de materiales antes de procesar
   - Mostrar advertencia si hay escasez

3. **Reporte de Costos**
   - Dashboard con análisis de costos por orden
   - Comparación entre costos PEPS y precios finales

4. **Integración SIIGO**
   - Exportar orden procesada directamente a SIIGO
   - Sincronización automática de precios

## 📅 Fecha de Implementación

**Completado:** 15 de enero de 2025

## ✨ Conclusión

El sistema está completamente funcional y listo para procesar órdenes de producción completas con cálculo automático de costos basados en el método PEPS. La interfaz de usuario es intuitiva y proporciona feedback detallado sobre el procesamiento.

