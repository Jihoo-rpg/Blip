'use strict';
/* ===== 자동차: 모델 · 운전 물리 · 교통 AI ===== */
const SPEC = {
  sedan: { L: 4.7, W: 1.86, acc: 9, max: 42, brake: 18, wb: 2.75, mass: 1, hp: 100, name: '승용차' },
  taxi: { L: 4.7, W: 1.86, acc: 9, max: 40, brake: 18, wb: 2.75, mass: 1, hp: 100, name: '택시' },
  police: { L: 4.8, W: 1.88, acc: 12.5, max: 50, brake: 20, wb: 2.8, mass: 1.2, hp: 140, name: '경찰차' },
  suv: { L: 4.8, W: 1.95, acc: 9, max: 40, brake: 17, wb: 2.85, mass: 1.4, hp: 130, name: 'SUV' },
  sports: { L: 4.45, W: 1.95, acc: 15, max: 58, brake: 22, wb: 2.6, mass: .9, hp: 90, name: '스포츠카' },
  truck: { L: 5.1, W: 1.78, acc: 7, max: 33, brake: 14, wb: 2.6, mass: 1.6, hp: 140, name: '1톤 트럭' },
  bus: { L: 11, W: 2.5, acc: 4.5, max: 26, brake: 10, wb: 6.2, mass: 5, hp: 300, name: '시내버스' },
  armored: { L: 6.2, W: 2.3, acc: 6, max: 30, brake: 12, wb: 3.6, mass: 3, hp: 420, name: '현금수송차' },
  bike: { L: 2.1, W: .8, acc: 15, max: 52, brake: 20, wb: 1.42, mass: .35, hp: 60, name: '오토바이', bike: 1 },
  scooter: { L: 1.9, W: .78, acc: 8.5, max: 30, brake: 16, wb: 1.3, mass: .3, hp: 50, name: '배달 스쿠터', bike: 1 }
};
const PAINT = ['#f4f4f2', '#f4f4f2', '#111214', '#111214', '#8d9399', '#c4c8cc', '#2a3e66', '#7a1620', '#3b4a3a', '#d8d2c4', '#1f5ea8', '#5a5f66'];
const _paint = {}; function paintMat(c) { return _paint[c] || (_paint[c] = new T.MeshPhysicalMaterial({ color: lin(c), metalness: .45, roughness: .32, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.1 })); }
const GLASS = new T.MeshPhysicalMaterial({ color: lin('#0b1118'), metalness: .9, roughness: .04, envMapIntensity: 1.6, clearcoat: 1 });
const TRIM = new T.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .3 });
const LIGHTM = new T.MeshBasicMaterial({ vertexColors: true });
const WHEELM = new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .35 });
const SIREN = { r: new T.MeshBasicMaterial({ color: '#ff1a1a' }), b: new T.MeshBasicMaterial({ color: '#1a5cff' }) };
function vcol(geo, hex) { const g = geo.index ? geo.toNonIndexed() : geo; const c = lin(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; }
function at(geo, x, y, z, rx, ry, rz) { geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(1, 1, 1))); return geo; }
function merge(list) { const ok = list.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new T.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }); return T.BufferGeometryUtils.mergeBufferGeometries(ok); }
function extrudeSide(pts, width, bevel) { // pts: [z,y] 옆모습 → 폭 width 로 늘려요 (길이=z)
  const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++)s.lineTo(pts[i][0], pts[i][1]);
  const b = bevel == null ? .06 : bevel; const g = new T.ExtrudeGeometry(s, { depth: width - b * 2, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate((width - b * 2) / 2, 0, 0); g.computeVertexNormals(); return g;
}
const MODEL = {};
function decalTex(txt, bg, fg, w, h) { return ctex(w || 512, h || 128, (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = fg; g.font = `${H * .62}px ${DFONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H / 2 + 4); }); }
function buildModel(type) {
  if (MODEL[type]) return MODEL[type]; const S = SPEC[type], L = S.L, W = S.W, hl = L / 2; const M = { body: null, glass: null, trim: [], lights: [], wheels: [], wr: .34, extra: [] };
  if (type === 'bus') {
    const side = (col) => ctex(1024, 256, (g, Wd, Hd) => { g.fillStyle = col; g.fillRect(0, 0, Wd, Hd); g.fillStyle = '#0d141c'; g.fillRect(40, 40, Wd - 80, 110); for (let x = 40; x < Wd - 40; x += 120) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 6, 46, 40, 98); g.fillStyle = col; g.fillRect(x + 116, 40, 6, 110); } g.fillStyle = '#fff'; g.fillRect(0, 168, Wd, 6); g.font = `64px ${DFONT}`; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(col === '#1e64d8' ? '402 간선' : '7016 지선', 60, 230); g.fillStyle = '#20262e'; g.fillRect(Wd - 190, 40, 90, 200); });
    M.busTex = { blue: side('#1e64d8'), green: side('#2a9d4b') };
    const front = ctex(256, 256, (g, Wd, Hd) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, Wd, Hd); g.fillStyle = '#0d141c'; g.fillRect(14, 20, Wd - 28, 140); g.fillStyle = '#ffcf40'; g.font = `40px ${DFONT}`; g.textAlign = 'center'; g.fillText('402', Wd / 2, 60); g.fillStyle = '#fffbe0'; g.fillRect(20, 200, 50, 24); g.fillRect(Wd - 70, 200, 50, 24); });
    M.busFront = front; M.wr = .5;
    for (const z of [-hl + 2.2, hl - 2.4]) for (const s of [-1, 1]) M.wheels.push([s * (W / 2 - .2), .5, z]);
    return MODEL[type] = M;
  }
  if (S.bike) {
    const t = M.trim, sc = type === 'scooter'; M.wr = sc ? .27 : .32; const blk = '#121212', chr = '#b8bec4';
    t.push(vcol(at(new T.BoxGeometry(.12, .12, 1.15), 0, .55, 0, -.15), blk)); // 프레임
    t.push(vcol(at(new T.BoxGeometry(.3, .1, .62), 0, .86, -.25), '#1a1a1a')); // 안장
    t.push(vcol(at(new T.CylinderGeometry(.03, .03, .75, 6), 0, .78, .66, .42), chr)); t.push(vcol(at(new T.CylinderGeometry(.025, .025, .62, 6).rotateZ(Math.PI / 2), 0, 1.08, .52), blk)); // 포크 · 핸들
    t.push(vcol(at(new T.CylinderGeometry(.05, .06, .5, 8).rotateX(Math.PI / 2), .14, .42, -.55), chr));
    if (sc) { t.push(vcol(at(new T.BoxGeometry(.55, .45, .5), 0, 1.08, -.72), '#e8303a')); }
    M.lights.push(vcol(at(new T.BoxGeometry(.16, .1, .05), 0, .92, .9), '#fff7de'), vcol(at(new T.BoxGeometry(.16, .07, .05), 0, .85, -.95), '#ff1f1f'));
    M.body = sc ? merge([at(new T.BoxGeometry(.42, .5, .55), 0, .66, .55), at(new T.BoxGeometry(.4, .25, .9), 0, .55, -.2)]) : merge([at(new T.BoxGeometry(.36, .3, .55), 0, .82, .18), at(new T.BoxGeometry(.26, .24, .5), 0, .62, -.1), at(new T.BoxGeometry(.3, .18, .5), 0, .82, -.65)]);
    M.roof = new T.BoxGeometry(.001, .001, .001);
    M.wheels.push([0, M.wr, -S.wb / 2], [0, M.wr, S.wb / 2]); M.seatY = .9; return MODEL[type] = M;
  }
  if (type === 'armored') { const P = [[-hl, .4], [hl - .05, .4], [hl, .55], [hl, 1.2], [hl - .35, 1.35], [hl - 1.2, 1.4], [hl - 1.45, 2.55], [-hl, 2.55], [-hl, .55]]; const cab = [[hl - .4, 1.33], [hl - .95, 2.1], [hl - 1.4, 2.1], [hl - 1.4, 1.38]]; M.wr = .45;
    M.body = extrudeSide(P, W); M.glass = extrudeSide(cab, W * .9, .03); M.roof = at(new T.BoxGeometry(W * .8, .06, 1), 0, 2.56, -1);
    const t = M.trim; t.push(vcol(at(new T.BoxGeometry(W + .04, .25, .2), 0, .5, hl), '#141414'), vcol(at(new T.BoxGeometry(W + .04, .25, .2), 0, .5, -hl), '#141414'), vcol(at(new T.BoxGeometry(W * .7, 1.7, .04), 0, 1.5, -hl - .02), '#2a3a2a'));
    for (const s of [-1, 1]) { M.lights.push(vcol(at(new T.BoxGeometry(.35, .14, .05), s * (W / 2 - .3), .8, hl + .01), '#fff7de'), vcol(at(new T.BoxGeometry(.3, .14, .05), s * (W / 2 - .25), .8, -hl - .01), '#ff1f1f')); }
    for (const z of [-S.wb / 2, S.wb / 2]) for (const s of [-1, 1]) M.wheels.push([s * (W / 2 - .15), M.wr, z]); return MODEL[type] = M; }
  let P, cab, roofZ;
  if (type === 'sports') { P = [[-hl, .25], [hl - .1, .24], [hl, .42], [hl - .15, .62], [hl - 1.4, .78], [-hl + .7, .82], [-hl + .1, .8], [-hl, .62]]; cab = [[hl - 1.45, .76], [-.1, 1.16], [-.9, 1.17], [-hl + .75, .82]]; roofZ = [-.85, -.12, 1.15]; M.wr = .33; }
  else if (type === 'suv') { P = [[-hl, .3], [hl - .08, .3], [hl, .52], [hl, .82], [hl - .3, .98], [hl - 1.15, 1.05], [-hl + .1, 1.08], [-hl, .92], [-hl, .52]]; cab = [[hl - 1.2, 1.02], [hl - 2.0, 1.66], [-hl + .3, 1.68], [-hl + .05, 1.08]]; roofZ = [-hl + .35, hl - 2.05, 1.66]; M.wr = .38; }
  else if (type === 'truck') { P = [[-hl, .34], [hl - .05, .34], [hl, .55], [hl, 1.05], [hl - .2, 1.15], [hl - 1.75, 1.15], [hl - 1.75, .78], [-hl, .78]]; cab = [[hl - .25, 1.13], [hl - .55, 1.88], [hl - 1.72, 1.9], [hl - 1.72, 1.13]]; roofZ = [hl - 1.72, hl - .55, 1.88]; M.wr = .33; }
  else { P = [[-hl, .27], [hl - .08, .27], [hl, .42], [hl, .64], [hl - .28, .76], [hl - 1.1, .84], [-hl + .95, .88], [-hl + .12, .86], [-hl, .72], [-hl, .42]]; cab = [[hl - 1.12, .82], [hl * .12, 1.38], [-hl * .5, 1.4], [-hl + .95, .86]]; roofZ = [-hl * .48, hl * .1, 1.38]; }
  M.body = extrudeSide(P, W);
  M.glass = extrudeSide(cab, W * .84, .04);
  const roof = at(new T.BoxGeometry(W * .8, .07, roofZ[1] - roofZ[0]), 0, roofZ[2] + .01, (roofZ[0] + roofZ[1]) / 2); M.roof = roof;
  // 기둥 (A 필러) 같은 색
  const t = M.trim; const blk = '#141414', chr = '#c8ccd0';
  t.push(vcol(at(new T.BoxGeometry(W + .04, .2, .16), 0, .42, hl - .02), blk), vcol(at(new T.BoxGeometry(W + .04, .2, .16), 0, .42, -hl + .02), blk));
  t.push(vcol(at(new T.BoxGeometry(W * .5, .16, .04), 0, type === 'truck' ? .78 : .58, hl + .02), '#0c0c0c'));
  for (const s of [-1, 1]) { t.push(vcol(at(new T.BoxGeometry(.05, .12, L * .62), s * (W / 2 + .01), .4, 0), blk)); t.push(vcol(at(new T.BoxGeometry(.16, .1, .22), s * (W / 2 + .07), type === 'truck' ? 1.45 : 1.0, hl - (type === 'truck' ? .7 : 1.25)), blk)); }
  t.push(vcol(at(new T.BoxGeometry(.52, .12, .03), 0, .45, hl + .06), '#f2f2f2'), vcol(at(new T.BoxGeometry(.52, .12, .03), 0, .5, -hl - .06), '#f2f2f2'));
  if (type === 'truck') { // 짐칸 난간
    for (const s of [-1, 1]) t.push(vcol(at(new T.BoxGeometry(.06, .38, L - 1.8), s * (W / 2 - .03), .98, -.85), '#c8ccd0')); t.push(vcol(at(new T.BoxGeometry(W, .38, .06), 0, .98, -hl + .03), '#c8ccd0')); t.push(vcol(at(new T.BoxGeometry(W - .1, .5, .08), 0, 1.4, hl - 1.78), '#2a2a2a'));
  }
  const ly = type === 'truck' ? .78 : type === 'suv' ? .82 : type === 'sports' ? .55 : .62;
  for (const s of [-1, 1]) { M.lights.push(vcol(at(new T.BoxGeometry(.42, .12, .05), s * (W / 2 - .32), ly, hl + .005), '#fff7de')); M.lights.push(vcol(at(new T.BoxGeometry(.46, .13, .05), s * (W / 2 - .3), type === 'truck' ? .62 : ly + .08, -hl - .005), '#ff1f1f')); }
  const wz = S.wb / 2; for (const z of [-wz, wz]) for (const s of [-1, 1]) M.wheels.push([s * (W / 2 - .1), M.wr, z]);
  return MODEL[type] = M;
}
let WHEEL_GEO = {};
function wheelGeo(r) { if (WHEEL_GEO[r]) return WHEEL_GEO[r]; const tire = vcol(new T.CylinderGeometry(r, r, .26, 20).rotateZ(Math.PI / 2), '#141414'); const rim = vcol(new T.CylinderGeometry(r * .62, r * .62, .27, 10).rotateZ(Math.PI / 2), '#b9bec4'); const hub = vcol(new T.CylinderGeometry(r * .2, r * .2, .28, 8).rotateZ(Math.PI / 2), '#555'); return WHEEL_GEO[r] = merge([tire, rim, hub]); }
let CAR_ID = 0;
function makeCar(type, color) {
  const S = SPEC[type], M = buildModel(type); const g = new T.Group(); const car = { id: ++CAR_ID, type, S, g, x: 0, z: 0, y: 0, yaw: 0, v: 0, vl: 0, steer: 0, hp: S.hp, maxHp: S.hp, drv: null, ai: null, wheels: [], spin: 0, roll: 0, pitch: 0, brakeL: 0, siren: false, fire: 0, dead: false, color };
  const body = new T.Group(); g.add(body); car.bodyG = body;
  if (type === 'bus') {
    const sideT = color === 'green' ? M.busTex.green : M.busTex.blue; const sm = new T.MeshStandardMaterial({ map: sideT, roughness: .5 }), fm = new T.MeshStandardMaterial({ map: M.busFront, roughness: .4 }), wm = new T.MeshStandardMaterial({ color: lin('#d8d8d8'), roughness: .5 });
    const bx = new T.Mesh(new T.BoxGeometry(S.W, 2.9, S.L), [sm, sm, wm, wm, fm, wm]); bx.position.y = .35 + 1.45; bx.castShadow = true; body.add(bx);
  } else {
    const pm = paintMat(type === 'taxi' ? '#e8792a' : type === 'police' ? '#f4f4f2' : type === 'armored' ? '#2f4a33' : color || pick(PAINT));
    if (!M.bodyR) M.bodyR = merge([M.body, M.roof]); const b = new T.Mesh(M.bodyR, pm); b.castShadow = true; body.add(b);
    if (M.glass) body.add(new T.Mesh(M.glass, GLASS));
    if (!M.trimG) { M.trimG = merge(M.trim); M.lightG = merge(M.lights); }
    body.add(new T.Mesh(M.trimG, TRIM)); body.add(new T.Mesh(M.lightG, LIGHTM));
    if (type === 'taxi') { if (!M.sign) M.sign = new T.MeshBasicMaterial({ map: decalTex('택시', '#ffd84a', '#1b1b1b', 256, 96) }); const sg = new T.Mesh(new T.BoxGeometry(.5, .22, .28), [M.sign, M.sign, M.sign, M.sign, M.sign, M.sign]); sg.position.set(0, 1.52, -.2); sg.rotation.y = Math.PI / 2; body.add(sg); }
    if (type === 'armored') { const dm = new T.MeshBasicMaterial({ map: decalTex('현금수송  CASH', null, '#ffd84a', 512, 96), transparent: true }); for (const s of [-1, 1]) { const d = new T.Mesh(new T.PlaneGeometry(3, .55), dm); d.position.set(s * (S.W / 2 + .05), 1.9, -.8); d.rotation.y = s * Math.PI / 2; body.add(d); } }
    if (type === 'police') {
      if (!M.dec) { M.dec = new T.MeshBasicMaterial({ map: decalTex('경찰  POLICE', null, '#16306e', 512, 96), transparent: true }); M.stripe = new T.MeshStandardMaterial({ color: lin('#1d3a8a'), roughness: .4 }); M.lime = new T.MeshStandardMaterial({ color: lin('#b8f03a'), roughness: .4, emissive: lin('#3a5a00'), emissiveIntensity: .3 }); }
      for (const s of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(.02, .16, S.L * .9), M.stripe); st.position.set(s * (S.W / 2 + .03), .58, 0); body.add(st); const li = new T.Mesh(new T.BoxGeometry(.02, .06, S.L * .9), M.lime); li.position.set(s * (S.W / 2 + .03), .69, 0); body.add(li); const d = new T.Mesh(new T.PlaneGeometry(1.8, .34), M.dec); d.position.set(s * (S.W / 2 + .045), .78, -.1); d.rotation.y = s * Math.PI / 2; body.add(d); }
      const base = new T.Mesh(new T.BoxGeometry(1.2, .1, .3), TRIM); base.position.set(0, 1.45, -.25); body.add(base);
      const r = new T.Mesh(new T.BoxGeometry(.52, .12, .26), SIREN.r); r.position.set(-.3, 1.55, -.25); body.add(r); const bl = new T.Mesh(new T.BoxGeometry(.52, .12, .26), SIREN.b); bl.position.set(.3, 1.55, -.25); body.add(bl); car.sirenM = [r, bl];
    }
  }
  const wg = S.bike ? (M.wgeo || (M.wgeo = merge([vcol(new T.CylinderGeometry(M.wr, M.wr, .12, 18).rotateZ(Math.PI / 2), '#141414'), vcol(new T.CylinderGeometry(M.wr * .6, M.wr * .6, .13, 10).rotateZ(Math.PI / 2), '#9aa0a6')]))) : wheelGeo(M.wr);
  M.wheels.forEach(([x, y, z], i) => { const piv = new T.Group(); piv.position.set(x, y, z); const w = new T.Mesh(wg, WHEELM); w.castShadow = true; piv.add(w); g.add(piv); car.wheels.push({ piv, w, front: z > 0 }); });
  car.circles = []; const n = Math.max(2, Math.round(S.L / S.W)); for (let i = 0; i < n; i++) car.circles.push(-S.L / 2 + S.W / 2 + (S.L - S.W) * i / (n - 1));
  return car;
}
function carFwd(c) { return [Math.sin(c.yaw), Math.cos(c.yaw)]; }
function placeCar(c) { c.y = lerp(c.y, groundY(c.x, c.z), .3); c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.yaw; if (c.S.bike) { const want = c.fallen ? 1.35 : (c.drv || c.rider) ? clamp(-c.steer * Math.abs(c.v) * .07, -.6, .6) : .18; c.lean = lerp(c.lean || 0, want, .15); c.g.rotation.z = c.lean; c.g.rotation.order = 'YXZ'; c.bodyG.rotation.x = c.pitch * .5; } else { c.bodyG.rotation.z = c.roll; c.bodyG.rotation.x = c.pitch; } for (const w of c.wheels) { w.w.rotation.x = c.spin; if (w.front) w.piv.rotation.y = c.steer; } }

/* ---------- 운전 물리 (플레이어 · 경찰 · 버려진 차) ---------- */
function drive(c, inp, dt) {
  const S = c.S; const thr = inp.thr || 0, brk = inp.brk || 0, hand = !!inp.hand;
  if (c.dead) { c.v *= Math.pow(.2, dt); c.vl *= Math.pow(.1, dt); }
  else {
    if (thr > 0) { if (c.v < -.5) c.v += S.brake * thr * dt; else c.v += S.acc * thr * (1 - Math.max(0, c.v) / S.max) * dt; }
    if (brk > 0) { if (c.v > .5) c.v -= S.brake * brk * dt; else c.v = Math.max(-11, c.v - S.acc * .6 * brk * dt); }
    if (!thr && !brk) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), (1.2 + Math.abs(c.v) * .06) * dt);
    if (hand) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 7 * dt);
  }
  c.v -= c.v * Math.abs(c.v) * .0007 * dt * 60 * dt;
  const sp = Math.abs(c.v); const maxSt = .62 / (1 + sp * .045); c.steer += ((inp.steer || 0) * maxSt - c.steer) * Math.min(1, dt * 7);
  let yr = c.v * Math.tan(c.steer) / S.wb; if (hand) yr *= 1.35; c.yaw += yr * dt;
  const grip = hand ? 1.2 : 9; c.vl += (-c.v * yr * (hand ? .55 : .12)) * dt; c.vl -= c.vl * Math.min(1, grip * dt);
  const f = carFwd(c); c.x += (f[0] * c.v + f[1] * c.vl) * dt; c.z += (f[1] * c.v - f[0] * c.vl) * dt;
  c.spin += c.v * dt / (buildModel(c.type).wr); c.roll = lerp(c.roll, clamp(-yr * sp * .012, -.08, .08), Math.min(1, dt * 6)); c.pitch = lerp(c.pitch, clamp((brk && c.v > 1 ? .025 : 0) - (thr ? .015 : 0), -.04, .04), Math.min(1, dt * 5));
  c.brakeL = brk && c.v > 0 ? 1 : 0;
  return carStatic(c, dt);
}
/* 건물 · 기둥과 부딪힘 → 충격 세기 */
function carStatic(c, dt) {
  const f = carFwd(c); let hit = 0; const r = c.S.W / 2 * .95; const p = { x: 0, z: 0 };
  for (const o of c.circles) {
    p.x = c.x + f[0] * o; p.z = c.z + f[1] * o; const ox = p.x, oz = p.z; const h = collideCircle(p, r, c.y);
    const bx = p.x, bz = p.z; inBounds(p, r); if (p.x !== bx || p.z !== bz) { /* 경계 */ }
    const dx = p.x - ox, dz = p.z - oz; if (dx || dz) {
      c.x += dx; c.z += dz; const d = Math.hypot(dx, dz) || 1; const nx = dx / d, nz = dz / d;
      const vx = f[0] * c.v + f[1] * c.vl, vz = f[1] * c.v - f[0] * c.vl; const vn = vx * nx + vz * nz;
      if (vn < 0) { hit = Math.max(hit, -vn); const nvx = vx - nx * vn * 1.35, nvz = vz - nz * vn * 1.35; c.v = (nvx * f[0] + nvz * f[1]) * .8; c.vl = (nvx * f[1] - nvz * f[0]) * .5; }
      if (h && h.o.circ && Math.abs(c.v) > 8 && h.o.r < .3) { } // 가로등 · 나무
    }
  }
  if (c.x !== c.x) { c.x = 0; c.z = 0; c.v = 0; }
  return hit;
}
/* 차끼리 */
function carVsCar(a, b) {
  const fa = carFwd(a), fb = carFwd(b); let best = null;
  for (const oa of a.circles) for (const ob of b.circles) {
    const ax = a.x + fa[0] * oa, az = a.z + fa[1] * oa, bx = b.x + fb[0] * ob, bz = b.z + fb[1] * ob; const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), m = a.S.W / 2 + b.S.W / 2 - .1;
    if (d < m && (!best || m - d > best.p)) best = { p: m - d, nx: d ? dx / d : 1, nz: d ? dz / d : 0 };
  }
  if (!best) return 0;
  const ka = a.ai && !a.ai.phys ? 0.15 : 1, kb = b.ai && !b.ai.phys ? 0.15 : 1; const ma = a.S.mass * (ka < 1 ? 3 : 1), mb = b.S.mass * (kb < 1 ? 3 : 1); const wa = mb / (ma + mb), wb = ma / (ma + mb);
  a.x -= best.nx * best.p * wa; a.z -= best.nz * best.p * wa; b.x += best.nx * best.p * wb; b.z += best.nz * best.p * wb;
  const va = [fa[0] * a.v + fa[1] * a.vl, fa[1] * a.v - fa[0] * a.vl], vb = [fb[0] * b.v + fb[1] * b.vl, fb[1] * b.v - fb[0] * b.vl];
  const rel = (va[0] - vb[0]) * best.nx + (va[1] - vb[1]) * best.nz; if (rel <= 0) return 0;
  const j = rel * 1.3 / (1 / ma + 1 / mb);
  const nva = [va[0] - best.nx * j / ma, va[1] - best.nz * j / ma], nvb = [vb[0] + best.nx * j / mb, vb[1] + best.nz * j / mb];
  a.v = nva[0] * fa[0] + nva[1] * fa[1]; a.vl = (nva[0] * fa[1] - nva[1] * fa[0]) * .6; b.v = nvb[0] * fb[0] + nvb[1] * fb[1]; b.vl = (nvb[0] * fb[1] - nvb[1] * fb[0]) * .6;
  return rel;
}

/* ---------- 교통 AI (차선 따라가기) ---------- */
const right = (f) => [-f[1], f[0]];
function laneSpawn(car, x, z, f, li) {
  // f: [1,0] / [-1,0] / [0,1] / [0,-1]
  const r = right(f); const off = LANES[li]; car.yaw = Math.atan2(f[0], f[1]);
  // 도로 중심선
  if (f[0]) { const c = Math.round(z / P) * P; car.x = x; car.z = c + r[1] * off; } else { const c = Math.round(x / P) * P; car.z = z; car.x = c + r[0] * off; }
  const along = f[0] ? car.x : car.z; const node = (Math.floor(along / P) + (f[0] + f[1] > 0 ? 1 : 0)) * P;
  car.ai = { f: f.slice(), li, off, node: f[0] ? [node, Math.round(car.z / P) * P] : [Math.round(car.x / P) * P, node], turn: null, vd: rand(9, 13), wait: 0, plan: null, phys: false, honk: 0 };
  if (f[0]) car.ai.node[1] = Math.round((car.z - r[1] * off) / P) * P; else car.ai.node[0] = Math.round((car.x - r[0] * off) / P) * P;
  car.v = car.ai.vd * .8; car.y = 0;
}
function inCity(x, z) { return Math.abs(x) <= LIM + .1 && Math.abs(z) <= LIM + .1; }
function planTurn(ai) {
  const f = ai.f, r = right(f), n = ai.node; const opts = [];
  if (inCity(n[0] + f[0] * P, n[1] + f[1] * P)) opts.push(['s', 6]);
  if (inCity(n[0] + r[0] * P, n[1] + r[1] * P)) opts.push(['r', 2.5]);
  if (inCity(n[0] - r[0] * P, n[1] - r[1] * P)) opts.push(['l', 1.5]);
  let t = Math.random() * opts.reduce((a, o) => a + o[1], 0); for (const o of opts) { t -= o[1]; if (t <= 0) return o[0]; } return opts[0] ? opts[0][0] : 'u';
}
const AXIS = f => f[0] ? 'x' : 'z';
function trafficStep(c, dt, others, people) {
  const ai = c.ai; if (ai.stun > 0) { ai.stun -= dt; c.v *= Math.pow(.05, dt); placeCar(c); return; }
  const f = ai.turn ? [Math.sin(c.yaw), Math.cos(c.yaw)] : ai.f; const r = right(f);
  // 목표 속도
  let vt = ai.vd;
  if (!ai.turn) {
    const dn = (ai.node[0] - c.x) * ai.f[0] + (ai.node[1] - c.z) * ai.f[1];
    if (!ai.plan && dn < 40) ai.plan = planTurn(ai);
    const ds = dn - (RH + 4.8); const L = lightFor(AXIS(ai.f));
    if (ds > -1 && ds < 34 && L !== 'g' && !(L === 'y' && ds < 4)) vt = Math.min(vt, Math.max(0, ds - .3) * .7);
    if (ai.plan && ai.plan !== 's') vt = Math.min(vt, 7 + Math.max(0, dn - RH) * .25);
  }
  const fy = [Math.sin(c.yaw), Math.cos(c.yaw)], ry = right(fy); let block = 0;
  for (const o of others) { if (o === c) continue; const dx = o.x - c.x, dz = o.z - c.z; if (Math.abs(dx) > 22 || Math.abs(dz) > 22) continue; const ah = dx * fy[0] + dz * fy[1], lat = Math.abs(dx * ry[0] + dz * ry[1]); if (ah > 0 && ah < 18 && lat < (c.S.W + o.S.W) / 2 + .5) { vt = Math.min(vt, Math.max(0, ah - (c.S.L + o.S.L) / 2 - 1.5) * .9); block = 1; } }
  for (const p of people) { const dx = p.x - c.x, dz = p.z - c.z; if (Math.abs(dx) > 14 || Math.abs(dz) > 14) continue; const ah = dx * fy[0] + dz * fy[1], lat = Math.abs(dx * ry[0] + dz * ry[1]); if (ah > 0 && ah < 11 + c.S.L / 2 && lat < c.S.W / 2 + .9) { vt = Math.min(vt, Math.max(0, ah - c.S.L / 2 - 1.6) * 1.2); if (p.isPlayer) ai.honk += dt; } }
  if (c.v < .3 && vt < .5) ai.wait += dt; else ai.wait = Math.max(0, ai.wait - dt * 2); if (ai.wait > 7 && block) { vt = 3; } // 막히면 조금씩
  c.v += clamp(vt - c.v, -9 * dt, 3.2 * dt);
  // 움직이기
  if (ai.turn) {
    const T_ = ai.turn; T_.t += c.v * dt / T_.len; const t = Math.min(1, T_.t), u = 1 - t;
    const x = u * u * T_.E[0] + 2 * u * t * T_.C[0] + t * t * T_.X[0], z = u * u * T_.E[1] + 2 * u * t * T_.C[1] + t * t * T_.X[1];
    const dx = 2 * u * (T_.C[0] - T_.E[0]) + 2 * t * (T_.X[0] - T_.C[0]), dz = 2 * u * (T_.C[1] - T_.E[1]) + 2 * t * (T_.X[1] - T_.C[1]); c.x = x; c.z = z; if (dx || dz) c.yaw = Math.atan2(dx, dz);
    if (T_.t >= 1) { ai.f = T_.f2; ai.node = [ai.node[0] + ai.f[0] * P, ai.node[1] + ai.f[1] * P]; ai.turn = null; ai.plan = null; c.yaw = Math.atan2(ai.f[0], ai.f[1]); }
  } else {
    c.x += ai.f[0] * c.v * dt; c.z += ai.f[1] * c.v * dt;
    // 차선 가운데로 맞추기
    const want = ai.f[0] ? ai.node[1] + right(ai.f)[1] * ai.off : ai.node[0] + right(ai.f)[0] * ai.off; if (ai.f[0]) c.z = lerp(c.z, want, Math.min(1, dt * 2)); else c.x = lerp(c.x, want, Math.min(1, dt * 2));
    c.yaw += angDiff(c.yaw, Math.atan2(ai.f[0], ai.f[1])) * Math.min(1, dt * 4);
    const dn = (ai.node[0] - c.x) * ai.f[0] + (ai.node[1] - c.z) * ai.f[1];
    if (dn < RH + .5) {
      const pl = ai.plan || planTurn(ai);
      if (pl === 's') { ai.node = [ai.node[0] + ai.f[0] * P, ai.node[1] + ai.f[1] * P]; ai.plan = null; }
      else if (pl === 'u') { ai.f = [-ai.f[0], -ai.f[1]]; c.yaw += Math.PI; ai.node = [ai.node[0] + ai.f[0] * P, ai.node[1] + ai.f[1] * P]; ai.plan = null; }
      else {
        const rr_ = right(ai.f); const f2 = pl === 'r' ? rr_ : [-rr_[0], -rr_[1]]; const r2 = right(f2); const N = ai.node;
        const E = [c.x, c.z]; const X = [N[0] + f2[0] * (RH + 1) + r2[0] * ai.off, N[1] + f2[1] * (RH + 1) + r2[1] * ai.off];
        const k = (X[0] - E[0]) * ai.f[0] + (X[1] - E[1]) * ai.f[1]; const C = [E[0] + ai.f[0] * k, E[1] + ai.f[1] * k];
        const len = Math.hypot(C[0] - E[0], C[1] - E[1]) + Math.hypot(X[0] - C[0], X[1] - C[1]); ai.turn = { E, C, X, f2, t: 0, len: len * .85 };
      }
    }
  }
  c.spin += c.v * dt / buildModel(c.type).wr; c.steer = ai.turn ? (ai.plan === 'l' ? .3 : -.3) * 0 : 0; c.brakeL = vt < c.v - .5 ? 1 : 0; placeCar(c);
}
