import { useAppStore } from '../store/appStore';

export default function ModalHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  return (
    <>
      <div className="modal-handle"></div>
      <div className="modal-top">
        {eyebrow ? (
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
        ) : (
          <h2>{title}</h2>
        )}
        <button className="close-button" onClick={closeModal} aria-label="Close">
          ×
        </button>
      </div>
    </>
  );
}
