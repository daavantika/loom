export default function SectionHead({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
