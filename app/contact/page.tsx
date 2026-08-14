import type { Metadata } from 'next';
import { PageIntro } from '@/components/ui/PageIntro';
import { Newsletter } from '@/components/sections/Newsletter';
import { Eyebrow } from '@/components/ui/Eyebrow';

export const metadata: Metadata = {
  title: 'Begin a Conversation',
  description:
    'Reach the Veloria studio in Paris, Kyoto or Cape Town, and begin composing a journey.',
};

const DETAILS = [
  { label: 'Telephone', value: '+33 1 42 60 11 82', href: 'tel:+33142601182' },
  { label: 'Correspondence', value: 'hello@veloria.travel', href: 'mailto:hello@veloria.travel' },
  { label: 'Studios', value: 'Paris · Kyoto · Cape Town' },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Begin a Conversation"
        title={
          <>
            Tell us where your
            <br />
            mind keeps wandering.
          </>
        }
        lede="Every journey starts as a conversation — usually a long one. Write, or call the Paris line between 9 and 6 CET."
      />

      <section
        className="w-full"
        style={{ backgroundColor: '#F7F3EC', paddingTop: 40, paddingBottom: 140 }}
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Eyebrow className="mb-10">The Studio</Eyebrow>
          <dl className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            {DETAILS.map((detail) => (
              <div key={detail.label}>
                <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-ink/50">
                  {detail.label}
                </dt>
                <dd className="mt-3 font-display text-[26px] text-ink">
                  {detail.href ? (
                    <a href={detail.href} className="transition-opacity hover:opacity-70">
                      {detail.value}
                    </a>
                  ) : (
                    detail.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
