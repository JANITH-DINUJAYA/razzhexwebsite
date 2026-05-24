import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Key, 
  Download, 
  DollarSign, 
  Activity, 
  PlusCircle, 
  KeyRound, 
  Database 
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import GlassCard from '../../components/GlassCard';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    products: 6,
    activeLicenses: 24,
    totalDownloads: 156,
    revenue: 2340
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        if (token) {
          const fetchedStats = await api.getAdminStats(token);
          if (fetchedStats) {
            setStats(fetchedStats);
          }
        }
      } catch (err) {
        console.warn('Backend stats could not be resolved, loading mock dashboard stats.', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [token]);

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="stats-grid">
        <GlassCard className="stat-card" hover={true}>
          <div className="stat-icon blue">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.products}</div>
            <div className="stat-label">Total Products</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card" hover={true}>
          <div className="stat-icon green">
            <Key size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.activeLicenses}</div>
            <div className="stat-label">Active Licenses</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card" hover={true}>
          <div className="stat-icon purple">
            <Download size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalDownloads}</div>
            <div className="stat-label">Product Downloads</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card" hover={true}>
          <div className="stat-icon pink">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-value">${stats.revenue}</div>
            <div className="stat-label">Estimated Revenue</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-2" style={{ marginTop: '24px' }}>
        <GlassCard className="glass-card-static" hover={false}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} className="text-accent" /> Recent Activity Logs
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
            <li style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', display: 'flex', justifyContent: 'between' }}>
              <span className="text-secondary">License activated: <span className="font-mono text-accent">RAZZ-8F92-...</span></span>
              <span className="text-muted text-xs">2 mins ago</span>
            </li>
            <li style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', display: 'flex', justifyContent: 'between' }}>
              <span className="text-secondary">Package downloaded: <span className="text-gradient">Android RAT Panel</span></span>
              <span className="text-muted text-xs">15 mins ago</span>
            </li>
            <li style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', display: 'flex', justifyContent: 'between' }}>
              <span className="text-secondary">New license key generated for <span className="text-gradient">iOS MDM</span></span>
              <span className="text-muted text-xs">1 hr ago</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'between' }}>
              <span className="text-secondary">Product database updated by admin</span>
              <span className="text-muted text-xs">4 hrs ago</span>
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="glass-card-static" hover={false}>
          <h3 style={{ marginBottom: '16px' }}>Quick Operations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/admin/products')}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <PlusCircle size={18} className="text-accent" /> Manage Catalog Products
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/admin/licenses')}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <KeyRound size={18} className="text-accent" /> Generate New Key Collections
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/admin/files')}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <Database size={18} className="text-accent" /> Upload Product Packages (.zip)
            </button>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
