import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import ModalLayer from './components/ModalLayer';
import Toast from './components/Toast';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const address = useAppStore((s) => s.address);
  const cartCount = useAppStore((s) => s.cart.reduce((sum, item) => sum + item.quantity, 0));
  const openModal = useAppStore((s) => s.openModal);
  const auth = useAppStore((s) => s.auth);
  const loadCatalog = useAppStore((s) => s.loadCatalog);
  const loadPaymentsConfig = useAppStore((s) => s.loadPaymentsConfig);

  useEffect(() => {
    // Auto-load is suppressed in test mode so unrelated tests don't make an
    // ambient, unmocked network call on every render — tests that want the
    // real catalog flow call loadCatalog()/loadPaymentsConfig() explicitly
    // after mocking fetch.
    if (import.meta.env.MODE !== 'test') {
      loadCatalog();
      loadPaymentsConfig();
    }
  }, [loadCatalog, loadPaymentsConfig]);

  const avatarInitial = auth?.email ? auth.email[0].toUpperCase() : '?';

  const isDashboardMode = location.pathname.startsWith('/cook') || location.pathname.startsWith('/admin');

  const navItems: Array<{ to: string; icon: string; label: string }> = [
    { to: '/', icon: '⌂', label: 'Home' },
    { to: '/explore', icon: '⌕', label: 'Explore' },
    { to: '/cart', icon: '♧', label: 'Basket' },
    { to: '/orders', icon: '▣', label: 'Orders' },
    { to: '/profile', icon: '◡', label: 'You' },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="location-button" onClick={() => openModal({ kind: 'location' })} aria-label="Change delivery area">
          <span className="pin">⌖</span>
          <span>
            <small>Delivering to</small>
            <strong>{address || 'Set your location'}</strong>
          </span>
          <span className="chevron">⌄</span>
        </button>
        <button className="profile-button" onClick={() => navigate('/profile')} aria-label="Open profile">
          {avatarInitial}
        </button>
      </header>

      <main id="app-content">
        <Outlet />
      </main>

      {!isDashboardMode && (
        <button className="assistant-button" onClick={() => openModal({ kind: 'assistant' })} aria-label="Ask Loom assistant">
          <span>✦</span>
        </button>
      )}

      {!isDashboardMode && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                className={`nav-item${item.to === '/cart' ? ' cart-nav' : ''}${active ? ' active' : ''}`}
                onClick={() => navigate(item.to)}
              >
                <span>{item.icon}</span>
                <small>{item.label}</small>
                {item.to === '/cart' && <b className={cartCount > 0 ? 'show' : ''}>{cartCount}</b>}
              </button>
            );
          })}
        </nav>
      )}

      <ModalLayer />
      <Toast />
    </div>
  );
}
