import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

const TOOL_CONTENT: Record<'calendar' | 'orders' | 'analytics', [string, string, string]> = {
  calendar: ['Order calendar', 'Your next seven days have 36 confirmed meals, 3 open lunch slots and 1 bulk-order review.', 'Open availability'],
  orders: ['All kitchen orders', '12 meals are due today. The newest order is a bulk lunch for Oakley Studio, already advance-paid.', 'Review bulk order'],
  analytics: ['Kitchen analytics', 'This month: ₹28,460 in sales, 68% repeat customers, and lemon rice is your best seller.', 'View payout ledger'],
};

export default function CookToolModal({ tool }: { tool: 'calendar' | 'orders' | 'analytics' }) {
  const setCookTab = useAppStore((s) => s.setCookTab);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const [title, copy, action] = TOOL_CONTENT[tool];

  const runAction = () => {
    if (tool === 'analytics') return openModal({ kind: 'payoutLedger' });
    if (tool === 'orders') {
      closeModal();
      setCookTab('Orders');
      return;
    }
    showToast('Availability editor opened for your next service days');
  };

  return (
    <>
      <ModalHeader title={title} />
      <div className="insight-card">
        <span>◔</span>
        <p>{copy}</p>
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={runAction}>
          {action}
        </button>
      </div>
    </>
  );
}
