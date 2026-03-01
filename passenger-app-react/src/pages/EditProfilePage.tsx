import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';

export function EditProfilePage() {
  const { user, showToast, setUser } = useStore();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName, phone },
    });
    if (error) {
      showToast(error.message, 'error');
    } else {
      setUser(data.user);
      showToast('Profile updated', 'success');
    }
    setSaving(false);
  };

  return (
    <div className="screen active subpage">
      <div className="page-header">
        <BackButton to="/account" />
        <h1>Edit Profile</h1>
      </div>
      <div className="page-content">
        <div className="form-group">
          <label>Display name</label>
          <input type="text" placeholder="Your name" maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone (optional)</label>
          <input type="tel" placeholder="+47 xxx xx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
