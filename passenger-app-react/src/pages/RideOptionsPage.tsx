import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, CASH_PAYMENT } from '../lib/store';
import { supabase } from '../lib/supabase';
import { MapBackground } from '../components/MapBackground';
import { BackButton } from '../components/BackButton';
import { PaymentIcon } from '../components/PaymentIcon';
import type { RideType, PaymentMethod } from '../lib/store';

function estimateFare(rt: RideType, distKm: number, durMin: number): number {
  const fare = rt.base_fare_nok + rt.per_km_nok * distKm + rt.per_min_nok * durMin;
  return Math.max(fare, rt.min_fare_nok);
}

export function RideOptionsPage() {
  const navigate = useNavigate();
  const { destination, rideTypes, setRideTypes, selectedRideType, setSelectedRideType, user, pickup, setCurrentRideId, showToast, seats, setSeats, paymentMethods, setPaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod } = useStore();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  // Fallback: redirect if no destination selected
  useEffect(() => {
    if (!destination) navigate('/search');
  }, [destination, navigate]);

  // Load ride types
  useEffect(() => {
    supabase
      .from('ride_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error && data) {
          setRideTypes(data);
          if (data.length > 0 && !selectedRideType) setSelectedRideType(data[0]);
        }
        setLoading(false);
      });
  }, [setRideTypes, setSelectedRideType, selectedRideType]);

  // Load payment methods if not already loaded
  useEffect(() => {
    if (!user || paymentMethods.length > 0) return;
    supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPaymentMethods(data);
          const def = data.find((pm: PaymentMethod) => pm.is_default) || data[0];
          if (!selectedPaymentMethod) setSelectedPaymentMethod(def);
        }
      });
  }, [user, paymentMethods.length, setPaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod]);

  const distKm = 4.5; // placeholder estimate
  const durMin = 12;

  const handleConfirm = async () => {
    if (!selectedRideType || !user || !destination) return;
    setConfirming(true);

    const fare = estimateFare(selectedRideType, distKm, durMin);

    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: user.id,
        ride_type_id: selectedRideType.id,
        pickup_name: pickup.name,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_name: destination.name,
        dropoff_address: destination.address,
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        estimated_fare_nok: Math.round(fare),
        distance_km: distKm,
        duration_min: durMin,
        passengers: seats,
        status: 'requested',
      })
      .select('id')
      .single();

    if (error) {
      showToast(error.message, 'error');
      setConfirming(false);
      return;
    }

    setCurrentRideId(data.id);
    navigate('/matching');
  };

  const price = selectedRideType ? Math.round(estimateFare(selectedRideType, distKm, durMin)) : '—';

  return (
    <div className="screen active">
      <MapBackground gmapId="gmap-ride">
        <div className="route-marker marker-green" style={{ top: '26%', left: '28%' }}>
          <div className="marker-dot" /><div className="marker-label">Pickup</div>
        </div>
        <div className="route-marker marker-red" style={{ top: '42%', left: '68%' }}>
          <div className="marker-dot" /><div className="marker-label">{destination?.name || 'Drop-off'}</div>
        </div>
      </MapBackground>

      <div className="bottom-sheet" style={{ height: '60%' }}>
        <div className="sheet-handle" />
        <div className="sheet-scroll">
          <div className="ride-options mb-16">
            {loading ? (
              <>
                <div className="skeleton skeleton-ride" />
                <div className="skeleton skeleton-ride" />
              </>
            ) : (
              rideTypes.map((rt) => (
                <div
                  key={rt.id}
                  className={`ride-option${selectedRideType?.id === rt.id ? ' selected' : ''}`}
                  onClick={() => setSelectedRideType(rt)}
                >
                  <div className="ride-icon">{rt.icon}</div>
                  <div className="ride-info">
                    <div className="ride-name">{rt.name}</div>
                    <div className="ride-desc">{rt.description}</div>
                  </div>
                  <div className="ride-meta">
                    <div className="ride-eta">{rt.eta_min} min</div>
                    <div className="ride-price">kr {Math.round(estimateFare(rt, distKm, durMin))}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="seat-selector">
            <div className="seat-selector-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Passengers
            </div>
            <div className="seat-controls">
              <button className="seat-btn" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>−</button>
              <span className="seat-count">{seats}</span>
              <button className="seat-btn" disabled={seats >= 6} onClick={() => setSeats(seats + 1)}>+</button>
            </div>
          </div>

          <div
            className="payment-row"
            style={{ borderTop: '1px solid var(--bg-surface-border)' }}
            onClick={() => setShowPaymentPicker(!showPaymentPicker)}
          >
            <PaymentIcon pm={selectedPaymentMethod} size={18} />
            <span>{selectedPaymentMethod.label}</span>
            <svg className="payment-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>

          {showPaymentPicker && (
            <div className="payment-picker">
              {/* Cash always first */}
              <div
                className={`payment-picker-item${selectedPaymentMethod.id === '_cash' ? ' active' : ''}`}
                onClick={() => { setSelectedPaymentMethod(CASH_PAYMENT); setShowPaymentPicker(false); }}
              >
                <PaymentIcon pm={CASH_PAYMENT} size={16} />
                <span>Cash</span>
                {selectedPaymentMethod.id === '_cash' && <span className="payment-picker-check">✓</span>}
              </div>
              {/* DB methods */}
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`payment-picker-item${pm.id === selectedPaymentMethod.id ? ' active' : ''}`}
                  onClick={() => { setSelectedPaymentMethod(pm); setShowPaymentPicker(false); }}
                >
                  <PaymentIcon pm={pm} size={16} />
                  <span>{pm.label}</span>
                  {pm.id === selectedPaymentMethod.id && <span className="payment-picker-check">✓</span>}
                </div>
              ))}
            </div>
          )}

          <button className="btn-primary" onClick={handleConfirm} disabled={confirming || !selectedRideType}>
            {confirming ? 'Requesting…' : `Confirm — kr ${price}`}
          </button>
        </div>
      </div>

      <BackButton to="/search" style={{ position: 'absolute', top: 62, left: 20, zIndex: 15 }} />
    </div>
  );
}
