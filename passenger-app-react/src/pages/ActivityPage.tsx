import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

interface Ride {
  id: string;
  pickup_name: string;
  dropoff_name: string;
  estimated_fare_nok: number;
  status: string;
  created_at: string;
}

export function ActivityPage() {
  const { user } = useStore();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('rides')
      .select('id, pickup_name, dropoff_name, estimated_fare_nok, status, created_at')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setRides(data);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="screen active subpage">
      <div className="page-header">
        <h1>Activity</h1>
      </div>
      <div className="page-content">
        {loading ? (
          <>
            <div className="skeleton skeleton-activity" />
            <div className="skeleton skeleton-activity" />
            <div className="skeleton skeleton-activity" />
          </>
        ) : rides.length === 0 ? (
          <div className="activity-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            <p>No rides yet</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Your trip history will appear here.</p>
          </div>
        ) : (
          <ul className="activity-list">
            {rides.map((r) => (
              <li key={r.id} className="activity-item">
                <div className="activity-route">{r.pickup_name} → {r.dropoff_name}</div>
                <div className="activity-meta">
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <span>kr {Math.round(r.estimated_fare_nok)}</span>
                </div>
                <div className={`activity-status ${r.status === 'completed' ? 'completed' : r.status === 'cancelled' ? 'cancelled' : ''}`}>
                  {r.status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
