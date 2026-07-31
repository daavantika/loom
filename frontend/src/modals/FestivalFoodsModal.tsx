import { useAppStore } from '../store/appStore';
import { foodImages } from '../data/kitchens';
import ModalHeader from '../components/ModalHeader';

export default function FestivalFoodsModal() {
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);

  return (
    <>
      <ModalHeader eyebrow="Seasonal table" title="Festival foods" />
      <div className="festival-hero">
        <img src={foodImages.sweets} alt="South Indian festival sweets" loading="lazy" />
        <div>
          <span>Next up · Aadi specials</span>
          <h3>Handmade sweets, savories & gifting boxes</h3>
          <p>Pre-order from local cooks before their small-batch slots fill up.</p>
        </div>
      </div>
      <div className="festival-grid">
        <button onClick={() => openModal({ kind: 'cook', cookId: 'meera' })}>
          <span>🥣</span>
          <strong>Pongal classics</strong>
          <small>Meera’s Kitchen</small>
        </button>
        <button onClick={() => openModal({ kind: 'cook', cookId: 'anitha' })}>
          <span>🍬</span>
          <strong>Sweet boxes</strong>
          <small>Anitha Bakes</small>
        </button>
        <button onClick={() => openModal({ kind: 'cook', cookId: 'shafi' })}>
          <span>✦</span>
          <strong>Celebration feasts</strong>
          <small>Shafi’s Table</small>
        </button>
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={() => showToast('We’ll remind you when festival slots open')}>
          Remind me when slots open
        </button>
      </div>
    </>
  );
}
