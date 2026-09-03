# Scout Lane AI

> *Routes that feel like you.*

**Scout Lane AI** is an interactive route recommendation demo built under the [SOUR LEMON](https://github.com/sourlemon) brand. Instead of only finding the fastest path, it matches a route to your mood: scenic, relaxing, adventurous, local, or fast.

This is a **static portfolio demo**. All recommendations, scores, route insights, controls, and map visuals run locally in the browser with illustrative data.

## Live Demo

[Open Scout Lane AI on GitHub Pages](https://mahbejam.github.io/scout-lane-ai/)

---

## ✨ What it does (so far)

- **5 Travel Moods** — Fastest, Scenic, Relaxing, Local, Adventure
- **3 Route suggestions** per mood with individual scoring
- **Score breakdown** — Scenic, Traffic, Relaxation, Adventure ratings per route
- **AI Insight card** — a natural-language explanation for each route
- **Interactive map** — a self-contained illustrative route visualisation with no external map service
- **Responsive** — works on mobile, tablet, and desktop
- **Zero install** — single HTML file, opens directly in any browser

---

## Getting started

No build tools, backend, API keys, or npm install are required.

Open `index.html` directly, or serve the folder locally:

```
python -m http.server 4173
```

Then visit `http://localhost:4173`.

---

## 🗂️ Project structure

```
index.html   - the complete self-contained app
README.md    - project documentation
```

---

## Roadmap & planned improvements

This is version 0.1 — a working demo, not a finished product. Here's what's on the horizon:

- [ ] Real routing via OpenRouteService or OSRM API
- [ ] Actual AI integration (LLM-generated route explanations)
- [ ] User location detection (GPS)
- [ ] Save favourite routes
- [ ] More mood modes and granular filters
- [ ] Offline support (PWA)
- [ ] Multi-language support
- [ ] Backend & user accounts (Supabase)
- [ ] Performance optimisation for low-end devices

---

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Inline SVG for the illustrative map and brand mark
- SOUR LEMON design system - `#F5E020` accent and dark premium aesthetic

---

## Disclaimer

Scout Lane AI uses **mock data only**. Routes are illustrative and do not reflect real road conditions, distances, or travel times. This is a frontend demo built for portfolio and interaction purposes.

---

## Author

Made by **Mahbube Bejam**  
Part of the **SOUR LEMON** product suite  
GitHub: [@mahbejam](https://github.com/mahbejam)

---

## License

MIT — free to use, modify, and build on.

---

*Scout Lane AI is part of SOUR LEMON - a suite of AI-powered tools built with care, one prototype at a time.*
