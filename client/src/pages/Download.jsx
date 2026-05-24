import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, FileDown, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import api from '../utils/api';

function DownloadPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('Secure Digital Package');

  useEffect(() => {
    const token = sessionStorage.getItem('razz_hex_session');
    const storedProductId = sessionStorage.getItem('razz_hex_product_id');
    const key = sessionStorage.getItem('razz_hex_key');

    // Security Gate: session presence check
    if (!token || storedProductId !== productId) {
      setError('Unauthorized access. Session token not found or invalid.');
      setLoading(false);
      setTimeout(() => {
        navigate('/unlock');
      }, 2000);
      return;
    }

    setSessionToken(token);
    setLicenseKey(key);
    
    // Attempt to extract product name from API or fallback
    async function fetchDetails() {
      try {
        const products = await api.getProducts();
        const prod = products.find(p => p.id === productId);
        if (prod) {
          setProductName(prod.name);
        }
      } catch (err) {
        // Fallback
        setProductName('Authorized Premium Package');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDetails();
  }, [productId, navigate]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError('');
      
      const response = await api.generateDownloadUrl(sessionToken);
      
      // We have the download URL!
      if (response.downloadUrl) {
        const isExternal = response.downloadUrl.startsWith('http') && !response.downloadUrl.includes('firebasestorage');
        
        if (isExternal) {
          // Open external links (like Google Drive) in a new tab for smooth user experience
          window.open(response.downloadUrl, '_blank');
        } else {
          // Create an anchor tag and click it to trigger native saving for direct files
          const link = document.createElement('a');
          link.href = response.downloadUrl;
          link.setAttribute('download', response.fileName || 'razz-package.zip');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        throw new Error('Download target was empty.');
      }
    } catch (err) {
      setError(err.message || 'Failed to request signed download link.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResetSession = () => {
    sessionStorage.removeItem('razz_hex_session');
    sessionStorage.removeItem('razz_hex_product_id');
    sessionStorage.removeItem('razz_hex_key');
    navigate('/unlock');
  };

  if (loading) {
    return (
      <div className="download-page page-enter">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="download-page page-enter">
      <GlassCard className="download-card" hover={false}>
        {error ? (
          <>
            <div className="lock-icon" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
              <AlertCircle size={36} />
            </div>
            <h2>Security Alert</h2>
            <p className="subtitle" style={{ color: 'var(--error)' }}>
              {error}
            </p>
            <button className="btn btn-secondary" onClick={handleResetSession} style={{ width: '100%' }}>
              Return to Portal
            </button>
          </>
        ) : (
          <>
            <div className="download-icon">
              <FileDown size={40} />
            </div>

            <h2>Access Authorized</h2>
            <p className="subtitle">
              Your license validation completed successfully. You can stream the file below securely.
            </p>

            <div className="download-info">
              <div className="download-info-row">
                <span className="label">Product Name</span>
                <span className="value text-gradient" style={{ fontWeight: 600 }}>{productName}</span>
              </div>
              <div className="download-info-row">
                <span className="label">License Key</span>
                <span className="value font-mono">
                  {licenseKey ? `RAZZ-••••-••••-${licenseKey.slice(-4)}` : 'Verified'}
                </span>
              </div>
              <div className="download-info-row">
                <span className="label">Device Restriction</span>
                <span className="value">1 Device Limit (Active)</span>
              </div>
              <div className="download-info-row">
                <span className="label">Link Expiration</span>
                <span className="value" style={{ color: 'var(--warning)' }}>15 Minutes</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn btn-primary btn-lg"
                disabled={downloading}
                onClick={handleDownload}
                style={{ width: '100%' }}
              >
                {downloading ? (
                  <>
                    <RefreshCw className="spinner" size={18} /> Resolving Package...
                  </>
                ) : (
                  <>
                    <Download size={18} /> Download Now
                  </>
                )}
              </button>

              <button className="btn btn-ghost btn-sm" onClick={handleResetSession}>
                Revoke Session &amp; Lock Portal
              </button>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

export default DownloadPage;
