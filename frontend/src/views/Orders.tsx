import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import EmptyState from '../components/EmptyState';
import type { ApiOrderPaymentStatus } from '../data/api-types';

const PAYMENT_STATUS_LABEL: Record<ApiOrderPaymentStatus, string> = {
  COD: 'Cash on delivery',
  PENDING: 'Payment pending',
  PAID: 'Paid online',
  FAILED: 'Payment failed',
};

export default function Orders() {
  const auth = useAppStore((s) => s.auth);
  const orders = useAppStore((s) => s.orders);
  const ordersLoading = useAppStore((s) => s.ordersLoading);
  const loadOrders = useAppStore((s) => s.loadOrders);
  const openModal = useAppStore((s) => s.openModal);
  const kitchens = useKitchens();

  useEffect(() => {
    if (auth) loadOrders();
  }, [auth, loadOrders]);

  if (!auth) {
    return (
      <>
        <div className="screen-title">
          <h1>Your orders</h1>
        </div>
        <EmptyState
          icon="▣"
          title="Log in to see your orders"
          body="Your order history lives with your account."
          action={
            <button className="primary-button" onClick={() => openModal({ kind: 'auth', mode: 'login' })}>
              Log in / Sign up
            </button>
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="screen-title">
        <h1>Your orders</h1>
      </div>
      {ordersLoading && orders.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading your orders…</p>
      ) : orders.length === 0 ? (
        <EmptyState icon="▣" title="No orders yet" body="Once you place an order, it'll show up here." />
      ) : (
        orders.map((order) => {
          const cook = kitchens.find((k) => k.id === order.cookId);
          return (
            <section className="order-card" key={order.id}>
              <header className="order-head">
                <div>
                  <h3>{cook?.name ?? 'Kitchen'}</h3>
                  <small>{order.deliveryAddressLabel} · {order.deliveryAddressLine}</small>
                </div>
                <span className="status">{order.status.replace(/_/g, ' ')}</span>
              </header>
              <div className="order-content">
                <div>
                  {order.items.map((item) => (
                    <p key={item.id}>
                      {item.name} · {item.quantity}
                    </p>
                  ))}
                  <strong>{currency(order.totalPaise / 100)}</strong>
                  <p style={{ marginTop: 4 }}>{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</p>
                </div>
              </div>
              <footer className="order-actions">
                {cook && (
                  <button className="outline-button" onClick={() => openModal({ kind: 'chat', cookId: cook.id })}>
                    Chat with {cook.cook.split(' ')[0] || cook.name}
                  </button>
                )}
                <button className="primary-button" onClick={() => openModal({ kind: 'tracking', orderId: order.id })}>
                  Track order
                </button>
              </footer>
            </section>
          );
        })
      )}
      <div className="section-head">
        <h2>Subscriptions</h2>
        <button onClick={() => openModal({ kind: 'plan' })}>Browse plans</button>
      </div>
      <article className="plan-card">
        <div className="plan-icon">◫</div>
        <div>
          <h3>Weekday lunch with a cook you love</h3>
          <p>Mon–Fri · pauses automatically for holidays</p>
        </div>
        <button onClick={() => openModal({ kind: 'plan' })} aria-label="Manage tiffin subscription">
          →
        </button>
      </article>
    </>
  );
}
