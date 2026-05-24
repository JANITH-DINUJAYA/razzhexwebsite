import React, { useState, useEffect } from 'react';
import CategoryFilter from '../components/CategoryFilter';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { PackageOpen } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Android RAT Panel', description: 'Advanced remote administration tool for Android devices with real-time logging, location tracking, and visual commands.', price: 49, category: 'Android Panel', imageUrl: null },
  { id: '2', name: 'Android SMS Gateway', description: 'Bulk SMS automation dashboard with support for schedules, REST APIs, and carrier log exports.', price: 35, category: 'Android Panel', imageUrl: null },
  { id: '3', name: 'iOS MDM Controller', description: 'Mobile device configuration profiles manager to deploy system parameters, lock devices, and push policies.', price: 79, category: 'iOS Panel', imageUrl: null },
  { id: '4', name: 'iOS Push Manager', description: 'Advanced Apple Push Notification service dashboard with custom payloads, segmentation, and batch delivery.', price: 45, category: 'iOS Panel', imageUrl: null },
  { id: '5', name: 'PC Remote Admin', description: 'Extremely fast desktop streaming framework with encrypted command shells, processes managers, and file systems.', price: 59, category: 'PC Panel', imageUrl: null },
  { id: '6', name: 'PC Network Monitor', description: 'Real-time PC network interface analyzer with packet capture, bandwidth graphs, and suspicious IP triggers.', price: 39, category: 'PC Panel', imageUrl: null }
];

function Products() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Android Panel', 'iOS Panel', 'PC Panel'];

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const data = await api.getProducts();
        if (data && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        console.warn('Backend products not loaded, utilizing premium mock collection.', err);
        // Fall back to robust design mock products
        setProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="section page-enter">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ marginBottom: '12px' }}>
            Premium <span className="text-gradient">Products</span>
          </h1>
          <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Select from our high-performance panels. Direct WhatsApp checkouts with strict individual licenses.
          </p>
        </div>

        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {loading ? (
          <div className="loading-spinner"></div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <PackageOpen className="icon" size={48} />
            <p>No products found in this category.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product, index) => (
              <div key={product.id} className={`stagger-${(index % 6) + 1}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;
