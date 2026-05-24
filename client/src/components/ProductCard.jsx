import React from 'react';
import { Smartphone, Monitor, Tablet, MessageCircle } from 'lucide-react';

function ProductCard({ product }) {
  const { id, name, description, price, category, imageUrl } = product;

  // Determine the correct category badge class and icon
  let badgeClass = 'badge-android';
  let IconComponent = Smartphone;

  if (category.toLowerCase().includes('ios')) {
    badgeClass = 'badge-ios';
    IconComponent = Tablet;
  } else if (category.toLowerCase().includes('pc') || category.toLowerCase().includes('windows')) {
    badgeClass = 'badge-pc';
    IconComponent = Monitor;
  }

  // Double check our configured WhatsApp number is Sri Lankan: +94 72 013 1616
  const waNumber = '94720131616';
  const waMessage = encodeURIComponent(`Hi, I want to buy ${name} ($${price}).`);
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`;

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
            <span className="currency">$</span>
            {price}
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
          >
            <MessageCircle size={14} /> Buy via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
