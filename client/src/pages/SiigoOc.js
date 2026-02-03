import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Card, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { siigoOcAPI } from '../services/api';
import { FaUpload, FaEye, FaCheck, FaTimes, FaExclamationTriangle, FaFilePdf, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const SiigoOc = () => {
  const navigate = useNavigate();
  const [ocs, setOcs] = useState([]);
  const [ocSeleccionada, setOcSeleccionada] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showFichasModal, setShowFichasModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [fichasSugeridas, setFichasSugeridas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [stockAlertas, setStockAlertas] = useState([]);
  const [stockItemInfo, setStockItemInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await siigoOcAPI.getAll();
      setOcs(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando órdenes de compra');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF');
        return;
      }
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Seleccione un archivo PDF');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await siigoOcAPI.procesarPDF(formData);
      
      toast.success(res.data.message || 'PDF procesado correctamente');
      setShowUploadModal(false);
      setFile(null);
      
      // Cargar la OC procesada
      const ocRes = await siigoOcAPI.getById(res.data.data.oc.id);
      setOcSeleccionada(ocRes.data.data);
      setShowDetalleModal(true);
      
      // Guardar fichas sugeridas
      if (res.data.data.fichas_sugeridas) {
        setFichasSugeridas(res.data.data.fichas_sugeridas);
      }
      
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (ocId) => {
    try {
      const res = await siigoOcAPI.getById(ocId);
      setOcSeleccionada(res.data.data);
      setShowDetalleModal(true);
    } catch (error) {
      toast.error('Error cargando detalle');
    }
  };

  const handleAsignarFicha = async (itemId, fichaTecnicaId) => {
    try {
      if (!fichaTecnicaId) {
        toast.error('Debe seleccionar una ficha técnica válida');
        return;
      }
      await siigoOcAPI.asignarFichaTecnica(itemId, fichaTecnicaId);
      toast.success('Ficha técnica asignada');
      setShowFichasModal(false);
      setItemSeleccionado(null);
      if (ocSeleccionada) {
        const res = await siigoOcAPI.getById(ocSeleccionada.id);
        setOcSeleccionada(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al asignar ficha técnica');
    }
  };

  const handleProcesarItem = async (item) => {
    if (!item.ficha_tecnica_id) {
      toast.error('Debe asignar una ficha técnica primero');
      return;
    }
    
    if (!window.confirm(`¿Procesar item ${item.item_numero}? Esto creará una orden de producción y descontará materiales del inventario.`)) {
      return;
    }

    try {
      const referenciaPrenda = `${ocSeleccionada?.items?.find(i => i.id === item.id)?.nombre_base || ''} - ${item.talla || ''}`;
      const res = await siigoOcAPI.procesarItem(item.id, referenciaPrenda);
      
      if (res.data.data.alertas_stock && res.data.data.alertas_stock.length > 0) {
        toast.warning('Item procesado, pero hay alertas de stock');
      } else {
        toast.success('Item procesado correctamente');
      }
      
      if (ocSeleccionada) {
        const ocRes = await siigoOcAPI.getById(ocSeleccionada.id);
        setOcSeleccionada(ocRes.data.data);
      }
      loadData();
    } catch (error) {
      if (error.response?.data?.alertas_stock) {
        const alertas = error.response.data.alertas_stock;
        setStockAlertas(alertas);
        setStockItemInfo({ item_numero: item.item_numero, nombre_base: item.nombre_base || item.descripcion });
        setShowStockModal(true);
      } else {
        toast.error(error.response?.data?.message || 'Error al procesar item');
      }
    }
  };

  const handleEliminarOc = async (oc) => {
    const confirmText = `¿Eliminar la OC ${oc.numero_oc}?\n\nSolo se puede eliminar si NO tiene items procesados (sin descuentos).`;
    if (!window.confirm(confirmText)) return;

    try {
      await siigoOcAPI.deleteOc(oc.id);
      toast.success('OC eliminada correctamente');
      setShowDetalleModal(false);
      setOcSeleccionada(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar la OC');
    }
  };
  const handleBuscarFichas = async (item) => {
    setItemSeleccionado(item);
    try {
      const res = await siigoOcAPI.buscarFichasTecnicas(item.nombre_base || item.descripcion);
      setFichasSugeridas({ [item.item_numero]: res.data.data || [] });
      setShowFichasModal(true);
    } catch (error) {
      toast.error('Error buscando fichas técnicas');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: <Badge bg="secondary">Pendiente</Badge>,
      EN_PROCESO: <Badge bg="info">En Proceso</Badge>,
      PROCESADA: <Badge bg="success">Procesada</Badge>,
      ERROR: <Badge bg="danger">Error</Badge>
    };
    return badges[estado] || <Badge>{estado}</Badge>;
  };

  const getItemEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: <Badge bg="warning">Sin Ficha</Badge>,
      FICHA_ASIGNADA: <Badge bg="info">Ficha Asignada</Badge>,
      PROCESADO: <Badge bg="success">Procesado</Badge>,
      ERROR: <Badge bg="danger">Error</Badge>
    };
    return badges[estado] || <Badge>{estado}</Badge>;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Órdenes de Compra SIIGO</h2>
        <Button variant="success" onClick={() => setShowUploadModal(true)}>
          <FaUpload className="me-2" />
          Subir PDF OC
        </Button>
      </div>

      <Card className="glass-card">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0 align-middle">
            <thead className="glass-header">
              <tr>
                <th className="ps-4 border-0">N° OC</th>
                <th className="border-0">Fecha</th>
                <th className="border-0">Cliente</th>
                <th className="border-0">Items</th>
                <th className="border-0">Total</th>
                <th className="border-0">Estado</th>
                <th className="border-0 text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No hay órdenes de compra registradas
                  </td>
                </tr>
              ) : (
                ocs.map((oc) => (
                  <tr key={oc.id}>
                    <td className="ps-4"><strong>{oc.numero_oc}</strong></td>
                    <td>{new Date(oc.fecha_oc).toLocaleDateString('es-CO')}</td>
                    <td>{oc.cliente_nombre || '-'}</td>
                    <td>{oc.total_items || 0}</td>
                    <td>${parseFloat(oc.total_pagar || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                    <td>{getEstadoBadge(oc.estado)}</td>
                    <td className="text-end pe-4">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleVerDetalle(oc.id)}
                        className="me-2"
                      >
                        <FaEye />
                      </Button>
                      {(Number(oc.items_procesados || 0) === 0) && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleEliminarOc(oc)}
                          title="Eliminar OC (solo si no está procesada)"
                        >
                          <FaTrash />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal de Subir PDF */}
      <Modal show={showUploadModal} onHide={() => { setShowUploadModal(false); setFile(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>Subir Orden de Compra SIIGO</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpload}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Archivo PDF</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                required
              />
              <Form.Text className="text-muted">
                Seleccione el PDF de la orden de compra generado por SIIGO
              </Form.Text>
            </Form.Group>
            {file && (
              <Alert variant="info">
                <FaFilePdf className="me-2" />
                Archivo seleccionado: {file.name}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowUploadModal(false); setFile(null); }}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !file}>
              {loading ? <><Spinner size="sm" className="me-2" /> Procesando...</> : 'Subir y Procesar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Detalle de OC */}
      <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            OC: {ocSeleccionada?.numero_oc} - {ocSeleccionada?.cliente_nombre || 'Sin cliente'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {ocSeleccionada && (
            <>
              <Row className="mb-3">
                <Col md={4}>
                  <strong>Fecha:</strong> {new Date(ocSeleccionada.fecha_oc).toLocaleDateString('es-CO')}
                </Col>
                <Col md={4}>
                  <strong>Cliente:</strong> {ocSeleccionada.cliente_nombre || '-'}
                </Col>
                <Col md={4}>
                  <strong>Total:</strong> ${parseFloat(ocSeleccionada.total_pagar || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </Col>
              </Row>

              <h5 className="mb-3">Items de la Orden</h5>
              {ocSeleccionada.items && ocSeleccionada.items.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Ficha Técnica</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocSeleccionada.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_numero}</td>
                        <td>
                          <div>
                            <strong>{item.nombre_base || item.descripcion}</strong>
                            {item.talla && (
                              <>
                                <br />
                                <small>
                                  Talla: {item.talla}{item.diseno ? ` / ${item.diseno}` : ''}
                                </small>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="text-end">{parseFloat(item.cantidad).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                        <td>
                          {item.producto_nombre ? (
                            <Badge bg="success">{item.producto_nombre}</Badge>
                          ) : (
                            <Badge bg="warning">Sin asignar</Badge>
                          )}
                        </td>
                        <td>{getItemEstadoBadge(item.estado)}</td>
                        <td>
                          {!item.ficha_tecnica_id ? (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleBuscarFichas(item)}
                              className="me-1"
                            >
                              Buscar Ficha
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline-info" 
                                size="sm" 
                                onClick={() => handleBuscarFichas(item)}
                                className="me-1"
                                title="Cambiar ficha técnica"
                              >
                                Cambiar
                              </Button>
                              {item.estado !== 'PROCESADO' && (
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  onClick={() => handleProcesarItem(item)}
                                >
                                  Procesar
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No hay items en esta orden</Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {ocSeleccionada && (ocSeleccionada.items || []).every(i => i.estado !== 'PROCESADO' && !i.orden_produccion_id) && (
            <Button variant="outline-danger" onClick={() => handleEliminarOc(ocSeleccionada)}>
              <FaTrash className="me-2" /> Eliminar OC
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Selección de Fichas Técnicas */}
      <Modal show={showFichasModal} onHide={() => { setShowFichasModal(false); setItemSeleccionado(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Seleccionar Ficha Técnica - Item {itemSeleccionado?.item_numero}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {itemSeleccionado && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>Producto:</strong> {itemSeleccionado.nombre_base || itemSeleccionado.descripcion}
                {itemSeleccionado.talla && <><br /><strong>Talla:</strong> {itemSeleccionado.talla}</>}
              </Alert>

              {fichasSugeridas[itemSeleccionado.item_numero] && 
               fichasSugeridas[itemSeleccionado.item_numero].length > 0 ? (
                <>
                  <p className="text-muted mb-3">
                    Se encontraron {fichasSugeridas[itemSeleccionado.item_numero].length} fichas técnicas similares. 
                    Seleccione la correcta:
                  </p>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Similitud</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichasSugeridas[itemSeleccionado.item_numero].map((ficha) => (
                        <tr key={ficha.ficha_id}>
                          <td>{ficha.producto_nombre}</td>
                          <td>{ficha.producto_codigo || '-'}</td>
                          <td>
                            <Badge bg={ficha.score > 0.7 ? 'success' : ficha.score > 0.4 ? 'warning' : 'secondary'}>
                              {(ficha.score * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                handleAsignarFicha(itemSeleccionado.id, ficha.ficha_id);
                              }}
                            >
                              Seleccionar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : (
                <Alert variant="warning">
                  <FaExclamationTriangle className="me-2" />
                  No se encontraron fichas técnicas que coincidan con este producto.
                  <br />
                  <Button 
                    variant="link" 
                    className="p-0 mt-2"
                    onClick={() => {
                      setShowFichasModal(false);
                      navigate('/fichas-tecnicas');
                    }}
                  >
                    Crear nueva ficha técnica
                  </Button>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowFichasModal(false); setItemSeleccionado(null); }}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Stock Insuficiente */} 
      <Modal show={showStockModal} onHide={() => { setShowStockModal(false); setStockAlertas([]); setStockItemInfo(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Stock insuficiente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <FaExclamationTriangle className="me-2" />
            No se puede procesar el item <strong>{stockItemInfo?.item_numero}</strong> porque falta materia prima.
          </Alert>

          {stockAlertas.length > 0 && (
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Materia Prima</th>
                  <th className="text-end">Stock Actual</th>
                  <th className="text-end">Necesario</th>
                  <th className="text-end">Faltante</th>
                </tr>
              </thead>
              <tbody>
                {stockAlertas.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.materia}</td>
                    <td className="text-end">{parseFloat(a.stock_actual).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                    <td className="text-end">{parseFloat(a.cantidad_necesaria).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                    <td className="text-end fw-bold text-danger">{parseFloat(a.faltante).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <Alert variant="info" className="mb-0">
            Puedes hacer una <strong>compra</strong> o una <strong>entrada</strong> en <strong>Movimientos</strong> para aumentar stock, y luego volver a procesar.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => { setShowStockModal(false); navigate('/inventario'); }}>
            Ir a Movimientos
          </Button>
          <Button variant="secondary" onClick={() => { setShowStockModal(false); setStockAlertas([]); setStockItemInfo(null); }}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SiigoOc;
