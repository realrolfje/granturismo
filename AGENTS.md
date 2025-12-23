# Repository Guidelines

## Project Structure & Module Organization

This repo is a static Gran Turismo 7 scoreboard site. Key paths:

- `index.html`, `rules.html`, `races.html`, `teams.html`, `results.html`, `editor.html`: page entry points.
- `main.js`, `theme.js`, `counts.js`, `upcoming.js`, `editor.js`: client-side logic for data loading and rendering.
- `styles.css`: global styling and CSS variables.
- `data/*.json`: source-of-truth data files (`races.json`, `results.json`, `teams.json`, `points.json`, `tracks.json`).
- `favicon.ico`: site icon.

## Build, Test, and Development Commands

This project does not have a build step. Use a local web server so `fetch` works:

- `./startLocalServer.sh`: starts `python3 -m http.server 8000` and opens the browser.
- `python3 -m http.server 4173`: alternative local server/port if you prefer.

Open `http://localhost:8000` (or your chosen port) and refresh after data edits.

## Coding Style & Naming Conventions

- JavaScript: 2-space indentation, semicolons, and `camelCase` for variables/functions.
- HTML/CSS: keep IDs/classes descriptive and consistent with existing markup.
- Data files: keep JSON keys in `camelCase` and IDs in `kebab-case` (e.g., `"race-1"`).
- No automated formatting or linting tools are configured; keep changes stylistically consistent with nearby code.

## Testing Guidelines

There are no automated tests. Validate changes manually:

- Run the local server and load each page you touched.
- For data edits, confirm tables update and totals recalculate as expected.

## Commit & Pull Request Guidelines

Commit history favors short, imperative messages (e.g., "Fix background", "Add descriptions to race fields"). Keep commits focused and scoped to a single change.

For pull requests:

- Provide a clear description of the user-visible impact.
- Link relevant issues or notes if available.
- Include screenshots for UI changes (before/after if layout changes).

## Data Editing Tips

- `data/results.json` uses array order as finishing position (1st entry = 1st place).
- Driver IDs must match across `data/teams.json` and `data/results.json`.
- Store result screenshots in `proofs/` and reference them via `proof.url` in `data/results.json`.
