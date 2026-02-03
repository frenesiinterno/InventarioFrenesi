import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Materia Prima
export const materiaPrimaAPI = {
  getAll: () => api.get('/materia-prima'),
  getById: (id) => api.get(`/materia-prima/${id}`),
  create: (data) => api.post('/materia-prima', data),
  update: (id, data) => api.put(`/materia-prima/${id}`, data),
  delete: (id) => api.delete(`/materia-prima/${id}`),
  getTipos: () => api.get('/materia-prima/tipos'),
  getUnidades: () => api.get('/materia-prima/unidades'),
  getByTipo: (tipoId) => api.get(`/materia-prima/tipo/${tipoId}`),
  getStockBajo: () => api.get('/materia-prima/stock-bajo')
};

// Productos
export const productosAPI = {
  getAll: () => api.get('/productos'),
  getTopCostosos: () => api.get('/productos/top-costosos'),
  getById: (id) => api.get(`/productos/${id}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  delete: (id) => api.delete(`/productos/${id}`)
};

// Fichas Técnicas
export const fichasTecnicasAPI = {
  getByProducto: (productoId) => api.get(`/fichas-tecnicas/producto/${productoId}`),
  create: (data) => api.post('/fichas-tecnicas', data),
  update: (id, data) => api.put(`/fichas-tecnicas/${id}`, data),
  delete: (id) => api.delete(`/fichas-tecnicas/${id}`)
};

// Órdenes de Producción
export const ordenesProduccionAPI = {
  getAll: () => api.get('/ordenes-produccion'),
  getById: (id) => api.get(`/ordenes-produccion/${id}`),
  getItems: (id) => api.get(`/ordenes-produccion/${id}/items`),
  create: (data) => api.post('/ordenes-produccion', data),
  update: (id, data) => api.put(`/ordenes-produccion/${id}`, data),
  delete: (id) => api.delete(`/ordenes-produccion/${id}`),
  procesar: (id) => api.post(`/ordenes-produccion/${id}/procesar`),
  procesarCompleta: (id) => api.post(`/ordenes-produccion/${id}/procesar-completa`),
  cargarPDF: (file, config = {}) => {
    const formData = new FormData();
    formData.append('archivo', file);
    return api.post('/ordenes-produccion/cargar-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
  }
};

// Alertas
export const alertasAPI = {
  getAll: () => api.get('/alertas'),
  getNoLeidas: () => api.get('/alertas/no-leidas'),
  verificar: () => api.post('/alertas/verificar'),
  marcarLeida: (id) => api.put(`/alertas/${id}/leida`),
  marcarTodasLeidas: () => api.put('/alertas/marcar-todas-leidas'),
  delete: (id) => api.delete(`/alertas/${id}`)
};

// Inventario
export const inventarioAPI = {
  getMovimientos: () => api.get('/inventario/movimientos'),
  getMovimientosByMateria: (materiaPrimaId) => api.get(`/inventario/movimientos/materia/${materiaPrimaId}`),
  getResumen: () => api.get('/inventario/resumen'),
  createMovimiento: (data) => api.post('/inventario/movimientos', data)
};

// Importaciones
export const importacionesAPI = {
  cargarCatalogo: (file, config = {}) => {
    const formData = new FormData();
    formData.append('archivo', file);
    return api.post('/importaciones/catalogo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
  },
  cargarFichas: (file, config = {}) => {
    const formData = new FormData();
    formData.append('archivo', file);
    return api.post('/importaciones/fichas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
  }
};

// Kardex
export const kardexAPI = {
  getMovimientosByMateria: (materiaPrimaId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/kardex/materia/${materiaPrimaId}/movimientos${queryParams ? '?' + queryParams : ''}`);
  },
  getSaldoActual: (materiaPrimaId) => api.get(`/kardex/materia/${materiaPrimaId}/saldo`),
  getCostoPromedio: (materiaPrimaId) => api.get(`/kardex/materia/${materiaPrimaId}/costo-promedio`),
  getPronosticoConsumo: (materiaPrimaId, dias = 30) => api.get(`/kardex/materia/${materiaPrimaId}/pronostico?dias=${dias}`),
  getAnalisisConsumo: (materiaPrimaId, fechaDesde, fechaHasta) => {
    const params = new URLSearchParams({ fechaDesde, fechaHasta }).toString();
    return api.get(`/kardex/materia/${materiaPrimaId}/analisis?${params}`);
  }
};

// Proveedores
export const proveedoresAPI = {
  getAll: (incluirInactivos = false) => api.get(`/proveedores${incluirInactivos ? '?incluirInactivos=true' : ''}`),
  getById: (id) => api.get(`/proveedores/${id}`),
  create: (data) => api.post('/proveedores', data),
  update: (id, data) => api.put(`/proveedores/${id}`, data),
  delete: (id) => api.delete(`/proveedores/${id}`),
  getCompras: (id) => api.get(`/proveedores/${id}/compras`)
};

// Compras
export const comprasAPI = {
  getAll: () => api.get('/compras'),
  getById: (id) => api.get(`/compras/${id}`),
  create: (data) => api.post('/compras', data),
  delete: (id) => api.delete(`/compras/${id}`)
};

// SIIGO OCs
export const siigoOcAPI = {
  getAll: () => api.get('/siigo-ocs'),
  getById: (id) => api.get(`/siigo-ocs/${id}`),
  deleteOc: (id) => api.delete(`/siigo-ocs/${id}`),
  procesarPDF: (formData) => api.post('/siigo-ocs/procesar-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  asignarFichaTecnica: (itemId, fichaTecnicaId) => 
    api.post(`/siigo-ocs/items/${itemId}/asignar-ficha`, { ficha_tecnica_id: fichaTecnicaId }),
  procesarItem: (itemId, referenciaPrenda) => 
    api.post(`/siigo-ocs/items/${itemId}/procesar`, { referencia_prenda: referenciaPrenda }),
  buscarFichasTecnicas: (nombre) => api.get(`/siigo-ocs/buscar/fichas-tecnicas?nombre=${encodeURIComponent(nombre)}`)
};

export default api;

