import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { AgentProvider } from '@/components/agent/AgentProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['italic', 'normal'],
  variable: '--font-cormorant',
  display: 'swap',
});

const SITE_URL = 'https://veloria.travel';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Veloria — Quiet journeys, composed slowly',
    template: '%s · Veloria',
  },
  description:
    'A private travel studio composing unhurried journeys to Kyoto, the Faroe Islands, Marrakech and Patagonia — for the few who travel to remember who they are.',
  keywords: [
    'luxury travel studio',
    'private journeys',
    'bespoke travel',
    'Kyoto',
    'Faroe Islands',
    'Marrakech',
    'Patagonia',
  ],
  authors: [{ name: 'Veloria Travel Studio' }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: 'Veloria',
    title: 'Veloria — Quiet journeys, composed slowly',
    description:
      'Hand-walked destinations, a journal written slowly, and a letter that arrives twice a season.',
    images: [{ url: '/images/curator-note.png', width: 1200, height: 630, alt: 'Veloria' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veloria — Quiet journeys, composed slowly',
    description:
      'Hand-walked destinations, a journal written slowly, and a letter that arrives twice a season.',
    images: ['/images/curator-note.png'],
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0D0A07',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <a
          href="#destinations"
          className="sr-only-focusable fixed left-6 top-6 z-[100] rounded-full bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-cream"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <AgentProvider />
      </body>
    </html>
  );
}
