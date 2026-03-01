import { BackButton } from '../components/BackButton';

export function SafetyPage() {
  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/account" />
        <h1>Safety</h1>
      </div>
      <div className="page-content">
        <a href="tel:112" className="emergency-btn">
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Emergency Call 112</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Contact emergency services</div>
          </div>
        </a>

        <div className="safety-card">
          <div className="safety-card-title">🛡️ Emergency Contacts</div>
          <div id="emergency-contacts-list" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="text" placeholder="Name" className="auth-input" style={{ flex: 1, margin: 0 }} />
            <input type="tel" placeholder="Phone" className="auth-input" style={{ flex: 1, margin: 0 }} />
            <button className="btn-primary" style={{ padding: '10px 16px' }}>Add</button>
          </div>
        </div>

        <div className="safety-card">
          <div className="safety-card-title">📋 Safety Tips</div>
          <ul className="safety-tips-list">
            <li>Always verify your driver's name and car details before getting in</li>
            <li>Share your trip status with a trusted contact</li>
            <li>Sit in the back seat when riding alone</li>
            <li>Trust your instincts — cancel if something feels wrong</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
