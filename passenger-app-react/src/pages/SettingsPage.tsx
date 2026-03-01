import { BackButton } from '../components/BackButton';

export function SettingsPage() {
  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/account" />
        <h1>Settings</h1>
      </div>
      <div className="page-content">
        <div className="settings-section">
          <h3 className="settings-section-title">Preferences</h3>
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Push Notifications</div>
              <div className="setting-desc">Receive ride updates and promotions</div>
            </div>
            <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider" /></label>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Sound Effects</div>
              <div className="setting-desc">Play sounds for ride events</div>
            </div>
            <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider" /></label>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Email Receipts</div>
              <div className="setting-desc">Receive ride receipts via email</div>
            </div>
            <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider" /></label>
          </div>
        </div>
        <div className="settings-section">
          <h3 className="settings-section-title">About</h3>
          <div className="setting-row"><span className="setting-label">Version</span><span>1.0</span></div>
          <div className="setting-row"><a href="#" className="setting-label">Terms of Service</a></div>
          <div className="setting-row"><a href="#" className="setting-label">Privacy Policy</a></div>
        </div>
        <button className="btn-danger-outline">Delete Account</button>
      </div>
    </div>
  );
}
