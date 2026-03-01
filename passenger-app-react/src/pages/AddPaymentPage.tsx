import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';

/** Detect card brand from number prefix */
function detectBrand(num: string): string {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return '';
}

/** Format card number with spaces every 4 digits */
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** Format expiry as MM/YY */
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

export function AddPaymentPage() {
  const navigate = useNavigate();
  const { user, paymentMethods, setPaymentMethods, setSelectedPaymentMethod, showToast } = useStore();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(paymentMethods.filter((p) => p.payment_type === 'card').length === 0);
  const [saving, setSaving] = useState(false);

  const rawDigits = cardNumber.replace(/\s/g, '');
  const brand = detectBrand(rawDigits);
  const last4 = rawDigits.slice(-4);

  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  }, []);

  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiry(formatExpiry(e.target.value));
  }, []);

  const handleCvcChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3));
  }, [brand]);

  const isValid = rawDigits.length >= 13 && expiry.length === 5 && cvc.length >= 3 && name.trim().length > 0;

  const handleSave = async () => {
    if (!user || !isValid) return;
    setSaving(true);

    // Validate expiry
    const [mm, yy] = expiry.split('/');
    const month = parseInt(mm, 10);
    if (month < 1 || month > 12) {
      showToast('Invalid expiry month', 'error');
      setSaving(false);
      return;
    }

    const expiresAt = `20${yy}-${mm.padStart(2, '0')}-01`;

    // If setting as default, unset others first
    if (isDefault) {
      await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
    }

    const label = `${BRAND_LABELS[brand] || 'Card'} •••• ${last4}`;

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        payment_type: 'card',
        label,
        is_default: isDefault,
        card_brand: brand || 'unknown',
        card_last4: last4,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }

    const updated = isDefault
      ? [...paymentMethods.map((p) => ({ ...p, is_default: false })), data]
      : [...paymentMethods, data];
    setPaymentMethods(updated);
    if (isDefault) setSelectedPaymentMethod(data);
    showToast('Card added', 'success');
    navigate('/payment-methods');
  };

  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/payment-methods" />
        <h1>Add Card</h1>
      </div>
      <div className="page-content">
        {/* Card preview */}
        <div className="card-preview">
          <div className="card-preview-brand-row">
            <span className="card-preview-icon">💳</span>
            <span className="card-preview-brand">{BRAND_LABELS[brand] || 'Credit / Debit Card'}</span>
          </div>
          {rawDigits.length > 0 && (
            <div className="card-preview-number">
              {'•••• •••• •••• ' + (last4 || '••••')}
            </div>
          )}
        </div>

        <p className="add-card-hint">All fields are required.</p>

        {/* Cardholder name */}
        <div className="card-form-group">
          <label className="card-form-label">Cardholder name</label>
          <input
            type="text"
            className="card-form-input"
            placeholder="Name on card"
            autoComplete="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Card number */}
        <div className="card-form-group">
          <label className="card-form-label">Card number</label>
          <div className="card-input-with-brand">
            <input
              type="text"
              className="card-form-input"
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={handleCardNumberChange}
            />
            {brand && <span className="card-input-brand">{BRAND_LABELS[brand]}</span>}
          </div>
        </div>

        {/* Expiry + CVC side by side */}
        <div className="card-form-row">
          <div className="card-form-group" style={{ flex: 1 }}>
            <label className="card-form-label">Expiry date</label>
            <input
              type="text"
              className="card-form-input"
              placeholder="MM/YY"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={expiry}
              onChange={handleExpiryChange}
            />
            <span className="card-form-hint">MM/YY format</span>
          </div>
          <div className="card-form-group" style={{ flex: 1 }}>
            <label className="card-form-label">Security code</label>
            <input
              type="text"
              className="card-form-input"
              placeholder={brand === 'amex' ? '4 digits' : '3 digits'}
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvc}
              onChange={handleCvcChange}
            />
            <span className="card-form-hint">{brand === 'amex' ? '4' : '3'} digits on back of card</span>
          </div>
        </div>

        {/* Default toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <input type="checkbox" id="card-default" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          <label htmlFor="card-default" style={{ color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
            Set as default payment method
          </label>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving || !isValid}>
          {saving ? 'Saving…' : '🔒 Save details'}
        </button>
      </div>
    </div>
  );
}
