import React from 'react';

function GlassCard({ children, className = '', hover = true }) {
  const cardClass = hover ? 'glass-card' : 'glass-card-static';
  return (
    <div className={`${cardClass} ${className}`}>
      {children}
    </div>
  );
}

export default GlassCard;
