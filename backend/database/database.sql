-- Base de datos para Sistema de Inventario Frenesi
CREATE DATABASE IF NOT EXISTS inventario_frenesi;
USE inventario_frenesi;

-- Tabla de Tipos de Materia Prima
CREATE TABLE IF NOT EXISTS tipos_materia_prima (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Unidades de Medida
CREATE TABLE IF NOT EXISTS unidades_medida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Materia Prima
CREATE TABLE IF NOT EXISTS materia_prima (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    tipo_id INT NOT NULL,
    unidad_medida_id INT NOT NULL,
    precio_unitario DECIMAL(12, 4) DEFAULT 0,
    stock_actual DECIMAL(14, 4) DEFAULT 0,
    stock_minimo DECIMAL(14, 4) DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tipo_id) REFERENCES tipos_materia_prima(id) ON DELETE RESTRICT,
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Fichas Técnicas (Relación Producto - Materia Prima)
CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    materia_prima_id INT NOT NULL,
    cantidad DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_producto_materia (producto_id, materia_prima_id)
);

-- Tabla de Órdenes de Producción
CREATE TABLE IF NOT EXISTS ordenes_produccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_orden VARCHAR(100) NOT NULL UNIQUE,
    producto_id INT NOT NULL,
    cantidad_producir INT NOT NULL,
    fecha_orden DATE NOT NULL,
    estado ENUM('pendiente', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

-- Tabla de Movimientos de Inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_prima_id INT NOT NULL,
    tipo_movimiento ENUM('entrada', 'salida', 'ajuste') NOT NULL,
    cantidad DECIMAL(10, 3) NOT NULL,
    orden_produccion_id INT NULL,
    motivo VARCHAR(255),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT,
    FOREIGN KEY (orden_produccion_id) REFERENCES ordenes_produccion(id) ON DELETE SET NULL
);

-- Tabla de Alertas
CREATE TABLE IF NOT EXISTS alertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_prima_id INT NOT NULL,
    tipo_alerta ENUM('stock_minimo', 'stock_critico', 'sin_stock') NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_materia_prima_tipo ON materia_prima(tipo_id);
CREATE INDEX idx_materia_prima_unidad ON materia_prima(unidad_medida_id);
CREATE INDEX idx_fichas_tecnicas_producto ON fichas_tecnicas(producto_id);
CREATE INDEX idx_fichas_tecnicas_materia ON fichas_tecnicas(materia_prima_id);
CREATE INDEX idx_ordenes_producto ON ordenes_produccion(producto_id);
CREATE INDEX idx_movimientos_materia ON movimientos_inventario(materia_prima_id);
CREATE INDEX idx_movimientos_orden ON movimientos_inventario(orden_produccion_id);
CREATE INDEX idx_alertas_materia ON alertas(materia_prima_id);
CREATE INDEX idx_alertas_leida ON alertas(leida);

-- Insertar unidades de medida iniciales
INSERT INTO unidades_medida (codigo, nombre, descripcion) VALUES
('M', 'Metro', 'Metros lineales'),
('ML', 'Mililitro', 'Mililitros'),
('UND', 'Unidad', 'Unidad estándar'),
('LT', 'Litro', 'Litros'),
('KG', 'Kilogramo', 'Kilogramos'),


-- Insertar tipos de materia prima iniciales
INSERT INTO tipos_materia_prima (nombre, descripcion) VALUES
('TELA', 'Telas y tejidos'),
('TINTA', 'Tintas para impresión'),
('HILO', 'Hilos de costura'),
('PAPEL', 'Papeles diversos'),
('OTROS', 'Otros materiales');

