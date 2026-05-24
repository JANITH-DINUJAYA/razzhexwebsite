import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/GlassCard';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated as admin, skip login
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please input both credentials.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      console.error('Firebase authentication failed:', err);
      // Helpful fallback note for new setups
      setError(err.message.includes('auth/invalid-credential') 
        ? 'Invalid email or password.' 
        : `Sign in error: ${err.message}. If this is a new setup, ensure the Firebase project holds this user record.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page page-enter">
      <GlassCard className="admin-login-card" hover={false}>
        <div className="lock-icon" style={{ borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }}>
          <Shield size={36} />
        </div>

        <h2>Admin Shell Access</h2>
        <p className="subtitle">
          Input your credentials to authenticate and establish administrative access.
        </p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@razzhex.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Secure Access Key (Password)</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="unlock-status error" style={{ padding: '12px' }}>
              <ShieldAlert size={18} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={18} /> Authenticating...
                </>
              ) : (
                'Establish Session'
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
            >
              <ArrowLeft size={14} /> Back to Portal
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

export default AdminLogin;
