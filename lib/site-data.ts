/**
 * Single source of truth for site content.
 * The agent's knowledge layer reads from here, so the assistant and the UI can
 * never drift apart.
 */

export type SectionId =
  | 'hero'
  | 'philosophy'
  | 'destinations'
  | 'experiences'
  | 'journal'
  | 'newsletter'
  | 'contact';

export interface SectionMeta {
  /** DOM id — also the agent's `scrollToSection` allow-list key. */
  id: SectionId;
  label: string;
  /** Short description the agent uses when explaining a section. */
  synopsis: string;
  /** Words that should route an utterance to this section. */
  keywords: readonly string[];
}

export const SECTIONS: readonly SectionMeta[] = [
  {
    id: 'hero',
    label: 'The Opening Scene',
    synopsis:
      'A real-time 3D scene you can step inside. Press space to enter explore mode and drag through the particles of light.',
    keywords: ['hero', 'top', 'start', 'beginning', 'opening', 'scene', '3d', 'home', 'banner'],
  },
  {
    id: 'philosophy',
    label: 'Our Philosophy',
    synopsis:
      'Where Élodie Marchand explains the studio’s belief: we compose moments, not itineraries. Fourteen years, sixty-three countries, one-to-one planning.',
    keywords: ['philosophy', 'about', 'story', 'values', 'belief', 'founder', 'elodie', 'stats', 'numbers', 'who'],
  },
  {
    id: 'destinations',
    label: 'Curated Journeys',
    synopsis:
      'Hand-walked destinations across Asia, India, Africa, Europe and the Americas — each chosen for a particular season.',
    keywords: [
      'destination',
      'destinations',
      'journey',
      'journeys',
      'travel',
      'trip',
      'trips',
      'place',
      'places',
      'atlas',
      'where',
      'curated',
      'pricing',
      'packages',
    ],
  },
  {
    id: 'experiences',
    label: 'A Note from the Curator',
    synopsis:
      'A full-bleed pause in the page: “The most beautiful journeys are the ones that arrive at stillness — not at a place.”',
    keywords: ['experience', 'experiences', 'curator', 'note', 'quote', 'stillness', 'bespoke'],
  },
  {
    id: 'journal',
    label: 'The Journal',
    synopsis:
      'Three chapters written slowly — field notes on arriving, a potter in Naoshima, and twelve courses told in whispers.',
    keywords: ['journal', 'stories', 'story', 'chapter', 'chapters', 'read', 'reading', 'articles', 'blog', 'writing'],
  },
  {
    id: 'newsletter',
    label: 'The Quiet Letter',
    synopsis:
      'A letter that arrives twice a season — field notes, a hidden address or two, the occasional invitation.',
    keywords: ['newsletter', 'letter', 'subscribe', 'signup', 'sign', 'email', 'mailing', 'list'],
  },
  {
    id: 'contact',
    label: 'Contact & Studio',
    synopsis:
      'The footer: how to begin a conversation, the Paris line, and the studio’s three homes — Paris, Kyoto, Cape Town.',
    keywords: ['contact', 'footer', 'reach', 'phone', 'call', 'address', 'studio', 'reserve', 'booking', 'book'],
  },
] as const;

export const SECTION_IDS = SECTIONS.map((s) => s.id);

export function findSection(id: string): SectionMeta | undefined {
  return SECTIONS.find((s) => s.id === id);
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  href: string;
  /** In-page target when the link should scroll rather than route. */
  sectionId?: SectionId;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Destinations', href: '/destinations', sectionId: 'destinations' },
  { label: 'Journal', href: '/journal', sectionId: 'journal' },
  { label: 'Experiences', href: '/experiences', sectionId: 'experiences' },
  { label: 'Contact', href: '/contact', sectionId: 'contact' },
] as const;

/* -------------------------------------------------------------------------- */
/*  Destinations                                                              */
/* -------------------------------------------------------------------------- */

export type Climate = 'cold' | 'temperate' | 'warm';

/** Scene each procedurally-drawn plate composes. See `DestinationPlate`. */
export type Terrain =
  | 'coast'
  | 'city'
  | 'palace'
  | 'backwater'
  | 'island'
  | 'savanna'
  | 'andes'
  | 'terrace';

export interface Destination {
  slug: string;
  index: string;
  name: string;
  region: string;
  nights: number;
  season: string;
  blurb: string;
  /**
   * Photograph. Optional: destinations without one render a procedural SVG
   * plate instead, so a journey can be added before its photography exists.
   * Drop a file in `public/images` and set this to swap it in.
   */
  image?: string;
  /** Scene drawn when there's no photograph. */
  terrain: Terrain;
  /** Reference card heights: 640 / 500 / 500 / 640. */
  imageHeight: number;
  /** Cards 2 and 4 sit lower in the reference grid. */
  offset: boolean;

  /* — Attributes the agent reasons over ------------------------------- */
  climate: Climate;
  /** Months the journey is timed for, lowercase. */
  months: readonly string[];
  /** Free-form themes used for "similar to…" and tag filtering. */
  tags: readonly string[];
}

export const DESTINATIONS: readonly Destination[] = [
  {
    slug: 'kyoto',
    index: '01',
    name: 'Kyoto',
    region: 'Japan',
    nights: 9,
    season: 'Late Autumn',
    blurb:
      'Hidden machiya stays, private tea ceremonies in moss gardens, and dawn walks through Arashiyama bamboo before the crowds arrive.',
    image: '/images/kyoto.png',
    terrain: 'city',
    imageHeight: 640,
    offset: false,
    climate: 'temperate',
    months: ['october', 'november'],
    tags: ['culture', 'gardens', 'food', 'tea', 'quiet', 'city', 'walking'],
  },
  {
    slug: 'faroe-islands',
    index: '02',
    name: 'Faroe Islands',
    region: 'North Atlantic',
    nights: 7,
    season: 'Summer Solstice',
    blurb:
      'Cliffside cabins above mirror fjords, midnight sun hikes with local shepherds, and tasting menus crafted from sea, peat, and moss.',
    image: '/images/faroe-islands.png',
    terrain: 'island',
    imageHeight: 500,
    offset: true,
    climate: 'cold',
    months: ['june', 'july'],
    tags: ['hiking', 'sea', 'remote', 'wilderness', 'food', 'dramatic', 'islands'],
  },
  {
    slug: 'marrakech',
    index: '03',
    name: 'Marrakech',
    region: 'Morocco',
    nights: 10,
    season: 'Early Spring',
    blurb:
      'A private riad in the Medina’s quiet heart, Atlas excursions on horseback, and an evening lit only by lanterns and starlight.',
    image: '/images/marrakech.png',
    terrain: 'palace',
    imageHeight: 500,
    offset: false,
    climate: 'warm',
    months: ['march', 'april'],
    tags: ['culture', 'desert', 'mountains', 'riding', 'city', 'lanterns', 'food'],
  },
  {
    slug: 'patagonia',
    index: '04',
    name: 'Patagonia',
    region: 'Chile',
    nights: 12,
    season: 'Antipodean Autumn',
    blurb:
      'Glaciers seen from horseback at first light, a tented camp at the foot of Torres del Paine, and evenings around fire and silence.',
    image: '/images/patagonia.png',
    terrain: 'andes',
    imageHeight: 640,
    offset: true,
    climate: 'cold',
    months: ['march', 'april'],
    tags: ['wilderness', 'mountains', 'riding', 'glaciers', 'remote', 'hiking', 'fire'],
  },

  /* — India ----------------------------------------------------------- */
  {
    slug: 'goa',
    index: '05',
    name: 'Goa',
    region: 'India',
    nights: 8,
    season: 'Late Monsoon',
    blurb:
      'A Portuguese villa in the north, shutters open to the rain, and long empty beaches walked before the season turns and the crowds return.',
    terrain: 'coast',
    imageHeight: 640,
    offset: false,
    climate: 'warm',
    months: ['september', 'october'],
    tags: ['sea', 'quiet', 'food', 'walking', 'islands'],
  },
  {
    slug: 'mumbai',
    index: '06',
    name: 'Mumbai',
    region: 'India',
    nights: 5,
    season: 'Early Winter',
    blurb:
      'Art Deco balconies above Marine Drive, a dawn walk through Kala Ghoda before the heat, and dinners that begin late and end later.',
    terrain: 'city',
    imageHeight: 500,
    offset: true,
    climate: 'warm',
    months: ['december', 'january'],
    tags: ['city', 'culture', 'food', 'sea', 'walking'],
  },
  {
    slug: 'udaipur',
    index: '07',
    name: 'Udaipur',
    region: 'India',
    nights: 7,
    season: 'Cool Season',
    blurb:
      'A marble palace on still water, Aravalli hills going blue at dusk, and mornings on the lake before the city has quite woken.',
    terrain: 'palace',
    imageHeight: 500,
    offset: false,
    climate: 'temperate',
    months: ['november', 'december'],
    tags: ['culture', 'quiet', 'lanterns', 'gardens', 'city'],
  },
  {
    slug: 'kerala',
    index: '08',
    name: 'Kerala',
    region: 'India',
    nights: 9,
    season: 'Post-Monsoon',
    blurb:
      'Slow water through the backwaters, a teak houseboat moored under coconut palms, and food cooked over fire by the people who grew it.',
    terrain: 'backwater',
    imageHeight: 640,
    offset: true,
    climate: 'warm',
    months: ['october', 'november'],
    tags: ['sea', 'food', 'quiet', 'gardens', 'remote'],
  },

  /* — Further afield --------------------------------------------------- */
  {
    slug: 'santorini',
    index: '09',
    name: 'Santorini',
    region: 'Greece',
    nights: 6,
    season: 'Late Spring',
    blurb:
      'A cave house cut into the caldera wall, the Aegean impossibly far below, and evenings that hold their light long after dinner.',
    terrain: 'island',
    imageHeight: 640,
    offset: false,
    climate: 'warm',
    months: ['may', 'june'],
    tags: ['sea', 'islands', 'quiet', 'food', 'walking'],
  },
  {
    slug: 'serengeti',
    index: '10',
    name: 'Serengeti',
    region: 'Tanzania',
    nights: 8,
    season: 'Dry Season',
    blurb:
      'A tented camp moved with the herds, acacia shade at noon, and a horizon so wide it takes a day or two to learn how to look at it.',
    terrain: 'savanna',
    imageHeight: 500,
    offset: true,
    climate: 'warm',
    months: ['july', 'august'],
    tags: ['wilderness', 'remote', 'riding', 'fire', 'walking'],
  },
  {
    slug: 'sacred-valley',
    index: '11',
    name: 'Sacred Valley',
    region: 'Peru',
    nights: 10,
    season: 'Andean Winter',
    blurb:
      'Terraces stacked into the Andes, weavers working the old dyes, and the walk to Machu Picchu taken slowly enough to arrive properly.',
    terrain: 'andes',
    imageHeight: 500,
    offset: false,
    climate: 'cold',
    months: ['june', 'july'],
    tags: ['mountains', 'culture', 'hiking', 'walking', 'remote'],
  },
  {
    slug: 'bali',
    index: '12',
    name: 'Bali',
    region: 'Indonesia',
    nights: 11,
    season: 'Dry Season',
    blurb:
      'A compound above the rice terraces in Sidemen, temple mornings before the heat, and long afternoons where nothing at all is asked of you.',
    terrain: 'terrace',
    imageHeight: 640,
    offset: true,
    climate: 'warm',
    months: ['june', 'july'],
    tags: ['gardens', 'quiet', 'culture', 'food', 'islands'],
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Journal                                                                   */
/* -------------------------------------------------------------------------- */

export interface Chapter {
  id: string;
  numeral: string;
  ordinal: string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  readTime: number;
  image: string;
  /** Chapter II mirrors the layout in the reference. */
  reversed: boolean;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'ch-1',
    numeral: 'I',
    ordinal: 'Chapter I',
    category: 'Field Notes',
    title: 'On the slow art of arriving',
    excerpt:
      'A meditation on landing softly — what we leave behind, and what waits for us in the in-between.',
    author: 'Élodie Marchand',
    readTime: 6,
    image: '/images/journal-arriving.png',
    reversed: false,
  },
  {
    id: 'ch-2',
    numeral: 'II',
    ordinal: 'Chapter II',
    category: 'Conversations',
    title: 'A potter in Naoshima at first light',
    excerpt:
      'In a quiet studio on the edge of the Seto sea, we sit with Kenji-san as he speaks about clay, patience, and silence.',
    author: 'Theo Lindqvist',
    readTime: 9,
    image: '/images/journal-naoshima.png',
    reversed: true,
  },
  {
    id: 'ch-3',
    numeral: 'III',
    ordinal: 'Chapter III',
    category: 'Tables',
    title: 'Twelve courses, told in whispers',
    excerpt:
      'A private menu in the Basque hills, where every plate is a kind of letter — and the silence between courses, the most eloquent line.',
    author: 'Margaux Reyes',
    readTime: 5,
    image: '/images/journal-twelve-courses.png',
    reversed: false,
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Philosophy stats                                                          */
/* -------------------------------------------------------------------------- */

export interface Stat {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

export const STATS: readonly Stat[] = [
  { value: 14, suffix: '', label: 'Years curating private journeys', delay: 0 },
  { value: 63, suffix: '', label: 'Countries personally explored', delay: 140 },
  { value: 1, suffix: ':1', label: 'Bespoke planning for every guest', delay: 280 },
] as const;

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

export interface FooterColumn {
  heading: string;
  headingHref: string;
  links: readonly { label: string; href: string }[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'Explore',
    headingHref: '/destinations',
    links: [
      { label: 'All Destinations', href: '/destinations' },
      { label: 'Experiences', href: '/experiences' },
      { label: 'Journal', href: '/journal' },
      { label: 'The Atlas', href: '/destinations' },
    ],
  },
  {
    heading: 'Studio',
    headingHref: '/',
    links: [
      { label: 'Our Philosophy', href: '/' },
      { label: 'The Curators', href: '/contact' },
      { label: 'Press', href: '/contact' },
      { label: 'Careers', href: '/contact' },
    ],
  },
  {
    heading: 'Contact',
    headingHref: '/contact',
    links: [
      { label: 'Begin a Conversation', href: '/contact' },
      { label: '+33 1 42 60 11 82', href: '/contact' },
      { label: 'hello@veloria.travel', href: '/contact' },
      { label: 'Paris · Kyoto · Cape Town', href: '/contact' },
    ],
  },
] as const;

export const SOCIAL_LINKS = [
  { label: 'Instagram', icon: 'ri-instagram-line', href: '/contact' },
  { label: 'Pinterest', icon: 'ri-pinterest-line', href: '/contact' },
  { label: 'Spotify', icon: 'ri-spotify-line', href: '/contact' },
  { label: 'Email', icon: 'ri-mail-line', href: '/contact' },
] as const;

export const LUMA_SCENE_SRC =
  'https://lumalabs.ai/embed/4f362242-ad43-4851-9b04-88adf71f24f5?mode=sparkles&background=%23ffffff&color=%23000000&showTitle=false&loadBg=true&logoPosition=bottom-left&infoPosition=bottom-right&cinematicVideo=undefined&showMenu=false';
