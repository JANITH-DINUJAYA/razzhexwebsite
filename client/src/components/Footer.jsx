import React from 'react';
import { Link } from 'react-router-dom';
import { Send, Shield, MessageSquareCode, Youtube, Phone } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo-text">RAAZZ HEX</div>
          <p>
            Premium, high-performance digital products and gaming utilities engineered for maximum reliability, speed, and safety.
          </p>
          <div className="social-links" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <a 
              href="https://youtube.com/@raazzhex" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="YouTube" 
              className="btn-ghost" 
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Youtube size={18} style={{ color: '#FF0000' }} />
            </a>
            <a 
              href="https://www.tiktok.com/@raazz.hex" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="TikTok" 
              className="btn-ghost" 
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--neon-pink)' }}>
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
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
          <a href="tel:0787148687" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
            <Phone size={16} className="text-accent" /> 0787148687
          </a>
          <a href="https://wa.me/94720131616" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquareCode size={16} /> WhatsApp Admin
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
