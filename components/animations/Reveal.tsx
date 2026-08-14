'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds of stagger before this element animates in. */
  delay?: number;
  /** How far up the element travels. */
  distance?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

/**
 * Scroll-triggered entrance using the reference's signature easing
 * (`cubic-bezier(0.22, 1, 0.36, 1)`), once per element.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 28,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- one ref, several tag types
      ref={ref as any}
      className={cn(className)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : `translateY(${distance}px)`,
        transition: `opacity 900ms var(--ease-lumiere) ${delay}ms, transform 900ms var(--ease-lumiere) ${delay}ms`,
        willChange: shown ? undefined : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}
