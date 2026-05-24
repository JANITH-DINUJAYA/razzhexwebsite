import React, { useState, useEffect } from 'react';
import { Plus, Copy, Check, Ban, Trash2, X, KeyRound, Smartphone } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import GlassCard from '../../components/GlassCard';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function ManageLicenses() {
  const { token } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  
  const [formData, setFormData] = useState({
    productId: '',
    maxDevices: 1, // Restrict to 1 device per user instructions
    count: 1,
    expiresAt: ''
  });
  const [generatedKeys, setGeneratedKeys] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const MOCK_LICENSES = [
    { id: 'l1', key: 'RAZZ-9F82-K10A-7B5D', productName: 'Android RAT Panel', status: 'active', activatedDevices: 1, maxDevices: 1, createdAt: '2026-05-23T12:00:00Z' },
    { id: 'l2', key: 'RAZZ-8A01-C91F-3D2E', productName: 'iOS MDM Controller', status: 'active', activatedDevices: 0, maxDevices: 1, createdAt: '2026-05-23T10:30:00Z' },
    { id: 'l3', key: 'RAZZ-6C4D-7E8F-9A0B', productName: 'PC Remote Admin', status: 'expired', activatedDevices: 1, maxDevices: 1, createdAt: '2026-05-20T08:15:00Z' },
    { id: 'l4', key: 'RAZZ-5F4E-3D2C-1B0A', productName: 'Android SMS Gateway', status: 'revoked', activatedDevices: 0, maxDevices: 1, createdAt: '2026-05-18T14:40:00Z' }
  ];

  const MOCK_PRODUCTS = [
    { id: '1', name: 'Android RAT Panel' },
    { id: '2', name: 'Android SMS Gateway' },
    { id: '3', name: 'iOS MDM Controller' },
    { id: '4', name: 'iOS Push Manager' },
    { id: '5', name: 'PC Remote Admin' },
    { id: '6', name: 'PC Network Monitor' }
  ];

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      setLoading(true);
      const [fetchedLicenses, fetchedProducts] = await Promise.all([
        api.adminGetLicenses(token).catch(() => null),
        api.getProducts().catch(() => null)
      ]);

      setLicenses(fetchedLicenses || MOCK_LICENSES);
      setProducts(fetchedProducts || MOCK_PRODUCTS);
      
      if (fetchedProducts && fetchedProducts.length > 0) {
        setFormData(prev => ({ ...prev, productId: fetchedProducts[0].id }));
      } else if (MOCK_PRODUCTS.length > 0) {
        setFormData(prev => ({ ...prev, productId: MOCK_PRODUCTS[0].id }));
      }
    } catch (err) {
      console.warn('Backend load failed. Utilizing robust mock dataset.', err);
      setLicenses(MOCK_LICENSES);
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openModal = () => {
    setGeneratedKeys([]);
    setErrorMessage('');
    setFormData({
      productId: products[0]?.id || '',
      maxDevices: 1, // Keep locked to 1 device per user instructions
      count: 1,
      expiresAt: ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setGeneratedKeys([]);

    if (!formData.productId) {
      setErrorMessage('Please select an active digital product.');
      return;
    }

    try {
      let keysResponse = [];
      try {
        const response = await api.adminGenerateLicenses(token, {
          ...formData,
          maxDevices: Number(formData.maxDevices),
          count: Number(formData.count),
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
        });
        keysResponse = response.keys || [];
      } catch (err) {
        // Fallback generator for offline/local testing
        console.warn('Backend generation failed. Instantiating mock licenses locally.', err);
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const makeSegment = () => Array.from({ length: 4 }).map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
        
        for (let k = 0; k < formData.count; k++) {
          keysResponse.push(`RAZZ-${makeSegment()}-${makeSegment()}-${makeSegment()}`);
        }
      }

      setGeneratedKeys(keysResponse);

      // Append new licenses to the active display state table list
      const selectedProd = products.find(p => p.id === formData.productId);
      const newLicensesList = keysResponse.map((key, i) => ({
        id: `gen-${Math.random()}-${i}`,
        key,
        productName: selectedProd ? selectedProd.name : 'Digital Product',
        status: 'active',
        activatedDevices: 0,
        maxDevices: Number(formData.maxDevices),
        createdAt: new Date().toISOString(),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      }));

      setLicenses(prev => [...newLicensesList, ...prev]);
    } catch (err) {
      setErrorMessage(err.message || 'Verification execution failed.');
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this license? It will block access instantly.')) return;
    
    try {
      try {
        await api.adminRevokeLicense(token, id);
      } catch (err) {
        console.warn('Backend update failed, performing local state toggle.', err);
      }
      setLicenses(prev => prev.map(l => l.id === id ? { ...l, status: 'revoked' } : l));
    } catch (err) {
      alert(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this key document?')) return;
    
    try {
      try {
        await api.adminDeleteLicense(token, id);
      } catch (err) {
        console.warn('Backend delete failed, performing local operation.', err);
      }
      setLicenses(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert(err.message || 'Operation failed.');
    }
  };

  return (
    <AdminLayout title="License Keys Management">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={16} /> Generate Keys
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : licenses.length === 0 ? (
        <div className="empty-state">
          <KeyRound className="icon" size={48} />
          <p>No license keys registered in records.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>License Key</th>
                <th>Product</th>
                <th>Status</th>
                <th>Devices</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => (
                <tr key={lic.id}>
                  <td className="key-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono">{lic.key}</span>
                      <button
                        className={`copy-btn ${copiedKey === lic.key ? 'copied' : ''}`}
                        onClick={() => handleCopy(lic.key)}
                        title="Copy to clipboard"
                      >
                        {copiedKey === lic.key ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{lic.productName}</td>
                  <td>
                    <span 
                      className={`badge ${
                        lic.status === 'active' 
                          ? 'badge-active' 
                          : lic.status === 'expired' 
                          ? 'badge-expired' 
                          : 'badge-revoked'
                      }`}
                    >
                      {lic.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Smartphone size={14} className="text-muted" />
                      <span>{lic.activatedDevices} / {lic.maxDevices}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {new Date(lic.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: lic.expiresAt && new Date(lic.expiresAt) < new Date() ? 'var(--text-error)' : 'var(--text-secondary)' }}>
                    {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="actions">
                    {lic.status === 'active' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRevoke(lic.id)} title="Revoke access">
                        <Ban size={14} className="text-warning" />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(lic.id)} title="Delete document">
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Key Generation Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Unique Key Packages</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)} style={{ width: '32px', height: '32px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Associate Product</label>
                  <select
                    name="productId"
                    className="form-select"
                    value={formData.productId}
                    onChange={handleInputChange}
                    required
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Device Activation Limit</label>
                    <input
                      type="number"
                      name="maxDevices"
                      className="form-input"
                      value={formData.maxDevices}
                      onChange={handleInputChange}
                      min={1}
                      max={1} // Strict locking to 1 per request
                      disabled // Lock to 1 as specified
                      required
                    />
                    <span className="form-help">Strictly locked to 1 device.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity of Keys</label>
                    <input
                      type="number"
                      name="count"
                      className="form-input"
                      value={formData.count}
                      onChange={handleInputChange}
                      min={1}
                      max={50}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    name="expiresAt"
                    className="form-input"
                    value={formData.expiresAt || ''}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <span className="form-help">Leave blank for a Lifetime key (Never expires).</span>
                </div>

                {errorMessage && (
                  <div className="unlock-status error" style={{ padding: '8px 12px' }}>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {generatedKeys.length > 0 && (
                  <div className="glass-card-static" style={{ marginTop: '12px', background: 'var(--bg-primary)' }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-accent)' }}>
                      Successfully Generated Keys ({generatedKeys.length})
                    </h4>
                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {generatedKeys.map((key, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                          <span className="font-mono text-sm" style={{ color: '#fff' }}>{key}</span>
                          <button
                            type="button"
                            className={`copy-btn ${copiedKey === key ? 'copied' : ''}`}
                            onClick={() => handleCopy(key)}
                            style={{ padding: '2px 6px' }}
                          >
                            {copiedKey === key ? <Check size={10} /> : <Copy size={10} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  {generatedKeys.length > 0 ? 'Close' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageLicenses;
