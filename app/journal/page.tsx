import type { Metadata } from 'next';
import { PageIntro } from '@/components/ui/PageIntro';
import { Journal } from '@/components/sections/Journal';
import { Newsletter } from '@/components/sections/Newsletter';

export const metadata: Metadata = {
  title: 'The Journal',
  description:
    'Three chapters written slowly — field notes on arriving, a potter in Naoshima, and twelve courses told in whispers.',
};

export default function JournalPage() {
  return (
    <>
      <PageIntro
        eyebrow="No. 02 — The Journal"
        title="A slow correspondence."
        lede="Not a guidebook. Field notes gathered from the quiet places where our travellers paused, listened, and remembered to be still."
      />
      <Journal />
      <Newsletter />
    </>
  );
}
