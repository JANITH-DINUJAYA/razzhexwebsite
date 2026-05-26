import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, ArrowRight, MessageSquareCode } from 'lucide-react';
import GlassCard from '../components/GlassCard';

function Home() {
  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge animate-in">
            <span className="dot"></span>
            <span>Premium Secure Digital Distribution</span>
          </div>

          <h1 className="animate-in stagger-1">
            RAAZZ <span className="text-gradient text-glow">HEX</span>
          </h1>

          <p className="hero-subtitle animate-in stagger-2">
            Premium Digital Products &amp; Tools. Access top-tier panels and administration software with a robust manual WhatsApp payment system and secure, single-device license distribution.
          </p>

          <div className="btn-group animate-in stagger-3">
            <Link to="/products" className="btn btn-primary btn-lg">
              View Products <ArrowRight size={18} />
            </Link>
            <a
              href="https://wa.me/94720131616"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              <MessageSquareCode size={18} className="text-accent" /> Contact WhatsApp
            </a>
          </div>

          <div className="animate-in stagger-4" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <Link 
              to="/products?category=Free Panel" 
              className="btn btn-secondary btn-lg"
              style={{
                borderColor: 'var(--neon-pink)',
                color: 'var(--neon-pink)',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.15)',
                textShadow: '0 0 10px rgba(236, 72, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Zap size={18} /> Free Panels <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)' }}>
        <div className="container">
          <h2 className="text-center animate-in" style={{ marginBottom: '40px' }}>
            Why Choose <span className="text-gradient">RAAZZ HEX</span>?
          </h2>

          <div className="features-grid">
            <GlassCard className="feature-card animate-in stagger-1" hover={true}>
              <div className="feature-icon">
                <Shield size={28} />
              </div>
              <h3>Secure Storage</h3>
              <p>
                Our digital packages are hosted in private storage endpoints. No public download sharing, fully protected backend streaming.
              </p>
            </GlassCard>

            <GlassCard className="feature-card animate-in stagger-2" hover={true}>
              <div className="feature-icon">
                <Zap size={28} />
              </div>
              <h3>Instant Activations</h3>
              <p>
                Complete payment directly with the admin on WhatsApp. Get your uniquely generated license key immediately, copy-paste, and download.
              </p>
            </GlassCard>

            <GlassCard className="feature-card animate-in stagger-3" hover={true}>
              <div className="feature-icon">
                <Lock size={28} />
              </div>
              <h3>Anti-Abuse Fingerprint</h3>
              <p>
                Licenses are tied to your device fingerprint. Enforces a strict 1-device limit to prevent account sharing and leakage.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
