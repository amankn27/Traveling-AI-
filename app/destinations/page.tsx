import type { Metadata } from 'next';
import { PageIntro } from '@/components/ui/PageIntro';
import { Destinations } from '@/components/sections/Destinations';
import { Newsletter } from '@/components/sections/Newsletter';

export const metadata: Metadata = {
  title: 'The Atlas of Journeys',
  description:
    'Hand-walked destinations from Goa and Udaipur to Kyoto, Santorini and Patagonia — each chosen for a particular season.',
};

export default function DestinationsPage() {
  return (
    <>
      <PageIntro
        eyebrow="The Atlas"
        title={
          <>
            Every journey begins
            <br />
            with a season.
          </>
        }
        lede="We keep the atlas deliberately small. Each entry has been walked first by a curator, in the month we recommend you go."
      />
      <Destinations />
      <Newsletter />
    </>
  );
}
