// src/components/Navigation.js
import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <Navbar bg="transparent" variant="dark" expand="lg" className="navigation-bar" fixed="top">
      <div className="container-fluid">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="navbar-logo" />
        </div>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/" className="nav-link-custom">Home</Nav.Link>
            <Nav.Link as={Link} to="/search" className="nav-link-custom">Archive</Nav.Link>
            <Nav.Link as={Link} to="/portal" className="nav-link-custom">Portal</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
}

export default Navigation;
