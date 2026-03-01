import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export function AuthScreen() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setUser(data.user);
    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data.user && !data.session) {
      setSuccess('Check your email to confirm your account, then sign in.');
      setLoading(false);
      return;
    }
    setUser(data.user);
    setLoading(false);
  };

  const switchTab = (t: 'signin' | 'signup') => {
    setTab(t);
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">🚕</div>
        <div className="auth-title">RideGo</div>
        <div className="auth-subtitle">Sign in to request rides around Oslo</div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => switchTab('signin')}>
            Sign In
          </button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>
            Sign Up
          </button>
        </div>

        {tab === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="auth-input-group">
              <label>Email</label>
              <input className="auth-input" type="email" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input className="auth-input" type="password" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="auth-input-group">
              <label>Name</label>
              <input className="auth-input" type="text" placeholder="Your name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label>Email</label>
              <input className="auth-input" type="email" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input className="auth-input" type="password" placeholder="Min 6 characters" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer">Private preview — by invitation only</div>
      </div>
    </div>
  );
}
