'use client';

import { Fragment } from 'react';
import { STATS } from '@/lib/site-data';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CountUp } from '@/components/animations/CountUp';
import { useUiStore } from '@/store/ui-store';

/** One hoverable word, with any trailing punctuation kept outside the hit area. */
function Word({ text, punctuation = '' }: { text: string; punctuation?: string }) {
  return (
    <span style={{ display: 'inline-block' }}>
      <span className="philo-word">{text}</span>
      {punctuation ? <span>{punctuation}</span> : null}
    </span>
  );
}

/** Renders "word", "word." or "word," entries with the spaces between them. */
function Words({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => {
        const match = /^(.*?)([.,—]?)$/.exec(item);
        const word = match?.[1] ?? item;
        const punctuation = match?.[2] ?? '';
        return (
          <Fragment key={`${item}-${i}`}>
            <Word text={word} punctuation={punctuation} />
            {i < items.length - 1 ? <span> </span> : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function Philosophy() {
  const kenBurnsTick = useUiStore((s) => s.animationTick.kenBurns ?? 0);
  const statTick = useUiStore((s) => s.animationTick.statCount ?? 0);

  return (
    <section
      id="philosophy"
      className="relative w-full overflow-hidden"
      style={{ paddingTop: 160, paddingBottom: 200, backgroundColor: '#0D0A07' }}
    >
      <div
        key={kenBurnsTick}
        aria-hidden="true"
        className="ken-burns absolute inset-0"
        style={{
          backgroundImage: 'url(/images/philosophy-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(8,6,4,0.78) 0%, rgba(12,9,6,0.62) 40%, rgba(15,11,7,0.78) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: '20%',
          width: 900,
          height: 600,
          maxWidth: '100%',
          background:
            'radial-gradient(rgba(196,164,122,0.12) 0%, rgba(0,0,0,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-6 text-center md:px-10">
        <Eyebrow centered tone="light" className="mb-10">
          Our Philosophy
        </Eyebrow>

        <p
          className="font-display text-white"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
          }}
        >
          <Words items={['We', 'don’t', 'sell', 'destinations.', 'We', 'compose']} />{' '}
          <br className="hidden md:block" />
          <span className="philo-word philo-moments" style={{ color: '#E8C997' }}>
            moments
          </span>{' '}
          <Words
            items={['that', 'linger', 'long', 'after', 'the', 'journey', 'ends', '—']}
          />
          <br className="hidden md:block" />
          <Words items={['quiet,', 'weightless,', 'unmistakably', 'yours.']} />
        </p>

        <div data-target="signature" className="mt-16 inline-flex flex-col items-center">
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 60,
              marginBottom: 18,
              background:
                'linear-gradient(to bottom, rgba(196,164,122,0) 0%, rgba(196,164,122,0.7) 100%)',
            }}
          />
          <div className="font-display text-[18px] text-white/90">Élodie Marchand</div>
          <div className="mt-1 font-sans text-[11px] uppercase tracking-[0.24em] text-white/55">
            Founder &amp; Curator
          </div>
        </div>

        <dl
          data-target="stats"
          className="mx-auto mt-24 grid max-w-[760px] grid-cols-1 gap-12 sm:grid-cols-3"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-rise text-center" style={{ animationDelay: `${stat.delay}ms` }}>
              <dd
                className="font-display leading-none"
                style={{
                  fontSize: 52,
                  color: '#E8C997',
                  textShadow: '0 0 24px rgba(196,164,122,0.25)',
                }}
              >
                <CountUp value={stat.value} suffix={stat.suffix} replayKey={statTick} />
              </dd>
              <dt className="mt-3 font-sans text-xs font-medium uppercase leading-relaxed tracking-[0.1em] text-white/65">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
