/* 폰 공장 타이쿤 — 3D 휴대폰 모델 (three.js r128)
   P3.mount(el)      : 미리보기 캔버스를 el 안에 붙여요 (드래그로 돌리기)
   P3.show(d)        : 설계 d 로 3D 폰을 다시 만들어요
   P3.thumb(d,view)  : 작은 3D 사진(dataURL) — 제품 목록 · 출시 화면용
   P3.toggleOpen()   : 폴더/플립/폴더블/슬라이드/롤러블 접기·펼치기 */
(function(){
'use strict';
if(!window.THREE){window.P3=null;return;}
const T=THREE;
const ok=(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}})();
if(!ok){window.P3=null;return;}

/* ---------- 공용 도우미 ---------- */
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const col=(hex)=>new T.Color(hex).convertSRGBToLinear();
function mix(a,b,t){return new T.Color(a).lerp(new T.Color(b),t).convertSRGBToLinear();}
function rrShape(w,h,r){r=Math.min(r,w/2-.001,h/2-.001);const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
// 모서리가 둥근 상자 (가운데 정렬)
function rbox(w,h,t,r,bev){bev=Math.min(bev,t/2-.005,r*.9);const g=new T.ExtrudeGeometry(rrShape(w-bev*2,h-bev*2,Math.max(.01,r-bev)),
  {depth:Math.max(.001,t-bev*2),bevelEnabled:true,bevelSize:bev,bevelThickness:bev,bevelSegments:4,curveSegments:10});
  g.translate(0,0,-(t-bev*2)/2);g.computeVertexNormals();return g;}
// 둥근 사각형 판 (UV 0~1)
function rplane(w,h,r,u0=0,u1=1,v0=0,v1=1){const g=new T.ShapeGeometry(rrShape(w,h,r),10);const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,u0+(p.getX(i)/w+.5)*(u1-u0),v0+(p.getY(i)/h+.5)*(v1-v0));uv.needsUpdate=true;return g;}
const cyl=(r,h,seg=32)=>{const g=new T.CylinderGeometry(r,r,h,seg);g.rotateX(Math.PI/2);return g;};

/* ---------- 캔버스 텍스처 ---------- */
const texCache={};
function canvasTex(key,w,h,draw){if(texCache[key])return texCache[key];const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new T.CanvasTexture(c);t.anisotropy=4;t.encoding=T.sRGBEncoding;texCache[key]=t;return t;}
const ICON_COL=['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#4dabf7','#9775fa','#f783ac','#38d9a9','#74c0fc','#e599f7','#ff8787','#63e6be'];
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
// 스마트폰 화면
function smartScreen(cut,panel,wide,brand){const W=wide?720:400,H=wide?640:840;
  return canvasTex('ss'+cut+panel+wide+brand,W,H,(g)=>{
    const gr=g.createLinearGradient(0,0,W,H);
    const pal={ips:['#1e3c72','#2a5298','#6dd5ed'],oled:['#0f2027','#5b2c83','#ff6a88'],doled:['#120136','#035aa6','#40bad5'],ltpo:['#0b0b2b','#7f00ff','#e100ff'],mled:['#000428','#004e92','#00f2fe']}[panel]||['#232526','#414345','#6dd5ed'];
    gr.addColorStop(0,pal[0]);gr.addColorStop(.55,pal[1]);gr.addColorStop(1,pal[2]);g.fillStyle=gr;g.fillRect(0,0,W,H);
    // 물결 무늬
    g.globalAlpha=.25;for(let i=0;i<5;i++){g.beginPath();g.ellipse(W*(.2+i*.18),H*(.75-i*.07),W*.5,H*.12,-.4,0,7);g.fillStyle=i%2?'#fff':'#000';g.fill();}g.globalAlpha=1;
    const cx=wide?W*.27:W/2;
    g.fillStyle='#fff';g.textAlign='center';g.font=`300 ${wide?110:120}px "Helvetica Neue",Arial,sans-serif`;g.fillText('12:00',cx,H*(wide?.33:.25));
    g.font=`600 ${wide?26:28}px Arial,sans-serif`;g.globalAlpha=.85;g.fillText('11월 1일 일요일',cx,H*(wide?.4:.3));g.globalAlpha=1;
    // 앱 아이콘
    const cols=wide?6:4,rows=wide?3:4,iw=wide?70:62,gx=wide?W*.52:W*.1,gy=wide?H*.18:H*.42,sp=wide?(W*.45)/cols:(W*.8)/cols;let n=0;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=gx+c*sp+(sp-iw)/2,y=gy+r*(iw+34);g.fillStyle=ICON_COL[(n++*5+r)%ICON_COL.length];rr(g,x,y,iw,iw,iw*.26);g.fill();
      g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(x+iw/2,y+iw/2,iw*.2,0,7);g.fill();}
    // 독
    g.fillStyle='rgba(255,255,255,.18)';rr(g,W*.06,H*.86,W*.88,H*.1,40);g.fill();
    for(let i=0;i<4;i++){g.fillStyle=ICON_COL[(i*3+2)%ICON_COL.length];rr(g,W*.06+W*.88*(i+.5)/4-iw/2,H*.91-iw/2,iw,iw,iw*.26);g.fill();}
    // 화면 구멍
    g.fillStyle='#000';
    if(cut==='notch'){rr(g,W*.3,-30,W*.4,30+H*.035,30);g.fill();}
    else if(cut==='drop'){g.beginPath();g.arc(W/2,H*.012,W*.03,0,7);g.fill();}
    else if(cut==='punch'){g.beginPath();g.arc(wide?W*.75:W/2,H*.025,W*(wide?.014:.024),0,7);g.fill();}
    else if(cut==='island'){rr(g,W*.36,H*.012,W*.28,H*.038,H*.019);g.fill();}
    g.fillStyle='#fff';g.font='600 22px Arial';g.textAlign='left';if(cut!=='notch')g.fillText('9:41',W*.06,H*.03);g.textAlign='right';g.fillText('▮▮▮ 100%',W*.94,H*.03);
  });}
// 피처폰 화면 (작은 LCD)
function lcdScreen(panel){return canvasTex('lcd'+panel,240,300,(g,W,H)=>{
  if(panel==='mono'){g.fillStyle='#9db08a';g.fillRect(0,0,W,H);g.fillStyle='#24301c';g.font='bold 56px monospace';g.textAlign='center';g.fillText('12:00',W/2,H*.45);g.font='bold 22px monospace';g.fillText('▮▮▮▮  ✉',W/2,H*.15);g.fillText('메뉴     전화번호',W/2,H*.9);}
  else{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,panel==='stn'?'#3a6ea5':'#4facfe');gr.addColorStop(1,panel==='stn'?'#1e3a5f':'#00f2fe');g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(W*.7,H*.65,W*.5,0,7);g.fill();
    g.fillStyle='#fff';g.font='bold 54px Arial';g.textAlign='center';g.fillText('12:00',W/2,H*.45);g.font='bold 20px Arial';g.fillText('▮▮▮▮      ✉  🔋',W/2,H*.12);
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,H*.84,W,H*.16);g.fillStyle='#fff';g.fillText('메뉴          연락처',W/2,H*.94);}
});}
function logoTex(name,dark){return canvasTex('logo'+name+dark,512,128,(g,W,H)=>{g.fillStyle=dark?'rgba(0,0,0,.55)':'rgba(255,255,255,.75)';g.font='bold 72px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(name,W/2,H/2);});}
function carbonTex(){return canvasTex('carbon',128,128,(g,W,H)=>{g.fillStyle='#111';g.fillRect(0,0,W,H);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const gr=(x+y)%2?g.createLinearGradient(x*16,y*16,x*16+16,y*16):g.createLinearGradient(x*16,y*16,x*16,y*16+16);
  gr.addColorStop(0,'#1a1a1a');gr.addColorStop(.5,'#3a3a3a');gr.addColorStop(1,'#141414');g.fillStyle=gr;g.fillRect(x*16,y*16,16,16);}});}
function keyTex(){return canvasTex('keys',256,320,(g,W,H)=>{g.clearRect(0,0,W,H);});}

/* ---------- 재질 ---------- */
function mats(d){const c=d.color||'#1c1f26';const m=d.mat;const dark=new T.Color(c).getHSL({}).l<.25;
  const P=(o)=>new T.MeshPhysicalMaterial(Object.assign({envMapIntensity:1},o));
  let frame,back;
  if(m==='plastic'){frame=back=P({color:col(c),roughness:.42,metalness:0,clearcoat:.3,clearcoatRoughness:.4});}
  else if(m==='metal'){frame=P({color:mix(c,'#d8dde3',.55),metalness:1,roughness:.28});back=P({color:col(c),roughness:.5,metalness:.1});}
  else if(m==='alu'){frame=back=P({color:mix(c,'#c9ced6',.25),metalness:.9,roughness:.4});}
  else if(m==='glass'){frame=P({color:mix(c,'#e3e7ec',.6),metalness:1,roughness:.2});back=P({color:col(c),metalness:.15,roughness:.12,clearcoat:1,clearcoatRoughness:.03,reflectivity:.6});}
  else if(m==='ceramic'){frame=P({color:mix(c,'#d0d4da',.4),metalness:1,roughness:.25});back=P({color:col(c),metalness:0,roughness:.18,clearcoat:1,clearcoatRoughness:.08});}
  else if(m==='ti'){frame=back=P({color:mix(c,'#9da3aa',.35),metalness:.95,roughness:.52});}
  else{frame=P({color:col('#1a1a1a'),metalness:.6,roughness:.4});const t=carbonTex();t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,8);back=P({color:mix('#ffffff',c,.35),map:t,metalness:.2,roughness:.3,clearcoat:1,clearcoatRoughness:.05});}
  const glassBlack=P({color:col('#050608'),metalness:0,roughness:.06,clearcoat:1,clearcoatRoughness:.02});
  const island=P({color:mix(c,'#000',.45),metalness:m==='plastic'?0:.6,roughness:.25,clearcoat:.8});
  const lensRing=(gold)=>P({color:col(gold?'#d4af37':'#b9bec5'),metalness:1,roughness:.18});
  const lensGlass=P({color:col('#0b1020'),metalness:.2,roughness:0,clearcoat:1,clearcoatRoughness:0,emissive:col('#1b2650'),emissiveIntensity:.35});
  const key=P({color:mix(c,'#ffffff',dark?.75:.6),roughness:.35,metalness:.1,clearcoat:.6});
  const rubber=new T.MeshStandardMaterial({color:'#222',roughness:.9});
  return {frame,back,glassBlack,island,lensRing,lensGlass,key,rubber,dark};}

/* ---------- 폰 한 덩어리(슬랩) 만들기 ---------- */
// opt: {w,h,t,r, screen:{tex,u0,u1,inset,bez}, back:true/false, keypad, cover}
function slab(d,M,o){const g=new T.Group();const {w,h,t,r}=o;
  const body=new T.Mesh(rbox(w,h,t,r,Math.min(t*.35,.22)),M.frame);g.add(body);
  // 뒷판
  const bp=new T.Mesh(rplane(w-.12,h-.12,Math.max(.05,r-.06)),M.back);bp.position.z=-t/2-.004;bp.rotation.y=Math.PI;g.add(bp);
  if(o.front){ // 앞면 검은 유리
    const fg=new T.Mesh(rplane(w-.1,h-.1,Math.max(.05,r-.05)),o.front==='body'?M.back:M.glassBlack);fg.position.z=t/2+.004;g.add(fg);}
  if(o.screen){const s=o.screen;const sw=w-s.bx*2,sh=h-s.top-s.bot;const sm=new T.MeshBasicMaterial({map:s.tex,toneMapped:false});
    const sp=new T.Mesh(rplane(sw,sh,s.r??Math.max(.05,r-s.bx),s.u0??0,s.u1??1,s.v0??0,s.v1??1),sm);sp.position.set(0,(s.bot-s.top)/2,t/2+.008);g.add(sp);}
  g.userData={w,h,t};return g;}
function keypad(M,w,h){const g=new T.Group();const kw=w*.24,kh=h*.13;
  for(let r=0;r<4;r++)for(let c=0;c<3;c++){const k=new T.Mesh(rbox(kw,kh,.12,.12,.04),M.key);k.position.set((c-1)*w*.3,-r*h*.2,0);g.add(k);}
  // 통화/종료 · 방향키
  const nav=new T.Mesh(cyl(h*.11,.13),M.key);nav.position.set(0,h*.24,0);g.add(nav);
  const call=new T.Mesh(rbox(kw,kh*.8,.12,.12,.04),new T.MeshPhysicalMaterial({color:'#2fb344',roughness:.3,clearcoat:.6}));call.position.set(-w*.33,h*.24,0);g.add(call);
  const end=call.clone();end.material=new T.MeshPhysicalMaterial({color:'#e03131',roughness:.3,clearcoat:.6});end.position.x=w*.33;g.add(end);
  return g;}
// 카메라 섬 + 렌즈
function cameraBlock(d,M,W,H,opts={}){const g=new T.Group();const cams=d.cams||[];if(!cams.length&&!(d.flash&&d.flash!=='none'))return g;
  const SENS=(typeof SENSORS!=='undefined')?SENSORS:[];const sz=m=>{const s=SENS.find(x=>x.id===m.sensor);return s?s.sz:.3;};
  const rad=m=>.2+sz(m)*.3*(opts.small?.8:1);const n=cams.length;const mr=n?Math.max(...cams.map(rad)):.25;const gap=mr*2.35;const lay=d.layout||'col';
  const pts=[];for(let i=0;i<n;i++){let px=0,py=0;
    if(lay==='col')py=(i-(n-1)/2)*gap;else if(lay==='row')px=(i-(n-1)/2)*gap;
    else if(lay==='sq'){px=(i%2-.5)*gap;py=(Math.floor(i/2)-(Math.ceil(n/2)-1)/2)*gap;if(n===1)px=0;}
    else if(lay==='circle'){const a=i/n*Math.PI*2-Math.PI/2;px=n>1?Math.cos(a)*gap*.62:0;py=n>1?Math.sin(a)*gap*.62:0;}
    else if(lay==='diag'){px=(i-(n-1)/2)*gap*.7;py=(i-(n-1)/2)*gap*.7;}
    else{px=(i%2)*gap*1.15-gap*.55;py=Math.floor(i/2)*gap*1.2;}
    pts.push([px,py]);}
  // 섬 크기
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const iw=n?Math.max(...xs)-Math.min(...xs)+mr*2+.32:0,ih=n?Math.max(...ys)-Math.min(...ys)+mr*2+.32:0;
  const cxs=n?(Math.max(...xs)+Math.min(...xs))/2:0,cys=n?(Math.max(...ys)+Math.min(...ys))/2:0;
  // 놓을 위치 (뒤에서 봤을 때 왼쪽 위 = 로컬 +x)
  let ax,ay;if(opts.center){ax=0;ay=H/2-Math.max(ih/2+.35,H*.18);}else if(lay==='row'){ax=0;ay=H/2-ih/2-.4;}else{ax=W/2-Math.max(iw/2+.32,W*.24);ay=H/2-ih/2-.35;}
  if(opts.center||lay==='row')ax=0;
  const isl=new T.Group();isl.name='island';isl.position.set(ax,ay,0);g.add(isl);
  if(n&&lay!=='free'){let m;if(lay==='circle'){const R=(n>1?gap*.62:0)+mr+.18;m=new T.Mesh(cyl(R,.14,48),M.island);}else m=new T.Mesh(rbox(iw,ih,.14,Math.min(mr+.16,Math.min(iw,ih)/2),.05),M.island);
    m.position.set(lay==='circle'?0:0,0,-.07);isl.add(m);}
  cams.forEach((cm,i)=>{const R=rad(cm);const px=-(pts[i][0]-cxs),py=-(pts[i][1]-cys);const L=new T.Group();L.position.set(lay==='circle'?-pts[i][0]:px,lay==='circle'?-pts[i][1]:py,-.14);
    if(cm.role==='peri'){const rim=new T.Mesh(rbox(R*2,R*2,.16,.08,.03),M.lensRing(cm.ois));rim.position.z=-.06;L.add(rim);const gl=new T.Mesh(rbox(R*1.4,R*1.4,.1,.04,.02),M.lensGlass);gl.position.z=-.1;L.add(gl);}
    else{const rim=new T.Mesh(cyl(R,.2,40),M.lensRing(cm.ois));rim.position.z=-.08;L.add(rim);const ins=new T.Mesh(cyl(R*.84,.21,40),new T.MeshStandardMaterial({color:'#050505',roughness:.6}));ins.position.z=-.085;L.add(ins);
      const gl=new T.Mesh(new T.SphereGeometry(R*.62,32,16,0,Math.PI*2,0,Math.PI*.32),M.lensGlass);gl.rotation.x=-Math.PI/2;gl.scale.set(1,.35,1);gl.position.z=-.19+.07*R;L.add(gl);
      const gl2=new T.Mesh(new T.CircleGeometry(R*.6,32),M.lensGlass);gl2.rotation.y=Math.PI;gl2.position.z=-.19;L.add(gl2);
      const dot=new T.Mesh(new T.CircleGeometry(R*.12,16),new T.MeshBasicMaterial({color:'#6a8cff',transparent:true,opacity:.7}));dot.rotation.y=Math.PI;dot.position.set(-R*.18,R*.18,-.195);L.add(dot);}
    isl.add(L);});
  if(d.flash&&d.flash!=='none'){const fx=n?(lay==='row'?-(iw/2+.25):-(cxs-Math.max(...xs))-mr-.05):0,fy=n?(lay==='row'?0:(-(Math.min(...ys)-cys))+mr*.2):0;
    const fl=d.flash==='ring'?new T.Mesh(new T.TorusGeometry(.13,.035,10,24),new T.MeshStandardMaterial({color:'#fff6d0',emissive:'#ffe08a',emissiveIntensity:.8})):new T.Mesh(cyl(d.flash==='dual'?.13:.1,.05,20),new T.MeshStandardMaterial({color:'#fff6d0',emissive:'#ffe08a',emissiveIntensity:.7,roughness:.3}));
    fl.position.set(lay==='row'?fx:-fx+(n?0:0),fy,-.14);if(lay!=='row'&&n)fl.position.set(-(Math.max(...xs)-cxs)-mr-.22,(cys-Math.min(...ys))-mr*.3,-.12);
    if(lay==='row')fl.position.set(-(iw/2)-.22,0,-.12);isl.add(fl);}
  return g;}
function backLogo(name,M,y,t,s=1){const m=new T.Mesh(new T.PlaneGeometry(2.6*s,.65*s),new T.MeshStandardMaterial({map:logoTex((name||'P').slice(0,8),!M.dark),transparent:true,metalness:.6,roughness:.3}));
  m.rotation.y=Math.PI;m.position.set(0,y,-t/2-.012);return m;}

/* ---------- 휴대폰 전체 ---------- */
function buildPhone(d,brand){const M=mats(d);const f=d.form;const root=new T.Group();const anim={kind:'none'};
  const FEAT=!['smart','gaming','fold','flip','tri','roll'].includes(f);
  const size=d.size||(FEAT?2.2:6.4);const thinK=(d.thin||5);const feats=d.feats||[];
  if(f==='folder'){const w=4.6,hh=4.6,t=.55+thinK*.05,r=.6;
    const bottom=slab(d,M,{w,h:hh,t,r,front:'body'});bottom.position.set(0,-hh/2,0);root.add(bottom);
    const kp=keypad(M,w,hh);kp.position.set(0,-hh*.3,t/2+.06);root.add(kp);
    const piv=new T.Group();piv.position.set(0,0,t/2);root.add(piv);
    const top=slab(d,M,{w,h:hh,t,r,front:'body'});top.position.set(0,hh/2,-t/2);piv.add(top);
    const scr=new T.Mesh(rplane(w*.78,hh*.72,.12),new T.MeshBasicMaterial({map:lcdScreen(d.panel),toneMapped:false}));scr.position.set(0,hh/2+.1,.01);piv.add(scr);
    const bz=new T.Mesh(rplane(w*.86,hh*.8,.2),M.glassBlack);bz.position.set(0,hh/2+.1,.005);piv.add(bz);
    const hinge=new T.Mesh(new T.CylinderGeometry(t*.55,t*.55,w*.7,24),M.frame);hinge.rotation.z=Math.PI/2;hinge.position.set(0,0,0);root.add(hinge);
    // 바깥(뒤) 화면 · 카메라
    if(feats.includes('outer')){const os=new T.Mesh(rplane(w*.55,hh*.3,.1),new T.MeshBasicMaterial({map:lcdScreen(d.panel==='mono'?'mono':'stn'),toneMapped:false}));os.position.set(0,hh*.4,-t-.014);os.rotation.y=Math.PI;piv.add(os);
      const ob=new T.Mesh(rplane(w*.62,hh*.37,.15),M.glassBlack);ob.position.set(0,hh*.4,-t-.01);ob.rotation.y=Math.PI;piv.add(ob);}
    const cb=cameraBlock(d,M,w,hh,{center:true,small:1});cb.position.set(0,hh/2,-t);piv.add(cb);
    const lg=backLogo(brand,M,0,t,.8);lg.position.set(0,hh*.13,-t-.012);piv.add(lg);
    anim.kind='folder';anim.set=(a)=>{piv.rotation.x=(1-a)*Math.PI+a*(-.28);};anim.open=1;
    root.userData.size=hh*2.1;}
  else if(f==='slide'){const w=4.6,h=9,t=.42+thinK*.03,r=.7;const sg=new T.Group();sg.position.y=-h*.18;root.add(sg);
    const base=slab(d,M,{w,h,t,r,front:'body'});base.position.z=-t/2;sg.add(base);const kp=keypad(M,w,h*.55);kp.position.set(0,-h*.12,.07);sg.add(kp);
    const top=slab(d,M,{w,h,t,r,front:'glass',screen:{tex:lcdScreen(d.panel),bx:.35,top:.9,bot:h*.38,r:.15}});top.position.z=t/2+.02;sg.add(top);
    const cb=cameraBlock(d,M,w,h,{small:1});cb.position.z=-t;sg.add(cb);const lg=backLogo(brand,M,-h*.15,t*2,.8);sg.add(lg);
    anim.kind='slide';anim.set=(a)=>{top.position.y=a*h*.38;};anim.open=1;root.userData.size=h*1.4;}
  else if(FEAT){const w=f==='rugged'?5.2:4.6,h=f==='rugged'?10.6:10.2,t=(f==='rugged'?1.1:.7)+thinK*.06,r=f==='rugged'?.5:.9;
    const s=slab(d,M,{w,h,t,r,front:'body'});root.add(s);
    const scr=new T.Mesh(rplane(w*.78,h*.36,.12),new T.MeshBasicMaterial({map:lcdScreen(d.panel),toneMapped:false}));scr.position.set(0,h*.2,t/2+.02);root.add(scr);
    const bz=new T.Mesh(rplane(w*.88,h*.43,.25),M.glassBlack);bz.position.set(0,h*.2,t/2+.012);root.add(bz);
    const kp=keypad(M,w,h*.45);kp.position.set(0,-h*.12,t/2+.06);root.add(kp);
    if(f==='rugged'){for(const sx of[-1,1])for(const sy of[-1,1]){const b=new T.Mesh(rbox(1,1.4,t+.2,.3,.1),M.rubber);b.position.set(sx*(w/2-.35),sy*(h/2-.55),0);root.add(b);}}
    const cb=cameraBlock(d,M,w,h,{center:true,small:1});cb.position.z=-t/2;root.add(cb);root.add(backLogo(brand,M,-h*.1,t));root.userData.size=h*1.05;}
  else if(f==='fold'||f==='tri'){const n=f==='tri'?3:2;const h=9+size*.75,pw=f==='tri'?h*.48:h*.52,t=.3+thinK*.02,r=.55;
    const tex=smartScreen(d.cut,d.panel,true,brand);const panels=[];
    // 가운데(0번) 패널을 기준으로 오른쪽으로 펼쳐요
    let prev=root,prevX=0;
    for(let i=0;i<n;i++){const p=slab(d,M,{w:pw,h,t,r:i===0||i===n-1?r:.08,front:'glass',screen:{tex,bx:i===0?.18:0,top:.18,bot:.18,r:.12,u0:i/n+(i===0?.18/pw/n:0),u1:(i+1)/n-(i===n-1?.18/pw/n:0)}});
      if(i===0){p.position.x=-pw/2*(n-1)/1;root.add(p);panels.push({g:p});prev=p;continue;}
      const piv=new T.Group();piv.position.set(pw/2,0,i%2?t/2:-t/2);prev.add(piv);p.position.set(pw/2,0,i%2?-t/2:t/2);piv.add(p);panels.push({g:p,piv,dir:i%2?1:-1});prev=p;}
    // 바깥 화면 · 카메라
    const first=panels[0].g;const cb=cameraBlock(d,M,pw,h,{});cb.position.z=-t/2;first.add(cb);first.add(backLogo(brand,M,-h*.2,t,.9));
    const last=panels[n-1].g;const cover=new T.Mesh(rplane(pw-.3,h-.4,.4),new T.MeshBasicMaterial({map:smartScreen(d.cut,d.panel,false,brand),toneMapped:false}));cover.rotation.y=Math.PI;cover.position.z=-t/2-.012;if(f==='fold')last.add(cover);
    anim.kind='fold';anim.set=(a)=>{panels.forEach((p,i)=>{if(!p.piv)return;const closed=(f==='tri'?(i===1?-Math.PI:Math.PI):-Math.PI)*.985;p.piv.rotation.y=(1-a)*closed+a*(f==='tri'?(i===1?.22:-.22):-.18)*1;});};anim.open=1;
    root.userData.size=Math.max(h,pw*n)*1.05;root.userData.cx=0;}
  else if(f==='flip'){const w=7.1,hh=7.6,t=.36+thinK*.02,r=.75;const tex=smartScreen(d.cut,d.panel,false,brand);
    const bottom=slab(d,M,{w,h:hh,t,r,front:'glass',screen:{tex,bx:.18,top:0,bot:.2,r:.4,v0:0,v1:.5}});bottom.position.y=-hh/2;root.add(bottom);
    const piv=new T.Group();piv.position.set(0,0,t/2);root.add(piv);
    const top=slab(d,M,{w,h:hh,t,r,front:'glass',screen:{tex,bx:.18,top:.2,bot:0,r:.4,v0:.5,v1:1}});top.position.set(0,hh/2,-t/2);piv.add(top);
    const hinge=new T.Mesh(new T.CylinderGeometry(t*.5,t*.5,w*.96,24),M.frame);hinge.rotation.z=Math.PI/2;root.add(hinge);
    const cover=new T.Mesh(rplane(w-.6,hh*.48,.45),new T.MeshBasicMaterial({map:smartScreen('bezel',d.panel,true,brand),toneMapped:false}));cover.rotation.y=Math.PI;cover.position.set(0,-hh*.1,-t/2-.012);top.add(cover);
    const cb=cameraBlock(d,M,w,hh,{small:1});cb.position.set(0,hh*.03,-t/2-.01);top.add(cb);
    const lg=backLogo(brand,M,-hh*.25,t,.8);bottom.add(lg);
    anim.kind='flip';anim.set=(a)=>{piv.rotation.x=(1-a)*Math.PI*.99+a*(-.12);};anim.open=1;root.userData.size=hh*2.1;}
  else if(f==='roll'){const h=9+size*.75,w=h*.46,t=.42+thinK*.02,r=.75;const tex=smartScreen(d.cut,d.panel,true,brand);
    const body=slab(d,M,{w,h,t,r,front:'glass'});root.add(body);const slider=slab(d,M,{w:w*.55,h,t,r,front:'glass'});slider.position.x=w*.22;slider.position.z=-.02;root.add(slider);
    const roll=new T.Mesh(new T.CylinderGeometry(t*.52,t*.52,h-.3,24),M.frame);root.add(roll);
    const sm=new T.MeshBasicMaterial({map:tex,toneMapped:false});const scr=new T.Mesh(rplane(1,h-.36,.0),sm);scr.position.z=t/2+.01;root.add(scr);
    const cb=cameraBlock(d,M,w,h,{});cb.position.z=-t/2;body.add(cb);body.add(backLogo(brand,M,-h*.2,t,.9));
    anim.kind='roll';anim.set=(a)=>{const ext=a*w*.6;slider.position.x=w*.22+ext;roll.position.x=w/2+ext-t*.2;const sw=w-.36+ext;scr.scale.x=sw;scr.position.x=-w/2+.18+sw/2;
      tex.repeat.set(1,1);root.userData.cx=ext/2;};anim.open=1;root.userData.size=h*1.05;}
  else{ // 스마트폰 · 게이밍폰
    const h=9+size*.95,w=h*.47,t=.5+thinK*.045,r=.55+Math.min(.65,size*.08);const bz=d.cut==='bezel'?.42:.14;
    const s=slab(d,M,{w,h,t,r,front:'glass',screen:{tex:smartScreen(d.cut,d.panel,false,brand),bx:bz*.55,top:d.cut==='bezel'?bz*2.2:bz,bot:d.cut==='bezel'?bz*2.2:bz,r:Math.max(.08,r-bz)}});root.add(s);
    if(d.cut==='bezel'){const sp=new T.Mesh(rplane(w*.18,.08,.04),new T.MeshStandardMaterial({color:'#222'}));sp.position.set(0,h/2-bz*1.1,t/2+.01);root.add(sp);
      const hb=new T.Mesh(rplane(.9,.55,.27),M.frame);hb.position.set(0,-h/2+bz*1.1,t/2+.012);root.add(hb);}
    const cb=cameraBlock(d,M,w,h,{});cb.position.z=-t/2;root.add(cb);root.add(backLogo(brand,M,-h*.12,t,.9));
    if(f==='gaming'){const led=new T.Mesh(rplane(.18,h*.35,.08),new T.MeshBasicMaterial({color:'#3bf0ff'}));led.rotation.y=Math.PI;led.position.set(-w*.15,-h*.05,-t/2-.014);root.add(led);
      const led2=led.clone();led2.material=new T.MeshBasicMaterial({color:'#ff3b8a'});led2.position.x=-w*.15-.3;root.add(led2);
      for(const sy of[1,-1]){const tr=new T.Mesh(rbox(.12,1.1,t*.5,.05,.02),new T.MeshStandardMaterial({color:'#ff3b5c',metalness:.5,roughness:.3}));tr.position.set(w/2+.03,sy*h*.3,0);root.add(tr);}}
    // 옆 버튼
    const btn=new T.Mesh(rbox(.1,1.6,t*.4,.04,.02),M.frame);btn.position.set(w/2+.02,h*.15,0);root.add(btn);
    root.userData.size=h*1.05;}
  root.userData.anim=anim;return root;}

/* ---------- 렌더러 · 장면 ---------- */
function envFor(ren){const sc=new T.Scene();sc.background=new T.Color('#30343c');
  const room=new T.Mesh(new T.BoxGeometry(40,40,40),new T.MeshBasicMaterial({color:'#2b2f37',side:T.BackSide}));sc.add(room);
  const lamp=(x,y,z,w,h,c,i)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(i),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);sc.add(m);};
  lamp(0,18,0,22,8,'#ffffff',5);lamp(-18,4,6,6,20,'#dfe9ff',3.5);lamp(18,2,-4,6,18,'#ffe7d0',3);lamp(0,-6,18,26,4,'#9fb8ff',1.6);lamp(4,6,-18,14,6,'#ffffff',2);
  const pm=new T.PMREMGenerator(ren);const rt=pm.fromScene(sc,.03);pm.dispose();return rt.texture;}
function stage(ren){const scene=new T.Scene();scene.environment=envFor(ren);
  const cam=new T.PerspectiveCamera(30,1,.1,200);
  const key=new T.DirectionalLight('#ffffff',1.1);key.position.set(4,8,10);scene.add(key);const rim=new T.DirectionalLight('#9ec5ff',.7);rim.position.set(-8,3,-6);scene.add(rim);scene.add(new T.AmbientLight('#ffffff',.15));
  // 바닥 그림자 (부드러운 원)
  const shTex=canvasTex('shadow',128,128,(g,W,H)=>{const gr=g.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const sh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shTex,transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;scene.add(sh);
  return {scene,cam,sh};}
function mkRen(canvas,opts={}){const r=new T.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:!!opts.keep});r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.setPixelRatio(opts.dpr||Math.min(2,devicePixelRatio||1));return r;}
function dispose(o){o.traverse(m=>{if(m.geometry)m.geometry.dispose();if(m.material){const ms=Array.isArray(m.material)?m.material:[m.material];ms.forEach(x=>{if(x.map&&!Object.values(texCache).includes(x.map))x.map.dispose();x.dispose();});}});}
function frame(st,phone,yaw,pitch,aspect){const s=phone.userData.size||12;const cx=phone.userData.cx||0;st.cam.aspect=aspect;st.cam.fov=30;st.cam.updateProjectionMatrix();
  const dist=s/(2*Math.tan(T.MathUtils.degToRad(15)))*(aspect<1?1.15/Math.max(.6,aspect):1.08);st.cam.position.set(0,s*.06,dist);st.cam.lookAt(0,0,0);
  phone.rotation.set(pitch,yaw,0);phone.position.set(-cx*Math.cos(yaw),0,cx*Math.sin(yaw));st.sh.scale.set(s*.9,s*.35,1);st.sh.position.set(0,-s*.52,0);}

/* ---------- 미리보기 (드래그로 돌리기) ---------- */
let ren=null,st=null,phone=null,canvas=null,host=null,yaw=-.5,pitch=-.08,vy=0,dragging=false,auto=true,lastKey='',openA=1,openT=1,lastT=0,idleT=0,raf=0;
function ensure(){if(ren)return;canvas=document.createElement('canvas');canvas.className='p3c';canvas.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
  ren=mkRen(canvas);st=stage(ren);
  let px=0,py=0;canvas.addEventListener('pointerdown',e=>{dragging=true;auto=false;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;yaw+=dx*.012;vy=dx*.012;pitch=cl(pitch+dy*.006,-.6,.6);idleT=0;});
  const up=()=>{dragging=false;canvas.style.cursor='grab';};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  loop(0);}
let mode=null;
function loop(t){raf=requestAnimationFrame(loop);if(!host||!host.isConnected||document.hidden)return;if(!mode&&!phone)return;const dt=Math.min(.05,(t-lastT)/1000||0);lastT=t;
  const r=host.getBoundingClientRect();if(r.width<10)return;const W=Math.round(r.width),H=Math.round(r.height);if(canvas.width!==Math.round(W*ren.getPixelRatio())||canvas.height!==Math.round(H*ren.getPixelRatio()))ren.setSize(W,H,false);
  if(mode){mode(dt,t,W,H);return;}
  if(!dragging){yaw+=vy;vy*=.92;idleT+=dt;if(idleT>2.5)auto=true;if(auto)yaw+=dt*.45;}
  openA+=(openT-openA)*Math.min(1,dt*4);const an=phone.userData.anim;if(an&&an.set)an.set(openA);
  frame(st,phone,yaw,pitch+Math.sin(t/1600)*.03,W/H);phone.position.y=Math.sin(t/900)*.12;ren.render(st.scene,st.cam);}
const P3={
  ok:true,
  mount(el){ensure();mode=null;host=el;if(canvas.parentNode!==el)el.appendChild(canvas);},
  show(d,brand){ensure();const key=JSON.stringify([d.form,d.mat,d.color,d.panel,d.cut,d.size,d.thin,d.cams,d.layout,d.flash,d.feats,brand]);if(key===lastKey&&phone)return;lastKey=key;
    if(phone){st.scene.remove(phone);dispose(phone);}phone=buildPhone(d,brand);st.scene.add(phone);const an=phone.userData.anim;if(an&&an.set)an.set(openA);},
  canOpen(d){return ['folder','slide','fold','tri','flip','roll'].includes(d.form);},
  toggleOpen(){openT=openT>.5?0:1;return openT>.5;},
  isOpen(){return openT>.5;},
  spin(dir){auto=false;idleT=0;vy=dir*.09;},
  face(back){auto=false;idleT=0;yaw=back?Math.PI-.4:-.4;vy=0;},
  thumb(d,brand,view='back',px=260){const k=JSON.stringify([d.form,d.mat,d.color,d.panel,d.cut,d.size,d.thin,d.cams,d.layout,d.flash,d.feats,brand,view,px]);if(thumbCache[k])return thumbCache[k];
    if(!tRen){tCan=document.createElement('canvas');tCan.width=tCan.height=px;tRen=mkRen(tCan,{keep:1,dpr:1});tSt=stage(tRen);}
    tRen.setSize(px,px,false);const ph=buildPhone(d,brand);const an=ph.userData.anim;if(an&&an.set)an.set(view==='closed'?0:1);tSt.scene.add(ph);
    frame(tSt,ph,view==='back'?Math.PI-.45:view==='closed'?-.5:-.45,-.1,1);tRen.render(tSt.scene,tSt.cam);const url=tCan.toDataURL('image/png');tSt.scene.remove(ph);dispose(ph);thumbCache[k]=url;return url;},
};
let tRen=null,tCan=null,tSt=null;const thumbCache={};

/* ---------- 시제품 조립 (작업대) ---------- */
function ringGeo(w,h,r,wall,t){const o=rrShape(w,h,r);const hole=rrShape(w-wall*2,h-wall*2,Math.max(.05,r-wall));o.holes.push(hole);
  const g=new T.ExtrudeGeometry(o,{depth:t-.1,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:3,curveSegments:10});g.translate(0,0,-(t-.1)/2);g.computeVertexNormals();return g;}
function pcbTex(){return canvasTex('pcb',256,128,(g,W,H)=>{g.fillStyle='#0f5132';g.fillRect(0,0,W,H);g.strokeStyle='#c9a227';g.globalAlpha=.55;g.lineWidth=1.4;
  for(let i=0;i<40;i++){g.beginPath();let x=Math.random()*W,y=Math.random()*H;g.moveTo(x,y);for(let k=0;k<4;k++){if(Math.random()<.5)x+=(Math.random()-.5)*80;else y+=(Math.random()-.5)*50;g.lineTo(x,y);}g.stroke();}
  g.globalAlpha=1;g.fillStyle='#d4af37';for(let i=0;i<60;i++){g.beginPath();g.arc(Math.random()*W,Math.random()*H,1.6,0,7);g.fill();}});}
function battTex(mah){return canvasTex('batt'+mah,256,192,(g,W,H)=>{const gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#2b2f36');gr.addColorStop(1,'#16191e');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle='#ffd43b';g.font='900 46px Arial';g.textAlign='center';g.fillText('⚡',W/2,H*.38);g.fillStyle='#fff';g.font='800 34px Arial';g.fillText(mah+'mAh',W/2,H*.62);g.font='600 16px Arial';g.fillStyle='#9aa4b5';g.fillText('Li-ion · 3.85V',W/2,H*.8);});}
function tableTex(){return canvasTex('table',256,256,(g,W,H)=>{g.fillStyle='#1b2433';g.fillRect(0,0,W,H);g.strokeStyle='rgba(120,170,255,.16)';g.lineWidth=1;for(let i=0;i<=16;i++){g.beginPath();g.moveTo(i*16,0);g.lineTo(i*16,H);g.stroke();g.beginPath();g.moveTo(0,i*16);g.lineTo(W,i*16);g.stroke();}});}
const ASM_STEPS=[
 {id:'frame',n:'프레임',i:'🔲'},{id:'board',n:'메인보드',i:'🟩'},{id:'chip',n:'칩',i:'🧠'},{id:'ram',n:'램 · 저장',i:'💾'},{id:'batt',n:'배터리',i:'🔋'},
 {id:'cam',n:'카메라 모듈',i:'📸'},{id:'spk',n:'스피커 · 진동',i:'🔊'},{id:'back',n:'뒷판',i:'🎨'},{id:'screen',n:'화면',i:'🖥️'}];
P3.ASM_STEPS=ASM_STEPS;
P3.assembly=function(el,d,chip,brand){ensure();host=el;if(canvas.parentNode!==el)el.appendChild(canvas);
  const sc=stage(ren);sc.sh.visible=false;const M=mats(d);
  const FEAT=!['smart','gaming','fold','flip','tri','roll'].includes(d.form);const size=d.size||6.4;
  const h=FEAT?10:9+Math.min(size,7)*.95,w=FEAT?4.8:h*.47,t=FEAT?1:.62,r=FEAT?.8:.55+Math.min(.65,size*.08);
  const table=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({map:(()=>{const x=tableTex();x.wrapS=x.wrapT=T.RepeatWrapping;x.repeat.set(10,10);return x;})(),roughness:.85}));table.rotation.x=-Math.PI/2;table.position.y=-t/2-.02;sc.scene.add(table);
  const outer=new T.Group();outer.rotation.x=Math.PI/2;sc.scene.add(outer);const inner=new T.Group();inner.rotation.z=Math.PI;outer.add(inner);
  const parts={};
  const mk=(id,obj,target)=>{obj.userData.target=target.clone();parts[id]=obj;inner.add(obj);};
  // 프레임
  const fr=new T.Group();fr.add(new T.Mesh(ringGeo(w,h,r,.22,t),M.frame));const mid=new T.Mesh(rplane(w-.3,h-.3,Math.max(.05,r-.15)),new T.MeshStandardMaterial({color:'#3a3f47',metalness:.7,roughness:.45,side:T.DoubleSide}));mid.position.z=t*.15;fr.add(mid);
  mk('frame',fr,new T.Vector3(0,0,0));
  // 메인보드
  const bw=w*.82,bh=h*.34;const bd=new T.Mesh(rbox(bw,bh,.08,.2,.02),new T.MeshStandardMaterial({map:pcbTex(),roughness:.6}));mk('board',bd,new T.Vector3(0,h*.27,-t*.05));
  // 칩 (내 칩 이름이 찍힌 패키지)
  const pc=document.createElement('canvas');pc.width=pc.height=256;try{drawPackage(pc.getContext('2d'),chip||{name:'X1',node:'n180'},256,256,brand);}catch(e){}
  const ptx=new T.CanvasTexture(pc);ptx.encoding=T.sRGBEncoding;const chipG=new T.Group();const cb=new T.Mesh(new T.BoxGeometry(1.5,1.5,.14),new T.MeshStandardMaterial({color:'#15181d',roughness:.5}));chipG.add(cb);
  const ctop=new T.Mesh(new T.PlaneGeometry(1.5,1.5),new T.MeshStandardMaterial({map:ptx,metalness:.5,roughness:.35}));ctop.rotation.y=Math.PI;ctop.position.z=-.075;chipG.add(ctop);
  mk('chip',chipG,new T.Vector3(-bw*.14,h*.27,-t*.05-.11));
  // 램
  const ramG=new T.Group();for(const k of [0,1]){const m=new T.Mesh(rbox(.9,.55,.1,.05,.02),new T.MeshStandardMaterial({color:'#111',roughness:.4,metalness:.3}));m.position.set(.2,k*.75-.35,0);ramG.add(m);}
  mk('ram',ramG,new T.Vector3(bw*.24,h*.27,-t*.05-.09));
  // 배터리
  const bt=new T.Group();const bb=new T.Mesh(rbox(w*.76,h*.44,t*.5,.15,.05),new T.MeshStandardMaterial({color:'#c0c6cf',metalness:.8,roughness:.35}));bt.add(bb);
  const bl=new T.Mesh(new T.PlaneGeometry(w*.66,h*.36),new T.MeshStandardMaterial({map:battTex(d.mah||3000),roughness:.6}));bl.rotation.y=Math.PI;bl.position.z=-t*.25-.01;bt.add(bl);
  mk('batt',bt,new T.Vector3(0,-h*.14,-t*.05));
  // 카메라 모듈 (뒷면 렌즈 개수만큼)
  const camG=new T.Group();const nC=Math.max(1,(d.cams||[]).length);for(let i=0;i<nC;i++){const m=new T.Group();const box=new T.Mesh(rbox(.95,.95,.45,.12,.04),new T.MeshStandardMaterial({color:'#1a1d22',roughness:.5}));m.add(box);
    const ln=new T.Mesh(cyl(.32,.2),M.lensRing(i===0));ln.position.z=-.3;m.add(ln);const gl=new T.Mesh(new T.CircleGeometry(.26,24),M.lensGlass);gl.rotation.y=Math.PI;gl.position.z=-.41;m.add(gl);
    m.position.set((i%2)*1.05,-Math.floor(i/2)*1.05,0);camG.add(m);}
  mk('cam',camG,new T.Vector3(w/2-1.25,h/2-1.1,-t*.1));
  // 스피커 · 진동
  const spG=new T.Group();const sp=new T.Mesh(rbox(1.6,.6,.3,.1,.03),new T.MeshStandardMaterial({color:'#222',roughness:.7}));sp.position.x=-w*.18;spG.add(sp);
  const vib=new T.Mesh(cyl(.32,.25),new T.MeshStandardMaterial({color:'#b9bec5',metalness:.9,roughness:.3}));vib.position.x=w*.22;spG.add(vib);
  mk('spk',spG,new T.Vector3(0,-h*.42,-t*.05));
  // 뒷판 (색 · 카메라 섬 · 로고)
  const backG=new T.Group();const bp=new T.Mesh(rbox(w-.08,h-.08,.08,Math.max(.05,r-.04),.03),M.back);backG.add(bp);
  const isl=cameraBlock(d,M,w,h,FEAT?{center:true,small:1}:{});isl.position.z=-.04;backG.add(isl);const lg=backLogo(brand,M,-h*.12,.08,.9);backG.add(lg);
  mk('back',backG,new T.Vector3(0,0,-t/2-.02));
  // 화면 (마지막에 앞으로 뒤집어서)
  const scG=new T.Group();const gl=new T.Mesh(rplane(w-.1,h-.1,Math.max(.05,r-.05)),M.glassBlack);scG.add(gl);
  const scrTex=FEAT?lcdScreen(d.panel):smartScreen(d.cut,d.panel,false,brand);const scr=new T.Mesh(FEAT?rplane(w*.78,h*.36,.12):rplane(w-.3,h-.3,Math.max(.05,r-.15)),new T.MeshBasicMaterial({map:scrTex,toneMapped:false,transparent:true,opacity:0}));scr.position.set(0,FEAT?h*.2:0,.005);scG.add(scr);
  if(FEAT){const kp=keypad(M,w,h*.45);kp.position.set(0,-h*.12,.05);scG.add(kp);}
  mk('screen',scG,new T.Vector3(0,0,t/2+.006));
  // 처음엔 모두 작업대 둘레에 놓여 있어요
  const spots=[[-1.55,.75],[1.55,.75],[-1.55,0],[1.55,0],[-1.55,-.75],[1.55,-.75],[0,1.25],[-1.5,1.35],[1.5,1.35]];
  ASM_STEPS.forEach((s0,i)=>{const p=parts[s0.id];const [sx,sy]=spots[i%spots.length];p.userData.start=new T.Vector3(sx*w*1.05,sy*h*.6,-t*.6);p.position.copy(p.userData.start);p.rotation.z=(i%3-1)*.35;});
  parts.screen.rotation.y=Math.PI;// 앞면이 위로 보이게 놓여 있어요
  let flips=0,flipT=0;const anims=[];const fx=[];let fin=null,finT=0,spinY=0;
  const camPos=new T.Vector3(0,h*2.15,h*1.25),look=new T.Vector3(0,0,-h*.05);
  mode=(dt,tm,W,H)=>{
    for(const a of anims){a.t=Math.min(1,a.t+dt/a.dur);const e=a.t<.5?2*a.t*a.t:1-Math.pow(-2*a.t+2,2)/2;const p=a.obj;p.position.lerpVectors(a.from,a.to,e);p.position.z+=-Math.sin(a.t*Math.PI)*h*.18;
      p.rotation.z=a.r0+(a.r1-a.r0)*e;if(a.ry!=null)p.rotation.y=a.ry0+(a.ry-a.ry0)*e;if(a.t>=1&&!a.done){a.done=1;p.scale.setScalar(1.06);a.cb&&a.cb();}}
    for(const k in parts){const p=parts[k];p.scale.lerp(new T.Vector3(1,1,1),Math.min(1,dt*10));}
    for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t=Math.min(1,f.t+dt/f.dur);f.up(f.t);if(f.t>=1)fx.splice(i,1);}
    if(flips){flipT=Math.min(1,flipT+dt*1.4);inner.rotation.y=Math.PI*(flipT<.5?2*flipT*flipT:1-Math.pow(-2*flipT+2,2)/2);}
    if(fin){finT+=dt;spinY+=dt*.6;fin.rotation.set(-.08,-.5+spinY,0);fin.position.y=t*2+Math.sin(tm/700)*.15;const k=Math.min(1,finT*1.5);outer.scale.setScalar(1-k);
      sc.cam.position.lerp(new T.Vector3(0,h*.35,h*2.3),Math.min(1,dt*2.5));look.lerp(new T.Vector3(0,t*2,0),Math.min(1,dt*2.5));}
    const asp=W/H;sc.cam.aspect=asp;sc.cam.fov=40;sc.cam.updateProjectionMatrix();const kk=asp<1.3?Math.min(2.4,1.3/asp):1;if(!fin)sc.cam.position.copy(camPos).multiplyScalar(kk);sc.cam.lookAt(look);
    if(scr.material.opacity<1&&ctl.lit)scr.material.opacity=Math.min(1,scr.material.opacity+dt*1.6);
    ren.render(sc.scene,sc.cam);};
  // 도구로 작업할 자리 (부품 기준 좌표)
  const bx=0,by=h*.27,bz=-t*.05,cx=-bw*.14,ramx=bw*.24,camx=w/2-1.25,camy=h/2-1.1;
  const rectPts=(cx0,cy0,hw,hh,z,n)=>{const out=[];const per=2*(hw+hh)*2;for(let i=0;i<n;i++){let d0=i/n*per;let x,y;
      if(d0<hw*2){x=cx0-hw+d0;y=cy0+hh;}else if((d0-=hw*2)<hh*2){x=cx0+hw;y=cy0+hh-d0;}else if((d0-=hh*2)<hw*2){x=cx0+hw-d0;y=cy0-hh;}else{d0-=hw*2;x=cx0-hw;y=cy0-hh+d0;}out.push(new T.Vector3(x,y,z));}return out;};
  const PTS={
    'board:drill':[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>new T.Vector3(bx+a*(bw/2-.3),by+b*(bh/2-.3),bz-.07)),
    'chip:solder':[[-1.05,0],[1.05,0],[0,-1.05],[0,1.05]].map(([a,b])=>new T.Vector3(cx+a,by+b,bz-.07)),
    'ram:solder':[new T.Vector3(ramx+.75,by+.4,bz-.07),new T.Vector3(ramx+.75,by-.35,bz-.07)],
    'batt:glue':rectPts(0,-h*.14,w*.3,h*.18,t*.12,18),
    'batt:plug':[new T.Vector3(.0,-h*.14+h*.22+.25,bz-.12)],
    'cam:plug':[new T.Vector3(camx-.85,camy-.75,bz-.12)],
    'cam:drill':[new T.Vector3(camx-.75,camy+.45,bz-.08)],
    'spk:drill':[new T.Vector3(-w*.18-1.05,-h*.42,bz-.18),new T.Vector3(w*.22+.55,-h*.42,bz-.18)],
    'back:glue':rectPts(0,0,w/2-.28,h/2-.28,-t/2+.06,26),
    'screen:glue':rectPts(0,0,w/2-.25,h/2-.25,t/2-.03,26),
  };
  const v3=new T.Vector3();
  const metal=new T.MeshStandardMaterial({color:'#d9dde3',metalness:1,roughness:.25});
  const glueM=new T.MeshPhysicalMaterial({color:'#fff1a8',roughness:.15,clearcoat:1,emissive:'#5a4a10',emissiveIntensity:.3});
  const ctl={lit:false,
    pts(part,tool){return PTS[part+':'+tool]||[];},
    partPos(id){return parts[id].position.clone();},
    project(list){const r=el.getBoundingClientRect();sc.scene.updateMatrixWorld();return list.map(p=>{v3.copy(p);inner.localToWorld(v3);v3.project(sc.cam);return {x:(v3.x+1)/2*r.width,y:(1-v3.y)/2*r.height,vis:v3.z<1};});},
    place(id){return new Promise(res=>{const p=parts[id];const to=p.userData.target.clone();
      const go=()=>{anims.push({obj:p,from:p.position.clone(),to,t:0,dur:.7,r0:p.rotation.z,r1:0,ry0:p.rotation.y,ry:id==='screen'?0:null,cb:()=>{if(id==='screen'){ctl.lit=true;}res();}});};
      if(id==='screen'&&!flips){flips=1;setTimeout(go,650);}else go();});},
    flipOver(){return new Promise(res=>{flips=1;setTimeout(res,900);});},
    addScrew(p){const g=new T.Group();const head=new T.Mesh(cyl(.14,.07,20),metal);g.add(head);const sl=new T.Mesh(new T.BoxGeometry(.2,.035,.03),new T.MeshStandardMaterial({color:'#333'}));sl.position.z=-.04;g.add(sl);
      const sl2=sl.clone();sl2.rotation.z=Math.PI/2;g.add(sl2);const shaft=new T.Mesh(cyl(.05,.4,10),metal);shaft.position.z=.22;g.add(shaft);inner.add(g);
      const z0=p.z-.6;g.position.set(p.x,p.y,z0);fx.push({t:0,dur:.55,up:k=>{g.position.z=z0+(p.z-z0)*k;g.rotation.z=k*Math.PI*8;}});},
    addGlue(p){const m=new T.Mesh(new T.SphereGeometry(.13,12,8),glueM);m.scale.set(1,1,.45);m.position.copy(p);inner.add(m);fx.push({t:0,dur:.18,up:k=>{m.scale.set(k*1.2,k*1.2,.45*k);}});},
    addPlug(p){const m=new T.Mesh(new T.BoxGeometry(.6,.3,.16),new T.MeshStandardMaterial({color:'#e8e8e8',metalness:.3,roughness:.4}));const z0=p.z-.5;m.position.set(p.x,p.y,z0);inner.add(m);fx.push({t:0,dur:.2,up:k=>{m.position.z=z0+(p.z-z0)*k;}});},
    addSolder(p){const mm=new T.MeshStandardMaterial({color:'#c9ced6',metalness:.9,roughness:.2,emissive:'#ff6a00',emissiveIntensity:1.6});const m=new T.Mesh(new T.SphereGeometry(.12,12,8),mm);m.scale.z=.5;m.position.copy(p);inner.add(m);fx.push({t:0,dur:1.2,up:k=>{mm.emissiveIntensity=1.6*(1-k);}});},
    finish(){const ph=buildPhone(d,brand);sc.scene.add(ph);fin=ph;const an=ph.userData.anim;if(an&&an.set)an.set(1);ph.scale.setScalar(.9);},
    destroy(){mode=null;}};
  return ctl;};

/* ---------- 광고 영상용 렌더러 ---------- */
P3.adRenderer=function(W,H){const c=document.createElement('canvas');c.width=W;c.height=H;const r=mkRen(c,{keep:1,dpr:1});r.setSize(W,H,false);const s=stage(r);s.sh.visible=false;
  s.scene.add(new T.PointLight('#ffffff',.6,60));
  let models=[],cur=null,brandN='';const v=new T.Vector3(),look=new T.Vector3();
  return {canvas:c,
    set(d,brand,colors){models.forEach(m=>{s.scene.remove(m);dispose(m);});models=[];brandN=brand;const cs=colors&&colors.length?colors:[d.color];
      for(const col of cs){const m=buildPhone(Object.assign({},d,{color:col}),brand);m.visible=false;s.scene.add(m);models.push(m);}},
    frame(p){models.forEach((m,i)=>m.visible=i===(p.ci||0)%models.length);const m=models[(p.ci||0)%models.length];if(!m)return c;
      const an=m.userData.anim;if(an&&an.set)an.set(p.open==null?1:p.open);
      const sz=m.userData.size||12;m.rotation.set(p.pitch||0,p.yaw||0,p.roll||0);m.position.set(p.x||0,p.y||0,0);m.scale.setScalar(p.scale||1);
      const asp=W/H;s.cam.aspect=asp;s.cam.fov=30;s.cam.updateProjectionMatrix();
      let dist=sz/(2*Math.tan(T.MathUtils.degToRad(15)))*(asp<1?1.2/Math.max(.55,asp):1.1)/(p.zoom||1);
      look.set(0,0,0);if(p.focus==='island'){m.updateMatrixWorld(true);const isl=m.getObjectByName('island');if(isl){isl.getWorldPosition(v);look.lerp(v,p.fk==null?1:p.fk);}}
      s.cam.position.set(look.x,look.y+sz*.04,dist);s.cam.lookAt(look);r.render(s.scene,s.cam);return c;},
    dispose(){models.forEach(m=>{s.scene.remove(m);dispose(m);});r.dispose();try{r.forceContextLoss();}catch(e){}}};};
window.P3=P3;
})();
