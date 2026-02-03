import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Card, Row, Col, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { inventarioAPI, materiaPrimaAPI, proveedoresAPI, comprasAPI } from '../services/api';
import { FaPlus, FaArrowUp, FaArrowDown, FaExchangeAlt, FaEye, FaTrash } from 'react-icons/fa';

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

const formatNumber = (value) => parseDecimal(value).toLocaleString('es-CO', { minimumFractionDigits: 2 });
const formatCurrency = (value) => `$${parseDecimal(value).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;

const Inventario = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [resumen, setResumen] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showCompraModal, setShowCompraModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [movimientoDetalle, setMovimientoDetalle] = useState(null);
  const [formData, setFormData] = useState({
    materia_prima_id: '',
    tipo_movimiento: 'entrada',
    cantidad: '',
    costo_unitario: '',
    motivo: '',
    observaciones: ''
  });
  const [compraData, setCompraData] = useState({
    proveedor_id: '',
    proveedor_nombre: '',
    numero_factura: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    fecha_factura: '',
    items: [],
    observaciones: ''
  });
  const [itemTemporal, setItemTemporal] = useState({
    materia_prima_id: '',
    cantidad: '',
    costo_unitario: '',
    observaciones: ''
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [movimientosRes, materiasRes, resumenRes, proveedoresRes, comprasRes] = await Promise.all([
        inventarioAPI.getMovimientos(),
        materiaPrimaAPI.getAll(),
        inventarioAPI.getResumen(),
        proveedoresAPI.getAll().catch(() => ({ data: { data: [] } })),
        comprasAPI.getAll().catch(() => ({ data: { data: [] } }))
      ]);
      setMovimientos(movimientosRes.data.data || []);
      setMaterias(materiasRes.data.data || []);
      setResumen(resumenRes.data.data || {});
      setProveedores(proveedoresRes.data.data || []);
      setCompras(comprasRes.data.data || []);
    } catch (error) {
      toast.error('Error cargando datos');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventarioAPI.createMovimiento({
        ...formData,
        cantidad: parseDecimal(formData.cantidad),
        costo_unitario: formData.tipo_movimiento === 'entrada' ? parseDecimal(formData.costo_unitario) : undefined
      });
      toast.success('Movimiento registrado');
      setShowModal(false);
      setFormData({
        materia_prima_id: '',
        tipo_movimiento: 'entrada',
        cantidad: '',
        costo_unitario: '',
        motivo: '',
        observaciones: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar movimiento');
    }
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      entrada: <FaArrowUp className="text-success" />,
      salida: <FaArrowDown className="text-danger" />,
      ajuste: <FaExchangeAlt className="text-warning" />
    };
    return icons[tipo] || null;
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      entrada: <Badge bg="success">Entrada</Badge>,
      salida: <Badge bg="danger">Salida</Badge>,
      ajuste: <Badge bg="warning">Ajuste</Badge>
    };
    return badges[tipo] || <Badge>{tipo}</Badge>;
  };

  const handleVerDetalle = async (movimiento) => {
    // Por ahora mostrar información básica, en el futuro se puede expandir
    setMovimientoDetalle(movimiento);
    setShowDetalleModal(true);
  };

  const resetCompraForm = () => {
    setCompraData({
      proveedor_id: '',
      proveedor_nombre: '',
      numero_factura: '',
      fecha_compra: new Date().toISOString().split('T')[0],
      fecha_factura: '',
      items: [],
      observaciones: ''
    });
    setItemTemporal({
      materia_prima_id: '',
      cantidad: '',
      costo_unitario: '',
      observaciones: ''
    });
  };

  const handleAgregarItem = () => {
    if (!itemTemporal.materia_prima_id || !itemTemporal.cantidad || !itemTemporal.costo_unitario) {
      toast.error('Complete todos los campos del item');
      return;
    }

    const materia = materias.find(m => m.id === parseInt(itemTemporal.materia_prima_id));
    const nuevoItem = {
      materia_prima_id: parseInt(itemTemporal.materia_prima_id),
      cantidad: parseDecimal(itemTemporal.cantidad),
      costo_unitario: parseDecimal(itemTemporal.costo_unitario),
      observaciones: itemTemporal.observaciones || '',
      materia_nombre: materia?.nombre || '',
      unidad_nombre: materia?.unidad_nombre || materia?.unidad_codigo || ''
    };

    setCompraData({
      ...compraData,
      items: [...compraData.items, nuevoItem]
    });

    setItemTemporal({
      materia_prima_id: '',
      cantidad: '',
      costo_unitario: '',
      observaciones: ''
    });
  };

  const handleEliminarItem = (index) => {
    const nuevosItems = compraData.items.filter((_, i) => i !== index);
    setCompraData({ ...compraData, items: nuevosItems });
  };

  const handleSubmitCompra = async (e) => {
    e.preventDefault();
    if (compraData.items.length === 0) {
      toast.error('Debe agregar al menos un material a la compra');
      return;
    }

    if (!compraData.proveedor_id && !compraData.proveedor_nombre) {
      toast.error('Debe seleccionar un proveedor o escribir el nombre');
      return;
    }

    try {
      await comprasAPI.create(compraData);
      toast.success('Compra registrada exitosamente. Los materiales han sido agregados al inventario.');
      setShowCompraModal(false);
      resetCompraForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar compra');
    }
  };

  const calcularTotalCompra = () => {
    return compraData.items.reduce((total, item) => {
      return total + (parseDecimal(item.cantidad) * parseDecimal(item.costo_unitario));
    }, 0);
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Movimientos de Inventario</h2>
        <Button onClick={() => setShowModal(true)}>
          <FaPlus className="me-2" />
          Nuevo Movimiento
        </Button>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Total Materias Primas</h6>
              <h3>{resumen.total_materias || 0}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Materias con Stock Bajo</h6>
              <h3 className="text-warning">{resumen.materias_stock_bajo || 0}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Valor Total Inventario</h6>
              <h3 className="text-success">
                ${formatNumber(resumen.valor_total_inventario || 0)}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h4 className="mb-3">Movimientos de Inventario</h4>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Materia Prima</th>
            <th>Cantidad</th>
            <th>Costo Unit.</th>
            <th>Costo Movimiento</th>
            <th>Orden Producción</th>
            <th>Motivo</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.length === 0 ? (
            <tr>
              <td colSpan="9" className="text-center">No hay movimientos registrados</td>
            </tr>
          ) : (
            movimientos.map((mov) => (
              <tr key={mov.id}>
                <td>
                  {getTipoIcon(mov.tipo_movimiento)} {getTipoBadge(mov.tipo_movimiento)}
                </td>
              <td>
                  <strong>{mov.materia_codigo || '-'}</strong><br />
                  <small>{mov.materia_nombre}</small><br />
                  <small className="text-muted">{mov.unidad_nombre || mov.unidad_codigo}</small>
                </td>
                <td>{formatNumber(mov.cantidad)}</td>
                <td className="text-end">{formatCurrency(mov.costo_unitario)}</td>
                <td className="text-end fw-bold">{formatCurrency(parseDecimal(mov.cantidad) * parseDecimal(mov.costo_unitario))}</td>
                <td>{mov.numero_orden || '-'}</td>
                <td>{mov.motivo || '-'}</td>
                <td>{new Date(mov.created_at).toLocaleString('es-CO')}</td>
                <td>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => handleVerDetalle(mov)}
                    title="Ver Detalle"
                  >
                    <FaEye />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Movimiento de Inventario</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Materia Prima *</Form.Label>
                  <Form.Select
                    value={formData.materia_prima_id}
                    onChange={(e) => setFormData({ ...formData, materia_prima_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo ? `${m.codigo} - ${m.nombre}` : m.nombre} ({m.unidad_nombre || m.unidad_codigo})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Movimiento *</Form.Label>
                  <Form.Select
                    value={formData.tipo_movimiento}
                    onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cantidad *</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                  />
                  {formData.tipo_movimiento === 'ajuste' && (
                    <Form.Text className="text-muted">
                      Para ajustes, ingrese el nuevo valor del stock
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              {formData.tipo_movimiento === 'entrada' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Costo Unitario *</Form.Label>
                    <Form.Control
                      type="text"
                      inputMode="decimal"
                      value={formData.costo_unitario}
                      onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                      placeholder="Ej: 500, 1.234,56"
                      required={formData.tipo_movimiento === 'entrada'}
                    />
                    <Form.Text className="text-muted">
                      Costo por unidad de la materia prima
                    </Form.Text>
                  </Form.Group>
                </Col>
              )}
              {formData.tipo_movimiento !== 'entrada' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Motivo</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Ej: Merma, Ajuste de inventario, etc."
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            {formData.tipo_movimiento === 'entrada' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Motivo</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Ej: Compra a proveedor, Ajuste de inventario, etc."
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}
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
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Registrar Movimiento
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Nueva Compra (Múltiples Materiales) */}
      <Modal show={showCompraModal} onHide={() => { setShowCompraModal(false); resetCompraForm(); }} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Nueva Compra</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitCompra}>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Proveedor (Registrado)</Form.Label>
                  <Form.Select
                    value={compraData.proveedor_id}
                    onChange={(e) => {
                      setCompraData({ ...compraData, proveedor_id: e.target.value, proveedor_nombre: '' });
                    }}
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.nit ? `- NIT: ${p.nit}` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>O escribir nombre del proveedor</Form.Label>
                  <Form.Control
                    type="text"
                    value={compraData.proveedor_nombre}
                    onChange={(e) => {
                      setCompraData({ ...compraData, proveedor_nombre: e.target.value, proveedor_id: '' });
                    }}
                    placeholder="Nombre del proveedor (si no está registrado)"
                    disabled={!!compraData.proveedor_id}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>N° Factura</Form.Label>
                  <Form.Control
                    type="text"
                    value={compraData.numero_factura}
                    onChange={(e) => setCompraData({ ...compraData, numero_factura: e.target.value })}
                    placeholder="Opcional"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha Compra *</Form.Label>
                  <Form.Control
                    type="date"
                    value={compraData.fecha_compra}
                    onChange={(e) => setCompraData({ ...compraData, fecha_compra: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha Factura</Form.Label>
                  <Form.Control
                    type="date"
                    value={compraData.fecha_factura}
                    onChange={(e) => setCompraData({ ...compraData, fecha_factura: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h5 className="mb-3">Agregar Materiales</h5>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Material *</Form.Label>
                  <Form.Select
                    value={itemTemporal.materia_prima_id}
                    onChange={(e) => setItemTemporal({ ...itemTemporal, materia_prima_id: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo ? `${m.codigo} - ${m.nombre}` : m.nombre} ({m.unidad_nombre || m.unidad_codigo})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Cantidad *</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    value={itemTemporal.cantidad}
                    onChange={(e) => setItemTemporal({ ...itemTemporal, cantidad: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Costo Unitario *</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    value={itemTemporal.costo_unitario}
                    onChange={(e) => setItemTemporal({ ...itemTemporal, costo_unitario: e.target.value })}
                    placeholder="Ej: 500"
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Button 
                  variant="success" 
                  onClick={handleAgregarItem}
                  className="w-100"
                  disabled={!itemTemporal.materia_prima_id || !itemTemporal.cantidad || !itemTemporal.costo_unitario}
                >
                  <FaPlus className="me-2" />
                  Agregar
                </Button>
              </Col>
            </Row>

            {compraData.items.length > 0 && (
              <>
                <h6 className="mb-2">Materiales Agregados:</h6>
                <Table striped bordered hover size="sm" className="mb-3">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Cantidad</th>
                      <th>Costo Unit.</th>
                      <th>Subtotal</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compraData.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.materia_nombre} ({item.unidad_nombre})</td>
                        <td className="text-end">{formatNumber(item.cantidad)}</td>
                        <td className="text-end">${formatNumber(item.costo_unitario)}</td>
                        <td className="text-end fw-bold">
                          ${formatNumber(item.cantidad * item.costo_unitario)}
                        </td>
                        <td>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleEliminarItem(index)}
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-primary">
                      <td colSpan="3" className="text-end fw-bold">Total:</td>
                      <td className="text-end fw-bold">${formatNumber(calcularTotalCompra())}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </Table>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={compraData.observaciones}
                onChange={(e) => setCompraData({ ...compraData, observaciones: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowCompraModal(false); resetCompraForm(); }}>
              Cancelar
            </Button>
            <Button 
              variant="success" 
              type="submit"
              disabled={compraData.items.length === 0}
            >
              Registrar Compra
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Detalle de Movimiento */}
      <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalle del Movimiento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {movimientoDetalle && (
            <Row>
              <Col md={6}>
                <p><strong>Tipo:</strong> {getTipoBadge(movimientoDetalle.tipo_movimiento)}</p>
                <p><strong>Materia Prima:</strong> {movimientoDetalle.materia_nombre}</p>
                <p><strong>Código:</strong> {movimientoDetalle.materia_codigo || '-'}</p>
                <p><strong>Unidad:</strong> {movimientoDetalle.unidad_nombre || movimientoDetalle.unidad_codigo}</p>
              </Col>
              <Col md={6}>
                <p><strong>Cantidad:</strong> {formatNumber(movimientoDetalle.cantidad)}</p>
                <p><strong>Orden Producción:</strong> {movimientoDetalle.numero_orden || '-'}</p>
                <p><strong>Motivo:</strong> {movimientoDetalle.motivo || '-'}</p>
                <p><strong>Fecha:</strong> {new Date(movimientoDetalle.created_at).toLocaleString('es-CO')}</p>
              </Col>
              {movimientoDetalle.observaciones && (
                <Col md={12}>
                  <p><strong>Observaciones:</strong></p>
                  <p>{movimientoDetalle.observaciones}</p>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Inventario;

