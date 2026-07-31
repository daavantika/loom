import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function PriceAssistantModal() {
  const setCookTab = useAppStore((s) => s.setCookTab);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);

  const applyPrice = () => {
    closeModal();
    setCookTab('Menu');
    showToast('₹159 is ready to apply to a menu item');
  };

  return (
    <>
      <ModalHeader title="Pricing assistant" />
      <div className="seller-form">
        <label htmlFor="ingredient-cost">Ingredient cost per portion</label>
        <input id="ingredient-cost" type="number" defaultValue={72} inputMode="numeric" />
        <label htmlFor="prep-minutes">Prep time in minutes</label>
        <input id="prep-minutes" type="number" defaultValue={38} inputMode="numeric" />
        <label htmlFor="target-margin">Target margin</label>
        <input id="target-margin" type="number" defaultValue={35} inputMode="numeric" />
      </div>
      <article className="price-result">
        <span>Suggested menu price</span>
        <strong>₹159</strong>
        <small>Covers ingredients, prep time and a 35% target margin.</small>
      </article>
      <div className="modal-actions">
        <button className="primary-button" onClick={applyPrice}>
          Use ₹159 for a dish
        </button>
      </div>
    </>
  );
}
