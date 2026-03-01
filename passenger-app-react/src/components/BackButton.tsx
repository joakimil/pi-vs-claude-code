import { useNavigate } from 'react-router-dom';

interface Props {
  to?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function BackButton({ to, style, className }: Props) {
  const navigate = useNavigate();

  return (
    <button
      className={`back-btn ${className || ''}`}
      style={style}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  );
}
