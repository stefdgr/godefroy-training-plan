# Road to Godefroy 75

Training plan for Trail Godefroy Bouillon 75 km (5 June 2027), with the Dendermonde Loopt 16k (14 March 2027) on the way. Hosted on Cloudflare Pages.

## Layout

- `index.html`: the built page that Cloudflare serves. Don't edit it by hand.
- `src/plan_data.py`: the 30 weeks, day by day.
- `src/body.html`: page structure, overview panels, zones and the strength tab.
- `src/style.css`, `src/app.js`: styling and behaviour (tabs, current week, chart hover).
- `src/render.py`: builds `index.html` from the files above.

## Updating

1. Edit the files in `src/`.
2. Run `python3 src/render.py`.
3. Commit and push. Cloudflare Pages deploys `main` automatically.

## Cloudflare Pages settings

- Framework preset: None
- Build command: empty
- Build output directory: `/`
