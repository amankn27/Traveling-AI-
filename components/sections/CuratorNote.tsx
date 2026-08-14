import Image from 'next/image';
import Link from 'next/link';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/animations/Reveal';

/** The full-bleed pause between the journeys and the journal. */
export function CuratorNote() {
  return (
    <section id="experiences" className="relative w-full overflow-hidden" style={{ height: 720 }}>
      <Image
        src="/images/curator-note.jpg"
        alt="A quiet evening at a cliffside infinity pool"
        fill
        sizes="100vw"
        className="object-cover object-top"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      <div className="relative mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-6 text-center md:px-10">
        <Reveal>
          <Eyebrow centered tone="light" className="mb-8 !text-white/70">
            A Note from the Curator
          </Eyebrow>
        </Reveal>

        <Reveal delay={120}>
          <blockquote
            className="font-display text-white"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              lineHeight: 1.25,
              maxWidth: 1000,
              letterSpacing: '-0.005em',
            }}
          >
            “The most beautiful journeys are the ones <br className="hidden md:block" />
            that arrive at <span style={{ color: '#E8C9A0' }}>stillness</span> — not at a place.”
          </blockquote>
        </Reveal>

        <Reveal delay={240} className="mt-12 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/contact"
            className="cursor-pointer whitespace-nowrap rounded-full border border-white/50 px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.18em] text-white transition-all duration-300 hover:bg-white hover:text-black"
          >
            Begin a Conversation
          </Link>
          <Link
            href="/journal"
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap font-sans text-xs font-medium uppercase tracking-[0.18em] text-white/85 transition-colors hover:text-white"
          >
            Read the journal
            <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: 14 }} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
