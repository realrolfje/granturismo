# Gran Turismo 7 Scoreboard

A lightweight static site for tracking Gran Turismo 7 online race results. Races and results stay in JSON so you can edit finishes with any text editor and refresh the page to see the updated tables.

Originally located at https://realrolfje.github.io/granturismo/
But now also at https://static.rolfje.com/granturismo

## Project layout

```
.
├── index.html        # Scoreboard shell + templates for cards/tables
├── rules.html        # Scoring explanation page
├── races.html        # Upcoming-races schedule page
├── teams.html        # Teams & drivers view
├── results.html      # Completed race results
├── editor.html       # Race JSON builder
├── styles.css        # Styling (CSS variables + responsive layout)
├── main.js           # Fetches JSON data and renders the scoreboard
├── theme.js          # Shared light/dark toggle logic
├── counts.js         # Updates header counts on static pages (rules, upcoming, editor)
├── upcoming.js       # Builds the upcoming-race list
├── editor.js         # Handles the race editor form + JSON preview
└── data/
    ├── points.json   # Points awarded per finishing position
    ├── tracks.json   # Canonical GT7 track names used by the editor
    ├── rounds.json   # List of round directories and the active round
    └── rounds/
        └── round-1/
            ├── round.json   # Round metadata + ordered race directory list
            ├── races/
            │   └── 2026-01-21-supra-cup-race-1/
            │       ├── race.json    # Race settings/metadata
            │       ├── results.json # Finishers in finishing order
            │       └── proof.jpg    # Optional proof screenshot
            └── teams.json   # Teams + drivers for this round
```

## Editing the data

- `data/rounds.json` lists the round directories (id + directory name) and the currently active round (use the `active` flag or let the UI default to the round with the next upcoming event).
- Each directory under `data/rounds/` (e.g., `data/rounds/round-1`) keeps a `round.json` manifest plus a `races/<race-id>/` folder per race.

```json
{
  "round": {
    "id": "round-1",
    "title": "Round 1: Test Season",
    "description": "Warm-up round containing two test races.",
    "startDate": "2025-12-04"
  },
  "races": ["2025-12-04-test-race"]
}
```

- Each race folder contains a `race.json` with the metadata/settings for that race.
```json
{
  "id": "2025-12-04-test-race",
  "title": "Manufacturers Cup Round 1",
  "track": "Circuit de Spa-Francorchamps",
  "variant": "Full Course",
  "date": "2024-04-05",
  "laps": 12
}
```
- Each race folder also contains a `results.json` array in finishing order (no `raceId` or `position` fields needed).
```json
[
  { "driverId": "lex", "car": "GR Supra Racing Concept '18" },
  { "driverId": "rolf", "car": "GR Supra Racing Concept '18" }
]
```
- If a proof screenshot exists, store it as `proof.jpg` in the same race folder. The site auto-detects this file; you do not need to reference it in JSON.
- To avoid leaking EXIF (especially location data) and to keep screenshots lightweight, run `python3 scripts/proof-cleanup.py data/rounds/<round-id>/races/*/proof.jpg` before committing; install Pillow via `pip install Pillow` if it’s not already available.
- `data/rounds/<round-id>/teams.json` contains two sections:
  - `teams`: team metadata and the driver IDs on that roster.
  - `drivers`: driver profiles (id + display name). Drivers not assigned to a team remain visible as “Independent Drivers”.
- `data/points.json` defines how many points each position receives plus the guaranteed points for classified finishers:

```json
{
  "pointsPerPosition": [12, 10, 8, 6, 4, 2, 1],
  "participationPoints": 1
}
```

Reference driver IDs consistently between all JSON files so the UI can stitch everything together. The standings panel recalculates driver and team totals automatically whenever these JSON files change.

## UI tips

- Use the “Light mode” toggle in the hero to switch between dark and light themes. Your selection is remembered per browser until you change it again.
- A pill menu in every hero jumps between the sections: “Standings”, “Teams & Drivers”, “Race Results”, “Upcoming Races”, “Scoring Rules”, and “Race Editor”.

## Race editor

Use `editor.html` when adding a new race:

1. Choose an official track (sourced from `data/tracks.json`) plus the usual metadata.
2. Copy the generated JSON snippet.
3. Add a new race folder under `data/rounds/<round-id>/races/<race-id>/`, save the snippet as `race.json`, and append the race directory name to the active round's `data/rounds/<round-id>/round.json` `\"races\"` array.

The editor warns you if the race ID already exists in the JSON, helping prevent duplicates.

## Scoring reference

The `Scoring Rules` page summarizes the point structure (12-10-8-6-4-2-1 plus a 1pt participation award) and the tie-breaker order:

1. Total wins
2. Best finishing position across the season
3. Alphabetical order of the driver name (to keep standings deterministic)

This mirrors the logic baked into `main.js`, so whatever you read on that page matches the live data. The `Upcoming Races` page lists any events present in the active round manifest without a corresponding race result entry, sorted by date so teams know what’s next.

## Running the site locally

Because the page loads JSON via `fetch`, open it through a local web server instead of `file://`:

```bash
cd /Users/rolf/temp/granturismo-codex
python3 -m http.server 4173
```

Then browse to [http://localhost:4173](http://localhost:4173) and you’ll see the scoreboard. Any edits to the JSON files show up after a browser refresh.

## Next steps

- Add more per-race fields (e.g., fastest lap, penalty notes) to `data/rounds/<round-id>/races/<race-id>/results.json` or `race.json`.
- Add client-side filters (by team, driver, or race) or charts for season standings if needed.
