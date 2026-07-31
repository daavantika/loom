import { useEffect, useRef } from 'react';
import { useAppStore, addReview } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import ModalHeader from '../components/ModalHeader';

export default function ReviewModal({ cookId }: { cookId: string }) {
  const kitchens = useKitchens();
  const kitchen = kitchens.find((k) => k.id === cookId);
  const reviewDraft = useAppStore((s) => s.reviewDraft);
  const setReviewDraftStars = useAppStore((s) => s.setReviewDraftStars);
  const setReviewDraftPhoto = useAppStore((s) => s.setReviewDraftPhoto);
  const resetReviewDraft = useAppStore((s) => s.resetReviewDraft);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resetReviewDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!kitchen) return null;

  const submit = () => {
    const text = textRef.current?.value.trim();
    if (!text) return showToast('Write a short note before posting your review');
    addReview(cookId, text);
    closeModal();
    showToast('Thanks — your review now helps neighbours choose');
  };

  return (
    <>
      <ModalHeader eyebrow={kitchen.name} title="How was your meal?" />
      <div className="review-stars" aria-label="Choose a rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={star <= reviewDraft.stars ? 'selected' : ''}
            onClick={() => setReviewDraftStars(star)}
            aria-label={`${star} star rating`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="review-label" htmlFor="review-text">
        Tell neighbours what you loved
      </label>
      <textarea id="review-text" ref={textRef} maxLength={400} placeholder="Freshness, packaging, flavour, or a thoughtful detail…" />
      <label className="photo-upload" htmlFor="review-photo">
        <span>◧</span>
        <div>
          <strong>Add a food photo</strong>
          <small>{reviewDraft.photoName ? `${reviewDraft.photoName} ready to attach` : 'Optional · helps neighbours order with confidence'}</small>
        </div>
      </label>
      <input
        className="hidden"
        id="review-photo"
        type="file"
        accept="image/*"
        onChange={(e) => setReviewDraftPhoto(e.target.files?.[0]?.name ?? '')}
      />
      <div className="modal-actions">
        <button className="primary-button" onClick={submit}>
          Post review
        </button>
      </div>
    </>
  );
}
