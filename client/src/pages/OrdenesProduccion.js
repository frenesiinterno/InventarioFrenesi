import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Badge, Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ordenesProduccionAPI, productosAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaFilePdf, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

const parseEntero = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  return value;
};

const toEntero = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value).replace(/\s/g, ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const OrdenesProduccion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editing, setEditing] = useState(null);
  const [procesandoCompleta, setProcesandoCompleta] = useState(false);
  const [resultadoProceso, setResultadoProceso] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [formData, setFormData] = useState({
    numero_orden: '',
    producto_id: '',
    cantidad_producir: '',
    fecha_orden: new Date().toISOString().split('T')[0],
    estado: 'pendiente',
    observaciones: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordenesRes, productosRes] = await Promise.all([
        ordenesProduccionAPI.getAll(),
        productosAPI.getAll()
      ]);
      setOrdenes(ordenesRes.data.data || []);
      setProductos(productosRes.data.data || []);
    } catch (error) {
      toast.error('Error cargando datos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cantidad_producir: toEntero(formData.cantidad_producir)
      };

      if (!payload.producto_id || payload.cantidad_producir === null || payload.cantidad_producir <= 0) {
        toast.error('La cantidad a producir debe ser un entero positivo');
        return;
      }

      if (editing) {
        await ordenesProduccionAPI.update(editing.id, payload);
        toast.success('Orden actualizada');
      } else {
        await ordenesProduccionAPI.create(payload);
        toast.success('Orden creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEdit = (orden) => {
    setEditing(orden);
    setFormData({
      numero_orden: orden.numero_orden,
      producto_id: orden.producto_id,
      cantidad_producir: parseEntero(orden.cantidad_producir),
      fecha_orden: orden.fecha_orden,
      estado: orden.estado,
      observaciones: orden.observaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta orden?')) {
      try {
        await ordenesProduccionAPI.delete(id);
        toast.success('Orden eliminada');
        loadData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleProcesar = async (id) => {
    if (window.confirm('¿Procesar esta orden? Se descontarán los materiales del inventario.')) {
      try {
        await ordenesProduccionAPI.procesar(id);
        toast.success('Orden procesada exitosamente');
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al procesar orden');
      }
    }
  };

  const handleProcesarCompleta = async (ordenId) => {
    if (window.confirm('¿Procesar orden completa? Se calcularán los costos de materias primas y se generará un PDF con los precios calculados. Se descontarán los materiales del inventario.')) {
      setProcesandoCompleta(true);
      try {
        const response = await ordenesProduccionAPI.procesarCompleta(ordenId);
        setResultadoProceso(response.data.data);
        setShowResultModal(true);
        toast.success('Orden procesada exitosamente');
        // Recargar datos después de 1 segundo
        setTimeout(() => {
          loadData();
          handleVerDetalle(ordenDetalle);
        }, 1000);
      } catch (error) {
        console.error('Error al procesar orden completa:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error al procesar orden completa';
        toast.error(errorMsg);
        setResultadoProceso({
          error: true,
          message: errorMsg,
          detalles: error.response?.data?.detalles
        });
        setShowResultModal(true);
      } finally {
        setProcesandoCompleta(false);
      }
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      numero_orden: '',
      producto_id: '',
      cantidad_producir: '',
      fecha_orden: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      observaciones: ''
    });
  };

  const handlePDFUpload = async () => {
    if (!pdfFile) {
      toast.error('Selecciona un archivo PDF antes de continuar');
      return;
    }

    setUploadingPDF(true);
    setUploadProgress(10);

    try {
      const config = {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.min(Math.round((event.loaded * 100) / event.total), 90);
            setUploadProgress(percent);
          }
        }
      };

      const response = await ordenesProduccionAPI.cargarPDF(pdfFile, config);
      setUploadProgress(100);
      
      toast.success(response.data.message || 'Orden cargada exitosamente desde PDF');
      
      // Mostrar resumen si hay items que necesitan revisión
      if (response.data.data?.items_revision > 0) {
        toast.warning(
          `${response.data.data.items_revision} item(s) necesitan revisión manual. Revisa la orden para más detalles.`,
          { autoClose: 5000 }
        );
      }
      
      setShowPDFModal(false);
      setPdfFile(null);
      setUploadProgress(0);
      loadData();
    } catch (error) {
      console.error('Error al cargar PDF:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.detalles || error.message || 'Error al procesar el PDF';
      toast.error(errorMessage, { autoClose: 7000 });
      if (error.response?.data?.detalles) {
        console.error('Detalles del error:', error.response.data.detalles);
      }
      setUploadProgress(0);
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleVerDetalle = async (orden) => {
    try {
      const response = await ordenesProduccionAPI.getById(orden.id);
      setOrdenDetalle(response.data.data);
      setShowDetalleModal(true);
    } catch (error) {
      toast.error('Error al cargar los detalles de la orden');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: <Badge bg="warning">Pendiente</Badge>,
      en_proceso: <Badge bg="info">En Proceso</Badge>,
      completada: <Badge bg="success">Completada</Badge>,
      cancelada: <Badge bg="danger">Cancelada</Badge>
    };
    return badges[estado] || <Badge>{estado}</Badge>;
  };

  const getMatchBadge = (matchType) => {
    const badges = {
      exacto: <Badge bg="success">Exacto</Badge>,
      similar: <Badge bg="warning">Similar</Badge>,
      nuevo: <Badge bg="info">Nuevo</Badge>,
      no_encontrado: <Badge bg="danger">No encontrado</Badge>
    };
    return badges[matchType] || <Badge bg="secondary">{matchType}</Badge>;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2>Órdenes de Producción</h2>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={() => { setPdfFile(null); setShowPDFModal(true); }}>
            <FaFilePdf className="me-2" />
            Cargar desde PDF
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <FaPlus className="me-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Número Orden</th>
            <th>Producto</th>
            <th>Items</th>
            <th>Cantidad Total</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((orden) => (
            <tr key={orden.id}>
              <td><strong>{orden.numero_orden}</strong></td>
              <td>
                {orden.producto_nombre ? (
                  orden.producto_codigo ? `${orden.producto_codigo} - ${orden.producto_nombre}` : orden.producto_nombre
                ) : (
                  <span className="text-muted">Varios productos</span>
                )}
              </td>
              <td>
                {orden.total_items > 0 ? (
                  <Badge bg="info">{orden.total_items} item(s)</Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td>{orden.cantidad_producir || 0}</td>
              <td>{new Date(orden.fecha_orden).toLocaleDateString('es-CO')}</td>
              <td>{getEstadoBadge(orden.estado)}</td>
              <td>
                <div className="d-flex gap-1 flex-wrap">
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={() => handleVerDetalle(orden)}
                    title="Ver detalles"
                  >
                    <FaSearch />
                  </Button>
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={() => handleProcesar(orden.id)}
                    disabled={orden.estado === 'completada'}
                    title="Procesar orden"
                  >
                    <FaCheck />
                  </Button>
                  <Button variant="outline-primary" size="sm" onClick={() => handleEdit(orden)} title="Editar">
                    <FaEdit />
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(orden.id)} title="Eliminar">
                    <FaTrash />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {ordenes.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-muted py-4">
                No hay órdenes de producción registradas. Crea una nueva orden o carga un PDF.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Modal para cargar PDF */}
      <Modal show={showPDFModal} onHide={() => { setShowPDFModal(false); setPdfFile(null); setUploadProgress(0); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFilePdf className="me-2" />
            Cargar Orden desde PDF
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Archivo PDF de Orden de Producción *</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={uploadingPDF}
            />
            <Form.Text className="text-muted">
              Selecciona un archivo PDF con formato de orden de producción. El sistema extraerá automáticamente las referencias, tallas, diseños y códigos.
            </Form.Text>
          </Form.Group>
          
          {uploadProgress > 0 && uploadingPDF && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Procesando PDF...</span>
                <span>{uploadProgress}%</span>
              </div>
              <ProgressBar animated now={uploadProgress} />
            </div>
          )}

          {pdfFile && (
            <div className="alert alert-info">
              <strong>Archivo seleccionado:</strong> {pdfFile.name} ({(pdfFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => { setShowPDFModal(false); setPdfFile(null); setUploadProgress(0); }}
            disabled={uploadingPDF}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handlePDFUpload}
            disabled={!pdfFile || uploadingPDF}
          >
            {uploadingPDF ? 'Procesando...' : 'Cargar PDF'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de detalles de orden */}
      <Modal show={showDetalleModal} onHide={() => { setShowDetalleModal(false); setOrdenDetalle(null); }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Detalles de Orden: {ordenDetalle?.numero_orden}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {ordenDetalle && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Fecha de Orden:</strong> {new Date(ordenDetalle.fecha_orden).toLocaleDateString('es-CO')}
                </Col>
                <Col md={6}>
                  <strong>Estado:</strong> {getEstadoBadge(ordenDetalle.estado)}
                </Col>
              </Row>
              
              {ordenDetalle.observaciones && (
                <div className="mb-3">
                  <strong>Observaciones:</strong>
                  <p className="text-muted">{ordenDetalle.observaciones}</p>
                </div>
              )}

              {ordenDetalle.estadisticas && (
                <Card className="mb-3">
                  <Card.Header>Estadísticas</Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="h4 text-primary">{ordenDetalle.estadisticas.total_items || 0}</div>
                          <small className="text-muted">Total Items</small>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="h4 text-success">{ordenDetalle.estadisticas.items_exactos || 0}</div>
                          <small className="text-muted">Exactos</small>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="h4 text-warning">{ordenDetalle.estadisticas.items_similares || 0}</div>
                          <small className="text-muted">Similares</small>
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="text-center">
                          <div className="h4 text-danger">{ordenDetalle.estadisticas.items_no_encontrados || 0}</div>
                          <small className="text-muted">No encontrados</small>
                        </div>
                      </Col>
                    </Row>
                    {ordenDetalle.estadisticas.items_revision > 0 && (
                      <div className="mt-2 text-center">
                        <Badge bg="warning">
                          <FaExclamationTriangle className="me-1" />
                          {ordenDetalle.estadisticas.items_revision} item(s) necesitan revisión
                        </Badge>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              <h5 className="mb-3">Items de la Orden</h5>
              {ordenDetalle.items && ordenDetalle.items.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Referencia</th>
                        <th>Talla</th>
                        <th>Diseño</th>
                        <th>Match</th>
                        <th>Producto</th>
                        <th>Precio Unit.</th>
                        <th>Cantidad</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenDetalle.items.map((item, idx) => (
                        <tr key={item.id || idx} className={item.necesita_revision ? 'table-warning' : ''}>
                          <td><code>{item.codigo_item || '-'}</code></td>
                          <td>
                            <div>
                              <strong>{item.referencia_prenda}</strong>
                              {item.necesita_revision && (
                                <FaExclamationTriangle className="ms-2 text-warning" title="Necesita revisión" />
                              )}
                            </div>
                          </td>
                          <td>{item.talla || '-'}</td>
                          <td>{item.diseno || '-'}</td>
                          <td>{getMatchBadge(item.producto_match_type)}</td>
                          <td>
                            {item.producto_nombre ? (
                              <div>
                                <div>{item.producto_nombre}</div>
                                {item.producto_sugerido_nombre && item.producto_sugerido_nombre !== item.producto_nombre && (
                                  <small className="text-muted">Sugerido: {item.producto_sugerido_nombre}</small>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">No asignado</span>
                            )}
                          </td>
                          <td>
                            {item.precio_unitario ? `$${parseFloat(item.precio_unitario).toLocaleString('es-CO', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td>{item.cantidad}</td>
                          <td>
                            {item.total ? `$${parseFloat(item.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  No hay items registrados para esta orden.
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDetalleModal(false); setOrdenDetalle(null); }}>
            Cerrar
          </Button>
          {ordenDetalle?.estado !== 'completada' && ordenDetalle?.items?.length > 0 && (
            <Button 
              variant="success" 
              onClick={() => handleProcesarCompleta(ordenDetalle.id)}
              disabled={procesandoCompleta || ordenDetalle?.items?.some(item => !item.producto_id)}
              title={ordenDetalle?.items?.some(item => !item.producto_id) ? "Todos los items deben tener un producto asignado" : ""}
            >
              {procesandoCompleta ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Procesando...
                </>
              ) : (
                <>
                  <FaCheck className="me-2" />
                  Procesar Orden Completa
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Modal de resultados de procesamiento */}
      <Modal show={showResultModal} onHide={() => { setShowResultModal(false); setResultadoProceso(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {resultadoProceso?.error ? (
              <>
                <FaExclamationTriangle className="me-2 text-danger" />
                Error al Procesar
              </>
            ) : (
              <>
                <FaCheck className="me-2 text-success" />
                Orden Procesada Exitosamente
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resultadoProceso && (
            <>
              {resultadoProceso.error ? (
                <div className="alert alert-danger mb-3">
                  <strong>Error:</strong> {resultadoProceso.message}
                  {resultadoProceso.detalles && (
                    <pre className="mt-2 p-2 bg-light rounded" style={{fontSize: '0.75rem', maxHeight: '300px', overflow: 'auto'}}>
                      {typeof resultadoProceso.detalles === 'string' ? resultadoProceso.detalles : JSON.stringify(resultadoProceso.detalles, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <>
                  <Card className="mb-3">
                    <Card.Header className="bg-success text-white">Resumen de Procesamiento</Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Total de Items:</strong> {resultadoProceso.total_items || 0}
                          </div>
                          <div className="mb-2">
                            <strong>Items Procesados:</strong> {resultadoProceso.items_procesados || 0}
                          </div>
                          <div className="mb-2">
                            <strong>Cantidad Total:</strong> {resultadoProceso.cantidad_total || 0}
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Costo Total Materias Primas:</strong> ${parseFloat(resultadoProceso.costo_total_materias || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="mb-2">
                            <strong>Precio Total Calculado:</strong> ${parseFloat(resultadoProceso.precio_total_calculado || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="mb-2">
                            <strong>Estado de Orden:</strong> <Badge bg="success">{resultadoProceso.estado_orden || 'completada'}</Badge>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {resultadoProceso.pdf_generado && (
                    <div className="alert alert-info mb-3">
                      <FaFilePdf className="me-2" />
                      <strong>PDF Generado:</strong> {resultadoProceso.pdf_ruta}
                    </div>
                  )}

                  {resultadoProceso.items_detalles && resultadoProceso.items_detalles.length > 0 && (
                    <div>
                      <h6 className="mb-2">Detalles de Items Procesados</h6>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Producto</th>
                              <th>Cantidad</th>
                              <th>Costo Materias</th>
                              <th>Precio Unit.</th>
                              <th>Total Calculado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultadoProceso.items_detalles.map((item, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{item.producto_nombre || '-'}</td>
                                <td>{item.cantidad}</td>
                                <td>${parseFloat(item.costo_materia_prima || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                                <td>${parseFloat(item.precio_calculado || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                                <td>${parseFloat(item.total_calculado || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowResultModal(false); setResultadoProceso(null); }}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para crear/editar orden */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Editar' : 'Nueva'} Orden de Producción</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Número de Orden *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numero_orden}
                    onChange={(e) => setFormData({ ...formData, numero_orden: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Producto</Form.Label>
                  <Form.Select
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                  >
                    <option value="">Seleccione... (opcional si carga desde PDF)</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `${p.codigo} - ${p.nombre}` : p.nombre}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Opcional: Si carga desde PDF, este campo se llenará automáticamente
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Cantidad a Producir *</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={formData.cantidad_producir}
                    onChange={(e) => setFormData({ ...formData, cantidad_producir: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha de Orden *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.fecha_orden}
                    onChange={(e) => setFormData({ ...formData, fecha_orden: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </Form.Group>
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
    </Container>
  );
};

export default OrdenesProduccion;

