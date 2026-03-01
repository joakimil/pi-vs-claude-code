import { useStore } from '../lib/store';

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
