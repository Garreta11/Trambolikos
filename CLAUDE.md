# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

This is a **football club website** (Trambolikos FC) built with Next.js 16 App Router + React 19. It combines a CMS-driven marketing site with an interactive minigames hub.

### Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, SCSS Modules
- **CMS:** Sanity (project `8x5jy4uo`, dataset `production`) — manages all site content
- **Backend:** Supabase — stores game scores and leaderboards
- **Animations:** GSAP + Lenis (smooth scroll via `@studio-freight/lenis`)
- **Mobile controls:** Nipplejs (virtual joystick for games)
- **3D:** Three.js (available as dev dependency)

### Data Flow

Content pages fetch data from Sanity using GROQ queries defined in `lib/queries/sanity.sections.ts`. The Sanity schema types (hero, matches, players, standings, media, info) are defined in `sanity/schemaTypes/`. The Sanity Studio is mounted at `/studio`.

Game scores are written to and read from Supabase (`lib/supabase.ts`). Users register a username in the minigames hub (`app/minijuegos/page.tsx`), which is stored in localStorage via `context/AppContext.tsx`.

### Global State

`context/AppContext.tsx` provides `{ username, setUsername, isRegistered }` to the entire app. It auto-persists to localStorage. Used by minigames to identify players for the leaderboard.

### Page Sections (Homepage)

`app/page.tsx` renders 6 sections from `components/sections/`: Hero, Partidos (matches), Plantilla (roster), Clasificacion (standings), Media (video gallery), Info.

### Minigames

Each game in `app/minijuegos/` is self-contained:
- **bike-race** — Canvas-based racing game; core logic in `Race.js`
- **dino-game** — Dinosaur dodge game
- **penaltis** — Football penalty kick game

All games share the `components/ui/Leaderboard/` component for top scores.

### Sanity Config

- Studio route: `/studio`
- Singleton types (one document each): Hero, Standings, Media, Info
- Collection types: Matches, Players
- `sanity/lib/live.ts` enables real-time content updates in dev

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Path Alias

`@/*` maps to the project root (e.g., `@/components/...`, `@/lib/...`).
