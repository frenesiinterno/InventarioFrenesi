import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Badge, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { proveedoresAPI, comprasAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaShoppingCart, FaEye } from 'react-icons/fa';

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showComprasModal, setShowComprasModal] = useState(false);
  const [showDetalleCompraModal, setShowDetalleCompraModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [compras, setCompras] = useState([]);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto: '',
    observaciones: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await proveedoresAPI.getAll();
      setProveedores(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando proveedores');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await proveedoresAPI.update(editing.id, formData);
        toast.success('Proveedor actualizado');
      } else {
        await proveedoresAPI.create(formData);
        toast.success('Proveedor creado');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEdit = (proveedor) => {
    setEditing(proveedor);
    setFormData({
      nombre: proveedor.nombre || '',
      nit: proveedor.nit || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      contacto: proveedor.contacto || '',
      observaciones: proveedor.observaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este proveedor?')) {
      try {
        await proveedoresAPI.delete(id);
        toast.success('Proveedor eliminado');
        loadData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleVerCompras = async (proveedor) => {
    setProveedorSeleccionado(proveedor);
    try {
      const res = await proveedoresAPI.getCompras(proveedor.id);
      setCompras(res.data.data || []);
      setShowComprasModal(true);
    } catch (error) {
      toast.error('Error cargando compras');
    }
  };

  const handleVerDetalleCompra = async (compraId) => {
    try {
      const res = await comprasAPI.getById(compraId);
      setCompraDetalle(res.data.data);
      setShowDetalleCompraModal(true);
    } catch (error) {
      toast.error('Error cargando detalle de compra');
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      nombre: '',
      nit: '',
      telefono: '',
      email: '',
      direccion: '',
      contacto: '',
      observaciones: ''
    });
  };

  const filteredProveedores = proveedores.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.nombre && p.nombre.toLowerCase().includes(searchLower)) ||
      (p.nit && p.nit.toLowerCase().includes(searchLower)) ||
      (p.contacto && p.contacto.toLowerCase().includes(searchLower))
    );
  });

  const formatCurrency = (value) => {
    return `$${parseFloat(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Proveedores</h2>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <FaPlus className="me-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card className="glass-card mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={10}>
              <Form.Label>Buscar</Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre, NIT o contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                <th className="ps-4 border-0">Nombre</th>
                <th className="border-0">NIT</th>
                <th className="border-0">Contacto</th>
                <th className="border-0">Teléfono</th>
                <th className="border-0">Email</th>
                <th className="border-0 text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td className="ps-4"><span className="fw-bold">{proveedor.nombre}</span></td>
                    <td>{proveedor.nit || '-'}</td>
                    <td>{proveedor.contacto || '-'}</td>
                    <td>{proveedor.telefono || '-'}</td>
                    <td>{proveedor.email || '-'}</td>
                    <td className="text-end pe-4">
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        className="me-2" 
                        onClick={() => handleVerCompras(proveedor)}
                        title="Ver Compras"
                      >
                        <FaShoppingCart />
                      </Button>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(proveedor)}>
                        <FaEdit />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(proveedor.id)}>
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

      {/* Modal de Proveedor */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Editar' : 'Nuevo'} Proveedor</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>NIT</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contacto</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </Form.Group>
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

      {/* Modal de Compras del Proveedor */}
      <Modal show={showComprasModal} onHide={() => setShowComprasModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Compras - {proveedorSeleccionado?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {compras.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No hay compras registradas para este proveedor.
            </div>
          ) : (
            <Table striped bordered hover responsive size="sm">
              <thead>
                <tr>
                  <th>Fecha Compra</th>
                  <th>N° Factura</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id}>
                    <td>{new Date(compra.fecha_compra).toLocaleDateString('es-CO')}</td>
                    <td>{compra.numero_factura || '-'}</td>
                    <td>{compra.total_items || 0}</td>
                    <td className="text-end">{formatCurrency(compra.total_calculado || compra.total)}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleVerDetalleCompra(compra.id)}
                      >
                        <FaEye className="me-1" /> Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowComprasModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Detalle de Compra */}
      <Modal show={showDetalleCompraModal} onHide={() => setShowDetalleCompraModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalle de Compra</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {compraDetalle && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Proveedor:</strong> {compraDetalle.proveedor_nombre_registrado || compraDetalle.proveedor_nombre || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Fecha:</strong> {new Date(compraDetalle.fecha_compra).toLocaleDateString('es-CO')}
                </Col>
                <Col md={6}>
                  <strong>N° Factura:</strong> {compraDetalle.numero_factura || '-'}
                </Col>
                <Col md={6}>
                  <strong>Total:</strong> {formatCurrency(compraDetalle.total)}
                </Col>
              </Row>
              <h6 className="mb-3">Items de la Compra:</h6>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Cantidad</th>
                    <th>Costo Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {compraDetalle.items && compraDetalle.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.materia_nombre} ({item.unidad_nombre})</td>
                      <td className="text-end">
                        {parseFloat(item.cantidad).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-end">{formatCurrency(item.costo_unitario)}</td>
                      <td className="text-end">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalleCompraModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Proveedores;

