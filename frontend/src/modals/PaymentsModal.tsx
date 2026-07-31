import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function PaymentsModal() {
  const showToast = useAppStore((s) => s.showToast);
  const closeModal = useAppStore((s) => s.closeModal);

  return (
    <>
      <ModalHeader title="Payments & credits" />
      <div className="payment-card">
        <span className="payment-mark">UPI</span>
        <div>
          <strong>asha@okaxis</strong>
          <small>Default payment method</small>
        </div>
        <span className="status">ACTIVE</span>
      </div>
      <div className="credit-card">
        <small>LOOM CREDITS</small>
        <strong>₹420</strong>
        <p>Apply automatically at checkout when you choose.</p>
      </div>
      <div className="modal-actions">
        <button className="outline-button" onClick={() => showToast('A secure payment-method form is ready for your details')}>
          Add payment method
        </button>
        <button className="primary-button" onClick={closeModal}>
          Done
        </button>
      </div>
    </>
  );
}
