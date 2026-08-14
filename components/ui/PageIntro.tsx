import { Eyebrow } from '@/components/ui/Eyebrow';

interface PageIntroProps {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  tone?: 'light' | 'dark';
}

/** Masthead for the secondary routes, clearing the fixed 72px header. */
export function PageIntro({ eyebrow, title, lede, tone = 'dark' }: PageIntroProps) {
  const isLight = tone === 'light';

  return (
    <header
      className="w-full"
      style={{
        paddingTop: 200,
        paddingBottom: 80,
        backgroundColor: isLight ? '#13110E' : '#F7F3EC',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Eyebrow tone={tone} className="mb-6">
          {eyebrow}
        </Eyebrow>
        <h1
          className={`font-display ${isLight ? 'text-white' : 'text-ink'}`}
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {lede ? (
          <p
            className={`mt-6 max-w-xl font-sans text-[15px] leading-[1.8] ${
              isLight ? 'text-white/65' : 'text-ink/60'
            }`}
          >
            {lede}
          </p>
        ) : null}
      </div>
    </header>
  );
}
