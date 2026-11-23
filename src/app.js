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
    // Tomorrow: compact strip at the bottom of the Today card (may fall in next week)
    var tm=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),
      tiso=tm.getFullYear()+"-"+String(tm.getMonth()+1).padStart(2,"0")+"-"+String(tm.getDate()).padStart(2,"0"),
      tn=document.querySelector('#weeklist .day[data-date="'+tiso+'"]');
    if(tn&&!tc.hidden){ var q=function(s){var n=tn.querySelector(s);return n?n.innerHTML:"";},
        tkind=tn.className.replace(/\b(day|today|past)\b/g,"").trim(), key=tn.querySelector(".chip.key")?'<span class="chip key">★ key</span>':"";
      tc.insertAdjacentHTML("beforeend",'<div class="tmrw '+tkind+'"><div class="tw-h"><span class="tl-label">Tomorrow</span>'+q(".dh")+'</div>'+
        '<div class="tw-t">'+q(".dt")+key+'</div>'+(tn.querySelector(".dd")?'<div class="tw-d">'+q(".dd")+'</div>':"")+'</div>'); }
  }
  // Recovery tiles: live Garmin data from /api/recovery (the Worker). Hidden unless this
  // device has the private key (open the site once with ?key=...). Last result is kept
  // on the device so the tiles show instantly and offline.
  (function(){
    var box=document.getElementById("rec"); if(!box) return;
    var KEY="g75key",DATA="g75rec",key=null;
    try{ var q=new URLSearchParams(location.search).get("key");
      if(q){ localStorage.setItem(KEY,q); history.replaceState(null,"",location.pathname+location.hash); }
      key=localStorage.getItem(KEY); }catch(e){}
    box.hidden=true;
    if(!key) return;
    var I={sleep:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
      hrv:'<path d="M2 12h4l2-5 4 10 3-7 2 2h5"/>',
      rhr:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'};
    var num=function(v){return typeof v==="number"&&isFinite(v);};
    var head=function(k,n,st,stx){return '<div class="rt '+k+' '+st+'"><div class="rh"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true">'+I[k]+'</svg></span><span class="rn">'+n+'</span><div class="hst"><i></i>'+stx+'</div></div>';};
    var zbar=function(lo,hi,z,v){var P=function(q){return ((Math.max(lo,Math.min(hi,q))-lo)/(hi-lo)*100).toFixed(1);};
      return '<div class="hz">'+z.map(function(r){return '<i class="z '+r[2]+'" style="left:'+P(r[0])+'%;width:'+(P(r[1])-P(r[0])).toFixed(1)+'%"></i>';}).join('')+'<span class="hm" style="left:'+P(v)+'%"></span></div>';};
    var dot=function(c,x,y){x=x.toFixed(1);
      if(c==="b") return '<circle class="db" cx="'+x+'" cy="'+y.toFixed(1)+'" r="2.6"/>';
      if(c==="u") return '<rect class="du" x="'+(x-2.4).toFixed(1)+'" y="'+(y-2.4).toFixed(1)+'" width="4.8" height="4.8"/>';
      return '<path class="dl" d="M'+x+','+(y-3).toFixed(1)+' l3,5.4 h-6z"/>';};
    var HS={BALANCED:["ok","Balanced","b"],UNBALANCED:["warn","Unbalanced","u"],LOW:["bad","Low","l"],POOR:["bad","Poor","l"]};
    function hrvTile(h){
      if(!h||!num(h.weeklyAvg)) return '';
      var s=HS[h.status]||["ok","No status","b"],v=h.weeklyAvg,lu=h.lowUpper,bl=h.balancedLow,bu=h.balancedUpper,out='';
      out+=head("hrv","HRV status",s[0],s[1])+'<div class="rrow"><div class="rv"><b>'+v+'</b><span>ms</span></div><div class="rsub hsub">7-day avg'+(num(h.lastNight)?' · last night '+h.lastNight:'')+'</div></div>';
      if(num(lu)&&num(bl)&&num(bu)){var lo=Math.min(lu-12,v-3),hi=Math.max(bu+14,v+3);
        out+=zbar(lo,hi,[[lo,lu,"low"],[lu,bl,"unb"],[bl,bu,"bal"],[bu,hi,"unb"]],v);}
      var d=(h.days||[]).filter(function(x){return num(x.weeklyAvg);});
      if(d.length>1){var all=[];d.forEach(function(x){all.push(x.weeklyAvg);if(num(x.balancedLow))all.push(x.balancedLow);if(num(x.balancedUpper))all.push(x.balancedUpper);});
        var ylo=Math.min.apply(0,all)-4,yhi=Math.max.apply(0,all)+4,cw=280,ch=34,n=d.length,
          X=function(i){return 6+i*(cw-12)/(n-1);},Y=function(q){return ch-4-(q-ylo)/(yhi-ylo)*(ch-8);},
          B=d.filter(function(x){return num(x.balancedLow)&&num(x.balancedUpper);}).length===n,band='';
        if(B) band='<path class="hband" d="M'+d.map(function(x,i){return X(i).toFixed(1)+','+Y(x.balancedUpper).toFixed(1);}).join(' L')+' L'+d.map(function(x,i){var j=n-1-i;return X(j).toFixed(1)+','+Y(d[j].balancedLow).toFixed(1);}).join(' L')+'Z"/>';
        out+='<svg class="hch" viewBox="0 0 '+cw+' '+ch+'" aria-hidden="true">'+band+d.map(function(x,i){return dot((HS[x.status]||[0,0,"b"])[2],X(i),Y(x.weeklyAvg));}).join('')+'</svg>';}
      return out+'</div>';
    }
    var SQ={EXCELLENT:["ok","Excellent"],GOOD:["ok","Good"],FAIR:["warn","Fair"],POOR:["bad","Poor"]};
    var hm=function(s){s=Math.floor((s||0)/60);return s<60?s+" min":Math.floor(s/60)+" h "+("0"+s%60).slice(-2);};
    function sleepTile(s){
      if(!s||!num(s.score)) return '';
      var q=SQ[s.qualifier]||["ok",""],out=head("sleep","Sleep score",q[0],q[1])+
        '<div class="rrow"><div class="rv"><b>'+s.score+'</b><span>/100</span></div><div class="rsub hsub">'+hm(s.seconds)+' asleep</div></div>';
      var L=(s.levels||[]).filter(function(l){return l&&num(l[1])&&num(l[2]);});
      if(L.length){var cw=280,ch=36,t0=L[0][1],tot=Math.max.apply(0,L.map(function(l){return l[2];}))-t0,H={deep:.32,light:.58,rem:.82,awake:1};
        out+='<svg class="hyp" viewBox="0 0 '+cw+' '+ch+'" aria-hidden="true">'+L.map(function(g){var k=H[g[0]]?g[0]:"light",x0=(g[1]-t0)/tot*cw,w=Math.max(1.2,(g[2]-g[1])/tot*cw-.8),h=H[k]*(ch-2);
          return '<rect class="'+k+'" x="'+x0.toFixed(1)+'" y="'+(ch-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5"/>';}).join('')+'</svg>'+
          '<div class="hyt"><span>'+(s.start||'')+'</span><span>'+(s.end||'')+'</span></div>';}
      out+='<div class="stl">'+[["deep","Deep",s.deep],["light","Light",s.light],["rem","REM",s.rem],["awake","Awake",s.awake]].map(function(l){return '<span class="'+l[0]+'"><i></i>'+l[1]+' <b>'+hm(l[2])+'</b></span>';}).join('')+'</div>';
      return out+'</div>';
    }
    // RHR vs 7-day baseline (mean of the 7 days before). +3 = elevated, +5 = high.
    function rhrTile(r){
      var D=(r&&r.days||[]).filter(function(x){return num(x.value);}),d=D.map(function(x){return x.value;}),n=d.length;
      if(n<8) return '';
      var bl=function(i){var s=0;for(var k=i-7;k<i;k++)s+=d[k];return s/7;},
        st=function(v,b){return v-b>=5?"l":v-b>=3?"u":"b";},
        v=d[n-1],b=bl(n-1),c=st(v,b),lo=b-6,hi=b+8,P=function(q){return ((Math.max(lo,Math.min(hi,q))-lo)/(hi-lo)*100).toFixed(1);},
        cw=280,ch=24,m=Math.min(7,n-7),X=function(k){return 10+k*(cw-20)/Math.max(1,m-1);},Y=function(q){return ch-5-(Math.max(b-5,Math.min(b+5,q))-(b-5))/10*(ch-10);},dots='',dl=Math.round(v-b);
      for(var k=0;k<m;k++){var j=n-m+k,cc=st(d[j],bl(j)),y=Y(d[j]),xx=X(k);
        dots+=dot(cc,xx,y).replace('r="2.6"','r="3"')+'<text x="'+xx.toFixed(1)+'" y="'+(ch+10)+'" text-anchor="middle">'+"SMTWTFS".charAt(new Date(D[j].date+"T12:00:00").getDay())+'</text>';}
      return head("rhr","Resting HR",c==="b"?"ok":c==="u"?"warn":"bad",c==="b"?"Normal":c==="u"?"Elevated":"High")+
        '<div class="rrow"><div class="rv"><b>'+v+'</b><span>bpm</span></div><div class="rsub hsub">7-day baseline '+Math.round(b)+' · '+(dl>=0?'+':'−')+Math.abs(dl)+' bpm</div></div>'+
        zbar(lo,hi,[[lo,b+3,"bal"],[b+3,b+5,"unb"],[b+5,hi,"low"]],v)+
        '<div class="rzl"><span style="left:'+P(b)+'%">'+Math.round(b)+'</span><span style="left:'+P(b+3)+'%">+3</span><span style="left:'+P(b+5)+'%">+5</span></div>'+
        '<svg class="hch rch" viewBox="0 0 '+cw+' '+(ch+12)+'" aria-hidden="true"><line class="bl" x1="0" x2="'+cw+'" y1="'+Y(b).toFixed(1)+'" y2="'+Y(b).toFixed(1)+'"/>'+dots+'</svg></div>';
    }
    function render(x){
      var h=''; try{ h=hrvTile(x.hrv)+sleepTile(x.sleep)+rhrTile(x.rhr); }catch(e){}
      box.innerHTML=h; box.hidden=!h;
    }
    try{ var c=JSON.parse(localStorage.getItem(DATA)||"null"); if(c) render(c); }catch(e){}
    var last=0;
    function msg(t){ if(box.querySelector(".rt")) return; box.innerHTML='<div class="rsrc rerr">'+t+'</div>'; box.hidden=false; }
    function load(){
      last=Date.now();
      msg("Loading recovery data…");
      fetch("/api/recovery",{headers:{"X-Key":key},cache:"no-store"}).then(function(r){
        return r.json().catch(function(){return {};}).then(function(x){x.http=r.status;return x;});
      }).then(function(x){
        if(x.updated){ render(x); try{ localStorage.setItem(DATA,JSON.stringify(x)); }catch(e){} return; }
        var m=x.error||(x.http===401?"key not accepted":"error "+x.http);
        msg("Recovery data unavailable: "+String(m).replace(/[<&]/g,""));   // keeps the last good numbers if shown
      }).catch(function(e){ msg("Recovery data unavailable: no connection to the server"); });
    }
    load();
    document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="visible"&&Date.now()-last>60000) load(); });
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
