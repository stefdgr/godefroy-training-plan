# Notes for Claude

- `index.html` is generated. Make changes in `src/` and rebuild with `python3 src/render.py` before committing.
- Day entries in `src/plan_data.py` use `d(kind, title, detail, km, bike=minutes, key=...)`. Weekly run km and bike hours are summed from them, so keep the numbers accurate.
- Strength days are assigned in `src/render.py` (`STR_DAY`, `STR_EX`), not in the data: A on Monday, B on Wednesday, optional C on Friday.
- The page is always light themed; the dark-mode blocks in `style.css` deliberately repeat the light palette.
- Stef prefers direct, concise wording on the page. No HRV anecdotes or explanatory clutter in the plan itself.
