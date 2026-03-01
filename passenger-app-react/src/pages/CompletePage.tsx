import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export function CompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, currentRideId, setCurrentRideId, showToast } = useStore();
  const rideId = searchParams.get('id') || currentRideId;

  const [ride, setRide] = useState<any>(null);
  const [stars, setStars] = useState(5);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!rideId || !user) {
      navigate('/');
      return;
    }

    supabase
      .from('rides')
      .select('id, pickup_name, dropoff_name, estimated_fare_nok, final_fare_nok, distance_km, duration_min')
      .eq('id', rideId)
      .eq('passenger_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          showToast('Ride not found', 'error');
          navigate('/');
          return;
        }
        setRide(data);
      });
  }, [rideId, user, navigate, showToast]);

  const fare = ride?.final_fare_nok ?? ride?.estimated_fare_nok;

  const handleDone = async () => {
    if (!rideId) return;
    const { error } = await supabase
      .rpc('rate_ride', { p_ride_id: rideId, p_stars: stars, p_tip_nok: tip, p_comment: null });
    if (error) {
      showToast('Saved', 'info');
    } else {
      showToast('Thanks!', 'success');
    }
    setCurrentRideId(null);
    navigate('/');
  };

  return (
    <div className="screen active trip-complete-screen">
      <div className="complete-header">
        <div className="complete-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2>Trip Complete ✓</h2>
      </div>

      <div className="fare-card">
        <div className="fare-route">{ride ? `${ride.pickup_name} → ${ride.dropoff_name}` : '— → —'}</div>
        <div className="fare-row"><span>Base fare</span><span>kr {fare != null ? Math.round(fare * 0.37) : '—'}</span></div>
        <div className="fare-row"><span>Distance</span><span>{ride?.distance_km != null ? `${ride.distance_km} km` : '—'}</span></div>
        <div className="fare-row"><span>Time</span><span>{ride?.duration_min != null ? `${ride.duration_min} min` : '—'}</span></div>
        <div className="divider" />
        <div className="fare-row">
          <span className="fare-total-label">Total</span>
          <span className="fare-total">kr {fare != null ? Math.round(fare) : '—'}</span>
        </div>
      </div>

      <div className="rating-section">
        <h4>Rate your ride</h4>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`star-btn${n <= stars ? ' active' : ''}`} onClick={() => setStars(n)}>
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="tip-section">
        <h4>Add a tip</h4>
        <div className="tip-row">
          {[0, 10, 20, 30].map((t) => (
            <button key={t} className={`tip-btn${tip === t ? ' active' : ''}`} onClick={() => setTip(t)}>
              {t === 0 ? 'No tip' : `kr ${t}`}
            </button>
          ))}
        </div>
      </div>

      <textarea className="comment-box" placeholder="Additional comments..." rows={2} />
      <button className="btn-primary" onClick={handleDone}>Done</button>
    </div>
  );
}
