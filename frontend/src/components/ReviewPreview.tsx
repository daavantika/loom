import { useAppStore } from '../store/appStore';

export default function ReviewPreview({ cookId }: { cookId: string }) {
  const allReviews = useAppStore((s) => s.reviews);
  const reviews = allReviews.filter((r) => r.cookId === cookId);
  const openModal = useAppStore((s) => s.openModal);

  if (!reviews.length) {
    return (
      <>
        <div className="section-head">
          <h2>Customer reviews</h2>
          <button onClick={() => openModal({ kind: 'review', cookId })}>Write first review</button>
        </div>
        <p className="review-empty">This new kitchen has no reviews yet.</p>
      </>
    );
  }

  const first = reviews[0];
  return (
    <>
      <div className="section-head">
        <h2>Customer reviews</h2>
        <button onClick={() => openModal({ kind: 'review', cookId })}>Write a review</button>
      </div>
      <article className="profile-review">
        <strong>
          {'★'.repeat(first.stars)} <span>{first.name}</span>
        </strong>
        <p>“{first.text}”</p>
        {first.photoName && <small>◧ Customer food photo attached</small>}
      </article>
    </>
  );
}
