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
      var cw=280,ch=56,ylo=t.yl[0],yhi=t.yl[1],n=t.d.length,X=function(i){return 6+i*(cw-12)/(n-1);},Y=function(v){return ch-4-(Math.max(ylo,Math.min(yhi,v))-ylo)/(yhi-ylo)*(ch-8);};
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
    box.innerHTML=gTile(T[0])+sTile(R[1])+sTile(R[2])+
      '<div class="rsrc">Garmin snapshot 19 Nov</div>';
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
  if("serviceWorker" in navigator && window.isSecureContext){
    window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
  var day=new Date().toDateString();
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible" && new Date().toDateString()!==day) location.reload();
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
