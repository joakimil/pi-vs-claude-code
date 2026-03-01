import type { PaymentMethod } from '../lib/store';

interface Props {
  pm: PaymentMethod;
  size?: number;
}

export function PaymentIcon({ pm, size = 20 }: Props) {
  if (pm.payment_type === 'apple_pay') {
    return <span className="pm-type-icon" style={{ fontSize: size }}>🍎</span>;
  }
  if (pm.payment_type === 'cash') {
    return <span className="pm-type-icon" style={{ fontSize: size }}>💵</span>;
  }
  // Card — show brand icon
  const brand = pm.card_brand?.toLowerCase();
  if (brand === 'visa') return <span className="pm-type-icon" style={{ fontSize: size }}>💳</span>;
  if (brand === 'mastercard') return <span className="pm-type-icon" style={{ fontSize: size }}>💳</span>;
  if (brand === 'amex') return <span className="pm-type-icon" style={{ fontSize: size }}>💳</span>;
  return <span className="pm-type-icon" style={{ fontSize: size }}>💳</span>;
}
