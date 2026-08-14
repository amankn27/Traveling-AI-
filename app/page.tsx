import { Hero } from '@/components/sections/Hero';
import { Philosophy } from '@/components/sections/Philosophy';
import { Destinations } from '@/components/sections/Destinations';
import { CuratorNote } from '@/components/sections/CuratorNote';
import { Journal } from '@/components/sections/Journal';
import { Newsletter } from '@/components/sections/Newsletter';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Philosophy />
      <Destinations />
      <CuratorNote />
      <Journal />
      <Newsletter />
    </>
  );
}
