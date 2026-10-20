/**
 * Acme's mark: a tile with a peak. A placeholder: replace it with your own,
 * and update app/icon.svg (the favicon) to match.
 */
export function AcmeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path d="M9 23 16 9l7 14z" className="fill-accent" />
    </svg>
  );
}

export function AcmeLogo() {
  return (
    <span className="inline-flex items-center gap-2 font-display-tight text-[1.1875rem] font-semibold tracking-[-0.01em]">
      <AcmeMark className="size-6" />
      Acme
    </span>
  );
}
