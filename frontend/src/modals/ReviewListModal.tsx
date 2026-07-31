import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function ReviewListModal({ cookId }: { cookId: string }) {
  const allReviews = useAppStore((s) => s.reviews);
  const reviews = allReviews.filter((r) => r.cookId === cookId);

  return (
    <>
      <ModalHeader title="Customer feedback" />
      <div className="review-list">
        {reviews.length ? (
          reviews.map((review, i) => (
            <article key={i}>
              <strong>
                {'★'.repeat(review.stars)} <span>{review.name}</span>
              </strong>
              <p>“{review.text}”</p>
              <small>{review.photoName ? '◧ Food photo attached' : 'Verified order'}</small>
            </article>
          ))
        ) : (
          <p className="review-empty">No customer reviews yet.</p>
        )}
      </div>
    </>
  );
}
