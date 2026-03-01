import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { MapBackground } from '../components/MapBackground';

interface RideData {
  id: string;
  status: string;
  pickup_name: string;
  dropoff_name: string;
  driver_id: string | null;
  estimated_fare_nok: number;
  distance_km: number;
  duration_min: number;
}

export function TripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, currentRideId, setCurrentRideId, showToast } = useStore();
  const rideId = searchParams.get('id') || currentRideId;
  const [ride, setRide] = useState<RideData | null>(null);
  const [statusText, setStatusText] = useState('Driver on the way');

  useEffect(() => {
    if (!rideId || !user) {
      navigate('/');
      return;
    }
    setCurrentRideId(rideId);

    supabase
      .from('rides')
      .select('id, status, pickup_name, dropoff_name, driver_id, estimated_fare_nok, distance_km, duration_min')
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
        updateStatusText(data.status);
      });

    const channel = supabase
      .channel(`ride-trip-${rideId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, (payload) => {
        const r = payload.new as any;
        updateStatusText(r.status);
        if (r.status === 'completed') {
          navigate(`/complete?id=${rideId}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId, user, navigate, setCurrentRideId, showToast]);

  function updateStatusText(status: string) {
    if (status === 'driver_assigned') setStatusText('Driver assigned');
    else if (status === 'arriving') setStatusText('Driver arriving');
    else if (status === 'in_progress') setStatusText('Trip in progress');
    else setStatusText('Driver on the way');
  }

  const handleCancel = async () => {
    if (!rideId) return;
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
    setCurrentRideId(null);
    showToast('Ride cancelled', 'info');
    navigate('/');
  };

  return (
    <div className="screen active">
      <MapBackground gmapId="gmap-trip">
        <div className="route-marker marker-green" style={{ top: '26%', left: '28%' }}>
          <div className="marker-dot" /><div className="marker-label">Pickup</div>
        </div>
        <div className="route-marker marker-red" style={{ top: '42%', left: '68%' }}>
          <div className="marker-dot" /><div className="marker-label">{ride?.dropoff_name || 'Drop-off'}</div>
        </div>
      </MapBackground>

      <div className="arriving-card">
        <div className="arriving-dot" />
        <span className="arriving-text">{statusText}</span>
        <span className="arriving-countdown">—</span>
      </div>

      <div className="bottom-sheet" style={{ height: '54%' }}>
        <div className="sheet-handle" />
        <div className="sheet-scroll">
          <div className="driver-card mb-16">
            <div className="driver-avatar">—</div>
            <div className="driver-info">
              <div className="driver-name">—</div>
              <div className="driver-rating">—</div>
              <div className="driver-car">—</div>
            </div>
          </div>

          <div className="action-row">
            <button className="btn-outline">Call</button>
            <button className="btn-outline">Message</button>
          </div>

          <div className="trip-timeline">
            <div className="timeline-point">
              <div className="timeline-connector">
                <div className="tl-dot tl-dot-green" /><div className="tl-dashed" />
              </div>
              <div className="timeline-text">
                <div className="tl-label">PICKUP</div>
                <div className="tl-value">{ride?.pickup_name || '—'}</div>
              </div>
            </div>
            <div className="timeline-point">
              <div className="timeline-connector">
                <div className="tl-dot tl-dot-red" />
              </div>
              <div className="timeline-text">
                <div className="tl-label">DROP-OFF</div>
                <div className="tl-value">{ride?.dropoff_name || '—'}</div>
              </div>
            </div>
          </div>

          <button className="btn-text-danger" style={{ width: '100%', textAlign: 'center' }} onClick={handleCancel}>
            Cancel Ride
          </button>
          <button
            className="btn-primary"
            style={{ display: 'block', textAlign: 'center', marginTop: 12 }}
            onClick={() => navigate(`/complete?id=${rideId}`)}
          >
            Complete Trip
          </button>
        </div>
      </div>
    </div>
  );
}
