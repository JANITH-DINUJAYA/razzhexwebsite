import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Terminal } from 'lucide-react';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <div className="logo-icon" style={{ background: 'none', padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-glow-blue)' }}>
              <img src="/logo.jpeg" alt="RAAZZ HEX" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <span className="logo-text">RAAZZ HEX</span>
          </Link>

          <ul className="navbar-links">
            <li>
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/products" className={isActive('/products') ? 'active' : ''}>
                Products
              </Link>
            </li>
            <li>
              <Link to="/unlock" className={isActive('/unlock') ? 'active' : ''}>
                Unlock Portal
              </Link>
            </li>

          </ul>

          <button className={`mobile-toggle ${isOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <Link to="/" className={isActive('/') ? 'active' : ''} onClick={closeMenu}>
          Home
        </Link>
        <Link to="/products" className={isActive('/products') ? 'active' : ''} onClick={closeMenu}>
          Products
        </Link>
        <Link to="/unlock" className={isActive('/unlock') ? 'active' : ''} onClick={closeMenu}>
          Unlock Portal
        </Link>

      </div>

      {/* Mobile Menu Backdrop */}
      {isOpen && (
        <div className={`mobile-backdrop ${isOpen ? 'show' : ''}`} onClick={closeMenu}></div>
      )}
    </>
  );
}

export default Navbar;
