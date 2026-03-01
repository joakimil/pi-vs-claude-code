import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, CASH_PAYMENT } from '../lib/store';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';
import { PaymentIcon } from '../components/PaymentIcon';
import type { PaymentMethod } from '../lib/store';

export function PaymentMethodsPage() {
  const { user, paymentMethods, setPaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod, showToast } = useStore();
  const [loading, setLoading] = useState(true);
  const [addingApplePay, setAddingApplePay] = useState(false);

  // Load payment methods from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setPaymentMethods(data);
          // If user has a default DB method, select it; otherwise keep cash
          const def = data.find((pm: PaymentMethod) => pm.is_default);
          if (def) setSelectedPaymentMethod(def);
        }
        setLoading(false);
      });
  }, [user, setPaymentMethods, setSelectedPaymentMethod]);

  const hasApplePay = paymentMethods.some((pm) => pm.payment_type === 'apple_pay');

  const handleAddApplePay = async () => {
    if (!user) return;
    setAddingApplePay(true);
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        payment_type: 'apple_pay',
        label: 'Apple Pay',
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      showToast(error.message, 'error');
    } else {
      setPaymentMethods([...paymentMethods, data]);
      showToast('Apple Pay added', 'success');
    }
    setAddingApplePay(false);
  };

  const handleSetDefault = async (pm: PaymentMethod) => {
    if (pm.payment_type === 'cash') {
      // Cash: unset all DB defaults, select cash
      if (user) await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
      setPaymentMethods(paymentMethods.map((p) => ({ ...p, is_default: false })));
      setSelectedPaymentMethod(CASH_PAYMENT);
      showToast('Cash set as default', 'success');
      return;
    }
    if (!user) return;
    await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('payment_methods').update({ is_default: true }).eq('id', pm.id);
    const updated = paymentMethods.map((p) => ({ ...p, is_default: p.id === pm.id }));
    setPaymentMethods(updated);
    setSelectedPaymentMethod({ ...pm, is_default: true });
    showToast(`${pm.label} set as default`, 'success');
  };

  const handleDelete = async (pm: PaymentMethod) => {
    if (pm.payment_type === 'cash') return; // Can't delete cash
    await supabase.from('payment_methods').delete().eq('id', pm.id);
    const updated = paymentMethods.filter((p) => p.id !== pm.id);
    setPaymentMethods(updated);
    if (selectedPaymentMethod?.id === pm.id) {
      setSelectedPaymentMethod(CASH_PAYMENT);
    }
    showToast(`${pm.label} removed`, 'info');
  };

  const isCashDefault = selectedPaymentMethod?.payment_type === 'cash';

  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/account" />
        <h1>Payment Methods</h1>
      </div>
      <div className="page-content">
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 72, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 72, marginBottom: 12 }} />
          </>
        ) : (
          <>
            {/* Cash — always available */}
            <div
              className={`payment-method-item${isCashDefault ? ' default' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleSetDefault(CASH_PAYMENT)}
            >
              <PaymentIcon pm={CASH_PAYMENT} size={24} />
              <div style={{ flex: 1 }}>
                <div className="pm-label">Cash</div>
                {isCashDefault && <div className="pm-default">Default</div>}
              </div>
              {isCashDefault && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>✓</span>}
            </div>

            {/* DB payment methods (cards, apple pay) */}
            {paymentMethods.map((pm) => (
              <div key={pm.id} className={`payment-method-item${pm.is_default && !isCashDefault ? ' default' : ''}`}>
                <PaymentIcon pm={pm} size={24} />
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSetDefault(pm)}>
                  <div className="pm-label">{pm.label}</div>
                  {pm.payment_type === 'card' && pm.card_brand && (
                    <div className="pm-brand">{pm.card_brand.charAt(0).toUpperCase() + pm.card_brand.slice(1)}</div>
                  )}
                  {pm.is_default && !isCashDefault && <div className="pm-default">Default</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {pm.is_default && !isCashDefault && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>✓</span>}
                  <button
                    className="pm-action-btn pm-action-delete"
                    title="Remove"
                    onClick={(e) => { e.stopPropagation(); handleDelete(pm); }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Add Apple Pay */}
            {!hasApplePay && (
              <button
                className="apple-pay-add-btn"
                onClick={handleAddApplePay}
                disabled={addingApplePay}
              >
                🍎 {addingApplePay ? 'Adding…' : 'Add Apple Pay'}
              </button>
            )}

            {/* Add Card */}
            <Link to="/payment-methods/add" className="add-payment-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add card
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
