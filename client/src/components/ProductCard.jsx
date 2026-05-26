import React, { useState } from 'react';
import { Smartphone, Monitor, Tablet, MessageCircle, Download, RefreshCw, Zap } from 'lucide-react';
import api from '../utils/api';

function ProductCard({ product }) {
  const { id, name, description, price, category, imageUrl } = product;
  const [downloading, setDownloading] = useState(false);

  // Determine the correct category badge class and icon
  let badgeClass = 'badge-android';
  let IconComponent = Smartphone;

  if (category.toLowerCase().includes('ios')) {
    badgeClass = 'badge-ios';
    IconComponent = Tablet;
  } else if (category.toLowerCase().includes('pc') || category.toLowerCase().includes('windows')) {
    badgeClass = 'badge-pc';
    IconComponent = Monitor;
  } else if (category.toLowerCase().includes('free')) {
    badgeClass = 'badge-free';
    IconComponent = Zap;
  }

  const isFree = category.toLowerCase().includes('free') || price === 0;

  // Double check our configured WhatsApp number is Sri Lankan: +94 72 013 1616
  const waNumber = '94720131616';
  const waMessage = encodeURIComponent(`Hi, I want to buy ${name} (LKR ${price}).`);
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`;

  const handleDownloadFree = async () => {
    try {
      setDownloading(true);
      const res = await api.getFreeDownloadUrl(id);
      if (res.downloadUrl) {
        const isExternal = res.downloadUrl.startsWith('http') && !res.downloadUrl.includes('firebasestorage');
        
        if (isExternal) {
          window.open(res.downloadUrl, '_blank');
        } else {
          const link = document.createElement('a');
          link.href = res.downloadUrl;
          link.setAttribute('download', res.fileName || `${name}.zip`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        throw new Error('Download target is empty.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download free panel file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="product-card animate-in">
      <div className="product-card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div className="product-icon text-gradient">
            <IconComponent size={64} />
          </div>
        )}
        <span className={`product-card-badge ${badgeClass}`}>{category}</span>
      </div>

      <div className="product-card-body">
        <h3>{name}</h3>
        <p className="description">{description}</p>

        <div className="product-card-footer">
          <div className="product-price">
            {isFree ? (
              <span className="text-gradient" style={{ fontWeight: 700, fontSize: '1.1rem', textShadow: '0 0 10px rgba(236,72,153,0.2)' }}>FREE</span>
            ) : (
              <>
                <span className="currency" style={{ fontSize: '0.85rem', marginRight: '4px' }}>Rs.</span>
                {price}
              </>
            )}
          </div>

          {isFree ? (
            <button
              onClick={handleDownloadFree}
              disabled={downloading}
              className="btn btn-primary btn-sm"
              style={{
                background: 'var(--gradient-accent)',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {downloading ? (
                <>
                  <RefreshCw className="spinner" size={14} /> Downloading...
                </>
              ) : (
                <>
                  <Download size={14} /> Download Now
                </>
              )}
            </button>
          ) : (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-sm"
            >
              <MessageCircle size={14} /> Buy via WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
