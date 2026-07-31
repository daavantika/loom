import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function AccountModal() {
  const auth = useAppStore((s) => s.auth);
  const customerProfile = useAppStore((s) => s.customerProfile);
  const updateDisplayName = useAppStore((s) => s.updateDisplayName);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customerProfile?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const displayName = customerProfile?.displayName || auth?.email || 'Guest';
  const avatarInitial = displayName[0]?.toUpperCase() ?? '?';

  const save = async () => {
    setSaving(true);
    await updateDisplayName(name.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <>
      <ModalHeader title="Your account" />
      <div className="account-details">
        <div className="avatar-large">{avatarInitial}</div>
        <h3>{displayName}</h3>
        <p>{auth?.email}</p>
        {editing ? (
          <div className="filter-block" style={{ width: '100%' }}>
            <label className="address-label" htmlFor="display-name">
              Display name
            </label>
            <input id="display-name" className="address-input" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="modal-actions">
              <button className="primary-button" onClick={save} disabled={saving || !name.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button className="outline-button" onClick={() => setEditing(true)}>
            Edit profile details
          </button>
        )}
      </div>
    </>
  );
}
