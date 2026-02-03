import React from 'react';
import { Navbar as BootstrapNavbar, Container, Button } from 'react-bootstrap';
import { FaBars, FaWarehouse } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Navbar = ({ onToggleSidebar }) => {
  return (
    <BootstrapNavbar bg="primary" variant="dark" fixed="top" expand="lg" className="px-3">
      <Container fluid>
        <Button 
          variant="link" 
          className="text-white d-lg-none me-2 p-0" 
          onClick={onToggleSidebar}
          style={{ fontSize: '1.5rem', border: 'none' }}
          aria-label="Toggle menu"
        >
          <FaBars />
        </Button>
        <BootstrapNavbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaWarehouse className="me-2" />
          <span className="d-none d-sm-inline">Sistema de Inventario Frenesi</span>
          <span className="d-sm-none">Inventario Frenesi</span>
        </BootstrapNavbar.Brand>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
