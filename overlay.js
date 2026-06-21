/* Transparent overlay for OBS Browser Source. Subscribes to the room's state
   over MQTT and re-renders on every update. */

(function(){
  let STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
  const $=s=>document.querySelector(s);
  const el=(t,c,h)=>{const n=document.createElement(t);if(c)n.className=c;if(h!=null)n.innerHTML=h;return n;};
  const fmt=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
  const ini=n=>n.replace(/[^A-Za-z0-9]/g,"").slice(0,2).toUpperCase()||"–";
  const mtw=bo=>Math.ceil((bo||1)/2);

  function ultPips(p){const w=el("div","ult"+(p.ultCur>=p.ultMax?" ready":""));for(let i=0;i<p.ultMax;i++)w.appendChild(el("div","pip"+(i<p.ultCur?" full":"")));return w;}
  function abRow(p){const w=el("div","abilities");[["C",p.abilities.c],["Q",p.abilities.q],["E",p.abilities.e]].forEach(([k,o])=>w.appendChild(el("div","ab"+(o?" on":""),k)));return w;}
  function shRow(n){const w=el("div","shield");for(let i=0;i<2;i++)w.appendChild(el("div","s"+(i<n?" on":"")));return w;}
  function card(p,color){
    const c=el("div","pcard"+(p.alive?"":" dead"));c.style.setProperty("--side",color);
    c.appendChild(el("div","agent",`<span>${ini(p.agent)}</span>`));
    const b=el("div","pbody");
    const r1=el("div","prow1");r1.append(el("div","pname",p.name),ultPips(p));b.appendChild(r1);
    const r2=el("div","prow2");const w=el("div","weapon",`<span style="font-size:15px">▮</span><span>${p.weapon}</span>`);
    const right=el("div");right.style.cssText="display:flex;gap:8px;align-items:center";right.append(abRow(p),el("div","credits",String(p.credits)));
    r2.append(w,right);b.appendChild(r2);
    const r3=el("div","prow3");const hp=el("div","hpbar");hp.appendChild(Object.assign(el("i"),{style:`width:${p.hp}%`}));r3.append(hp,shRow(p.shield));b.appendChild(r3);
    c.appendChild(b);return c;
  }
  function render(){
    const s=STATE,stage=$("#stage");stage.innerHTML="";
    document.documentElement.style.setProperty("--team-a",s.teams.A.color);
    document.documentElement.style.setProperty("--team-b",s.teams.B.color);
    const bar=el("div","scorebar");
    const tb=(t,k)=>{const x=el("div","team "+(k==="A"?"left":"right"));
      const wrap=el("div","logowrap");const lg=el("div","logo");
      if(t.logo)lg.appendChild(Object.assign(new Image(),{src:t.logo}));else lg.textContent=t.tricode.slice(0,3);
      wrap.appendChild(lg);
      const need=mtw(s.match.bestOf);
      if(need>1){const mp=el("div","mappips");for(let i=0;i<need;i++){const d=el("div","mp"+(i<(t.mapsWon||0)?" won":""));if(i<(t.mapsWon||0)){d.style.background=t.color;d.style.borderColor=t.color;d.style.color=t.color;}mp.appendChild(d);}wrap.appendChild(mp);}
      const m=el("div","meta");m.append(el("div","tricode",t.tricode),el("div","team-name",t.name));x.append(wrap,m);return x;};
    const tag=mode=>{const t=el("div","side-tag "+mode);t.append(el("div","ico",mode==="atk"?"⚔":"🛡"),document.createTextNode(mode==="atk"?"ATK":"DEF"));return t;};
    const center=el("div","center");center.appendChild(el("div","phase-tag",s.match.phase));
    const danger=!s.match.spike&&s.match.timer<=10&&s.match.phase!=="POST";
    center.appendChild(el("div","timer"+(s.match.spike?" spike":(danger?" danger":"")),fmt(s.match.timer)));
    const rl=el("div","round-line");rl.append(el("span",null,"RND "+s.match.round),el("span","map",s.match.map));center.appendChild(rl);
    const aS=s.match.attackingSide==="A"?"atk":"def",bS=s.match.attackingSide==="B"?"atk":"def";
    bar.append(tb(s.teams.A,"A"),el("div","score a",String(s.teams.A.score)),tag(aS),center,tag(bS),el("div","score b",String(s.teams.B.score)),tb(s.teams.B,"B"));
    stage.appendChild(bar);
    if(!s.ui||s.ui.showRails!==false){
      const rA=el("div","rail left");s.players.A.forEach(p=>rA.appendChild(card(p,s.teams.A.color)));stage.appendChild(rA);
      const rB=el("div","rail right");s.players.B.forEach(p=>rB.appendChild(card(p,s.teams.B.color)));stage.appendChild(rB);
    }
    const cam=el("div","camslot"+(s.cam.on?" on":""));cam.style.setProperty("--side-cam",s.cam.team==="A"?s.teams.A.color:s.teams.B.color);
    if(s.cam.team==="B"){cam.style.left="auto";cam.style.right="28px";cam.style.clipPath="polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%)";}
    cam.append(el("div","camfill","WEBCAM SOURCE"),el("div","camlabel",s.cam.label));stage.appendChild(cam);
  }

  // preview backdrop when opened directly (not in OBS): add ?bg=1
  if(new URLSearchParams(location.search).get("bg")==="1") document.body.classList.add("show-bg");

  render();
  Sync.start(Sync.getRoom(), st=>{ STATE=st; render(); });
})();
