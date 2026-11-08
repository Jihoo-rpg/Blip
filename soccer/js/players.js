'use strict';
/* ===== 선수 모델: 진짜 사람 3D 모델 + 모션캡처 달리기 + 유니폼(반팔 · 반바지 · 스타킹 · 등번호) ===== */
async function loadChars() {
  const ld = new T.GLTFLoader(); const base = '../seoul/assets/';
  const [h, A] = await Promise.all([ld.loadAsync(base + 'human.glb'), fetch(base + 'anims.json').then(r => r.json())]);
  CH.A = A; CH.tpl.m = prepTpl(h.scene); CH.ready = true;
}
const KIT_V = ['#include <common>', 'varying vec3 vBind;\n#include <common>'], KIT_V2 = ['#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;'];
function kitShader(m, kind, u) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace(KIT_V[0], KIT_V[1]).replace(KIT_V2[0], KIT_V2[1]);
    let f = 'varying vec3 vBind;\nuniform vec3 uA;uniform vec3 uB;uniform vec3 uC;uniform vec3 uSkin;\n' + sh.fragmentShader;
    const body = kind === 'boot' ? `{ float l = dot(diffuseColor.rgb, vec3(.3,.59,.11)); vec3 c = uA * (.8 + l * .35);
          float band = vBind.y - (vBind.z + .06) * .2;
          if (band > .052 && band < .074) c = uB;
          if (vBind.z < -.075 && vBind.y > .03) c = uB * .95;
          if (vBind.y < .022) c = uC;
          diffuseColor.rgb = c; }` : kind === 'chest' ? `{ if (vBind.y > .955 && vBind.y < 1.585 && abs(vBind.x) < .21) diffuseColor.rgb = uA * .96; }` : kind === 'top'
      ? `{ if (vBind.y < .955) discard; float l = dot(diffuseColor.rgb, vec3(.3,.59,.11)); float ax = abs(vBind.x);
          vec3 c = uA * .96;
          if (ax >= .29) c = uSkin * vec3(.6, .4, .3) * (.9 + l * .15); // 반팔 아래 팔: 손 · 얼굴과 같은 피부 톤
          if (vBind.y > 1.6) c = uB;                                // 목 칼라
          diffuseColor.rgb = c; }`
      : `{ float l = dot(diffuseColor.rgb, vec3(.3,.59,.11)); vec3 c;
          if (vBind.y > .71) c = uA * clamp(.85 + l * .3, .85, 1.08);    // 반바지
          else if (vBind.y > .53) c = uSkin * vec3(.6, .4, .3) * (.9 + l * .15); // 무릎 (손과 같은 피부 톤)
          else if (vBind.y > .5) c = uB;                                  // 스타킹 줄
          else c = uC * clamp(.7 + l * .6, .7, 1.1);                      // 스타킹
          if (vBind.y > .71 && vBind.y < .74) c = uB;                     // 바짓단 줄
          diffuseColor.rgb = c; }`;
    f = f.replace('#include <map_fragment>', '#include <map_fragment>\n' + body);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => kind + 'kit';
}
const NUMTEX = {};
function numTex(num, name, col, back) { const k = num + name + col + back; return NUMTEX[k] || (NUMTEX[k] = ctex(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; if (back) { const nm = name.split(' ').pop(); g.font = `bold 34px ${FONT}`; g.fillText(nm, W / 2, 40); g.font = `150px ${DFONT}`; g.fillText(num, W / 2, 150); } else { g.font = `120px ${DFONT}`; g.fillText(num, W / 2, H / 2); } })); }
const BOOTS = [['#ff4d5e', '#ffffff', '#f2f2f2'], ['#111111', '#ffd400', '#2a2a2a'], ['#f2f2f2', '#ff4d5e', '#e0e0e0'], ['#22d3ee', '#111111', '#f2f2f2'], ['#ffd400', '#111111', '#2a2a2a'], ['#7c3aed', '#9be15d', '#f2f2f2'], ['#ff7a00', '#ffffff', '#1a1a1a'], ['#111111', '#ffffff', '#ff4d5e'], ['#9be15d', '#111111', '#f2f2f2'], ['#1e40ff', '#ffffff', '#f2f2f2']];
function makeFootballer(pl, kit, numCol, gk) {
  const look = Object.assign({ top: '#ffffff', bot: '#ffffff', shoe: gk ? '#111111' : pick(['#111111', '#f2f2f2', '#ff4d5e', '#ffd400', '#22d3ee']) }, pl.look);
  const P = makePerson(Object.assign({}, look, { head: look.head === 'bald' || ['afro', 'curly', 'bun', 'twist', 'mohawk'].includes(look.hairStyle) && look.head !== 'buzz' ? (look.head === 'bald' || look.hairStyle === 'mohawk' ? 'none' : 'buzz') : look.head })); extraHair(P, look); const root = P.root; const sc = root.scale.clone(); root.scale.set(1, 1, 1); root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.updateMatrixWorld(true);
  const skin = lin(look.skin); const k = gk ? kit.gk : kit;
  root.traverse(o => {
    if (!o.isMesh) return; const n = o.material.name;
    if (n === 'Wolf3D_Outfit_Top' || n === 'Wolf3D_Outfit_Bottom' || n === 'Wolf3D_Body') { o.material.normalMap = null; o.material.roughnessMap = null; o.material.roughness = .78; o.material.metalness = 0; o.material.needsUpdate = true; }
    if (n === 'Wolf3D_Outfit_Top') { o.material.color.setRGB(1, 1, 1); kitShader(o.material, 'top', { uA: { value: lin(k[0]) }, uB: { value: lin(k[3] || k[1]) }, uC: { value: lin(k[2]) }, uSkin: { value: skin } }); }
    if (n === 'Wolf3D_Body') kitShader(o.material, 'chest', { uA: { value: lin(k[0]) }, uB: { value: lin(k[3] || k[1]) }, uC: { value: lin(k[2]) }, uSkin: { value: skin } });
    if (n === 'Wolf3D_Outfit_Bottom') { o.material.color.setRGB(1, 1, 1); kitShader(o.material, 'bot', { uA: { value: lin(k[1]) }, uB: { value: lin(k[3] || k[0]) }, uC: { value: lin(k[2]) }, uSkin: { value: skin } }); }
    if (n === 'Wolf3D_Outfit_Footwear') { // 구두 → 축구화 (무광 · 밑창 · 옆 줄 · 뒤꿈치 색)
      const bc = BOOTS[(pl.num * 7 + (pl.name || '').length) % BOOTS.length]; const B = gk ? ['#111111', '#22d3ee', '#f2f2f2'] : (look.shoe === '#f2f2f2' ? ['#f2f2f2', '#111111', '#d0d0d0'] : bc);
      o.material.normalMap = null; o.material.metalness = 0; o.material.roughness = .55; o.material.color.setRGB(1, 1, 1); o.material.needsUpdate = true;
      kitShader(o.material, 'boot', { uA: { value: lin(B[0]) }, uB: { value: lin(B[1]) }, uC: { value: lin(B[2]) }, uSkin: { value: skin } }); }
  });
  // 등번호 · 이름 · 가슴 번호 (등뼈에 붙여서 같이 움직여요)
  const sp = P.B.Spine2; if (sp) {
    const nc = gk ? '#ffffff' : numCol; const put = (tex, w, h, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); const wm = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1)); m.matrix.copy(sp.matrixWorld.clone().invert().multiply(wm)); m.matrix.decompose(m.position, m.quaternion, m.scale); sp.add(m); };
    put(numTex(pl.num, pl.name, nc, true), .3, .3, 0, 1.3, -.148, Math.PI); put(numTex(pl.num, '', nc, false), .09, .09, .075, 1.42, .17, 0);
  }
  root.scale.copy(sc); root.rotation.order = 'YXZ';
  return P;
}
/* 머리 모양 더: 아프로 · 곱슬 · 묶은 머리 · 드레드 · 모히칸 */
const _xg = {};
function extraHair(P, look) {
  const head = P.B.Head, st = look.hairStyle; if (!head || look.head === 'bald' || !['afro', 'curly', 'bun', 'twist', 'mohawk'].includes(st)) return;
  const ht = CH.tpl.m.headTop, r = ht.length() * .56, c = ht.clone().multiplyScalar(.52); const mat = new T.MeshStandardMaterial({ color: lin(look.hair), roughness: .95 });
  const add = (geo, pos, sc) => { const m = new T.Mesh(geo, mat); m.position.copy(pos); m.scale.copy(sc); m.castShadow = true; head.add(m); return m; };
  const sph = _xg.s || (_xg.s = new T.SphereGeometry(1, 12, 9)), V = (x, y, z) => new T.Vector3(x, y, z);
  if (st === 'afro') { add(sph, c.clone().add(V(0, r * .25, -r * .12)), V(r * 1.38, r * 1.15, r * 1.32)); }
  else if (st === 'curly') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, b = (i % 3) * .35 + .25; add(sph, c.clone().add(V(Math.cos(a) * r * .85 * Math.cos(b), r * (.25 + Math.sin(b) * .55), Math.sin(a) * r * .85 * Math.cos(b) - r * .08)), V(r * .36, r * .32, r * .36)); } add(sph, c.clone().add(V(0, r * .55, -r * .05)), V(r * .8, r * .5, r * .85)); }
  else if (st === 'bun') { add(sph, c.clone().add(V(0, r * .78, -r * .55)), V(r * .34, r * .3, r * .34)); add(sph, c.clone().add(V(0, r * .3, -r * .15)), V(r * 1.04, r * .82, r * 1.08)); }
  else if (st === 'twist') { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; add(sph, c.clone().add(V(Math.cos(a) * r * .72, r * .62, Math.sin(a) * r * .72 - r * .05)), V(r * .2, r * .34, r * .2)); } }
  else if (st === 'mohawk') { add(sph, c.clone().add(V(0, r * .72, -r * .1)), V(r * .2, r * .42, r * .95)); }
}
/* ---------- 카드 얼굴 사진: 그 선수의 3D 모델을 직접 찍어요 ---------- */
const POR = { ren: null, scene: null, cam: null, cache: {}, wait: {}, q: [], busy: false, io: null };
function porKit(d) { const t = TEAMS.find(x => x.id === d.nat); return t ? [t.home[0], t.home[1], t.home[2] || t.home[0]] : ['#2a3550', '#ffffff', '#2a3550']; }
function portrait(d, cb) { const k = d.id; if (POR.cache[k] === 'pending') { (POR.wait[k] = POR.wait[k] || []).push(cb); return; } if (POR.cache[k]) return cb && cb(POR.cache[k]); POR.q.push([d, cb]); if (!POR.busy) { POR.busy = true; requestAnimationFrame(porRun); } }
function porRun() {
  if (!CH.ready) return setTimeout(porRun, 300); const t0 = performance.now();
  if (!POR.ren) { const c = document.createElement('canvas'); c.width = 200; c.height = 240; POR.ren = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); POR.ren.setSize(200, 240, false); POR.ren.outputEncoding = T.sRGBEncoding; POR.ren.toneMapping = T.ACESFilmicToneMapping; POR.ren.toneMappingExposure = 1.15;
    POR.scene = new T.Scene(); POR.scene.add(new T.HemisphereLight('#ffffff', '#40384a', .9)); const k = new T.DirectionalLight('#fff4e6', 1.6); k.position.set(1.5, 2.5, 3); POR.scene.add(k); const r = new T.DirectionalLight('#9fd8ff', .9); r.position.set(-2.5, 1.5, -1.5); POR.scene.add(r); POR.cam = new T.PerspectiveCamera(24, 200 / 240, .1, 20); }
  while (POR.q.length && performance.now() - t0 < 14) {
    const [d, cb] = POR.q.shift(); if (POR.cache[d.id] === 'pending') { cb && (POR.wait[d.id] = POR.wait[d.id] || []).push(cb); continue; } if (POR.cache[d.id]) { cb && cb(POR.cache[d.id]); continue; }
    const kit = porKit(d); const pl = { num: d.num || '', name: d.n, look: Object.assign(lookOf(d), { shoe: '#111111' }) };
    const P = makeFootballer(pl, Object.assign(kit.concat([kit[1]]), { gk: ['#1fbf5a', '#141414', '#1fbf5a', '#0b3a1a'] }), '#ffffff', d.pos === 'GK'); P.root.position.set(0, 0, 0); P.root.rotation.y = -.28; POR.scene.add(P.root); P.mixer.update(.4); P.root.updateMatrixWorld(true);
    const h = P.B.Head ? P.B.Head.getWorldPosition(new T.Vector3()) : new T.Vector3(0, 1.65, 0); POR.cam.position.set(h.x + .08, h.y + .02, h.z + 1.2); POR.cam.lookAt(h.x, h.y - .16, h.z);
    POR.ren.render(POR.scene, POR.cam); POR.scene.remove(P.root); P.root.traverse(o => { if (o.isMesh && o.material) o.material.dispose(); });
    const id = d.id; POR.cache[id] = 'pending'; const cbs = POR.wait[id] = (POR.wait[id] || []).concat(cb ? [cb] : []);
    POR.ren.domElement.toBlob(bl => { const u = bl ? URL.createObjectURL(bl) : POR.ren.domElement.toDataURL(); POR.cache[id] = u; (POR.wait[id] || []).forEach(f => f(u)); delete POR.wait[id]; }, 'image/png');
  }
  if (POR.q.length) requestAnimationFrame(porRun); else { POR.busy = false; clearTimeout(POR.idle); POR.idle = setTimeout(porRelease, 6000); }
}
// 카드 사진용 그래픽은 안 쓸 때 돌려줘요 (폰 메모리 아끼기 → 화면 까매짐 예방)
function porRelease() { if (POR.busy || !POR.ren) return; try { POR.ren.dispose(); POR.ren.forceContextLoss(); } catch (e) { } POR.ren = null; }
function fillPortraits(root) {
  const go = img => { const d = PDB[+img.dataset.por]; if (d) portrait(d, u => { img.src = u; }); };
  if (!POR.io && 'IntersectionObserver' in window) POR.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { POR.io.unobserve(e.target); go(e.target); } }), { rootMargin: '200px' });
  (root || document).querySelectorAll('img[data-por]:not([src])').forEach(img => { const d = PDB[+img.dataset.por]; if (d && POR.cache[d.id] && POR.cache[d.id] !== 'pending') img.src = POR.cache[d.id]; else if (POR.io) POR.io.observe(img); else go(img); });
}
/* ---------- 메뉴의 대표 선수 (3D) ---------- */
const HERO = { P: null, id: -1, key: '', t: 0, light: null };
function heroSet(d, kit) {
  const key = d.id + kit.join(); if (HERO.key === key) return; HERO.key = key; if (HERO.P) scene.remove(HERO.P.root);
  const P = makeFootballer({ num: 10, name: d.n, look: Object.assign(lookOf(d), { shoe: '#f2f2f2' }) }, Object.assign(kit.slice(), { gk: ['#1fbf5a', '#141414', '#1fbf5a', '#0b3a1a'] }), colDist(kit[0], '#ffffff') < .6 ? '#141414' : '#ffffff', d.pos === 'GK');
  P.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(P.root); HERO.P = P; HERO.d = d;
  if (!HERO.light) { HERO.light = new T.PointLight('#ff3b6b', 2.2, 9); scene.add(HERO.light); HERO.fill = new T.SpotLight('#ffffff', 2.4, 14, .5, .6); scene.add(HERO.fill); scene.add(HERO.fill.target); }
}
function heroTick(dt, on) {
  if (!HERO.P) return; const R = HERO.P.root; R.visible = on; HERO.light.visible = HERO.fill.visible = on; if (!on) return; HERO.t += dt;
  const x = -9, z = PL.hz - .4; R.position.set(x, 0, z); R.rotation.y = Math.sin(HERO.t * .35) * .18 - .1; setAnim(HERO.P, 'idle', 1); HERO.P.mixer.update(dt);
  HERO.light.position.set(x + 1.6, 2.2, z - 1.2); HERO.fill.position.set(x + 1, 4, z + 5); HERO.fill.target.position.set(x, 1, z);
}
/* ---------- 몸 동작 (뼈를 직접 움직여요) ---------- */
const _f = new T.Vector3(), _up = new T.Vector3(0, 1, 0), _rt = new T.Vector3();
function V3(a, b, c) { return new T.Vector3().addScaledVector(_f, a).addScaledVector(_up, b).addScaledVector(_rt, c).normalize(); }
let PW = 1; // 동작 섞는 비율 (부드럽게 들어가고 나와요)
function arm2(P, S, u, l, w) { w *= PW; aimBone(P, S + 'Arm', S + 'ForeArm', u, w); aimBone(P, S + 'ForeArm', S + 'Hand', l, w); }
// 다리: 무릎은 뒤로만 굽고, 옆으로 너무 벌어지지 않게 막아요
function legFix(v, side) { let a = v.dot(_f), b = v.dot(_up), c = v.dot(_rt); c = clamp(c * side, -.12, .3) * side; return [a, b, c]; }
function leg2(P, S, u, l, w) { w *= PW;
  const side = S === 'Right' ? 1 : -1; const [ua, ub, uc] = legFix(u, side); let [la, lb, lc] = legFix(l, side);
  const pt = Math.atan2(ua, -ub), ps = Math.atan2(la, -lb); if (ps > pt) { const L = Math.hypot(la, lb); la = Math.sin(pt) * L; lb = -Math.cos(pt) * L; } // 무릎이 앞으로 꺾이지 않게
  const U = new T.Vector3().addScaledVector(_f, ua).addScaledVector(_up, ub).addScaledVector(_rt, uc).normalize(), Lw = new T.Vector3().addScaledVector(_f, la).addScaledVector(_up, lb).addScaledVector(_rt, lc).normalize();
  aimBone(P, S + 'UpLeg', S + 'Leg', U, w); aimBone(P, S + 'Leg', S + 'Foot', Lw, w);
}
// 동작이 갑자기 켜졌다 꺼지지 않게: 시작은 0.08초, 끝은 0.18초 동안 섞어요
function footballPose(p, dt) {
  const root = p.P.root; root.position.y = 0; root.rotation.x = 0; root.rotation.z = 0; dt = dt || 1 / 60;
  let a = p.act, t = p.actT, w = 1;
  if (a) { if (a !== p._pa) { p._chain = (a === 'hold' && (p._pa === 'catch' || p._pa === 'dive')) || (p._pa && p._fo < .05); p._pa = a; } p._pt = t; p._fo = 0; if (!p._chain) w = clamp(t / .08, 0, 1); }
  else if (p._pa) { p._fo = (p._fo || 0) + dt; w = 1 - p._fo / .18; if (w <= 0) { p._pa = null; return; } a = p._pa; t = p._pt; }
  else return;
  w = w * w * (3 - 2 * w); PW = w; try { poseCore(p, a, t); } finally { PW = 1; }
  if (w < 1) { root.position.y *= w; root.rotation.x *= w; root.rotation.z *= w; }
}
function poseCore(p, a, t) {
  const P = p.P; const root = P.root;
  P.root.updateMatrixWorld(true); const yw = p.ry != null ? p.ry : p.yaw; _f.set(Math.sin(yw), 0, Math.cos(yw)); _rt.set(-_f.z, 0, _f.x);
  const S = p.foot || 'Right', s = S === 'Right' ? 1 : -1, O = S === 'Right' ? 'Left' : 'Right';
  if (a === 'kick' || a === 'pass' || a === 'cross') {
    const D = a === 'pass' ? .32 : .42, k = t / D; const big = a === 'pass' ? .6 : 1;
    const back = k < .45 ? Math.sin(k / .45 * Math.PI / 2) : Math.max(0, 1 - (k - .45) * 4); const fwd = k < .45 ? 0 : Math.sin(Math.min(1, (k - .45) / .4) * Math.PI / 2) * (1 - Math.max(0, k - .85) * 5);
    leg2(P, S, V3(-.75 * back * big + 1.1 * fwd * big, -1, s * .12), V3(-1.1 * back * big + .5 * fwd, -.7 + .4 * fwd, 0), 1);
    arm2(P, O, V3(.3, -.4, -s * .9), V3(.5, -.3, -s * .6), .9); arm2(P, S, V3(-.2, -.6, s * .7), V3(.1, -.6, s * .5), .7);
    if (P.B.Spine1) { P.B.Spine1.rotateX(-.15 * fwd * big); P.B.Spine1.updateMatrixWorld(true); }
  } else if (a === 'slide') {
    const k = Math.min(1, t / .18); root.rotation.x = -1.15 * k; root.position.y = .32 * k;
    leg2(P, S, V3(1, -.15, s * .1), V3(1, -.05, 0), k); leg2(P, O, V3(.75, .05, -s * .08), V3(.35, -.94, 0), k);
    arm2(P, 'Left', V3(-.4, -.7, -.6), V3(-.2, -.9, -.2), k); arm2(P, 'Right', V3(-.4, -.7, .6), V3(-.2, -.9, .2), k);
  } else if (a === 'dive') { t = Math.max(0, t); // 기다리는 동안(시간이 음수) 반대로 눕거나 땅에 꺼지던 것 고침
    const k = Math.min(1, t / .25) * (t > .9 ? Math.max(0, 1 - (t - .9) / .4) : 1); const ds = p.diveSide || 1; root.rotation.z = -ds * 1.35 * k; root.position.y = Math.sin(Math.min(1, t / .5) * Math.PI) * (p.diveH || .6) + .35 * k;
    arm2(P, 'Left', V3(0, 1, -.3 * ds), V3(0, 1, 0), k); arm2(P, 'Right', V3(0, 1, -.3 * ds), V3(0, 1, 0), k);
  } else if (a === 'catch') {
    arm2(P, 'Left', V3(1, -.1, -.25), V3(.6, .3, .3), 1); arm2(P, 'Right', V3(1, -.1, .25), V3(.6, .3, -.3), 1);
  } else if (a === 'hold') { arm2(P, 'Left', V3(.8, -.5, -.25), V3(.7, .2, .4), 1); arm2(P, 'Right', V3(.8, -.5, .25), V3(.7, .2, -.4), 1); }
  else if (a === 'throw') { const k = Math.min(1, t / .5); arm2(P, 'Left', V3(-.4 + k, 1, -.25), V3(-.6 + 1.4 * k, 1, 0), 1); arm2(P, 'Right', V3(-.4 + k, 1, .25), V3(-.6 + 1.4 * k, 1, 0), 1); }
  else if (a === 'header') { const k = Math.sin(Math.min(1, t / .5) * Math.PI); root.position.y = k * .55; if (P.B.Spine1) { P.B.Spine1.rotateX(.35 * k); P.B.Spine1.updateMatrixWorld(true); } arm2(P, 'Left', V3(.2, .2, -.9), V3(.4, .3, -.4), k); arm2(P, 'Right', V3(.2, .2, .9), V3(.4, .3, .4), k); }
  else if (a === 'cele') { const k = Math.min(1, t / .3); const j = Math.abs(Math.sin(t * 6)); root.position.y = j * .35 * (p.celeKind === 1 ? 1 : 0);
    if (p.celeKind === 3) { const kk = Math.min(1, t / .35); root.position.y = -.42 * kk; root.rotation.x = -.35 * kk; leg2(P, 'Left', V3(.15, -1, -.08), V3(-1, -.12, 0), kk); leg2(P, 'Right', V3(.15, -1, .08), V3(-1, -.12, 0), kk); arm2(P, 'Left', V3(-.1, 1, -.7), V3(0, 1, -.3), kk); arm2(P, 'Right', V3(-.1, 1, .7), V3(0, 1, .3), kk); return; } // 무릎 슬라이딩
    if (p.celeKind === 4) { const pump = Math.abs(Math.sin(t * 4)); arm2(P, 'Right', V3(.3, .2 + pump * .8, .4), V3(.1, 1, .1), k); arm2(P, 'Left', V3(.2, -.6, -.6), V3(.6, -.2, -.3), k); if (P.B.Spine1) { P.B.Spine1.rotateX(-.2 * pump); P.B.Spine1.updateMatrixWorld(true); } return; } // 주먹 불끈
    if (p.celeKind === 2) { arm2(P, 'Left', V3(0, .1, -1), V3(0, .1, -1), k); arm2(P, 'Right', V3(0, .1, 1), V3(0, .1, 1), k); } // 비행기
    else { arm2(P, 'Left', V3(.1, 1, -.5), V3(0, 1, -.2), k); arm2(P, 'Right', V3(.1, 1, .5), V3(0, 1, .2), k); } }
  else if (a === 'sad') { if (P.B.Spine1) { P.B.Spine1.rotateX(.22); P.B.Spine1.updateMatrixWorld(true); } if (P.B.Head) { P.B.Head.rotateX(.35); P.B.Head.updateMatrixWorld(true); } arm2(P, 'Left', V3(.4, .6, -.5), V3(-.2, .7, .5), 1); arm2(P, 'Right', V3(.4, .6, .5), V3(-.2, .7, -.5), 1); }
  else if (a === 'stumble') { const k = Math.sin(Math.min(1, t / .6) * Math.PI); if (P.B.Spine1) { P.B.Spine1.rotateX(.6 * k); P.B.Spine1.updateMatrixWorld(true); } arm2(P, 'Left', V3(.6, -.4, -.7), V3(.6, -.4, -.3), k); arm2(P, 'Right', V3(.6, -.4, .7), V3(.6, -.4, .3), k); }
  else if (a === 'place' || a === 'pickup') { // 공 내려놓기 · 줍기 (허리 숙이기)
    const D = a === 'place' ? .75 : .7, k = Math.sin(Math.min(1, t / D) * Math.PI); const up = a === 'pickup' ? Math.max(0, (t - D * .55) / (D * .45)) : 0;
    if (P.B.Spine) { P.B.Spine.rotateX(.32 * k); P.B.Spine.updateMatrixWorld(true); } if (P.B.Spine1) { P.B.Spine1.rotateX(.2 * k); P.B.Spine1.updateMatrixWorld(true); }
    leg2(P, 'Left', V3(.5 * k, -1, -.1), V3(-.45 * k, -1, 0), k); leg2(P, 'Right', V3(.5 * k, -1, .1), V3(-.45 * k, -1, 0), k); root.position.y = -.12 * k;
    if (up > 0) { arm2(P, 'Left', V3(-.2, 1, -.25), V3(-.4, 1, 0), Math.min(1, up)); arm2(P, 'Right', V3(-.2, 1, .25), V3(-.4, 1, 0), Math.min(1, up)); }
    else { arm2(P, 'Left', V3(.9, -1, -.25), V3(.8, -1, .1), k); arm2(P, 'Right', V3(.9, -1, .25), V3(.8, -1, -.1), k); }
  }
  else if (a === 'trap') { const k = Math.sin(Math.min(1, t / .3) * Math.PI); leg2(P, S, V3(.55 * k, -1, s * .15), V3(.15 * k, -1, 0), k); arm2(P, O, V3(.1, -.5, -s * .8), V3(.3, -.4, -s * .5), k * .8); }
  else if (a === 'cheer') { const k = Math.min(1, t / .3); const j = Math.abs(Math.sin(t * 5)); root.position.y = j * .18; arm2(P, 'Left', V3(.2, 1, -.35), V3(.1, 1, -.1 - j * .2), k); arm2(P, 'Right', V3(.2, 1, .35), V3(.1, 1, .1 + j * .2), k); }
  else if (a === 'point') { const k = Math.min(1, t / .25); arm2(P, 'Right', V3(.6, .5, .6), V3(.7, .5, .5), k); }
  else if (a === 'skill') { // 개인기: 팔 벌려 균형 + 발 동작
    const sk = p.skill, k = sk ? Math.min(1, sk.t / sk.d) : Math.min(1, t / .5), w = Math.sin(k * Math.PI);
    arm2(P, 'Left', V3(0, -.35, -1), V3(.2, -.35, -.8), w); arm2(P, 'Right', V3(0, -.35, 1), V3(.2, -.35, .8), w);
    const kk = sk ? sk.k : 'roulette';
    if (kk === 'stepover' || kk === 'elastico') { const c = Math.sin(k * Math.PI * 2); leg2(P, S, V3(.35 * Math.abs(c), -1, s * (.08 + .25 * Math.max(0, c))), V3(.12, -1, 0), w); }
    else if (kk === 'drag') leg2(P, S, V3(.45 - k * .6, -1, 0), V3(.25 - k * .6, -1, 0), w);
    else if (kk === 'flick') { const b = Math.sin(Math.min(1, k * 2.2) * Math.PI); leg2(P, S, V3(-.3 * b, -1, 0), V3(-1.2 * b, -.6 * b - .25, 0), b); }
    else leg2(P, S, V3(.3, -1, s * .15), V3(.12, -1, 0), w);
  }
  else if (a === 'clap') { const k = Math.abs(Math.sin(t * 7)); arm2(P, 'Left', V3(.8, .3, -.15 - k * .3), V3(.6, .3, .2), 1); arm2(P, 'Right', V3(.8, .3, .15 + k * .3), V3(.6, .3, -.2), 1); }
}
