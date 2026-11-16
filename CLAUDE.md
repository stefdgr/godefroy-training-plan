# Notes for Claude

- Read `docs/CONTEXT.md` first: athlete profile, goals, decisions made so far and open items.
- Every change: push `main` to GitHub (Cloudflare deploys it to godefroy-training-plan.stefdegrauwe.workers.dev). If the claude.ai artifact tools are available, also republish the same `index.html` to the artifact "Road to Godefroy 75" (slug `560d37cf-469f-43a4-8250-df1c0994456a`), where Stef reviews edits and leaves comments.
- When a decision changes or an open item is settled, update `docs/CONTEXT.md` too.
- `index.html` is generated. Make changes in `src/` and rebuild with `python3 src/render.py` before committing.
- Day entries in `src/plan_data.py` use `d(kind, title, detail, km, bike=minutes, key=...)`. Weekly run km and bike hours are summed from them, so keep the numbers accurate.
- Strength days are assigned in `src/render.py` (`STR_DAY`, `STR_EX`), not in the data: A on Monday, B on Wednesday, optional C on Friday.
- The page is always light themed; the dark-mode blocks in `style.css` deliberately repeat the light palette.
- Stef prefers direct, concise wording on the page. No HRV anecdotes or explanatory clutter in the plan itself.
- Print layouts: `src/print_docs.py` (sections with class `pdoc`), `src/print.js` (buttons with `data-print`, session trackers built from `.sc` cards), `src/print.css`. A new tab gets printing with one `pdoc` section and one button.
