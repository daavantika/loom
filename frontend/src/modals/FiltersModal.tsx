import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

const FILTERS = ['Within 2 km', 'Within 5 km', 'Within 8 km', 'Vegetarian', 'Vegan', 'Jain', 'Halal', 'Verified cooks', 'Tiffin plans', 'Bulk orders', 'Festival specials'];

export default function FiltersModal() {
  const activeFilters = useAppStore((s) => s.activeFilters);
  const toggleFilter = useAppStore((s) => s.toggleFilter);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const closeModal = useAppStore((s) => s.closeModal);

  return (
    <>
      <ModalHeader title="Fine-tune your feed" />
      <div className="filter-block">
        <h3>Delivery radius</h3>
        <div className="option-grid">
          {FILTERS.slice(0, 3).map((f) => (
            <button key={f} className={`option${activeFilters.includes(f) ? ' selected' : ''}`} onClick={() => toggleFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-block">
        <h3>Food & kitchen</h3>
        <div className="option-grid">
          {FILTERS.slice(3).map((f) => (
            <button key={f} className={`option${activeFilters.includes(f) ? ' selected' : ''}`} onClick={() => toggleFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button className="outline-button" onClick={resetFilters}>
          Reset
        </button>
        <button className="primary-button" onClick={closeModal}>
          Show kitchens
        </button>
      </div>
    </>
  );
}
