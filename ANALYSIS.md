# Reference Analysis — Veloria Travel Studio

> The reference site's own wordmark reads "Lumière"; the build was renamed to
> Veloria. Only the name changed — every token and measurement below is as
> extracted from the reference.

Source: `https://readdy.cc/preview/924e7f27-fab8-45f3-8963-af61529923a7/10306947`
Reference stack: Vite + React + Tailwind + Remixicon + Luma Labs splat embed.
Extracted via live DOM + computed-style + CSSOM + JS-bundle inspection.

---

## 1. Design tokens (exact, from computed styles)

| Token | Value | Use |
|---|---|---|
| `ink` | `#1A1A1A` | primary text on light |
| `cream` | `#F7F3EC` | light section background |
| `sand` | `#E8E2D6` | image placeholder / skeleton |
| `bone` | `#F2EAD9` | nav text on dark |
| `gold` | `#C4A47A` | accent, rules, CTA fill |
| `gold-light` | `#E8C997` | highlighted words, stat numerals |
| `gold-soft` | `#E8C9A0` | quote highlight, button hover |
| `gold-deep` | `#8B6F47` | chapter eyebrow |
| `night` | `#0D0A07` | philosophy section |
| `coffee` | `#1A1612` | newsletter section |
| `espresso` | `#2A2520` | footer |
| `black` | `#000000` | hero |

Typography — **Cormorant Garamond** (italic 300/400/500, Playfair Display fallback) for all
display/serif; **Inter** (400/500/600) for all UI/label/body. Icons: **Remixicon 4.5**.

Letter-spacing system: eyebrows `0.32em`, labels `0.24em`/`0.22em`/`0.18em`,
nav `0.08em`, meta `0.16em`, display `-0.01em`/`-0.005em`.

Container: `max-w-[1400px]`, padding `px-6 md:px-10`. Header height `72px`. Radius: `rounded-lg`
on media, `999px` on every pill/button.

## 2. Section inventory

1. **Header** — fixed, z-50, `transition-all duration-500`. Transparent over hero;
   at `scrollY > 60` → `rgba(247,243,236,0.92)` + `blur(14px)` + `1px solid rgba(0,0,0,0.06)`.
   Dark variant (`/experiences`): `rgba(19,17,14,0.88)` + `1px solid rgba(242,234,217,0.1)`.
   Logo `Veloria` 26px italic + `EST·2025` 10px/0.3em. Nav: Home, Destinations, Journal,
   Experiences, Contact. `Reserve` pill. Mobile: hamburger → full-width drawer.
2. **Hero** — `h-screen bg-black`, Luma Labs 3D gaussian-splat iframe (z-1), interaction
   shield (z-2), radial flash (z-12), 220px bottom gradient-to-black (z-5), 80px solid black
   base (z-8). Status pill at `top:96px` toggles *Browse Mode* ⇄ *Explore Mode · Active*.
   Copy stack z-10, staggered `hero-fade` — reference **5.0 / 5.3 / 5.6 / 5.9s**
   (waiting on splat load); shortened to **1.5 / 1.8 / 2.1 / 2.4s** here.
   `Space` toggles explore mode; `Exit` pill bottom-44px.
3. **Philosophy** — `#0D0A07`, pt-160 pb-200. Ken-Burns background (28s loop),
   3-stop dark gradient, 900×600 radial gold glow at 20%/50%. Eyebrow with 32px rules.
   `clamp(2rem,4.5vw,3.75rem)` italic quote, **every word individually hoverable**
   (gold glow + translateY(-2px) + gradient underline sweep). "moments" pulses (3.6s).
   Signature block w/ 60px gradient hairline. Stats: **14**, **63**, **1:1** (count-up,
   staggered 0/140/280ms).
4. **Destinations** `#destinations` — `#F7F3EC`, pt-140 pb-160. Split header
   (h2 + right-aligned 14px paragraph). 2-col grid, gap-12; cards 2 & 4 offset `md:mt-24`.
   Card image heights **640 / 500 / 500 / 640**. Season pill top-left, italic numeral
   top-right, `group-hover:scale-105` over `duration-[1400ms]`. Full-Atlas outline pill
   inverts to `#1A1A1A` on hover.
5. **Experiences** `#experiences` — 720px full-bleed image, 3-stop horizontal scrim,
   centered curator quote with gold "stillness", 2 CTAs.
6. **Journal** `#journal` — `#F7F3EC`, pt-160 pb-180. Shimmering pull-quote (7s linear
   gradient sweep through gold). 12-col grid: **col-1** progress thread rail (gradient track,
   glowing fill, 3 nodes), **col-9** chapters, **col-2** sticky chapter nav (`top:120px`).
   3 chapter blocks alternate sides; giant numerals I/II/III at `clamp(220px,28vw,360px)`,
   fading to `opacity:.07`. `chapterReveal` = blur(4px)+36px rise; inner children stagger
   0.15 → 0.86s.
7. **Newsletter** `#newsletter` — `#1A1612`, bg image at `opacity-30` + 3-stop scrim,
   pill email input + gold Subscribe.
8. **Footer** `#contact` — `#2A2520`, 5/7 split, 4 social circles, Explore/Studio/Contact
   columns (18px italic links), bottom bar.

## 3. Motion system (verbatim keyframes)

`heroFadeUp` · `kenBurns` (28s) · `momentsGlow` (3.6s) · `statRise` · `chapterReveal`
(opacity+blur+Y) · `numeralFade` (opacity→.07, letter-spacing .15em→0) · `quoteShimmer`
(7s linear) · `dotPulse` · `spaceGlow` · `keyPress` · `hintFloat` · `hintRise` · `modeFlash`.

Signature easing: **`cubic-bezier(0.22, 1, 0.36, 1)`** everywhere.
Durations: reveal 0.9–1.1s, numeral 1.6s, image hover 1400ms (cards) / 1800ms (journal).

## 4. Agentic AI system design

**Loop:** `Plan → Act → Observe → Refine`, capped at 6 steps.

- **Planner** (`lib/agent/planner.ts`) — intent classification over a scored keyword/synonym
  matrix → ordered `PlanStep[]`. Falls back to the LLM route when `ANTHROPIC_API_KEY` is set.
- **Executor** (`lib/agent/core.ts`) — runs each step against the tool registry, streams
  status transitions, honours abort signals.
- **Observer** — validates each tool result; on failure re-plans once with the error as context.
- **Memory** (`lib/agent/memory.ts`) — session-scoped: turn history, last section visited,
  entities mentioned, tool-result cache. Persists to `sessionStorage`.

**Tools** (`lib/agent/tools.ts`) — `scrollToSection`, `highlightElement`, `navigate`,
`openPanel`/`closePanel`, `setTheme`, `triggerAnimation`, `readSection`, `subscribeNewsletter`,
`listDestinations`, `describeDestination`, `enterExploreMode`.

**Safety** — allow-list of section ids and routes; no `eval`; no arbitrary selector injection
(selectors resolved through a registry); destructive/outbound actions (newsletter submit)
require explicit user confirmation in-chat.
