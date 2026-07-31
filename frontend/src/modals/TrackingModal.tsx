import { useEffect, useState } from 'react';
import ModalHeader from '../components/ModalHeader';
import { apiFetch, ApiError } from '../lib/api';
import type { ApiOrder, ApiOrderStatus, ApiOrderStatusEvent } from '../data/api-types';

const STEP_LABELS: Record<ApiOrderStatus, string> = {
  PLACED: 'Order placed',
  ACCEPTED: 'Kitchen confirmed your order',
  PREPARING: 'Preparing your meal',
  OUT_FOR_DELIVERY: 'On its way to you',
  DELIVERED: 'Delivered',
  CANCELLED: 'Order cancelled',
};

export default function TrackingModal({ orderId }: { orderId?: string }) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [history, setHistory] = useState<ApiOrderStatusEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ order: ApiOrder; statusHistory: ApiOrderStatusEvent[] }>(`/orders/${orderId}`);
        if (cancelled) return;
        setOrder(res.order);
        setHistory(res.statusHistory);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load this order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <>
        <ModalHeader title="Order tracking" />
        <p className="address-hint" style={{ margin: '0 20px 20px' }}>
          Open this from one of your orders to see live tracking.
        </p>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <ModalHeader title="Order tracking" />
        <p className="address-hint" style={{ margin: '0 20px 20px' }}>
          Loading…
        </p>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <ModalHeader title="Order tracking" />
        <p className="address-hint" style={{ margin: '0 20px 20px', color: '#c0392b' }} role="alert">
          {error ?? 'Order not found'}
        </p>
      </>
    );
  }

  return (
    <>
      <ModalHeader eyebrow={`Order ${order.id.slice(0, 8)}`} title={STEP_LABELS[order.status]} />
      <div className="tracking-steps">
        {history.map((event) => (
          <div className="done" key={event.id}>
            <span>✓</span>
            <p>
              <strong>{STEP_LABELS[event.status]}</strong>
              <small>{new Date(event.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small>
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
