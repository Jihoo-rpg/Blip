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
    const body = kind === 'top'
      ? `{ if (vBind.y < .955) discard; float l = dot(diffuseColor.rgb, vec3(.3,.59,.11)); float ax = abs(vBind.x);
          vec3 c = uA * .96;
          if (ax > .2 && ax < .232) c = uB;                      // 소매 끝 줄
          if (ax >= .232) c = uSkin * (.85 + l * .3);             // 반팔 → 팔은 피부
          if (vBind.y > 1.6) c = uB;                                // 목 칼라
          diffuseColor.rgb = c; }`
      : `{ float l = dot(diffuseColor.rgb, vec3(.3,.59,.11)); vec3 c;
          if (vBind.y > .71) c = uA * clamp(.85 + l * .3, .85, 1.08);    // 반바지
          else if (vBind.y > .53) c = uSkin * (.9 + l * .2);              // 무릎
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
function makeFootballer(pl, kit, numCol, gk) {
  const look = Object.assign({ top: '#ffffff', bot: '#ffffff', shoe: gk ? '#111111' : pick(['#111111', '#f2f2f2', '#ff4d5e', '#ffd400', '#22d3ee']) }, pl.look);
  const P = makePerson(look); const root = P.root; const sc = root.scale.clone(); root.scale.set(1, 1, 1); root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.updateMatrixWorld(true);
  const skin = lin(look.skin); const k = gk ? kit.gk : kit;
  root.traverse(o => {
    if (!o.isMesh) return; const n = o.material.name;
    if (n === 'Wolf3D_Outfit_Top') { o.material.color.setRGB(1, 1, 1); kitShader(o.material, 'top', { uA: { value: lin(k[0]) }, uB: { value: lin(k[3] || k[1]) }, uC: { value: lin(k[2]) }, uSkin: { value: skin } }); }
    if (n === 'Wolf3D_Outfit_Bottom') { o.material.color.setRGB(1, 1, 1); kitShader(o.material, 'bot', { uA: { value: lin(k[1]) }, uB: { value: lin(k[3] || k[0]) }, uC: { value: lin(k[2]) }, uSkin: { value: skin } }); }
    if (n === 'Wolf3D_Outfit_Footwear') { o.material.color.copy(lin(look.shoe)).multiplyScalar(look.shoe === '#f2f2f2' ? 1.3 : 1.6); o.material.roughness = .35; }
  });
  // 등번호 · 이름 · 가슴 번호 (등뼈에 붙여서 같이 움직여요)
  const sp = P.B.Spine2; if (sp) {
    const nc = gk ? '#ffffff' : numCol; const put = (tex, w, h, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); const wm = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1)); m.matrix.copy(sp.matrixWorld.clone().invert().multiply(wm)); m.matrix.decompose(m.position, m.quaternion, m.scale); sp.add(m); };
    put(numTex(pl.num, pl.name, nc, true), .3, .3, 0, 1.3, -.148, Math.PI); put(numTex(pl.num, '', nc, false), .09, .09, .075, 1.42, .17, 0);
  }
  root.scale.copy(sc); root.rotation.order = 'YXZ';
  return P;
}
/* ---------- 몸 동작 (뼈를 직접 움직여요) ---------- */
const _f = new T.Vector3(), _up = new T.Vector3(0, 1, 0), _rt = new T.Vector3();
function V3(a, b, c) { return new T.Vector3().addScaledVector(_f, a).addScaledVector(_up, b).addScaledVector(_rt, c).normalize(); }
function arm2(P, S, u, l, w) { aimBone(P, S + 'Arm', S + 'ForeArm', u, w); aimBone(P, S + 'ForeArm', S + 'Hand', l, w); }
function leg2(P, S, u, l, w) { aimBone(P, S + 'UpLeg', S + 'Leg', u, w); aimBone(P, S + 'Leg', S + 'Foot', l, w); }
function footballPose(p) {
  const P = p.P, a = p.act, t = p.actT; const root = P.root; root.position.y = 0; root.rotation.x = 0; root.rotation.z = 0;
  if (!a) return;
  P.root.updateMatrixWorld(true); _f.set(Math.sin(p.yaw), 0, Math.cos(p.yaw)); _rt.set(-_f.z, 0, _f.x);
  const S = p.foot || 'Right', s = S === 'Right' ? 1 : -1, O = S === 'Right' ? 'Left' : 'Right';
  if (a === 'kick' || a === 'pass' || a === 'cross') {
    const D = a === 'pass' ? .32 : .42, k = t / D; const big = a === 'pass' ? .6 : 1;
    const back = k < .45 ? Math.sin(k / .45 * Math.PI / 2) : Math.max(0, 1 - (k - .45) * 4); const fwd = k < .45 ? 0 : Math.sin(Math.min(1, (k - .45) / .4) * Math.PI / 2) * (1 - Math.max(0, k - .85) * 5);
    leg2(P, S, V3(-.75 * back * big + 1.1 * fwd * big, -1, s * .12), V3(-1.1 * back * big + .5 * fwd, -.7 + .4 * fwd, 0), 1);
    arm2(P, O, V3(.3, -.4, -s * .9), V3(.5, -.3, -s * .6), .9); arm2(P, S, V3(-.2, -.6, s * .7), V3(.1, -.6, s * .5), .7);
    if (P.B.Spine1) { P.B.Spine1.rotateX(-.15 * fwd * big); P.B.Spine1.updateMatrixWorld(true); }
  } else if (a === 'slide') {
    const k = Math.min(1, t / .18); root.rotation.x = -1.15 * k; root.position.y = .32 * k;
    leg2(P, S, V3(1, -.15, s * .1), V3(1, -.05, 0), k); leg2(P, O, V3(.6, -.8, -s * .1), V3(.1, -1, 0), k);
    arm2(P, 'Left', V3(-.4, -.7, -.6), V3(-.2, -.9, -.2), k); arm2(P, 'Right', V3(-.4, -.7, .6), V3(-.2, -.9, .2), k);
  } else if (a === 'dive') {
    const k = Math.min(1, t / .25); const ds = p.diveSide || 1; root.rotation.z = -ds * 1.35 * k; root.position.y = Math.sin(Math.min(1, t / .5) * Math.PI) * (p.diveH || .6) + .35 * k;
    arm2(P, 'Left', V3(0, 1, -.3 * ds), V3(0, 1, 0), k); arm2(P, 'Right', V3(0, 1, -.3 * ds), V3(0, 1, 0), k);
  } else if (a === 'catch') {
    arm2(P, 'Left', V3(1, -.1, -.25), V3(.6, .3, .3), 1); arm2(P, 'Right', V3(1, -.1, .25), V3(.6, .3, -.3), 1);
  } else if (a === 'hold') { arm2(P, 'Left', V3(.8, -.5, -.25), V3(.7, .2, .4), 1); arm2(P, 'Right', V3(.8, -.5, .25), V3(.7, .2, -.4), 1); }
  else if (a === 'throw') { const k = Math.min(1, t / .5); arm2(P, 'Left', V3(-.4 + k, 1, -.25), V3(-.6 + 1.4 * k, 1, 0), 1); arm2(P, 'Right', V3(-.4 + k, 1, .25), V3(-.6 + 1.4 * k, 1, 0), 1); }
  else if (a === 'header') { const k = Math.sin(Math.min(1, t / .5) * Math.PI); root.position.y = k * .55; if (P.B.Spine1) { P.B.Spine1.rotateX(.35 * k); P.B.Spine1.updateMatrixWorld(true); } arm2(P, 'Left', V3(.2, .2, -.9), V3(.4, .3, -.4), k); arm2(P, 'Right', V3(.2, .2, .9), V3(.4, .3, .4), k); }
  else if (a === 'cele') { const k = Math.min(1, t / .3); const j = Math.abs(Math.sin(t * 6)); root.position.y = j * .35 * (p.celeKind === 1 ? 1 : 0);
    if (p.celeKind === 2) { arm2(P, 'Left', V3(0, .1, -1), V3(0, .1, -1), k); arm2(P, 'Right', V3(0, .1, 1), V3(0, .1, 1), k); } // 비행기
    else { arm2(P, 'Left', V3(.1, 1, -.5), V3(0, 1, -.2), k); arm2(P, 'Right', V3(.1, 1, .5), V3(0, 1, .2), k); } }
  else if (a === 'sad') { if (P.B.Spine1) { P.B.Spine1.rotateX(.5); P.B.Spine1.updateMatrixWorld(true); } if (P.B.Head) { P.B.Head.rotateX(.5); P.B.Head.updateMatrixWorld(true); } arm2(P, 'Left', V3(.4, .6, -.5), V3(-.2, .7, .5), 1); arm2(P, 'Right', V3(.4, .6, .5), V3(-.2, .7, -.5), 1); }
  else if (a === 'stumble') { const k = Math.sin(Math.min(1, t / .6) * Math.PI); if (P.B.Spine1) { P.B.Spine1.rotateX(.6 * k); P.B.Spine1.updateMatrixWorld(true); } arm2(P, 'Left', V3(.6, -.4, -.7), V3(.6, -.4, -.3), k); arm2(P, 'Right', V3(.6, -.4, .7), V3(.6, -.4, .3), k); }
  else if (a === 'clap') { const k = Math.abs(Math.sin(t * 7)); arm2(P, 'Left', V3(.8, .3, -.15 - k * .3), V3(.6, .3, .2), 1); arm2(P, 'Right', V3(.8, .3, .15 + k * .3), V3(.6, .3, -.2), 1); }
}
