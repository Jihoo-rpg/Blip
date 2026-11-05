'use strict';
/* ===== STA 2: 강원도 (서울 동쪽으로 영동고속도로를 타고 가요) ===== */
const GW = { X0: LIM + RH, X1: 1950, Z0: -820, Z1: 260, C: 5, h: null, nx: 0, nz: 0, roads: [], towns: [], places: [], trees: [], built: false };
const LAKE = { x: 720, z: -385, r: 62 };
const SKI = { x0: 1175, x1: 1315, z0: 118, z1: 252 };
const PIER = { x0: 0, x1: 0, z0: -664, z1: -652 };
function coastX(z) { return 1728 + Math.sin(z / 95) * 16 + Math.sin(z / 37) * 5; }
/* ---------- 지형 높이 ---------- */
function _hh(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return lerp(lerp(_hh(i, j), _hh(i + 1, j), u), lerp(_hh(i, j + 1), _hh(i + 1, j + 1), u), v); }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rawH(x, z) {
  const f = vnoise(x / 260 + 7, z / 260 + 3) * .55 + vnoise(x / 110, z / 110) * .3 + vnoise(x / 40, z / 40) * .15;
  let h = Math.pow(f, 1.6) * 105;
  h += 95 * Math.exp(-((x - 1440) ** 2 + (z + 650) ** 2) / (2 * 110 * 110)); // 설악산
  h += 60 * Math.exp(-((x - 1245) ** 2) / (2 * 90 * 90)) * sstep(70, 255, z); // 스키장 산
  h += 40 * sstep(-640, -820, z) + 25 * sstep(150, 260, z) * (1 - sstep(1100, 1350, x) * sstep(1350, 1100, x));
  h *= sstep(LIM + RH + 120, 640, x);
  const cx = coastX(z); h *= 1 - sstep(cx - 170, cx - 35, x) * .97; if (x > cx - 35) h = lerp(h, 1.3, sstep(cx - 35, cx - 6, x)); if (x > cx) h = 1.3 - (x - cx) * .3;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z); if (dl < LAKE.r + 45) h = lerp(-3.5, h, sstep(LAKE.r - 4, LAKE.r + 45, dl));
  return h;
}
function gwH(x, z) {
  if (x < GW.X0 + 165 && Math.abs(z) < 40) { const k = sstep(GW.X0 + 140, GW.X0 + 165, x); if (k <= 0) return 0; }
  if (x >= PIER.x0 && x <= PIER.x1 && z >= PIER.z0 && z <= PIER.z1) return 1.1;
  const fx = (x - GW.X0) / GW.C, fz = (z - GW.Z0) / GW.C; const i = clamp(Math.floor(fx), 0, GW.nx - 2), j = clamp(Math.floor(fz), 0, GW.nz - 2); const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1), H = GW.h, n = GW.nx;
  return lerp(lerp(H[j * n + i], H[j * n + i + 1], u), lerp(H[(j + 1) * n + i], H[(j + 1) * n + i + 1], u), v);
}
function gwBounds(p, r) {
  if (p.x < GW.X0 + 162) { p.z = clamp(p.z, -32 + r, 32 - r); p.x = Math.max(p.x, LIM + RH - 4); return; }
  if (p.x >= PIER.x0 - 1 && p.x <= PIER.x1 && p.z >= PIER.z0 - .3 && p.z <= PIER.z1 + .3) { p.z = clamp(p.z, PIER.z0 + r, PIER.z1 - r); return; }
  p.z = clamp(p.z, GW.Z0 + 25 + r, GW.Z1 - 22 - r); p.x = Math.min(p.x, coastX(p.z) + 6 - r);
  const dl = Math.hypot(p.x - LAKE.x, p.z - LAKE.z); if (dl < LAKE.r - 2 + r) { const k = (LAKE.r - 2 + r) / (dl || 1); p.x = LAKE.x + (p.x - LAKE.x) * k; p.z = LAKE.z + (p.z - LAKE.z) * k; }
}
const inGW = (x, z) => x > LIM + RH + 2 && x < 1950;
/* ---------- 도로 · 마을 ---------- */
const GW_ROADS = [
  { id: 'hwy', n: '영동고속도로', w: 13, pts: [[LIM + RH - 2, 0], [430, 0], [560, 4], [660, -40], [760, -150], [845, -232], [960, -212], [1080, -120], [1190, -40], [1300, -64], [1420, -170], [1540, -268], [1648, -300]] },
  { id: 'coast', n: '동해대로', w: 11, pts: [[1688, -775], [1690, -640], [1680, -480], [1668, -380], [1648, -300], [1658, -180], [1672, -60], [1676, 60], [1668, 205]] },
  { id: 'ski', n: '스키장 길', w: 10, pts: [[1190, -40], [1212, 15], [1232, 62], [1240, 108]] },
  { id: 'farm', n: '감자밭 길', w: 9, pts: [[960, -212], [972, -130], [984, -40], [992, 46]] },
  { id: 'lake', n: '의암호 둘레길', w: 9, pts: [[845, -232], [808, -300], [800, -400], [770, -470], [700, -475], [640, -430], [632, -340], [670, -285], [760, -150]] },
  { id: 'seorak', n: '설악산 길', w: 9, pts: [[1540, -268], [1525, -400], [1490, -520], [1450, -600], [1425, -660]] },
  { id: 'port', n: '항구 길', w: 9, pts: [[1690, -640], [1700, -658], [1712, -658]] }];
const GW_TOWNS = [
  { id: 'rest', n: '덕평 휴게소', x: 562, z: 30, r: 26, b: 2 },
  { id: 'chun', n: '춘천', x: 880, z: -275, r: 52, b: 14 },
  { id: 'pc', n: '평창', x: 1262, z: -10, r: 40, b: 9 },
  { id: 'farm', n: '감자 농장', x: 1000, z: 70, r: 36, b: 2 },
  { id: 'gn', n: '강릉', x: 1585, z: -300, r: 58, b: 16 },
  { id: 'beach', n: '경포 해변', x: 1712, z: -150, r: 30, b: 0 },
  { id: 'sc', n: '속초항', x: 1650, z: -650, r: 36, b: 8 },
  { id: 'lodge', n: '평창 스키 리조트', x: 1245, z: 112, r: 24, b: 2 },
  { id: 'peak', n: '설악산 대청봉', x: 1422, z: -668, r: 14, b: 0 }];
function sampleRoad(R_) { const pts = R_.pts.map(p => new T.Vector3(p[0], 0, p[1])); const cv = new T.CatmullRomCurve3(pts, false, 'catmullrom', .3); const L = cv.getLength(); const n = Math.max(4, Math.round(L / 2.5)); const sp = cv.getSpacedPoints(n);
  const S = sp.map(v => ({ x: v.x, z: v.z, h: 0, tx: 0, tz: 0 })); for (let i = 0; i < S.length; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; S[i].tx = dx / l; S[i].tz = dz / l; }
  const raw = S.map(s => Math.max(.4, rawH(s.x, s.z))); const W = 22; for (let i = 0; i < S.length; i++) { let a = 0, c = 0; for (let k = -W; k <= W; k++) { const q = raw[clamp(i + k, 0, S.length - 1)]; a += q; c++; } S[i].h = a / c; }
  for (let it = 0; it < 2; it++) { for (let i = 1; i < S.length; i++) S[i].h = clamp(S[i].h, S[i - 1].h - .22, S[i - 1].h + .22); for (let i = S.length - 2; i >= 0; i--) S[i].h = clamp(S[i].h, S[i + 1].h - .22, S[i + 1].h + .22); }
  for (const s of S) { if (s.x < GW.X0 + 180) s.h = lerp(0, s.h, sstep(GW.X0 + 160, GW.X0 + 260, s.x)); s.h = Math.max(s.h, .5 * sstep(GW.X0 + 160, GW.X0 + 200, s.x)); }
  R_.S = S; R_.len = L; return S;
}
function buildHeights() {
  const C = GW.C, nx = Math.round((GW.X1 - GW.X0) / C) + 1, nz = Math.round((GW.Z1 - GW.Z0) / C) + 1; GW.nx = nx; GW.nz = nz;
  const H = new Float32Array(nx * nz), RD = new Float32Array(nx * nz).fill(1e9), BD = new Float32Array(nx * nz).fill(1e9), BH = new Float32Array(nx * nz), BW = new Float32Array(nx * nz), KIND = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = rawH(GW.X0 + i * C, GW.Z0 + j * C);
  const stamp = (x, z, h, hw, R0, kind) => { const i0 = Math.max(0, Math.floor((x - R0 - GW.X0) / C)), i1 = Math.min(nx - 1, Math.ceil((x + R0 - GW.X0) / C)), j0 = Math.max(0, Math.floor((z - R0 - GW.Z0) / C)), j1 = Math.min(nz - 1, Math.ceil((z + R0 - GW.Z0) / C));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i, d = Math.hypot(GW.X0 + i * C - x, GW.Z0 + j * C - z) - hw; if (kind === 1 && d < RD[k]) RD[k] = d; if (d < BD[k]) { BD[k] = d; BH[k] = h; BW[k] = hw; KIND[k] = kind; } } };
  for (const R_ of GW_ROADS) { const S = sampleRoad(R_); GW.roads.push(R_); for (const s of S) stamp(s.x, s.z, s.h, R_.w / 2, R_.w / 2 + 20, 1); }
  for (const t of GW_TOWNS) { let h = 0; if (t.id === 'beach') h = 1.4; else { let a = 0, c = 0; for (let k = 0; k < 12; k++) { const q = rawH(t.x + Math.cos(k) * t.r * .6, t.z + Math.sin(k) * t.r * .6); a += q; c++; } h = Math.max(.6, a / c * .55); }
    const near = GW.roads.flatMap(R_ => R_.S).reduce((b, s) => { const d = Math.hypot(s.x - t.x, s.z - t.z); return d < b.d ? { d, h: s.h } : b; }, { d: 1e9, h }); if (near.d < t.r + 30) h = near.h; if (t.id === 'peak') h = rawH(t.x, t.z); t.h = h; stamp(t.x, t.z, h, t.r, t.r + 30, t.id === 'beach' ? 3 : 2); }
  for (let k = 0; k < H.length; k++) { if (BD[k] > 1e8) continue; const d = BD[k]; const kk = KIND[k] === 1 ? sstep(1, 20, d) : sstep(0, 30, d); H[k] = lerp(BH[k] - .05, H[k], kk); }
  GW.h = H; GW.bd = BD; GW.rd = RD; GW.kind = KIND;
  const pi = GW_ROADS.find(r => r.id === 'port').S; const pe = pi[pi.length - 1]; PIER.x0 = pe.x - 2; PIER.x1 = pe.x + 46; PIER.z0 = pe.z - 6; PIER.z1 = pe.z + 6;
}
function gwRoadDist(x, z) { const i = clamp(Math.round((x - GW.X0) / GW.C), 0, GW.nx - 1), j = clamp(Math.round((z - GW.Z0) / GW.C), 0, GW.nz - 1); return GW.rd[j * GW.nx + i]; }
/* ---------- 지형 메시 ---------- */
function terrainColor(x, z, h, sl, k, out) {
  let c; const cx = coastX(z);
  if (x > SKI.x0 && x < SKI.x1 && z > SKI.z0 - 10 && h > 8) c = [.88, .9, .94];
  else if (h > 112) c = [.86, .88, .9]; else if (sl > .8) c = [.4, .39, .37];
  else if (x > cx - 40 && h < 4) c = [.72, .64, .46];
  else if (k === 3) c = [.72, .64, .46];
  else if (Math.hypot(x - 1000, z - 70) < 34) c = (Math.floor((z - 40) / 4) % 2) ? [.42, .3, .2] : [.36, .44, .2];
  else { const n = vnoise(x / 30, z / 30); const autumn = vnoise(x / 70 + 50, z / 70) > .62 && h > 10; c = autumn ? [.62 + n * .15, .32 + n * .1, .12] : h > 40 ? [.16 + n * .05, .27 + n * .07, .14] : [.26 + n * .07, .38 + n * .07, .18]; }
  if (k === 2) c = [.36, .35, .33];
  out[0] = Math.pow(c[0], 2.2); out[1] = Math.pow(c[1], 2.2); out[2] = Math.pow(c[2], 2.2);
}
function buildTerrain() {
  const nx = GW.nx, nz = GW.nz, C = GW.C, H = GW.h; const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), idx = []; const cc = [0, 0, 0];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = GW.X0 + i * C, z = GW.Z0 + j * C; let h = H[k]; if (x < GW.X0 + 165 && Math.abs(z) < 40) h = Math.min(h, gwH(x, z)); pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const sl = Math.abs(H[Math.min(k + 1, H.length - 1)] - H[k]) / C + Math.abs(H[Math.min(k + nx, H.length - 1)] - H[k]) / C; terrainColor(x, z, h, sl, GW.bd[k] < 3 ? GW.kind[k] : 0, cc); col.set(cc, k * 3); }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); m.receiveShadow = true; scene.add(m); GW.terrain = m;
}
const roadTex = () => ctex(128, 256, (g, W, H) => { g.fillStyle = '#3d3f43'; g.fillRect(0, 0, W, H); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},.05)`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } g.fillStyle = '#e8e8e8'; g.fillRect(3, 0, 3, H); g.fillRect(W - 6, 0, 3, H); g.fillStyle = '#f2c230'; g.fillRect(W / 2 - 4, 0, 3, H); g.fillRect(W / 2 + 1, 0, 3, H); }, [1, 1]);
function buildRoadMeshes() {
  const mat = new T.MeshStandardMaterial({ map: roadTex(), roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const R_ of GW_ROADS) { const S = R_.S, hw = R_.w / 2, pos = [], uv = [], idx = []; let acc = 0;
    S.forEach((s, i) => { if (i) acc += Math.hypot(s.x - S[i - 1].x, s.z - S[i - 1].z); const nx = -s.tz, nz = s.tx; pos.push(s.x + nx * hw, s.h + .02, s.z + nz * hw, s.x - nx * hw, s.h + .02, s.z - nz * hw); uv.push(0, acc / 14, 1, acc / 14); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new T.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
    if (R_.id === 'hwy' || R_.id === 'coast') for (let i = 12; i < S.length; i += 16) { const s = S[i]; if (s.x < GW.X0 + 170) continue; for (const sd of [-1, 1]) { const x = s.x - s.tz * (hw + .6) * sd, z = s.z + s.tx * (hw + .6) * sd; addGeo('gwr' + Math.floor(s.x / 250), 'railing', new T.BoxGeometry(.12, .7, 2.6), new T.Matrix4().compose(new T.Vector3(x, s.h + .45, z), new T.Quaternion().setFromEuler(new T.Euler(0, Math.atan2(s.tx, s.tz), 0)), new T.Vector3(1, 1, 1))); } } }
}
/* ---------- 마을 건물 · 간판 ---------- */
const GW_SIGNS = { rest: ['덕평 휴게소', '#1f5ea8'], chun: ['춘천 닭갈비', '#c62828'], pc: ['평창 한우마을', '#6d4c41'], gn: ['강릉 커피거리', '#4e342e'], sc: ['속초 수산시장', '#0277bd'], lodge: ['평창 스키 리조트', '#263238'], farm: ['감자 농장', '#558b2f'] };
function signMesh(txt, bg, x, y, z, yaw, w) { const m = new T.Mesh(new T.PlaneGeometry(w || 7, 1.4), new T.MeshStandardMaterial({ map: decalTex(txt, bg, '#ffffff', 512, 100), emissive: '#ffffff', emissiveIntensity: .25, emissiveMap: decalTex(txt, bg, '#ffffff', 512, 100), side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.y = yaw; scene.add(m); return m; }
function buildTowns() {
  const r = mulberry(909);
  for (const t of GW_TOWNS) {
    const ck = 'gwt' + t.id; let placed = 0;
    for (let tries = 0; tries < 200 && placed < t.b; tries++) {
      const a = r() * 6.283, d = t.r * (.35 + r() * .55), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d; const w = 8 + r() * 8, dd = 8 + r() * 7;
      let ok = gwRoadDist(x, z) > 9 && gwRoadDist(x + w / 2, z + dd / 2) > 8 && gwRoadDist(x - w / 2, z - dd / 2) > 8 && Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE.r + 10 && x < coastX(z) - 30;
      for (const b of GW.blds || []) if (Math.abs(b[0] - x) < (b[2] + w) / 2 + 3 && Math.abs(b[1] - z) < (b[3] + dd) / 2 + 3) ok = false; if (!ok) continue;
      const y0 = gwH(x, z) - .3, hgt = (t.id === 'gn' || t.id === 'chun') && r() < .4 ? 14 + r() * 18 : 5 + r() * 6; const k = hgt > 13 ? rpick(['apt', 'apt2', 'shopB']) : rpick(['villa', 'shopA', 'shopC', 'villa']);
      walls(ck, k, x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, y0, y0 + hgt, MATS[k].tw, MATS[k].th); roof(ck, 'roof', x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, y0 + hgt); addBox(x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, y0 + hgt + 1);
      (GW.blds = GW.blds || []).push([x, z, w, dd, y0 + hgt, t.id]); placed++;
      if (placed === 1 && GW_SIGNS[t.id]) { const yaw = Math.atan2(t.x - x, t.z - z); const fx = Math.sin(yaw), fz = Math.cos(yaw); const ex = x + fx * (Math.abs(fx) * w / 2 + Math.abs(fz) * dd / 2 + .15), ez = z + fz * (Math.abs(fx) * w / 2 + Math.abs(fz) * dd / 2 + .15); signMesh(GW_SIGNS[t.id][0], GW_SIGNS[t.id][1], ex, y0 + Math.min(hgt - 1, 4.2), ez, yaw, Math.min(7, w - 1)); t.door = [x + fx * (Math.abs(fx) * w / 2 + Math.abs(fz) * dd / 2 + 1.6), z + fz * (Math.abs(fx) * w / 2 + Math.abs(fz) * dd / 2 + 1.6)]; }
    }
    if (!t.door) t.door = [t.x, t.z];
  }
}
/* ---------- 나무 · 바다 · 호수 · 스키장 · 부두 ---------- */
function buildNature() {
  const r = mulberry(5150), N = QUALITY.low ? 1500 : 2800; const pts = [];
  for (let t = 0; t < N * 4 && pts.length < N; t++) { const x = GW.X0 + 170 + r() * (GW.X1 - GW.X0 - 220), z = GW.Z0 + 25 + r() * (GW.Z1 - GW.Z0 - 45); if (x > coastX(z) - 45) continue; if (gwRoadDist(x, z) < 12) continue; const h = gwH(x, z); if (h < 2 || h > 122) continue; if (x > SKI.x0 - 10 && x < SKI.x1 + 10 && z > SKI.z0 - 20) continue; if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6) continue; if (GW_TOWNS.some(tw => Math.hypot(x - tw.x, z - tw.z) < tw.r + 4)) continue; pts.push([x, z, h, r()]); }
  const fol = new T.ConeGeometry(2.1, 6.5, 7), trunk = new T.CylinderGeometry(.22, .3, 2.2, 5), round = new T.IcosahedronGeometry(2.4, 0);
  const pine = pts.filter(p => p[3] < .72), maple = pts.filter(p => p[3] >= .72);
  const im1 = new T.InstancedMesh(fol, new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), pine.length), im2 = new T.InstancedMesh(trunk, MATS.bark, pts.length), im3 = new T.InstancedMesh(round, new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), maple.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), cl = new T.Color(); let a = 0, b = 0;
  pts.forEach((p, i) => { const s = .8 + (p[3] * 13 % 1) * .7; m4.compose(new T.Vector3(p[0], p[2] + 1.1 * s, p[1]), q, sc.set(s, s, s)); im2.setMatrixAt(i, m4); addCircle(p[0], p[1], .45 * s, 6);
    if (p[3] < .72) { m4.compose(new T.Vector3(p[0], p[2] + 4.9 * s, p[1]), q, sc.set(s, s, s)); im1.setMatrixAt(a, m4); im1.setColorAt(a++, cl.setHSL(.3 + (p[3] * 7 % 1) * .05, .45, .2 + (p[3] * 3 % 1) * .08)); }
    else { m4.compose(new T.Vector3(p[0], p[2] + 3.6 * s, p[1]), q, sc.set(s, s * 1.1, s)); im3.setMatrixAt(b, m4); im3.setColorAt(b++, cl.setHSL(.02 + (p[3] * 11 % 1) * .09, .75, .42)); } });
  for (const im of [im1, im2, im3]) { im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im); }
  // 바다 (동해)
  const sea = new T.Mesh(new T.PlaneGeometry(320, GW.Z1 - GW.Z0 + 200), WATER.material.clone()); sea.material.color = lin('#1f5c86'); sea.rotation.x = -Math.PI / 2; sea.position.set(1880, -.7, (GW.Z0 + GW.Z1) / 2); scene.add(sea); GW.sea = sea;
  const lake = new T.Mesh(new T.CircleGeometry(LAKE.r + 8, 48), WATER.material); lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE.x, -.6, LAKE.z); scene.add(lake);
  // 부두
  const pier = new T.Mesh(new T.BoxGeometry(PIER.x1 - PIER.x0, .6, PIER.z1 - PIER.z0), MATS.wood); pier.position.set((PIER.x0 + PIER.x1) / 2, .8, (PIER.z0 + PIER.z1) / 2); pier.receiveShadow = pier.castShadow = true; scene.add(pier);
  for (let x = PIER.x0 + 3; x < PIER.x1; x += 6) for (const s of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.25, .25, 4, 6), MATS.bark); p.position.set(x, -1, (PIER.z0 + PIER.z1) / 2 + s * 5.5); scene.add(p); }
  for (let k = 0; k < 4; k++) { const boat = new T.Group(); const hull = new T.Mesh(new T.BoxGeometry(3, 1.4, 9), new T.MeshStandardMaterial({ color: lin(['#e8e8e8', '#1565c0', '#c62828', '#2e7d32'][k]), roughness: .5 })); hull.position.y = .2; boat.add(hull); const cab = new T.Mesh(new T.BoxGeometry(2.2, 1.6, 2.6), MATS.white); cab.position.set(0, 1.5, -1.5); boat.add(cab); boat.position.set(PIER.x0 + 10 + k * 10, -.3, PIER.z0 - 6 - (k % 2) * 2); scene.add(boat); addBox(boat.position.x - 1.5, boat.position.z - 4.5, boat.position.x + 1.5, boat.position.z + 4.5, 3); (GW.boats = GW.boats || []).push(boat); }
  // 스키 리프트
  const tw = MATS.darkMetal; const lx = SKI.x0 + 18; let prev = null; for (let z = SKI.z0 + 6; z <= SKI.z1 - 4; z += 26) { const y = gwH(lx, z); const pole = new T.Mesh(new T.CylinderGeometry(.25, .35, 9, 6), tw); pole.position.set(lx, y + 4.5, z); scene.add(pole); const top = new T.Vector3(lx, y + 9, z); if (prev) { const g = new T.BufferGeometry().setFromPoints([prev, top]); scene.add(new T.Line(g, new T.LineBasicMaterial({ color: '#222' }))); } prev = top; }
  // 표지판
  signMesh('강원도 ▶ 영동고속도로', '#2e7d32', GW.X0 + 40, 5.5, 18, -Math.PI / 2, 8); signMesh('◀ 서울', '#1f5ea8', GW.X0 + 60, 5.5, -18, Math.PI / 2, 6);
  for (const s of [[GW.X0 + 40, 15], [GW.X0 + 60, -15]]) { const p = new T.Mesh(new T.CylinderGeometry(.15, .15, 5, 6), MATS.darkMetal); p.position.set(s[0], 2.5, s[1] + (s[1] > 0 ? 3 : -3)); scene.add(p); }
}
function genGangwon() { buildHeights(); buildTerrain(); buildRoadMeshes(); buildTowns(); buildNature(); GW.built = true; }
const _genCityS3 = genCity; genCity = function () { initMats(); initTL(); for (let i = -NR; i < NR; i++)for (let j = -NR; j < NR; j++) genBlock(i, j); genRoads(); genRiver(); genBackdrop(); try { genGangwon(); } catch (e) { console.error('강원도', e); } flushBuckets(); };
/* ---------- 지명 ---------- */
const _areaS3 = areaName; areaName = function (x, z) { if (!inGW(x, z) || !GW.built) return _areaS3(x, z); let best = '강원도', bd = 1e9; for (const t of GW_TOWNS) { const d = Math.hypot(x - t.x, z - t.z) - t.r; if (d < bd && d < 90) { bd = d; best = t.n; } } return best === '강원도' && x < 520 ? '서울-강원 경계' : best; };
const _roadS3 = roadName; roadName = function (x, z) { if (!inGW(x, z) || !GW.built) return _roadS3(x, z); let best = '강원도 산길', bd = 14; for (const R_ of GW.roads) for (let i = 0; i < R_.S.length; i += 3) { const s = R_.S[i]; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = R_.n; } } return best; };
/* ---------- 강원도 길 찾기 (차 · 경찰 · 사람) ---------- */
function gwNearestSample(x, z) { let best = null, bd = 1e9; for (const R_ of GW.roads) for (let i = 0; i < R_.S.length; i += 2) { const s = R_.S[i], d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = { R_, i }; } } return best && Object.assign(best, { d: Math.sqrt(bd) }); }
function gwRoadNear(x, z, r0, r1) { for (let t = 0; t < 30; t++) { const R_ = pick(GW.roads.filter(r => r.id !== 'port')), i = randi(4, R_.S.length - 5), s = R_.S[i]; const d = Math.hypot(s.x - x, s.z - z); if (d > r0 && d < r1 && s.x > GW.X0 + 30) return { R_, i, s }; } return null; }
function gwCarStep(c, dt) {
  const A = c.gwa, R_ = A.R_, S = R_.S; let i = A.i; const look = i + A.dir * 7; if (look < 0 || look >= S.length) { A.dir *= -1; A.i = clamp(i, 0, S.length - 1); return; }
  const s = S[look], off = A.dir > 0 ? 2.7 : -2.7, tx = s.x - s.tz * off, tz = s.z + s.tx * off; const want = Math.atan2(tx - c.x, tz - c.z), a = angDiff(c.yaw, want);
  // 앞차
  let block = false; const f = carFwd(c); for (const o of CARS) { if (o === c || o.dead) continue; const dx = o.x - c.x, dz = o.z - c.z; if (Math.abs(dx) > 20 || Math.abs(dz) > 20) continue; const lz = dx * f[0] + dz * f[1], lx = Math.abs(dx * f[1] - dz * f[0]); if (lz > 0 && lz < 6 + c.v * .9 && lx < 2.2) { block = true; break; } }
  if (!PL.car && Math.hypot(PL.x - c.x, PL.z - c.z) < 7) { const dx = PL.x - c.x, dz = PL.z - c.z; if (dx * f[0] + dz * f[1] > 0) block = true; }
  const vt = A.vt * (1 - clamp(Math.abs(a) * 1.4, 0, .6)); const inp = block ? { brk: 1, steer: clamp(a * 2, -1, 1) } : { thr: c.v < vt ? .8 : 0, brk: c.v > vt + 3 ? .4 : 0, steer: clamp(a * 2, -1, 1) };
  if (A.stun > 0) { A.stun -= dt; inp.thr = 0; inp.brk = .5; }
  const hit = drive(c, inp, dt); if (hit > 5) { carHurt(c, hit, false); A.stun = 1.5; } placeCar(c);
  while (A.i + A.dir >= 0 && A.i + A.dir < S.length) { const n = S[A.i + A.dir]; if ((n.x - c.x) ** 2 + (n.z - c.z) ** 2 < (S[A.i].x - c.x) ** 2 + (S[A.i].z - c.z) ** 2) A.i += A.dir; else break; }
}
function gwSpawnCar() {
  const p = gwRoadNear(PL.x, PL.z, 60, 190); if (!p) return; const r = Math.random(); const type = typeof S3_TRAFFIC !== 'undefined' ? pick(S3_TRAFFIC) : r < .2 ? 'suv' : r < .3 ? 'truck' : r < .38 ? 'sports' : r < .44 ? 'bike' : 'sedan';
  const dir = Math.random() < .5 ? 1 : -1, s = p.s, off = dir > 0 ? 2.7 : -2.7; if (CARS.some(o => Math.hypot(o.x - s.x, o.z - s.z) < 16)) return;
  const c = makeCar(type); c.x = s.x - s.tz * off; c.z = s.z + s.tx * off; c.yaw = Math.atan2(s.tx * dir, s.tz * dir); c.v = 12; c.flee = true; c.gwa = { R_: p.R_, i: p.i, dir, vt: p.R_.id === 'hwy' ? rand(19, 26) : rand(11, 16), stun: 0 }; c.drvP = true; c.drvLook = randomLook(Math.random() < .3); scene.add(c.g); CARS.push(c);
  if (c.S.bike) addRider(c, Object.assign(c.drvLook, { helmet: pick(['#f2f2f2', '#111', '#d61f26']) })); placeCar(c);
}
const GWP = { t: 0 };
S2TICK.push(dt => {
  if (!GW.built) return; const here = inGW(PL.x, PL.z);
  for (const c of CARS) if (c.gwa) { if (c === PL.car || !c.drvP || c.dead) { c.gwa = null; continue; } if (Math.abs(c.x - PL.x) + Math.abs(c.z - PL.z) < 400) gwCarStep(c, dt); }
  if (!here) return;
  if ((GWP.t -= dt) <= 0) { GWP.t = .8; if (CARS.filter(c => c.gwa).length < (QUALITY.low ? 7 : 11)) gwSpawnCar();
    // 마을 사람
    for (const t of GW_TOWNS) { if (t.b < 2 || Math.hypot(PL.x - t.x, PL.z - t.z) > 140) continue; const have = NPCS.filter(n => n.gwTown === t.id).length; if (have < Math.min(7, 2 + t.b / 3)) { const a = rand(0, 6.28), d = rand(4, t.r * .8), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d; if (gwRoadDist(x, z) < 6 || inView(x, z, 30)) continue; const p = { x, z }; collideCircle(p, .4, 0); const n = spawnNPC(p.x, p.z, 'ped'); n.gwTown = t.id; n.st = 'goto'; n.tgt = [t.x + rand(-t.r, t.r) * .7, t.z + rand(-t.r, t.r) * .7]; n.onArrive = gwWander; } } }
  for (const n of NPCS) if (n.st === 'walk' && inGW(n.x, n.z)) { if (!n.gwTown) n.gwTown = 'road'; n.st = 'goto'; n.tgt = [n.x + rand(-15, 15), n.z + rand(-15, 15)]; n.onArrive = gwWander; }
  // 오르막은 느려요
  const c = PL.car; if (c && !c.air) { const f = carFwd(c), h0 = groundY(c.x, c.z), h1 = groundY(c.x + f[0] * 2, c.z + f[1] * 2), sl = (h1 - h0) / 2; if (Math.abs(sl) > .02) c.v -= sl * 9.8 * dt * .9 * Math.sign(c.v || 1); if (gwRoadDist(c.x, c.z) > 4 && !c.S.bike) c.v *= 1 - dt * .35 * clamp(Math.abs(c.v) / 20, 0, 1); }
});
function gwWander(n) { const t = GW_TOWNS.find(q => q.id === n.gwTown) || { x: n.x, z: n.z, r: 14 }; n.st = Math.random() < .3 ? 'idle' : 'goto'; n.t = rand(3, 8); n.tgt = [t.x + rand(-t.r, t.r) * .7, t.z + rand(-t.r, t.r) * .7]; n.onArrive = gwWander; if (n.st === 'idle') setTimeout(() => { if (NPCS.includes(n) && n.st === 'idle') { n.st = 'goto'; n.onArrive = gwWander; } }, 6000); }
/* 차 · 차체 기울기 (언덕) */
const _placeCarS3 = placeCar; placeCar = function (c) { _placeCarS3(c); if (!c.air && !c.rampY && inGW(c.x, c.z) && !c.S.bike) { const f = carFwd(c), h1 = groundY(c.x + f[0] * c.S.L * .4, c.z + f[1] * c.S.L * .4), h0 = groundY(c.x - f[0] * c.S.L * .4, c.z - f[1] * c.S.L * .4); c.bodyG.rotation.x = clamp(-Math.atan2(h1 - h0, c.S.L * .8), -.5, .5); } };
/* 경찰: 강원도에선 길 따라 와요 */
const _spawnPolS3 = spawnPoliceCar; spawnPoliceCar = function () { if (!inGW(PL.x, PL.z) || !GW.built) return _spawnPolS3(); const p = gwRoadNear(PL.x, PL.z, 70, 140); if (!p) return; const c = makeCar('police'); const s = p.s; c.x = s.x; c.z = s.z; c.yaw = Math.atan2(PL.x - s.x, PL.z - s.z); c.chase = true; c.siren = true; c.v = 6; scene.add(c.g); CARS.push(c); placeCar(c); };
const _gridPathS3 = gridPath; gridPath = function (ax, az, bx, bz) { if (inGW(ax, az) || inGW(bx, bz)) { if (inGW(ax, az) && !inGW(bx, bz)) return [GW.X0 - 4, 0]; if (!inGW(ax, az) && inGW(bx, bz)) { if (Math.abs(az) > 6 || ax < LIM - 4) return _gridPathS3(ax, az, LIM, 0); return [GW.X0 + 20, 0]; } return [bx, bz]; } return _gridPathS3(ax, az, bx, bz); };
const _sideS3 = sidewalkNear; sidewalkNear = function (px, pz, r0, r1) { if (GW.built && inGW(px, pz)) { const p = gwRoadNear(px, pz, Math.max(10, r0 * .6), r1); if (!p) return null; const s = p.s, o = p.R_.w / 2 + 2; return [s.x - s.tz * o, s.z + s.tx * o, 0, 0, 0]; } return _sideS3(px, pz, r0, r1); };
/* ---------- 지도 ---------- */
buildMapImg = function () {
  MAP.minX = -LIM - 70; MAP.maxX = GW.X1; MAP.minZ = GW.Z0 - 20; MAP.maxZ = 620; const S = 1; const W = Math.round((MAP.maxX - MAP.minX) * S), H = Math.round((MAP.maxZ - MAP.minZ) * S); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const X = x => (x - MAP.minX) * S, Z = z => (z - MAP.minZ) * S;
  g.fillStyle = '#2b3a2a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2c5b86'; g.fillRect(0, Z(RIVER.z0), X(GW.X0 + 160), Z(RIVER.z1) - Z(RIVER.z0)); g.fillStyle = '#3d6a3a'; g.fillRect(0, Z(LIM + RH), X(LIM + RH + 60), Z(RIVER.z0) - Z(LIM + RH));
  g.fillStyle = '#3a4048'; g.fillRect(X(-LIM - 70), Z(-LIM - 70), (LIM * 2 + 140) * S, (LIM * 2 + 70) * S);
  g.fillStyle = '#8b9096'; g.fillRect(X(-LIM - RH), Z(-LIM - RH), X(LIM + RH) - X(-LIM - RH), Z(LIM + RH) - Z(-LIM - RH)); g.fillRect(X(-BRIDGE.hw), Z(LIM), BRIDGE.hw * 2 * S, Z(BRIDGE.z1) - Z(LIM));
  for (let i = -NR; i < NR; i++)for (let j = -NR; j < NR; j++) { const x0 = i * P + RH, z0 = j * P + RH; const sp = { '-1,-1': '#6e7a5a', '1,-3': '#4f7d3a' }[i + ',' + j]; g.fillStyle = sp || '#5a6068'; g.fillRect(X(x0), Z(z0), (P - 2 * RH) * S, (P - 2 * RH) * S); }
  for (const b of COL.boxes) if (b.tag === 'bld' && Math.abs(b.x0) < LIM + 20 && Math.abs(b.z0) < LIM + 20) { g.fillStyle = '#474d55'; g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S); }
  if (GW.h) { // 강원도 지형
    const nx = GW.nx, nz = GW.nz, im = g.createImageData(nx, nz), cc = [0, 0, 0];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = GW.X0 + i * GW.C, z = GW.Z0 + j * GW.C, h = GW.h[k]; terrainColor(x, z, h, 0, GW.bd[k] < 3 ? GW.kind[k] : 0, cc); let r = Math.pow(cc[0], 1 / 2.2), gg = Math.pow(cc[1], 1 / 2.2), b = Math.pow(cc[2], 1 / 2.2); const sh = .55 + clamp(h / 160, 0, 1) * .55; if (x > coastX(z) + 2 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r) { r = .17; gg = .36; b = .53; } else { r *= sh; gg *= sh; b *= sh; } im.data.set([r * 255, gg * 255, b * 255, 255], k * 4); }
    const tc = document.createElement('canvas'); tc.width = nx; tc.height = nz; tc.getContext('2d').putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(tc, X(GW.X0), Z(GW.Z0), (GW.X1 - GW.X0) * S, (GW.Z1 - GW.Z0) * S);
    g.fillStyle = '#2c5b86'; g.fillRect(X(GW.X0 + 160), Z(GW.Z1), X(GW.X1) - X(GW.X0 + 160), Z(RIVER.z1) - Z(GW.Z1));
    g.fillStyle = '#3a4048'; g.fillRect(X(LIM + RH), Z(-LIM - RH), 160 * S, (LIM + RH - 34) * S); g.fillRect(X(LIM + RH), Z(34), 160 * S, (RIVER.z0 - 34) * S);
    g.lineCap = 'round'; g.lineJoin = 'round'; for (const R_ of GW.roads) { g.strokeStyle = R_.id === 'hwy' ? '#e0c050' : '#c9ccd2'; g.lineWidth = R_.w * S * 1.1; g.beginPath(); R_.S.forEach((s, i) => i ? g.lineTo(X(s.x), Z(s.z)) : g.moveTo(X(s.x), Z(s.z))); g.stroke(); }
    for (const b of GW.blds || []) { g.fillStyle = '#5c5f66'; g.fillRect(X(b[0] - b[2] / 2), Z(b[1] - b[3] / 2), b[2] * S, b[3] * S); }
    g.fillStyle = '#8a6a3a'; g.fillRect(X(PIER.x0), Z(PIER.z0), (PIER.x1 - PIER.x0) * S, (PIER.z1 - PIER.z0) * S);
    g.font = `bold 22px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#fff'; for (const t of GW_TOWNS) { if (t.id === 'beach' || t.id === 'lodge') continue; g.strokeText(t.n, X(t.x), Z(t.z) - t.r - 6); g.fillText(t.n, X(t.x), Z(t.z) - t.r - 6); }
    g.font = `bold 40px ${DFONT}`; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('강 원 도', X(1150), Z(-520));
  }
  g.strokeStyle = 'rgba(255,214,90,.35)'; g.lineWidth = 1; for (let k = -NR; k <= NR; k++) { g.beginPath(); g.moveTo(X(-LIM - RH), Z(k * P)); g.lineTo(X(LIM + RH), Z(k * P)); g.moveTo(X(k * P), Z(-LIM - RH)); g.lineTo(X(k * P), Z(LIM + RH)); g.stroke(); }
  MAP.img = c; MAP.S = S;
};
