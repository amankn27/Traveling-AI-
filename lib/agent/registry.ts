import { SECTION_IDS, type SectionId } from '@/lib/site-data';

/**
 * Safety boundary for anything the agent points at.
 *
 * The agent never receives a raw CSS selector. It names a *target key*, and this
 * module is the only place that turns a key into a DOM node — so a malicious or
 * hallucinated argument can't reach `querySelector` with arbitrary input.
 */

const TARGET_SELECTORS = {
  header: 'header[data-site-header]',
  logo: '[data-target="logo"]',
  nav: '[data-target="nav"]',
  reserve: '[data-target="reserve"]',
  hero: '#hero',
  'hero-title': '[data-target="hero-title"]',
  'hero-cta': '[data-target="hero-cta"]',
  philosophy: '#philosophy',
  stats: '[data-target="stats"]',
  signature: '[data-target="signature"]',
  destinations: '#destinations',
  'destination-kyoto': '[data-destination="kyoto"]',
  'destination-faroe-islands': '[data-destination="faroe-islands"]',
  'destination-marrakech': '[data-destination="marrakech"]',
  'destination-patagonia': '[data-destination="patagonia"]',
  atlas: '[data-target="atlas"]',
  experiences: '#experiences',
  journal: '#journal',
  'chapter-ch-1': '[data-chapter-id="ch-1"]',
  'chapter-ch-2': '[data-chapter-id="ch-2"]',
  'chapter-ch-3': '[data-chapter-id="ch-3"]',
  'pull-quote': '[data-target="pull-quote"]',
  newsletter: '#newsletter',
  'newsletter-form': '[data-target="newsletter-form"]',
  contact: '#contact',
  'contact-details': '[data-target="contact-details"]',
} as const;

export type TargetKey = keyof typeof TARGET_SELECTORS;

export const TARGET_KEYS = Object.keys(TARGET_SELECTORS) as TargetKey[];

export function isTargetKey(value: string): value is TargetKey {
  return Object.prototype.hasOwnProperty.call(TARGET_SELECTORS, value);
}

export function resolveTarget(key: string): HTMLElement | null {
  if (typeof document === 'undefined' || !isTargetKey(key)) return null;
  return document.querySelector<HTMLElement>(TARGET_SELECTORS[key]);
}

export function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as string[]).includes(value);
}

/** Routes the agent is allowed to navigate to. */
export const ALLOWED_ROUTES = [
  '/',
  '/destinations',
  '/journal',
  '/experiences',
  '/contact',
] as const;

export function isAllowedRoute(href: string): boolean {
  return (ALLOWED_ROUTES as readonly string[]).includes(href);
}
