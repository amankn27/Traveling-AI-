import type { Metadata } from 'next';
import { PageIntro } from '@/components/ui/PageIntro';
import { CuratorNote } from '@/components/sections/CuratorNote';
import { Philosophy } from '@/components/sections/Philosophy';

export const metadata: Metadata = {
  title: 'Experiences',
  description:
    'A note from the curator, and the philosophy behind every journey Veloria composes.',
};

export default function ExperiencesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Bespoke Escapes"
        title="Composed around you, entirely."
        lede="Private tea ceremonies before dawn. A tented camp at the foot of Torres del Paine. Every experience is arranged for one party only."
        tone="light"
      />
      <CuratorNote />
      <Philosophy />
    </>
  );
}
