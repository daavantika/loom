import type { ReactNode, KeyboardEvent } from 'react';

/** An <article> that behaves like a button (click + Enter/Space), matching
 * the vanilla app's tabindex/role/keydown pattern without leaking browser
 * default button padding/background into cards that were tuned around <article>. */
export default function ClickableCard({
  className,
  ariaLabel,
  onClick,
  children,
}: {
  className: string;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <article className={className} tabIndex={0} role="button" aria-label={ariaLabel} onClick={onClick} onKeyDown={handleKeyDown}>
      {children}
    </article>
  );
}
