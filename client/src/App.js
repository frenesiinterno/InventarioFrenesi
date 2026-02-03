import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import MateriaPrima from './pages/MateriaPrima';
import Productos from './pages/Productos';
import FichasTecnicas from './pages/FichasTecnicas';
import OrdenesProduccion from './pages/OrdenesProduccion';
import Alertas from './pages/Alertas';
import Inventario from './pages/Inventario';
import Importaciones from './pages/Importaciones';
import Proveedores from './pages/Proveedores';
import SiigoOc from './pages/SiigoOc';
import './App.css';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar onToggleSidebar={toggleSidebar} />
        <div className="main-container">
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/materia-prima" element={<MateriaPrima />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/fichas-tecnicas" element={<FichasTecnicas />} />
              <Route path="/ordenes-produccion" element={<OrdenesProduccion />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/importaciones" element={<Importaciones />} />
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/siigo-ocs" element={<SiigoOc />} />
            </Routes>
          </main>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
