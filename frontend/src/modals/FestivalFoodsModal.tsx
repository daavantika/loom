import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { foodImages } from '../data/kitchens';
import ModalHeader from '../components/ModalHeader';

export default function FestivalFoodsModal() {
  const navigate = useNavigate();
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);

  return (
    <>
      <ModalHeader eyebrow="Seasonal table" title="Festival foods" />
      <div className="festival-hero">
        <img src={foodImages.kitchen} alt="South Indian festival sweets" loading="lazy" />
        <div>
          <span>Next up · Aadi specials</span>
          <h3>Handmade sweets, savories & gifting boxes</h3>
          <p>Pre-order from local cooks before their small-batch slots fill up.</p>
        </div>
      </div>
      <div className="modal-actions">
        <button
          className="primary-button"
          onClick={() => {
            closeModal();
            navigate('/explore');
          }}
        >
          Explore all kitchens
        </button>
        <button className="outline-button" onClick={() => showToast('We’ll remind you when festival slots open')}>
          Remind me when slots open
        </button>
      </div>
    </>
  );
}
