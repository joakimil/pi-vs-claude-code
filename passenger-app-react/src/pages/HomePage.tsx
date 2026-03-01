import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useLocation';
import { MapBackground } from '../components/MapBackground';
import { PlaceItem } from '../components/PlaceItem';
import type { Place } from '../lib/store';

const DEFAULT_PLACES: Place[] = [
  { name: 'Aker Brygge', address: 'Brynjulf Bulls plass 6, Oslo', lat: 59.9075, lng: 10.7295 },
  { name: 'Oslo Sentralstasjon', address: 'Jernbanetorget 1, Oslo', lat: 59.9111, lng: 10.7528 },
  { name: 'Grünerløkka', address: 'Thorvald Meyers gate, Oslo', lat: 59.9225, lng: 10.759 },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, locationPermission, userLocation, setDestination } = useStore();
  const { requestGeolocation } = useGeolocation();
  const [recentPlaces, setRecentPlaces] = useState<Place[]>(DEFAULT_PLACES);

  // Request location once on mount if granted
  useEffect(() => {
    if (locationPermission === 'granted') requestGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load recent searches
  useEffect(() => {
    if (!user) return;
    supabase
      .from('recent_searches')
      .select('name, address, location, searched_at')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const places = data.map((r: any) => {
            const match = DEFAULT_PLACES.find((p) => p.name === r.name);
            return { name: r.name, address: r.address || '', lat: match?.lat || 0, lng: match?.lng || 0 };
          });
          setRecentPlaces(places);
        }
      });
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    const period = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there';
    return `Good ${period}, ${userName} 👋`;
  })();

  const handlePlaceClick = (place: Place) => {
    setDestination(place);
    navigate('/search');
  };

  return (
    <div className="screen active" id="screen-home">
      <MapBackground gmapId="gmap-home">
        <div className="location-dot" style={{ top: '38%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="ring" />
          <div className="dot" />
        </div>
      </MapBackground>
      <div className="bottom-sheet" style={{ height: '48%', paddingBottom: 80 }}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{greeting}</h2>
        <div className="location-status">
          <div className={`location-status-dot${userLocation ? ' active' : ''}`} />
          <span>{userLocation ? 'Current location' : 'Location unavailable'}</span>
        </div>

        <div className="search-bar mb-16" onClick={() => navigate('/search')} style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Where to?</span>
        </div>

        <div className="chips-row mb-16">
          <div className="chip"><span className="chip-emoji">🏠</span> Home</div>
          <div className="chip"><span className="chip-emoji">💼</span> Work</div>
          <div className="chip"><span className="chip-emoji">✈️</span> Airport</div>
        </div>

        <ul className="place-list">
          {recentPlaces.map((p, i) => (
            <PlaceItem key={`${p.name}-${i}`} place={p} onClick={handlePlaceClick} icon="clock" />
          ))}
        </ul>
      </div>
    </div>
  );
}
