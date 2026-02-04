# Análisis y Mejoras del Proyecto InventarioFrenesi

## 📋 Resumen Ejecutivo
El proyecto presenta **inconsistencias críticas** con el alcance funcional definido. Se requiere una refactorización completa para alinear con los principios PEPS y el flujo de costos por lotes.

## 🚨 Inconsistencias Críticas Identificadas

### 1. **Modelo de Kardex Inconsistente** ✅ **CORREGIDO**
- **Problema**: KardexModel.js referencia tablas inexistentes (`kardex_movimientos`, `kardex_capas`)
- **Solución**: Refactorizado para usar `lotes_materia_prima` y `kardex` del schema actual
- **Impacto**: Lógica de PEPS ahora funciona correctamente

### 2. **Nombres de Tablas Inconsistentes** ✅ **CORREGIDO**
- **Problema**: Código usa `productos` vs schema `prendas`
- **Solución**: OrdenProduccionModel.js actualizado para usar `prendas` y `ordenes_items`
- **Archivos afectados**: OrdenProduccionModel.js, controllers

### 3. **Estados de Órdenes Incorrectos** ❌ **PENDIENTE**
- **Actual**: `pendiente`, `costeada`, `producida`
- **Requerido**: `pendiente_asignacion`, `lista_para_costear`, `costeada`, `error_costeo`
- **Impacto**: Flujo de trabajo roto

### 4. **Cálculo de Costos Incorrecto** ✅ **CORREGIDO**
- **Problema**: Usa costo promedio en lugar de PEPS por lotes
- **Solución**: CostoPrendaService actualizado para simular PEPS por lotes
- **Alcance**: "El costo NO pertenece a la materia prima"

## 🎯 Plan de Mejoras Priorizadas

### **FASE 1: Corrección de Kardex PEPS (CRÍTICA)**
- [ ] Crear migración para alinear schema con Kardex PEPS
- [ ] Refactorizar KardexModel.js para usar `lotes_materia_prima`
- [ ] Implementar lógica PEPS estricta (FIFO por lotes)
- [ ] Actualizar CostoPrendaService para usar costos por lote

### **FASE 2: Alineación de Modelos**
- [ ] Unificar nomenclatura: `prendas` vs `productos`
- [ ] Actualizar OrdenProduccionModel.js
- [ ] Corregir referencias en controllers
- [ ] Validar foreign keys

### **FASE 3: Estados de Órdenes**
- [ ] Actualizar schema de `ordenes_produccion`
- [ ] Modificar lógica de procesamiento
- [ ] Implementar validaciones por estado

### **FASE 4: Validaciones Empresariales**
- [ ] Implementar regla: "Si no hay capas PEPS, no se puede costear"
- [ ] Bloquear edición manual de costos
- [ ] Forzar trazabilidad completa

### **FASE 5: Testing y Auditoría**
- [ ] Crear tests para lógica PEPS
- [ ] Implementar logging de auditoría
- [ ] Validar integridad de datos

## 🔧 Mejoras Técnicas Específicas

### **Kardex PEPS Implementation**
```sql
-- Schema corregido para PEPS
CREATE TABLE kardex (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lote_id INT NOT NULL,
  tipo ENUM('entrada','salida') NOT NULL,
  referencia_tipo ENUM('factura','orden') NOT NULL,
  referencia_id INT NOT NULL,
  cantidad DECIMAL(14,4) NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (lote_id) REFERENCES lotes_materia_prima(id)
);
```

### **Cálculo de Costos por Lote**
- Consumir lotes en orden FIFO
- Registrar cada consumo con costo específico del lote
- Mantener trazabilidad lote → orden → costo

### **Validaciones de Negocio**
- Verificar existencia de capas PEPS antes de costear
- Prevenir costos manuales
- Forzar ficha técnica obligatoria

## 📊 Impacto Empresarial

### **Antes (Estado Actual)**
- ❌ Costos inexactos
- ❌ Sin trazabilidad real
- ❌ Riesgo de inventario negativo
- ❌ Decisiones basadas en datos erróneos

### **Después (Objetivo)**
- ✅ Costos precisos por lote PEPS
- ✅ Trazabilidad completa
- ✅ Inventario controlado
- ✅ Información confiable para decisiones

## ⏱️ Timeline Estimado

- **Fase 1**: 2-3 días (crítica para operaciones)
- **Fase 2**: 1 día
- **Fase 3**: 1 día
- **Fase 4**: 2 días
- **Fase 5**: 1-2 días

## 🎯 Recomendaciones

1. **Detener operaciones** hasta corregir Kardex PEPS
2. **Hacer backup completo** antes de cambios
3. **Implementar por fases** con testing en cada una
4. **Documentar cambios** para auditoría
5. **Capacitar equipo** en nuevo flujo

---
*Análisis realizado basado en alcance funcional proporcionado y revisión de código actual.*
