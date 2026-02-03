import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { materiaPrimaAPI, productosAPI, alertasAPI, inventarioAPI } from '../services/api';
import { 
  FaBox, FaTshirt, FaExclamationTriangle, FaDollarSign, 
  FaArrowUp, FaArrowDown, FaChartBar,
} from 'react-icons/fa';

const COLORS = ['#0088FE', '#00c9a4ff', '#FFBB28', '#FF8042', '#8884d8'];

const StatCard = ({ title, value, icon: Icon, color, subtext, trend, onClick }) => (
  <Card 
    className={`h-100 shadow-sm border-0 ${onClick ? 'cursor-pointer' : ''}`}
    style={{ 
      background: 'rgba(255, 255, 255, 0.9)', 
      backdropFilter: 'blur(10px)',
      borderRadius: '15px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s ease-in-out'
    }}
    onClick={onClick}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-5px)')}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
  >
    <Card.Body>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>{title}</h6>
          <h3 className="mb-0 fw-bold">{value}</h3>
          {subtext && <small className={`text-${trend > 0 ? 'success' : 'danger'}`}>
            {trend > 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />} {subtext}
          </small>}
        </div>
        <div className={`bg-${color} bg-opacity-10 p-3 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '60px', height: '60px' }}>
          <Icon size={30} className={`text-${color}`} />
        </div>
      </div>
    </Card.Body>
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMaterias: 0,
    totalProductos: 0,
    alertasNoLeidas: 0,
    valorInventario: 0,
    productosCostosos: [],
    materiasStockBajo: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        materiasRes,
        productosRes,
        alertasRes,
        inventarioRes,
        costososRes
      ] = await Promise.allSettled([
        materiaPrimaAPI.getAll(),
        productosAPI.getAll(),
        alertasAPI.getNoLeidas(),
        inventarioAPI.getResumen(),
        productosAPI.getTopCostosos()
      ]);

      const materias = materiasRes.status === 'fulfilled' ? (materiasRes.value.data.data || []) : [];
      const productos = productosRes.status === 'fulfilled' ? (productosRes.value.data.data || []) : [];
      const resumenInventario = inventarioRes.status === 'fulfilled' ? (inventarioRes.value.data.data || {}) : {};
      const productosCostosos = costososRes.status === 'fulfilled' ? (costososRes.value.data.data || []).map(p => ({
        ...p,
        costo: parseFloat(p.costo)
      })) : [];

      const stockBajo = materias
        .filter(m => parseFloat(m.stock_actual) <= parseFloat(m.stock_minimo))
        .sort((a, b) => parseFloat(a.stock_actual) - parseFloat(b.stock_actual))
        .slice(0, 5);

      setStats({
        totalMaterias: materias.length,
        totalProductos: productos.length,
        alertasNoLeidas: alertasRes.status === 'fulfilled' ? (alertasRes.value.data.data?.length || 0) : 0,
        valorInventario: resumenInventario.valor_total_inventario || 0,
        materiasStockBajo: stockBajo,
        productosCostosos: productosCostosos
      });
      
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark">Panel de Control</h2>
          <p className="text-muted">Bienvenido al sistema de gestión Frenesí</p>
        </div>
        <Button variant="primary" className="rounded-pill shadow-sm" onClick={loadDashboardData}>
          Actualizar Datos
        </Button>
      </div>

      <Row className="g-4 mb-5">
        <Col md={3}>
          <StatCard 
            title="Valor Inventario" 
            value={`$${stats.valorInventario.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`} 
            icon={FaDollarSign} 
            color="success" 
            onClick={() => navigate('/inventario')}
          />
        </Col>
        <Col md={3}>
          <StatCard 
            title="Productos" 
            value={stats.totalProductos} 
            icon={FaTshirt} 
            color="primary" 
            onClick={() => navigate('/productos')}
          />
        </Col>
        <Col md={3}>
          <StatCard 
            title="Materias Primas" 
            value={stats.totalMaterias} 
            icon={FaBox} 
            color="info" 
            onClick={() => navigate('/materia-prima')}
          />
        </Col>
        <Col md={3}>
          <StatCard 
            title="Alertas Activas" 
            value={stats.alertasNoLeidas} 
            icon={FaExclamationTriangle} 
            color="warning"
            subtext={stats.alertasNoLeidas > 0 ? "Requiere atención" : "Todo en orden"}
            trend={stats.alertasNoLeidas > 0 ? -1 : 1}
            onClick={() => navigate('/alertas')}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0"><FaChartBar className="me-2 text-primary" /> Costos de Producción (Top 5)</h5>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.productosCostosos}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={0} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} cursor={{ fill: '#f8f9fa' }} />
                    <Bar dataKey="costo" fill="#4e73df" radius={[10, 10, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-transparent border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0"><FaExclamationTriangle className="me-2 text-warning" /> Stock Bajo</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Material</th>
                      <th className="border-0 text-center">Stock</th>
                      <th className="border-0 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.materiasStockBajo.length > 0 ? (
                      stats.materiasStockBajo.map((m) => (
                        <tr key={m.id}>
                          <td className="ps-4">
                            <div className="fw-bold text-dark">{m.nombre}</div>
                            <small className="text-muted">{m.codigo}</small>
                          </td>
                          <td className="text-center fw-bold">
                            {Number(m.stock_actual).toLocaleString()} {m.unidad_nombre}
                          </td>
                          <td className="text-center">
                            <Badge bg="danger" className="rounded-pill">Crítico</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No hay alertas de stock bajo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
