import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Table, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { productosAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaClipboardList } from 'react-icons/fa';

const Productos = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);

  const [showModal, setShowModal] = useState(false);
  
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: ''
  });

 

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await productosAPI.getAll();
      setProductos(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando productos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    try {
      if (editing) {
        await productosAPI.update(editing.id, {
          ...formData,
          codigo: formData.codigo?.trim() || null
        });
        toast.success('Producto actualizado');
      } else {
        await productosAPI.create({
          ...formData,
          codigo: formData.codigo?.trim() || null
        });
        toast.success('Producto creado');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEdit = (producto) => {
    setEditing(producto);
    setFormData({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      descripcion: producto.descripcion || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      try {
        await productosAPI.delete(id);
        toast.success('Producto eliminado');
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
      descripcion: ''
    });
  };

  const filteredProductos = productos.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.nombre && p.nombre.toLowerCase().includes(term)) ||
      (p.codigo && p.codigo.toLowerCase().includes(term))
    );
  });

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Productos</h2>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <FaPlus className="me-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card className="glass-card mb-4">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col md={10}>
              <Form.Label>Buscar Producto</Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button
                className="btn-primary-custom w-100"
                onClick={() => {
                  setEditing(null);
                  setFormData({ codigo: '', nombre: '', descripcion: '' });
                  setShowModal(true);
                }}
              >
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
                <th className="border-0">Descripción</th>
                <th className="border-0 text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4">No se encontraron productos</td>
                </tr>
              ) : (
                filteredProductos.map((producto) => (
                  <tr key={producto.id}>
                    <td className="ps-4">{producto.codigo || '-'}</td>
                    <td className="fw-bold">{producto.nombre}</td>
                    <td>{producto.descripcion || '-'}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(producto)}>
                        <FaEdit />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(producto.id)}>
                        <FaTrash />
                      </Button>
                      <Button
                        variant="outline-info"
                        size="sm"
                        title="Ver Ficha Técnica"
                        onClick={() => navigate('/fichas-tecnicas', { state: { productoId: producto.id } })}
                      >
                        <FaClipboardList />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Editar' : 'Nuevo'} Producto</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Código (opcional)</Form.Label>
              <Form.Control
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej: PROD-001"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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

export default Productos;

