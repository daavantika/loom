import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

function cookLabel(cookId: string) {
  if (cookId === 'anitha') return 'Anitha Bakes';
  if (cookId === 'meera') return 'Meera’s Kitchen';
  return 'LOOM kitchen';
}

export default function MyReviewsModal() {
  const reviews = useAppStore((s) => s.reviews);
  const openModal = useAppStore((s) => s.openModal);
  const mine = reviews.filter((r) => r.name === 'Asha R.');

  return (
    <>
      <ModalHeader eyebrow="Your community voice" title="Reviews & photos" />
      <p className="seller-intro">Your thoughtful reviews help neighbours find food they’ll love.</p>
      <div className="review-list">
        {mine.length ? (
          mine.map((review, i) => (
            <article key={i}>
              <strong>
                {'★'.repeat(review.stars)} <span>{cookLabel(review.cookId)}</span>
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
        <button className="primary-button" onClick={() => openModal({ kind: 'review', cookId: 'anitha' })}>
          Review your Anitha Bakes order
        </button>
      </div>
    </>
  );
}
