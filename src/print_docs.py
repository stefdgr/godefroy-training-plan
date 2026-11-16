# Print layouts. Each layout is a <section class="pdoc" id="..."> that stays hidden on screen.
# A button with data-print="<id>" prints only that section (see print.js / print.css).
# New pages: add a section with class "pdoc" (and "land" for A4 landscape) plus a button; done.
import datetime as dt, html
e = html.escape

BOX = '<span class="pbox"></span>'

def _bike(m):
    if not m: return ""
    h, mm = divmod(m, 60)
    return f"{h} h {mm:02d}′" if h and mm else (f"{h} h" if h else f"{mm}′")

def _head(title, sub, right=""):
    return (f'<header class="ph"><div><div class="pk">Road to Godefroy 75</div><h1>{title}</h1>'
            f'<div class="psub">{sub}</div></div><div class="pr">{right}</div></header>')

def _foot(extra=""):
    return f'<footer class="pf"><span>{extra}</span><span class="pdate"></span></footer>'

KEY = ('<span>{box} done</span><span><b>★</b> key session, never swapped</span>'
       '<span><b class="sA">A</b><b class="sB">B</b><b class="sC">C</b> strength (C optional)</span>'
       '<span>Easy = run &lt; 143 bpm, ride &lt; 75% FTP</span>').format(box=BOX)

def plan_doc(rows, PHASES, DAYN, fmt):
    pages = []
    for ph in PHASES:
        prow = [r for r in rows if r["w"]["phase"] == ph]
        if not prow: continue
        name, sub = PHASES[ph]
        body = []
        for r in prow:
            w = r["w"]
            cells = []
            for k, (kind, title, detail, km, bike, s, key) in enumerate(w["days"]):
                dd = r["start"] + dt.timedelta(days=k)
                tick = BOX if (kind != "rest" or s) else ""
                extra = (f'<b class="s{s}">{s}</b>' if s else "") + ('<b class="kst">★</b>' if key else "")
                cells.append(f'<td class="k-{kind}"><div class="c1">{tick}<span class="cd">{dd.day}/{dd.month}</span>{extra}</div>'
                             f'<div class="ct">{e(title)}</div></td>')
            run_txt = "28 + race" if r["n"] == 30 else str(r["run"])
            body.append(f'<tr><th><b>W{r["n"]}</b><span>{fmt(r["start"])}</span><em>{e(w["tag"])}</em></th>{"".join(cells)}'
                        f'<td class="num">{run_txt}</td><td class="num">{r["long"]}</td><td class="num">{r["bike"]/60:.1f}</td><td class="num">{e(w["vert"])}</td></tr>')
        first, last = prow[0], prow[-1]
        pages.append(f'''<div class="ppage">{_head(f"Training plan · {name}", e(sub), f"{fmt(first['start'])} – {fmt(last['end'])}")}
<table class="pgrid ph-{ph}"><thead><tr><th>Week</th>{"".join(f"<th>{n}</th>" for n in DAYN)}<th class="num">Run km</th><th class="num">Long</th><th class="num">Bike h</th><th class="num">D+ m</th></tr></thead>
<tbody>{"".join(body)}</tbody></table>
<div class="pkey">{KEY}</div>{_foot()}</div>''')
    pages.append(f'''<div class="ppage">{_head("Zones &amp; rules", "Reference for the whole plan")}
<div class="pclone" data-clone="#zones .now-vals"></div>
<div class="pclone pz" data-clone="#zones .zgrid"></div>
<h2>Rules</h2><div class="pclone prules" data-clone="#rules .rules"></div>
<h2>How a week works</h2><div class="pclone ptmpl" data-clone="#rules .tmpl"></div>
{_foot()}</div>''')
    return f'<section class="pdoc land" id="print-plan" aria-hidden="true">{"".join(pages)}</section>'

def week_doc(r, DAYN, KIND_LABEL, fmt):
    w = r["w"]
    trs = []
    for k, (kind, title, detail, km, bike, s, key) in enumerate(w["days"]):
        dd = r["start"] + dt.timedelta(days=k)
        vol = " · ".join(x for x in (f"{km} km" if km else "", _bike(bike)) if x)
        str_cell = (f'{BOX}<b class="s{s}">{s}</b>{"<small>optional</small>" if s == "C" else ""}' if s else "")
        trs.append(f'''<tr class="k-{kind}"><td class="tk">{BOX if kind != "rest" else ""}</td>
<td class="dy"><b>{DAYN[k]}</b><span>{dd.day}/{dd.month}</span></td>
<td class="ss"><div class="sk">{KIND_LABEL[kind]}{' <b class="kst">★ key</b>' if key else ''}</div><div class="st">{e(title)}</div>{f'<div class="sd">{e(detail)}</div>' if detail else ''}</td>
<td class="vol">{vol}</td><td class="sx">{str_cell}</td><td class="nt"></td></tr>''')
    run_txt = "28 km + race" if r["n"] == 30 else (f'{r["run"]} km incl. race' if r["n"] == 18 else f'{r["run"]} km')
    stats = (f'<dl class="pstats"><div><dt>Run</dt><dd>{run_txt}</dd></div><div><dt>Longest</dt><dd>{r["long"]} km</dd></div>'
             f'<div><dt>Bike</dt><dd>{r["bike"]/60:.1f} h</dd></div><div><dt>D+</dt><dd>{e(w["vert"])} m</dd></div></dl>')
    return f'''<section class="pdoc" id="print-w{r["n"]}" aria-hidden="true"><div class="ppage">
{_head(f'Week {r["n"]} · {fmt(r["start"])} – {fmt(r["end"])}', f'<span class="ptag">{e(w["tag"])}</span> {e(w["focus"])}', stats)}
<table class="pweek"><thead><tr><th></th><th>Day</th><th>Session</th><th>Volume</th><th>Strength</th><th>Notes · HR · feel</th></tr></thead><tbody>{"".join(trs)}</tbody></table>
<div class="pcols"><div><h2>Morning check</h2><div class="pclone" data-clone="#rules .rules li:nth-child(4)"></div>
<div class="pclone" data-clone="#rules .rules li:nth-child(1)"></div></div>
<div><h2>Zones</h2><div class="pclone pz small" data-clone="#zones .zgrid"></div></div></div>
<div class="pkey">{KEY}</div>{_foot()}</div></section>'''

def strength_doc():
    # Filled by print.js from the Strength tab, so it always matches what's on screen.
    return f'''<section class="pdoc" id="print-strength" aria-hidden="true">
<div class="ppage">{_head("Strength sessions", "A Monday · B Wednesday (fixed) · C Friday (optional)")}
<div class="pstr" data-build="strength"></div>{_foot()}</div>
<div class="ppage">{_head("Strength · reference", "Rules, progression and mobility")}
<div class="pclone pref" data-clone-panels="#view-strength .panel:not(#sessions)"></div>{_foot()}</div>
</section>'''

def build(rows, PHASES, DAYN, KIND_LABEL, fmt):
    return "\n".join([plan_doc(rows, PHASES, DAYN, fmt)] + [week_doc(r, DAYN, KIND_LABEL, fmt) for r in rows] + [strength_doc()])
