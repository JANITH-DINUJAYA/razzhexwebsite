import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Link, RotateCcw } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import GlassCard from '../../components/GlassCard';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function ManageProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Android Panel',
    price: '',
    filePath: '',
    filePaths: [],
    imageUrl: '',
    active: true
  });

  // Tracks whether admin explicitly wants to update the filePath during an edit
  const [updateFilePath, setUpdateFilePath] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const MOCK_PRODUCTS = [
    { id: '1', name: 'Android RAT Panel', category: 'Android Panel', price: 49, active: true, description: 'Advanced remote administration tool for Android devices.', filePath: '' },
    { id: '2', name: 'Android SMS Gateway', category: 'Android Panel', price: 35, active: true, description: 'Bulk SMS management system.', filePath: '' },
    { id: '3', name: 'iOS MDM Controller', category: 'iOS Panel', price: 79, active: true, description: 'Mobile device management solution.', filePath: '' },
    { id: '4', name: 'iOS Push Manager', category: 'iOS Panel', price: 45, active: true, description: 'Push notification management system.', filePath: '' },
    { id: '5', name: 'PC Remote Admin', category: 'PC Panel', price: 59, active: true, description: 'Remote desktop administration tool.', filePath: '' },
    { id: '6', name: 'PC Network Monitor', category: 'PC Panel', price: 39, active: true, description: 'Real-time network traffic monitoring.', filePath: '' },
    { id: '7', name: 'Free Bypass Payload', category: 'Free Panel', price: 0, active: true, description: 'Lightweight free panel helper.', filePath: '' }
  ];

  useEffect(() => {
    loadProducts();
  }, [token]);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data || MOCK_PRODUCTS);
    } catch (err) {
      console.warn('Backend connection refused. Initializing MOCK products list.', err);
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setEditProduct(null);
    setUpdateFilePath(false);
    setFormData({
      name: '',
      description: '',
      category: 'Android Panel',
      price: '',
      filePath: '',
      filePaths: [],
      imageUrl: '',
      active: true
    });
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditProduct(product);
    setUpdateFilePath(false); // Default: preserve existing links
    
    let initialLinks = [];
    if (product.filePaths && product.filePaths.length > 0) {
      initialLinks = product.filePaths.map(link => ({ ...link }));
    } else if (product.filePath) {
      initialLinks = [{ name: 'Main Download', path: product.filePath }];
    }

    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      filePath: product.filePath || '',
      filePaths: initialLinks,
      imageUrl: product.imageUrl || '',
      active: product.active !== undefined ? product.active : true
    });
    setErrorMessage('');
    setModalOpen(true);
  };

  const handleAddLink = () => {
    setFormData(prev => ({
      ...prev,
      filePaths: [...prev.filePaths, { name: '', path: '' }]
    }));
  };

  const handleLinkChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.filePaths];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, filePaths: updated };
    });
  };

  const handleRemoveLink = (index) => {
    setFormData(prev => ({
      ...prev,
      filePaths: prev.filePaths.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name || formData.price === '') {
      setErrorMessage('Name and price are mandatory fields.');
      return;
    }

    // Filter out empty links
    const filteredFilePaths = formData.filePaths.filter(link => link.path.trim() !== '');

    try {
      if (editProduct) {
        // Build the update payload
        const updatePayload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          price: Number(formData.price),
          imageUrl: formData.imageUrl || null,
          active: formData.active,
        };

        if (updateFilePath) {
          updatePayload.filePaths = filteredFilePaths;
          updatePayload.filePath = filteredFilePaths[0]?.path || '';
        }

        try {
          await api.adminUpdateProduct(token, editProduct.id, updatePayload);
        } catch (err) {
          console.warn('Backend update failed, performing local operation.', err);
        }

        setProducts(prev =>
          prev.map(p =>
            p.id === editProduct.id
              ? {
                  ...p,
                  ...updatePayload,
                  // Keep the old values locally if we didn't update them
                  filePath: updateFilePath ? (filteredFilePaths[0]?.path || '') : p.filePath,
                  filePaths: updateFilePath ? filteredFilePaths : p.filePaths
                }
              : p
          )
        );
      } else {
        // Create flow
        const newProductData = {
          ...formData,
          filePaths: filteredFilePaths,
          filePath: filteredFilePaths[0]?.path || '',
          price: Number(formData.price)
        };

        let createdProduct = {
          id: Math.random().toString(36).substring(2, 9),
          ...newProductData
        };

        try {
          const res = await api.adminCreateProduct(token, newProductData);
          if (res) createdProduct = res;
        } catch (err) {
          console.warn('Backend create failed, performing local operation.', err);
        }

        setProducts(prev => [createdProduct, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      try {
        await api.adminDeleteProduct(token, id);
      } catch (err) {
        console.warn('Backend delete failed, performing local operation.', err);
      }
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  return (
    <AdminLayout title="Product Management">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <AlertCircle className="icon" size={48} />
          <p>No products listed in catalog database.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price (LKR)</th>
                <th>File Link</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</td>
                  <td>
                    <span
                      className={`badge ${
                        product.category.includes('Android')
                          ? 'badge-active'
                          : product.category.includes('iOS')
                          ? 'badge-active'
                          : product.category.includes('Free')
                          ? 'badge-free'
                          : 'badge-revoked'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>Rs. {product.price}</td>
                  <td>
                    {product.filePaths && product.filePaths.length > 1 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--neon-blue)',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <Link size={12} />
                        {product.filePaths.length} Mirrors
                      </span>
                    ) : product.filePath ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--neon-blue)',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        <Link size={12} />
                        {product.filePath.length > 30
                          ? product.filePath.substring(0, 30) + '…'
                          : product.filePath}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${product.active ? 'badge-active' : 'badge-suspended'}`}>
                      {product.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(product)} title="Edit details">
                      <Edit size={14} className="text-accent" />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(product.id)} title="Remove product">
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editProduct ? 'Edit Product Parameters' : 'Add New Catalog Product'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)} style={{ width: '32px', height: '32px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Android Stealth Bypass Panel"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide highlights, functions, compatibility parameters..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Category Group</label>
                    <select
                      name="category"
                      className="form-select"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="Android Panel">Android Panel</option>
                      <option value="iOS Panel">iOS Panel</option>
                      <option value="PC Panel">PC Panel</option>
                      <option value="Free Panel">Free Panel</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Retail Price (LKR)</label>
                    <input
                      type="number"
                      name="price"
                      className="form-input"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="15000"
                      min={0}
                      required
                    />
                  </div>
                </div>

                {/* ─── FILE PATH SECTION ─── */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Product Download Mirrors
                    </label>

                    {/* Only show the toggle when editing an existing product */}
                    {editProduct && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.78rem',
                          color: updateFilePath ? 'var(--neon-blue)' : 'var(--text-muted)'
                        }}
                        onClick={() => setUpdateFilePath(v => !v)}
                      >
                        <RotateCcw size={12} />
                        {updateFilePath ? 'Updating links' : 'Keep existing links'}
                      </div>
                    )}
                  </div>

                  {editProduct && !updateFilePath ? (
                    // Read-only display of current links when not updating
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {((editProduct.filePaths && editProduct.filePaths.length > 0)
                        ? editProduct.filePaths
                        : (editProduct.filePath ? [{ name: 'Main Download', path: editProduct.filePath }] : [])
                      ).map((link, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: 'var(--bg-muted, rgba(255,255,255,0.04))',
                            border: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Link size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '8px', flexShrink: 0 }}>
                            {link.name}:
                          </span>
                          <span style={{ wordBreak: 'break-all' }}>
                            {link.path}
                          </span>
                        </div>
                      ))}
                      {(!editProduct.filePath && (!editProduct.filePaths || editProduct.filePaths.length === 0)) && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          No file links saved
                        </div>
                      )}
                    </div>
                  ) : (
                    // Dynamic Editable input list manager — shown for new products and toggled edits
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {formData.filePaths.map((link, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '30%', fontSize: '0.85rem' }}
                            placeholder="e.g. Google Drive Mirror"
                            value={link.name}
                            onChange={(e) => handleLinkChange(idx, 'name', e.target.value)}
                            required
                          />
                          <input
                            type="text"
                            className="form-input font-mono"
                            style={{ flexGrow: 1, fontSize: '0.85rem' }}
                            placeholder="https://drive.google.com/file/d/..."
                            value={link.path}
                            onChange={(e) => handleLinkChange(idx, 'path', e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveLink(idx)}
                            style={{ padding: '6px', height: '34px', width: '34px', minWidth: '34px' }}
                            title="Remove Link"
                          >
                            <Trash2 size={14} className="text-error" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddLink}
                        style={{ alignSelf: 'flex-start', marginTop: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> Add Download Link
                      </button>
                      
                      <span className="form-help">
                        Provide one or more download links (Google Drive URL, Mega, Dropbox, or secure Firebase path).
                      </span>
                    </div>
                  )}
                </div>
                {/* ─── END FILE PATH SECTION ─── */}

                <div className="form-group">
                  <label className="form-label">Product Image URL (Optional)</label>
                  <input
                    type="text"
                    name="imageUrl"
                    className="form-input"
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. https://example.com/photo.png or /images/my-rat.jpg"
                  />
                  <span className="form-help">Provide a direct URL to a photo representing this product in the catalog.</span>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="active"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--neon-blue)' }}
                  />
                  <label htmlFor="active" className="form-label" style={{ cursor: 'pointer', margin: 0 }}>
                    Visible in catalog (Is Active)
                  </label>
                </div>

                {errorMessage && (
                  <div className="unlock-status error" style={{ padding: '8px 12px' }}>
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageProducts;