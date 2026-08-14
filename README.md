# Veloria — Travel Studio

A production recreation of the reference site
(`readdy.cc/preview/924e7f27…`) in Next.js, with an embedded agentic AI concierge
that can actually operate the page.

`ANALYSIS.md` documents the reverse-engineered design system, section inventory,
motion system, and the agent architecture.

## Running it

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm test` | Vitest (planner, synthesis, rate limiter) |

> ⚠️ Don't run `npm run build` while `npm run dev` is running — they share `.next`,
> and the production build overwrites the dev server's client chunks. The page
> then loads but never hydrates (dead clicks, no animations). Fix: stop both,
> delete `.next`, restart `npm run dev`.

## The concierge

Open it with the gold button (bottom-right) or **⌘K / Ctrl-K**. It runs a
`Plan → Act → Observe → Synthesise` loop and shows the plan executing step by step.

**The reply is written after the tools run, from what they actually returned** —
so the agent can answer questions it didn't know the answer to when it planned.

Try:

- *"which journey is shortest?"* — superlatives over real data
- *"show me destinations in India"* — region search
- *"somewhere cold, under 8 nights"* — attribute search (region, climate, length, month, theme)
- *"what's similar to Kyoto?"* / *"compare it with Patagonia"*
- *"tell me about Patagonia"* → *"how many nights is that?"* — pronouns resolve against memory
- *"take me to the journal"*, *"enter the 3D scene"*, *"subscribe me with you@example.com"*

```
lib/agent/
  planner.ts      intent + attributes + reference resolution → PlanStep[]
  core.ts         executor / observer loop, then synthesis
  synthesis.ts    writes the reply from tool results (model or local template)
  tools.ts        the 16 tools the agent may call
  registry.ts     allow-lists: section ids, routes, highlight targets
  memory.ts       session-scoped memory (sessionStorage)
  model-route.ts  latches model availability so a missing key is probed once
```

### It works with no API key

Both phases are local by default: a deterministic planner, and synthesis
templated from the structured tool results. The agent routes return `503`
without a key, the client latches that after one probe, and everything keeps
working — no setup required.

Adding a key upgrades both phases: Claude authors the plan (still re-validated
against the same allow-lists) and writes the reply, streamed token by token.

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

### Safety

- The agent never receives a raw CSS selector — it names a key that
  `lib/agent/registry.ts` resolves. Section ids and routes are allow-listed too.
- Outbound actions need explicit in-chat confirmation. The newsletter tool fills
  the field and stops; **it never submits the form**. A model-authored plan can't
  pre-set `confirmed` — enforced in `sanitiseRemotePlan`, and tested.
- Synthesis is grounded: the model is given only the tool observations and told
  they are the ground truth, so it can't invent journeys, prices or availability.
- Plans are capped at 6 steps with at most one re-plan.
- Both agent routes are rate-limited to 20 requests/minute per IP. The limiter is
  **per-process** — behind more than one instance it needs a shared store.

## Destination imagery

Twelve journeys ship. The original four (Kyoto, Faroe Islands, Marrakech,
Patagonia) use the reference's photographs, in `public/images`.

The eight added later — Goa, Mumbai, Udaipur, Kerala, Santorini, Serengeti,
Sacred Valley, Bali — have **no photography**, so each renders a procedural SVG
plate from `components/ui/DestinationPlate.tsx`: a layered scene drawn in the
site's own palette. They're deliberate stand-ins, not stock imagery.

To swap in a real photo, drop the file in `public/images` and set `image` on that
destination in `lib/site-data.ts`. The card picks the photo automatically:

```ts
{ slug: 'goa', /* … */ image: '/images/goa.jpg', terrain: 'coast' }
```

## Notes on fidelity

Design tokens, spacing, type scale, keyframes, and easing curves are transcribed
from the reference's computed styles (see `ANALYSIS.md`); the ten source images
are downloaded into `public/images` rather than hot-linked. Two deliberate
departures:

- **Hero.** The reference embeds a third-party Luma Labs gaussian splat. That
  embed is kept, but a canvas particle field renders beneath it so the hero still
  reads as "particles of light" while it loads, or if it's blocked. The reference
  also holds its hero copy back ~5s waiting on that scene; here the reveal starts
  at 1.5s (stagger 1.5 / 1.8 / 2.1 / 2.4s) so the headline arrives promptly.
- **Breakpoints.** The reference's desktop nav and journal chapter index overflow
  the viewport between 768–1023px. Both move to `lg` here, so ≥1024px matches the
  reference and narrower widths use the drawer. Verified zero horizontal overflow
  at 375 / 390 / 430 / 768 / 1024 / 1280 / 1440.

Accessibility: semantic landmarks, skip link, focus-visible rings, `aria-live` on
the newsletter status, labelled controls, and a full `prefers-reduced-motion`
path that neutralises every animation.
