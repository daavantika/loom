import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import ModalHeader from '../components/ModalHeader';

function cookLabel(cookId: string, kitchens: { id: string; name: string }[]) {
  const match = kitchens.find((k) => k.id === cookId);
  if (match) return match.name;
  if (cookId === 'anitha') return 'Anitha Bakes';
  if (cookId === 'meera') return 'Meera’s Kitchen';
  return 'LOOM kitchen';
}

export default function MyReviewsModal() {
  const reviews = useAppStore((s) => s.reviews);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const navigate = useNavigate();
  const kitchens = useKitchens();
  const mine = reviews.filter((r) => r.name === 'Asha R.');
  // The old hardcoded 'anitha' CTA target only existed in mock data — once the
  // real backend catalog loads, it may no longer be present, leaving the
  // button pointing at a kitchen id that ReviewModal can't find (renders
  // nothing). Point at a real kitchen instead when one exists.
  const reviewTarget = kitchens[0];

  return (
    <>
      <ModalHeader eyebrow="Your community voice" title="Reviews & photos" />
      <p className="seller-intro">Your thoughtful reviews help neighbours find food they’ll love.</p>
      <div className="review-list">
        {mine.length ? (
          mine.map((review, i) => (
            <article key={i}>
              <strong>
                {'★'.repeat(review.stars)} <span>{cookLabel(review.cookId, kitchens)}</span>
              </strong>
              <p>“{review.text}”</p>
              <small>{review.photoName ? '◧ Food photo attached' : 'Verified order review'}</small>
            </article>
          ))
        ) : (
          <p className="review-empty">You have not reviewed an order yet.</p>
        )}
      </div>
      <div className="modal-actions">
        {reviewTarget ? (
          <button className="primary-button" onClick={() => openModal({ kind: 'review', cookId: reviewTarget.id })}>
            Review your {reviewTarget.name} order
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={() => {
              closeModal();
              navigate('/explore');
            }}
          >
            Browse kitchens to leave a review
          </button>
        )}
      </div>
    </>
  );
}
