import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Form, Table, Button, Badge, Row, Col, Card, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { fichasTecnicasAPI, productosAPI, materiaPrimaAPI } from '../services/api';
import { FaPlus, FaTrash, FaChevronDown, FaChevronUp, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

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

const formatNumber = (value, maxFractionDigits = 3) => {
  const num = parseDecimal(value);
  return num.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits
  });
};

const FichasTecnicas = () => {
  const location = useLocation();
  const [productos, setProductos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [fichasPorProducto, setFichasPorProducto] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    materia_prima_id: '',
    cantidad: ''
  });
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [productosExpandidos, setProductosExpandidos] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [editCantidad, setEditCantidad] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Add State
  const [materialesTemporales, setMaterialesTemporales] = useState([]);

  useEffect(() => {
    loadProductos();
    loadMaterias();
  }, []);

  useEffect(() => {
    if (location.state?.productoId) {
      setProductoSeleccionado(location.state.productoId);
      // Ensure we are not in "show all" mode so we focus on the selected one
      setMostrarTodas(false);
    }
  }, [location.state]);

  useEffect(() => {
    if (productoSeleccionado && !mostrarTodas) {
      fetchFichaProducto(productoSeleccionado);
    }
  }, [productoSeleccionado, mostrarTodas]);

  const loadProductos = async () => {
    try {
      const res = await productosAPI.getAll();
      setProductos(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando productos');
    }
  };


  const loadMaterias = async () => {
    try {
      const res = await materiaPrimaAPI.getAll();
      setMaterias(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando materias primas');
    }
  };

  const fetchFichaProducto = async (productoId, silent = false) => {
    if (!productoId) return;
    try {
      const res = await fichasTecnicasAPI.getByProducto(productoId);
      setFichasPorProducto((prev) => ({
        ...prev,
        [String(productoId)]: res.data.data
      }));
    } catch (error) {
      if (!silent) {
        toast.error('Error cargando ficha técnica');
      }
    }
  };

  const fetchTodasLasFichas = async () => {
    const pendientes = productos
      .filter((p) => !fichasPorProducto[String(p.id)])
      .map((p) => fetchFichaProducto(p.id, true));
    await Promise.all(pendientes);
  };

  useEffect(() => {
    if (mostrarTodas || searchTerm) {
      fetchTodasLasFichas();
    }
  }, [mostrarTodas, productos, searchTerm]);

  const productosParaMostrar = useMemo(() => {
    let filtered = productos;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        // Search by product name or code
        const matchProducto =
          p.nombre.toLowerCase().includes(lowerTerm) ||
          (p.codigo && p.codigo.toLowerCase().includes(lowerTerm));

        // Search by material name (requires ficha to be loaded)
        const ficha = fichasPorProducto[String(p.id)];
        const matchMateria = ficha?.items?.some(item =>
          item.materia_nombre.toLowerCase().includes(lowerTerm)
        );

        return matchProducto || matchMateria;
      });
    }

    if (mostrarTodas || searchTerm) {
      return filtered;
    }
    return filtered.filter((p) => String(p.id) === String(productoSeleccionado));
  }, [mostrarTodas, productos, productoSeleccionado, searchTerm, fichasPorProducto]);

  useEffect(() => {
    if (mostrarTodas || searchTerm) {
      setProductosExpandidos(new Set(productosParaMostrar.map((p) => String(p.id))));
    } else if (productoSeleccionado) {
      setProductosExpandidos(new Set([String(productoSeleccionado)]));
    } else {
      setProductosExpandidos(new Set());
    }
  }, [mostrarTodas, productoSeleccionado, searchTerm, productosParaMostrar]);

  const handleStageMaterial = (e) => {
    e.preventDefault();
    if (!formData.materia_prima_id || !formData.cantidad) {
      toast.warning('Complete los campos requeridos');
      return;
    }

    const materia = materias.find(m => String(m.id) === String(formData.materia_prima_id));
    const newItem = {
      ...formData,
      tempId: Date.now(),
      materia_nombre: materia ? materia.nombre : 'Desconocido',
      unidad: materia ? (materia.unidad_nombre || materia.unidad_codigo) : ''
    };

    setMaterialesTemporales([...materialesTemporales, newItem]);
    setFormData({ materia_prima_id: '', cantidad: '' });
  };

  const handleRemoveFromStage = (tempId) => {
    setMaterialesTemporales(materialesTemporales.filter(item => item.tempId !== tempId));
  };

  const handleBulkSubmit = async () => {
    if (materialesTemporales.length === 0) return;
    try {
      const promises = materialesTemporales.map(item =>
        fichasTecnicasAPI.create({
          producto_id: productoSeleccionado,
          materia_prima_id: item.materia_prima_id,
          cantidad: parseDecimal(item.cantidad)
        })
      );
    await Promise.all(promises);
      toast.success(`${materialesTemporales.length} materiales agregados correctamente`);
      setShowModal(false);
      setMaterialesTemporales([]);
      setFormData({ materia_prima_id: '', cantidad: '' });
      await fetchFichaProducto(productoSeleccionado);
    } catch (error) {
      toast.error('Error al guardar algunos materiales');
    }
  };

  const handleDelete = async (productoId, fichaId) => {
    if (window.confirm('¿Eliminar este material de la ficha técnica?')) {
      try {
        await fichasTecnicasAPI.delete(fichaId);
        toast.success('Material eliminado');
        await fetchFichaProducto(productoId);
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditCantidad(item.cantidad);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditCantidad('');
  };

  const handleUpdate = async (productoId, fichaId) => {
    try {
      const cant = parseDecimal(editCantidad);

      await fichasTecnicasAPI.update(fichaId, {
        cantidad: cant
      });
      toast.success('Actualizado correctamente');
      setEditingItem(null);
      setEditCantidad('');
      await fetchFichaProducto(productoId);
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const toggleExpand = (productoId) => {
    const key = String(productoId);
    setProductosExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }
      return nuevo;
    });
  };

  const renderTablaProducto = (producto, fichaProducto) => {
    const itemsPorTipo = fichaProducto.items.reduce((acc, item) => {
      if (!acc[item.tipo_nombre]) acc[item.tipo_nombre] = [];
      acc[item.tipo_nombre].push(item);
      return acc;
    }, {});

    return (
      <Table hover responsive size="sm" className="mb-0 align-middle">
        <thead className="glass-header">
          <tr>
            <th className="border-0">Tipo</th>
            <th className="border-0">Código</th>
            <th className="border-0">Materia Prima</th>
            <th className="border-0">Unidad</th>
            <th className="border-0">Cantidad</th>
            {!mostrarTodas && <th className="border-0">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {Object.keys(itemsPorTipo).map((tipo) => (
            <React.Fragment key={tipo}>
              <tr className="table-secondary fw-bold">
                <td colSpan={mostrarTodas ? 5 : 6} className="ps-3">{tipo}</td>
              </tr>
              {itemsPorTipo[tipo].map((item) => (
                <tr key={item.id}>
                  <td></td>
                  <td>{item.materia_codigo || '-'}</td>
                  <td>{item.materia_nombre}</td>
                  <td>{item.unidad_nombre || item.unidad_codigo}</td>
                  <td>
                    {editingItem === item.id ? (
                      <Form.Control
                        type="number"
                        step="0.000001"
                        value={editCantidad}
                        onChange={(e) => setEditCantidad(e.target.value)}
                        style={{ width: '120px' }}
                        autoFocus
                      />
                    ) : (
                      formatNumber(item.cantidad)
                    )}
                  </td>
                  {!mostrarTodas && (
                    <td>
                      {editingItem === item.id ? (
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleUpdate(producto.id, item.id)}
                          >
                            <FaSave />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      ) : (
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(producto.id, item.id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Container fluid>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
        <h2 className="mb-0">Fichas Técnicas</h2>
        <div className="d-flex flex-column flex-sm-row gap-3 align-items-center">
          <Form.Control
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '250px' }}
          />
          <Form.Check
            type="switch"
            id="mostrar-todas"
            label="Mostrar todas las fichas"
            checked={mostrarTodas}
            onChange={(e) => {
              setMostrarTodas(e.target.checked);
              if (e.target.checked) {
                setProductoSeleccionado('');
              }
            }}
          />
          {!mostrarTodas && (
            <Button
              className="btn-primary-custom"
              disabled={!productoSeleccionado}
              onClick={() => setShowModal(true)}
            >
              <FaPlus className="me-2" />
              Agregar Material
            </Button>
          )}
        </div>
      </div>

      {!mostrarTodas && (
        <Row className="mb-4">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Seleccionar Producto</Form.Label>
              <Form.Select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
              >
                <option value="">Seleccione un producto...</option>
                {productos
                  .filter(p => {
                    if (!searchTerm) return true;
                    return p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo ? `${p.codigo} - ${p.nombre}` : p.nombre}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      )}

      {productosParaMostrar.length === 0 && (
        <p className="text-muted">No hay fichas técnicas disponibles para mostrar.</p>
      )}

      {productosParaMostrar.map((producto) => {
        const fichaProducto = fichasPorProducto[String(producto.id)] || { items: [], resumen: [], total: {} };
        const expanded = productosExpandidos.has(String(producto.id));
        const cantidadItems = fichaProducto.items.length;

        return (
          <Card key={producto.id} className="glass-card mb-4">
            <Card.Header className="glass-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 fw-bold">
                  {producto.codigo ? `${producto.codigo} - ${producto.nombre}` : producto.nombre}
                </h5>
                <small className="text-muted">
                  {cantidadItems} {cantidadItems === 1 ? 'material' : 'materiales'}
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => toggleExpand(producto.id)}
                >
                  {expanded ? <FaChevronUp /> : <FaChevronDown />}
                </Button>
              </div>
            </Card.Header>
            {expanded && (
              <Card.Body>
                {cantidadItems === 0 ? (
                  <p className="text-muted mb-0">Este producto aún no tiene materiales asociados.</p>
                ) : (
                  renderTablaProducto(producto, fichaProducto)
                )}
              </Card.Body>
            )}
          </Card>
        );
      })}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Material</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStageMaterial}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Card className="glass-card mb-3 border-0">
                  <Card.Body>
                    <h6 className="mb-3">Agregar a lista temporal</h6>
                    <Row className="g-2 align-items-end">
                      <Col md={5}>
                        <Form.Label>Materia Prima *</Form.Label>
                        <Form.Select
                          value={formData.materia_prima_id}
                          onChange={(e) => setFormData({ ...formData, materia_prima_id: e.target.value })}
                        >
                          <option value="">Seleccione...</option>
                          {materias.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.codigo ? `${m.codigo} - ${m.nombre}` : m.nombre}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col md={4}>
                        <Form.Label>Cantidad *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.000001"
                          value={formData.cantidad}
                          onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        />
                      </Col>
                      <Col md={1}>
                        <Button type="submit" className="btn-primary-custom w-100"> <FaPlus /> </Button>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {materialesTemporales.length > 0 && (
              <Table size="sm" hover className="mt-3 align-middle">
                <thead className="glass-header">
                  <tr>
                    <th className="border-0">Materia Prima</th>
                    <th className="border-0">Cantidad</th>
                    <th className="border-0">Unidad</th>
                    <th className="border-0"></th>
                  </tr>
                </thead>
                <tbody>
                  {materialesTemporales.map((item) => (
                    <tr key={item.tempId}>
                      <td>{item.materia_nombre}</td>
                      <td>{formatNumber(item.cantidad)}</td>
                      <td>{item.unidad}</td>
                      <td>
                        <Button variant="outline-danger" size="sm" onClick={() => handleRemoveFromStage(item.tempId)}>
                          <FaTimes />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleBulkSubmit} disabled={materialesTemporales.length === 0}>
              Guardar Todo ({materialesTemporales.length})
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default FichasTecnicas;

