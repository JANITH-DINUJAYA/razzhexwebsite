import React from 'react';
import { Link } from 'react-router-dom';
import { Send, Shield, MessageSquareCode } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo-text">RAAZZ HEX</div>
          <p>
            Premium, high-performance digital products and gaming utilities engineered for maximum reliability, speed, and safety.
          </p>
        </div>

        <div className="footer-column">
          <h4>Navigation</h4>
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/unlock">Unlock Portal</Link>
          <Link to="/admin">Admin Panel</Link>
        </div>

        <div className="footer-column">
          <h4>Support & Contact</h4>
          <a href="https://wa.me/94720131616" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquareCode size={16} /> WhatsApp Admin
          </a>
          <a href="mailto:support@razzhex.com" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={16} /> Email Support
          </a>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Shield size={16} className="text-accent" /> Secure License Validation
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>&copy; 2026 Raazz Hex. All rights reserved.</div>
        <div>Premium Digital Products &amp; Tools</div>
      </div>
    </footer>
  );
}

export default Footer;
