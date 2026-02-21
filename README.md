# steiner_weasels

Static HTML5/JS/CSS recreation of "Shakespeare, Evolution, and Weasels" with interactive demos:
- Scenario 1: Dawkins-style string weasels
- Scenario #1-#4: Steiner Weasels approximations (food sources, stops, paths, adaptation)

## Run locally

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages (project pages)

1. Push this repo to GitHub as `bcorfman/steiner_weasels`.
2. In GitHub: Settings -> Pages.
3. Source: `Deploy from a branch`.
4. Branch: `main` and folder: `/site`.
5. Site URL becomes: `https://bcorfman.github.io/steiner_weasels/`.

## Notes on default scenario parameters

Defaults are inferred from the article + archived HTML markup:
- Food sources default to `15` (article references 15 repeatedly).
- Scenario #1 starts with `3` genes/stops (explicitly stated in article's scenario #1 narrative).
- Child population per generation defaults to `1500` ("a few thousand" in article; chosen to keep browser responsive).
- Earthquake shifts a random subset of food source locations.

These defaults are in `site/js/app.js` under `STEINER_PRESETS` and are intended to be tuned empirically.
