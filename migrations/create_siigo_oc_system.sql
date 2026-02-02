-- Sistema de integración con SIIGO - Órdenes de Compra
-- Este script crea las tablas necesarias para procesar PDFs de SIIGO

-- Tabla para almacenar PDFs procesados de SIIGO
CREATE TABLE IF NOT EXISTS siigo_ocs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_oc VARCHAR(100) NOT NULL,
  fecha_oc DATE NOT NULL,
  cliente_nombre VARCHAR(255) NULL,
  cliente_nit VARCHAR(50) NULL,
  total_bruto DECIMAL(14, 4) DEFAULT 0,
  descuentos DECIMAL(14, 4) DEFAULT 0,
  subtotal DECIMAL(14, 4) DEFAULT 0,
  total_pagar DECIMAL(14, 4) DEFAULT 0,
  pdf_path VARCHAR(500) NULL,
  pdf_original_name VARCHAR(255) NULL,
  estado ENUM('PENDIENTE', 'EN_PROCESO', 'PROCESADA', 'ERROR') DEFAULT 'PENDIENTE',
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_siigo_oc_numero (numero_oc),
  INDEX idx_siigo_oc_fecha (fecha_oc),
  INDEX idx_siigo_oc_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla para items extraídos del PDF
CREATE TABLE IF NOT EXISTS siigo_oc_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siigo_oc_id INT NOT NULL,
  item_numero INT NOT NULL,
  descripcion TEXT NOT NULL,
  nombre_base VARCHAR(500) NULL, -- Nombre base extraído (antes del primer /)
  talla VARCHAR(50) NULL, -- Talla extraída (después del primer /)
  diseño VARCHAR(255) NULL, -- Diseño/complemento extraído
  cantidad DECIMAL(14, 4) NOT NULL,
  valor_unitario DECIMAL(14, 4) DEFAULT 0,
  valor_total DECIMAL(14, 4) DEFAULT 0,
  ficha_tecnica_id INT NULL, -- Ficha técnica asignada por el usuario
  orden_produccion_id INT NULL, -- Orden de producción creada
  estado ENUM('PENDIENTE', 'FICHA_ASIGNADA', 'PROCESADO', 'ERROR') DEFAULT 'PENDIENTE',
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_siigo_oc_items_oc (siigo_oc_id),
  INDEX idx_siigo_oc_items_ficha (ficha_tecnica_id),
  INDEX idx_siigo_oc_items_op (orden_produccion_id),
  INDEX idx_siigo_oc_items_estado (estado),
  FOREIGN KEY (siigo_oc_id) REFERENCES siigo_ocs(id) ON DELETE CASCADE,
  FOREIGN KEY (ficha_tecnica_id) REFERENCES fichas_tecnicas(id) ON DELETE SET NULL,
  FOREIGN KEY (orden_produccion_id) REFERENCES ordenes_produccion(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Relacionar ordenes_produccion con siigo_oc_id
-- Verificar si la columna ya existe antes de agregarla
ALTER TABLE ordenes_produccion 
ADD COLUMN siigo_oc_id INT NULL,
ADD INDEX idx_op_siigo_oc (siigo_oc_id);

-- Agregar foreign key solo si no existe
-- Nota: MySQL no soporta IF NOT EXISTS para foreign keys, se debe verificar manualmente
-- ALTER TABLE ordenes_produccion 
-- ADD CONSTRAINT fk_op_siigo_oc 
-- FOREIGN KEY (siigo_oc_id) REFERENCES siigo_ocs(id) ON DELETE SET NULL;
