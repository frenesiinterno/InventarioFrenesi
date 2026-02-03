import React, { useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import {
  FaHome,
  FaBox,
  FaTshirt,
  FaFileAlt,
  FaClipboardList,
  FaExclamationTriangle,
  FaWarehouse,
  FaUpload,
  FaTimes,
  FaTruck,
  FaFileInvoice
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { path: '/', icon: FaHome, label: 'Dashboard' },
    { path: '/materia-prima', icon: FaBox, label: 'Materia Prima' },
    { path: '/productos', icon: FaTshirt, label: 'Productos' },
    { path: '/fichas-tecnicas', icon: FaFileAlt, label: 'Fichas Técnicas' },
    { path: '/ordenes-produccion', icon: FaClipboardList, label: 'Órdenes de Producción' },
    { path: '/alertas', icon: FaExclamationTriangle, label: 'Alertas' },
    { path: '/inventario', icon: FaWarehouse, label: 'Movimientos' },
    { path: '/proveedores', icon: FaTruck, label: 'Proveedores' },
    { path: '/siigo-ocs', icon: FaFileInvoice, label: 'Órdenes de Compra' },
    { path: '/importaciones', icon: FaUpload, label: 'Importaciones' },
    
  ];

  const handleLinkClick = () => {
    // Cerrar el sidebar en móvil después de hacer clic en un enlace
    if (window.innerWidth < 992 && onClose) {
      onClose();
    }
  };

  // Prevenir scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (isOpen && window.innerWidth < 992) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header d-lg-none">
          <h5 className="text-white mb-0">Menú</h5>
          <button 
            className="sidebar-close-btn" 
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <FaTimes />
          </button>
        </div>
        <Nav className="flex-column">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <LinkContainer key={item.path} to={item.path}>
                <Nav.Link onClick={handleLinkClick}>
                  <Icon className="me-2" />
                  {item.label}
                </Nav.Link>
              </LinkContainer>
            );
          })}
        </Nav>
      </aside>
    </>
  );
};

export default Sidebar;

