import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';
import { PlaceItem } from '../components/PlaceItem';
import type { Place } from '../lib/store';

const SUGGESTIONS: Place[] = [
  { name: 'Aker Brygge', address: 'Brynjulf Bulls plass 6, Oslo', lat: 59.9075, lng: 10.7295 },
  { name: 'Oslo Sentralstasjon', address: 'Jernbanetorget 1, Oslo', lat: 59.9111, lng: 10.7528 },
  { name: 'Grünerløkka', address: 'Thorvald Meyers gate, Oslo', lat: 59.9225, lng: 10.759 },
];

export function SearchPage() {
  const navigate = useNavigate();
  const { user, destination, setDestination } = useStore();
  const [query, setQuery] = useState(destination?.name || '');
  const [recentSearches, setRecentSearches] = useState<Place[]>([]);

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
          setRecentSearches(
            data.map((r: any) => {
              const match = SUGGESTIONS.find((p) => p.name === r.name);
              return { name: r.name, address: r.address || '', lat: match?.lat || 0, lng: match?.lng || 0 };
            })
          );
        }
      });
  }, [user]);

  const filteredSuggestions = query.trim()
    ? SUGGESTIONS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.address.toLowerCase().includes(query.toLowerCase()))
    : SUGGESTIONS;

  const handleSelect = (place: Place) => {
    setDestination(place);
    // Save to recent searches
    if (user) {
      supabase
        .from('recent_searches')
        .upsert({ user_id: user.id, name: place.name, address: place.address, searched_at: new Date().toISOString() }, { onConflict: 'user_id,name' })
        .then(() => {});
    }
    navigate('/ride-options');
  };

  return (
    <div className="screen active search-screen">
      <div className="search-header">
        <BackButton to="/" />
        <div className="search-inputs">
          <div className="search-timeline">
            <div className="search-dot search-dot-green" />
            <div className="search-dash" />
            <div className="search-dot search-dot-red" />
          </div>
          <div className="search-fields">
            <div className="search-field-static">Current Location</div>
            <input
              className="search-field"
              type="text"
              placeholder="Enter destination"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="search-results">
        {recentSearches.length > 0 && (
          <>
            <div className="search-section-title">Recent</div>
            <ul className="place-list">
              {recentSearches.map((p, i) => (
                <PlaceItem key={`recent-${p.name}-${i}`} place={p} onClick={handleSelect} icon="clock" />
              ))}
            </ul>
          </>
        )}
        <div className="search-section-title">Suggestions</div>
        <ul className="place-list">
          {filteredSuggestions.map((p, i) => (
            <PlaceItem key={`suggest-${p.name}-${i}`} place={p} onClick={handleSelect} icon="pin" />
          ))}
        </ul>
      </div>
    </div>
  );
}
