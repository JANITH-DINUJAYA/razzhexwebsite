import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Key, 
  HardDrive, 
  LogOut, 
  Terminal,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AdminLayout({ children, title }) {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Render nothing if unauthorized (redirecting in useEffect)
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-layout animate-in">
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
          <Terminal size={18} className="text-accent" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.05em' }}>HEX TERMINAL</span>
        </div>

        <nav style={{ marginTop: '24px', flex: 1 }}>
          <Link to="/admin" className={`admin-sidebar-link ${isActive('/admin') ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/products" className={`admin-sidebar-link ${isActive('/admin/products') ? 'active' : ''}`}>
            <Package size={18} />
            <span>Products</span>
          </Link>
          <Link to="/admin/licenses" className={`admin-sidebar-link ${isActive('/admin/licenses') ? 'active' : ''}`}>
            <Key size={18} />
            <span>Licenses</span>
          </Link>
          <Link to="/admin/files" className={`admin-sidebar-link ${isActive('/admin/files') ? 'active' : ''}`}>
            <HardDrive size={18} />
            <span>Files Storage</span>
          </Link>
        </nav>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link to="/" className="admin-sidebar-link">
            <ArrowLeft size={18} />
            <span>Back to Portal</span>
          </Link>
          <button className="admin-sidebar-link btn-ghost" onClick={handleLogout} style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={18} className="text-error" />
            <span className="text-error">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <header className="admin-header">
          <h1>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
              ADMIN PRIVILEGES
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {user.email}
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
export { AdminLayout };
