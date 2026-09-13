# 🇰🇭 Cambodia Explorer

**Your first stop before you land — plan your Cambodia trip in minutes, not tabs.**

Cambodia Explorer is a map-first trip planner built for someone who's never been to Phnom Penh, doesn't know Siem Reap from Sihanoukville yet, and just wants a rough plan that doesn't cost them an afternoon of browser tabs. Tap around the map, add places that look good, watch your budget build itself, and walk away with an itinerary you'd actually use.

Under the hood it's a Vite + React frontend with an Express + SQLite backend — interactive map, itinerary builder, and private saved trips, all wired together.

## What's in the box

- **Map / List toggle** — browse pins on OpenStreetMap (via Leaflet + react-leaflet), or switch to a plain list if that's easier on your phone
- **Accessible pins** — real buttons with aria-labels, not just decorative markers
- **Slide-over detail panel** — tap a pin, get the info you need, with proper focus trapping and Escape-to-close
- **Sticky itinerary bar** — your running total, always visible, announced live for screen readers (`aria-live="polite"`)
- **Generate Plan** — turn your picks into a day-by-day checklist with one tap
- **Accounts & saved trips** — sign up, sign in, and keep multiple private trips tied to your account
- **Pick up where you left off** — reload a saved trip with its stops, day count, and budget tier intact

## Getting up and running

1. Install dependencies:
   ```bash
   npm install
   ```
2. Fire up the API and frontend together:
   ```bash
   npm run dev:full
   ```
3. Open it up: `http://127.0.0.1:5173`

The API runs quietly in the background on `http://127.0.0.1:8787`. Your trip data lives in a local SQLite file at `data/cambodia-explorer.sqlite` — it's git-ignored, so it's yours and yours alone.

### Other handy commands

| Command | What it does |
|---|---|
| `npm run server` | Starts just the API |
| `npm run dev` | Starts just the Vite frontend |
| `npm run build` | Builds the production frontend bundle |

## A note on accounts & security

- Passwords are hashed with bcrypt and never come back through the API — not even to you.
- Sessions use random opaque tokens, stored as hashes, delivered via an HTTP-only cookie.
- Saved trips store place IDs, trip length, and budget tier — the actual place details live in the app's own catalog, not duplicated per trip.
- **Before this goes anywhere near production:** set `NODE_ENV=production`, serve over HTTPS, swap in a managed database, and add rate limiting, email verification, password reset, and backups. Right now it's built for local dev, not the open internet.

## Accessibility, baked in not bolted on

- Map pins are semantic buttons inside Leaflet's DivIcon HTML, each with a clear aria-label
- The slide-over panel traps keyboard focus and hands it back when closed
- Itinerary updates are announced via `aria-live="polite"` so screen reader users hear the total change, not just see it

## A couple of housekeeping notes

- Leaflet's CSS ships bundled through the React map component — nothing extra to wire up
- The local API currently assumes same-origin dev through the Vite proxy — worth revisiting before deploying anywhere real

---

This is very much a starting point, not a finished guidebook — there's plenty of room to push further on visuals, offline support, and real content. Go build on it. 🛺
