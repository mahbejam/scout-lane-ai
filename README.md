# Scout Lane AI

Scout Lane AI is being developed from a visual concept into a route comparison product. The current development version uses Mapbox Geocoding and Directions to compare actual driving routes and draw their geometry on a real map. It is a **route planning preview**, not turn-by-turn navigation.

The published GitHub Pages version may still be the earlier static concept until these changes are configured and deployed.

## Run locally

1. Create a Mapbox account and get a **public** access token beginning with `pk.`.
2. On Windows with Node installed, run `npx.cmd --yes http-server . -p 4173` in this folder and open `http://localhost:4173`.
3. Expand **Mapbox setup** and paste the token. The public token is saved in this browser on this device until cleared.
4. Choose car, walking or cycling, enter two places and select **Explore routes**. Confirm the exact origin and destination from the full-address lists, checking city and country. The destination search is biased toward the chosen origin.

There is no build step. For public deployment, put a public token restricted to the site URL in `config.js`. Browser tokens are visible to visitors: **never put a secret `sk.` token in a frontend file**. Set usage alerts and limits in the Mapbox dashboard. A backend proxy or provider controls may be needed as usage grows.

## What this version does

- Geocodes the entered origin and destination only when the search button is pressed.
- **Use my location** requests browser location permission, sets the origin, shows the current-position marker on the map, and keeps a confirmed destination so routes can refresh. If the high-accuracy request times out or cannot locate a desktop computer, the app retries with approximate location. A message beside the button shows waiting, accuracy, or a specific permission, timeout, or unavailable error. Windows location services and browser site permission must both permit location. Location on a desktop computer may be approximate and requires localhost or HTTPS.
- Never routes to an unconfirmed first geocoding result. Shows up to five full address candidates and requires explicit selection, avoiding ambiguous matches such as a street in another country.
- Requests traffic-aware driving routes, walking routes or cycling routes according to the selected travel mode.
- For driving, also requests routes with motorway and toll exclusions when selected.
- Deduplicates identical geometries and compares actual estimated time and distance in selectable route cards immediately below search.
- Shows estimated duration as hours, minutes and seconds, and puts **Start now** and **Save for later** directly below the selected route.
- Displays all returned routes on the Mapbox map, highlighting the selected one.
- Offers English, German, Italian, French, Dutch and Persian interface translations, right-to-left Persian layout and localized map labels where Mapbox data supports them. When the UI language changes, the app tries to refresh the selected route's instructions in that language without switching to a different route geometry. If a matching route is unavailable, it asks for a new route search. Mapbox does not currently list Persian Directions text instructions, so route steps use English in the Persian UI, and live Persian turn-by-turn speech is explicitly unavailable.
- Uses a redesigned responsive mobile web layout with the map above the search and comparison controls. Local assets use versioned URLs to avoid stale mixed files in browser caches.
- Saves up to five selected route snapshots on the same device and loads them later. Their traffic estimates are snapshots and should be refreshed before travel.
- Offers a **Start now** web preview that asks for location permission, shows a moving car/bike/walker marker and an upcoming-instruction panel that advances along the route as GPS updates arrive. Maneuver announcements continue through the route when the browser can play speech. **Test voice** plays one sample in the selected interface language; its completion message describes only that sample, not the trip. The app selects a matching browser-exposed voice, holds the utterance active, and reports missing voices or playback errors. Route instructions retain their search language until the route is searched again. This preview requires localhost or HTTPS and still lacks road matching, guaranteed audible speech, background guidance, and automatic rerouting. Duration seconds are rounded from a provider estimate and are not a live countdown.
- Lists the voices exposed by the current browser for the selected language. Prefers `fa-IR` over other Persian locales when available and lets the user choose a different voice; browser availability and pronunciation still vary. It does not fall back to the system's default (potentially German) voice while voices are loading or when a matching voice is absent. The test button speaks one fixed sample; live route guidance uses the selected route's instructions as GPS progress reaches each maneuver. For consistent voices across devices, a licensed speech service or native mobile voice implementation is needed.
- Handles missing locations and partial provider failures without substituting invented route data.

Exclusions are provider best effort: some routes may still include an excluded road if no other route is possible. Mapbox returns up to two alternatives per Directions request, and only when they are sufficiently different and near the fastest route in time. Repeating the request with road exclusions may yield more unique options but cannot enumerate every possible path or promise a fixed number. The app does not compute toll prices, surface quality, scenic beauty, road roughness, reliable quietness, or guaranteed absence of highways. Those are future categories requiring additional data. This is still a web prototype: real turn-by-turn navigation and CarPlay/Android Auto integration require native mobile development and testing.

## Next milestones

1. Test the browser flow with a valid Mapbox token and routes in Austria, then deploy a restricted public token.
2. Validate location permission, accuracy, address selection, and the mobile layout on physical phones.
3. Build a road attribute scoring pipeline using permitted data for scenery, road class and surface; show provenance and confidence for every attribute. Add a licensed toll price source if monetary cost is displayed.
4. Build Android and iOS clients with a mobile navigation SDK for real turn-by-turn guidance, rerouting, spoken directions and background location. Then add Android Auto and CarPlay with their platform-specific requirements.
5. Complete privacy policy, location permission rationale, provider attribution, safety testing, store assets, developer accounts, beta testing and store review.

## Files

- `index.html`: app structure
- `style.css`: visual layout
- `app.js`: geocoding, directions and map interaction
- `i18n.js`: six interface languages
- `config.js`: public deployment token

Author: Mahbube Bejam · Sour Lemon.
