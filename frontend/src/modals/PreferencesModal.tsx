import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

const PREFERENCES = ['Vegetarian', 'Vegan', 'Jain friendly', 'Egg okay', 'Mild spice', 'Gluten aware'];

export default function PreferencesModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const [selected, setSelected] = useState<string[]>(PREFERENCES.slice(0, 2));

  const toggle = (pref: string) => {
    setSelected((s) => (s.includes(pref) ? s.filter((p) => p !== pref) : [...s, pref]));
  };

  return (
    <>
      <ModalHeader title="Food preferences" />
      <div className="filter-block">
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>We’ll use these to make the kitchen feed more useful.</p>
        <div className="option-grid">
          {PREFERENCES.map((pref) => (
            <button key={pref} className={`option${selected.includes(pref) ? ' selected' : ''}`} onClick={() => toggle(pref)}>
              {pref}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button
          className="primary-button"
          onClick={() => {
            closeModal();
            showToast('Your food preferences have been saved');
          }}
        >
          Save preferences
        </button>
      </div>
    </>
  );
}
