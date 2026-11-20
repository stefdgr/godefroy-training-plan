(function(){
  var views={plan:document.getElementById("view-plan"),weeks:document.getElementById("view-weeks"),strength:document.getElementById("view-strength"),foot:document.getElementById("view-foot"),nutrition:document.getElementById("view-nutrition")};
  function route(){
    var h=location.hash.replace("#","")||"plan", v="plan", el=null;
    if(views[h]) v=h; else { el=document.getElementById(h); if(el){ for(var k in views){ if(views[k].contains(el)) v=k; } } }
    Object.keys(views).forEach(function(k){views[k].hidden=(k!==v);
      var t=document.getElementById("tab-"+k); if(t) t.setAttribute("aria-selected",k===v?"true":"false");});
    if(el) el.scrollIntoView({block:"start"}); else window.scrollTo(0,0);
  }
  window.addEventListener("hashchange",route);

  var d=new Date(), iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  var weeks=[].slice.call(document.querySelectorAll("#weeklist .week")), ci=-1;
  weeks.forEach(function(w,i){ if(iso>=w.dataset.start && iso<=w.dataset.end){ w.classList.add("current"); ci=i; } });
  if(ci<0 && weeks.length && iso<weeks[0].dataset.start) ci=0;
  var t=document.querySelector('#weeklist .day[data-date="'+iso+'"]'); if(t) t.classList.add("today");
  [].forEach.call(document.querySelectorAll("#weeklist .day[data-date]"),function(n){ if(n.dataset.date<iso) n.classList.add("past"); });

  function cloneWeek(w){ var c=w.cloneNode(true); c.removeAttribute("id"); c.classList.remove("current");
    [].forEach.call(c.querySelectorAll("[id]"),function(n){n.removeAttribute("id");}); return c; }
  var nowSec=document.getElementById("now");
  if(ci<0){ if(nowSec) nowSec.hidden=true; }
  else {
    var cw=weeks[ci], c=cloneWeek(cw);
    document.getElementById("cw-slot").appendChild(c);
    document.getElementById("cw-title").textContent="This week · W"+(ci+1);
    document.getElementById("cw-all").setAttribute("href","#w"+(ci+1));
    if(weeks[ci+1]){ document.getElementById("nw-slot").appendChild(cloneWeek(weeks[ci+1]));
      document.getElementById("nw-title").textContent="Next week · W"+(ci+2); }
    else document.querySelector(".nextwk").hidden=true;
    var td=c.querySelector('.day[data-date="'+iso+'"]'), tc=document.getElementById("today-card");
    if(td){ td.classList.add("today");
      var kind=td.className.replace("day","").replace("today","").trim();
      tc.className="today-card day "+kind;
      tc.innerHTML='<div class="tl-label">Today</div>'+td.innerHTML;
    } else tc.hidden=true;
  }
  // PREVIEW: last night's recovery numbers. Fixed Garmin snapshot; later fetched live.
  (function(){
    var box=document.getElementById("rec"); if(!box) return;
    var I={sleep:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
      hrv:'<path d="M2 12h4l2-5 4 10 3-7 2 2h5"/>',
      rhr:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'};
    var R=[ // Garmin, nights of 13-19 Nov 2026 (snapshot)
      {k:"hrv",n:"HRV",v:63,u:"ms",d:[58,63,56,52,65,59,63],range:[63,81],pill:"Unbalanced",sub:"7-day avg 59",st:"warn"},
      {k:"sleep",n:"Sleep",v:87,u:"/100",d:[84,87,86,79,89,83,87],pill:"Good",sub:"7 h 35<br>Deep 1 h 25 · REM 1 h 33",st:"ok"},
      {k:"rhr",n:"Resting HR",v:42,u:"bpm",d:[44,43,43,44,43,44,42],pill:"Normal",sub:"7-day avg 43",st:"ok"}];
    function spark(x){ var a=x.d, ex=x.range||[], lo=Math.min.apply(0,a.concat(ex)), hi=Math.max.apply(0,a.concat(ex)), r, w=120, h=34;
      if(hi-lo<8){var m=(hi+lo)/2; lo=m-4; hi=m+4;} r=hi-lo;
      var Y=function(v){return (h-4-(v-lo)/r*(h-8)).toFixed(1);};
      var pts=a.map(function(v,i){ return (i*w/(a.length-1)).toFixed(1)+","+Y(v); });
      var last=pts[pts.length-1].split(","), id="g"+x.k;
      return '<div class="rspw">'+'<span class="dot" style="left:100%;top:'+(last[1]/h*100).toFixed(1)+'%"></span><svg class="rsp" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>'+
        (x.range?x.range.map(function(v){return '<line class="floor" x1="0" x2="'+w+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/>';}).join(''):'')+
        '<polygon fill="url(#'+id+')" points="0,'+h+' '+pts.join(" ")+' '+w+','+h+'"/><polyline points="'+pts.join(" ")+'"/>'+
        '</svg></div>'; }
    // Garmin-style tiles: status, headline number, zone bar with marker, 4-week dot history over the normal band.
    // Snapshot from Garmin, 23 Oct - 19 Nov 2026. Dot shapes: b = normal (circle), u = off (square), l = low/poor (triangle).
    var rhr=[43,46,42,43,42,44,43,47,45,43,42,40,40,41,41,42,43,38,37,40,42,44,43,43,44,43,44,42];
    var ra=Math.round(rhr.reduce(function(p,c){return p+c;},0)/rhr.length*10)/10;
    var T=[
      {k:"hrv",n:"HRV status",st:"warn",stx:"Unbalanced",v:59,u:"ms",sub:"7-day avg · last night 63",
        sc:[45,95],z:[[45,58,"low"],[58,63,"unb"],[63,81,"bal"],[81,95,"unb"]],
        d:[69,63,62,63,63,62,61,58,61,63,63,63,63,63,66,67,64,67,68,70,71,70,69,70,65,62,60,59],
        c:"bulullllUUUUUUbbbbbbbbbbbuuu".toLowerCase(),
        bl:[65,66,66,65,65,65,65,65,64,64,64,64,64,64,63,63,63,63,63,63,63,63,63,63,63,63,63,63],
        bh:[78,78,78,78,78,78,77,77,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,80,81,81,81],yl:[50,85]},
      {k:"sleep",n:"Sleep score",st:"ok",stx:"Good",v:87,u:"/100",sub:"7 h 35 · deep 1 h 25 · REM 1 h 33",
        sc:[40,100],z:[[40,60,"low"],[60,80,"unb"],[80,90,"bal"],[90,100,"exc"]],
        d:[88,43,85,86,89,82,84,80,88,89,95,94,90,83,99,88,70,96,100,90,93,84,87,86,79,89,83,87],
        c:"blbbbbbbbbbbbbbbubbbbbbbubbb",bl:80,bh:100,yl:[40,100]},
      {k:"rhr",n:"Resting HR",st:"ok",stx:"Normal",v:42,u:"bpm",sub:"4-week avg "+Math.round(ra),
        sc:[34,54],z:[[34,ra+2,"bal"],[ra+2,ra+5,"unb"],[ra+5,54,"low"]],
        d:rhr,c:rhr.map(function(v){return v>ra+5?"l":v>ra+2?"u":"b";}).join(""),bl:ra-2,bh:ra+2,yl:[34,50]}];
    function gTile(t){
      var lo=t.sc[0],hi=t.sc[1],P=function(v){return ((Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*100).toFixed(1);};
      var zb='<div class="hz">'+t.z.map(function(z){return '<i class="z '+z[2]+'" style="left:'+P(z[0])+'%;width:'+(P(z[1])-P(z[0])).toFixed(1)+'%"></i>';}).join('')+
        '<span class="hm" style="left:'+P(t.v)+'%"></span></div>';
      var cw=280,ch=34,ylo=t.yl[0],yhi=t.yl[1],n=t.d.length,X=function(i){return 6+i*(cw-12)/(n-1);},Y=function(v){return ch-4-(Math.max(ylo,Math.min(yhi,v))-ylo)/(yhi-ylo)*(ch-8);};
      var BL=function(i){return typeof t.bl==="number"?t.bl:t.bl[i];},BH=function(i){return typeof t.bh==="number"?t.bh:t.bh[i];};
      var band='M'+t.d.map(function(v,i){return X(i).toFixed(1)+','+Y(BH(i)).toFixed(1);}).join(' L')+' L'+t.d.map(function(v,i){var j=n-1-i;return X(j).toFixed(1)+','+Y(BL(j)).toFixed(1);}).join(' L')+'Z';
      var dots=t.d.map(function(v,i){var c=t.c[i],x=X(i),y=Y(v);
        if(c==="b") return '<circle class="db" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.6"/>';
        if(c==="u") return '<rect class="du" x="'+(x-2.4).toFixed(1)+'" y="'+(y-2.4).toFixed(1)+'" width="4.8" height="4.8"/>';
        return '<path class="dl" d="M'+x.toFixed(1)+','+(y-3).toFixed(1)+' l3,5.4 h-6z"/>';}).join('');
      return '<div class="rt '+t.k+' '+t.st+'"><div class="rh"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true">'+I[t.k]+'</svg></span><span class="rn">'+t.n+'</span></div>'+
        '<div class="hst"><i></i>'+t.stx+'</div>'+
        '<div class="rv"><b>'+t.v+'</b><span>'+t.u+'</span></div><div class="rsub hsub">'+t.sub+'</div>'+zb+
        '<svg class="hch" viewBox="0 0 '+cw+' '+ch+'" aria-hidden="true"><path class="hband" d="'+band+'"/>'+dots+'</svg><div class="rsub">Last 4 weeks</div></div>'; }
    function sTile(x){
      return '<div class="rt '+x.k+' '+x.st+'"><div class="rh"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true">'+I[x.k]+'</svg></span><span class="rn">'+x.n+'</span><span class="rpill">'+x.pill+'</span></div>'+
        '<div class="rv"><b>'+x.v+'</b><span>'+x.u+'</span></div>'+
        spark(x)+'<div class="rsub">'+x.sub+'</div></div>'; }
    var SL={v:91,stx:"Excellent",dur:"7 h 25",t0:"23:39",t1:"07:12",
      leg:[["deep","Deep","1 h 41"],["light","Light","4 h 14"],["rem","REM","1 h 31"],["awake","Awake","7 min"]],
      seg:[["light",0,41],["deep",41,82],["light",82,91],["deep",91,98],["light",98,109],["deep",109,114],["light",114,126],
        ["deep",126,155],["light",155,186],["deep",186,213],["light",213,245],["rem",245,258],["light",258,278],
        ["rem",278,313],["light",313,391],["rem",391,433],["awake",433,437],["light",437,453]]};
    function slTile(x){
      var cw=280,ch=36,tot=x.seg[x.seg.length-1][2],H={deep:.32,light:.58,rem:.82,awake:1};
      var bars=x.seg.map(function(g){var x0=g[1]/tot*cw,w=Math.max(1.2,(g[2]-g[1])/tot*cw-.8),h=H[g[0]]*(ch-2);
        return '<rect class="'+g[0]+'" x="'+x0.toFixed(1)+'" y="'+(ch-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5"/>';}).join('');
      return '<div class="rt sleep ok"><div class="rh"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true">'+I.sleep+'</svg></span><span class="rn">Sleep score</span></div>'+
        '<div class="hst"><i></i>'+x.stx+'</div>'+
        '<div class="rv"><b>'+x.v+'</b><span>/100</span></div><div class="rsub hsub">'+x.dur+' asleep</div>'+
        '<svg class="hyp" viewBox="0 0 '+cw+' '+ch+'" aria-hidden="true">'+bars+'</svg>'+
        '<div class="hyt"><span>'+x.t0+'</span><span>'+x.t1+'</span></div>'+
        '<div class="stl">'+x.leg.map(function(l){return '<span class="'+l[0]+'"><i></i>'+l[1]+' <b>'+l[2]+'</b></span>';}).join('')+'</div></div>'; }
    // RHR vs 7-day baseline (mean of the 7 days before). +3 = elevated, +5 = high. Garmin, 7-20 Nov 2026.
    var RH={d:[42,43,38,37,40,42,44,43,43,44,43,44,42,41],dw:"SSMTWTF"};
    function rTile(x){
      var d=x.d,n=d.length,bl=function(i){var s=0;for(var k=i-7;k<i;k++)s+=d[k];return s/7;},
        st=function(v,b){return v-b>=5?"l":v-b>=3?"u":"b";},
        v=d[n-1],b=bl(n-1),c=st(v,b),lo=b-6,hi=b+8,
        P=function(q){return ((Math.max(lo,Math.min(hi,q))-lo)/(hi-lo)*100).toFixed(1);},
        zb='<div class="hz">'+[[lo,b+3,"bal"],[b+3,b+5,"unb"],[b+5,hi,"low"]].map(function(z){return '<i class="z '+z[2]+'" style="left:'+P(z[0])+'%;width:'+(P(z[1])-P(z[0])).toFixed(1)+'%"></i>';}).join('')+
          '<span class="hm" style="left:'+P(v)+'%"></span></div><div class="rzl"><span style="left:'+P(b)+'%">'+Math.round(b)+'</span><span style="left:'+P(b+3)+'%">+3</span><span style="left:'+P(b+5)+'%">+5</span></div>',
        cw=280,ch=24,X=function(k){return 10+k*(cw-20)/6;},Y=function(q){return ch-5-(q-(b-5))/10*(ch-10);},dots='';
      for(var k=0;k<7;k++){var j=n-7+k,q=d[j],cc=st(q,bl(j)),xx=X(k).toFixed(1),y=Y(q);
        dots+=cc==="b"?'<circle class="db" cx="'+xx+'" cy="'+y.toFixed(1)+'" r="3"/>':cc==="u"?'<rect class="du" x="'+(X(k)-2.8).toFixed(1)+'" y="'+(y-2.8).toFixed(1)+'" width="5.6" height="5.6"/>':'<path class="dl" d="M'+xx+','+(y-3.4).toFixed(1)+' l3.4,6 h-6.8z"/>';
        dots+='<text x="'+xx+'" y="'+(ch+10)+'" text-anchor="middle">'+x.dw[k]+'</text>';}
      var dl=Math.round(v-b);
      return '<div class="rt rhr '+(c==="b"?"ok":c==="u"?"warn":"bad")+'"><div class="rh"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true">'+I.rhr+'</svg></span><span class="rn">Resting HR</span></div>'+
        '<div class="hst"><i></i>'+(c==="b"?"Normal":c==="u"?"Elevated":"High")+'</div>'+
        '<div class="rv"><b>'+v+'</b><span>bpm</span></div><div class="rsub hsub">7-day baseline '+Math.round(b)+' · '+(dl>=0?'+':'−')+Math.abs(dl)+' bpm</div>'+zb+
        '<svg class="hch rch" viewBox="0 0 '+cw+' '+(ch+12)+'" aria-hidden="true"><line class="bl" x1="0" x2="'+cw+'" y1="'+Y(b).toFixed(1)+'" y2="'+Y(b).toFixed(1)+'"/>'+dots+'</svg><div class="rsub">Last 7 days</div></div>'; }
    box.innerHTML=gTile(T[0])+slTile(SL)+rTile(RH);
    // Compact layout: status next to the title, number and sub line on one row, no chart captions.
    [].forEach.call(box.querySelectorAll(".rt"),function(t){
      var h=t.querySelector(".hst"),rv=t.querySelector(".rv"),sb=t.querySelector(".hsub"),last=t.lastElementChild;
      if(h) t.querySelector(".rh").appendChild(h);
      if(rv&&sb){var row=document.createElement("div");row.className="rrow";rv.parentNode.insertBefore(row,rv);row.appendChild(rv);row.appendChild(sb);}
      if(last&&last.className==="rsub") t.removeChild(last);
    });
  })();
  var btn=document.getElementById("today-btn");
  if(btn){ if(ci<0){btn.hidden=true;} btn.addEventListener("click",function(){ weeks[ci].scrollIntoView({block:"start"}); }); }
  route();
})();
(function(){
  var box=document.querySelector(".chart"), tip=document.getElementById("tip"); if(!box||!tip) return;
  var on=null;
  function show(h){
    var bar=box.querySelector('.bar[data-w="'+h.dataset.w+'"]');
    if(on) on.classList.remove("on"); if(bar){bar.classList.add("on"); on=bar;}
    tip.innerHTML='<b>'+h.dataset.h+'</b><div class="tl">'+h.dataset.l+'</div><dl><dt>Run</dt><dd>'+h.dataset.run+'</dd><dt>Longest</dt><dd>'+h.dataset.long+'</dd><dt>Bike</dt><dd>'+h.dataset.bike+'</dd><dt>D+</dt><dd>'+h.dataset.vert+'</dd></dl>';
    tip.hidden=false;
    var br=box.getBoundingClientRect(), hr=h.getBoundingClientRect();
    var x=hr.left-br.left+box.scrollLeft+hr.width/2, tw=tip.offsetWidth;
    var half=hr.width/2+6, left=(x+half+tw<=box.scrollWidth-4)?x+half:Math.max(4,x-half-tw);
    tip.style.left=left+"px"; tip.style.top="4px";
  }
  function hide(){ tip.hidden=true; if(on){on.classList.remove("on"); on=null;} }
  [].forEach.call(box.querySelectorAll(".hit"),function(h){
    h.addEventListener("pointerenter",function(){show(h);});
    h.addEventListener("focus",function(){show(h);});
    h.addEventListener("blur",hide);
    h.addEventListener("click",function(){ location.hash="w"+h.dataset.w; });
    h.addEventListener("keydown",function(ev){ if(ev.key==="Enter") location.hash="w"+h.dataset.w; });
  });
  box.addEventListener("pointerleave",hide);
})();
(function(){
  var btns=[].slice.call(document.querySelectorAll(".segb")), cards=[].slice.call(document.querySelectorAll("#sessions .sc"));
  if(!btns.length) return;
  function pick(L){ btns.forEach(function(b){b.setAttribute("aria-selected",b.dataset.s===L?"true":"false");});
    cards.forEach(function(c){c.hidden=(c.dataset.s!==L);}); }
  btns.forEach(function(b){ b.addEventListener("click",function(){pick(b.dataset.s);}); });
  var map=["A","A","B","B","C","C","A"]; // Sun..Sat -> next session
  pick(map[new Date().getDay()]);
})();

// Installable app: offline copy via the service worker, and a fresh "today" when the app is reopened on a new day.
(function(){
  var reg=null;
  if("serviceWorker" in navigator && window.isSecureContext){
    var had=!!navigator.serviceWorker.controller;
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(function(r){ reg=r; r.update(); }).catch(function(){});
    });
    // A new deploy ships a new service worker; reload once it takes over.
    navigator.serviceWorker.addEventListener("controllerchange",function(){ if(had) location.reload(); had=true; });
  }
  var day=new Date().toDateString();
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState!=="visible") return;
    if(new Date().toDateString()!==day){ location.reload(); return; }
    if(reg) reg.update().catch(function(){});
  });
})();

// Swipe left/right to move between the tabs on a phone. Ignored on things that scroll sideways (chart, tables, tab bar).
(function(){
  var order=["plan","weeks","strength","foot","nutrition"], x0=0, y0=0, t0=0, on=false;
  function scrollsX(n){ for(;n&&n!==document.body;n=n.parentElement){ if(n.scrollWidth>n.clientWidth+2){ var o=getComputedStyle(n).overflowX; if(o==="auto"||o==="scroll") return true; } } return false; }
  document.addEventListener("touchstart",function(e){
    var p=e.touches[0]; on=e.touches.length===1 && p.clientX>24 && p.clientX<innerWidth-24 && !scrollsX(e.target);
    x0=p.clientX; y0=p.clientY; t0=Date.now();
  },{passive:true});
  document.addEventListener("touchend",function(e){
    if(!on) return; on=false;
    var p=e.changedTouches[0], dx=p.clientX-x0, dy=p.clientY-y0;
    if(Math.abs(dx)<70 || Math.abs(dx)<2*Math.abs(dy) || Date.now()-t0>700) return;
    var cur=order.filter(function(k){ return !document.getElementById("view-"+k).hidden; })[0], i=order.indexOf(cur)+(dx<0?1:-1);
    if(i<0||i>=order.length) return;
    location.hash=order[i];
    var tab=document.getElementById("tab-"+order[i]); if(tab) tab.scrollIntoView({block:"nearest",inline:"nearest"});
  },{passive:true});
})();

// Header countdown to race day
(function(){
  var el=document.getElementById('count');if(!el)return;
  var t=new Date();t.setHours(0,0,0,0);
  var race=new Date(2027,5,5),start=new Date(2026,10,9);
  var days=Math.round((race-t)/864e5);if(days<0)return;
  var wk=Math.floor((t-start)/(7*864e5))+1;
  document.getElementById('count-days').textContent=days===0?'Race day':days+(days===1?' day':' days');
  document.getElementById('count-sub').textContent=wk>=1&&wk<=30?'Week '+wk+' of 30':'';
  if(days===0)document.getElementById('count-sub').textContent='Godefroy 75';
  el.hidden=false;
})();
