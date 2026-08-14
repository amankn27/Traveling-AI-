'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/animations/Reveal';

type Status = 'idle' | 'submitting' | 'done' | 'error';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    // No mailing-list provider is wired up; acknowledge locally rather than
    // pretending a subscription was recorded somewhere.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus(email.includes('@') ? 'done' : 'error');
  };

  return (
    <section
      id="newsletter"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: '#1A1612', paddingTop: 140, paddingBottom: 140 }}
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-30">
        <Image
          src="/images/newsletter-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(26,22,18,0.95) 0%, rgba(26,22,18,0.85) 50%, rgba(26,22,18,0.95) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-[760px] px-6 text-center md:px-10">
        <Reveal>
          <Eyebrow centered tone="light" className="mb-8">
            The Quiet Letter
          </Eyebrow>
        </Reveal>

        <Reveal delay={100}>
          <h2
            className="font-display text-white"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.005em',
            }}
          >
            A letter arrives, twice a season.
          </h2>
          <p className="mx-auto mt-6 max-w-[520px] font-sans text-[15px] leading-[1.8] text-white/65">
            Field notes, a hidden address or two, and the occasional invitation — shared with a
            small circle of fellow wanderers. Nothing more.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <form
            onSubmit={handleSubmit}
            data-target="newsletter-form"
            className="mx-auto mt-12 flex max-w-[520px] flex-col items-stretch gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your private email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              className="flex-1 rounded-full px-6 py-4 font-sans text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-gold/60"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="cursor-pointer whitespace-nowrap rounded-full px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.18em] text-ink transition-all duration-300 hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: '#C4A47A', border: 'none' }}
            >
              {status === 'submitting' ? 'Sending…' : 'Subscribe'}
            </button>
          </form>

          <p role="status" aria-live="polite" className="mt-6 font-sans text-xs text-gold-light">
            {status === 'done'
              ? 'Noted — the next letter is yours. (Demo only; nothing was sent.)'
              : status === 'error'
                ? 'That address doesn’t look quite right.'
                : ''}
          </p>
        </Reveal>

        <p className="mt-8 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
          Unsubscribe anytime · We never share your address
        </p>
      </div>
    </section>
  );
}
