export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The reference centres a section in the viewport rather than pinning it under
 * the header — nav clicks and agent navigation both go through here so they
 * land identically.
 */
export function scrollSectionIntoView(sectionId: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(sectionId.replace(/^#/, ''));
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const centred = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
  const max = document.documentElement.scrollHeight - window.innerHeight;

  window.scrollTo({
    top: Math.max(0, Math.min(centred, max)),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
  return true;
}

/** Splits a line into words while keeping the separating spaces addressable. */
export function splitWords(line: string): string[] {
  return line.split(' ').filter((w) => w.length > 0);
}
