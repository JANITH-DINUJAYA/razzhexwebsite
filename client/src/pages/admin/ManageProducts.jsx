import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import GlassCard from '../../components/GlassCard';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function ManageProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // null means adding a new product
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Android Panel',
    price: '',
    filePath: '',
    imageUrl: '',
    active: true
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-load default values for offline fallback testing
  const MOCK_PRODUCTS = [
    { id: '1', name: 'Android RAT Panel', category: 'Android Panel', price: 49, active: true, description: 'Advanced remote administration tool for Android devices.' },
    { id: '2', name: 'Android SMS Gateway', category: 'Android Panel', price: 35, active: true, description: 'Bulk SMS management system.' },
    { id: '3', name: 'iOS MDM Controller', category: 'iOS Panel', price: 79, active: true, description: 'Mobile device management solution.' },
    { id: '4', name: 'iOS Push Manager', category: 'iOS Panel', price: 45, active: true, description: 'Push notification management system.' },
    { id: '5', name: 'PC Remote Admin', category: 'PC Panel', price: 59, active: true, description: 'Remote desktop administration tool.' },
    { id: '6', name: 'PC Network Monitor', category: 'PC Panel', price: 39, active: true, description: 'Real-time network traffic monitoring.' }
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
    setFormData({
      name: '',
      description: '',
      category: 'Android Panel',
      price: '',
      filePath: '',
      imageUrl: '',
      active: true
    });
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      filePath: product.filePath || '',
      imageUrl: product.imageUrl || '',
      active: product.active !== undefined ? product.active : true
    });
    setErrorMessage('');
    setModalOpen(true);
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

    if (!formData.name || !formData.price) {
      setErrorMessage('Name and price are mandatory fields.');
      return;
    }

    try {
      if (editProduct) {
        // Edit flow
        try {
          await api.adminUpdateProduct(token, editProduct.id, {
            ...formData,
            price: Number(formData.price)
          });
        } catch (err) {
          // If server fails, update locally for frontend-only capability checks
          console.warn('Backend update failed, performing local operation.', err);
        }
        
        setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...formData, price: Number(formData.price) } : p));
      } else {
        // Create flow
        const newProductData = {
          ...formData,
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
                <th>Price ($)</th>
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
                          : 'badge-revoked'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>${product.price}</td>
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
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Retail Price ($)</label>
                    <input
                      type="number"
                      name="price"
                      className="form-input"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="49"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Secure File Storage Path Reference</label>
                  <input
                    type="text"
                    name="filePath"
                    className="form-input font-mono"
                    value={formData.filePath}
                    onChange={handleInputChange}
                    placeholder="products/panel-files/android-stealth-v2.zip"
                  />
                  <span className="form-help">Enter target filename from Firebase Storage.</span>
                </div>

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
