import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { currency } from '../lib/format';
import ModalHeader from '../components/ModalHeader';

const PAYMENT_OPTIONS: Array<{ value: 'COD' | 'ONLINE'; label: string }> = [
  { value: 'COD', label: 'Cash on delivery' },
  { value: 'ONLINE', label: 'Pay online (card / UPI / wallet / net banking)' },
];

export default function CheckoutModal() {
  const delivery = useAppStore((s) => s.delivery);
  const total = useAppStore((s) => s.cartTotal() + 52);
  const placeOrder = useAppStore((s) => s.placeOrder);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const paymentsEnabled = useAppStore((s) => s.paymentsConfig?.enabled ?? false);
  const navigate = useNavigate();
  const [payment, setPayment] = useState<'COD' | 'ONLINE'>('COD');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const result = await placeOrder(payment);
    setSubmitting(false);
    if (result.ok) {
      closeModal();
      navigate('/orders');
      showToast('Order confirmed');
    } else {
      showToast(result.message);
    }
  };

  return (
    <>
      <ModalHeader title="One last step" />
      <div className="filter-block">
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
          Your food is scheduled for <strong style={{ color: 'var(--ink)' }}>{delivery}</strong>. We’ll share sealed-packaging proof before Kovai
          Delivery collects it.
        </p>
        <h3>Pay with</h3>
        <div className="option-grid">
          {PAYMENT_OPTIONS.filter((opt) => opt.value !== 'ONLINE' || paymentsEnabled).map((opt) => (
            <button
              key={opt.value}
              className={`option${payment === opt.value ? ' selected' : ''}`}
              onClick={() => setPayment(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!paymentsEnabled && (
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>Online payment isn’t available yet — cash on delivery only for now.</p>
        )}
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={submit} disabled={submitting}>
          {submitting ? 'Placing order…' : `Place order · ${currency(total)}`}
        </button>
      </div>
    </>
  );
}
