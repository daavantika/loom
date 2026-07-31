import { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

const CUISINES = ['South Indian', 'Bakery', 'Mixed menu'];

export default function CateringModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const guestsRef = useRef<HTMLInputElement>(null);
  const [cuisine, setCuisine] = useState(CUISINES[0]);

  const submit = () => {
    const guests = guestsRef.current?.value || 'your';
    closeModal();
    showToast(`Quote request sent for ${guests} guests`);
  };

  return (
    <>
      <ModalHeader eyebrow="Office & event orders" title="Plan a group meal" />
      <p className="seller-intro">Tell us a few details and the right cooks can confirm capacity, menu and advance payment.</p>
      <div className="seller-form">
        <label htmlFor="catering-guests">How many people?</label>
        <input id="catering-guests" ref={guestsRef} type="number" min={10} defaultValue={20} inputMode="numeric" />
        <label htmlFor="catering-date">Delivery date</label>
        <input id="catering-date" type="date" defaultValue="2026-07-25" />
        <label htmlFor="catering-notes">What are you planning?</label>
        <input id="catering-notes" placeholder="Office lunch, birthday, housewarming…" />
      </div>
      <div className="option-grid" style={{ marginTop: 15 }}>
        {CUISINES.map((c) => (
          <button key={c} className={`option${cuisine === c ? ' selected' : ''}`} onClick={() => setCuisine(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={submit}>
          Request quotes
        </button>
      </div>
    </>
  );
}
