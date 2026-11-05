'use strict';
/* ===== STA 2: 고급 차 모델 (곡선 차체 · 휠 디자인 · 그릴 · LED) · 새 차종 · 대리점 · 내 차 ===== */
Object.assign(SPEC, {
  lux: { L: 5.15, W: 1.93, acc: 10.5, max: 48, brake: 20, wb: 3.05, mass: 1.3, hp: 130, name: '그랜드 리무진' },
  super: { L: 4.6, W: 2.02, acc: 19, max: 74, brake: 27, wb: 2.7, mass: .95, hp: 95, name: '블립 하이퍼 GT' },
  hatch: { L: 3.9, W: 1.74, acc: 8.2, max: 36, brake: 16, wb: 2.5, mass: .8, hp: 80, name: '도토리 해치' },
  van: { L: 5.7, W: 2.0, acc: 7, max: 32, brake: 13, wb: 3.35, mass: 1.8, hp: 150, name: '택배 탑차' },
  pickup: { L: 5.35, W: 1.97, acc: 9.5, max: 42, brake: 17, wb: 3.25, mass: 1.5, hp: 150, name: '산악 픽업' },
  ev: { L: 4.8, W: 1.92, acc: 14, max: 54, brake: 21, wb: 2.95, mass: 1.25, hp: 110, name: '볼트 EV' }
});
SPEC.sedan.name = '소나무 세단'; SPEC.suv.name = '타이가 SUV'; SPEC.sports.name = '레드불릿 S';
const CARSTYLE = {
  sedan: { grille: 'mesh', rim: 'spoke5', rimCol: '#c3c8ce', tail: 'split', chrome: .5 },
  taxi: { grille: 'mesh', rim: 'steel', rimCol: '#9aa0a6', tail: 'split', chrome: .2 },
  police: { grille: 'mesh', rim: 'steel', rimCol: '#30343a', tail: 'split', chrome: .2 },
  suv: { grille: 'big', rim: 'multi', rimCol: '#b9bec4', tail: 'split', chrome: .6, rails: 1 },
  sports: { grille: 'intake', rim: 'spoke5', rimCol: '#2a2d33', tail: 'bar', chrome: .2, spoiler: 1, exhaust: 2 },
  lux: { grille: 'lux', rim: 'multi', rimCol: '#d8dce0', tail: 'bar', chrome: 1, exhaust: 2 },
  super: { grille: 'intake', rim: 'turbine', rimCol: '#151515', tail: 'bar', chrome: 0, spoiler: 2, exhaust: 4, blackRoof: 1 },
  hatch: { grille: 'mesh', rim: 'steel', rimCol: '#aab0b6', tail: 'split', chrome: .1 },
  van: { grille: 'mesh', rim: 'steel', rimCol: '#8a9096', tail: 'split', chrome: 0 },
  pickup: { grille: 'big', rim: 'multi', rimCol: '#3a3d42', tail: 'split', chrome: .4, rails: 0 },
  ev: { grille: 'ev', rim: 'turbine', rimCol: '#d0d4d8', tail: 'bar', chrome: .3, blackRoof: 1 }
};
const PALETTE = {
  lux: ['#0b0c10', '#e9e7e2', '#3b0d14', '#16233d', '#8a7a62', '#4a4f57', '#0b0c10'], super: ['#ff2a1a', '#ffcc00', '#18c964', '#ff5a00', '#1b6cff', '#f4f4f4', '#141414', '#b000ff'],
  sports: ['#d10f1f', '#f2c200', '#1f5ea8', '#111214', '#f4f4f2', '#ff6a00'], ev: ['#f4f4f2', '#2a2d33', '#9cc3d5', '#d9d9d9', '#1d3557', '#c0392b'],
  hatch: ['#f4f4f2', '#e8d36a', '#8fc1e3', '#e84a5f', '#9aa0a6', '#7ac17a'], van: ['#f4f4f2'], pickup: ['#2a2d33', '#8a6a3a', '#f4f4f2', '#5a6b3a', '#7a1620']
};
/* 매끈한 옆모습 → 3D */
function smoothProfile(pts, n) { const v = pts.map(p => new T.Vector2(p[0], p[1])); const sp = new T.SplineCurve(v); return sp.getPoints(n || 60).map(p => [p.x, p.y]); }
function extrudeSmooth(pts, width, bevel, segs) { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++)s.lineTo(pts[i][0], pts[i][1]); s.closePath(); const b = bevel == null ? .1 : bevel; const g = new T.ExtrudeGeometry(s, { depth: width - b * 2, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * .9, bevelSegments: segs || 4, curveSegments: 6 }); g.rotateY(-Math.PI / 2); g.translate((width - b * 2) / 2, 0, 0); g.computeVertexNormals(); return g; }
const CHR = '#d9dde2', BLK = '#0e0f11', DGR = '#26292e';
function carBody(type) {
  const S = SPEC[type], L = S.L, W = S.W, hl = L / 2; let low, cab, roofP, wr = .34, ly = .66, tly = .74;
  // low: 차체 아래쪽 옆모습 (앞=+z), cab: 유리 영역, roofP: 지붕
  if (type === 'super') { wr = .36; ly = .58; tly = .7; low = [[-hl, .3], [-hl + .1, .74], [-hl + .9, .86], [-.2, .9], [hl - 1.5, .84], [hl - .55, .62], [hl, .44], [hl - .1, .24], [-hl + .2, .22]]; cab = [[hl - 1.55, .82], [-.1, 1.2], [-.95, 1.2], [-hl + .95, .86]]; roofP = [[-.05, 1.18], [-.95, 1.19], [-.9, 1.24], [-.12, 1.23]]; }
  else if (type === 'sports') { wr = .34; ly = .6; low = [[-hl, .3], [-hl + .05, .76], [-hl + .7, .86], [hl - 1.4, .8], [hl - .4, .66], [hl, .46], [hl - .1, .26], [-hl + .15, .25]]; cab = [[hl - 1.45, .78], [-.1, 1.2], [-.95, 1.21], [-hl + .75, .85]]; roofP = [[-.08, 1.18], [-.95, 1.19], [-.9, 1.25], [-.12, 1.24]]; }
  else if (type === 'lux') { wr = .37; ly = .7; tly = .82; low = [[-hl, .34], [-hl + .02, .86], [-hl + .5, .95], [hl - 1.25, .93], [hl - .35, .84], [hl, .62], [hl - .05, .32], [-hl + .1, .3]]; cab = [[hl - 1.3, .9], [hl * .1, 1.47], [-hl * .55, 1.48], [-hl + .8, .94]]; roofP = [[hl * .1 - .05, 1.45], [-hl * .55 + .05, 1.46], [-hl * .5, 1.52], [hl * .1 - .1, 1.51]]; }
  else if (type === 'ev') { wr = .36; ly = .7; low = [[-hl, .32], [-hl + .02, .82], [-hl + .5, .9], [hl - 1.2, .86], [hl - .3, .74], [hl, .52], [hl - .05, .3], [-hl + .1, .28]]; cab = [[hl - 1.25, .84], [hl * .1, 1.42], [-hl * .3, 1.44], [-hl + .35, .9]]; roofP = [[hl * .1 - .05, 1.4], [-hl * .3, 1.41], [-hl * .25, 1.47], [hl * .1 - .1, 1.46]]; }
  else if (type === 'hatch') { wr = .31; ly = .7; low = [[-hl, .3], [-hl + .02, .9], [-hl + .2, .95], [hl - .95, .9], [hl - .25, .78], [hl, .55], [hl - .05, .3], [-hl + .1, .28]]; cab = [[hl - 1.0, .88], [hl * .05, 1.48], [-hl + .35, 1.48], [-hl + .15, .94]]; roofP = [[hl * .05 - .05, 1.46], [-hl + .35, 1.46], [-hl + .38, 1.52], [hl * .05 - .1, 1.52]]; }
  else if (type === 'suv' || type === 'pickup') { wr = .4; ly = .9; tly = .98; low = [[-hl, .42], [-hl + .02, 1.08], [-hl + .3, 1.12], [hl - 1.15, 1.12], [hl - .3, 1.02], [hl, .8], [hl - .05, .42], [-hl + .1, .4]]; if (type === 'suv') { cab = [[hl - 1.2, 1.08], [hl - 2.0, 1.7], [-hl + .35, 1.72], [-hl + .08, 1.12]]; roofP = [[hl - 2.0, 1.69], [-hl + .35, 1.7], [-hl + .4, 1.77], [hl - 2.05, 1.76]]; } else { cab = [[hl - 1.2, 1.08], [hl - 1.85, 1.72], [hl - 3.1, 1.74], [hl - 3.15, 1.12]]; roofP = [[hl - 1.85, 1.7], [hl - 3.1, 1.71], [hl - 3.08, 1.78], [hl - 1.9, 1.77]]; } }
  else if (type === 'van') { wr = .38; ly = .85; tly = 1; low = [[-hl, .42], [-hl, 1.05], [hl - .3, 1.05], [hl, .8], [hl - .05, .42], [-hl + .1, .4]]; cab = [[hl - .32, 1.03], [hl - .75, 1.95], [hl - 1.75, 1.97], [hl - 1.75, 1.05]]; roofP = [[hl - .75, 1.94], [hl - 1.75, 1.95], [hl - 1.75, 2.02], [hl - .8, 2.01]]; }
  else { wr = .34; low = [[-hl, .3], [-hl + .02, .86], [-hl + .55, .93], [hl - 1.15, .9], [hl - .3, .8], [hl, .58], [hl - .05, .3], [-hl + .1, .28]]; cab = [[hl - 1.15, .87], [hl * .12, 1.4], [-hl * .5, 1.41], [-hl + .9, .91]]; roofP = [[hl * .12 - .05, 1.38], [-hl * .5 + .05, 1.39], [-hl * .48, 1.45], [hl * .12 - .1, 1.44]]; }
  return { low, cab, roofP, wr, ly, tly };
}
function buildModelS3(type) {
  const S = SPEC[type], L = S.L, W = S.W, hl = L / 2, st = CARSTYLE[type] || CARSTYLE.sedan; const B = carBody(type); const M = { body: null, glass: null, trim: [], lights: [], wheels: [], wr: B.wr, extra: [], style: st };
  M.body = extrudeSmooth(smoothProfile(B.low, 70), W, .14, 5);
  M.glass = extrudeSmooth(B.cab, W * .84, .06, 2);
  M.roof = extrudeSmooth(B.roofP, W * .8, .04, 2);
  const t = M.trim, add = (g, c) => t.push(vcol(g, c)); const ch = st.chrome > .5 ? CHR : DGR;
  const botY = B.low.reduce((m, p) => Math.min(m, p[1]), 9), beltY = Math.max(...B.cab.map(p => p[1]).slice(0, 1).concat(B.low.filter(p => Math.abs(p[0]) < hl * .4).map(p => p[1]))) - .03;
  // 아래 범퍼 · 사이드 스커트 (검정)
  add(at(new T.BoxGeometry(W + .02, .16, L * .62), 0, botY + .08, 0), BLK);
  add(at(new T.BoxGeometry(W * .96, .2, .22), 0, botY + .12, hl - .08), BLK); add(at(new T.BoxGeometry(W * .96, .2, .22), 0, botY + .12, -hl + .08), BLK);
  // 휠 아치
  const wz = S.wb / 2; for (const z of [-wz, wz]) for (const s of [-1, 1]) { const a = new T.CylinderGeometry(B.wr + .1, B.wr + .1, .2, 18, 1, true, 0, Math.PI).rotateZ(Math.PI / 2); add(at(a, s * (W / 2 - .03), B.wr, z, 0, s > 0 ? 0 : Math.PI, 0), BLK); }
  // 벨트라인 크롬 · 창틀
  for (const s of [-1, 1]) { add(at(new T.BoxGeometry(.03, .035, L * .5), s * (W * .42 + .01), beltY + .02, (B.cab[0][0] + B.cab[B.cab.length - 1][0]) / 2), ch); add(at(new T.BoxGeometry(.025, .025, L * .62), s * (W / 2 + .005), (botY + beltY) / 2 + .1, 0), st.chrome > .5 ? CHR : '#3a3d42'); }
  // 문 손잡이 · 문틈 · 사이드미러
  const doors = type === 'super' || type === 'sports' ? [.1] : type === 'van' ? [hl - 1.6] : [hl * .25, -hl * .2]; for (const s of [-1, 1]) { for (const z of doors) { add(at(new T.BoxGeometry(.03, .04, .16), s * (W / 2 + .02), beltY - .12, z), CHR); add(at(new T.BoxGeometry(.012, beltY - botY - .1, .012), s * (W / 2 + .005), (beltY + botY) / 2, z + .55), '#1a1b1e'); }
    add(at(new T.BoxGeometry(.18, .11, .2), s * (W / 2 + .08), beltY + .1, B.cab[0][0] - .35), st.blackRoof ? BLK : DGR); }
  // 그릴
  const gy = B.ly - .12, gz = hl + .005;
  if (st.grille === 'lux') { add(at(new T.BoxGeometry(W * .38, .34, .04), 0, gy, gz), CHR); for (let k = -5; k <= 5; k++) add(at(new T.BoxGeometry(.018, .3, .05), k * W * .033, gy, gz + .01), '#30343a'); }
  else if (st.grille === 'big') { add(at(new T.BoxGeometry(W * .6, .32, .04), 0, gy + .02, gz), '#1b1d21'); for (let k = 0; k < 4; k++) add(at(new T.BoxGeometry(W * .6, .025, .05), 0, gy - .1 + k * .08, gz + .01), ch); }
  else if (st.grille === 'intake') { add(at(new T.BoxGeometry(W * .7, .14, .04), 0, B.ly - .3, gz - .05), '#080809'); for (const s of [-1, 1]) add(at(new T.BoxGeometry(W * .22, .2, .04), s * W * .32, B.ly - .2, gz - .08), '#080809'); }
  else if (st.grille === 'ev') { add(at(new T.BoxGeometry(W * .75, .03, .04), 0, B.ly + .02, gz), '#eaf6ff'); }
  else { add(at(new T.BoxGeometry(W * .5, .2, .04), 0, gy, gz), '#141518'); add(at(new T.BoxGeometry(W * .52, .03, .045), 0, gy + .11, gz), ch); }
  // 번호판
  add(at(new T.BoxGeometry(.52, .12, .03), 0, botY + .2, hl + .02), '#f2f2f2'); add(at(new T.BoxGeometry(.52, .12, .03), 0, B.tly - .22, -hl - .02), '#f2f2f2');
  // 스포일러 · 배기구 · 루프랙 · 안테나
  if (st.spoiler) { const sy = st.spoiler === 2 ? 1.12 : .98; add(at(new T.BoxGeometry(W * .9, .05, .32), 0, sy, -hl + .25), BLK); for (const s of [-1, 1]) add(at(new T.BoxGeometry(.05, sy - .8, .14), s * W * .3, (sy + .8) / 2, -hl + .3), BLK); }
  for (let k = 0; k < (st.exhaust || 1); k++) { const x = (st.exhaust === 4 ? [-.4, -.25, .25, .4][k] : st.exhaust === 2 ? [-.45, .45][k] : .5) * W * .8; add(at(new T.CylinderGeometry(.05, .05, .14, 10).rotateX(Math.PI / 2), x, botY + .1, -hl - .03), st.exhaust ? CHR : '#555'); }
  if (st.rails) for (const s of [-1, 1]) add(at(new T.BoxGeometry(.05, .05, (B.roofP[0][0] - B.roofP[1][0]) * .9), s * W * .36, B.roofP[2][1] + .05, (B.roofP[0][0] + B.roofP[1][0]) / 2), '#1a1b1e');
  add(at(new T.BoxGeometry(.05, .06, .16), 0, B.roofP[2][1] + .03, B.roofP[1][0] + .15), BLK);
  if (st.blackRoof) add(at(new T.BoxGeometry(W * .79, .015, Math.abs(B.roofP[0][0] - B.roofP[1][0]) - .05), 0, B.roofP[2][1] + .002, (B.roofP[0][0] + B.roofP[1][0]) / 2), '#0a0a0c');
  if (type === 'van') { add(at(new T.BoxGeometry(W + .04, 1.95, L - 2.05), 0, 1.0 + .95, -1.0), '#f2f2f2'); add(at(new T.BoxGeometry(W + .05, .32, L - 2.1), 0, 1.6, -1.0), '#1f5ea8'); }
  if (type === 'pickup') { for (const s of [-1, 1]) add(at(new T.BoxGeometry(.06, .3, L - 3.4), s * (W / 2 - .04), 1.25, -hl + (L - 3.4) / 2 + .05), DGR); add(at(new T.BoxGeometry(W, .3, .06), 0, 1.25, -hl + .05), DGR); }
  // 라이트
  const ly = B.ly, tly = B.tly;
  for (const s of [-1, 1]) {
    M.lights.push(vcol(at(new T.BoxGeometry(.4, .07, .05), s * (W / 2 - .3), ly + .05, hl - .01), '#ffffff'), vcol(at(new T.BoxGeometry(.14, .1, .06), s * (W / 2 - .2), ly - .03, hl - .02), '#fff7de'));
    if (st.tail !== 'bar') M.lights.push(vcol(at(new T.BoxGeometry(.42, .12, .05), s * (W / 2 - .3), tly, -hl + .01), '#ff1f1f'));
  }
  if (st.tail === 'bar') M.lights.push(vcol(at(new T.BoxGeometry(W * .9, .05, .05), 0, tly, -hl + .02), '#ff2a2a'));
  if (type === 'ev' || type === 'lux') M.lights.push(vcol(at(new T.BoxGeometry(W * .7, .02, .05), 0, ly + .12, hl + .01), '#eaf6ff'));
  for (const z of [-wz, wz]) for (const s of [-1, 1]) M.wheels.push([s * (W / 2 - .1), B.wr, z]);
  return M;
}
const _buildModelS3 = buildModel; buildModel = function (type) {
  if (MODEL[type]) return MODEL[type]; if (type === 'bus' || type === 'armored' || (SPEC[type] && SPEC[type].bike) || type === 'truck') return _buildModelS3(type);
  try { return MODEL[type] = buildModelS3(type); } catch (e) { console.error('차 모델', type, e); return _buildModelS3(type === 'super' || type === 'lux' || type === 'ev' || type === 'hatch' ? 'sedan' : type === 'van' || type === 'pickup' ? 'truck' : type); }
};
/* 휠 디자인 */
let _rimStyle = null;
const _wheelGeoS3 = wheelGeo; wheelGeo = function (r) {
  const st = _rimStyle; if (!st) return _wheelGeoS3(r); const key = r + st.rim + st.rimCol; if (WHEEL_GEO[key]) return WHEEL_GEO[key];
  const parts = [vcol(new T.CylinderGeometry(r, r, .27, 24).rotateZ(Math.PI / 2), '#121212'), vcol(new T.TorusGeometry(r * .93, r * .07, 6, 24).rotateY(Math.PI / 2), '#1c1c1c')];
  const rc = st.rimCol; parts.push(vcol(new T.CylinderGeometry(r * .7, r * .7, .25, 24).rotateZ(Math.PI / 2), '#2a2a2a'), vcol(new T.TorusGeometry(r * .66, r * .045, 6, 24).rotateY(Math.PI / 2), rc));
  const spokes = st.rim === 'spoke5' ? 5 : st.rim === 'multi' ? 10 : st.rim === 'turbine' ? 14 : 0;
  for (const side of [-1, 1]) { const xo = side * .125;
    if (spokes) for (let k = 0; k < spokes; k++) { const a = k / spokes * Math.PI * 2; const g = new T.BoxGeometry(.03, r * .62, st.rim === 'multi' ? .035 : st.rim === 'turbine' ? .05 : .08); g.translate(0, r * .32, 0); g.rotateX(a); if (st.rim === 'turbine') g.rotateY(.25 * side); g.translate(xo, 0, 0); parts.push(vcol(g, rc)); }
    else { parts.push(vcol(new T.CylinderGeometry(r * .62, r * .62, .02, 16).rotateZ(Math.PI / 2).translate(xo, 0, 0), rc)); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; parts.push(vcol(new T.CylinderGeometry(.03, .03, .03, 6).rotateZ(Math.PI / 2).translate(xo * 1.05, Math.sin(a) * r * .4, Math.cos(a) * r * .4), '#555')); } }
    parts.push(vcol(new T.CylinderGeometry(r * .16, r * .16, .02, 12).rotateZ(Math.PI / 2).translate(xo * 1.08, 0, 0), st.chrome > .5 ? CHR : '#333')); }
  return WHEEL_GEO[key] = merge(parts);
};
const _paintMatS3 = paintMat; paintMat = function (c) { if (_paint[c]) return _paint[c]; const m = _paintMatS3(c); m.metalness = .55; m.roughness = .26; m.clearcoat = 1; m.clearcoatRoughness = .06; m.envMapIntensity = 1.35; return m; };
const _makeCarS3 = makeCar; makeCar = function (type, color) {
  if (!SPEC[type]) type = 'sedan'; const st = CARSTYLE[type]; _rimStyle = st && !SPEC[type].bike && type !== 'bus' && type !== 'armored' && type !== 'truck' ? st : null;
  if (!color && PALETTE[type]) color = pick(PALETTE[type]); if (!color && (type === 'sedan' || type === 'suv')) color = pick(PAINT.concat(['#16233d', '#3b0d14', '#4a4f57', '#e9e7e2']));
  const c = _makeCarS3(type, color); _rimStyle = null; c.color = color; if (type === 'van') { const dm = new T.MeshBasicMaterial({ map: decalTex('블립 택배', null, '#1f5ea8', 512, 128), transparent: true }); for (const s of [-1, 1]) { const d = new T.Mesh(new T.PlaneGeometry(2.6, .65), dm); d.position.set(s * (SPEC.van.W / 2 + .04), 2.3, -1); d.rotation.y = s * Math.PI / 2; c.bodyG.add(d); } } return c;
};
/* 도로 위 차 구성 */
const S3_TRAFFIC = ['sedan', 'sedan', 'sedan', 'hatch', 'hatch', 'suv', 'suv', 'ev', 'ev', 'lux', 'pickup', 'truck', 'van', 'sports', 'taxi', 'bike', 'super'];
spawnTraffic = function () {
  const pos = laneNear(PL.x, PL.z, 60, 150); if (!pos) return; const r = Math.random();
  const type = r < .04 ? 'police' : r < .14 ? 'taxi' : r < .19 ? 'bus' : r < .24 ? 'scooter' : r < .27 ? 'bike' : pick(S3_TRAFFIC.filter(t => t !== 'bike' && t !== 'taxi'));
  const c = makeCar(type, type === 'bus' ? pick(['blue', 'green']) : null); laneSpawn(c, pos.x, pos.z, pos.f, pos.li); c.drvLook = type === 'police' ? LOOKS.police() : randomLook(Math.random() < .3); c.drvP = true; scene.add(c.g); CARS.push(c);
  if (c.S.bike) addRider(c, Object.assign(c.drvLook, { helmet: pick(['#f2f2f2', '#111', '#d61f26', '#1e64d8', '#ffcc33']) }));
  placeCar(c);
};
/* ---------- 대리점 · 내 차 ---------- */
const DEALER = [['hatch', 2800000, '작고 싸요 · 기름 적게'], ['scooter', 900000, '배달 · 골목길'], ['bike', 2200000, '빠르고 날렵해요'], ['sedan', 6500000, '무난한 국민차'], ['pickup', 8800000, '강원도 산길 OK'], ['suv', 9800000, '넓고 튼튼해요'], ['ev', 13500000, '조용하고 빨라요'], ['sports', 26000000, '서킷의 맛'], ['lux', 34000000, '회장님 차'], ['super', 120000000, '꿈의 하이퍼카']];
function carPrice(type) { const d = DEALER.find(q => q[0] === type); return d ? d[1] : { taxi: 5000000, police: 9000000, truck: 7000000, van: 6000000, bus: 30000000, armored: 40000000 }[type] || 5000000; }
function dealerMenu() {
  G.paused = true; document.exitPointerLock && document.exitPointerLock(); SV.myCars = SV.myCars || [];
  menu(`<h2>🚘 블립 모터스</h2><p>돈 ${won(SV.money)} · 내 차 ${SV.myCars.length}대 (📱 <b>내 차</b> 앱으로 불러요)</p><div class="shopL">${DEALER.map((d, i) => { const S_ = SPEC[d[0]]; return `<button class="btn" data-buy="${i}"><span>${S_.name} <small style="color:#666">· ${d[2]} · 최고 ${Math.round(S_.max * 3.6)}km/h</small></span><b>${won(d[1])}</b></button>`; }).join('')}</div><p style="font-size:13px">🎨 색은 정비소에서 바꿀 수 있어요. 할부는 없어요. 열심히 일해서 사요!</p><button class="btn d" id="dX">나가기</button>`);
  $$('[data-buy]').forEach(b => b.onclick = () => { const d = DEALER[+b.dataset.buy]; if (SV.money < d[1]) { b.querySelector('b').textContent = '돈이 부족해요'; SFX.fail(); return; } addMoney(-d[1]); const id = Date.now(); SV.myCars.push({ id, type: d[0], color: pick(PALETTE[d[0]] || PAINT) }); ledger(-d[1], '차 구입 ' + SPEC[d[0]].name); save(); closeMenu(); spawnMyCar(SV.myCars[SV.myCars.length - 1], true); SFX.pass(); big('새 차!', SPEC[d[0]].name, 'pass', 2500); xp(100, '차 구입'); });
  $('#dX').onclick = closeMenu;
}
function spawnMyCar(mc, here) {
  for (const c of CARS) if (c.mine === mc.id && c !== PL.car) removeCar(c);
  let x, z, yaw; if (here) { const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; x = PL.x + f[0] * 5; z = PL.z + f[1] * 5; yaw = PL.yaw + Math.PI / 2; } else { const p = inGW(PL.x, PL.z) ? (() => { const q = gwRoadNear(PL.x, PL.z, 8, 40); return q && { x: q.s.x + q.s.tz * 3, z: q.s.z - q.s.tx * 3 }; })() : laneNear(PL.x, PL.z, 8, 45); if (!p) { toast('근처에 세울 곳이 없어요. 큰길로 나가 봐요'); return null; } x = p.x; z = p.z; yaw = p.f ? Math.atan2(p.f[0], p.f[1]) : 0; }
  const c = makeCar(mc.type, mc.color); c.x = x; c.z = z; c.yaw = yaw; const p2 = { x, z }; collideCircle(p2, 1.4, 0); inBounds(p2, 1.4); c.x = p2.x; c.z = p2.z; c.parked = true; c.mine = mc.id; c.mission = true;
  if (mc.tune) { const t = tuneCar(c); t.eng = mc.tune.eng || 0; t.armor = mc.tune.armor || 0; for (let k = 0; k < t.eng; k++) { c.S.acc *= 1.18; c.S.max *= 1.1; } if (t.armor) { c.maxHp *= 2; c.hp = c.maxHp; } }
  placeCar(c); scene.add(c.g); CARS.push(c); G.deliv = c; return c;
}
/* 정비소에서 튜닝하면 내 차에 저장 · 훔친 차 명의 이전 */
const _garageMenuS3 = garageMenu; garageMenu = function (c) {
  _garageMenuS3(c); const box = $('#mbox'); if (!box) return; SV.myCars = SV.myCars || [];
  const mine = SV.myCars.find(m => m.id === c.mine); const fee = Math.round(carPrice(c.type) * .3);
  const b = document.createElement('button'); b.className = 'btn ' + (mine ? 'd' : 'y'); b.innerHTML = mine ? `✅ 내 차예요 (튜닝 · 색이 저장돼요)` : `<span>📄 명의 이전 (내 차로 등록)</span> <b>${won(fee)}</b>`; box.insertBefore(b, $('#gX'));
  if (!mine) b.onclick = () => { if (SV.money < fee) { toast('💸 돈이 부족해요'); SFX.fail(); return; } addMoney(-fee); ledger(-fee, '명의 이전'); const id = Date.now(); c.mine = id; c.mission = true; SV.myCars.push({ id, type: c.type, color: c.color || '#888' }); save(); SFX.cash(); garageMenu(c); };
};
S2TICK.push(() => { if (!SV.myCars) return; const c = PL.car; if (c && c.mine) { const m = SV.myCars.find(q => q.id === c.mine); if (m) { if (c.tuned) m.tune = { eng: c.tuned.eng, armor: c.tuned.armor }; if (c.paintCol) m.color = c.paintCol; } } });
/* 도색 색 기억 */
const _paintS3 = PAINTS2.slice(); document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pc]'); if (b && PL.car) PL.car.paintCol = PAINTS2[+b.dataset.pc][1]; }, true);
/* 대리점 위치: 전시 차 */
const DEALER_POS = { x: 0, z: 0 };
function buildDealer() {
  const s = BUILD.shops.filter(q => Math.abs(q.x) < LIM - 20 && Math.abs(q.z) < LIM - 20).sort((a, b) => Math.hypot(a.x - 160, a.z - 160) - Math.hypot(b.x - 160, b.z - 160))[0]; if (!s) return;
  const o = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[s.side] || [0, 1]; DEALER_POS.x = s.x + o[0] * 2.5; DEALER_POS.z = s.z + o[1] * 2.5; DEALER_POS.M = mkMarker(DEALER_POS.x, DEALER_POS.z, '#7ee08a', { r: 1.2 });
  signMesh('블립 모터스', '#111', s.x + o[0] * .3, 4.4, s.z + o[1] * .3, Math.atan2(o[0], o[1]), 7);
  const side = [o[1], -o[0]]; ['super', 'lux', 'ev'].forEach((t, i) => { const c = makeCar(t); const so = [-8.5, -4, 4.8][i]; c.x = DEALER_POS.x + side[0] * so + o[0] * .3; c.z = DEALER_POS.z + side[1] * so + o[1] * .3; c.yaw = Math.atan2(side[0], side[1]) + (i - 1) * .15; c.parked = true; c.display = true; c.mission = true; placeCar(c); scene.add(c.g); CARS.push(c); });
}
const _nearestCarS3 = nearestCar; nearestCar = function (x, z, r) { const c = _nearestCarS3(x, z, r); if (c && c.display) return null; return c; };
S2TICK.push(() => { if (!DEALER_POS.M && G.on) buildDealer(); if (!DEALER_POS.M || PL.car) return; DEALER_POS.M.g.visible = !MI; if (MI) return; if (inMarker(DEALER_POS.M, PL.x, PL.z)) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + '블립 모터스 (차 사기)'); PROMPT.act = '대리점'; if (IN.act) dealerMenu(); } });
