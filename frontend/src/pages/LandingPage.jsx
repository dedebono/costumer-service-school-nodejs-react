import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Animated Background */}
      <div className="landing__bg">
        <div className="landing__bg-gradient"></div>
        <div className="landing__bg-pattern"></div>
        <div className="landing__bg-orbs">
          <div className="orb orb--1"></div>
          <div className="orb orb--2"></div>
          <div className="orb orb--3"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="landing__nav">
        <div className="landing__nav-brand">
          <div className="landing__logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="url(#logo-gradient)"/>
              <path d="M12 28V12h8c2.5 0 4.5 0.5 6 1.5s2.25 2.5 2.25 4.5c0 1.2-0.3 2.2-0.9 3s-1.4 1.4-2.4 1.8c1.1 0.3 2 0.9 2.7 1.8s1 2 1 3.2c0 2.2-0.7 3.8-2.2 4.9s-3.6 1.6-6.4 1.6H12z" fill="white"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#264da1"/>
                  <stop offset="1" stopColor="#f7b917"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="landing__brand-text">EduConsult</span>
        </div>
        <div className="landing__nav-actions">
          <Link to="/login" className="landing__nav-link">Staff Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing__hero">
        <div className="landing__hero-content">
          <div className="landing__hero-badge">
            <span className="landing__hero-badge-icon">✨</span>
            <span>Welcome to Our Service Center</span>
          </div>
          <h1 className="landing__title">
            Your Journey to <span className="landing__title-accent">Success</span> Starts Here
          </h1>
          <p className="landing__subtitle">
            We're here to guide you through every step of the enrollment process. 
            Get personalized consultation and seamless service experience.
          </p>
          <div className="landing__cta-group">
            <Link to="/kiosk" className="landing__cta landing__cta--primary">
              <span className="landing__cta-icon">🎫</span>
              <span className="landing__cta-content">
                <span className="landing__cta-label">Take a Queue</span>
                <span className="landing__cta-desc">Start your consultation</span>
              </span>
              <span className="landing__cta-arrow">→</span>
            </Link>
            <Link to="/login" className="landing__cta landing__cta--secondary">
              <span className="landing__cta-icon">🔐</span>
              <span className="landing__cta-content">
                <span className="landing__cta-label">Staff Portal</span>
                <span className="landing__cta-desc">Access dashboard</span>
              </span>
              <span className="landing__cta-arrow">→</span>
            </Link>
          </div>
        </div>

        <div className="landing__hero-visual">
          <div className="landing__hero-card landing__hero-card--1">
            <div className="landing__hero-card-icon">🎓</div>
            <div className="landing__hero-card-text">
              <span className="landing__hero-card-title">Education</span>
              <span className="landing__hero-card-desc">Quality Programs</span>
            </div>
          </div>
          <div className="landing__hero-card landing__hero-card--2">
            <div className="landing__hero-card-icon">📋</div>
            <div className="landing__hero-card-text">
              <span className="landing__hero-card-title">Registration</span>
              <span className="landing__hero-card-desc">Easy Enrollment</span>
            </div>
          </div>
          <div className="landing__hero-card landing__hero-card--3">
            <div className="landing__hero-card-icon">💬</div>
            <div className="landing__hero-card-text">
              <span className="landing__hero-card-title">Consultation</span>
              <span className="landing__hero-card-desc">Expert Guidance</span>
            </div>
          </div>
          <div className="landing__hero-center">
            <div className="landing__hero-center-inner">
              <span className="landing__hero-center-emoji">🏫</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing__features">
        <div className="landing__features-header">
          <h2 className="landing__features-title">Why Choose Us?</h2>
          <p className="landing__features-subtitle">We provide the best service experience for your educational journey</p>
        </div>
        <div className="landing__features-grid">
          <div className="landing__feature-card">
            <div className="landing__feature-icon">⚡</div>
            <h3>Fast Service</h3>
            <p>Quick and efficient queue system to minimize your waiting time</p>
          </div>
          <div className="landing__feature-card">
            <div className="landing__feature-icon">👥</div>
            <h3>Expert Staff</h3>
            <p>Our trained consultants are ready to answer all your questions</p>
          </div>
          <div className="landing__feature-card">
            <div className="landing__feature-icon">📱</div>
            <h3>Digital Queue</h3>
            <p>Modern ticketing system with real-time status updates</p>
          </div>
          <div className="landing__feature-card">
            <div className="landing__feature-icon">🎯</div>
            <h3>Personalized</h3>
            <p>Tailored consultation based on your specific needs</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="landing__actions">
        <div className="landing__actions-card">
          <div className="landing__actions-content">
            <h2>Ready to Get Started?</h2>
            <p>Take a queue number now and our friendly staff will assist you shortly.</p>
          </div>
          <Link to="/kiosk" className="landing__action-btn">
            <span>Get Queue Number</span>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="landing__footer-content">
          <div className="landing__footer-brand">
            <span className="landing__brand-text">EduConsult</span>
            <p>Your trusted education consultant partner</p>
          </div>
          <div className="landing__footer-links">
            <Link to="/kiosk">Queue System</Link>
            <Link to="/login">Staff Portal</Link>
          </div>
        </div>
        <div className="landing__footer-bottom">
          <p>© 2026 EduConsult. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
