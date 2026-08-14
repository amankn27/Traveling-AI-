'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '@/lib/site-data';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { prefersReducedMotion } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

export function Journal() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [fillHeight, setFillHeight] = useState(0);
  const [nodeTops, setNodeTops] = useState<number[]>([]);
  // The scroll handler reads positions through a ref so the effect below never
  // has to depend on `nodeTops` — depending on it would re-run the effect, call
  // measure(), set a fresh array, and loop forever.
  const nodeTopsRef = useRef<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const shimmerTick = useUiStore((s) => s.animationTick.shimmer ?? 0);
  const chapterTick = useUiStore((s) => s.animationTick.chapterReveal ?? 0);

  /** Position the thread nodes at the vertical centre of each chapter block. */
  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const gridTop = grid.getBoundingClientRect().top + window.scrollY;

    const tops = CHAPTERS.map((chapter) => {
      const el = grid.querySelector<HTMLElement>(`[data-chapter-id="${chapter.id}"]`);
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return rect.top + window.scrollY - gridTop + rect.height / 2;
    });

    nodeTopsRef.current = tops;
    // Keep the previous array when nothing moved, so re-measuring is a no-op.
    setNodeTops((prev) =>
      prev.length === tops.length && prev.every((v, i) => Math.abs(v - (tops[i] ?? 0)) < 0.5)
        ? prev
        : tops,
    );
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const grid = gridRef.current;
        if (!grid) return;

        const rect = grid.getBoundingClientRect();
        const marker = window.innerHeight * 0.5;
        setFillHeight(Math.max(0, Math.min(marker - rect.top, rect.height)));

        // The active chapter is the last one whose centre has passed the marker.
        const absoluteMarker = window.scrollY + marker;
        const gridTop = rect.top + window.scrollY;
        let next = 0;
        nodeTopsRef.current.forEach((top, i) => {
          if (gridTop + top <= absoluteMarker + 60) next = i;
        });
        setActiveIndex(next);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, [measure]);

  // Chapter blocks reveal once, with a blur-and-rise.
  useEffect(() => {
    const blocks = gridRef.current?.querySelectorAll<HTMLElement>('.chapter-block');
    if (!blocks?.length) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      blocks.forEach((b) => b.classList.add('is-in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
            observer.unobserve(entry.target);
            measure();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    blocks.forEach((b) => observer.observe(b));
    return () => observer.disconnect();
  }, [measure, chapterTick]);

  const jumpToChapter = (id: string) => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-chapter-id="${id}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY - (window.innerHeight - rect.height) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      id="journal"
      className="relative w-full"
      style={{ backgroundColor: '#F7F3EC', paddingTop: 160, paddingBottom: 180 }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow className="mb-6">No. 02 — The Journal</Eyebrow>
            <h2
              className="font-display text-ink"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
              }}
            >
              Stories, written slowly.
            </h2>
          </div>
          <Link
            href="/journal"
            className="inline-flex cursor-pointer items-center gap-2 self-start whitespace-nowrap border-b border-ink/30 pb-1 font-sans text-xs font-medium uppercase tracking-[0.18em] text-ink md:self-end"
          >
            All chapters
            <i className="ri-arrow-right-up-line" aria-hidden="true" style={{ fontSize: 13 }} />
          </Link>
        </div>

        <div className="mb-24 max-w-[820px]">
          <div className="mb-5 inline-flex items-center gap-3 font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-ink/45">
            <i className="ri-double-quotes-l" aria-hidden="true" style={{ fontSize: 16, color: '#C4A47A' }} />
            From the editor’s desk
          </div>
          <p
            key={shimmerTick}
            data-target="pull-quote"
            className="pull-quote font-display"
            style={{
              fontSize: 'clamp(1.6rem, 2.6vw, 2.4rem)',
              lineHeight: 1.4,
              letterSpacing: '-0.005em',
            }}
          >
            What follows is not a guidebook — it is a slow correspondence, three chapters long,
            gathered from the quiet places where our travellers paused, listened, and remembered to
            be still.
          </p>
        </div>

        <div ref={gridRef} className="relative grid grid-cols-12 gap-8">
          {/* Progress thread */}
          {/* Rail and index only appear once the 12-column split has room —
              below `lg` the chapters take the full width instead. */}
          <div aria-hidden="true" className="relative hidden justify-center lg:col-span-1 lg:flex">
            <div className="thread-track relative h-full">
              <div className="thread-fill" style={{ height: fillHeight }} />
              {nodeTops.map((top, i) => (
                <span
                  key={CHAPTERS[i]?.id ?? i}
                  className={`thread-node ${i <= activeIndex ? 'is-active' : ''}`}
                  style={{ top }}
                />
              ))}
            </div>
          </div>

          {/* Chapters */}
          <div className="col-span-12 space-y-32 lg:col-span-9">
            {CHAPTERS.map((chapter) => (
              <article
                key={chapter.id}
                data-chapter-id={chapter.id}
                className="chapter-block group relative"
              >
                <div
                  aria-hidden="true"
                  className="chapter-numeral pointer-events-none absolute select-none font-display text-ink"
                  style={
                    chapter.reversed
                      ? { inset: 'auto -30px -40px auto', fontSize: 'clamp(220px, 28vw, 360px)', lineHeight: 0.9, zIndex: 0 }
                      : { inset: '-40px auto auto -30px', fontSize: 'clamp(220px, 28vw, 360px)', lineHeight: 0.9, zIndex: 0 }
                  }
                >
                  {chapter.numeral}
                </div>

                <div className="relative z-10 grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-12">
                  <div className={`md:col-span-6 ${chapter.reversed ? 'md:order-2' : ''}`}>
                    <div
                      className="relative w-full overflow-hidden rounded-lg"
                      style={{ height: 520, backgroundColor: '#E8E2D6' }}
                    >
                      <Image
                        src={chapter.image}
                        alt={chapter.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 45vw"
                        className="object-cover object-top transition-transform duration-[1800ms] ease-out group-hover:scale-110"
                      />
                      <span className="absolute left-5 top-5 rounded-full bg-cream/[0.92] px-[14px] py-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-ink backdrop-blur-[8px]">
                        {chapter.ordinal}
                      </span>
                    </div>
                  </div>

                  <div className="chapter-inner md:col-span-6">
                    <div className="mb-5 flex items-center gap-4">
                      <span className="font-display text-base" style={{ color: '#8B6F47' }}>
                        {chapter.ordinal}
                      </span>
                      <span aria-hidden="true" className="h-px w-6 bg-ink/20" />
                      <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/55">
                        {chapter.category}
                      </span>
                    </div>

                    <h3
                      className="mb-[18px] font-display leading-[1.15] text-ink"
                      style={{ fontSize: 'clamp(1.8rem, 3vw, 2.75rem)' }}
                    >
                      <Link href="#journal" className="cursor-pointer transition-opacity hover:opacity-70">
                        {chapter.title}
                      </Link>
                    </h3>

                    <p className="mb-7 font-sans text-[15px] leading-[1.8] text-ink/65">
                      {chapter.excerpt}
                    </p>

                    <div className="mb-7 flex flex-wrap items-center gap-5">
                      <p className="font-sans text-xs font-medium text-ink/60">
                        By{' '}
                        <span className="font-display text-[15px] text-ink">{chapter.author}</span>
                      </p>
                      <span aria-hidden="true" className="h-3 w-px bg-ink/20" />
                      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-ink/50">
                        {chapter.readTime} min read
                      </p>
                    </div>

                    <Link
                      href="#journal"
                      className="group/cta inline-flex cursor-pointer items-center gap-3 whitespace-nowrap pb-1.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-ink"
                      style={{ borderBottom: '1px solid rgba(196,164,122,0.55)' }}
                    >
                      Read this chapter
                      <i
                        className="ri-arrow-right-line transition-transform duration-300 group-hover/cta:translate-x-1"
                        aria-hidden="true"
                        style={{ fontSize: 14, color: '#C4A47A' }}
                      />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Sticky chapter index */}
          <nav
            aria-label="Chapters"
            className="hidden flex-col items-start pl-4 lg:col-span-2 lg:flex"
          >
            {/* `w-full` matters: the parent is `items-start`, so without it the
                sticky box sizes to its content and escapes the column. */}
            <div className="sticky w-full" style={{ top: 120 }}>
              <p className="mb-5 font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-ink/45">
                Chapters
              </p>
              {CHAPTERS.map((chapter, i) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => jumpToChapter(chapter.id)}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  className={`progress-row w-full border-0 bg-transparent text-left ${
                    i === activeIndex ? 'is-active' : ''
                  }`}
                >
                  <span aria-hidden="true" className="progress-dot shrink-0" />
                  <span aria-hidden="true" className="progress-bar shrink-0" />
                  <span className="shrink-0 font-display text-[15px] text-ink">
                    {chapter.numeral}.
                  </span>
                  {/* Drops to its own line — a 2/12 column can't fit the rule
                      and a word like "Conversations" side by side. */}
                  <span className="basis-full font-sans text-[11px] font-medium uppercase leading-tight tracking-[0.16em] text-ink/65">
                    {chapter.category}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-32 flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 48,
              marginBottom: 20,
              background:
                'linear-gradient(to bottom, rgba(196,164,122,0.6) 0%, rgba(196,164,122,0) 100%)',
            }}
          />
          <p className="font-display text-xl text-ink/55">— To be continued, in the next issue.</p>
        </div>
      </div>
    </section>
  );
}
