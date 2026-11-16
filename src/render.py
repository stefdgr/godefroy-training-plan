import datetime as dt, html, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_data import WEEKS, PHASES
import print_docs
PRINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>'

START = dt.date(2026, 11, 9)
DAYN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
KIND_LABEL = {"rest":"Rest","easy":"Easy run","q":"Quality run","long":"Long run","bike":"Easy ride",
              "bikeq":"Bike quality","hill":"Hill / hike","camp":"Trail","race":"Race"}
e = html.escape

def fmt(d): return f"{d.day} {d.strftime('%b')}"

# strength placement: A Mon, B Wed, C Fri; exceptions per week number
STR_DAY = {"A":0, "B":2, "C":4}
STR_EX = {8:"AB", 13:"AB", 17:"A", 18:"A", 19:"B", **{n:"AB" for n in range(20,29)}, 29:"A", 30:""}
for i, w in enumerate(WEEKS):
    letters = STR_EX.get(i+1, "ABC")
    new=[]
    for k, t in enumerate(w["days"]):
        t=list(t); t[5]=None
        for L in letters:
            if STR_DAY[L]==k: t[5]=L
        if t[0]=="rest" and t[1]=="Rest + strength" and not t[5]:
            t[1]="Rest"; t[2]="Full rest."
        new.append(tuple(t))
    w["days"]=new

rows = []
for i, w in enumerate(WEEKS):
    s = START + dt.timedelta(weeks=i)
    run = sum(x[3] for x in w["days"])
    bike = sum(x[4] for x in w["days"])
    long_ = max((x[3] for x in w["days"] if x[0] in ("long","race")), default=0)
    hard = sum(1 for x in w["days"] if x[0] in ("q","bikeq") or (x[0]=="long" and x[6] and ("pace" in x[1] or "Power" in x[1] or "SIM" in x[1] or "steady" in x[1])))
    rows.append(dict(n=i+1, start=s, end=s+dt.timedelta(days=6), run=run, bike=bike, long=long_, w=w, hard=hard))

assert rows[17]["end"] == dt.date(2027,3,14), rows[17]["end"]
assert rows[29]["start"] + dt.timedelta(days=5) == dt.date(2027,6,5)

# ---------- chart ----------
W_, H_, padL, padB, padT = 900, 230, 34, 34, 14
bw = (W_-padL-10)/30
maxkm = 90
def y(v): return padT + (H_-padT-padB)*(1-v/maxkm)
svg = [f'<svg viewBox="0 0 {W_} {H_}" role="img" aria-label="Weekly running km and bike hours across 30 weeks">']
for g in (0,20,40,60,80):
    svg.append(f'<line x1="{padL}" x2="{W_-10}" y1="{y(g):.1f}" y2="{y(g):.1f}" class="grid"/><text x="{padL-6}" y="{y(g)+4:.1f}" class="ax" text-anchor="end">{g}</text>')
pts=[]; hits=[]
for r in rows:
    x = padL + (r["n"]-1)*bw
    run_bar = r["run"] if r["n"]!=30 else 28  # race week: show training km, race marked separately
    svg.append(f'<rect x="{x+2:.1f}" y="{y(run_bar):.1f}" width="{bw-4:.1f}" height="{y(0)-y(run_bar):.1f}" class="bar {r["w"]["phase"]}" data-w="{r["n"]}"/>')
    runlbl = "race week" if r["n"]==30 else (f'{r["run"]} km incl. race' if r["n"]==18 else f'{r["run"]} km')
    hits.append(f'<rect class="hit" x="{x:.1f}" y="{padT}" width="{bw:.1f}" height="{y(0)-padT:.1f}" tabindex="0" data-w="{r["n"]}" data-h="W{r["n"]} · {fmt(r["start"])} – {fmt(r["end"])}" data-l="{e(r["w"]["tag"])}" data-run="{runlbl}" data-long="{r["long"]} km" data-bike="{r["bike"]/60:.1f} h" data-vert="{e(r["w"]["vert"])} m"/>')
    pts.append((x+bw/2, y(r["bike"]/60*10)))
    if r["n"] in (18,30):
        svg.append(f'<text x="{x+bw/2:.1f}" y="{y(run_bar)-6:.1f}" class="flag" text-anchor="middle">★</text>')
    if r["n"]%2==1 or r["n"]==30:
        svg.append(f'<text x="{x+bw/2:.1f}" y="{H_-padB+16}" class="ax" text-anchor="middle">{r["n"]}</text>')
svg.append('<polyline class="bikeline" points="'+" ".join(f"{a:.1f},{b:.1f}" for a,b in pts)+'"/>')
for a,b in pts: svg.append(f'<circle cx="{a:.1f}" cy="{b:.1f}" r="2.4" class="bikedot"/>')
svg.extend(hits)
svg.append(f'<text x="{padL}" y="{H_-4}" class="ax">week</text></svg>')
chart = "\n".join(svg) + '<div class="tip" id="tip" role="status" hidden></div>'

# ---------- week cards ----------
cards=[]
cur_phase=None
for r in rows:
    w=r["w"]
    if w["phase"]!=cur_phase:
        cur_phase=w["phase"]; name,sub=PHASES[cur_phase]
        cards.append(f'<h2 class="phase-h {cur_phase}" id="{cur_phase}"><span>{name}</span><small>{sub}</small></h2>')
    days=[]
    for k,(kind,title,detail,km,bike,s,key) in enumerate(w["days"]):
        dd = r["start"]+dt.timedelta(days=k)
        chips = ""
        if s: chips += f'<a class="chip str{" opt" if s=="C" else ""}" href="#strength">Strength {s}{" · optional" if s=="C" else ""}</a>'
        if key: chips += '<span class="chip key" title="Key session: don\'t swap">★ key</span>'
        days.append(f'''<li class="day {kind}" data-date="{dd.isoformat()}">
<div class="dh"><b>{DAYN[k]}</b> <span>{dd.day}/{dd.month}</span><em>{KIND_LABEL[kind]}</em></div>
<div class="dt">{e(title)}</div>{f'<div class="dd">{e(detail)}</div>' if detail else ''}{f'<div class="chips">{chips}</div>' if chips else ''}</li>''')
    tagcls = w["tag"].split()[0].lower().replace("→","")
    run_txt = f'{r["run"]} km' if r["n"]!=30 else '28 km + race'
    if r["n"]==18: run_txt = f'{r["run"]} km incl. race'
    cards.append(f'''<article class="week {w["phase"]}" id="w{r["n"]}" data-start="{r["start"].isoformat()}" data-end="{r["end"].isoformat()}">
<header><div class="wn">W{r["n"]}</div><div class="wmeta"><div class="wdates">{fmt(r["start"])} – {fmt(r["end"])}</div><span class="tag t-{tagcls}">{e(w["tag"])}</span><span class="now">This week</span></div>
<dl class="stats"><div><dt>Run</dt><dd>{run_txt}</dd></div><div><dt>Longest</dt><dd>{r["long"]} km</dd></div><div><dt>Bike</dt><dd>{r["bike"]/60:.1f} h</dd></div><div><dt>D+</dt><dd>{w["vert"]} m</dd></div></dl><button type="button" class="pbtn ico" data-print="print-w{r["n"]}" aria-label="Print week {r["n"]}" title="Print week {r["n"]}">{PRINT_ICON}</button></header>
<p class="focus">{e(w["focus"])}</p>
<ol class="days">{"".join(days)}</ol></article>''')

css = open(os.path.join(HERE,"style.css")).read() + open(os.path.join(HERE,"print.css")).read()
body = open(os.path.join(HERE,"body.html")).read()
js = open(os.path.join(HERE,"app.js")).read() + open(os.path.join(HERE,"print.js")).read()
prints = print_docs.build(rows, PHASES, DAYN, KIND_LABEL, fmt)
page = body.replace("%%CSS%%", css).replace("%%CHART%%", chart).replace("%%WEEKS%%", "\n".join(cards)).replace("%%JS%%", js).replace("%%PRINT%%", prints).replace("%%PRINT_ICON%%", PRINT_ICON)
open(os.path.join(HERE,"..","index.html"),"w").write(page)
for r in rows: print(r["n"], r["start"], r["run"], round(r["bike"]/60,1), r["long"], r["hard"])
