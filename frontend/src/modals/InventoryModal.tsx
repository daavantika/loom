import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function InventoryModal() {
  const showToast = useAppStore((s) => s.showToast);
  const closeModal = useAppStore((s) => s.closeModal);

  return (
    <>
      <ModalHeader title="Ingredient planning" />
      <div className="inventory-list">
        <article>
          <span>Rice</span>
          <strong>3.6 kg</strong>
          <small>For 18 confirmed portions</small>
        </article>
        <article>
          <span>Fresh lemons</span>
          <strong>24</strong>
          <small>For tomorrow’s lunch slots</small>
        </article>
        <article>
          <span>Toor dal</span>
          <strong>1.2 kg</strong>
          <small>Includes bulk lunch buffer</small>
        </article>
      </div>
      <div className="modal-actions">
        <button className="outline-button" onClick={() => showToast('Shopping list is ready to share')}>
          Share shopping list
        </button>
        <button className="primary-button" onClick={closeModal}>
          Done
        </button>
      </div>
    </>
  );
}
