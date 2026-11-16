(function(){
  // Any element with data-print="<pdoc id>" prints only that layout.
  // data-print="current-week" resolves to this week's sheet.
  var root=document.documentElement;
  function q(s,c){return (c||document).querySelector(s);}
  function qa(s,c){return [].slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function clean(n){ n=n.cloneNode(true); n.removeAttribute("id"); qa("[id]",n).forEach(function(x){x.removeAttribute("id");});
    qa(".pbtn,.seg,button",n).forEach(function(x){x.remove();}); return n; }

  function currentWeek(){
    var d=new Date(), iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    var ws=qa("#weeklist .week"), hit=ws.filter(function(w){return iso>=w.dataset.start&&iso<=w.dataset.end;})[0];
    if(!hit) hit=(ws.length&&iso<ws[0].dataset.start)?ws[0]:ws[ws.length-1];
    return hit?"print-"+hit.id:null;
  }

  var BOXES=function(n){var s="";for(var i=0;i<n;i++)s+='<span class="pbox"></span>';return s;};
  var builders={
    strength:function(slot){
      var WK=4, out=[];
      qa("#view-strength .sc").forEach(function(sc){
        var rows=[];
        qa(".blk2",sc).forEach(function(b){
          var lbl=q(".bl b",b), rnd=q(".bl span",b), nums=((rnd&&rnd.textContent)||"").match(/\d+/g)||["3"];
          var n=Math.max.apply(null,nums.map(Number));
          var wk=""; for(var i=0;i<WK;i++) wk+='<td class="wk"></td>';
          rows.push('<tr class="grp"><td colspan="3">'+esc(lbl&&lbl.textContent)+' · '+esc(rnd&&rnd.textContent)+'</td>'+wk+'</tr>');
          qa(".exs li",b).forEach(function(li){
            var em=q("em",li), nm=q(".en span",li), cue=q(".en small",li), dose=q(".ed",li), c="";
            for(var i=0;i<WK;i++) c+='<td class="wk">'+BOXES(n)+'</td>';
            rows.push('<tr><td class="no">'+esc(em?em.textContent:"")+'</td><td class="ex"><b>'+esc(nm&&nm.textContent)+'</b>'+(cue?'<small>'+esc(cue.textContent)+'</small>':'')+'</td><td class="do">'+esc(dose&&dose.textContent)+'</td>'+c+'</tr>');
          });
        });
        var hd=q(".sch",sc), tag=q(".smeta .tag",sc), dur=q(".dur",sc), why=q(".why",sc), th="";
        for(var i=1;i<=WK;i++) th+='<th class="wk">Date ___</th>';
        out.push('<div class="pss"><header><span class="sl">'+esc(q(".sl",hd).textContent)+'</span><span class="sn">'+esc(q("div b",hd).textContent)+'</span><span class="sf">'+esc(q(":scope>div:not(.smeta) span",hd).textContent)+'</span><span class="sm">'+esc(tag&&tag.textContent)+' · '+esc(dur&&dur.textContent)+'</span></header>'+
          '<table><colgroup><col class="c-no"><col><col class="c-do">'+Array(WK+1).join('<col class="c-wk">')+'</colgroup><thead><tr><th></th><th>Exercise</th><th>Dose</th>'+th+'</tr></thead><tbody>'+rows.join("")+'</tbody></table>'+
          (why?'<p class="why">'+esc(why.textContent)+'</p>':'')+'</div>');
      });
      slot.innerHTML=out.join("");
    }
  };

  function prepare(doc){
    qa("[data-clone]",doc).forEach(function(s){ s.innerHTML="";
      qa(s.dataset.clone).forEach(function(src){ var n=clean(src); if(n.tagName==="LI"){var u=document.createElement("ul");u.appendChild(n);n=u;} s.appendChild(n); }); });
    qa("[data-clone-panels]",doc).forEach(function(s){ s.innerHTML=""; qa(s.dataset.clonePanels).forEach(function(src){ s.appendChild(clean(src)); }); });
    qa("[data-build]",doc).forEach(function(s){ var b=builders[s.dataset.build]; if(b) b(s); });
    var d=new Date(); qa(".pdate",doc).forEach(function(n){ n.textContent="Printed "+d.getDate()+" "+d.toLocaleString("en-GB",{month:"short"})+" "+d.getFullYear(); });
  }
  function choose(id){
    if(id==="current-week") id=currentWeek();
    var doc=id&&document.getElementById(id); if(!doc) return false;
    qa(".pdoc.on").forEach(function(x){x.classList.remove("on");});
    prepare(doc); doc.classList.add("on"); root.classList.add("printing"); return true;
  }
  function reset(){ root.classList.remove("printing"); qa(".pdoc.on").forEach(function(x){x.classList.remove("on");}); }

  document.addEventListener("click",function(ev){
    var b=ev.target.closest("[data-print]"); if(!b) return;
    ev.preventDefault(); ev.stopPropagation();
    if(choose(b.dataset.print)) window.print();
  });
  // Ctrl/Cmd+P without a button: pick the layout that matches the open tab.
  window.addEventListener("beforeprint",function(){
    if(root.classList.contains("printing")) return;
    var v=qa(".view").filter(function(x){return !x.hidden;})[0], id=v&&v.id;
    choose(id==="view-strength"?"print-strength":id==="view-weeks"?"print-plan":"current-week");
  });
  window.addEventListener("afterprint",reset);
})();
