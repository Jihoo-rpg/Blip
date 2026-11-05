'use strict';
/* ===== 사람 캐릭터 =====
   고퀄 3D 모델 2종(남·여)에 실제 모션캡처 걷기/달리기를 옮겨 입히고,
   옷 색 · 피부 · 머리 · 모자 · 안경 · 체형을 사람마다 다르게 해요. */
const CH = { tpl: {}, A: null, ready: false };
async function loadChars() {
  const ld = new T.GLTFLoader();
  const [h, w, A] = await Promise.all([ld.loadAsync('../seoul/assets/human.glb'), ld.loadAsync('../seoul/assets/woman.glb'), fetch('../seoul/assets/anims.json').then(r => r.json())]);
  CH.A = A; CH.tpl.m = prepTpl(h.scene); CH.tpl.w = prepTpl(w.scene); CH.ready = true;
  ld.loadAsync('../seoul/assets/swat.glb').then(g => { g.scene.traverse(o => { if (o.isMesh && o.material) o.material.color && o.material.color.multiplyScalar(.55); }); CH.tpl.s = prepTpl(g.scene); }).catch(() => { });
}
function prepTpl(root) {
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; const g = o.geometry; g.computeBoundingSphere(); g.boundingSphere.radius *= 1.6; if (o.material) { o.material.envMapIntensity = .5; } } });
  const t = { scene: root, clips: retarget(root) };
  root.updateMatrixWorld(true); let ht = null, hd = null, le = null; root.traverse(o => { const n = o.name.replace(/^mixamorig:?/, ''); if (n === 'HeadTop_End') ht = o; if (n === 'Head') hd = o; if (n === 'LeftEye') le = o; });
  t.headTop = ht ? ht.position.clone() : new T.Vector3(0, .2, 0); t.eye = le ? le.position.clone() : new T.Vector3(.03, .07, .08);
  return t;
}
/* 모션 옮기기: 원본 뼈의 '쉬는 자세 대비 회전'을 세계 기준으로 구해서, 우리 모델 뼈에 똑같이 적용 */
function retarget(root) {
  const A = CH.A; root.updateMatrixWorld(true); const B = {}; root.traverse(o => { if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); if (A.bones[n] && !B[n]) B[n] = o; } });
  const rq = new T.Quaternion(); root.getWorldQuaternion(rq); rq.invert(); const TR = {};
  for (const n in B) {
    const o = B[n]; TR[n] = { rw: rq.clone().multiply(o.getWorldQuaternion(new T.Quaternion())), pw: rq.clone().multiply(o.parent.getWorldQuaternion(new T.Quaternion())), C: new T.Quaternion() };
    const sd = A.bones[n].d; const ch = o.children.find(c => c.isBone && A.bones[c.name.replace(/^mixamorig:?/, '')]) || o.children.find(c => c.isBone);
    if (sd && ch && n !== 'Hips') { const a = o.getWorldPosition(new T.Vector3()), b = ch.getWorldPosition(new T.Vector3()); const td = b.sub(a).applyQuaternion(rq).normalize(); TR[n].C.setFromUnitVectors(td, new T.Vector3().fromArray(sd)); }
  }
  const hips = B.Hips; const inv = new T.Matrix4().copy(root.matrixWorld).invert(); const hw = hips.getWorldPosition(new T.Vector3()).applyMatrix4(inv); const ratio = hw.y / A.hipY; const pInv = new T.Matrix4().copy(hips.parent.matrixWorld).invert();
  const order = Object.keys(A.bones); const out = {};
  for (const k in A.clips) {
    const c = A.clips[k]; const srcT = {}; c.tr.forEach(t => srcT[t.n + '.' + t.p] = t); const fps = 30, nF = Math.max(2, Math.round(c.d * fps) + 1); const times = []; for (let f = 0; f < nF; f++)times.push(Math.min(c.d, f / fps));
    const sample = (t, tm, size) => { const ts = t.t; let i = 0; while (i < ts.length - 1 && ts[i + 1] < tm) i++; const i2 = Math.min(ts.length - 1, i + 1); const a = ts[i2] > ts[i] ? clamp((tm - ts[i]) / (ts[i2] - ts[i]), 0, 1) : 0; if (size === 4) return new T.Quaternion().fromArray(t.v, i * 4).slerp(new T.Quaternion().fromArray(t.v, i2 * 4), a); return new T.Vector3().fromArray(t.v, i * 3).lerp(new T.Vector3().fromArray(t.v, i2 * 3), a); };
    const vals = {}; for (const n of order) if (B[n]) vals[n] = []; const hp = [];
    for (const tm of times) {
      const SW = {}, TW = {};
      for (const n of order) {
        const sb = A.bones[n]; const st = srcT[n + '.quaternion']; const loc = st ? sample(st, tm, 4) : new T.Quaternion(); const pw = sb.p ? SW[sb.p] : new T.Quaternion().fromArray(sb.pw); SW[n] = pw.clone().multiply(loc);
        if (!B[n]) continue; const D = SW[n].clone().multiply(new T.Quaternion().fromArray(sb.rw).invert()); TW[n] = D.multiply(TR[n].C).multiply(TR[n].rw);
        const ptw = sb.p && TW[sb.p] ? TW[sb.p] : TR[n].pw; const L = ptw.clone().invert().multiply(TW[n]); vals[n].push(L.x, L.y, L.z, L.w);
      }
      const ps = srcT['Hips.position']; if (ps) { const v = sample(ps, tm, 3); const dy = (v.y - A.hipLocal[1]) * A.hipScale * ratio; const w = hw.clone(); w.y += dy; w.applyMatrix4(root.matrixWorld).applyMatrix4(pInv); hp.push(w.x, w.y, w.z); }
    }
    const tracks = []; for (const n in vals) tracks.push(new T.QuaternionKeyframeTrack(B[n].name + '.quaternion', times, vals[n])); if (hp.length) tracks.push(new T.VectorKeyframeTrack(hips.name + '.position', times, hp));
    out[k] = new T.AnimationClip(k, c.d, tracks);
  }
  return out;
}

/* ---------- 생김새 ---------- */
const SKIN = ['#ffffff', '#f6e3d3', '#e9c9ad', '#d6aa86', '#b9875f', '#8c5f3e'];
const TOPS = ['#22324f', '#151515', '#6b6f78', '#ffffff', '#c9b38a', '#4d5a2a', '#7a1f2b', '#6fa8dc', '#d9a521', '#1f5a3a', '#e88aa8', '#ff7a1a', '#3d2b6b', '#b0b6c2', '#8a5a3a'];
const BOTTOMS = ['#1b1b1d', '#22324f', '#5c6068', '#3e5f8a', '#b8a27a', '#d8d0bf', '#2d2a26', '#47506b'];
const SHOES = ['#121212', '#4a2d1a', '#f2f2f2', '#2a2a2a', '#7a4a2a'];
const HAIR = ['#120f0d', '#120f0d', '#2a1a10', '#4a2e1a', '#7a5534', '#c9a66b', '#8f8f8f'];
function randomLook(woman) {
  if (woman) return { w: 1, tint: pick([[1, 1, 1], [1, .95, .95], [.95, .97, 1], [.9, .88, .86]]), pants: pick(['#f2c230', '#1b1b1d', '#22324f', '#3e5f8a', '#d8d0bf', '#e88aa8', '#6b6f78', '#7a1f2b', '#1f5a3a', '#ffffff', '#b8a27a']), s: rand(.92, 1.03), wide: rand(.95, 1.05) };
  const hr = Math.random(); return {
    w: 0, skin: pick(SKIN.slice(0, 5)), top: pick(TOPS), bot: pick(BOTTOMS), shoe: pick(SHOES), beard: Math.random() < .35,
    head: hr < .25 ? 'hat' : hr < .4 ? 'cap' : hr < .92 ? 'hair' : 'buzz', hair: pick(HAIR), hat: pick(['#1b1b1d', '#3a3f4a', '#5a3a22', '#7a7468', '#22324f']), cap: pick(['#d61f26', '#111', '#1e64d8', '#f2f2f2', '#16a34a', '#ffcc33']),
    hairStyle: pick(['short', 'short', 'side', 'long']), glasses: Math.random() < .18, s: rand(.94, 1.08), wide: rand(.93, 1.12)
  };
}
const LOOKS = {
  player: { w: 0, skin: '#f6e3d3', top: '#151515', bot: '#3e5f8a', shoe: '#f2f2f2', beard: false, head: 'hair', hair: '#120f0d', hairStyle: 'side', glasses: false, s: 1.02, wide: 1.05 },
  swat: () => ({ swat: 1, cop: 1, s: rand(1, 1.05), wide: 1.05 }),
  police: () => ({ w: 0, skin: pick(SKIN.slice(0, 4)), top: '#1f2b47', bot: '#1d2a4a', shoe: '#121212', beard: false, head: 'police', hair: '#120f0d', s: rand(.98, 1.06), wide: rand(1, 1.1), cop: 1 }),
  thug: () => ({ w: 0, skin: pick(SKIN.slice(0, 5)), top: '#151515', bot: '#151515', shoe: '#121212', beard: true, head: 'buzz', hair: '#120f0d', glasses: true, s: 1.06, wide: 1.15 })
};
const _hairGeo = {};
function mulCol(m, hex, k) { m.color.copy(lin(hex)).multiplyScalar(k || 1); }
function makePerson(look) {
  const t = CH.tpl[look.swat && CH.tpl.s ? 's' : look.w ? 'w' : 'm']; if (look.swat && !CH.tpl.s) look = LOOKS.police(); const root = T.SkeletonUtils.clone(t.scene); const B = {};
  root.traverse(o => {
    if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); if (!B[n]) B[n] = o; }
    if (o.isMesh) {
      o.material = o.material.clone(); const n = o.material.name;
      if (look.swat) return;
      if (look.w) {
        o.material.color.setRGB(look.tint[0], look.tint[1], look.tint[2]);
        if (look.pants && look.pants !== '#f2c230') { const pc = { value: lin(look.pants) }; o.material.onBeforeCompile = sh => { sh.uniforms.uPants = pc; sh.fragmentShader = 'uniform vec3 uPants;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n{ vec3 c = diffuseColor.rgb; float gr = c.g / max(c.r, .001); float m = smoothstep(.45, .55, gr) * smoothstep(.08, .25, min(c.r, c.g) - c.b); float l = dot(c, vec3(.3, .59, .11)); diffuseColor.rgb = mix(c, uPants * (.35 + l * 1.3), m); }'); }; o.material.customProgramCacheKey = () => 'pants'; }
        return;
      }
      if (n === 'Wolf3D_Teeth') o.visible = false;
      if (n === 'Wolf3D_Skin' || n === 'Wolf3D_Body') mulCol(o.material, look.skin, 1);
      if (n === 'Wolf3D_Outfit_Top') mulCol(o.material, look.top, look.top === '#ffffff' ? 1.15 : look.cop ? 2.2 : 1.9);
      if (n === 'Wolf3D_Outfit_Bottom') mulCol(o.material, look.bot, 1.8);
      if (n === 'Wolf3D_Outfit_Footwear') mulCol(o.material, look.shoe, look.shoe === '#f2f2f2' ? 1.4 : 1.6);
      if (n === 'Wolf3D_Beard') { o.visible = !!look.beard; mulCol(o.material, look.hair || '#120f0d', 1.4); }
      if (n === 'Wolf3D_Headwear') { o.visible = look.head === 'hat'; if (look.hat) mulCol(o.material, look.hat, 2.2); }
    }
  });
  const head = B.Head;
  if (!look.w && head) {
    const ht = t.headTop, r = ht.length() * .56, c = ht.clone().multiplyScalar(.52);
    const add = (geo, col, pos, sc, rot) => { const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: lin(col), roughness: .75 })); m.position.copy(pos); if (sc) m.scale.copy(sc); if (rot) m.rotation.copy(rot); m.castShadow = true; head.add(m); return m; };
    if (look.head === 'hair' || look.head === 'buzz' || look.head === 'cap' || look.head === 'police') {
      const buzz = look.head === 'buzz';
      add(_hairGeo.cap || (_hairGeo.cap = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .56)), look.hair, c.clone().add(new T.Vector3(0, buzz ? -.004 : .006, -.012)), new T.Vector3(r * (buzz ? 1.0 : 1.08), r * (buzz ? .95 : 1.08), r * (buzz ? 1.02 : 1.12)));
      if (look.head === 'hair') {
        add(_hairGeo.back || (_hairGeo.back = new T.SphereGeometry(1, 14, 10)), look.hair, c.clone().add(new T.Vector3(0, -r * .32, -r * .5)), new T.Vector3(r * 1.02, r * (look.hairStyle === 'long' ? 1.25 : .75), r * .62));
        if (look.hairStyle === 'side') add(_hairGeo.fr || (_hairGeo.fr = new T.SphereGeometry(1, 14, 8)), look.hair, c.clone().add(new T.Vector3(r * .25, r * .55, r * .62)), new T.Vector3(r * .8, r * .32, r * .45), new T.Euler(.3, 0, -.25));
        if (look.hairStyle === 'long') { for (const s of [-1, 1]) add(_hairGeo.back, look.hair, c.clone().add(new T.Vector3(s * r * .82, -r * .55, -r * .1)), new T.Vector3(r * .3, r * 1.05, r * .55)); }
      }
      if (look.head === 'cap' || look.head === 'police') {
        const col = look.head === 'police' ? '#16213d' : look.cap;
        add(_hairGeo.cap, col, c.clone().add(new T.Vector3(0, .02, -.01)), new T.Vector3(r * 1.12, r * (look.head === 'police' ? 1.25 : 1.0), r * 1.15));
        add(_hairGeo.brim || (_hairGeo.brim = new T.CylinderGeometry(1, 1, 1, 18, 1, false, -Math.PI / 2, Math.PI)), look.head === 'police' ? '#0b0b0b' : col, c.clone().add(new T.Vector3(0, r * .18, r * .72)), new T.Vector3(r * .95, .012, r * .9), new T.Euler(-.12, 0, 0));
        if (look.head === 'police') add(new T.BoxGeometry(.035, .035, .01), '#ffcc33', c.clone().add(new T.Vector3(0, r * .62, r * 1.04)));
      }
    }
    if (look.glasses) { const e = t.eye; add(new T.BoxGeometry(Math.abs(e.x) * 2 + .07, .035, .012), '#0a0a0a', new T.Vector3(0, e.y, e.z + .028)); }
  }
  if (look.cop && !look.swat) policeGear(B);
  if (look.helmet && head) { const ht = t.headTop, r = ht.length() * .62, c = ht.clone().multiplyScalar(.5); const hm = new T.Mesh(_hairGeo.helm || (_hairGeo.helm = new T.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * .62)), new T.MeshPhysicalMaterial({ color: lin(look.helmet), roughness: .3, clearcoat: 1 })); hm.position.copy(c); hm.scale.set(r * 1.12, r * 1.15, r * 1.2); hm.castShadow = true; head.add(hm); }
  root.rotation.order = 'YXZ'; root.scale.set(look.s * (look.wide || 1), look.s, look.s * (look.wide || 1));
  const mixer = new T.AnimationMixer(root); const act = {};
  for (const k in t.clips) { act[k] = mixer.clipAction(t.clips[k]); act[k].enabled = true; }
  act.idle.play(); act.idle.time = Math.random() * 3;
  const fingers = { Left: [], Right: [] }; for (const n in B) { const m = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.exec(n); if (m) fingers[m[1]].push([B[n], m[2] === 'Thumb', B[n].quaternion.clone()]); }
  root.updateMatrixWorld(true); const hipY = B.Hips ? B.Hips.getWorldPosition(new T.Vector3()).y : 1;
  const P = { root, mixer, act, cur: 'idle', B, look, pose: null, poseT: 0, upd: 0, fingers, hipY };
  return P;
}
function setAnim(P, name, ts) {
  if (P.cur !== name) { const a = P.act[name], b = P.act[P.cur]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.time = b ? (b.time / b.getClip().duration) * a.getClip().duration : 0; if (b) b.crossFadeTo(a, .22, false); P.cur = name; }
  if (ts != null) P.act[name].timeScale = ts;
}
function setShadow(P, on) { if (P._sh === on) return; P._sh = on; P.root.traverse(o => { if (o.isMesh) o.castShadow = on; }); }

/* 경찰 장비: 형광 조끼 · 벨트 · 무전기 */
let VEST = null;
function policeGear(B) {
  if (!VEST) {
    const tex = ctex(512, 256, (g, W, H) => { g.fillStyle = '#c6ff2e'; g.fillRect(0, 0, W, H); g.fillStyle = '#d9dde2'; g.fillRect(0, H * .66, W, 16); g.fillRect(0, H * .86, W, 16); g.fillStyle = '#1a2a55'; g.fillRect(0, 0, W, 10);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#132a6b'; g.font = `62px ${DFONT}`; g.fillText('POLICE', W * .5, H * .3); g.font = `40px ${DFONT}`; g.fillText('경 찰', W * .5, H * .52); g.font = `30px ${DFONT}`; g.fillText('경찰', W * .9, H * .32); g.fillText('경찰', W * .1, H * .32); });
    VEST = { m: new T.MeshStandardMaterial({ map: tex, roughness: .7, emissive: lin('#3a5000'), emissiveIntensity: .25 }), g: new T.CylinderGeometry(.165, .175, .44, 20, 1, true), belt: new T.MeshStandardMaterial({ color: lin('#111'), roughness: .6 }), radio: new T.MeshStandardMaterial({ color: lin('#222'), roughness: .5 }) };
  }
  const sp = B.Spine2 || B.Spine1; if (sp) { const v = new T.Mesh(VEST.g, VEST.m); v.position.set(0, .02, .01); v.scale.set(1.05, 1, .82); v.castShadow = true; sp.add(v); const rd = new T.Mesh(new T.BoxGeometry(.05, .09, .03), VEST.radio); rd.position.set(-.1, .17, .13); sp.add(rd); }
  if (B.Hips) { const b = new T.Mesh(new T.CylinderGeometry(.16, .16, .06, 18, 1, true), VEST.belt); b.position.set(0, .06, 0); b.scale.z = .85; B.Hips.add(b); const hol = new T.Mesh(new T.BoxGeometry(.05, .14, .09), VEST.belt); hol.position.set(-.17, -.02, 0); B.Hips.add(hol); }
}
/* ---------- 뼈를 직접 움직이는 자세 (펀치 · 손들기) ---------- */
const _v1 = new T.Vector3(), _v2 = new T.Vector3(), _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion();
function aimBone(P, name, child, dir, w) {
  const b = P.B[name], c = P.B[child]; if (!b || !c) return; b.updateMatrixWorld(true); b.getWorldPosition(_v1); c.getWorldPosition(_v2); _v2.sub(_v1).normalize();
  _q1.setFromUnitVectors(_v2, dir); if (w != null && w < 1) _q1.slerp(_q3.identity(), 1 - w);
  b.parent.getWorldQuaternion(_q2); const inv = _q2.clone().invert(); b.quaternion.premultiply(inv.multiply(_q1).multiply(_q2)); b.updateMatrixWorld(true);
}
function fist(P, S, k) { const L = P.fingers && P.fingers[S]; if (!L) return; for (const [b, th] of L) b.rotation.x += (th ? .5 : 1.25) * k; P.curled = true; }
function resetFingers(P) { if (!P.curled) return; P.curled = false; for (const S in P.fingers) for (const [b, , q] of P.fingers[S]) b.quaternion.copy(q); }
function applyPose(P) {
  resetFingers(P); if (!P.pose) return; P.root.updateMatrixWorld(true); const f = new T.Vector3(0, 0, 1).applyQuaternion(P.root.getWorldQuaternion(new T.Quaternion())); f.y = 0; f.normalize(); const yaw = Math.atan2(f.x, f.z); const rt = new T.Vector3(-f.z, 0, f.x), up = new T.Vector3(0, 1, 0);
  const V = (a, b, c) => new T.Vector3().addScaledVector(f, a).addScaledVector(up, b).addScaledVector(rt, c).normalize(); // 앞 · 위 · 오른쪽
  const mix = (a, b, k) => a.clone().lerp(b, k).normalize();
  const arm = (S, u, l, w) => { aimBone(P, S + 'Arm', S + 'ForeArm', u, w); aimBone(P, S + 'ForeArm', S + 'Hand', l, w); };
  const twist = (a) => { const b = P.B.Spine2 || P.B.Spine1; if (b) { b.rotateY(a); b.updateMatrixWorld(true); } };
  P.root.updateMatrixWorld(true);
  // 권투 가드: 팔꿈치는 아래, 주먹은 턱 앞
  const guardU = s => V(.55, -.75, s * .38), guardL = s => V(.42, .9, -s * .06);
  if (P.pose === 'punch' || P.pose === 'guard') {
    const t = P.poseT || 0; const side = P.punchSide || 1; let ext = 0;
    if (P.pose === 'punch') ext = t < .28 ? Math.sin(t / .28 * Math.PI / 2) : t < .45 ? 1 : Math.max(0, 1 - (t - .45) / .55);
    twist(-side * .38 * ext + (P.pose === 'guard' ? 0 : side * .1 * (1 - ext)));
    for (const S of ['Left', 'Right']) {
      const s = S === 'Right' ? 1 : -1; const k = s === side ? ext : 0;
      // 뻗은 팔: 어깨 높이로 앞 (살짝 안쪽)
      arm(S, mix(guardU(s), V(1, .08, -s * .12), k), mix(guardL(s), V(1, .06, -s * .1), k), 1); fist(P, S, 1);
    }
    if (P.B.Spine1) { P.B.Spine1.rotateX(.12 + ext * .1); P.B.Spine1.updateMatrixWorld(true); }
  } else if (P.pose === 'stomp') {
    const t = P.poseT || 0; const lift = t < .45 ? Math.sin(t / .45 * Math.PI / 2) : Math.max(0, 1 - (t - .45) / .15);
    aimBone(P, 'RightUpLeg', 'RightLeg', V(.25 + lift * .75, -1 + lift * .4, .08), 1); aimBone(P, 'RightLeg', 'RightFoot', V(.12 + lift * .2, -1, 0), 1);
    for (const S of ['Left', 'Right']) { const s = S === 'Right' ? 1 : -1; arm(S, V(-.1, -.9, s * .45), V(.3, -.6, s * .35), .9); }
    if (P.B.Spine1) { P.B.Spine1.rotateX(.25 * (1 - lift)); P.B.Spine1.updateMatrixWorld(true); }
  } else if (P.pose === 'hands') {
    for (const S of ['Left', 'Right']) { const s = S === 'Right' ? 1 : -1; arm(S, V(.1, .6, s * .7), V(0, 1, s * .1), 1); }
  } else if (P.pose === 'phone') {
    arm('Right', V(.2, -1, .3), V(.5, .9, -.35), .95);
  } else if (P.pose === 'aim') { // 두 손으로 총 겨누기
    const a = P.aimDir || f; const ar = new T.Vector3(-a.z, 0, a.x).normalize();
    const flat = new T.Vector3(a.x, 0, a.z).normalize(); const dy = Math.atan2(flat.x, flat.z) - yaw; twist(Math.atan2(Math.sin(dy), Math.cos(dy)) * .6);
    aimBone(P, 'RightArm', 'RightForeArm', a.clone().addScaledVector(ar, -.12).normalize(), 1); aimBone(P, 'RightForeArm', 'RightHand', a, 1); fist(P, 'Right', .8); fist(P, 'Left', .6);
    if (!P.oneHand) { aimBone(P, 'LeftArm', 'LeftForeArm', a.clone().addScaledVector(ar, .55).add(new T.Vector3(0, -.2, 0)).normalize(), 1); aimBone(P, 'LeftForeArm', 'LeftHand', a.clone().addScaledVector(ar, -.55).normalize(), 1); }
  } else if (P.pose === 'ride') { // 오토바이 타기
    for (const S of ['Left', 'Right']) { const s = S === 'Right' ? 1 : -1;
      aimBone(P, S + 'UpLeg', S + 'Leg', V(1, -.25, s * .22), 1); aimBone(P, S + 'Leg', S + 'Foot', V(-.15, -1, s * .05), 1);
      arm(S, V(.85, -.35, s * .35), V(.9, -.25, -s * .05), 1); }
    if (P.B.Spine1) { P.B.Spine1.rotateX(.3); P.B.Spine1.updateMatrixWorld(true); }
  } else if (P.pose === 'flinch') { const k = Math.sin(clamp(P.poseT || 0, 0, 1) * Math.PI);
    if (P.B.Spine1) { P.B.Spine1.rotateX(-.45 * k); P.B.Spine1.updateMatrixWorld(true); } if (P.B.Head) { P.B.Head.rotateY(.5 * k); P.B.Head.rotateX(-.3 * k); P.B.Head.updateMatrixWorld(true); }
    for (const S of ['Left', 'Right']) { const s = S === 'Right' ? 1 : -1; arm(S, V(-.2, -.8, s * .55), V(.2, -.4, s * .4), .7 * k); }
  } else if (P.pose === 'cower') {
    for (const S of ['Left', 'Right']) { const s = S === 'Right' ? 1 : -1; arm(S, V(.4, .5, s * .6), V(-.2, .7, -s * .7), 1); }
    if (P.B.Spine1) { P.B.Spine1.rotateX(.5); P.B.Spine1.updateMatrixWorld(true); }
  }
}
/* 쓰러진 자세: 몸 전체를 눕혀요 */
function layDown(P, k, dirYaw) { P.root.rotation.x = -Math.PI / 2 * k; }
