import React, { useEffect, useState } from 'react';

function AnimatedBackground() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate 8 floating hexagon particles with random sizes, positions, and speeds
    const newParticles = Array.from({ length: 8 }).map((_, index) => {
      const size = Math.floor(Math.random() * 50) + 30; // 30px to 80px
      const left = Math.random() * 100; // 0% to 100%
      const duration = Math.floor(Math.random() * 20) + 15; // 15s to 35s
      const delay = Math.random() * -20; // negative delay to stagger entry immediately

      return {
        id: index,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        },
      };
    });
    setParticles(newParticles);
  }, []);

  return (
    <div className="animated-bg">
      <div className="grid-overlay"></div>
      <div className="hero-glow-orb blue"></div>
      <div className="hero-glow-orb purple"></div>
      
      {particles.map((p) => (
        <div key={p.id} className="hex-particle" style={p.style}>
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor">
            <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" strokeWidth="2" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export default AnimatedBackground;
