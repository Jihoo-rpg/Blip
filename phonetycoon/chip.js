/* 폰 공장 타이쿤 — 칩 연구소
   칩은 블록을 다이(실리콘 판) 위에 직접 배치해서 만들어요.
   공정(nm)이 작을수록 판이 넓어지고, 코어가 빨라지고, 전기를 덜 먹어요. */
'use strict';
const NODES=[
 {id:'n180',n:'180nm',y:2000,rp:0},{id:'n130',n:'130nm',y:2002,rp:45},{id:'n90',n:'90nm',y:2004,rp:90},{id:'n65',n:'65nm',y:2006,rp:150},
 {id:'n45',n:'45nm',y:2008,rp:210},{id:'n32',n:'32nm',y:2010,rp:290},{id:'n28',n:'28nm',y:2012,rp:360},{id:'n20',n:'20nm',y:2014,rp:460},
 {id:'n14',n:'14nm',y:2015,rp:540},{id:'n10',n:'10nm',y:2017,rp:680},{id:'n7',n:'7nm',y:2018,rp:800},{id:'n5',n:'5nm',y:2020,rp:1000},
 {id:'n4',n:'4nm',y:2022,rp:1200},{id:'n3',n:'3nm',y:2023,rp:1400},{id:'n2',n:'2nm',y:2025,rp:1750},{id:'n14a',n:'1.4nm',y:2028,rp:2300},
];
const BLK={
 P:{n:'P코어',w:2,h:2,col:'#ff8a3d',y:2000,desc:'고성능 CPU 코어. 빠르지만 뜨거워요'},
 E:{n:'E코어',w:1,h:1,col:'#ffd166',y:2012,desc:'저전력 CPU 코어. 작고 시원해요'},
 G:{n:'GPU',w:2,h:1,col:'#3ddc84',y:2000,desc:'그래픽 4코어 묶음 · 게임 성능'},
 N:{n:'NPU',w:1,h:1,col:'#b388ff',y:2017,desc:'AI 엔진 · AI 기능에 필요'},
 C:{n:'캐시',w:2,h:1,col:'#4ea8ff',y:2000,desc:'CPU 옆에 두면 CPU가 빨라져요'},
 I:{n:'ISP',w:2,h:2,col:'#ff5fa2',y:2004,max:1,desc:'사진 처리 칩 · 카메라 점수 UP'},
 M:{n:'메모리 컨트롤러',w:2,h:1,col:'#9aa4b5',y:2000,max:2,desc:'꼭 1개 필요 · GPU 옆에 두면 GPU UP'},
 X:{n:'모뎀',w:2,h:2,col:'#2ec4b6',y:2010,max:1,desc:'통신 칩 내장 · 배터리 절약'},
};
const BORDER=['P','E','G','N','C','I','M','X'];
const nodeGen=id=>Math.max(0,NODES.findIndex(n=>n.id===id));
const gridN=gen=>6+Math.floor(gen*.45);
const maxGhz=gen=>+(0.2+gen*0.22).toFixed(2);

/* 블록이 차지하는 칸 */
function blkCells(b){const B=BLK[b.t];const w=b.r?B.h:B.w,h=b.r?B.w:B.h;const out=[];for(let dx=0;dx<w;dx++)for(let dy=0;dy<h;dy++)out.push([b.x+dx,b.y+dy]);return out;}
function blkWH(b){const B=BLK[b.t];return b.r?[B.h,B.w]:[B.w,B.h];}
function canPlace(chip,b){const N=gridN(nodeGen(chip.node));const occ=new Set();for(const o of chip.blocks)for(const [x,y] of blkCells(o))occ.add(x+','+y);
  for(const [x,y] of blkCells(b)){if(x<0||y<0||x>=N||y>=N||occ.has(x+','+y))return false;}return true;}
// 두 블록이 맞닿은 변의 수
function touch(a,b){const A=new Set(blkCells(a).map(c=>c+''));let n=0;for(const [x,y] of blkCells(b))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(A.has([x+dx,y+dy]+''))n++;return n;}

/* 칩 성능 계산 */
function chipStats(chip,opts={}){
  const gen=nodeGen(chip.node),bl=chip.blocks||[];const cnt={};for(const k in BLK)cnt[k]=0;for(const b of bl)cnt[b.t]++;
  if(chip.counts)Object.assign(cnt,chip.counts);
  const ghz=Math.min(chip.ghz||maxGhz(gen),maxGhz(gen));
  // 배치 보너스 · 벌점
  let cacheAdj=0,gpuMem=0,hot=0;
  if(!chip.counts){for(let i=0;i<bl.length;i++)for(let j=i+1;j<bl.length;j++){const a=bl[i],b=bl[j];const t=touch(a,b);if(!t)continue;const s=a.t+b.t;
    if(s==='PC'||s==='CP'||s==='EC'||s==='CE')cacheAdj+=Math.min(2,t);if(s==='GM'||s==='MG')gpuMem+=Math.min(2,t);if(s==='PP')hot+=t;if((s==='PG'||s==='GP'))hot+=t*.5;}}
  const cacheB=Math.min(.45,cacheAdj*.05+cnt.C*.025);
  const coreP=(0.3+gen*0.32)*ghz;
  const single=coreP*(1+cacheB);
  const multi=Math.pow(cnt.P*coreP+cnt.E*coreP*.38,.9)*(1+cacheB*.8);
  const gpu=cnt.G*4*(0.25+gen*0.26)*(1+Math.min(.3,gpuMem*.07));
  const npu=cnt.N*(0.5+gen*0.42);
  const isp=cnt.I?(1+gen*.12):0;
  const pwK=Math.pow(.84,gen);
  let power=(cnt.P*(.35+ghz*ghz*.55)+cnt.E*(.05+ghz*.07)+cnt.G*.55+cnt.N*.18+cnt.I*.12+cnt.C*.05)*pwK*(1+hot*.07)+(cnt.X?0:.25);
  const limit=opts.limit||4.6;
  const throttle=power>limit?Math.pow(limit/power,.65):1;
  // 다이 크기 (블록이 차지한 범위)
  let cells;if(chip.counts){cells=0;for(const k in cnt)cells+=cnt[k]*BLK[k].w*BLK[k].h;cells=Math.round(cells*1.25);}
  else if(bl.length){let x0=99,y0=99,x1=0,y1=0;for(const b of bl)for(const [x,y] of blkCells(b)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}cells=(x1-x0+1)*(y1-y0+1);}else cells=0;
  const used=bl.reduce((a,b)=>a+BLK[b.t].w*BLK[b.t].h,0);
  const mm2=Math.round(cells*(9-gen*.25)*10)/10;
  const yieldP=Math.exp(-cells*.0055*(1+gen*.02));
  const unit=Math.round(cells*300*Math.pow(1.1,gen)/Math.max(.2,yieldP)+2500);
  const raw=(single*2+multi*.7+gpu*.45+npu*.35)*throttle;
  const design=Math.round((7e7+cells*2.2e6)*(1+gen*.35)/1e6)*1e6;
  const weeks=3+Math.round(cells/22)+Math.floor(gen/4);
  const ok=(cnt.P+cnt.E)>0&&cnt.M>0;
  return {gen,ghz,cnt,single,multi,gpu,npu,isp,power,limit,throttle,cells,used,mm2,yieldP,unit,raw,design,weeks,ok,cacheB,gpuMem,hot,modem:cnt.X>0};
}
// 그 해 시장 최고 칩 (경쟁사 플래그십)
const FCHIP={};
function frontierSpec(y){let gi=0;NODES.forEach((n,i)=>{if(n.y<=y)gi=i;});
  const counts={P:clamp(1+Math.floor((y-2008)/4),1,6),E:y>=2012?clamp(2+Math.floor((y-2012)/3)*2,0,8):0,G:clamp(1+Math.floor((y-2000)/4),1,9),N:y>=2017?clamp(1+Math.floor((y-2017)/2),0,8):0,C:clamp(1+Math.floor((y-2000)/5),1,6),I:y>=2004?1:0,M:1,X:y>=2010?1:0};
  return {node:NODES[gi].id,ghz:maxGhz(gi)*.92,counts};}
function frontierChip(y){if(FCHIP[y])return FCHIP[y];const st=chipStats(frontierSpec(y));FCHIP[y]=st;return st;}
// 예전 칩 표 기준 점수 (성능 분야에 들어가는 값)
const bestChipQ=y=>clamp(4+(y-2000)*3.85,4,120);
function chipQ(spec,y,limit){if(!spec)return 0;const st=chipStats(spec,{limit:limit||4.6});return st.raw/frontierChip(y).raw*bestChipQ(y);}

/* 칩 그림 (캔버스) */
function drawDie(g,chip,W,H,opt={}){const gen=nodeGen(chip.node),N=gridN(gen);const st=chipStats(chip);
  g.save();g.fillStyle=opt.bg||'#0b0f17';g.fillRect(0,0,W,H);
  // 실리콘
  const pad=W*.08,S=Math.min(W,H)-pad*2,cs=S/N,ox=(W-S)/2,oy=(H-S)/2;
  const gr=g.createLinearGradient(ox,oy,ox+S,oy+S);gr.addColorStop(0,'#3a3f4b');gr.addColorStop(.5,'#22262f');gr.addColorStop(1,'#2d323d');g.fillStyle=gr;g.fillRect(ox,oy,S,S);
  g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let i=0;i<=N;i++){g.beginPath();g.moveTo(ox+i*cs,oy);g.lineTo(ox+i*cs,oy+S);g.stroke();g.beginPath();g.moveTo(ox,oy+i*cs);g.lineTo(ox+S,oy+i*cs);g.stroke();}
  for(const b of chip.blocks||[]){const [w,h]=blkWH(b);const x=ox+b.x*cs+1.5,y=oy+b.y*cs+1.5,bw=w*cs-3,bh=h*cs-3;const B=BLK[b.t];
    const bg=g.createLinearGradient(x,y,x+bw,y+bh);bg.addColorStop(0,B.col);bg.addColorStop(1,shadeHex(B.col,-.35));g.fillStyle=bg;g.fillRect(x,y,bw,bh);
    // 무늬
    g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=Math.max(1,cs*.04);
    if(b.t==='C'){for(let i=1;i<6;i++){g.beginPath();g.moveTo(x,y+bh*i/6);g.lineTo(x+bw,y+bh*i/6);g.stroke();}}
    else if(b.t==='G'){for(let i=1;i<4;i++){g.beginPath();g.moveTo(x+bw*i/4,y);g.lineTo(x+bw*i/4,y+bh);g.stroke();}}
    else if(b.t==='P'){g.strokeRect(x+bw*.15,y+bh*.15,bw*.7,bh*.7);g.strokeRect(x+bw*.32,y+bh*.32,bw*.36,bh*.36);}
    else{g.strokeRect(x+bw*.2,y+bh*.2,bw*.6,bh*.6);}
    if(cs>14){g.fillStyle='rgba(0,0,0,.65)';g.font=`800 ${Math.min(cs*.5,bh*.45)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(b.t==='M'?'MC':b.t,x+bw/2,y+bh/2);}}
  // 반짝임
  const sh=g.createLinearGradient(ox,oy,ox+S,oy+S);sh.addColorStop(0,'rgba(255,255,255,.18)');sh.addColorStop(.4,'rgba(255,255,255,0)');sh.addColorStop(.7,'rgba(160,120,255,.08)');sh.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sh;g.fillRect(ox,oy,S,S);
  g.restore();}
function drawPackage(g,chip,W,H,brand){g.save();g.clearRect(0,0,W,H);const s=Math.min(W,H)*.82,x=(W-s)/2,y=(H-s)/2;
  g.fillStyle='#14171c';rrect(g,x,y,s,s,s*.06);g.fill();
  // 금속 뚜껑
  const m=s*.1;const gr=g.createLinearGradient(x,y,x+s,y+s);gr.addColorStop(0,'#e9edf2');gr.addColorStop(.45,'#9aa3ad');gr.addColorStop(.55,'#c9d0d8');gr.addColorStop(1,'#7c858f');g.fillStyle=gr;rrect(g,x+m,y+m,s-m*2,s-m*2,s*.05);g.fill();
  g.fillStyle='#2a2f36';g.textAlign='center';g.textBaseline='middle';g.font=`800 ${s*.07}px sans-serif`;g.fillText((brand||'').toUpperCase(),W/2,y+s*.32);
  g.font=`900 ${s*.15}px "Arial Black",sans-serif`;g.fillText((chip.name||'X1').toUpperCase(),W/2,y+s*.5);
  g.font=`700 ${s*.055}px sans-serif`;g.fillText(NODES[nodeGen(chip.node)].n+' · '+(chip.y||''),W/2,y+s*.68);
  g.fillStyle='#c9a227';for(let i=0;i<10;i++){const t=x+s*.1+i*s*.08;g.fillRect(t,y-s*.025,s*.04,s*.03);g.fillRect(t,y+s-s*.005,s*.04,s*.03);g.fillRect(x-s*.025,t,s*.03,s*.04);g.fillRect(x+s-s*.005,t,s*.03,s*.04);}
  g.restore();}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function shadeHex(hex,k){const c=parseInt(hex.slice(1),16);let r=c>>16,gg=c>>8&255,b=c&255;const f=v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)));return '#'+[f(r),f(gg),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
const chipImgCache={};
function chipImg(chip,kind='die',px=200){const k=kind+px+JSON.stringify([chip.node,chip.blocks,chip.name]);if(chipImgCache[k])return chipImgCache[k];
  const c=document.createElement('canvas');c.width=c.height=px;const g=c.getContext('2d');if(kind==='die')drawDie(g,chip,px,px);else drawPackage(g,chip,px,px,S&&S.name);const u=c.toDataURL();chipImgCache[k]=u;return u;}

/* 봇 · 경쟁사용: 개수만 주면 알아서 빈칸에 채워요 */
function autoPack(node,counts){const chip={node,blocks:[]};const N=gridN(nodeGen(node));const order=['M','P','C','G','E','N','I','X'];
  for(const t of order)for(let k=0;k<(counts[t]||0);k++){let done=false;for(let y=0;y<N&&!done;y++)for(let x=0;x<N&&!done;x++)for(const r of [0,1]){const b={t,x,y,r};if(canPlace(chip,b)){chip.blocks.push(b);done=true;break;}}}
  return chip;}

/* ======================= 칩 연구소 화면 ======================= */
let CE=null; // 편집 중인 칩 {chip, sel, rot}
function renderChips(){
  if(CE){renderChipEditor();return;}
  const fc=frontierChip(S.year);
  $('#main').innerHTML=`<div class="hero card"><div><h2 style="font-size:24px">🧠 칩 연구소</h2><p class="muted" style="margin:6px 0 0;line-height:1.6">블록을 실리콘 위에 하나하나 배치해서 나만의 칩을 만들어요. 공정이 작을수록 더 많이 넣을 수 있어요.</p></div>
    <button class="btn" id="bNewChip">＋ 새 칩 설계</button></div>
   <div class="sect">💾 내 칩 <small>${S.chips.length}개</small></div>
   <div class="grid g2">${S.chips.map(c=>{const st=chipStats(c);const q=chipQ(c,S.year);const pct=Math.round(st.raw/fc.raw*100);
     return `<div class="card chipCard"><img src="${chipImg(c,'pkg',220)}" alt=""><div><b style="font-size:17px">${esc(c.name)}</b><div class="muted" style="font-size:12px">${NODES[st.gen].n} · ${c.y}년 · ${st.cnt.P}P+${st.cnt.E}E 코어 · GPU ${st.cnt.G*4}코어${st.cnt.N?` · NPU ${st.cnt.N}`:''}</div>
       <div class="st" style="margin-top:8px"><span>성능</span><div class="bar"><i style="width:${Math.min(100,pct/1.2)}%"></i></div><span>${pct}%</span></div>
       <div class="kv" style="margin-top:6px"><div><small>개당 원가</small><b>${won(st.unit)}</b></div><div><small>전력</small><b>${st.power.toFixed(1)}W</b></div></div>
       <div class="row" style="margin-top:8px"><button class="btn sm alt" data-copychip="${c.id}">복사해서 새로</button></div></div></div>`;}).join('')||'<p class="muted">아직 만든 칩이 없어요. 「새 칩 설계」를 눌러요!</p>'}</div>
   <p class="muted" style="font-size:12px;margin-top:12px">성능 % = ${S.year}년 경쟁사 최고 칩 대비</p>`;
  $('#bNewChip').onclick=()=>openChipEditor();
  $$('[data-copychip]').forEach(b=>b.onclick=()=>{const c=S.chips.find(x=>x.id==b.dataset.copychip);openChipEditor(c);});}
function bestNode(){const l=NODES.filter(n=>has('node',n.id)&&avail(n));return (l[l.length-1]||NODES[0]).id;}
function openChipEditor(base){const node=bestNode();
  const chip=base?{name:nextChipName(),node:has('node',base.node)?base.node:node,ghz:base.ghz,blocks:JSON.parse(JSON.stringify(base.blocks))}:{name:nextChipName(),node,ghz:maxGhz(nodeGen(node))*.8,blocks:[]};
  // 판이 작아졌으면 밖으로 나간 블록 정리
  chip.blocks=chip.blocks.filter((b,i,arr)=>{const tmp={node:chip.node,blocks:arr.slice(0,i)};return canPlace(tmp,b);});
  CE={chip,sel:'P',rot:0};setTab('chips');}
function nextChipName(){const n=(S.chips.length+1);const p=(S.name||'P').replace(/\s/g,'').slice(0,1).toUpperCase();const L='ABCDEFGHJKLMNPQRSTUVWXYZ';const ch=/[A-Z]/.test(p)?p:L[(S.name.charCodeAt(0)||0)%L.length];return ch+n;}
function renderChipEditor(){const c=CE.chip;const gen=nodeGen(c.node),N=gridN(gen);const st=chipStats(c,{limit:4.6});const fc=frontierChip(S.year);
  const nodes=NODES.filter(n=>has('node',n.id)&&avail(n));const yr=S.year;
  const bar=(lab,v,f,tip)=>{const p=f>0?Math.round(v/f*100):0;return `<div class="st"><span>${lab}</span><div class="bar"><i style="width:${Math.min(100,p/1.3)}%;${p>=100?'background:linear-gradient(90deg,#3ddc84,#b6ff6a)':''}"></i></div><span>${p}%</span></div>`;};
  const tier=st.cells>=N*N*.75?'Ultra':st.cells>=N*N*.5?'Max':st.cells>=N*N*.3?'Pro':'';
  $('#main').innerHTML=`<div class="row" style="justify-content:space-between"><button class="btn alt sm" id="ceBack">◀ 칩 목록</button><b class="muted" style="font-size:13px">${N}×${N} 실리콘 · ${NODES[gen].n}</b></div>
   <div id="ceWrap">
    <div class="card" id="ceBoard">
     <div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="ceName" maxlength="12" value="${esc(c.name)}" style="flex:1"><button class="btn sm alt" id="ceTier" title="이름 뒤에 등급 붙이기">${tier?'+ '+tier:'등급'}</button></div>
     <div id="dieGrid" style="--n:${N}"></div>
     <div class="row" style="justify-content:space-between;margin-top:8px"><small class="muted">👆 블록을 고르고 빈칸을 눌러 놓기 · 놓인 블록을 누르면 빼기</small><button class="btn sm alt" id="ceClear">모두 지우기</button></div>
    </div>
    <div class="grid" style="gap:10px">
     <div class="card"><div class="pal">${BORDER.map(t=>{const B=BLK[t];const lock=yr<B.y;const n=c.blocks.filter(b=>b.t===t).length;
        return `<button class="pb ${CE.sel===t?'on':''} ${lock?'lock':''}" data-blk="${t}" ${lock?'disabled':''}><i style="background:${B.col};width:${B.w*12}px;height:${B.h*12}px"></i><b>${B.n}</b><small>${lock?B.y+'년부터':B.desc}</small><span class="cnt">${n}${B.max?'/'+B.max:''}</span></button>`;}).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm alt" id="ceRot">↻ 돌리기 (${CE.rot?'세로':'가로'})</button></div></div>
     <div class="card grid" style="gap:8px">
      <div class="field" style="margin:0"><label>공정 <b>${NODES[gen].n}</b></label><select id="ceNode">${nodes.map(n=>`<option value="${n.id}" ${n.id===c.node?'selected':''}>${n.n} (${n.y}년)</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label>클럭 속도 <b id="ghzV">${st.ghz.toFixed(2)}GHz</b></label><input type="range" id="ceGhz" min="0.1" max="${maxGhz(gen)}" step="0.01" value="${Math.min(c.ghz,maxGhz(gen))}"><small class="muted">높이면 빨라지지만 전기를 엄청 먹고 뜨거워져요</small></div>
     </div>
     <div class="card grid" style="gap:6px" id="ceStats">${chipStatsHTML(st,fc)}</div>
     <button class="btn good" id="ceMake" style="font-size:16px;padding:13px" ${!st.ok||S.money<st.design?'disabled':''}>🏭 칩 만들기 · ${won(st.design)} · ${st.weeks}주</button>
     ${!st.ok?'<p class="muted" style="margin:0;color:var(--warn)">⚠️ CPU 코어(P 또는 E)와 메모리 컨트롤러가 꼭 1개씩 있어야 해요</p>':S.money<st.design?'<p class="muted" style="margin:0;color:var(--bad)">돈이 부족해요</p>':''}
    </div></div>`;
  drawGrid();bindChipEditor();}
function chipStatsHTML(st,fc){const pct=(v,f)=>f>0?Math.round(v/f*100):0;const row=(l,v,f)=>{const p=pct(v,f);return `<div class="st"><span>${l}</span><div class="bar"><i style="width:${Math.min(100,p/1.3)}%;${p>=100?'background:linear-gradient(90deg,#3ddc84,#b6ff6a)':p<50?'background:linear-gradient(90deg,#ff5a5f,#ffb020)':''}"></i></div><span>${p}</span></div>`;};
  const heat=st.power/st.limit;
  return `<b style="font-size:14px">📊 ${S.year}년 최고 칩 대비 (100 = 같음)</b>
   ${row('싱글',st.single*st.throttle,fc.single)}${row('멀티',st.multi*st.throttle,fc.multi)}${row('GPU',st.gpu*st.throttle,fc.gpu)}${row('AI',st.npu,fc.npu||1)}${row('종합',st.raw,fc.raw)}
   <div class="heat"><span>${heat>1.15?'🔥🔥':heat>1?'🔥':'❄️'} 전력 ${st.power.toFixed(1)}W / 폰이 버티는 ${st.limit}W</span><div class="bar"><i style="width:${Math.min(100,heat*70)}%;background:${heat>1?'linear-gradient(90deg,#ffb020,#ff5a5f)':'linear-gradient(90deg,#3ddc84,#4ea8ff)'}"></i></div>
    ${st.throttle<1?`<small style="color:var(--bad)">너무 뜨거워서 성능이 ${Math.round((1-st.throttle)*100)}% 떨어져요</small>`:''}</div>
   <div class="kv"><div><small>다이 크기</small><b>${st.mm2}mm²</b></div><div><small>수율</small><b>${Math.round(st.yieldP*100)}%</b></div><div><small>칩 1개 원가</small><b>${won(st.unit)}</b></div><div><small>설계 비용</small><b>${won(st.design)}</b></div></div>
   <div class="tips">${st.hot?`<span>🔥 P코어끼리 붙어서 뜨거워요 (${st.hot}곳)</span>`:''}${st.cacheB>.05?`<span>💡 캐시 보너스 +${Math.round(st.cacheB*100)}%</span>`:'<span>💡 캐시를 CPU 옆에 두면 빨라져요</span>'}${st.gpuMem?`<span>💡 GPU+메모리 보너스</span>`:''}${st.used<st.cells*.75&&st.cells?`<span>📐 빈칸이 많아서 다이가 커요. 꽉꽉 모으면 싸져요</span>`:''}</div>`;}
function drawGrid(){const c=CE.chip,N=gridN(nodeGen(c.node));const el=$('#dieGrid');let h='';for(let y=0;y<N;y++)for(let x=0;x<N;x++)h+=`<div class="dc" data-x="${x}" data-y="${y}"></div>`;
  for(const [i,b] of c.blocks.entries()){const [w,hh]=blkWH(b);const B=BLK[b.t];h+=`<div class="db b${b.t}" data-bi="${i}" style="left:calc(${b.x}*100%/${N});top:calc(${b.y}*100%/${N});width:calc(${w}*100%/${N});height:calc(${hh}*100%/${N});--c:${B.col}"><span>${b.t==='M'?'MC':b.t}</span></div>`;}
  h+='<div class="ghost" hidden></div>';el.innerHTML=h;}
function bindChipEditor(){const c=CE.chip;
  $('#ceBack').onclick=()=>{CE=null;renderChips();};
  $('#ceName').oninput=e=>{c.name=e.target.value;};
  $('#ceTier').onclick=()=>{const st=chipStats(c);const N=gridN(st.gen);const t=st.cells>=N*N*.75?'Ultra':st.cells>=N*N*.5?'Max':st.cells>=N*N*.3?'Pro':'';c.name=c.name.replace(/\s*(Pro|Max|Ultra)$/i,'')+(t?' '+t:'');$('#ceName').value=c.name;};
  $$('[data-blk]').forEach(b=>b.onclick=()=>{CE.sel=b.dataset.blk;$$('[data-blk]').forEach(x=>x.classList.toggle('on',x===b));});
  $('#ceRot').onclick=()=>{CE.rot=CE.rot?0:1;$('#ceRot').textContent=`↻ 돌리기 (${CE.rot?'세로':'가로'})`;};
  $('#ceClear').onclick=()=>{c.blocks=[];refreshCE();};
  $('#ceNode').onchange=e=>{c.node=e.target.value;const N=gridN(nodeGen(c.node));const keep=[];for(const b of c.blocks){if(canPlace({node:c.node,blocks:keep},b))keep.push(b);}c.blocks=keep;c.ghz=Math.min(c.ghz,maxGhz(nodeGen(c.node)));renderChipEditor();};
  $('#ceGhz').oninput=e=>{c.ghz=+e.target.value;$('#ghzV').textContent=c.ghz.toFixed(2)+'GHz';$('#ceStats').innerHTML=chipStatsHTML(chipStats(c),frontierChip(S.year));updMake();};
  const grid=$('#dieGrid');
  grid.onclick=e=>{const blk=e.target.closest('.db');if(blk){c.blocks.splice(+blk.dataset.bi,1);refreshCE();return;}
    const cell=e.target.closest('.dc');if(!cell)return;const t=CE.sel;const B=BLK[t];if(B.max&&c.blocks.filter(b=>b.t===t).length>=B.max){toast(`${B.n}는 ${B.max}개까지만 넣을 수 있어요`);return;}
    const sq=B.w===B.h;const b={t,x:+cell.dataset.x,y:+cell.dataset.y,r:sq?0:CE.rot};
    if(!canPlace(c,b)){const b2=Object.assign({},b,{r:b.r?0:1});if(!sq&&canPlace(c,b2)){c.blocks.push(b2);}else{toast('여기엔 안 들어가요');return;}}else c.blocks.push(b);
    refreshCE();buzz();};
  // 마우스 올리면 미리보기
  grid.onpointermove=e=>{const cell=e.target.closest('.dc');const gh=grid.querySelector('.ghost');if(!cell){gh.hidden=true;return;}const N=gridN(nodeGen(c.node));const B=BLK[CE.sel];const r=B.w===B.h?0:CE.rot;const w=r?B.h:B.w,h=r?B.w:B.h;
    gh.hidden=false;gh.style.cssText=`left:calc(${cell.dataset.x}*100%/${N});top:calc(${cell.dataset.y}*100%/${N});width:calc(${w}*100%/${N});height:calc(${h}*100%/${N});--c:${B.col}`;gh.classList.toggle('bad',!canPlace(c,{t:CE.sel,x:+cell.dataset.x,y:+cell.dataset.y,r}));};
  grid.onpointerleave=()=>{const gh=grid.querySelector('.ghost');if(gh)gh.hidden=true;};
  $('#ceMake').onclick=()=>makeChip();}
function updMake(){const st=chipStats(CE.chip);const b=$('#ceMake');if(b){b.disabled=!st.ok||S.money<st.design;b.textContent=`🏭 칩 만들기 · ${won(st.design)} · ${st.weeks}주`;}}
function refreshCE(){drawGrid();const st=chipStats(CE.chip);$('#ceStats').innerHTML=chipStatsHTML(st,frontierChip(S.year));$$('[data-blk]').forEach(b=>{const t=b.dataset.blk;const B=BLK[t];b.querySelector('.cnt').textContent=CE.chip.blocks.filter(x=>x.t===t).length+(B.max?'/'+B.max:'');});
  const N=gridN(st.gen);const tier=st.cells>=N*N*.75?'Ultra':st.cells>=N*N*.5?'Max':st.cells>=N*N*.3?'Pro':'';$('#ceTier').textContent=tier?'+ '+tier:'등급';updMake();}
function buzz(){try{navigator.vibrate&&navigator.vibrate(8);}catch(e){}}
function makeChip(){const c=CE.chip;const st=chipStats(c);if(!st.ok||S.money<st.design)return;c.name=(c.name||'').trim()||nextChipName();
  openModal(`<h2>🏭 「${esc(c.name)}」 생산 준비</h2><div style="display:flex;gap:12px;justify-content:center"><img src="${chipImg(c,'die',150)}" style="border-radius:12px"><img src="${chipImg(c,'pkg',150)}"></div>
   <p class="muted" style="line-height:1.6">공장에서 칩 설계를 굽는(테이프아웃) 데 <b>${st.weeks}주</b>가 걸려요. 그동안 시간이 흐르고, 팔고 있는 폰은 계속 팔려요.</p>
   <button class="btn good" id="bTape">${won(st.design)} 내고 만들기</button><button class="btn alt" onclick="closeModal()">취소</button>`);
  $('#bTape').onclick=()=>{S.money-=st.design;const chip=Object.assign(JSON.parse(JSON.stringify(c)),{id:S.seq++,y:S.year});closeModal();
    advance(st.weeks,`🧠 칩 「${chip.name}」 만드는 중`,()=>{S.chips.unshift(chip);news(`🧠 새 칩 <b>「${esc(chip.name)}」</b> 완성! (${NODES[st.gen].n})`);CE=null;
      if(S.proj&&S.proj.step===0){pickChip(chip.id);}
      openModal(`<h2>🎉 칩 완성!</h2><div style="display:flex;justify-content:center"><img class="pop" src="${chipImg(chip,'pkg',200)}"></div><p style="text-align:center;font-size:18px"><b>${esc(chip.name)}</b> · ${S.year}년 최고 칩 대비 <b>${Math.round(st.raw/frontierChip(S.year).raw*100)}%</b></p><button class="btn" id="bGoProj">${S.proj?'📱 폰 만들러 가기':'확인'}</button>`);
      $('#bGoProj').onclick=()=>{closeModal();setTab(S.proj?'home':'chips');};save();});};}
