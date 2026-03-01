import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';

interface Investor {
  id: string;
  name: string;
  amount: number;
  name_is_anonymous: boolean;
  amount_is_anonymous: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export function InvestorsPage() {
  const { showToast } = useStore();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nameAnon, setNameAnon] = useState(false);
  const [amountAnon, setAmountAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadInvestors = async () => {
    const { data } = await supabase.from('investors').select('*').order('created_at', { ascending: false });
    if (data) {
      setInvestors(data);
      setTotal(data.reduce((sum: number, i: any) => sum + (i.amount_is_anonymous ? 0 : (i.amount || 0)), 0));
    }
  };

  useEffect(() => { loadInvestors(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) {
      showToast('Please fill in name and amount', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('investors').insert({
      name: name.trim(),
      amount: parseFloat(amount),
      name_is_anonymous: nameAnon,
      amount_is_anonymous: amountAnon,
      contact_email: email.trim() || null,
      contact_phone: phone.trim() || null,
    });
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Investment submitted!', 'success');
      setName(''); setAmount(''); setEmail(''); setPhone('');
      setNameAnon(false); setAmountAnon(false);
      loadInvestors();
    }
    setSubmitting(false);
  };

  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/account" />
        <h1>Investors</h1>
      </div>
      <div className="page-content">
        <div className="investors-total-card">
          <div className="investors-total-label">Total investment</div>
          <div className="investors-total-amount">kr {total.toLocaleString()}</div>
          <div className="investors-total-meta">{investors.length} investor{investors.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="help-section-title">Add investment</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" placeholder="Your name or company" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
            <label className="form-checkbox-label"><input type="checkbox" checked={nameAnon} onChange={(e) => setNameAnon(e.target.checked)} /> Show as anonymous</label>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" placeholder="Amount" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <label className="form-checkbox-label"><input type="checkbox" checked={amountAnon} onChange={(e) => setAmountAnon(e.target.checked)} /> Hide amount</label>
          </div>
          <div className="form-group">
            <label>Contact (optional)</label>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="tel" placeholder="Phone" style={{ marginTop: 8 }} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </form>

        <div className="help-section-title" style={{ marginTop: 24 }}>Investors</div>
        {investors.length === 0 ? (
          <div className="investors-empty">No investments yet.</div>
        ) : (
          <ul className="investors-list">
            {investors.map((inv) => (
              <li key={inv.id} className="investors-item">
                <span className="investors-item-name">{inv.name_is_anonymous ? 'Anonymous' : inv.name}</span>
                <span className="investors-item-amount">{inv.amount_is_anonymous ? 'Hidden' : `kr ${inv.amount.toLocaleString()}`}</span>
                {inv.contact_email && <span className="investors-item-contact">{inv.contact_email}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
