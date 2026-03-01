import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { MapBackground } from '../components/MapBackground';

export function MatchingPage() {
  const navigate = useNavigate();
  const { currentRideId, showToast, setCurrentRideId } = useStore();

  useEffect(() => {
    if (!currentRideId) {
      navigate('/');
      return;
    }

    // Listen for ride status changes
    const channel = supabase
      .channel(`ride-${currentRideId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${currentRideId}` }, (payload) => {
        const ride = payload.new as any;
        if (ride.status === 'driver_assigned' || ride.status === 'arriving' || ride.status === 'in_progress') {
          navigate(`/trip?id=${currentRideId}`);
        }
        if (ride.status === 'cancelled') {
          showToast('Ride cancelled', 'info');
          setCurrentRideId(null);
          navigate('/');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentRideId, navigate, showToast, setCurrentRideId]);

  const handleCancel = async () => {
    if (!currentRideId) return;
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', currentRideId);
    setCurrentRideId(null);
    showToast('Ride cancelled', 'info');
    navigate('/');
  };

  return (
    <div className="screen active">
      <MapBackground gmapId="gmap-matching" />
      <div className="matching-content">
        <div className="matching-spinner" />
        <h3>Finding a driver...</h3>
        <p className="matching-sub">Searching nearby drivers...</p>
        <button className="btn-outline" onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
}
