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
