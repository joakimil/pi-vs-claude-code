import { useStore } from '../lib/store';
import { useGeolocation } from '../hooks/useLocation';

export function LocationModal() {
  const locationPermission = useStore((s) => s.locationPermission);
  const { allowLocation, denyLocation } = useGeolocation();

  if (locationPermission !== 'unknown') return null;

  return (
    <div className="location-modal" style={{ display: 'flex' }}>
      <div className="location-modal-card">
        <div className="location-modal-icon">📍</div>
        <h3>Allow "RideGo" to use your location?</h3>
        <p>We use your location to find your pickup point and show nearby drivers.</p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={allowLocation}>
          While Using the App
        </button>
        <button className="btn-outline" style={{ width: '100%', marginTop: 10 }} onClick={denyLocation}>
          Don't Allow
        </button>
      </div>
    </div>
  );
}
