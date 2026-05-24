import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import api from '../utils/api';
import { getFingerprint } from '../utils/fingerprint';

function Unlock() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: '' }
  const navigate = useNavigate();

  const handleKeyChange = (e) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Auto format: RAZZ-XXXX-XXXX-XXXX
    // Ensure we start with "RAZZ" if it reaches length >= 4
    if (raw.length > 4 && !raw.startsWith('RAZZ')) {
      // User didn't type RAZZ, let's prepend it or fix it
      raw = 'RAZZ' + raw;
    }
    
    const parts = [];
    for (let i = 0; i < raw.length && i < 16; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    
    setKey(parts.join('-'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    // Basic validation
    const cleanKey = key.replace(/-/g, '');
    if (cleanKey.length !== 16) {
      setStatus({
        type: 'error',
        message: 'Invalid license key format. Must be RAZZ-XXXX-XXXX-XXXX',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Calculate device footprint
      const fingerprint = await getFingerprint();
      const deviceName = `${navigator.platform || 'Unknown Web Device'} (${navigator.language})`;
      
      // Call verification endpoint
      const result = await api.validateLicense(key, fingerprint, deviceName);
      
      setStatus({
        type: 'success',
        message: 'License verified! Redirecting to secure storage...',
      });

      // Save the JWT session token returned
      sessionStorage.setItem('razz_hex_session', result.token);
      sessionStorage.setItem('razz_hex_product_id', result.productId);
      sessionStorage.setItem('razz_hex_key', key);
      
      setTimeout(() => {
        navigate(`/download/${result.productId}`);
      }, 1500);
      
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Verification failed. Please contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unlock-page page-enter">
      <GlassCard className="unlock-card" hover={false}>
        <div className="lock-icon">
          <KeyRound size={36} />
        </div>

        <h2>Unlock Digital Product</h2>
        <p className="subtitle">
          Input your 16-character license key to establish safe authorization and request download permissions.
        </p>

        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="form-group">
            <input
              type="text"
              className="form-input license-input"
              value={key}
              onChange={handleKeyChange}
              placeholder="RAZZ-XXXX-XXXX-XXXX"
              maxLength={19}
              disabled={loading}
              autoComplete="off"
              spellCheck="false"
            />
            <span className="form-help text-center">
              Keys are strictly locked to a single device (Limit: 1).
            </span>
          </div>

          {status && (
            <div className={`unlock-status ${status.type}`}>
              {status.type === 'success' ? (
                <ShieldCheck size={20} className="text-success" />
              ) : (
                <ShieldAlert size={20} className="text-error" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} /> Generating Session...
              </>
            ) : (
              'Verify & Download'
            )}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}

export default Unlock;
