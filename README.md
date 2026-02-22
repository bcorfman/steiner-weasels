# steiner_weasels

Static HTML5/JS/CSS recreation of Dudley Chapman's "Shakespeare, Evolution, and Weasels" with interactive demos:
- Scenario 1: Dawkins-style string weasels
- Scenario #1-#4: Steiner Weasels approximations (food sources, stops, paths, adaptation)

## Run locally

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages (GitHub Actions)

This repo deploys via `.github/workflows/pages.yml`.

1. Push this repo to GitHub as `bcorfman/steiner_weasels`.
2. In GitHub: Settings -> Pages.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` (or run the `Pages` workflow manually) to deploy.
5. Site URL becomes: `https://bcorfman.github.io/steiner_weasels/`.

## Notes on default scenario parameters

Defaults are inferred from the article + archived HTML markup:
- Food sources default to `15` (article references 15 repeatedly).
- Scenario #1 starts with `5` genes/stops (matching the article's scenario #1 description).
- Child population per generation defaults to `1500` ("a few thousand" in article; chosen to keep browser responsive).
- Earthquake shifts a random subset of food source locations.

These defaults are in `site/js/app.js` under `STEINER_PRESETS` and are intended to be tuned empirically.
