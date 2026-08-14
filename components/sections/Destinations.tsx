import Image from 'next/image';
import Link from 'next/link';
import { DESTINATIONS } from '@/lib/site-data';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { DestinationPlate } from '@/components/ui/DestinationPlate';
import { Reveal } from '@/components/animations/Reveal';

export function Destinations() {
  return (
    <section
      id="destinations"
      className="relative w-full"
      style={{ backgroundColor: '#F7F3EC', paddingTop: 140, paddingBottom: 160 }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-20 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <Reveal className="max-w-2xl">
            <Eyebrow className="mb-6">No. 01 — Curated Journeys</Eyebrow>
            <h2
              className="font-display text-ink"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
              }}
            >
              Places we’ve fallen
              <br />
              quietly in love with.
            </h2>
          </Reveal>

          <Reveal delay={140} className="md:max-w-sm">
            <p className="font-sans text-sm leading-[1.8] text-ink/60">
              Each destination is hand-chosen and walked first by our curators. We collect seasons,
              textures, and stories — then shape them around you.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {DESTINATIONS.map((destination, index) => (
            <Reveal
              as="article"
              key={destination.slug}
              delay={(index % 2) * 120}
              className={`group cursor-pointer ${destination.offset ? 'md:mt-24' : ''}`}
            >
              <div data-destination={destination.slug}>
                <div
                  className="relative w-full overflow-hidden rounded-lg"
                  style={{ height: destination.imageHeight, backgroundColor: '#E8E2D6' }}
                >
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={`${destination.name} — ${destination.region}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                      className="object-cover object-top transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                    />
                  ) : (
                    <DestinationPlate
                      terrain={destination.terrain}
                      id={destination.slug}
                      className="absolute inset-0 h-full w-full transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                    />
                  )}
                  <span className="absolute left-5 top-5 rounded-full bg-cream/[0.92] px-[14px] py-1.5 font-sans text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur-[10px]">
                    {destination.season}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-5 font-display text-xl text-white/90"
                    style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
                  >
                    {destination.index}
                  </span>
                </div>

                <div className="mt-7">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-[34px] leading-[1.1] text-ink">
                      <Link
                        href="#destinations"
                        className="cursor-pointer transition-opacity hover:opacity-70"
                      >
                        {destination.name}
                      </Link>
                    </h3>
                    <p className="whitespace-nowrap font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-ink/50">
                      {destination.region} · {destination.nights} Nights
                    </p>
                  </div>

                  <p className="font-sans text-sm leading-[1.8] text-ink/65">{destination.blurb}</p>

                  <Link
                    href="#destinations"
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b border-ink/30 pb-1 font-sans text-xs font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:border-gold hover:text-gold-deep"
                  >
                    Explore the journey
                    <i className="ri-arrow-right-up-line" aria-hidden="true" style={{ fontSize: 13 }} />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-24 flex justify-center">
          <Link
            href="/destinations"
            data-target="atlas"
            className="inline-flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-full border border-ink/30 px-9 py-4 font-sans text-xs font-medium uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-ink hover:text-white"
          >
            The Full Atlas of Journeys
            <i className="ri-arrow-right-line" aria-hidden="true" style={{ fontSize: 14 }} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
