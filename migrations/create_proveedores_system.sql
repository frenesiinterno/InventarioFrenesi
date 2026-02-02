-- Sistema de Proveedores
-- Este script crea las tablas necesarias para gestionar proveedores y sus compras

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  nit VARCHAR(50) NULL,
  telefono VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  direccion TEXT NULL,
  contacto VARCHAR(255) NULL,
  activo BOOLEAN DEFAULT TRUE,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proveedores_nombre (nombre),
  INDEX idx_proveedores_nit (nit),
  INDEX idx_proveedores_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla de Compras (para agrupar múltiples materiales comprados al mismo proveedor)
CREATE TABLE IF NOT EXISTS compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NULL,
  proveedor_nombre VARCHAR(255) NULL, -- Para proveedores no registrados
  numero_factura VARCHAR(100) NULL,
  fecha_compra DATE NOT NULL,
  fecha_factura DATE NULL,
  total DECIMAL(14, 4) DEFAULT 0,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_compras_proveedor (proveedor_id),
  INDEX idx_compras_fecha (fecha_compra),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla de Items de Compra (múltiples materiales por compra)
CREATE TABLE IF NOT EXISTS compra_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  compra_id INT NOT NULL,
  materia_prima_id INT NOT NULL,
  cantidad DECIMAL(14, 4) NOT NULL,
  costo_unitario DECIMAL(14, 4) NOT NULL,
  subtotal DECIMAL(14, 4) NOT NULL,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_compra_items_compra (compra_id),
  INDEX idx_compra_items_materia (materia_prima_id),
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Actualizar kardex_movimientos para relacionar con compras
-- Nota: MySQL no soporta IF NOT EXISTS en ALTER TABLE, verificar manualmente
ALTER TABLE kardex_movimientos 
ADD COLUMN compra_id INT NULL AFTER referencia_id;

CREATE INDEX idx_kardex_compra ON kardex_movimientos(compra_id);

ALTER TABLE kardex_movimientos 
ADD CONSTRAINT fk_kardex_compra 
FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE SET NULL;

