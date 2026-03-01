import type { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  gmapId?: string;
}

export function MapBackground({ children, gmapId }: Props) {
  return (
    <div className="map-bg">
      {gmapId && <div className="gmap" id={gmapId} />}
      <div className="map-road road-h1" />
      <div className="map-road road-h2" />
      <div className="map-road road-v1" />
      <div className="map-road road-v2" />
      <div className="map-road road-v3" />
      <div className="map-road road-h3" />
      {children}
    </div>
  );
}
