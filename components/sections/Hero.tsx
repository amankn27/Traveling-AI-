'use client';

import { useEffect, useRef, useState } from 'react';
import { LUMA_SCENE_SRC } from '@/lib/site-data';
import { useUiStore } from '@/store/ui-store';
import { ParticleField } from '@/components/animations/ParticleField';

/**
 * The opening scene.
 *
 * A real-time gaussian-splat embed sits above a canvas particle field, so the
 * hero still reads as "particles of light" if the third-party embed is slow,
 * blocked, or unavailable. Space toggles explore mode: the interaction shield
 * drops, the copy fades, and the scene takes pointer input.
 */
export function Hero() {
  const exploreMode = useUiStore((s) => s.exploreMode);
  const setExploreMode = useUiStore((s) => s.setExploreMode);

  const [flashKey, setFlashKey] = useState(0);
  const [hintReady, setHintReady] = useState(false);
  const [keyPressed, setKeyPressed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Offer the hint just as the last line of copy finishes fading in
  // (hero-fade-4 starts at 2.4s and runs 1.1s).
  useEffect(() => {
    const timer = window.setTimeout(() => setHintReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.code !== 'Space') return;

      event.preventDefault();
      if (event.repeat) return;

      setKeyPressed(true);
      setExploreMode(!useUiStore.getState().exploreMode);
      setFlashKey((k) => k + 1);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setKeyPressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setExploreMode]);

  // The embed steals focus on load; hand it straight back so Space keeps working.
  useEffect(() => {
    const releaseFocus = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof HTMLIFrameElement && active === iframeRef.current) {
          active.blur();
          window.focus();
          document.body.focus({ preventScroll: true });
        }
      }, 0);
    };
    window.addEventListener('blur', releaseFocus);
    return () => window.removeEventListener('blur', releaseFocus);
  }, []);

  const toggle = () => {
    setExploreMode(!exploreMode);
    setFlashKey((k) => k + 1);
  };

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden bg-black">
      <ParticleField active={!exploreMode} />

      <iframe
        ref={iframeRef}
        src={LUMA_SCENE_SRC}
        title="Veloria — an immersive scene rendered in real time"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full border-0"
        style={{ zIndex: 1 }}
      />

      {/* Interaction shield — swallows pointer input until explore mode is on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ zIndex: 2, pointerEvents: exploreMode ? 'none' : 'auto' }}
      />

      {/* Mode-change flash. */}
      <div
        key={flashKey}
        aria-hidden="true"
        className={flashKey > 0 ? 'mode-flash' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 12,
          pointerEvents: 'none',
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 60%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
        }}
      />

      {/* Gradient into the section below, then a solid base. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: 220,
          zIndex: 5,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0"
        style={{ height: 80, zIndex: 8, background: '#000' }}
      />

      {/* Shown only while the scene has pointer control — browse mode is the
          resting state and needs no label. */}
      {exploreMode ? (
        <div
          className="hint-rise pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5"
          style={{
            top: 96,
            zIndex: 20,
            padding: '7px 16px 7px 12px',
            borderRadius: 999,
            background: 'rgba(20, 40, 20, 0.55)',
            border: '1px solid rgba(180, 255, 180, 0.35)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(220, 255, 220, 0.95)',
            fontWeight: 500,
          }}
        >
          <span
            className="status-dot"
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#9bff9b' }}
          />
          Explore Mode · Active
        </div>
      ) : null}

      {/* Copy stack. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{
          zIndex: 10,
          pointerEvents: 'none',
          opacity: exploreMode ? 0 : 1,
          transform: exploreMode ? 'translateY(-10px)' : 'translateY(0)',
          transition: 'opacity 500ms, transform 500ms',
        }}
      >
        <div
          className="hero-fade hero-fade-1 inline-block rounded-full font-sans text-xs font-medium uppercase tracking-[0.1em] text-white"
          style={{
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '6px 16px',
          }}
        >
          A New Dimension
        </div>

        <h1
          data-target="hero-title"
          className="hero-fade hero-fade-2 font-display text-white"
          style={{
            marginTop: 28,
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            lineHeight: 1.05,
            maxWidth: 1100,
            letterSpacing: '-0.01em',
          }}
        >
          Where worlds
          <br />
          come to light
        </h1>

        <p
          className="hero-fade hero-fade-3 font-sans"
          style={{
            marginTop: 28,
            fontSize: 15,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 560,
            lineHeight: 1.7,
          }}
        >
          An immersive 3D scene rendered in real time. Press space to enter and drag through
          particles of light.
        </p>

        <div
          className="hero-fade hero-fade-4 flex flex-wrap items-center justify-center gap-5"
          style={{ marginTop: 40, pointerEvents: 'auto' }}
        >
          <button
            type="button"
            data-target="hero-cta"
            onClick={toggle}
            className={`cursor-pointer whitespace-nowrap rounded-full text-white transition-colors duration-200 hover:bg-white/20 ${
              keyPressed ? 'space-key-pressed' : ''
            }`}
            style={{
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            Enter the Scene
          </button>

          {hintReady && !exploreMode ? (
            <span
              className="hint-float font-sans text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              or press
              <kbd
                className="space-key mx-2 inline-flex items-center rounded px-2 py-[3px] text-[10px]"
                style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}
              >
                space
              </kbd>
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-label="Exit explore mode"
        onClick={toggle}
        className="absolute left-1/2 inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full text-white transition-colors duration-200 hover:bg-white/20"
        style={{
          bottom: 44,
          zIndex: 30,
          transform: exploreMode ? 'translate(-50%, 0)' : 'translate(-50%, 12px)',
          opacity: exploreMode ? 1 : 0,
          pointerEvents: exploreMode ? 'auto' : 'none',
          border: '1px solid rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '11px 24px',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          transition: 'opacity 400ms, transform 400ms, background-color 200ms',
        }}
      >
        <i className="ri-close-line" aria-hidden="true" style={{ fontSize: 15, opacity: 0.85 }} />
        Exit
      </button>
    </section>
  );
}
