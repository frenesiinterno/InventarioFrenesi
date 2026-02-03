
import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Badge, Card, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { alertasAPI } from '../services/api';
import { FaBell, FaCheck, FaTrash, FaSync } from 'react-icons/fa';

const Alertas = () => {
  const [alertas, setAlertas] = useState([]);
  const [mostrarSoloNoLeidas, setMostrarSoloNoLeidas] = useState(true);

  useEffect(() => {
    loadAlertas();
    // Verificar alertas automáticamente cada 5 minutos
    const interval = setInterval(() => {
      verificarAlertas();
    }, 300000);
    return () => clearInterval(interval);
  }, [mostrarSoloNoLeidas]);

  const loadAlertas = async () => {
    try {
      const res = mostrarSoloNoLeidas 
        ? await alertasAPI.getNoLeidas()
        : await alertasAPI.getAll();
      setAlertas(res.data.data || []);
    } catch (error) {
      toast.error('Error cargando alertas');
    }
  };

  const verificarAlertas = async () => {
    try {
      await alertasAPI.verificar();
      loadAlertas();
      toast.info('Alertas Verificadas');
    } catch (error) {
      toast.error('Error verificando alertas');
    }
  };

/*   const marcarLeida = async (id) => {
    try {
      await alertasAPI.marcarLeida(id);
      toast.success('Alerta marcada como leída');
      loadAlertas();
    } catch (error) {
      toast.error('Error al marcar alerta');
    }
  }; */

  const marcarTodasLeidas = async () => {
    try {
      await alertasAPI.marcarTodasLeidas();
      toast.success('Todas las alertas marcadas como leídas');
      loadAlertas();
    } catch (error) {
      toast.error('Error al marcar alertas');
    } 
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta alerta?')) {
      try {
        await alertasAPI.delete(id);
        toast.success('Alerta eliminada');
        loadAlertas();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      stock_minimo: <Badge bg="warning">Stock Mínimo</Badge>,
      stock_critico: <Badge bg="danger">Stock Crítico</Badge>,
      sin_stock: <Badge bg="dark">Sin Stock</Badge>
    };
    return badges[tipo] || <Badge>{tipo}</Badge>;
  };

  const alertasNoLeidas = alertas.filter(a => !a.leida).length;

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Alertas de Inventario</h2>
       <div>
          <Button variant="outline-primary" className="me-2" onClick={verificarAlertas}>
            <FaSync className="me-2" />
            Verificar Alertas
          </Button>
          {alertasNoLeidas > 0 && (
            <Button variant="outline-success" className="me-2" onClick={marcarTodasLeidas}>
              <FaCheck className="me-2" />
              Marcar Todas Leídas
            </Button>
          )}
          <Button 
            variant={mostrarSoloNoLeidas ? "primary" : "outline-primary"}
            onClick={() => setMostrarSoloNoLeidas(!mostrarSoloNoLeidas)}
          >
            {mostrarSoloNoLeidas ? 'Mostrar Todas' : 'Solo No Leídas'}
          </Button>
        </div>
      </div>

      {alertasNoLeidas > 0 && (
        <Card className="mb-4 bg-warning text-dark">
          <Card.Body>
            <Row className="align-items-center">
              <Col>
                <FaBell size={24} className="me-2" />
                <strong>Tienes {alertasNoLeidas} alerta{alertasNoLeidas !== 1 ? 's' : ''} sin leer</strong>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Materia Prima</th>
            <th>Mensaje</th>
            <th>Stock Actual</th>
            <th>Stock Minimo</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {alertas.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center">
                No hay alertas {mostrarSoloNoLeidas ? 'sin leer' : ''}
              </td>
            </tr>
          ) : (
            alertas.map((alerta) => (
              <tr key={alerta.id} className={!alerta.leida ? 'table-warning' : ''}>
                <td>{getTipoBadge(alerta.tipo_alerta)}</td>
                <td>
                  <strong>{alerta.materia_referencia}</strong><br />
                  <small>{alerta.materia_nombre}</small>
                </td>
                <td>{alerta.mensaje}</td>
                <td>{alerta.stock_actual}</td>
                <td>{alerta.stock_minimo}</td>
                <td>{new Date(alerta.created_at).toLocaleString('es-CO')}</td>
                <td>
                  {alerta.leida ? (
                    <Badge bg="success">Leída</Badge>
                  ) : (
                    <Badge bg="warning">No Leída</Badge>
                  )}
                </td>
                <td>
                  {!alerta.leida && (
                    <Button 
                      variant="outline-success" 
                      size="sm" onClick={() => handleDelete(alerta.id)}
                    >
                      <FaCheck />
                    </Button>
                  )}
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(alerta.id)}>
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))
          )}
          </tbody>
      </Table>
    </Container>
  );
};
export default Alertas;

          





