import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function PayoutLedgerModal() {
  const showToast = useAppStore((s) => s.showToast);
  const closeModal = useAppStore((s) => s.closeModal);

  return (
    <>
      <ModalHeader eyebrow="Weekly settlement" title="Payout ledger" />
      <div className="ledger-summary">
        <span>Next payout · Fri, 24 Jul</span>
        <strong>₹8,460</strong>
        <small>After delivery and platform splits</small>
      </div>
      <div className="ledger-list">
        <article>
          <div>
            <strong>Order L-20912</strong>
            <small>Priya S. · Lemon rice boxes</small>
          </div>
          <span>₹405</span>
        </article>
        <article>
          <div>
            <strong>Order L-20915</strong>
            <small>Arun M. · Idli & sambar</small>
          </div>
          <span>₹276</span>
        </article>
        <article>
          <div>
            <strong>Order L-20919</strong>
            <small>Oakley Studio · Bulk lunch advance</small>
          </div>
          <span>₹2,433</span>
        </article>
      </div>
      <div className="payout-split">
        <div>
          <span>Customer paid</span>
          <strong>₹9,480</strong>
        </div>
        <div>
          <span>Kovai Delivery</span>
          <strong>− ₹630</strong>
        </div>
        <div>
          <span>LOOM platform fee</span>
          <strong>− ₹390</strong>
        </div>
      </div>
      <div className="modal-actions">
        <button className="outline-button" onClick={() => showToast('Your weekly statement is ready to download')}>
          Download statement
        </button>
        <button className="primary-button" onClick={closeModal}>
          Done
        </button>
      </div>
    </>
  );
}
