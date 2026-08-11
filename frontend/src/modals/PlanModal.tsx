import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import ModalHeader from '../components/ModalHeader';
import EmptyState from '../components/EmptyState';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function PlanModal() {
  const planDraft = useAppStore((s) => s.planDraft);
  const kitchens = useKitchens();
  // No mock fallback means kitchens (or a real kitchen's own dishes) can be
  // genuinely empty — this modal used to assume both always existed.
  const cook = kitchens.find((k) => k.id === planDraft.cookId) ?? kitchens[0];
  const togglePlanDay = useAppStore((s) => s.togglePlanDay);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);

  if (!cook || cook.dishes.length === 0) {
    return (
      <>
        <ModalHeader eyebrow="Weekly tiffin plan" title="Lunch, on your rhythm." />
        <EmptyState icon="☼" title="No kitchens available yet" body="Check back once a verified kitchen has added dishes to their menu." />
      </>
    );
  }

  const days = planDraft.days;
  const perDay = cook.dishes[0].price;

  const startPlan = () => {
    closeModal();
    if (!days.length) return showToast('Pick at least one day for your plan');
    showToast(`${cook.cook.split(' ')[0]}’s weekday plan is now active · ${days.length} lunch${days.length === 1 ? '' : 'es'}/week`);
  };

  return (
    <>
      <ModalHeader eyebrow="Weekly tiffin plan" title="Lunch, on your rhythm." />
      <div className="plan-builder">
        <div className="plan-icon">☼</div>
        <h3>{cook.cook.split(' ')[0]}’s weekday comfort plan</h3>
        <p>Choose the days you need. Each delivery is prepared fresh after you confirm your slot.</p>
        <div className="plan-cook-row">
          <div>
            <small>Cooking with</small>
            <strong>{cook.name}</strong>
          </div>
          <button className="outline-button" onClick={() => openModal({ kind: 'planCookPicker' })}>
            Find a cook
          </button>
        </div>
        <div className="option-grid">
          {DAYS.map((day) => (
            <button key={day} className={`option${days.includes(day) ? ' selected' : ''}`} onClick={() => togglePlanDay(day)}>
              {day}
            </button>
          ))}
        </div>
        <div className="plan-price">
          <span>
            {days.length} lunch{days.length === 1 ? '' : 'es'} per week
          </span>
          <strong>{currency(perDay * days.length)} / week</strong>
        </div>
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={startPlan}>
          Start this plan
        </button>
      </div>
    </>
  );
}
