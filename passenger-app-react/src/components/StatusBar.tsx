import { useState, useEffect } from 'react';

export function StatusBar() {
  const [time, setTime] = useState(formatTime());

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar" id="status-bar">
      <span className="status-bar-time">{time}</span>
      <div className="status-bar-icons">
        <svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
        <svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" /></svg>
      </div>
    </div>
  );
}

function formatTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
