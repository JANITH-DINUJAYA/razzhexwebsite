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
  const [downloadingIndex, setDownloadingIndex] = useState(null);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('Secure Digital Package');
  const [files, setFiles] = useState([]);

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
    
    // Attempt to extract product details and file list from API
    async function fetchDetails() {
      try {
        const info = await api.getDownloadInfo(token);
        setProductName(info.productName || 'Authorized Premium Package');
        setFiles(info.files || []);
      } catch (err) {
        // Fallback
        setProductName('Authorized Premium Package');
        setFiles([{ name: 'Main Download', index: 0 }]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDetails();
  }, [productId, navigate]);

  const handleDownload = (index) => {
    try {
      setDownloadingIndex(index);
      setError('');
      
      // Trigger download securely using dynamic stream window trigger
      window.open(`/api/downloads/file?token=${encodeURIComponent(sessionToken)}&index=${index}`, '_blank');
      
      // Reset button state after a short delay
      setTimeout(() => {
        setDownloadingIndex(null);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to request download.');
      setDownloadingIndex(null);
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
              {files.length > 0 ? (
                files.map((file) => (
                  <button
                    key={file.index}
                    className="btn btn-primary btn-lg"
                    disabled={downloadingIndex !== null}
                    onClick={() => handleDownload(file.index)}
                    style={{ width: '100%' }}
                  >
                    {downloadingIndex === file.index ? (
                      <>
                        <RefreshCw className="spinner" size={18} /> Resolving Package...
                      </>
                    ) : (
                      <>
                        <Download size={18} /> {files.length > 1 ? `Download: ${file.name}` : 'Download Now'}
                      </>
                    )}
                  </button>
                ))
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  disabled={downloadingIndex !== null}
                  onClick={() => handleDownload(0)}
                  style={{ width: '100%' }}
                >
                  {downloadingIndex === 0 ? (
                    <>
                      <RefreshCw className="spinner" size={18} /> Resolving Package...
                    </>
                  ) : (
                    <>
                      <Download size={18} /> Download Now
                    </>
                  )}
                </button>
              )}

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
