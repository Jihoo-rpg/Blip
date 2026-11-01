/* 폰 공장 타이쿤 — 광고 영상 만들기
   장면을 골라 순서대로 놓고, 자막 · 배경 · 음악을 정하면 3D 광고 영상이 만들어져요.
   「영상 저장」을 누르면 진짜 동영상 파일로 저장돼요. */
'use strict';
const AD_SCENES=[
 {id:'spin',n:'360° 회전',i:'🔄',cat:'des'},{id:'cam',n:'카메라 클로즈업',i:'📸',cat:'cam'},{id:'chip',n:'칩 공개',i:'🧠',cat:'perf'},
 {id:'screen',n:'화면 자랑',i:'🖥️',cat:'scr'},{id:'batt',n:'배터리',i:'🔋',cat:'bat'},{id:'fold',n:'접기 · 펼치기',i:'📖',cat:'fold'},
 {id:'colors',n:'색상 공개',i:'🎨',cat:'des'},{id:'feat',n:'기능 소개',i:'✨',cat:'fea'},{id:'tough',n:'떨어뜨리기 테스트',i:'💪',cat:'dur'},
 {id:'price',n:'가격 공개',i:'💰',cat:'price'},{id:'logo',n:'로고 엔딩',i:'🏁',cat:'end'}];
const AD_BG=[{id:'neon',n:'🌃 네온'},{id:'space',n:'🌌 우주'},{id:'white',n:'⬜ 미니멀'},{id:'sunset',n:'🌅 노을'}];
const AD_MUSIC=[{id:'edm',n:'🎧 신나는 EDM'},{id:'epic',n:'🎻 웅장한 오케스트라'},{id:'piano',n:'🎹 감성 피아노'},{id:'none',n:'🔇 음악 없음'}];
const AD_CH=[{id:'sns',n:'📱 SNS 쇼츠',c:2e7,h:.35,v:3e5},{id:'yt',n:'▶️ 유튜브 광고',c:8e7,h:.8,v:1.5e6},{id:'tv',n:'📺 TV 광고',c:3e8,h:1.5,v:8e6},{id:'cup',n:'🏟️ 월드컵 중계 광고',c:1.5e9,h:2.6,v:4e7}];
const SCENE_LEN=2.6;

function adDefaults(pr){const d=pr.d;const ch=pr.chip?S.chips.find(c=>c.id===pr.chip):null;const st=ch?chipStats(ch):null;
  const main=(d.cams||[])[0];const mp=main?L('sensor',main.sensor).mp:0;const f=L('form',d.form);
  const feats=(d.feats||[]).map(id=>L('feat',id)).sort((a,b)=>b.s-a.s).slice(0,2).map(x=>x.n);
  return {spin:d.name||'새 폰',cam:mp?`${mp>=1?mp:mp.toFixed(1)}MP 카메라${(d.cams||[]).length>1?' · 렌즈 '+d.cams.length+'개':''}`:'카메라',chip:ch?`${ch.name} · ${st.cnt.P+st.cnt.E}코어`:'초고속 칩',
    screen:`${(d.size||2).toFixed(1)}인치 ${L('panel',d.panel).n}${L('hz',d.hz).id!=='60'?' '+L('hz',d.hz).n:''}`,batt:`${d.mah}mAh · ${L('chg',d.chg).n} 충전`,
    fold:f.novel||f.fold?`${f.n}`:'접히는 폰',colors:'당신의 색을 고르세요',feat:feats.join(' · ')||'똑똑한 기능',tough:`${L('mat',d.mat).n} 바디`,price:'가격 공개!',logo:S.name};}
function newAd(pr){const df=adDefaults(pr);return {fmt:'v',bg:'neon',music:'edm',slogan:'',ch:'sns',scenes:['spin','cam','chip','logo'].map(id=>({id,text:df[id]}))};}
function adScore(pr){const ad=pr.ad,d=pr.d;const ap=appeal(d);const n=ap.norm;const out={score:40,good:[],bad:[]};const sc=ad.scenes;
  if(!sc.length){out.score=0;out.bad.push('장면이 하나도 없어요');return out;}
  const f=L('form',d.form);const df=adDefaults(pr);const seen={};
  sc.forEach((s,i)=>{const A=AD_SCENES.find(a=>a.id===s.id);if(seen[s.id]){out.score-=6;out.bad.push(`「${A.n}」가 두 번 나와요`);return;}seen[s.id]=1;
    if(n[A.cat]!=null){const v=n[A.cat];const p=Math.round((v-.72)*55);out.score+=p;if(p>=6)out.good.push(`${A.i} ${A.n}: 이 폰의 강점이라 효과 최고 (+${p})`);else if(p<=-6)out.bad.push(`${A.i} ${A.n}: 이 폰은 이게 약해서 오히려 손해 (${p})`);}
    else if(A.cat==='fold'){if(f.novel||f.fold){out.score+=14;out.good.push('📖 접히는 장면: 사람들이 신기해해요 (+14)');}else{out.score-=10;out.bad.push('📖 이 폰은 안 접혀요! (−10)');}}
    else if(A.cat==='price'){const r=(pr.price||0)/fairPrice(d,ap.a);if(!pr.price){out.score+=2;}else if(r<=.95){out.score+=14;out.good.push('💰 가격이 싸서 가격 공개가 효과 만점 (+14)');}else if(r>1.1){out.score-=10;out.bad.push('💰 비싼 가격을 광고에서 보여줬어요 (−10)');}}
    else if(A.cat==='end'){if(i===sc.length-1){out.score+=8;out.good.push('🏁 마지막에 로고로 끝나서 기억에 남아요 (+8)');}else{out.score-=4;out.bad.push('🏁 로고 엔딩은 맨 끝에 두세요');}}
    if(s.text&&s.text!==df[s.id]&&s.text.trim().length>=3)out.score+=2;});
  const k=sc.length;if(k<3){out.score-=12;out.bad.push('장면이 너무 적어요 (3개 이상)');}else if(k>7){out.score-=(k-7)*6;out.bad.push('광고가 너무 길어서 사람들이 넘겨요');}else out.good.push(`🎬 길이 딱 좋아요 (${(k*SCENE_LEN).toFixed(0)}초)`);
  if(ad.music==='none'){out.score-=8;out.bad.push('🔇 음악이 없으면 심심해요 (−8)');}
  else{const fit=ad.music==='edm'?(f.id==='gaming'||n.perf>1):ad.music==='epic'?ap.a>.95:(n.des>1||n.cam>1);if(fit){out.score+=6;out.good.push('🎵 음악이 폰 분위기랑 잘 맞아요 (+6)');}}
  if(ad.slogan&&ad.slogan.trim().length>=4){out.score+=5;out.good.push('✍️ 슬로건이 있어요 (+5)');}else out.bad.push('✍️ 슬로건을 써 보세요');
  out.score=Math.round(clamp(out.score,0,100));return out;}

/* ---------- 음악 (WebAudio로 직접 만들어요) ---------- */
function startMusic(kind,dur,dest){const AC=window.AudioContext||window.webkitAudioContext;if(!AC||kind==='none')return null;const ctx=new AC();const out=ctx.createGain();out.gain.value=.55;out.connect(ctx.destination);
  let rec=null;if(dest){rec=ctx.createMediaStreamDestination();out.connect(rec);}
  const t0=ctx.currentTime+.08;const noise=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate);const nd=noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const env=(g,t,a,peak,dcy)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0008,t+a+dcy);};
  const osc=(t,f,len,type,vol,fEnd)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(fEnd)o.frequency.exponentialRampToValueAtTime(fEnd,t+len);env(g,t,.005,vol,len);o.connect(g);g.connect(out);o.start(t);o.stop(t+len+.05);};
  const nz=(t,len,vol,hp)=>{const s=ctx.createBufferSource();s.buffer=noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=ctx.createGain();env(g,t,.002,vol,len);s.connect(f);f.connect(g);g.connect(out);s.start(t);s.stop(t+len+.05);};
  const pad=(t,fs,len,vol,type='sawtooth',cut=1200)=>{const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+len*.25);g.gain.linearRampToValueAtTime(0,t+len);f.connect(g);g.connect(out);
    for(const fr of fs)for(const det of [-6,6]){const o=ctx.createOscillator();o.type=type;o.frequency.value=fr;o.detune.value=det;o.connect(f);o.start(t);o.stop(t+len+.05);}};
  const CH=[[220,261.6,329.6],[174.6,220,261.6],[261.6,329.6,392],[196,246.9,293.7]];
  if(kind==='edm'){const b=60/124;let bar=0;for(let t=t0;t<t0+dur;t+=b*4,bar++){const c=CH[bar%4];
      for(let k=0;k<4;k++){osc(t+k*b,150,.28,'sine',.9,40);nz(t+k*b+b/2,.05,.25,7000);if(k%2)nz(t+k*b,.15,.35,1800);}
      for(let k=0;k<8;k++)osc(t+k*b/2,c[0]/2,b/2*.9,'sawtooth',.16);
      for(let k=0;k<16;k++)osc(t+k*b/4,c[k%3]*2,b/4*.8,'square',.045);
      pad(t,c.map(x=>x*2),b*4,.05);}}
  else if(kind==='epic'){const b=60/90;let bar=0;for(let t=t0;t<t0+dur;t+=b*4,bar++){const c=CH[bar%4];pad(t,[c[0]/2,...c],b*4,.09,'sawtooth',900);
      osc(t,110,.5,'sine',.9,45);osc(t+b*2,110,.5,'sine',.8,45);osc(t+b*3.5,140,.3,'sine',.5,60);nz(t,.6,.12,300);
      osc(t,c[0],b*1.2,'square',.05);osc(t,c[2],b*1.2,'square',.04);}}
  else{const b=60/78;let bar=0;for(let t=t0;t<t0+dur;t+=b*4,bar++){const c=CH[bar%4];pad(t,c,b*4,.04,'sine',600);
      const arp=[c[0],c[1],c[2],c[1]*2,c[2],c[1],c[0]*2,c[2]];arp.forEach((f,k)=>osc(t+k*b/2,f*2,b*1.6,'triangle',.13));osc(t,c[0]/2,b*3,'sine',.18);}}
  return {ctx,stream:rec?rec.stream:null,stop(){try{out.gain.setTargetAtTime(0,ctx.currentTime,.1);setTimeout(()=>ctx.close(),400);}catch(e){}}};}

/* ---------- 영상 그리기 ---------- */
function easeOut(u){return 1-Math.pow(1-u,3);}
function adDraw(g,R,pr,tm,W,H,cache){const ad=pr.ad,sc=ad.scenes;const total=sc.length*SCENE_LEN;const t=Math.min(tm,total-0.001);const si=Math.max(0,Math.floor(t/SCENE_LEN)),u=(t-si*SCENE_LEN)/SCENE_LEN;const s=sc[si];const d=pr.d;
  // 배경
  const bg=ad.bg;
  if(bg==='white'){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#f4f6fa');gr.addColorStop(1,'#d9dee8');g.fillStyle=gr;g.fillRect(0,0,W,H);}
  else if(bg==='sunset'){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#2b1055');gr.addColorStop(.55,'#d53369');gr.addColorStop(1,'#f8b500');g.fillStyle=gr;g.fillRect(0,0,W,H);g.fillStyle='rgba(255,230,150,.35)';g.beginPath();g.arc(W/2,H*.78,Math.min(W,H)*.32,0,7);g.fill();}
  else if(bg==='space'){g.fillStyle='#04050d';g.fillRect(0,0,W,H);if(!cache.stars){cache.stars=[];for(let i=0;i<160;i++)cache.stars.push([Math.random(),Math.random(),Math.random()]);}
    for(const [x,y,z] of cache.stars){const px=((x-.5)/(1.2-((z+tm*.05)%1))*.5+.5)*W,py=((y-.5)/(1.2-((z+tm*.05)%1))*.5+.5)*H;g.fillStyle=`rgba(255,255,255,${.3+z*.7})`;g.fillRect(px,py,1.5+z*1.5,1.5+z*1.5);}
    const neb=g.createRadialGradient(W*.3,H*.3,0,W*.3,H*.3,W*.7);neb.addColorStop(0,'rgba(124,92,255,.35)');neb.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=neb;g.fillRect(0,0,W,H);}
  else{g.fillStyle='#07060f';g.fillRect(0,0,W,H);for(let i=0;i<3;i++){const x=W*(.5+Math.sin(tm*.6+i*2.1)*.35),y=H*(.5+Math.cos(tm*.5+i*1.7)*.3);const gr=g.createRadialGradient(x,y,0,x,y,Math.max(W,H)*.5);gr.addColorStop(0,['rgba(255,0,170,.35)','rgba(0,200,255,.3)','rgba(124,92,255,.35)'][i]);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);}
    g.strokeStyle='rgba(0,220,255,.18)';g.lineWidth=1;const hz=H*.72;for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(W/2+i*W*.04,hz);g.lineTo(W/2+i*W*.25,H);g.stroke();}for(let k=0;k<8;k++){const yy=hz+Math.pow(((k+tm*1.5)%8)/8,2)*(H-hz);g.beginPath();g.moveTo(0,yy);g.lineTo(W,yy);g.stroke();}}
  const dark=bg!=='white';const ink=dark?'#fff':'#111';
  // 3D 폰
  const P={yaw:-.4,pitch:-.05,zoom:1,open:1,ci:0,y:0};let show3d=true;
  if(s.id==='spin'){P.yaw=-.4+easeOut(u)*Math.PI*2;}
  else if(s.id==='cam'){P.yaw=Math.PI-.25+u*.25;P.focus='island';P.fk=Math.min(1,u*2);P.zoom=1+easeOut(u)*1.3;}
  else if(s.id==='chip'){show3d=false;}
  else if(s.id==='screen'){P.yaw=-.25+u*.25;P.zoom=1.05+u*.35;}
  else if(s.id==='batt'){P.yaw=-.55+u*.4;P.zoom=.9;P.y=-1;}
  else if(s.id==='fold'){P.yaw=-.6+u*.3;P.open=u<.45?1-u/.45:u<.55?0:(u-.55)/.45;}
  else if(s.id==='colors'){P.ci=Math.floor(u*4);P.yaw=Math.PI-.4+Math.sin(u*Math.PI)*.4;}
  else if(s.id==='feat'){P.yaw=-.9+u*1.4;P.zoom=.95;}
  else if(s.id==='tough'){const fall=u<.35?u/.35:1;P.y=(1-fall*fall)*14-0;P.roll=u>.35&&u<.5?Math.sin((u-.35)*80)*.15*(1-(u-.35)/.15):0;P.yaw=-.4+u*.6;}
  else if(s.id==='price'){P.yaw=-.3;P.zoom=.85;P.y=1.2;}
  else if(s.id==='logo'){P.yaw=-.35+u*.3;P.zoom=.55;P.y=2.5;}
  if(show3d&&R){const c=R.frame(P);const sz=Math.min(W,H);g.drawImage(c,0,0,W,H);}
  // 칩 장면
  if(s.id==='chip'&&cache.chipPkg){const k=easeOut(Math.min(1,u*1.6));const sz=Math.min(W,H)*.62;g.save();g.translate(W/2,H*.44);g.rotate((1-k)*1.2);g.scale(.4+k*.6,.4+k*.6);
    const glow=g.createRadialGradient(0,0,0,0,0,sz);glow.addColorStop(0,'rgba(120,180,255,.55)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(-sz,-sz,sz*2,sz*2);
    g.drawImage(u<.55?cache.chipPkg:cache.chipDie,-sz/2,-sz/2,sz,sz);g.restore();
    if(u>.5){g.globalAlpha=Math.min(1,(u-.5)*4);g.fillStyle=ink;g.font=`700 ${W*.035}px sans-serif`;g.textAlign='center';const st=cache.chipSt;if(st)g.fillText(`CPU ${st.cnt.P+st.cnt.E}코어 · GPU ${st.cnt.G*4}코어${st.cnt.N?' · AI '+st.cnt.N:''}`,W/2,H*.44+sz*.62);g.globalAlpha=1;}}
  if(s.id==='batt'){const k=Math.min(1,u*1.3);const bw=W*.28,bh=bw*.5,x=W/2-bw/2,y=H*.66;g.strokeStyle=ink;g.lineWidth=W*.008;g.strokeRect(x,y,bw,bh);g.fillStyle=ink;g.fillRect(x+bw,y+bh*.3,bw*.06,bh*.4);
    const gr=g.createLinearGradient(x,0,x+bw,0);gr.addColorStop(0,'#3ddc84');gr.addColorStop(1,'#b6ff6a');g.fillStyle=gr;g.fillRect(x+bw*.05,y+bh*.12,(bw*.9)*k,bh*.76);g.fillStyle=ink;g.font=`900 ${W*.05}px sans-serif`;g.textAlign='center';g.fillText(Math.round(k*100)+'%',W/2,y+bh+W*.07);}
  if(s.id==='tough'&&u>.35&&u<.45){g.fillStyle=`rgba(255,255,255,${(1-(u-.35)/.1)*.6})`;g.fillRect(0,0,W,H);}
  // 자막
  const txt=(s.text||'').trim();const ins=easeOut(Math.min(1,u*3));const outA=u>.85?1-(u-.85)/.15:1;
  g.save();g.globalAlpha=ins*outA;g.textAlign='center';g.textBaseline='middle';
  const big=s.id==='price'&&pr.price?won(pr.price):s.id==='logo'?(S.name||''):txt;
  const fs=Math.min(W*.09,H*.075)*(big.length>12?.75:1);g.font=`900 ${fs}px "Black Han Sans","Arial Black",sans-serif`;
  const ty=s.id==='logo'?H*.62:s.id==='price'?H*.8:(W<H?H*.13:H*.16);
  g.fillStyle=dark?'rgba(0,0,0,.35)':'rgba(255,255,255,.4)';g.fillText(big,W/2+3,ty+(1-ins)*30+3);
  const tg=g.createLinearGradient(0,ty-fs/2,0,ty+fs/2);tg.addColorStop(0,dark?'#fff':'#111');tg.addColorStop(1,dark?(bg==='sunset'?'#ffe29a':'#9ad8ff'):'#3b3f4a');g.fillStyle=tg;g.fillText(big,W/2,ty+(1-ins)*30);
  if(s.id==='logo'||s.id==='price'){g.font=`700 ${fs*.42}px sans-serif`;g.fillStyle=ink;g.fillText(s.id==='logo'?(ad.slogan||txt):txt,W/2,ty+fs*.85);}
  else if(s.id!=='spin'&&W<H){g.font=`700 ${fs*.38}px sans-serif`;g.fillStyle=dark?'rgba(255,255,255,.75)':'rgba(0,0,0,.6)';g.fillText(d.name||'',W/2,ty+fs*.8);}
  g.restore();
  // 장면 전환 번쩍
  const edge=Math.min(u,1-u)*SCENE_LEN;if(edge<.12&&si>0&&u<.5){g.fillStyle=`rgba(255,255,255,${(1-edge/.12)*.7})`;g.fillRect(0,0,W,H);}
  // 구석 로고
  g.font=`800 ${W*.028}px sans-serif`;g.textAlign='right';g.fillStyle=dark?'rgba(255,255,255,.55)':'rgba(0,0,0,.45)';g.fillText(S.name||'',W-W*.03,H-W*.03);
  return {si,u,total};}

/* ---------- 광고 만들기 화면 ---------- */
let AD=null; // {R, raf, playing, music, rec, cache}
function adSize(fmt){return fmt==='v'?[360,640]:[640,360];}
function adCleanup(){if(!AD)return;cancelAnimationFrame(AD.raf);if(AD.music)AD.music.stop();if(AD.R)AD.R.dispose();AD=null;}
function renderAdStep(box,pr){if(!pr.ad)pr.ad=newAd(pr);const ad=pr.ad;const df=adDefaults(pr);const sco=adScore(pr);const canFold=window.P3&&P3.canOpen(pr.d);
  const [W,H]=adSize(ad.fmt);
  box.innerHTML=`<div id="adWrap"><div class="card" id="adStage"><div class="adScreen ${ad.fmt}"><canvas id="adCv" width="${W}" height="${H}"></canvas><div class="adBadge" id="adBadge">${(ad.scenes.length*SCENE_LEN).toFixed(0)}초</div></div>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" id="adPlay">▶ 재생</button><button class="btn alt" id="adRec">💾 영상 저장</button><button class="btn alt sm" id="adFmt">${ad.fmt==='v'?'📱 세로':'🖥️ 가로'}</button></div>
    <small class="muted" style="display:block;text-align:center;margin-top:6px" id="adMsg">소리가 나와요 🔊</small></div>
   <div class="grid" style="gap:10px">
    <div class="card"><b>🎬 장면 순서 <small class="muted">(누른 순서대로 나와요 · 장면마다 ${SCENE_LEN}초)</small></b>
     <div id="adTL">${ad.scenes.map((s,i)=>{const A=AD_SCENES.find(a=>a.id===s.id);return `<div class="tl"><span class="no">${i+1}</span><span class="ic">${A.i}</span><div style="flex:1;min-width:0"><b>${A.n}</b><input type="text" data-adtxt="${i}" value="${esc(s.text||'')}" maxlength="24" placeholder="자막"></div>
       <div class="tlb"><button data-adup="${i}" ${i===0?'disabled':''}>▲</button><button data-addn="${i}" ${i===ad.scenes.length-1?'disabled':''}>▼</button><button data-addel="${i}">✕</button></div></div>`;}).join('')||'<p class="muted">아래에서 장면을 추가하세요</p>'}</div>
     <div class="pal2">${AD_SCENES.filter(a=>a.id!=='fold'||canFold).map(a=>`<button class="chipBtn" data-adadd="${a.id}">${a.i} ${a.n}</button>`).join('')}</div></div>
    <div class="card grid" style="gap:10px">
     <div class="field" style="margin:0"><label>배경</label><div class="row">${AD_BG.map(b=>`<button class="btn sm ${ad.bg===b.id?'':'alt'}" data-adbg="${b.id}">${b.n}</button>`).join('')}</div></div>
     <div class="field" style="margin:0"><label>음악</label><div class="row">${AD_MUSIC.map(b=>`<button class="btn sm ${ad.music===b.id?'':'alt'}" data-admu="${b.id}">${b.n}</button>`).join('')}</div></div>
     <div class="field" style="margin:0"><label>슬로건 <small class="muted">로고 엔딩에 나와요</small></label><input type="text" id="adSlogan" maxlength="24" value="${esc(ad.slogan||'')}" placeholder="예: 세상을 접다"></div></div>
    <div class="card" id="adScoreBox">${adScoreHTML(sco)}</div>
    <div class="card grid" style="gap:8px"><b>📡 어디에 광고할까요?</b>${AD_CH.map(c=>{const k=1+(S.year-2000)*.06;const cost=c.c*k;return `<button class="chk ${ad.ch===c.id?'on':''}" data-adch="${c.id}"><span>${ad.ch===c.id?'✅':'⬜'}</span><div><b>${c.n}</b><small>예상 조회수 ${Math.round(c.v*sco.score/100/1e4).toLocaleString('ko-KR')}만 회 · 판매 열기 +${Math.round(c.h*Math.pow(sco.score/100,1.4)*100)}%</small></div><span class="cost">${won(cost)}</span></button>`;}).join('')}
     <button class="btn good" id="adGo" style="font-size:16px;padding:13px">📣 광고 내보내기</button><button class="btn alt sm" id="adSkip">광고 없이 출시하기</button></div>
   </div></div>`;
  // 렌더러 준비
  if(!AD||AD.fmt!==ad.fmt||!AD.R){adCleanup();AD={fmt:ad.fmt,cache:{},raf:0};if(window.P3&&P3.adRenderer){try{AD.R=P3.adRenderer(W,H);}catch(e){AD.R=null;}}}
  if(AD.R){const cols=[pr.d.color,...COLORS.filter(c=>c!==pr.d.color).slice(0,3)];AD.R.set(pr.d,S.name,cols);}
  const ch=pr.chip?S.chips.find(c=>c.id===pr.chip):null;if(ch){const a=document.createElement('canvas');a.width=a.height=400;drawPackage(a.getContext('2d'),ch,400,400,S.name);const b=document.createElement('canvas');b.width=b.height=400;drawDie(b.getContext('2d'),ch,400,400,{bg:'rgba(0,0,0,0)'});AD.cache.chipPkg=a;AD.cache.chipDie=b;AD.cache.chipSt=chipStats(ch);}
  const cv=$('#adCv'),g=cv.getContext('2d');
  const poster=()=>{if(!ad.scenes.length){g.fillStyle='#111';g.fillRect(0,0,W,H);return;}adDraw(g,AD.R,pr,SCENE_LEN*.7,W,H,AD.cache);};poster();
  const rescore=()=>{$('#adScoreBox').innerHTML=adScoreHTML(adScore(pr));};
  const rerender=()=>{stopPlay();renderAdStep(box,pr);save();};
  function stopPlay(){if(!AD)return;cancelAnimationFrame(AD.raf);AD.playing=false;if(AD.music){AD.music.stop();AD.music=null;}}
  function play(record){if(!ad.scenes.length){toast('장면을 먼저 넣어요');return;}stopPlay();const total=ad.scenes.length*SCENE_LEN;
    AD.music=startMusic(ad.music,total+.5,record);let recd=null,chunks=[];
    if(record){if(!cv.captureStream||!window.MediaRecorder){toast('이 브라우저는 영상 저장을 못 해요 😢');return;}
      const vs=cv.captureStream(30);const tracks=[...vs.getVideoTracks(),...(AD.music&&AD.music.stream?AD.music.stream.getAudioTracks():[])];const ms=new MediaStream(tracks);
      const types=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];const mt=types.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
      try{recd=new MediaRecorder(ms,mt?{mimeType:mt,videoBitsPerSecond:4e6}:undefined);}catch(e){toast('영상 저장을 시작할 수 없어요');return;}
      recd.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
      recd.onstop=()=>{const type=recd.mimeType||mt||'video/webm';const blob=new Blob(chunks,{type});const ext=type.includes('mp4')?'mp4':'webm';const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${(pr.d.name||'광고').replace(/[\\/:*?"<>|]/g,'')}_광고.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        $('#adMsg')&&($('#adMsg').textContent=`💾 저장했어요! (${ext.toUpperCase()} · ${(blob.size/1e6).toFixed(1)}MB)`);toast('💾 광고 영상을 저장했어요!');};
      recd.start(200);$('#adMsg').textContent='🔴 녹화 중… 끝날 때까지 기다려요';}
    AD.playing=true;const st=performance.now();
    const step=()=>{if(!AD||!AD.playing)return;const tm=(performance.now()-st)/1000;adDraw(g,AD.R,pr,tm,W,H,AD.cache);const b=$('#adBadge');if(b)b.textContent=`${Math.min(tm,total).toFixed(1)} / ${total.toFixed(0)}초`;
      if(tm>=total){AD.playing=false;if(AD.music){AD.music.stop();AD.music=null;}if(recd&&recd.state!=='inactive')setTimeout(()=>recd.stop(),150);const pb=$('#adPlay');if(pb)pb.textContent='▶ 다시 재생';return;}
      AD.raf=requestAnimationFrame(step);};step();$('#adPlay').textContent='⏹ 멈추기';}
  $('#adPlay').onclick=()=>{if(AD.playing){stopPlay();$('#adPlay').textContent='▶ 재생';poster();}else play(false);};
  $('#adRec').onclick=()=>play(true);
  $('#adFmt').onclick=()=>{ad.fmt=ad.fmt==='v'?'h':'v';adCleanup();rerender();};
  $$('[data-adtxt]').forEach(el=>el.oninput=()=>{ad.scenes[+el.dataset.adtxt].text=el.value;rescore();if(!AD.playing)poster();});
  $$('[data-adup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.adup;[ad.scenes[i-1],ad.scenes[i]]=[ad.scenes[i],ad.scenes[i-1]];rerender();});
  $$('[data-addn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.addn;[ad.scenes[i+1],ad.scenes[i]]=[ad.scenes[i],ad.scenes[i+1]];rerender();});
  $$('[data-addel]').forEach(b=>b.onclick=()=>{ad.scenes.splice(+b.dataset.addel,1);rerender();});
  $$('[data-adadd]').forEach(b=>b.onclick=()=>{if(ad.scenes.length>=9){toast('장면은 9개까지');return;}const id=b.dataset.adadd;const li=ad.scenes.findIndex(s=>s.id==='logo');const sc={id,text:df[id]};if(li>=0&&li===ad.scenes.length-1&&id!=='logo')ad.scenes.splice(li,0,sc);else ad.scenes.push(sc);rerender();});
  $$('[data-adbg]').forEach(b=>b.onclick=()=>{ad.bg=b.dataset.adbg;rerender();});
  $$('[data-admu]').forEach(b=>b.onclick=()=>{ad.music=b.dataset.admu;rerender();});
  $('#adSlogan').oninput=e=>{ad.slogan=e.target.value;rescore();};
  $$('[data-adch]').forEach(b=>b.onclick=()=>{ad.ch=b.dataset.adch;rerender();});
  $('#adGo').onclick=()=>{const c=AD_CH.find(x=>x.id===ad.ch);const k=1+(S.year-2000)*.06;const cost=c.c*k;if(S.money<cost){toast('돈이 부족해요');return;}const sc2=adScore(pr);
    stopPlay();S.money-=cost;pr.adHype=c.h*Math.pow(sc2.score/100,1.4);pr.adScore=sc2.score;pr.adViews=Math.round(c.v*sc2.score/100*rand(.8,1.25));adCleanup();
    news(`📣 「${esc(pr.d.name)}」 광고 공개! 광고 점수 ${sc2.score}점 · 조회수 ${Math.round(pr.adViews/1e4).toLocaleString('ko-KR')}만 회`);
    openModal(`<h2>📣 광고 공개!</h2><div style="text-align:center"><div class="score" style="font-size:54px;color:${sc2.score>=75?'var(--good)':sc2.score>=50?'var(--warn)':'var(--bad)'}">${sc2.score}점</div><p>조회수 <b>${Math.round(pr.adViews/1e4).toLocaleString('ko-KR')}만 회</b> · 댓글 ${Math.round(pr.adViews/900).toLocaleString('ko-KR')}개</p>
      <div class="review" style="text-align:left"><div class="s">💬</div><div class="muted">${sc2.score>=80?'「와 이거 무조건 산다」 「광고 미쳤다」':sc2.score>=55?'「오 괜찮은데?」 「가격 얼마임?」':'「광고 왜 이럼ㅋㅋ」 「무슨 폰인지 모르겠음」'}</div></div></div>
      <button class="btn good" id="bAdOk">🚀 출시 준비하러 가기</button>`);
    $('#bAdOk').onclick=()=>{closeModal();S.proj.step=5;updTop();render();save();};updTop();save();};
  $('#adSkip').onclick=()=>{stopPlay();adCleanup();pr.adHype=0;pr.adScore=0;S.proj.step=5;render();save();};}
function adScoreHTML(sc){return `<div class="row" style="justify-content:space-between"><b>🧐 광고 점수 (예상)</b><span class="score" style="font-size:30px;color:${sc.score>=75?'var(--good)':sc.score>=50?'var(--warn)':'var(--bad)'}">${sc.score}</span></div>
  <div class="bar" style="margin:6px 0 8px"><i style="width:${sc.score}%"></i></div>
  ${sc.good.map(x=>`<div class="tipG">👍 ${esc(x)}</div>`).join('')}${sc.bad.map(x=>`<div class="tipB">👎 ${esc(x)}</div>`).join('')}`;}
