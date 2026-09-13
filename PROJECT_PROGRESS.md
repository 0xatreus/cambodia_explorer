# Cambodia Explorer Progress

Updated: 2026-09-09

## Product Direction

Cambodia Explorer is a Cambodia trip planner with a map-first discovery experience, saved itineraries, transport planning, preparation checklists, and account-backed trip persistence.

The main product loop is:

1. Explore places on the clustered Cambodia map.
2. Filter by city and category.
3. Open a place, inspect tags and details, and add it to the trip.
4. Open the generated itinerary.
5. Reorder cities into a route.
6. Choose transport for each intercity leg.
7. Review local transport, preparation checklists, distances, and day plans.
8. Save the trip to an account and reopen it later.

## Completed

### Map and Discovery

- Replaced the placeholder map with React Leaflet.
- Added clustered markers with `react-leaflet-cluster`.
- Added custom SVG category marker icons for Sights, Food, Nature, and Activities.
- Added Cambodia map bounds and minimum zoom.
- Added a muted, warm-filtered OpenStreetMap basemap.
- Added a persistent category legend.
- Added city tabs that fly the map to the selected city.
- Expanded the catalog to 115 places across all 25 Cambodian province-level units, plus Koh Rong as an island destination.
- Added 16 province destinations and 48 map-ready pins with coordinates, categories, costs, durations, descriptions, tips, tags, and images.
- Added province coverage based on the Tourism of Cambodia province guide and cross-checked against the current 25-unit administrative list.
- Added place tags such as `historical`, `local-go-to`, `viral`, `hidden`, `nature`, `culture`, and `ethical-wildlife`.
- Added tags to place cards and detail panels.

### Accounts and Saved Trips

- Added Express backend in `server/index.cjs`.
- Added SQLite database setup in `server/db.cjs`.
- Added bcrypt password hashing.
- Added HTTP-only cookie sessions.
- Added registration, login, logout, and current-user endpoints.
- Added multiple saved trips per user.
- Saved trips contain name, place IDs, trip days, and budget tier.
- Added account drawer in `src/components/AccountPanel.jsx`.
- Added API client in `src/lib/api.js`.
- Added Vite `/api` development proxy.
- Added `npm run server` and `npm run dev:full` scripts.
- Local SQLite files are ignored through `.gitignore`.

### Preparation and Transport

- Added general Cambodia preparation checklist.
- Added location-specific preparation checklists for all supported regions.
- Added interactive checklist items inside the generated itinerary.
- Added intercity transport data with multiple options per route.
- Added local transport options for every supported region.
- Added approximate time, cost, and practical notes for transport choices.
- Added editable city ordering in the generated itinerary.
- Added selectable transport per intercity route leg.
- Added live approximate transport total.
- Added geographic route preview map with city labels and an approximate route line.
- Added scroll and Leaflet size fixes for route reordering.

## Main Files

- `src/App.jsx`: main application state and composition.
- `src/data/places.js`: cities, place catalog, categories, and starter routes.
- `src/data/provincePlaces.js`: additional province destinations and place pins.
- `src/data/checklists.js`: general and location-specific preparation items.
- `src/data/transport.js`: intercity and local transportation options.
- `src/components/MapView.jsx`: Leaflet map and marker clustering.
- `src/components/GeneratePlanModal.jsx`: route planner, transport selector, preparation checklist, and day plan.
- `src/components/AccountPanel.jsx`: account and saved-trip UI.
- `src/components/ItineraryBar.jsx`: current trip drawer and budget controls.
- `src/components/SlideOver.jsx`: place detail drawer.
- `src/lib/api.js`: frontend API wrapper.
- `server/index.cjs`: Express API and authentication/trip routes.
- `server/db.cjs`: SQLite schema and database initialization.
- `README.md`: setup and architecture notes.

## Run Locally

```bash
npm install
npm run dev:full
```

Open `http://127.0.0.1:5173`.

The API runs at `http://127.0.0.1:8787`.

Useful checks:

```bash
npm run build
npm run server
```

## Validation Already Completed

- Production frontend build passes.
- Backend starts successfully on Windows.
- Account registration works.
- Cookie session authentication works.
- Multi-place trip creation and retrieval work.
- Browser account creation flow works.
- Expanded map clustering works with the larger catalog.
- City filtering and map fly-to work.
- General and location-specific checklist groups render.
- Intercity and local transport sections render.
- Transport selections update the approximate budget.
- Route city reordering updates the day plan.
- Route preview map renders loaded Leaflet tiles.
- Modal internal scroll remains stable when reordering a visible route arrow.

## Current Limitations

- Selected transport modes are currently session-level and are not persisted in saved trips.
- Checklist completion state is currently session-level and is not persisted in saved trips.
- Transport prices and times are curated approximations, not live operator data.
- The route preview line connects city coordinates; it is not turn-by-turn road routing.
- Google Maps links, search, shareable trip URLs, distance-aware day plans, export, and print are not yet implemented.
- OSM tiles are used instead of a fully custom vector basemap.
- Account production hardening is still needed: rate limiting, email verification, password reset, HTTPS deployment, backups, and managed database migration.
- The local SQLite database is intentionally ignored by git.

## Recommended Next Work

1. Persist selected transport choices and checklist completion state in saved trips.
2. Add search across place name, city, description, and tags.
3. Add Google Maps and directions links to place cards and detail views.
4. Add shareable trip URLs with place IDs, days, tier, route order, and transport choices.
5. Add haversine distances between consecutive day-plan stops.
6. Add download-as-text and print itinerary actions.
7. Add account password reset, rate limiting, and production session configuration.
8. Replace curated transport estimates with a data refresh strategy or routing provider when the product needs live accuracy.

## Important Product Decisions

- Keep route planning inside the generated itinerary because that is where users already commit to a trip.
- Keep local transportation as reference options, while intercity transportation is selectable and budgeted.
- Keep Google Maps as outbound links unless a real Places or routing integration is needed.
- If adding Google APIs later, keep keys server-side behind a backend proxy.
- Leaflet remains the lower-risk MVP choice. MapLibre becomes worthwhile when fully custom vector styling or richer geospatial layers become a roadmap priority.
