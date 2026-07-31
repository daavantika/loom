import { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

const LOCATIONS = ['RS Puram, Coimbatore', 'Race Course, Coimbatore', 'Saibaba Colony, Coimbatore', 'Peelamedu, Coimbatore'];

export default function LocationModal() {
  const address = useAppStore((s) => s.address);
  const setAddress = useAppStore((s) => s.setAddress);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(LOCATIONS[0]);

  const confirm = () => {
    const value = inputRef.current?.value.trim();
    if (!value) return showToast('Please add your delivery address');
    setAddress(value);
    closeModal();
    showToast('Delivery address saved');
  };

  return (
    <>
      <ModalHeader title="Where should we deliver?" />
      <div className="location-map">
        <iframe
          title="Choose delivery address in Coimbatore"
          src="https://www.openstreetmap.org/export/embed.html?bbox=76.9373%2C11.0015%2C76.9815%2C11.0329&layer=mapnik&marker=11.0168%2C76.9558"
          loading="lazy"
        ></iframe>
        <span className="location-marker">⌖</span>
      </div>
      <div className="filter-block">
        <label className="address-label" htmlFor="exact-address">
          Your exact delivery address
        </label>
        <input
          id="exact-address"
          ref={inputRef}
          className="address-input"
          defaultValue={address}
          autoComplete="street-address"
          placeholder="House / flat, street, landmark"
        />
        <p className="address-hint">Add a flat number and landmark so your cook and Kovai Delivery can find you easily.</p>
        <div className="option-grid">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              className={`option${selected === loc ? ' selected' : ''}`}
              onClick={() => {
                setSelected(loc);
                if (inputRef.current) inputRef.current.value = loc;
              }}
            >
              {loc.split(',')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={confirm}>
          Save delivery address
        </button>
      </div>
    </>
  );
}
