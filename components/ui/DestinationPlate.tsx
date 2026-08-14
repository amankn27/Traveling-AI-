import type { Terrain } from '@/lib/site-data';

interface DestinationPlateProps {
  terrain: Terrain;
  /** Unique per card — SVG gradient ids are document-global. */
  id: string;
  className?: string;
}

/**
 * A drawn stand-in for a destination photograph.
 *
 * Journeys added before their photography exists render one of these instead of
 * a broken image. Built from the site's own palette so a mixed grid still reads
 * as one collection; entirely deterministic, so SSR and hydration agree.
 *
 * To replace one with a real photo, drop the file in `public/images` and set
 * `image` on that destination in `lib/site-data.ts`.
 */
export function DestinationPlate({ terrain, id, className }: DestinationPlateProps) {
  const p = PALETTES[terrain];

  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
        <linearGradient id={`ground-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.ground} />
          <stop offset="100%" stopColor={p.groundDeep} />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.sun} stopOpacity="0.55" />
          <stop offset="100%" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`veil-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D0A07" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#0D0A07" stopOpacity="0" />
          <stop offset="100%" stopColor="#0D0A07" stopOpacity="0.34" />
        </linearGradient>
      </defs>

      <rect width="800" height="1000" fill={`url(#sky-${id})`} />
      <circle cx={p.sunX} cy={p.sunY} r="260" fill={`url(#glow-${id})`} />
      <circle cx={p.sunX} cy={p.sunY} r="46" fill={p.sun} opacity="0.5" />

      <Scene terrain={terrain} id={id} />

      {/* Ties every plate to the same tonal range as the photographs. */}
      <rect width="800" height="1000" fill={`url(#veil-${id})`} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

function Scene({ terrain, id }: { terrain: Terrain; id: string }) {
  const p = PALETTES[terrain];
  const ground = `url(#ground-${id})`;

  switch (terrain) {
    case 'coast':
      return (
        <>
          <rect y="600" width="800" height="180" fill={p.mid} opacity="0.85" />
          <path d="M0 780 H800 V1000 H0 Z" fill={ground} />
          {/* wet-sand reflection of the sun */}
          <ellipse cx={p.sunX} cy="860" rx="120" ry="70" fill={p.sun} opacity="0.16" />
          <Palm x={90} y={790} scale={1.35} fill={p.dark} />
          <Palm x={715} y={800} scale={1.15} fill={p.dark} />
          <path d="M0 772 Q200 762 400 774 T800 768 V800 H0 Z" fill={p.dark} opacity="0.22" />
        </>
      );

    case 'city':
      return (
        <>
          <rect y="700" width="800" height="300" fill={ground} />
          <g fill={p.dark} opacity="0.92">
            {SKYLINE.map(([x, w, h], i) => (
              <rect key={i} x={x} y={700 - h} width={w} height={h} rx="3" />
            ))}
          </g>
          {/* deco stepped crowns */}
          <g fill={p.dark} opacity="0.92">
            <rect x="292" y="404" width="46" height="26" rx="3" />
            <rect x="306" y="378" width="18" height="30" rx="2" />
            <rect x="566" y="452" width="38" height="22" rx="3" />
          </g>
          <path d="M0 700 Q400 664 800 700 V740 H0 Z" fill={p.mid} opacity="0.5" />
        </>
      );

    case 'palace':
      return (
        <>
          <path d="M0 620 L180 520 L340 606 L520 500 L700 600 L800 552 V700 H0 Z" fill={p.mid} opacity="0.6" />
          <g fill={p.dark} opacity="0.9">
            <rect x="250" y="560" width="300" height="150" />
            <Dome cx={400} cy={560} r={78} />
            <Dome cx={286} cy={584} r={38} />
            <Dome cx={514} cy={584} r={38} />
            {[300, 356, 412, 468].map((x) => (
              <path key={x} d={`M${x} 710 v-64 a16 16 0 0 1 32 0 v64 Z`} />
            ))}
          </g>
          <rect y="710" width="800" height="290" fill={ground} />
          {/* mirrored on still water */}
          <g fill={p.dark} opacity="0.2" transform="translate(0,1420) scale(1,-1)">
            <rect x="250" y="560" width="300" height="150" />
            <Dome cx={400} cy={560} r={78} />
          </g>
          <rect y="710" width="800" height="290" fill={p.sheen} opacity="0.12" />
        </>
      );

    case 'backwater':
      return (
        <>
          <rect y="640" width="800" height="360" fill={ground} />
          <g fill={p.dark} opacity="0.88">
            {[40, 150, 250, 560, 660, 760].map((x, i) => (
              <Palm key={x} x={x} y={660} scale={1.5 + (i % 3) * 0.18} fill={p.dark} />
            ))}
          </g>
          <path d="M0 630 Q200 600 400 630 T800 618 V680 H0 Z" fill={p.dark} opacity="0.55" />
          {/* houseboat */}
          <g fill={p.dark} opacity="0.85">
            <path d="M330 726 h150 l-16 34 h-118 Z" />
            <path d="M340 726 q65 -40 130 0 Z" />
          </g>
          {[790, 830, 872].map((y, i) => (
            <rect key={y} x={140 + i * 40} y={y} width={520 - i * 80} height="3" fill={p.sheen} opacity="0.2" rx="2" />
          ))}
        </>
      );

    case 'island':
      return (
        <>
          <rect y="660" width="800" height="340" fill={ground} />
          <path d="M0 660 L0 430 L210 350 L430 470 L620 402 L800 470 V660 Z" fill={p.mid} opacity="0.85" />
          <g fill={p.light} opacity="0.9">
            {CUBES.map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx="2" />
            ))}
            <Dome cx={214} cy={432} r={26} />
          </g>
          <path d="M0 660 Q400 626 800 660 V700 H0 Z" fill={p.dark} opacity="0.28" />
          {[720, 790, 862].map((y, i) => (
            <rect key={y} x={90 + i * 60} y={y} width={620 - i * 120} height="3" fill={p.sheen} opacity="0.18" rx="2" />
          ))}
        </>
      );

    case 'savanna':
      return (
        <>
          <rect y="740" width="800" height="260" fill={ground} />
          <path d="M0 740 Q400 714 800 740 V780 H0 Z" fill={p.mid} opacity="0.7" />
          <Acacia x={190} y={740} scale={1.5} fill={p.dark} />
          <Acacia x={600} y={745} scale={1.15} fill={p.dark} />
          <Acacia x={410} y={736} scale={0.68} fill={p.dark} opacity={0.45} />
          <g fill={p.dark} opacity="0.35">
            {[[300, 812], [356, 820], [470, 806]].map(([x, y]) => (
              <ellipse key={x} cx={x} cy={y} rx="17" ry="9" />
            ))}
          </g>
        </>
      );

    case 'andes':
      return (
        <>
          <path d="M0 560 L170 350 L300 500 L430 300 L580 490 L700 396 L800 520 V1000 H0 Z" fill={p.mid} opacity="0.75" />
          <path d="M0 690 L150 540 L310 680 L470 520 L640 672 L800 590 V1000 H0 Z" fill={ground} />
          {/* snowline */}
          <g fill={p.light} opacity="0.5">
            <path d="M430 300 L470 356 L430 340 L392 358 Z" />
            <path d="M170 350 L206 402 L170 388 L136 404 Z" />
          </g>
          {/* stacked terraces */}
          <g fill={p.dark} opacity="0.24">
            {[812, 856, 900, 944].map((y, i) => (
              <path key={y} d={`M${70 + i * 26} ${y} h${640 - i * 52} v10 h-${640 - i * 52} Z`} />
            ))}
          </g>
        </>
      );

    case 'terrace':
      return (
        <>
          <path d="M0 600 L220 508 L470 590 L800 512 V700 H0 Z" fill={p.mid} opacity="0.6" />
          <rect y="660" width="800" height="340" fill={ground} />
          <g fill={p.dark} opacity="0.2">
            {[690, 748, 806, 864, 922].map((y, i) => (
              <path key={y} d={`M0 ${y} Q400 ${y - 30 + i * 5} 800 ${y} v16 Q400 ${y - 14 + i * 5} 0 ${y + 16} Z`} />
            ))}
          </g>
          <Palm x={110} y={686} scale={1.25} fill={p.dark} />
          <Palm x={690} y={678} scale={1.05} fill={p.dark} />
          <path d="M0 640 Q400 610 800 646 V672 H0 Z" fill={p.sheen} opacity="0.14" />
        </>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Shared marks                                                              */
/* -------------------------------------------------------------------------- */

function Dome({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <path d={`M${cx - r} ${cy} a${r} ${r * 1.1} 0 0 1 ${r * 2} 0 Z`} />;
}

function Palm({ x, y, scale, fill }: { x: number; y: number; scale: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <path d="M-3 0 q4 -60 1 -104 h6 q-4 46 0 104 Z" />
      {[-1, 1].map((dir) =>
        [0, 1, 2].map((i) => (
          <path
            key={`${dir}-${i}`}
            d={`M0 -104 q${dir * (34 + i * 14)} ${-16 + i * 16} ${dir * (52 + i * 16)} ${6 + i * 20} q${dir * -22} ${-20 - i * 8} ${dir * -52} ${-6 - i * 18} Z`}
          />
        )),
      )}
    </g>
  );
}

function Acacia({
  x,
  y,
  scale,
  fill,
  opacity = 1,
}: {
  x: number;
  y: number;
  scale: number;
  fill: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill} opacity={opacity}>
      <path d="M-4 0 v-70 l-16 -26 h8 l12 18 v-14 l14 -20 l14 20 v14 l12 -18 h8 l-16 26 V0 Z" />
      <path d="M-78 -108 q78 -42 156 0 q-40 -18 -78 -18 q-38 0 -78 18 Z" />
      <path d="M-58 -122 q58 -30 116 0 q-30 -14 -58 -14 q-28 0 -58 14 Z" />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Palettes — drawn from the site's own tokens                               */
/* -------------------------------------------------------------------------- */

interface Palette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDeep: string;
  mid: string;
  dark: string;
  light: string;
  sheen: string;
  sun: string;
  sunX: number;
  sunY: number;
}

const PALETTES: Record<Terrain, Palette> = {
  coast: {
    skyTop: '#B9A98F', skyBottom: '#E8C997', ground: '#C9B79B', groundDeep: '#8B6F47',
    mid: '#6E6A5E', dark: '#2A2520', light: '#F2EAD9', sheen: '#F7F3EC',
    sun: '#F0D6A8', sunX: 540, sunY: 470,
  },
  city: {
    skyTop: '#8E9299', skyBottom: '#E3D3BA', ground: '#7E8489', groundDeep: '#4A4A48',
    mid: '#9AA0A4', dark: '#2A2520', light: '#F2EAD9', sheen: '#F7F3EC',
    sun: '#F0DDBC', sunX: 250, sunY: 430,
  },
  palace: {
    skyTop: '#9AA6B4', skyBottom: '#E6D9C4', ground: '#8C97A2', groundDeep: '#5A6470',
    mid: '#7C8794', dark: '#3A3630', light: '#F7F3EC', sheen: '#F7F3EC',
    sun: '#F2E3C6', sunX: 610, sunY: 380,
  },
  backwater: {
    skyTop: '#8F9276', skyBottom: '#D9C79C', ground: '#4E5943', groundDeep: '#28301F',
    mid: '#6B7355', dark: '#1F2618', light: '#E8E2D6', sheen: '#E8C997',
    sun: '#EBCF9A', sunX: 300, sunY: 470,
  },
  island: {
    skyTop: '#8FA3B8', skyBottom: '#E4D6BE', ground: '#5F7386', groundDeep: '#33414F',
    mid: '#7A6A5A', dark: '#2A2520', light: '#F7F3EC', sheen: '#F7F3EC',
    sun: '#F2DFBB', sunX: 620, sunY: 300,
  },
  savanna: {
    skyTop: '#C0A87E', skyBottom: '#EBD3A4', ground: '#B99C6E', groundDeep: '#7C6437',
    mid: '#C9B183', dark: '#2E2820', light: '#F2EAD9', sheen: '#F7F3EC',
    sun: '#F5DFB2', sunX: 430, sunY: 520,
  },
  andes: {
    skyTop: '#93A2AE', skyBottom: '#DCD2C2', ground: '#6E7466', groundDeep: '#3C4038',
    mid: '#8A8F86', dark: '#2A2A26', light: '#F7F3EC', sheen: '#F7F3EC',
    sun: '#EFE0C4', sunX: 240, sunY: 250,
  },
  terrace: {
    skyTop: '#9CA88A', skyBottom: '#E2D6B4', ground: '#66754C', groundDeep: '#38452A',
    mid: '#7E8C63', dark: '#252D1C', light: '#E8E2D6', sheen: '#E8C997',
    sun: '#EFDDAF', sunX: 560, sunY: 400,
  },
};

/* Fixed layouts — no randomness, so server and client render the same tree. */
const SKYLINE: [number, number, number][] = [
  [20, 54, 150], [86, 40, 214], [136, 62, 128], [208, 46, 262], [264, 74, 296],
  [348, 42, 186], [400, 58, 244], [468, 50, 160], [528, 66, 248], [604, 44, 178],
  [658, 56, 226], [724, 58, 142],
];

const CUBES: [number, number, number, number][] = [
  [150, 452, 64, 46], [222, 470, 54, 40], [286, 496, 72, 48], [366, 516, 58, 42],
  [432, 500, 66, 44], [508, 476, 52, 38], [568, 448, 70, 50], [648, 478, 56, 40],
];
