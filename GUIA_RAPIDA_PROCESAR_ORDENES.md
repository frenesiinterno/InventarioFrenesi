# 🚀 Guía Rápida: Procesar Órdenes Completas

## ¿Qué es esto?

Ahora tu sistema puede procesar órdenes de producción **completas** (con múltiples items) y generar automáticamente **PDFs con costos calculados** basados en materiales reales usando el método PEPS del Kardex.

## ✅ Lo que ya está listo

- ✅ Base de datos actualizada con campos para costos
- ✅ Servicios de cálculo de costos implementados
- ✅ Generación automática de PDFs
- ✅ Interfaz de usuario actualizada
- ✅ Todas las dependencias instaladas

## 🎯 Pasos para Usar

### 1️⃣ Verifica que Todo Está Listo

```bash
npm run test:procesar-ordenes
```

Deberías ver un mensaje como "✨ PRUEBAS COMPLETADAS EXITOSAMENTE"

### 2️⃣ Inicia el Servidor

```bash
npm start
```

O en modo desarrollo:

```bash
npm run dev
```

### 3️⃣ Abre la Aplicación

Ve a `http://localhost:3000` en tu navegador

### 4️⃣ Carga una Orden de Producción

1. Ve a "Órdenes de Producción"
2. Click en "Cargar desde PDF"
3. Selecciona un archivo PDF de orden de SIIGO
4. Espera a que se procese

### 5️⃣ Verifica la Orden

1. Busca la orden en la lista
2. Click en el ícono de búsqueda para ver detalles
3. Revisa la tabla de items
4. **Importante**: Asegúrate que TODOS los items tengan un producto asignado
   - Si ves "No asignado", edita la orden o selecciona un producto

### 6️⃣ Procesa la Orden Completa

1. En el modal de detalles, busca el botón **"Procesar Orden Completa"**
2. Click en el botón (solo aparece si todos los items tienen producto)
3. Confirma en el diálogo
4. Espera mientras se calcula...

### 7️⃣ Revisa los Resultados

Se abrirá un modal mostrando:
- ✅ Total de items procesados
- ✅ Cantidad total producida
- ✅ Costo total de materias primas
- ✅ Precio total calculado
- ✅ Ubicación del PDF generado
- ✅ Detalles de cada item

## 📊 ¿Qué Hace el Sistema?

Para cada item de la orden:

1. **Busca** los materiales necesarios (de la Ficha Técnica del producto)
2. **Calcula** el costo usando PEPS (precio actual del Kardex)
3. **Suma** el costo total de materiales
4. **Genera** un PDF con:
   - Estructura idéntica a SIIGO
   - Columna de "Precio Unitario Calculado"
   - Columna de "Total Calculado"
   - Subtotal con todos los costos

## 💡 Ejemplo

Si tienes una orden con:
- 50 Camisetas Básicas @ 10 unidades c/u
- Necesita: 50 m² de tela (costo actual: $300/m²) = $15,000
- Precio calculado: $15,000 ÷ 50 = $300/unidad
- Total: 50 × $300 = $15,000

El PDF mostrará:
```
Item | Ref      | Talla | Diseño | Qty | Precio Unit | Total
---  | -------  | ----- | ------ | --- | ----------- | --------
 1   | CAMISETA | M,L,X | AZUL   | 50  |    $300     | $15,000
```

## 🔍 Solución de Problemas

### Botón "Procesar Orden Completa" no aparece
**Posibles causas:**
- La orden ya está completada
- Hay items sin producto asignado
- No hay items en la orden

**Solución:**
- Asegúrate que todos los items tengan producto
- La orden no debe estar completada
- Carga items desde un PDF si es necesario

### Error: "Todos los items deben tener un producto asignado"
**Causa:** Hay items sin producto

**Solución:**
1. Abre detalles de la orden
2. Busca rows con "No asignado" en la columna "Producto"
3. Edita la orden y asigna productos

### Error: "Producto no encontrado"
**Causa:** El producto especificado no existe

**Solución:**
- Verifica que el producto esté creado en el sistema
- Crea el producto si no existe

### Error: "No hay ficha técnica para este producto"
**Causa:** El producto no tiene definidos sus materiales

**Solución:**
- Ve a "Fichas Técnicas"
- Crea una ficha técnica para el producto
- Define los materiales y cantidades necesarias

## 📂 Archivos Generados

Los PDFs se guardan en:
```
/uploads/ordenes-produccion/
```

Nombre del archivo:
```
NUMERO-ORDEN-FECHA.pdf
Ejemplo: OP-2024-001-2024-01-15.pdf
```

## 🎓 Conceptos Clave

### PEPS (Primeras Entradas, Primeras Salidas)
El sistema usa el método PEPS del Kardex para determinar el costo de los materiales. Esto significa:
- Se usan primero los materiales que llegaron primero
- El costo refleja el precio histórico exacto
- Es el método más preciso para costos reales

### Ficha Técnica
Define qué materiales necesita cada producto:
- Cantidad de tela
- Cantidad de hilos
- Botones, cremalleras, etc.
- Todas las materias primas necesarias

### Kardex
Registro histórico de movimientos de inventario:
- Entradas de materiales
- Salidas/consumos
- Cálculo automático de precios PEPS

## 📞 Información Técnica

### Base de Datos
Se agregaron 7 nuevos campos a la tabla `op_items`:
- `costo_materia_prima` - Costo total de materiales
- `precio_calculado` - Precio por unidad
- `total_calculado` - Total (precio × cantidad)
- `detalles_costos` - JSON con desglose
- `pdf_ruta` - Ubicación del PDF
- `procesado` - Bandera de procesamiento
- `fecha_procesamiento` - Cuándo se procesó

### Endpoints API

**Procesar Orden Completa**
```
POST /api/ordenes-produccion/:id/procesar-completa
```

Respuesta exitosa:
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
    "pdf_ruta": "/uploads/ordenes-produccion/OP-2024-001-2024-01-15.pdf",
    "items_detalles": [...]
  }
}
```

## ✨ Características Destacadas

1. **Cálculo Automático de Costos**
   - Basado en materiales reales
   - Usa histórico de precios (PEPS)
   - Preciso y confiable

2. **PDFs Profesionales**
   - Estructura idéntica a SIIGO
   - Incluye costos calculados
   - Listo para presentar a clientes

3. **Agrupamiento de Items**
   - Todos los items en una orden se procesan juntos
   - Una orden = un PDF
   - Resumen consolidado

4. **Tracking Completo**
   - Sabe qué se procesó y cuándo
   - Histórico de costos
   - Permite retrasos y auditoría

5. **Interfaz Amigable**
   - Botones claros
   - Mensajes de confirmación
   - Resultados detallados

## 🚀 Próximas Mejoras (Futuro)

- Descarga de PDFs desde la app
- Validación de disponibilidad de materiales
- Reporte de análisis de costos
- Integración directa con SIIGO
- Historial de versiones de órdenes

## 📚 Documentación Completa

Para más detalles técnicos, consulta:
```
PROCESAMIENTO_ORDENES_COMPLETAS.md
```

## 🎉 ¡Listo!

Tu sistema ahora está completamente funcional para procesar órdenes de producción completas con cálculo automático de costos.

**¿Preguntas?** Revisa los archivos generados:
- `backend/services/costoMateriaPrimaService.js` - Lógica de cálculo
- `backend/services/ordenProduccionPDFService.js` - Generación de PDFs
- `backend/controllers/ordenProduccionController.js` - API endpoint

¡Que disfrutes! 🚀
