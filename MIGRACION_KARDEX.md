# Migración al Sistema de Kardex - Guía de Implementación

## 📋 Resumen de Cambios Implementados

### ✅ Completado

1. **Sistema de Kardex Completo**
   - ✅ Tablas creadas: `kardex_movimientos` y `kardex_capas` (PEPS)
   - ✅ Modelo `KardexModel` con métodos para:
     - `registrarEntrada()` - Registrar entradas con costos
     - `registrarSalida()` - Registrar salidas usando PEPS
     - `getCostoPromedio()` - Calcular costo promedio ponderado
     - `getMovimientosByMateria()` - Consultar movimientos
     - `getSaldoActual()` - Obtener saldos actuales

2. **Fichas Técnicas (Sin Precios)**
   - ✅ Migración para eliminar `precio_unitario` de `fichas_tecnicas`
   - ✅ `FichaTecnicaModel` actualizado (solo consumo)
   - ✅ `fichaTecnicaController` actualizado
   - ✅ Servicio `costoFichaTecnicaService` creado para cálculo dinámico

### ⚠️ Pendiente

1. **Frontend (FichasTecnicas.js)**
   - Eliminar columnas "Precio Unitario" y "Costo Total"
   - Eliminar campos de precio en formularios
   - Actualizar lógica de edición (solo cantidad)
   - Mostrar solo consumo (cantidad + unidad)

2. **OrdenProduccionModel**
   - Actualizar `procesarOrden()` para usar `KardexModel.registrarSalida()`
   - Calcular costos reales usando PEPS al procesar órdenes

3. **MovimientoInventarioModel**
   - Integrar con Kardex para entradas (requiere costo_unitario)
   - Actualizar controlador de inventario

4. **Migraciones de Base de Datos**
   - Ejecutar `migrations/create_kardex_system.sql`
   - Ejecutar `migrations/remove_precio_unitario_from_fichas_tecnicas.sql`

## 🔧 Pasos para Completar la Migración

### 1. Ejecutar Migraciones

```sql
-- Crear sistema de Kardex
SOURCE migrations/create_kardex_system.sql;

-- Eliminar precio_unitario de fichas_tecnicas
SOURCE migrations/remove_precio_unitario_from_fichas_tecnicas.sql;
```

### 2. Actualizar OrdenProduccionModel
 
 

El método `procesarOrden()` debe usar `KardexModel.registrarSalida()` en lugar de `movimientos_inventario`:

```javascript
const KardexModel = require('./KardexModel');

// En lugar de:
await connection.execute(
  `INSERT INTO movimientos_inventario ...`
);

// Usar:
await KardexModel.registrarSalida({
  materia_prima_id: ficha.materia_prima_id,
  cantidad: cantidadDescontar,
  referencia: 'OP',
  referencia_id: id,
  motivo: 'Orden de producción',
  observaciones: `Item: ${item.referencia_prenda} (${item.cantidad} unidades)`
});
```

### 3. Actualizar Frontend (FichasTecnicas.js)

Cambios principales:
- Eliminar columnas de precio en la tabla
- Eliminar campos de precio en formularios
- Eliminar cálculos de totales basados en precios
- Simplificar edición (solo cantidad)

### 4. Migrar Datos Existentes (Opcional)

Si hay movimientos en `movimientos_inventario`, crear un script para migrarlos a `kardex_movimientos` con costos estimados.

### 5. Actualizar Entradas de Inventario

Las entradas deben usar `KardexModel.registrarEntrada()` con costo_unitario:

```javascript
await KardexModel.registrarEntrada({
  materia_prima_id: id,
  cantidad: cantidad,
  costo_unitario: costoUnitario,
  referencia: 'COMPRA',
  referencia_id: compraId,
  motivo: 'Compra de materia prima'
});
```

## 📊 Arquitectura Final

```
SIIGO (OC PDF)
    ↓
Orden de Producción
    ↓
Ficha Técnica (solo consumos)
    ↓
KARDEX (PEPS + PROMEDIO)
    ↓
Costo Real del Producto
    ↓
Reporte / Integración SIIGO
```

## 🎯 Principios del Nuevo Sistema

1. **Fichas Técnicas**: Solo definen CONSUMO (qué y cuánto), NO costos
2. **Kardex**: Registra TODOS los movimientos con costos históricos
3. **PEPS**: Para salidas reales (Primeras Entradas Primeras Salidas)
4. **Promedio Ponderado**: Para reportes y estimaciones
5. **Costos Dinámicos**: Se calculan desde el Kardex, no se almacenan en fichas

## 🔍 Verificación

Después de la migración, verificar:
- ✅ Fichas técnicas muestran solo consumo
- ✅ Kardex registra entradas y salidas con costos
- ✅ Órdenes de producción calculan costos reales
- ✅ Reportes usan costos del Kardex
- ✅ No hay referencias a `precio_unitario` en `fichas_tecnicas`

