import type { Place } from '../lib/store';

interface Props {
  place: Place;
  onClick: (place: Place) => void;
  icon?: 'clock' | 'pin';
}

export function PlaceItem({ place, onClick, icon = 'pin' }: Props) {
  return (
    <li className="place-item" onClick={() => onClick(place)}>
      <div className="place-icon">
        {icon === 'clock' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
        )}
      </div>
      <div className="place-info">
        <div className="place-name">{place.name}</div>
        <div className="place-address">{place.address}</div>
      </div>
    </li>
  );
}
