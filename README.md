# Gran Turismo 7 Scoreboard

Static scoreboard site for a Gran Turismo 7 competition. The site has no build step and keeps all competition state in JSON files under `data/`.

Live locations:

- https://realrolfje.github.io/granturismo/
- https://static.rolfje.com/granturismo

## Quick Start

Run the site through a local web server so browser `fetch()` calls can load JSON:

```bash
cd /Users/rolf/github/granturismo
./startLocalServer.sh
```

Alternative:

```bash
cd /Users/rolf/github/granturismo
python3 -m http.server 4173
```

Then open `http://localhost:8000` for the script default, or `http://localhost:4173` for the alternative command.

## What This Repo Contains

This is a plain HTML/CSS/JavaScript app:

- `index.html`: main scoreboard page.
- `rules.html`: scoring rules page.
- `races.html`: race schedule and upcoming races.
- `teams.html`: teams and drivers.
- `results.html`: completed race results.
- `editor.html`: helper UI for generating race JSON.
- `main.js`: standings, points, tables, proof modal and shared helpers.
- `rounds.js`: loads rounds, teams, races and results from `data/rounds/`.
- `upcoming.js`: renders upcoming races.
- `editor.js` and `raceFields.js`: race editor behavior and GT7 lobby/race setting fields.
- `counts.js`: header counts for static pages.
- `theme.js`: light/dark theme toggle.
- `i18n.js` plus `data/i18n/*.json`: Dutch/English UI text.
- `styles.css`: global layout and styling.
- `scripts/proof-cleanup.py`: removes EXIF and recompresses proof screenshots.

Important data files:

- `data/rounds.json`: top-level list of competition rounds.
- `data/points.json`: scoring rules.
- `data/tracks.json`: GT7 tracks used by the editor.
- `data/gt7-cars.json`: GT7 car data.
- `data/rounds/<round-id>/round.json`: metadata and ordered race list for one round.
- `data/rounds/<round-id>/teams.json`: teams and drivers for one round.
- `data/rounds/<round-id>/races/<race-id>/race.json`: race metadata/settings.
- `data/rounds/<round-id>/races/<race-id>/results.json`: finishers in finishing order.
- `data/rounds/<round-id>/races/<race-id>/proof.jpg`: optional result screenshot.

## How Rounds Work

`data/rounds.json` is the entry point:

```json
[
  {
    "id": "round-2",
    "directory": "round-2",
    "active": true,
    "heroImage": "quentin-martinez-5bL-TPC-bXI-unsplash.jpg"
  }
]
```

`rounds.js` loads every listed round, sorts them by `round.startDate` newest first, and selects the default round in this order:

1. A manually selected round saved in browser `localStorage` as `gt7-selected-round`, but only if it was saved while the current active round was already active.
2. The round with `"active": true`.
3. The round with the earliest upcoming race.
4. The first configured round.

The round selector is available on the pages that include it. Changing the selector persists the chosen round in the browser. When a new round becomes active, old saved selections are ignored so returning visitors land on the new active round first.

Each round directory contains a `round.json`:

```json
{
  "round": {
    "id": "round-2",
    "title": "De tweede ronde",
    "description": "Creatief met kurk",
    "startDate": "2026-02-18"
  },
  "races": [
    "2026-02-18-dagelijkse-races-race-c",
    "2026-02-25-voor-woensdag"
  ]
}
```

The `races` array is ordered. Each entry points to a folder under `data/rounds/<round-id>/races/`.

## Data Editing Workflow

To add a race:

1. Open `editor.html` locally.
2. Fill in the GT7 lobby/race settings.
3. Use the generated `id` as the race folder name.
4. Create `data/rounds/<round-id>/races/<race-id>/race.json`.
5. Add `<race-id>` to `data/rounds/<round-id>/round.json`.
6. Add `results.json` when the race is finished.
7. Add `proof.jpg` in the same folder when a proof screenshot is available.

Minimal `race.json`:

```json
{
  "id": "2026-02-25-voor-woensdag",
  "title": "Voor woensdag",
  "track": "Circuit Gilles-Villeneuve",
  "variant": "Full Course",
  "date": "2026-02-25",
  "laps": 16
}
```

Typical `results.json`:

```json
[
  {
    "driverId": "lex",
    "car": "Hyunday N 2025 VGT (Gr.1)"
  },
  {
    "driverId": "michel",
    "car": "LM55 VGT (GR.1)"
  }
]
```

Finish order matters: first array item is first place, second is second place, and so on. `position` is optional; if omitted, the site derives it from the array index. Driver IDs must exist in that round's `teams.json`.

Proof screenshots are auto-detected only when named `proof.jpg` and stored next to the race files. The cleanup script needs Pillow. Install it in a local virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r scripts/requirements.txt
```

Then clean screenshots before committing them:

```bash
python3 scripts/proof-cleanup.py data/rounds/<round-id>/races/*/proof.jpg
```

## Teams And Drivers

Each round owns its own teams and drivers in `data/rounds/<round-id>/teams.json`:

```json
{
  "teams": [
    {
      "id": "team-1",
      "name": "Pit Lane Legends",
      "color": "#ff6b35",
      "drivers": ["luuk", "max"]
    }
  ],
  "drivers": [
    {
      "id": "lex",
      "name": "Lex"
    }
  ]
}
```

Drivers can be listed without belonging to a team. Those show as independent drivers.

## Scoring

Points come from `data/points.json`:

```json
{
  "pointsPerPosition": [12, 10, 8, 6, 4, 2, 1],
  "participationPoints": 1
}
```

Current behavior in `main.js`:

- Positions covered by `pointsPerPosition` receive the configured points.
- Lower positions receive `participationPoints`.
- Drivers with at least two race entries drop their lowest score.
- Driver standings are sorted by points, wins, best finish, earliest best-finish occurrence, then driver name.
- Team standings are calculated from driver totals.

The `rules.html` page should stay aligned with this behavior whenever scoring changes.

## Internationalization

UI text is loaded through `i18n.js` from:

- `data/i18n/nl.json`
- `data/i18n/en.json`

When changing visible labels, update both locale files unless the text is intentionally language-specific.

## Validation Checklist

There is a lightweight data validator, but no browser/UI test suite. After data or UI edits:

1. Run `node scripts/validate-race-data.js`.
2. Start a local server.
3. Open the touched page.
4. Switch rounds if the change affects round data.
5. Confirm standings, teams, results and upcoming races still render.
6. Check the browser console for failed JSON loads or malformed data.

For data-only changes, the most common failures are invalid JSON, a race ID missing from `round.json`, or a `driverId` not present in the selected round's `teams.json`.

## Notes For Future Agents

- Prefer editing JSON source data directly; the site recalculates totals client-side.
- Keep IDs in `kebab-case` and JSON keys in `camelCase`.
- Keep `results.json` as an array in finishing order unless deliberately changing loader behavior.
- Do not reference proof screenshots in JSON; `rounds.js` probes for `proof.jpg`.
- Keep changes small and verify manually in a browser because this repo has no test harness.
