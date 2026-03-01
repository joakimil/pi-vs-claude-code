import { useCallback, useRef } from 'react';
import { useStore } from '../lib/store';

export function useGeolocation() {
  const hasLocated = useRef(false);
  const setUserLocation = useStore((s) => s.setUserLocation);
  const setLocationPermission = useStore((s) => s.setLocationPermission);
  const setPickup = useStore((s) => s.setPickup);
  const showToast = useStore((s) => s.showToast);

  const requestGeolocation = useCallback(() => {
    if (hasLocated.current) return;
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (hasLocated.current) return;
        hasLocated.current = true;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        const { pickup } = useStore.getState();
        setPickup({ ...pickup, lat: loc.lat, lng: loc.lng });
        showToast('Location updated', 'success');
      },
      () => {
        showToast('Using default pickup location', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [setUserLocation, setPickup, showToast]);

  const allowLocation = useCallback(() => {
    setLocationPermission('granted');
    requestGeolocation();
  }, [setLocationPermission, requestGeolocation]);

  const denyLocation = useCallback(() => {
    setLocationPermission('denied');
    showToast('Using default pickup location', 'info');
  }, [setLocationPermission, showToast]);

  return { requestGeolocation, allowLocation, denyLocation };
}
