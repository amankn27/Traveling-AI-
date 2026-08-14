'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  z: number;
  radius: number;
  hue: number;
}

const PARTICLE_DENSITY = 1 / 9000; // particles per CSS pixel of viewport area
const MAX_PARTICLES = 220;

/**
 * A drifting field of warm light points behind the hero.
 *
 * The reference's gaussian-splat embed is a third-party iframe; this sits under
 * it so the hero still reads as "particles of light" while the embed loads, and
 * degrades gracefully if it never does. Pauses when the tab is hidden.
 */
export function ParticleField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (prefersReducedMotion()) {
      // Paint one static frame rather than animating.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = 'rgba(196, 164, 122, 0.35)';
      for (let i = 0; i < 90; i += 1) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.clientWidth,
          Math.random() * canvas.clientHeight,
          Math.random() * 1.4 + 0.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      return;
    }

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_PARTICLES, Math.round(width * height * PARTICLE_DENSITY));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.85 + 0.15,
        radius: Math.random() * 1.6 + 0.35,
        hue: Math.random() * 26 + 30, // warm gold band
      }));
    };

    const render = (time: number) => {
      if (!running) return;
      frame = window.requestAnimationFrame(render);

      ctx.clearRect(0, 0, width, height);

      const drift = activeRef.current ? 1 : 0.35;
      const t = time * 0.00006;

      for (const p of particles) {
        // Slow parallax drift — deeper particles move less.
        const x = p.x + Math.sin(t * 60 + p.y * 0.01) * 18 * p.z * drift;
        const y = (p.y - time * 0.006 * p.z * drift) % height;
        const wrapped = y < 0 ? y + height : y;
        const twinkle = 0.55 + Math.sin(time * 0.0016 + p.x) * 0.45;

        const glow = ctx.createRadialGradient(x, wrapped, 0, x, wrapped, p.radius * 7);
        glow.addColorStop(0, `hsla(${p.hue}, 62%, 78%, ${0.5 * twinkle * p.z})`);
        glow.addColorStop(1, 'hsla(38, 62%, 70%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, wrapped, p.radius * 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 78%, 92%, ${0.75 * twinkle * p.z})`;
        ctx.beginPath();
        ctx.arc(x, wrapped, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = window.requestAnimationFrame(render);
      }
    };

    resize();
    frame = window.requestAnimationFrame(render);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}
