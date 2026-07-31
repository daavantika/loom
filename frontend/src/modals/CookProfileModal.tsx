import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import QtyControl from '../components/QtyControl';
import ReviewPreview from '../components/ReviewPreview';

export default function CookProfileModal({ cookId }: { cookId: string }) {
  const kitchens = useKitchens();
  const kitchen = kitchens.find((k) => k.id === cookId);
  const followed = useAppStore((s) => s.followed.has(cookId));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const addDish = useAppStore((s) => s.addDish);
  const showToast = useAppStore((s) => s.showToast);

  if (!kitchen) return null;

  const onFollow = () => {
    toggleFollow(cookId);
    showToast(followed ? 'Unfollowed this kitchen' : 'You’ll hear when new slots open');
  };

  return (
    <>
      <div className="profile-hero">
        <img src={kitchen.image} alt={kitchen.name} loading="lazy" />
        <button className="close-button profile-close" onClick={closeModal} aria-label="Close">
          ×
        </button>
        <div className="cook-avatar">
          <img src={kitchen.avatar} alt={kitchen.cook} loading="lazy" />
        </div>
      </div>
      <div className="profile-body">
        <div className="profile-title">
          <div>
            <h2>
              {kitchen.name} <span style={{ color: '#386a4b', fontFamily: 'DM Sans', fontSize: 16 }}>✓</span>
            </h2>
            <p>
              {kitchen.cuisine} · {kitchen.distance} away
            </p>
          </div>
          <button className="follow-button" onClick={onFollow}>
            {followed ? 'Following ✓' : 'Follow'}
          </button>
        </div>
        <div className="trust-row">
          <div className="trust">
            <strong>★ {kitchen.rating}</strong>
            <small>{kitchen.reviews} neighbours</small>
          </div>
          <div className="trust">
            <strong>98%</strong>
            <small>on-time handoffs</small>
          </div>
          <div className="trust">
            <strong>2 hrs</strong>
            <small>order cutoff</small>
          </div>
        </div>
        <p className="eyebrow">Meet {kitchen.cook.split(' ')[0]}</p>
        <p className="bio">{kitchen.bio}</p>
        <ReviewPreview cookId={cookId} />
        <div className="section-head">
          <h2>From the menu</h2>
          <button onClick={() => openModal({ kind: 'chat', cookId })}>Chat</button>
        </div>
        {kitchen.dishes.map((d) => (
          <article className="dish-row" key={d.id}>
            <img src={d.image} alt={d.name} loading="lazy" />
            <div>
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              <strong>{currency(d.price)}</strong>
            </div>
            <QtyControl dish={d} />
          </article>
        ))}
        <div className="modal-actions">
          <button className="outline-button" onClick={() => openModal({ kind: 'chat', cookId })}>
            Ask a question
          </button>
          <button className="primary-button" onClick={() => addDish(kitchen.dishes[0].id)}>
            Add a meal
          </button>
        </div>
      </div>
    </>
  );
}
