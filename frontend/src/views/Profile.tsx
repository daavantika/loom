import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export default function Profile() {
  const navigate = useNavigate();
  const auth = useAppStore((s) => s.auth);
  const customerProfile = useAppStore((s) => s.customerProfile);
  const loadProfile = useAppStore((s) => s.loadProfile);
  const cookProfile = useAppStore((s) => s.cookProfile);
  const cookProfileChecked = useAppStore((s) => s.cookProfileChecked);
  const loadCookStatus = useAppStore((s) => s.loadCookStatus);
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);
  const logout = useAppStore((s) => s.logout);

  useEffect(() => {
    if (auth) {
      loadProfile();
      loadCookStatus();
    }
  }, [auth, loadProfile, loadCookStatus]);

  const toggleDark = () => {
    document.documentElement.classList.toggle('force-dark');
    showToast('Appearance follows your device setting');
  };

  const displayName = customerProfile?.displayName || auth?.email || 'there';
  const avatarInitial = displayName[0]?.toUpperCase() ?? '?';

  const sellingAction = (() => {
    if (!cookProfileChecked) return { label: 'Loading…', onClick: () => {}, disabled: true };
    if (!cookProfile) return { label: 'Start selling food →', onClick: () => navigate('/sell/register') };
    if (cookProfile.verificationStatus === 'VERIFIED') return { label: 'Go to kitchen →', onClick: () => navigate('/cook') };
    if (cookProfile.verificationStatus === 'REJECTED') {
      return {
        label: 'Registration rejected — resubmit →',
        onClick: () => navigate('/sell/register'),
        note: cookProfile.rejectionReason,
      };
    }
    if (cookProfile.status === 'PENDING_VERIFICATION') {
      return { label: 'Application under review', onClick: () => {}, disabled: true };
    }
    return { label: 'Continue your kitchen registration →', onClick: () => navigate('/sell/register') };
  })();

  return (
    <div className="profile-page">
      <div className="screen-title">
        <h1>{auth ? `Good afternoon, ${displayName}` : 'Welcome to LOOM'}</h1>
      </div>
      <section className="account-card">
        <div className="avatar-large">{avatarInitial}</div>
        <div>
          <h3>{auth ? displayName : "You're not logged in"}</h3>
          <p>{auth ? auth.email : 'Log in to place orders and save favourites'}</p>
        </div>
        {auth ? (
          <button onClick={() => openModal({ kind: 'account' })} aria-label="Open account details">
            ›
          </button>
        ) : (
          <button className="primary-button" onClick={() => openModal({ kind: 'auth', mode: 'login' })}>
            Log in
          </button>
        )}
      </section>
      <div className="settings-group">
        <button className="settings-row" onClick={() => openModal({ kind: 'location' })}>
          <span>⌖</span>
          <strong>Addresses</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'favourites' })}>
          <span>♡</span>
          <strong>Favourite cooks</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'myReviews' })}>
          <span>★</span>
          <strong>Reviews & photos</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'preferences' })}>
          <span>◇</span>
          <strong>Food preferences</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'payments' })}>
          <span>◌</span>
          <strong>Payments & credits</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={toggleDark}>
          <span>◐</span>
          <strong>Appearance</strong>
          <em>System</em>
        </button>
      </div>
      {auth && (
        <button className="outline-button" style={{ margin: '12px 20px' }} onClick={logout}>
          Log out
        </button>
      )}
      {auth && (
        <section className="role-switch">
          <p>
            {cookProfile?.verificationStatus === 'REJECTED' && sellingAction.note
              ? `Your last application was rejected: ${sellingAction.note}`
              : 'Do you cook, bake or cater? Your kitchen can be part of Coimbatore’s next food story.'}
          </p>
          <button onClick={sellingAction.onClick} disabled={sellingAction.disabled}>
            {sellingAction.label}
          </button>
        </section>
      )}
      {auth?.role === 'ADMIN' && (
        <section className="role-switch" style={{ background: '#386a4b' }}>
          <p>Platform team access: verify kitchens, resolve reports, and keep the community trusted.</p>
          <button onClick={() => navigate('/admin')}>Open admin desk →</button>
        </section>
      )}
    </div>
  );
}
