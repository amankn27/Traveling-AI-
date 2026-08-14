import { cn } from '@/lib/utils';

interface EyebrowProps {
  children: React.ReactNode;
  /** Centred eyebrows carry a rule on both sides; left-aligned ones only lead. */
  centered?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * The small tracked label with hairlines that opens every section.
 * `light` = light text on a dark ground; `dark` = ink on cream.
 */
export function Eyebrow({ children, centered = false, tone = 'dark', className }: EyebrowProps) {
  const rule = tone === 'light' ? 'bg-white/35' : 'bg-ink/25';
  const text = tone === 'light' ? 'text-white/55' : 'text-ink/50';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 font-sans text-[11px] font-medium uppercase tracking-[0.32em]',
        text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-px w-8', rule)} />
      {children}
      {centered ? <span aria-hidden="true" className={cn('h-px w-8', rule)} /> : null}
    </div>
  );
}
