# Cambodia Travel Planner

This is a Vite + React + Express + SQLite Cambodia Travel Planner with an interactive map, itinerary builder, and private saved trips.

Core features:
- Map / List toggle
- OpenStreetMap (Leaflet via react-leaflet)
- Accessible marker buttons (DivIcon) with aria-labels
- Slide-over details panel with focus trap and Escape to close
- Sticky Itinerary bar (aria-live="polite") showing totals
- Generate Plan modal that turns selected items into day-by-day checklist
- Account creation and sign-in with HTTP-only cookie sessions
- Multiple private saved trips per account
- Reload saved trips into the planner with their stops, days, and budget tier

Getting started:
1. Install dependencies: `npm install`
2. Start the API and frontend together: `npm run dev:full`
3. Open `http://127.0.0.1:5173`

The API runs on `http://127.0.0.1:8787`. SQLite data is created in `data/cambodia-explorer.sqlite` and is ignored by git.

Useful commands:
- `npm run server` starts only the API.
- `npm run dev` starts only Vite.
- `npm run build` creates the production frontend bundle.

Account notes:
- Passwords are hashed with bcrypt and are never returned by the API.
- Sessions use random opaque tokens stored as hashes in SQLite and delivered through an HTTP-only cookie.
- Trips store place IDs, trip length, and budget tier; place details remain in the app catalog.
- For production, set `NODE_ENV=production`, serve over HTTPS, use a managed database, and add rate limiting, email verification, password reset, and backups.

Notes:
- Leaflet CSS is bundled through the React map component.
- The local API currently assumes same-origin development through the Vite proxy.

Accessibility highlights:
- Marker pins are semantic buttons inside Leaflet DivIcon HTML and have clear aria-labels.
- Slide-over traps keyboard focus and restores focus on close.
- Itinerary bar updates are announced via aria-live="polite".

Enjoy — this app is a starting point; feel free to iterate on UX, visuals, and offline data.
