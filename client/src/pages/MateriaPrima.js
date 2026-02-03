import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Badge, Row, Col, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { materiaPrimaAPI, kardexAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaChartLine } from 'react-icons/fa';

const parseDecimal = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatInputValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const MateriaPrima = () => {
  const [materias, setMaterias] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo_id: '',
    unidad_medida_id: '',
    stock_minimo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStock, setFilterStock] = useState('');
  
  // Estado para modal de Kardex
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [kardexMateria, setKardexMateria] = useState(null);
  const [kardexMovimientos, setKardexMovimientos] = useState([]);
  const [kardexSaldo, setKardexSaldo] = useState(null);
  const [kardexPronostico, setKardexPronostico] = useState(null);
  const [loadingKardex, setLoadingKardex] = useState(false);
  
 
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materiasRes, tiposRes, unidadesRes] = await Promise.all([
        materiaPrimaAPI.getAll(),
        materiaPrimaAPI.getTipos(),
        materiaPrimaAPI.getUnidades()
      ]);
      setMaterias(materiasRes.data.data || []);
      setTipos(tiposRes.data.data || []);
      setUnidades(unidadesRes.data.data || []);
    } catch (error) {
      toast.error('Error cargando datos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        codigo: formData.codigo?.trim() || null,
        nombre: formData.nombre?.trim(),
        tipo_id: formData.tipo_id,
        unidad_medida_id: formData.unidad_medida_id,
        precio_unitario: parseDecimal(formData.precio_unitario),
        stock_actual: parseDecimal(formData.stock_actual),
        stock_minimo: parseDecimal(formData.stock_minimo)
      };

      if (editing) {
        await materiaPrimaAPI.update(editing.id, payload);
        toast.success('Materia prima actualizada');
      } else {
        await materiaPrimaAPI.create(payload);
        toast.success('Materia prima creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };



  const handleEdit = (materia) => {
    setEditing(materia);
    setFormData({
      codigo: materia.codigo || '',
      nombre: materia.nombre || '',
      tipo_id: materia.tipo_id?.toString() || '',
      unidad_medida_id: materia.unidad_medida_id?.toString() || '',
      stock_minimo: formatInputValue(materia.stock_minimo)
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta materia prima?')) {
      try {
        await materiaPrimaAPI.delete(id);
        toast.success('Materia prima eliminada');
        loadData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      codigo: '',
      nombre: '',
      tipo_id: '',
      unidad_medida_id: '',
      stock_minimo: ''
    });
  };

  const getStockBadge = (stock, minimo) => {
    const stockValue = parseDecimal(stock);
    const minValue = parseDecimal(minimo);
    if (stockValue <= 0) return <Badge bg="danger">Sin Stock</Badge>;
    if (stockValue <= minValue) return <Badge bg="warning">Bajo</Badge>;
    return <Badge bg="success">Disponible</Badge>;
  };

  const findUnidadNombre = (materia) => materia.unidad_nombre || materia.unidad_codigo || '';

  const handleVerKardex = async (materia) => {
    setKardexMateria(materia);
    setShowKardexModal(true);
    setLoadingKardex(true);
    try {
      const [movimientosRes, saldoRes, pronosticoRes] = await Promise.all([
        kardexAPI.getMovimientosByMateria(materia.id, { limit: 100 }),
        kardexAPI.getSaldoActual(materia.id),
        kardexAPI.getPronosticoConsumo(materia.id, 30).catch(() => ({ data: { data: null } }))
      ]);
      setKardexMovimientos(movimientosRes.data.data || []);
      setKardexSaldo(saldoRes.data.data || null);
      setKardexPronostico(pronosticoRes.data.data || null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      toast.error(`Error cargando Kardex: ${errorMessage}`);
      console.error('Error completo:', error);
      // Si el error es que la tabla no existe, mostrar mensaje más claro
      if (errorMessage.includes('Table') && errorMessage.includes("doesn't exist")) {
        toast.error('Las tablas del Kardex no existen. Ejecuta las migraciones SQL primero.');
      }
    } finally {
      setLoadingKardex(false);
    }
  };

  const getTipoMovimientoBadge = (tipo) => {
    const badges = {
      'ENTRADA': <Badge bg="success">Entrada</Badge>,
      'SALIDA': <Badge bg="danger">Salida</Badge>,
      'AJUSTE': <Badge bg="warning">Ajuste</Badge>
    };
    return badges[tipo] || <Badge>{tipo}</Badge>;
  };

  const getReferenciaLabel = (referencia) => {
    const labels = {
      'COMPRA': 'Compra',
      'OP': 'Orden Producción',
      'MERMA': 'Merma',
      'AJUSTE': 'Ajuste',
      'OTRO': 'Otro'
    };
    return labels[referencia] || referencia;
  };

  const formatCurrency = (value) => {
    return `$${parseDecimal(value).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const filteredMaterias = materias.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (m.codigo && m.codigo.toLowerCase().includes(searchLower)) ||
      (m.nombre && m.nombre.toLowerCase().includes(searchLower));
    
    const matchTipo = filterTipo ? String(m.tipo_id) === String(filterTipo) : true;

    let matchStock = true;
    if (filterStock === 'bajo') {
      matchStock = parseDecimal(m.stock_actual) <= parseDecimal(m.stock_minimo);
    } else if (filterStock === 'sin_stock') {
      matchStock = parseDecimal(m.stock_actual) <= 0;
    }

    return matchSearch && matchTipo && matchStock;
  });

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Materia Prima</h2>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <FaPlus className="me-2" />
          Nueva Materia Prima
        </Button>
      </div>

      <Card className="glass-card mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={5}>
              <Form.Label>Buscar</Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Filtrar por Tipo</Form.Label>
              <Form.Select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
              >
                <option value="">Todos los Tipos</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </Form.Select>
            </Col>
             <Col md={2}>
              <Form.Label>Filtrar Stock</Form.Label>
              <Form.Select
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
              >
                <option value="">Todo el Stock</option>
                <option value="bajo">Stock Bajo/Crítico</option>
                <option value="sin_stock">Sin Stock</option>
              </Form.Select>
            </Col>
            <Col md={2} className="text-end">
             <Button 
                className="btn-primary-custom w-100" 
                onClick={() => { resetForm(); setShowModal(true); }}>
                <FaPlus className="me-2" /> Nuevo
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="glass-card">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0 align-middle">
            <thead className="glass-header">
              <tr>
                <th className="ps-4 border-0">Código</th>
                <th className="border-0">Nombre</th>
                <th className="border-0">Tipo</th>
                <th className="border-0">Unidad</th>
                <th className="border-0">Costo Promedio</th>
                <th className="border-0">Stock Actual</th>
                <th className="border-0">Stock Mínimo</th>
                <th className="border-0">Estado</th>
                <th className="border-0 text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterias.length === 0 ? (
                 <tr>
                   <td colSpan="9" className="text-center py-4">
                     No se encontraron materias primas
                   </td>
                 </tr>
              ) : (
                filteredMaterias.map((materia) => (
                  <tr key={materia.id}>
                    <td className="ps-4">{materia.codigo || '-'}</td>
                    <td><span className="fw-bold">{materia.nombre}</span></td>
                    <td><Badge bg="light" text="dark" className="border">{materia.tipo_nombre}</Badge></td>
                    <td>{findUnidadNombre(materia)}</td>
                    <td>
                      {materia.costo_promedio_kardex > 0 
                        ? formatCurrency(materia.costo_promedio_kardex)
                        : <span className="text-muted">-</span>
                      }
                    </td>
                    <td>
                      {materia.stock_actual_kardex !== undefined 
                        ? parseDecimal(materia.stock_actual_kardex).toLocaleString('es-CO', { minimumFractionDigits: 2 })
                        : parseDecimal(materia.stock_actual).toLocaleString('es-CO', { minimumFractionDigits: 2 })
                      }
                    </td>
                    <td>{parseDecimal(materia.stock_minimo).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                    <td>{getStockBadge(materia.stock_actual_kardex !== undefined ? materia.stock_actual_kardex : materia.stock_actual, materia.stock_minimo)}</td>
                    <td className="text-end pe-4">
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        className="me-2" 
                        onClick={() => handleVerKardex(materia)}
                        title="Ver Kardex"
                      >
                        <FaChartLine />
                      </Button>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(materia)}>
                        <FaEdit />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(materia.id)}>
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Editar' : 'Nueva'} Materia Prima</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Código (opcional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej: MP-001"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select
                    value={formData.tipo_id}
                    onChange={(e) => setFormData({ ...formData, tipo_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {tipos.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Unidad de Medida *</Form.Label>
                  <Form.Select
                    value={formData.unidad_medida_id}
                    onChange={(e) => setFormData({ ...formData, unidad_medida_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.codigo} - {unidad.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock Mínimo</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                    placeholder="Ej: 2,5"
                  />
                  <Form.Text className="text-muted">
                    {editing ? (
                      <>
                        <strong>Nota:</strong> El costo promedio y stock actual se calculan automáticamente desde el Kardex 
                        basado en las entradas y salidas registradas.
                      </>
                    ) : (
                      'El stock inicial y costo se registrarán al crear la primera entrada en el módulo de Movimientos.'
                    )}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editing ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Kardex */}
      <Modal show={showKardexModal} onHide={() => setShowKardexModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Kardex - {kardexMateria?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingKardex ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando movimientos del Kardex...</p>
            </div>
          ) : (
            <>
              {/* Resumen del Saldo Actual */}
              {kardexSaldo && (
                <Card className="mb-4 bg-light">
                  <Card.Body>
                    <Row>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Saldo Actual</div>
                          <div className="h4 mb-0">
                            {parseDecimal(kardexSaldo.cantidad).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} 
                            {' '}{kardexMovimientos[0]?.unidad_nombre || kardexMovimientos[0]?.unidad_codigo || ''}
                          </div>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Costo Total</div>
                          <div className="h4 mb-0">{formatCurrency(kardexSaldo.costo)}</div>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Costo Promedio</div>
                          <div className="h4 mb-0">{formatCurrency(kardexSaldo.costo_promedio)}</div>
                          <small className="text-muted">por {kardexMovimientos[0]?.unidad_nombre || kardexMovimientos[0]?.unidad_codigo || 'unidad'}</small>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Método de Costeo</div>
                          <div className="h5 mb-0">
                            <Badge bg="info">PEPS</Badge>
                          </div>
                          <small className="text-muted">Primeras Entradas Primeras Salidas</small>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Pronóstico de Consumo */}
              {kardexPronostico && kardexPronostico.consumo_promedio_diario > 0 && (
                <Card className={`mb-4 ${kardexPronostico.alerta_urgente ? 'border-danger' : kardexPronostico.alerta_preventiva ? 'border-warning' : 'border-info'}`}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">Pronóstico de Consumo</h5>
                      {kardexPronostico.alerta_urgente && (
                        <Badge bg="danger">⚠️ Alerta Urgente</Badge>
                      )}
                      {kardexPronostico.alerta_preventiva && !kardexPronostico.alerta_urgente && (
                        <Badge bg="warning">⚠️ Alerta Preventiva</Badge>
                      )}
                    </div>
                    <Row>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Consumo Promedio Diario</div>
                          <div className="h5 mb-0">
                            {parseDecimal(kardexPronostico.consumo_promedio_diario).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            {' '}{kardexMovimientos[0]?.unidad_nombre || kardexMovimientos[0]?.unidad_codigo || ''}
                          </div>
                          <small className="text-muted">Últimos {kardexPronostico.dias_analizados} días</small>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Consumo Total Período</div>
                          <div className="h5 mb-0">
                            {parseDecimal(kardexPronostico.consumo_total_periodo).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            {' '}{kardexMovimientos[0]?.unidad_nombre || kardexMovimientos[0]?.unidad_codigo || ''}
                          </div>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Días Restantes Estimados</div>
                          <div className={`h5 mb-0 ${kardexPronostico.alerta_urgente ? 'text-danger' : kardexPronostico.alerta_preventiva ? 'text-warning' : 'text-success'}`}>
                            {kardexPronostico.dias_restantes !== null ? kardexPronostico.dias_restantes : 'N/A'}
                          </div>
                          {kardexPronostico.dias_restantes !== null && (
                            <small className="text-muted">días</small>
                          )}
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="text-muted small">Fecha Estimada Agotamiento</div>
                          <div className={`h6 mb-0 ${kardexPronostico.alerta_urgente ? 'text-danger' : kardexPronostico.alerta_preventiva ? 'text-warning' : 'text-success'}`}>
                            {kardexPronostico.fecha_estimada_agotamiento 
                              ? new Date(kardexPronostico.fecha_estimada_agotamiento).toLocaleDateString('es-CO')
                              : 'N/A'}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Tabla de Movimientos */}
              <h5 className="mb-3">Movimientos del Kardex</h5>
              {kardexMovimientos.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No hay movimientos registrados en el Kardex para esta materia prima.
                </div>
              ) : (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Costo Unitario</th>
                      <th>Costo del Movimiento</th>
                      <th>Saldo Cantidad</th>
                      <th>Saldo Costo</th>
                      <th>Referencia</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexMovimientos.map((mov) => {
                      // Calcular el costo individual de este movimiento
                      const costoMovimiento = parseDecimal(mov.cantidad) * parseDecimal(mov.costo_unitario);
                      return (
                        <tr key={mov.id}>
                          <td>{new Date(mov.fecha).toLocaleString('es-CO')}</td>
                          <td>{getTipoMovimientoBadge(mov.tipo)}</td>
                          <td className="text-end">
                            {parseDecimal(mov.cantidad).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                          <td className="text-end">{formatCurrency(mov.costo_unitario)}</td>
                          <td className="text-end fw-bold">
                            {formatCurrency(costoMovimiento)}
                          </td>
                          <td className="text-end text-muted">
                            <small>
                              {parseDecimal(mov.saldo_cantidad).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </small>
                          </td>
                          <td className="text-end text-muted">
                            <small>{formatCurrency(mov.saldo_costo)}</small>
                          </td>
                          <td>
                            <Badge bg="secondary">{getReferenciaLabel(mov.referencia)}</Badge>
                            {mov.numero_orden && <div><small>{mov.numero_orden}</small></div>}
                          </td>
                          <td><small>{mov.motivo || '-'}</small></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowKardexModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal> 
    </Container>
  );
};

export default MateriaPrima;

