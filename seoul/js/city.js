'use strict';
/* ===== 서울 도시 =====
   도로는 바둑판. 도로 중심선이 P(80m) 간격, 블록은 그 사이.
   우측통행: 진행방향 오른쪽 차선(중앙선에서 2.1m · 5.5m). */
const P = 80, NR = 3, RH = 8, SW = 4, LIM = NR * P, LANES = [2.1, 5.5];
const BRIDGE = { x: 0, z0: LIM + RH, z1: 600, hw: RH };
const RIVER = { z0: 262, z1: 640 };
const COL = { cell: 20, grid: new Map(), boxes: [], circles: [] };
function colKey(i, j) { return i * 1000 + j; }
function colAdd(o, x0, z0, x1, z1) { const c = COL.cell; for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = colKey(i, j); let a = COL.grid.get(k); if (!a) COL.grid.set(k, a = []); a.push(o); } }
function addBox(x0, z0, x1, z1, h, tag) { const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h: h || 50, tag }; COL.boxes.push(b); colAdd(b, b.x0, b.z0, b.x1, b.z1); return b; }
function addCircle(x, z, r, h) { const c = { x, z, r, h: h || 4, circ: 1 }; COL.circles.push(c); colAdd(c, x - r, z - r, x + r, z + r); return c; }
let _qid = 0;
function colQuery(x, z, r) { const c = COL.cell, out = []; _qid++; for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) { const a = COL.grid.get(colKey(i, j)); if (a) for (const o of a) if (o._q !== _qid) { o._q = _qid; out.push(o); } } return out; }
/* 원과 충돌하는 것들을 밀어내요. 반환: 밀린 방향(법선) 또는 null */
function collideCircle(p, r, yLow) {
  let hit = null; yLow = yLow || 0;
  for (const o of colQuery(p.x, p.z, r + 1)) {
    if (o.h <= yLow + .3) continue;
    if (o.circ) { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = r + o.r; if (d < m && d > 1e-6) { p.x += dx / d * (m - d); p.z += dz / d * (m - d); hit = { nx: dx / d, nz: dz / d, o }; } continue; }
    const cx = clamp(p.x, o.x0, o.x1), cz = clamp(p.z, o.z0, o.z1); let dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-6) { p.x += dx / d * (r - d); p.z += dz / d * (r - d); hit = { nx: dx / d, nz: dz / d, o }; }
      else { // 안쪽에 들어감: 가장 가까운 면으로
        const l = p.x - o.x0, rr_ = o.x1 - p.x, t = p.z - o.z0, b = o.z1 - p.z, m = Math.min(l, rr_, t, b);
        if (m === l) { p.x = o.x0 - r; hit = { nx: -1, nz: 0, o }; } else if (m === rr_) { p.x = o.x1 + r; hit = { nx: 1, nz: 0, o }; } else if (m === t) { p.z = o.z0 - r; hit = { nx: 0, nz: -1, o }; } else { p.z = o.z1 + r; hit = { nx: 0, nz: 1, o }; }
      }
    }
  }
  return hit;
}
/* 선분이 건물에 막히는지 (시야 · 카메라) → 0~1 */
function rayBlock(ax, ay, az, bx, by, bz) {
  const L = Math.hypot(bx - ax, bz - az, by - ay), n = Math.ceil(L / .6); for (let i = 1; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    for (const o of colQuery(x, z, .2)) { if (o.circ || o.h < y) continue; if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) return (i - 1) / n; }
  } return 1;
}
function blockAt(x, z) { const bi = Math.floor(x / P), bj = Math.floor(z / P); if (bi < -NR || bi >= NR || bj < -NR || bj >= NR) return null; const lx = x - bi * P, lz = z - bj * P; if (lx > RH && lx < P - RH && lz > RH && lz < P - RH) return { bi, bj }; return null; }
function groundY(x, z) { if (blockAt(x, z)) return .18; if (z > LIM + RH && z < RIVER.z0 && Math.abs(x) > RH) return .18; if (z >= BRIDGE.z0 + 14 && Math.abs(x) <= BRIDGE.hw + 1) return bridgeY(z); return 0; }
function bridgeY(z) { const a = clamp((z - BRIDGE.z0 - 14) / 30, 0, 1), b = clamp((BRIDGE.z1 - z) / 30, 0, 1); return Math.min(a, b) * 4; }
function onRoad(x, z) { const fx = ((x % P) + P) % P, fz = ((z % P) + P) % P; return (fx < RH || fx > P - RH || fz < RH || fz > P - RH) && Math.abs(x) <= LIM + RH && Math.abs(z) <= LIM + RH; }
function inBounds(p, r) { // 도시 경계
  if (p.x > 1500) return; // 건물 안 (은행 · 보석상 · 편의점)
  const onBr = Math.abs(p.x) < BRIDGE.hw - r + .2 && p.z > LIM + RH - 1;
  if (onBr) { p.z = Math.min(p.z, BRIDGE.z1 - 2 - r); return; }
  p.x = clamp(p.x, -LIM - RH + r, LIM + RH - r); p.z = clamp(p.z, -LIM - RH + r, RIVER.z0 - 1 - r);
  if (p.z > LIM + RH - r && Math.abs(p.x) < BRIDGE.hw + 1) { } // 다리 입구
}

/* ---------- 지오메트리 모으기 (청크 · 재질별로 합쳐서 그리기 횟수 줄이기) ---------- */
const BK = new Map();
const SMALL = new Set(['mark', 'tlBody', 'tlxr', 'tlxy', 'tlxg', 'tlzr', 'tlzy', 'tlzg', 'lampHead', 'darkMetal', 'trunk', 'ginkgo', 'leaf', 'pine', 'white', 'metal', 'concrete', 'railing']);
function bucket(chunkKey, mk) { if (SMALL.has(mk) && /^-?\d+,-?\d+$/.test(chunkKey)) { const [a, b] = chunkKey.split(',').map(Number); chunkKey = 'S' + Math.floor(a / 2) + ',' + Math.floor(b / 2); } const k = chunkKey + '|' + mk; let b = BK.get(k); if (!b) BK.set(k, b = { mk, pos: [], nor: [], uv: [], col: null }); return b; }
function chunkOf(x, z) { return Math.floor((x + 1000) / 250) + "," + Math.floor((z + 1000) / 250); }
function quad(b, a, bb, c, d, n, uv) { // a,b,c,d 반시계, n 법선, uv [u0,v0,u1,v1]
  b.pos.push(a[0], a[1], a[2], bb[0], bb[1], bb[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  for (let i = 0; i < 6; i++)b.nor.push(n[0], n[1], n[2]);
  const [u0, v0, u1, v1] = uv; b.uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
}
/* 벽 4면 (uv는 실제 미터 기준 → 창문 줄이 층마다 맞아요) */
function walls(ck, mk, x0, z0, x1, z1, y0, y1, tw, th, uo) {
  const b = bucket(ck, mk); uo = uo || 0; const v0 = y0 / th, v1 = y1 / th;
  quad(b, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [uo, v0, uo + (x1 - x0) / tw, v1]);
  quad(b, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [uo + .5, v0, uo + .5 + (x1 - x0) / tw, v1]);
  quad(b, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [uo + .25, v0, uo + .25 + (z1 - z0) / tw, v1]);
  quad(b, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [uo + .75, v0, uo + .75 + (z1 - z0) / tw, v1]);
}
function face(ck, mk, side, x0, z0, x1, z1, y0, y1, uv) { // 한 면만
  const b = bucket(ck, mk);
  if (side === 'S') quad(b, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uv);
  if (side === 'N') quad(b, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uv);
  if (side === 'E') quad(b, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uv);
  if (side === 'W') quad(b, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uv);
}
function roof(ck, mk, x0, z0, x1, z1, y, s) { s = s || 8; quad(bucket(ck, mk), [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [x0 / s, z1 / s, x1 / s, z0 / s]); }
function slab(ck, mk, x0, z0, x1, z1, y0, y1, s, mkTop) { roof(ck, mkTop || mk, x0, z0, x1, z1, y1, s); walls(ck, mk, x0, z0, x1, z1, y0, y1, s, s); }
const _m4 = new T.Matrix4(), _n3 = new T.Matrix3();
function addGeo(ck, mk, geo, m) { // 일반 도형 넣기
  const g = geo.index ? geo.toNonIndexed() : geo; const b = bucket(ck, mk); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; _n3.getNormalMatrix(m);
  const v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); b.pos.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(_n3).normalize(); b.nor.push(v.x, v.y, v.z); if (uv) b.uv.push(uv.getX(i), uv.getY(i)); else b.uv.push(0, 0); }
}
const mat4 = (x, y, z, ry, sx, sy, sz) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(sx || 1, sy || 1, sz || 1));

/* ---------- 텍스처 ---------- */
const TEX = {};
function noisy(g, W, H, a) { const im = g.getImageData(0, 0, W, H); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - .5) * a; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } g.putImageData(im, 0, 0); }
function facade(kind) {
  // 반환: {map, emi, tw, th}
  const S = {
    glassB: { W: 512, H: 1024, cols: 4, rows: 8, tw: 12, th: 28.8 }, glassG: { W: 512, H: 1024, cols: 4, rows: 8, tw: 12, th: 28.8 }, glassS: { W: 512, H: 1024, cols: 4, rows: 8, tw: 12, th: 28.8 },
    apt: { W: 512, H: 512, cols: 4, rows: 6, tw: 18, th: 17.4 }, apt2: { W: 512, H: 512, cols: 4, rows: 6, tw: 18, th: 17.4 },
    shopA: { W: 512, H: 512, cols: 3, rows: 4, tw: 12, th: 13.6 }, shopB: { W: 512, H: 512, cols: 3, rows: 4, tw: 12, th: 13.6 }, shopC: { W: 512, H: 512, cols: 3, rows: 4, tw: 12, th: 13.6 },
    villa: { W: 512, H: 512, cols: 4, rows: 4, tw: 14, th: 11.6 }
  }[kind];
  const cw = S.W / S.cols, rh = S.H / S.rows; const lit = [];
  const map = ctex(S.W, S.H, (g, W, H) => {
    if (kind.startsWith('glass')) {
      const base = { glassB: ['#1b3550', '#2f5f86'], glassG: ['#173d3a', '#2f6e66'], glassS: ['#3a4250', '#7d8898'] }[kind];
      g.fillStyle = '#20262e'; g.fillRect(0, 0, W, H);
      for (let r = 0; r < S.rows; r++)for (let c = 0; c < S.cols; c++) {
        const x = c * cw, y = r * rh; const gr = g.createLinearGradient(x, y, x + cw, y + rh); const k = Math.random();
        gr.addColorStop(0, base[0]); gr.addColorStop(.55 + k * .3, base[1]); gr.addColorStop(1, base[0]); g.fillStyle = gr; g.fillRect(x + 4, y + 4, cw - 8, rh * .78);
        g.fillStyle = 'rgba(255,255,255,' + (.05 + Math.random() * .12) + ')'; g.fillRect(x + 4, y + 4, cw - 8, rh * .78 * Math.random());
        if (Math.random() < .25) { g.fillStyle = 'rgba(230,230,220,.25)'; g.fillRect(x + 4, y + 4, cw - 8, rh * .3); }
        g.fillStyle = kind === 'glassS' ? '#596270' : '#2a323c'; g.fillRect(x, y + rh * .82, cw, rh * .18);
        if (Math.random() < .35) lit.push([x + 4, y + 4, cw - 8, rh * .78]);
      }
      g.fillStyle = 'rgba(160,170,185,.6)'; for (let c = 0; c <= S.cols; c++)g.fillRect(c * cw - 2, 0, 4, H);
    } else if (kind.startsWith('apt')) {
      g.fillStyle = kind === 'apt' ? '#e9e6df' : '#eef0f2'; g.fillRect(0, 0, W, H); noisy(g, W, H, 10);
      for (let r = 0; r < S.rows; r++)for (let c = 0; c < S.cols; c++) {
        const x = c * cw, y = r * rh; g.fillStyle = '#9fb4c4'; g.fillRect(x + 10, y + 12, cw - 20, rh * .55);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 10, y + 12, (cw - 20) * .5, rh * .55);
        g.strokeStyle = '#7d8a94'; g.lineWidth = 3; g.strokeRect(x + 10, y + 12, cw - 20, rh * .55); g.beginPath(); g.moveTo(x + cw / 2, y + 12); g.lineTo(x + cw / 2, y + 12 + rh * .55); g.stroke();
        g.fillStyle = '#d4d0c8'; g.fillRect(x + 4, y + rh * .62, cw - 8, rh * .16); g.fillStyle = '#b9b4aa'; for (let k = 0; k < 10; k++)g.fillRect(x + 6 + k * (cw - 12) / 10, y + rh * .62, 2, rh * .16);
        if (Math.random() < .4) lit.push([x + 10, y + 12, cw - 20, rh * .55]);
      }
      g.fillStyle = kind === 'apt' ? '#3b6db3' : '#3a9a6a'; g.fillRect(W - 14, 0, 14, H);
    } else if (kind === 'villa') {
      g.fillStyle = '#9a4a32'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) for (let x = (y / 8 % 2) * 12; x < W; x += 24) { g.fillStyle = `rgb(${130 + Math.random() * 40},${60 + Math.random() * 20},${40 + Math.random() * 15})`; g.fillRect(x, y, 22, 6); }
      for (let r = 0; r < S.rows; r++)for (let c = 0; c < S.cols; c++) { const x = c * cw, y = r * rh; g.fillStyle = '#e8e0d0'; g.fillRect(x + 22, y + 22, cw - 44, rh * .52); g.fillStyle = '#6d8796'; g.fillRect(x + 27, y + 27, cw - 54, rh * .52 - 10); if (Math.random() < .4) lit.push([x + 27, y + 27, cw - 54, rh * .52 - 10]); g.fillStyle = '#d8d0c0'; g.fillRect(x + 16, y + 22 + rh * .52, cw - 32, 8); }
    } else {
      const bg = { shopA: '#d9ccb4', shopB: '#a9adb1', shopC: '#b56b52' }[kind]; g.fillStyle = bg; g.fillRect(0, 0, W, H);
      if (kind === 'shopA') { g.strokeStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } }
      noisy(g, W, H, 14);
      const stick = ['PC', '학원', '노래', '치과', '헬스', '수학', '영어', '당구', '피아노', '네일', '필라테스', '사무실'];
      for (let r = 0; r < S.rows; r++)for (let c = 0; c < S.cols; c++) {
        const x = c * cw, y = r * rh; g.fillStyle = '#5f7686'; g.fillRect(x + 12, y + 18, cw - 24, rh * .62); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 12, y + 18, (cw - 24) * .45, rh * .62);
        g.strokeStyle = '#d8d8d8'; g.lineWidth = 4; g.strokeRect(x + 12, y + 18, cw - 24, rh * .62);
        if (Math.random() < .35) { const t = pick(stick); g.fillStyle = pick(['#e8303a', '#1e64d8', '#f2b705', '#16a34a', '#ffffff']); g.font = `900 ${Math.min(48, (cw - 40) / t.length * 1.1)}px ${DFONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + cw / 2, y + 18 + rh * .31); }
        if (Math.random() < .4) lit.push([x + 12, y + 18, cw - 24, rh * .62]);
      }
    }
  }, true);
  const emi = ctex(S.W, S.H, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); for (const [x, y, w, h] of lit) { g.fillStyle = pick(['#ffd79a', '#ffe9c4', '#cfe6ff', '#fff4dc']); g.fillRect(x, y, w, h); } }, true);
  return { map, emi, tw: S.tw, th: S.th };
}
function storeTex() { // 1층 가게 유리 (6m x 4m)
  const lit = [];
  const draw = (night) => (g, W, H) => {
    g.fillStyle = night ? '#000' : '#2d2f33'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) {
      const x = i * 256; if (!night) { g.fillStyle = '#c9ccd0'; g.fillRect(x, 0, 256, 256); }
      const gr = g.createLinearGradient(0, 40, 0, 240); gr.addColorStop(0, night ? '#ffe7b8' : '#7c8a94'); gr.addColorStop(1, night ? '#ffcf8a' : '#4c5862');
      g.fillStyle = gr; g.fillRect(x + 10, 46, 236, 200);
      if (!night) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 10, 46, 90, 200); for (let k = 0; k < 6; k++) { g.fillStyle = `hsl(${Math.random() * 360},45%,${45 + Math.random() * 20}%)`; g.fillRect(x + 20 + k * 36, 150 + Math.random() * 40, 26, 60); } g.fillStyle = '#9aa1a8'; g.fillRect(x + 128, 46, 6, 200); g.fillStyle = '#3b3f45'; g.fillRect(x, 0, 256, 40); }
    }
  };
  return { map: ctex(1024, 256, draw(false), true), emi: ctex(1024, 256, draw(true), true), tw: 24, th: 4.27 };
}
function lobbyTex() { return ctex(256, 256, (g, W, H) => { g.fillStyle = '#1b1f24'; g.fillRect(0, 0, W, H); const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#3e5566'); gr.addColorStop(1, '#22313c'); g.fillStyle = gr; g.fillRect(6, 6, W - 12, H - 12); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(6, 6, 80, H - 12); g.fillStyle = '#6d7a85'; g.fillRect(W / 2 - 3, 0, 6, H); }, true); }
function roofTex() { return ctex(256, 256, (g, W, H) => { g.fillStyle = '#8b8d8c'; g.fillRect(0, 0, W, H); noisy(g, W, H, 26); g.fillStyle = 'rgba(60,140,90,.35)'; g.fillRect(20, 30, 120, 90); }, true); }
function pavingTex() { return ctex(256, 256, (g, W, H) => { g.fillStyle = '#6d6862'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 16) for (let x = (y / 16 % 2) * 16; x < W + 16; x += 32) { const rose = Math.random() < .35; const b = 105 + Math.random() * 30; g.fillStyle = rose ? `rgb(${b + 25},${b - 5},${b - 10})` : `rgb(${b},${b - 3},${b - 8})`; g.fillRect(x + 1, y + 1, 30, 14); } noisy(g, W, H, 10); }, true); }
function asphaltTex() { return ctex(512, 512, (g, W, H) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, W, H); noisy(g, W, H, 22); for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(20,20,22,.35)'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * W, y = Math.random() * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rand(-30, 30); y += rand(-30, 30); g.lineTo(x, y); } g.stroke(); } for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, rand(10, 40), rand(6, 20), Math.random() * 3, 0, 7); g.fill(); } }, true); }
function grassTex() { return ctex(256, 256, (g, W, H) => { g.fillStyle = '#4f7a35'; g.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${85 + Math.random() * 30},${35 + Math.random() * 20}%,${22 + Math.random() * 18}%)`; g.fillRect(Math.random() * W, Math.random() * H, 2, 3); } }, true); }
function roadMarkTex() { // 가로 = 도로 폭(16m), 세로 = 64m
  return ctex(256, 1024, (g, W, H) => {
    g.clearRect(0, 0, W, H); const mx = x => (x + RH) / (2 * RH) * W, my = m => m / 64 * H;
    g.fillStyle = '#f2c230'; g.fillRect(mx(-.32), 0, mx(-.12) - mx(-.32), H); g.fillRect(mx(.12), 0, mx(.32) - mx(.12), H);
    g.fillStyle = '#f4f4f0'; for (const s of [-1, 1]) { const x = mx(s * 3.8); for (let m = 8; m < 56; m += 6) g.fillRect(x - 2, my(m), 4, my(3)); g.fillRect(mx(s * 7.45) - 2.5, my(4.5), 5, my(55)); }
    for (const end of [0, 1]) { const y0 = end ? my(60) : 0, y1 = end ? H : my(4); for (let x = -7.2; x < 7.2; x += 1) g.fillRect(mx(x + .1), y0, mx(.5) - mx(0), y1 - y0); }
    g.fillRect(mx(.4), my(4.35), mx(7.4) - mx(.4), my(.45)); g.fillRect(mx(-7.4), my(59.2), mx(7) - mx(0), my(.45));
  });
}
function signAtlas() {
  const H = [ // [글자, 배경, 글자색]
    ['편의점', '#1f8f4a', '#fff'], ['치킨', '#f2b705', '#c4161c'], ['PC방', '#111', '#00e5ff'], ['노래방', '#7a1fa2', '#ffe600'], ['카페', '#4a2c1a', '#fff'], ['약국', '#fff', '#16a34a'], ['분식', '#e8303a', '#fff'], ['김밥', '#fff', '#e8303a'], ['국밥', '#3b2a1a', '#ffd27a'], ['떡볶이', '#d61f26', '#fff'],
    ['삼겹살', '#2b1a12', '#ff8a3d'], ['호프', '#0d3b66', '#ffd166'], ['부동산', '#fff', '#1e3a8a'], ['미용실', '#ff4f9a', '#fff'], ['안경', '#fff', '#111'], ['치과', '#e7f3ff', '#1e64d8'], ['수학학원', '#1e64d8', '#fff'], ['영어학원', '#ff7a00', '#fff'], ['태권도', '#111', '#ff3b3b'], ['꽃집', '#f7d6e0', '#c2185b'],
    ['빵집', '#fbe7c6', '#8a4b1f'], ['세탁소', '#e0f2fe', '#0369a1'], ['휴대폰', '#e8303a', '#fff'], ['은행', '#0b5ed7', '#fff'], ['내과', '#fff', '#0b5ed7'], ['마트', '#ffd400', '#1e3a8a'], ['코인노래방', '#ff1f8e', '#fff'], ['당구장', '#145a32', '#fff'], ['곱창', '#5a1a0a', '#ffb703'], ['냉면', '#e0f7ff', '#0a5f8a'],
    ['족발·보쌈', '#2b1a12', '#fff'], ['횟집', '#0a4a7a', '#fff'], ['중국집', '#c4161c', '#ffd700'], ['한식뷔페', '#fff6e0', '#8a4b1f'], ['순대국', '#3b2a1a', '#fff'], ['설렁탕', '#fff', '#3b2a1a'], ['닭갈비', '#e8501f', '#fff'], ['마라탕', '#b10e1e', '#ffd166'], ['네일', '#fde2ef', '#d6336c'], ['헬스장', '#111', '#ffd400'],
    ['스터디카페', '#2f2f2f', '#7dd3fc'], ['천원샵', '#e8303a', '#fff'], ['커피', '#1b4332', '#fff'], ['아이스크림', '#fff0f6', '#f06595'], ['옷가게', '#111111', '#ff7ab6'], ['총포사', '#2b2b2b', '#ff9a3c'],
    ['경찰서', '#0b2a6f', '#fff'], ['병원', '#fff', '#d6232a'], ['정비소 · 도색', '#ffd400', '#111'], ['서울치킨', '#c4161c', '#ffd400'], ['한빛아파트', '#ffffff00', '#1e4fa3'], ['푸른숲아파트', '#ffffff00', '#1f7a4a'], ['별빛마을', '#ffffff00', '#5b3fa3'], ['새솔아파트', '#ffffff00', '#a3342a'], ['버스정류장', '#0b5ed7', '#fff'], ['지하철 2호선', '#16a34a', '#fff']];
  const V = [['노래방', '#7a1fa2', '#ffe600'], ['PC방', '#111', '#00e5ff'], ['치킨', '#f2b705', '#c4161c'], ['당구장', '#145a32', '#fff'], ['호프', '#0d3b66', '#ffd166'], ['학원', '#1e64d8', '#fff'], ['사우나', '#fff', '#d6232a'], ['치과', '#e7f3ff', '#1e64d8'], ['약국', '#fff', '#16a34a'], ['헬스', '#111', '#ffd400'], ['카페', '#4a2c1a', '#fff'], ['국밥', '#3b2a1a', '#ffd27a'], ['안경', '#fff', '#111'], ['미용실', '#ff4f9a', '#fff'], ['편의점', '#1f8f4a', '#fff'], ['식당', '#e8303a', '#fff']];
  const AW = 2048, SH = 120; const slots = { h: [], v: [], byName: {} };
  const tex = ctex(AW, AW, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    H.forEach(([t, bg, fg], i) => {
      const x = (i % 4) * 512, y = Math.floor(i / 4) * SH; const tr = bg.length > 7;
      if (!tr) { const gr = g.createLinearGradient(0, y, 0, y + SH); gr.addColorStop(0, bg); gr.addColorStop(1, shade(bg, -.15)); g.fillStyle = gr; g.fillRect(x + 2, y + 2, 508, SH - 4); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.strokeRect(x + 8, y + 8, 496, SH - 16); }
      let fs = 86; g.font = `${fs}px ${DFONT}`; while (g.measureText(t).width > 470 && fs > 30) { fs -= 4; g.font = `${fs}px ${DFONT}`; }
      if (tr) { g.lineWidth = 10; g.strokeStyle = '#fff'; g.strokeText(t, x + 256, y + SH / 2 + 4); }
      g.fillStyle = fg; g.fillText(t, x + 256, y + SH / 2 + 4);
      const u0 = x / AW, u1 = (x + 512) / AW, v1 = 1 - y / AW, v0 = 1 - (y + SH) / AW; const s = { t, uv: [u0 + .001, v0 + .001, u1 - .001, v1 - .001] }; slots.byName[t] = s; if (i < 46) slots.h.push(s);
    });
    const vy = 1680;
    V.forEach(([t, bg, fg], i) => {
      const x = i * 128; g.fillStyle = bg; g.fillRect(x + 4, vy + 2, 120, 364); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 4; g.strokeRect(x + 10, vy + 8, 108, 352);
      const ch = [...t.replace('PC', 'Ⓟ')]; const fs = Math.min(84, 330 / ch.length); g.font = `${fs}px ${DFONT}`; g.fillStyle = fg;
      ch.forEach((c, k) => g.fillText(c === 'Ⓟ' ? 'PC' : c, x + 64, vy + 20 + (330 / ch.length) * (k + .5)));
      slots.v.push({ t, uv: [x / AW + .001, 1 - (vy + 368) / AW + .001, (x + 128) / AW - .001, 1 - vy / AW - .001] });
    });
  });
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; return { tex, slots };
}
function shade(hex, a) { const c = new T.Color(hex); const h = {}; c.getHSL(h); c.setHSL(h.h, h.s, clamp(h.l + a, 0, 1)); return '#' + c.getHexString(); }

/* ---------- 재질 ---------- */
const MATS = {};
function stdMat(k, o, night) { for (const c of ['color', 'emissive']) if (typeof o[c] === 'string') o[c] = lin(o[c]); const m = new T.MeshStandardMaterial(o); MATS[k] = m; if (night) NIGHT_MATS.push({ m, day: night[0], night: night[1] }); return m; }
let SIGNS = null;
function initMats() {
  for (const k of ['glassB', 'glassG', 'glassS']) { const f = facade(k); stdMat(k, { map: f.map, emissive: '#fff', emissiveMap: f.emi, emissiveIntensity: 0, roughness: .18, metalness: .65, envMapIntensity: 1.2 }, [0, 1.1]); MATS[k].tw = f.tw; MATS[k].th = f.th; }
  for (const k of ['apt', 'apt2', 'shopA', 'shopB', 'shopC', 'villa']) { const f = facade(k); stdMat(k, { map: f.map, emissive: '#fff', emissiveMap: f.emi, emissiveIntensity: 0, roughness: .85 }, [0, 1]); MATS[k].tw = f.tw; MATS[k].th = f.th; }
  { const f = storeTex(); stdMat('store', { map: f.map, emissive: '#fff', emissiveMap: f.emi, emissiveIntensity: .05, roughness: .3, metalness: .2 }, [.05, 1.3]); MATS.store.tw = f.tw; MATS.store.th = f.th; }
  stdMat('lobby', { map: lobbyTex(), roughness: .15, metalness: .6, emissive: '#ffe2b0', emissiveIntensity: 0 }, [0, .35]);
  stdMat('roof', { map: roofTex(), roughness: .95 });
  stdMat('paving', { map: pavingTex(), roughness: .9 });
  stdMat('curb', { color: '#a7a49d', roughness: .9 });
  stdMat('asphalt', { map: asphaltTex(), roughness: .92 }); MATS.asphalt.map.repeat.set(1, 1);
  stdMat('mark', { map: roadMarkTex(), transparent: false, alphaTest: .5, side: T.DoubleSide, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 });
  stdMat('grass', { map: grassTex(), roughness: 1 });
  stdMat('concrete', { color: '#b5b2aa', roughness: .9 });
  stdMat('darkMetal', { color: '#2b2f35', roughness: .5, metalness: .6 });
  stdMat('metal', { color: '#9aa0a6', roughness: .35, metalness: .8 });
  stdMat('trunk', { color: '#5a4030', roughness: 1 });
  stdMat('ginkgo', { color: '#c99a1c', roughness: .85 }); stdMat('leaf', { color: '#4d7d2e', roughness: .85 }); stdMat('pine', { color: '#2e5a2a', roughness: .9 });
  stdMat('lampHead', { color: '#fff', emissive: '#ffd9a0', emissiveIntensity: 0, roughness: .4 }, [0, 3]);
  stdMat('white', { color: '#e9e9e4', roughness: .7 });
  stdMat('red', { color: '#b02020', roughness: .6 });
  stdMat('wood', { color: '#7a4a2a', roughness: .8 });
  stdMat('tile', { color: '#c9c1b2', roughness: .8 });
  stdMat('hanokRoof', { color: '#3a3d42', roughness: .7 }); stdMat('dancheong', { color: '#2f8a6a', roughness: .7 }); stdMat('stone', { color: '#a59e90', roughness: .95 });
  stdMat('glassDark', { color: '#0d1620', roughness: .1, metalness: .8 });
  stdMat('railing', { color: '#d8d8d8', roughness: .4, metalness: .6 });
  stdMat('bridge', { color: '#9aa3ab', roughness: .7, metalness: .2 });
  stdMat('hill', { color: '#3f5f34', roughness: 1, flatShading: true });
  stdMat('bark', { color: '#4b3a2b', roughness: 1 });
  stdMat('yellow', { color: '#f2c230', roughness: .6 });
  stdMat('green', { color: '#1f8f4a', roughness: .6 });
  stdMat('blue', { color: '#1e4fa3', roughness: .6 });
  SIGNS = signAtlas();
  stdMat('sign', { map: SIGNS.tex, emissive: '#fff', emissiveMap: SIGNS.tex, emissiveIntensity: .35, roughness: .5, transparent: false, alphaTest: .1, side: T.DoubleSide }, [.3, 1.4]);
  stdMat('neonBlue', { color: '#bfe8ff', emissive: '#4fc3ff', emissiveIntensity: .3 }, [.3, 2.5]);
  stdMat('tlBody', { color: '#222', roughness: .6 });
}
/* 신호등 재질: 축별 · 색별 */
const TL = { mats: {} };
function initTL() { for (const ax of ['x', 'z']) for (const c of ['r', 'y', 'g']) TL.mats[ax + c] = stdMat('tl' + ax + c, { color: '#111', emissive: { r: '#ff2a1a', y: '#ffb000', g: '#20ff70' }[c], emissiveIntensity: 0 }); }
const LIGHT = { t: 0, cyc: 30 };
function lightFor(ax) { const t = LIGHT.t % LIGHT.cyc; const a = ax === 'x' ? t : (t + 15) % 30; return a < 11.5 ? 'g' : a < 14 ? 'y' : 'r'; }
function updateLights(dt) { LIGHT.t += dt; for (const ax of ['x', 'z']) { const s = lightFor(ax); for (const c of ['r', 'y', 'g']) TL.mats[ax + c].emissiveIntensity = s === c ? 3 : 0; } }

/* ---------- 간판 붙이기 ---------- */
function signQuad(ck, side, cx, cz, y, w, h, uv, off) { // side: 건물 면 방향 S/N/E/W, (cx,cz) 면 중앙
  off = off || .12; const b = bucket(ck, 'sign');
  const hw = w / 2;
  if (side === 'S') quad(b, [cx - hw, y, cz + off], [cx + hw, y, cz + off], [cx + hw, y + h, cz + off], [cx - hw, y + h, cz + off], [0, 0, 1], uv);
  if (side === 'N') quad(b, [cx + hw, y, cz - off], [cx - hw, y, cz - off], [cx - hw, y + h, cz - off], [cx + hw, y + h, cz - off], [0, 0, -1], uv);
  if (side === 'E') quad(b, [cx + off, y, cz + hw], [cx + off, y, cz - hw], [cx + off, y + h, cz - hw], [cx + off, y + h, cz + hw], [1, 0, 0], uv);
  if (side === 'W') quad(b, [cx - off, y, cz - hw], [cx - off, y, cz + hw], [cx - off, y + h, cz + hw], [cx - off, y + h, cz - hw], [-1, 0, 0], uv);
}
/* 세로 간판: 면에서 튀어나온 판 (양면) */
function vSign(ck, side, cx, cz, y, uv) {
  const b = bucket(ck, 'sign'); const w = .9, h = 2.6, d = 1.0;
  let ax, az, nx, nz; if (side === 'S') { ax = 0; az = 1; } if (side === 'N') { ax = 0; az = -1; } if (side === 'E') { ax = 1; az = 0; } if (side === 'W') { ax = -1; az = 0; }
  const x0 = cx + ax * .1, z0 = cz + az * .1, x1 = cx + ax * (.1 + w), z1 = cz + az * (.1 + w); nx = az; nz = -ax;
  quad(b, [x0, y, z0], [x1, y, z1], [x1, y + h, z1], [x0, y + h, z0], [nx, 0, nz], uv);
  quad(b, [x1, y, z1], [x0, y, z0], [x0, y + h, z0], [x1, y + h, z1], [-nx, 0, -nz], uv);
}

/* ---------- 건물 ---------- */
const BUILD = { shops: [], landmarks: {} }; // 상점 위치 (미션 · 상점에 써요)
function sideToward(x0, z0, x1, z1, bx0, bz0, bx1, bz1) { // 블록 테두리에 가장 가까운 면
  const d = { N: z0 - bz0, S: bz1 - z1, W: x0 - bx0, E: bx1 - x1 }; let best = 'S', m = 1e9; for (const k in d) if (d[k] < m) { m = d[k]; best = k; } return best;
}
function building(kind, x0, z0, x1, z1, hgt, opt) {
  opt = opt || {}; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ck = chunkOf(cx, cz), m = MATS[kind]; const base = .18;
  const groundFloor = opt.store ? 4.27 : 0;
  if (groundFloor) {
    walls(ck, 'store', x0, z0, x1, z1, base, base + groundFloor, MATS.store.tw, MATS.store.th, (R() * 4 | 0) / 4);
    // 1층 위 처마
    slab(ck, 'darkMetal', x0 - .3, z0 - .3, x1 + .3, z1 + .3, base + groundFloor, base + groundFloor + .25, 4);
  } else if (opt.lobby) walls(ck, 'lobby', x0, z0, x1, z1, base, base + 5.2, 4, 5.2);
  const y0 = base + (groundFloor ? groundFloor + .25 : opt.lobby ? 5.2 : 0);
  walls(ck, kind, x0, z0, x1, z1, y0, base + hgt, m.tw, m.th, Math.floor(R() * 4) * .25);
  roof(ck, 'roof', x0, z0, x1, z1, base + hgt, 8);
  // 옥상 난간 · 물탱크 · 실외기
  slab(ck, 'concrete', x0, z0, x0 + .25, z1, base + hgt, base + hgt + .9, 4); slab(ck, 'concrete', x1 - .25, z0, x1, z1, base + hgt, base + hgt + .9, 4);
  slab(ck, 'concrete', x0, z0, x1, z0 + .25, base + hgt, base + hgt + .9, 4); slab(ck, 'concrete', x0, z1 - .25, x1, z1, base + hgt, base + hgt + .9, 4);
  if (x1 - x0 > 6 && z1 - z0 > 6) {
    if (R() < .7) addGeo(ck, R() < .5 ? 'white' : 'metal', new T.CylinderGeometry(1.1, 1.1, 2.2, 12), mat4(x0 + 2.5, base + hgt + 1.1, z0 + 2.5));
    for (let k = 0; k < 3; k++) { const ax = rr(x0 + 1.5, x1 - 2.5), az = rr(z0 + 1.5, z1 - 2.5); slab(ck, 'white', ax, az, ax + 1, az + .7, base + hgt, base + hgt + .8, 2); }
    if (opt.crown) { const s = Math.min(x1 - x0, z1 - z0) * .3; slab(ck, kind, cx - s, cz - s, cx + s, cz + s, base + hgt, base + hgt + opt.crown, m.tw); roof(ck, 'roof', cx - s, cz - s, cx + s, cz + s, base + hgt + opt.crown); addGeo(ck, 'darkMetal', new T.CylinderGeometry(.15, .25, 12, 6), mat4(cx, base + hgt + opt.crown + 6, cz)); }
  }
  addBox(x0, z0, x1, z1, hgt + 1, 'bld');
  return { cx, cz, ck };
}
/* 상가 건물: 1층 가게 + 간판 */
function shopBuilding(bx0, bz0, bx1, bz1, x0, z0, x1, z1, forced) {
  const floors = 3 + Math.floor(R() * 4), h = 4.5 + floors * 3.4; const kind = rpick(['shopA', 'shopA', 'shopB', 'shopC']);
  const r = building(kind, x0, z0, x1, z1, h, { store: true }); const side = sideToward(x0, z0, x1, z1, bx0, bz0, bx1, bz1);
  const fw = (side === 'N' || side === 'S') ? x1 - x0 : z1 - z0; const fc = { N: [r.cx, z0], S: [r.cx, z1], E: [x1, r.cz], W: [x0, r.cz] }[side];
  const s = forced ? SIGNS.slots.byName[forced] : rpick(SIGNS.slots.h);
  signQuad(r.ck, side, fc[0], fc[1], .18 + 4.6, Math.min(fw - .8, 9), 1.5, s.uv, .45);
  // 위층 간판 · 세로 간판
  for (let f = 0; f < floors - 1; f++) if (R() < .45) { const s2 = rpick(SIGNS.slots.h); signQuad(r.ck, side, fc[0], fc[1], .18 + 4.6 + 1.9 + f * 3.4, Math.min(fw - 1, 6), 1.1, s2.uv, .05); }
  if (R() < .6) { const ss = rpick(SIGNS.slots.v); const off = fw / 2 - .3; const p = side === 'N' || side === 'S' ? [fc[0] + (R() < .5 ? -off : off), fc[1]] : [fc[0], fc[1] + (R() < .5 ? -off : off)]; vSign(r.ck, side, p[0], p[1], 6.2 + R() * 3, ss.uv); }
  const door = { N: [r.cx, z0 - 1.5], S: [r.cx, z1 + 1.5], E: [x1 + 1.5, r.cz], W: [x0 - 1.5, r.cz] }[side];
  BUILD.shops.push({ name: s.t, x: door[0], z: door[1], side });
}
function genBlock(bi, bj) {
  const bx0 = bi * P + RH, bz0 = bj * P + RH, bx1 = (bi + 1) * P - RH, bz1 = (bj + 1) * P - RH; // 인도 포함 블록
  const lx0 = bx0 + SW, lz0 = bz0 + SW, lx1 = bx1 - SW, lz1 = bz1 - SW; // 건물 땅
  const ck = chunkOf((bx0 + bx1) / 2, (bz0 + bz1) / 2);
  slab(ck, 'curb', bx0, bz0, bx1, bz1, 0, .18, 4, 'paving');
  const d = Math.max(Math.abs(bi + .5), Math.abs(bj + .5));
  const key = bi + ',' + bj; const special = { '-1,-1': 'plaza', '0,0': 'tower', '-3,0': 'police', '2,-2': 'hospital', '2,1': 'garage', '1,-3': 'park', '-1,1': 'chicken' }[key];
  if (special) return genSpecial(special, bi, bj, bx0, bz0, bx1, bz1, lx0, lz0, lx1, lz1, ck);
  if (d < 1.5) { // 강남 오피스
    const n = R() < .5 ? 2 : 4; const half = (lx1 - lx0) / 2;
    for (let k = 0; k < (n === 4 ? 4 : 2); k++) {
      let x0, z0, x1, z1; if (n === 4) { const ix = k % 2, iz = k >> 1; x0 = lx0 + ix * half + 2; x1 = x0 + half - 4; z0 = lz0 + iz * half + 2; z1 = z0 + half - 4; } else { x0 = lx0 + 2; x1 = lx1 - 2; z0 = lz0 + k * half + 2; z1 = z0 + half - 4; if (R() < .5) { x0 = lx0 + k * half + 2; x1 = x0 + half - 4; z0 = lz0 + 2; z1 = lz1 - 2; } }
      const sh = rr(.15, .3) * Math.min(x1 - x0, z1 - z0); x0 += sh * R(); x1 -= sh * R(); z0 += sh * R(); z1 -= sh * R();
      const kind = rpick(['glassB', 'glassG', 'glassS']); const h = rr(40, 110) * (n === 4 ? .8 : 1);
      const r = building(kind, x0, z0, x1, z1, h, { lobby: true, crown: R() < .4 ? rr(6, 14) : 0 });
      if (R() < .5) { const s = rpick(SIGNS.slots.h); const side = sideToward(x0, z0, x1, z1, bx0, bz0, bx1, bz1); const fc = { N: [r.cx, z0], S: [r.cx, z1], E: [x1, r.cz], W: [x0, r.cz] }[side]; signQuad(r.ck, side, fc[0], fc[1], 5.6, 5, 1.2, s.uv, .05); }
    }
    trees(bx0, bz0, bx1, bz1, 'ginkgo');
  } else if (d < 2.5 || R() < .3) { // 상가 골목
    const segs = (a0, a1) => { const out = []; let a = a0; while (a < a1 - 5) { const w = Math.min(a1 - a, rr(8, 14)); if (a1 - a - w < 6) { out.push([a, a1]); break; } out.push([a, a + w]); a += w + rr(0, 1.2); } return out; };
    const dep = rr(13, 17); const mid = (lx0 + lx1) / 2 + rr(-10, 10); // 가운데 차 드나드는 길 (9m)
    for (const [a, b] of segs(lx0, mid - 4.5)) { shopBuilding(bx0, bz0, bx1, bz1, a, lz0, b, lz0 + dep); shopBuilding(bx0, bz0, bx1, bz1, a, lz1 - dep, b, lz1); }
    for (const [a, b] of segs(mid + 4.5, lx1)) { shopBuilding(bx0, bz0, bx1, bz1, a, lz0, b, lz0 + dep); shopBuilding(bx0, bz0, bx1, bz1, a, lz1 - dep, b, lz1); }
    roof(ck, 'asphalt', mid - 4.5, lz0, mid + 4.5, lz0 + dep, .2, 10); roof(ck, 'asphalt', mid - 4.5, lz1 - dep, mid + 4.5, lz1, .2, 10);
    for (const [a, b] of segs(lz0 + dep + 1, lz1 - dep - 1)) { shopBuilding(bx0, bz0, bx1, bz1, lx0, a, lx0 + dep, b); shopBuilding(bx0, bz0, bx1, bz1, lx1 - dep, a, lx1, b); }
    // 안쪽 주차장
    roof(ck, 'asphalt', lx0 + dep, lz0 + dep, lx1 - dep, lz1 - dep, .2, 10); PARK_SPOTS.push({ x0: lx0 + dep + 3, z0: lz0 + dep + 3, x1: lx1 - dep - 3, z1: lz1 - dep - 3 });
    trees(bx0, bz0, bx1, bz1, R() < .6 ? 'ginkgo' : 'leaf');
  } else if (R() < .65) { // 아파트 단지
    const kind = R() < .5 ? 'apt' : 'apt2'; const nm = rpick(['한빛아파트', '푸른숲아파트', '별빛마을', '새솔아파트']); const dong = 101 + Math.floor(R() * 6) * 2;
    const alongX = R() < .5; const L = (alongX ? lx1 - lx0 : lz1 - lz0) - 6;
    for (let k = 0; k < 2; k++) {
      const h = rr(42, 66); let x0, z0, x1, z1; const off = k === 0 ? 4 : (alongX ? lz1 - lz0 : lx1 - lx0) - 16;
      if (alongX) { x0 = lx0 + 3; x1 = x0 + L; z0 = lz0 + off; z1 = z0 + 12; } else { z0 = lz0 + 3; z1 = z0 + L; x0 = lx0 + off; x1 = x0 + 12; }
      const r = building(kind, x0, z0, x1, z1, h);
      const s = SIGNS.slots.byName[nm]; for (const side of alongX ? ['S', 'N'] : ['E', 'W']) { const fc = { N: [r.cx, z0], S: [r.cx, z1], E: [x1, r.cz], W: [x0, r.cz] }[side]; signQuad(r.ck, side, fc[0], fc[1], h - 5.5, 14, 3.4, s.uv, .05); }
    }
    roof(ck, 'grass', lx0 + 1, lz0 + 1, lx1 - 1, lz1 - 1, .19, 6); trees(lx0 + 2, lz0 + 2, lx1 - 2, lz1 - 2, 'pine', 10, true);
    PARK_SPOTS.push(alongX ? { x0: lx0 + 6, z0: lz0 + 22, x1: lx1 - 6, z1: lz1 - 22 } : { x0: lx0 + 22, z0: lz0 + 6, x1: lx1 - 22, z1: lz1 - 6 });
    trees(bx0, bz0, bx1, bz1, 'leaf');
  } else { // 빌라촌
    for (let ix = 0; ix < 3; ix++)for (let iz = 0; iz < 3; iz++) { if (ix === 1 && iz === 1) continue; const w = (lx1 - lx0) / 3, x0 = lx0 + ix * w + 1.5, z0 = lz0 + iz * w + 1.5; building('villa', x0 + .5, z0 + .5, x0 + w - 5, z0 + w - 5, 11.6 + (R() < .5 ? 2.9 : 0)); }
    PARK_SPOTS.push({ x0: lx0 + (lx1 - lx0) / 3 + 2, z0: lz0 + (lz1 - lz0) / 3 + 2, x1: lx1 - (lx1 - lx0) / 3 - 2, z1: lz1 - (lz1 - lz0) / 3 - 2 });
    trees(bx0, bz0, bx1, bz1, 'ginkgo');
  }
}
const PARK_SPOTS = [];
const TREES = [];
function tree(x, z, kind, big) {
  const ck = chunkOf(x, z), s = big ? rr(1.1, 1.4) : rr(.85, 1.1); addGeo(ck, 'trunk', new T.CylinderGeometry(.12 * s, .18 * s, 3 * s, 6), mat4(x, .18 + 1.5 * s, z));
  if (kind === 'pine') { addGeo(ck, 'pine', new T.ConeGeometry(1.6 * s, 4 * s, 7), mat4(x, .18 + 4 * s, z)); addGeo(ck, 'pine', new T.ConeGeometry(1.2 * s, 3 * s, 7), mat4(x, .18 + 5.6 * s, z)); }
  else { const m = kind; for (let k = 0; k < 3; k++) addGeo(ck, m, new T.IcosahedronGeometry(1.25 * s * (1 - k * .18), 1), mat4(x + rand(-.3, .3), .18 + (3.2 + k * .9) * s, z + rand(-.3, .3), 0, 1, 1.15, 1)); }
  addCircle(x, z, .3, 6); TREES.push([x, z]);
}
function trees(x0, z0, x1, z1, kind, step, inner) {
  step = step || 12; if (inner) { for (let i = 0; i < 6; i++) { const x = rr(x0, x1), z = rr(z0, z1); if (!colQuery(x, z, 2).some(o => !o.circ && x > o.x0 - 2 && x < o.x1 + 2 && z > o.z0 - 2 && z < o.z1 + 2)) tree(x, z, kind, true); } return; }
  const e = 1.1; // 인도 가장자리 (차도 쪽)
  for (let x = x0 + 8; x < x1 - 6; x += step) { tree(x, z0 + e, kind); tree(x, z1 - e, kind); }
  for (let z = z0 + 8; z < z1 - 6; z += step) { tree(x0 + e, z, kind); tree(x1 - e, z, kind); }
}

/* ---------- 특별한 블록 ---------- */
function genSpecial(kind, bi, bj, bx0, bz0, bx1, bz1, lx0, lz0, lx1, lz1, ck) {
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
  if (kind === 'plaza') { // 숭례문 광장
    roof(ck, 'stone', lx0, lz0, lx1, lz1, .2, 3); BUILD.landmarks.gate = { x: cx, z: cz };
    slab(ck, 'stone', cx - 12, cz - 6, cx + 12, cz + 6, .18, 6, 3); addBox(cx - 12, cz - 6, cx - 2, cz + 6, 12); addBox(cx + 2, cz - 6, cx + 12, cz + 6, 12);
    slab(ck, 'dancheong', cx - 10.5, cz - 4.8, cx + 10.5, cz + 4.8, 6, 10.5, 3);
    for (const [y, w, d, hh] of [[10.5, 15, 8.5, 2.2], [13.6, 11, 6.5, 2]]) {
      const g = new T.CylinderGeometry(.5, 1, hh, 4, 1); const m = mat4(cx, y + hh / 2, cz, Math.PI / 4, w * .78, 1, d * .78); addGeo(ck, 'hanokRoof', g, m);
      if (y < 12) slab(ck, 'dancheong', cx - 6, cz - 3.2, cx + 6, cz + 3.2, y + hh, y + hh + 1.1, 3);
    }
    addGeo(ck, 'wood', new T.BoxGeometry(4, 6, 12.5), mat4(cx, 3.2, cz)); // 문 속 (어두운 나무)
    trees(lx0, lz0, lx1, lz1, 'pine', 0, true); trees(bx0, bz0, bx1, bz1, 'pine', 14);
    return;
  }
  if (kind === 'tower') { // 초고층 랜드마크
    const s = 13; let y = .18; const segs = [[s, 140], [s * .82, 110], [s * .62, 80], [s * .4, 60]]; for (const [hs, hh] of segs) { walls(ck, 'glassS', cx - hs, cz - hs, cx + hs, cz + hs, y, y + hh, 12, 28.8); y += hh; }
    roof(ck, 'roof', cx - 5, cz - 5, cx + 5, cz + 5, y); addGeo(ck, 'metal', new T.ConeGeometry(4, 40, 4), mat4(cx, y + 20, cz, Math.PI / 4)); addBox(cx - s, cz - s, cx + s, cz + s, 400, 'bld');
    walls(ck, 'lobby', cx - s - .1, cz - s - .1, cx + s + .1, cz + s + .1, .18, 8, 4, 5.2); BUILD.landmarks.tower = { x: cx, z: cz + s + 6 };
    roof(ck, 'stone', lx0, lz0, lx1, lz1, .19, 3); trees(bx0, bz0, bx1, bz1, 'ginkgo'); PARK_SPOTS.push({ x0: lx0 + 2, z0: cz + s + 4, x1: lx1 - 2, z1: lz1 - 2 });
    return;
  }
  if (kind === 'police' || kind === 'hospital') {
    const pol = kind === 'police'; const x0 = lx0 + 4, x1 = lx1 - 4, z0 = lz0 + 4, z1 = lz0 + 24;
    const r = building(pol ? 'glassS' : 'apt2', x0, z0, x1, z1, pol ? 18 : 30, { lobby: true });
    const s = SIGNS.slots.byName[pol ? '경찰서' : '병원']; signQuad(r.ck, 'S', r.cx, z1, 6, 12, 2.6, s.uv, .1);
    if (!pol) { slab(ck, 'red', r.cx - .6, z1, r.cx + .6, z1 + .2, 20, 26, 2); slab(ck, 'red', r.cx - 3, z1, r.cx + 3, z1 + .2, 22.4, 23.6, 2); }
    roof(ck, 'asphalt', lx0, z1 + 2, lx1, lz1, .2, 10); BUILD.landmarks[kind] = { x: r.cx, z: z1 + 6, yaw: 0 };
    PARK_SPOTS.push({ x0: lx0 + 4, z0: z1 + 8, x1: lx1 - 4, z1: lz1 - 6, kind: pol ? 'police' : null });
    trees(bx0, bz0, bx1, bz1, 'leaf'); return;
  }
  if (kind === 'garage') { // 정비소 (수배 지우기)
    const x0 = lx0 + 6, x1 = lx0 + 30, z0 = lz1 - 20, z1 = lz1; // 동쪽은 다른 가게
    building('shopB', x0, z0, x1, z0 + 2, 9); building('shopB', x0, z0, x0 + 2, z1, 9); building('shopB', x1 - 2, z0, x1, z1, 9); roof(ck, 'roof', x0, z0, x1, z1, 9.18);
    roof(ck, 'darkMetal', x0 + 2, z0 + 2, x1 - 2, z1, .21, 4);
    const s = SIGNS.slots.byName['정비소 · 도색']; signQuad(ck, 'S', (x0 + x1) / 2, z1, 7, 14, 2, s.uv, .2);
    slab(ck, 'yellow', x0, z1 - .2, x1, z1, 9, 9.4, 2);
    BUILD.landmarks.garage = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 + 2, x0: x0 + 2, x1: x1 - 2, z0: z0 + 2, z1: z1 + 1 };
    for (const [a, b] of [[lx0 + 34, lx1]]) { shopBuilding(bx0, bz0, bx1, bz1, a, lz0, b, lz0 + 16); shopBuilding(bx0, bz0, bx1, bz1, a, lz1 - 16, b, lz1); }
    shopBuilding(bx0, bz0, bx1, bz1, lx0, lz0, lx0 + 30, lz0 + 16);
    trees(bx0, bz0, bx1, bz1, 'ginkgo'); return;
  }
  if (kind === 'chicken') { // 치킨집 있는 상가
    const dep = 15; let first = true;
    for (let a = lx0; a < lx1 - 6; a += 12) { shopBuilding(bx0, bz0, bx1, bz1, a, lz1 - dep, Math.min(lx1, a + 11), lz1, first ? '서울치킨' : null); first = false; shopBuilding(bx0, bz0, bx1, bz1, a, lz0, Math.min(lx1, a + 11), lz0 + dep); }
    roof(ck, 'asphalt', lx0, lz0 + dep, lx1, lz1 - dep, .2, 10); PARK_SPOTS.push({ x0: lx0 + 3, z0: lz0 + dep + 3, x1: lx1 - 3, z1: lz1 - dep - 3 });
    trees(bx0, bz0, bx1, bz1, 'ginkgo'); return;
  }
  if (kind === 'park') {
    roof(ck, 'grass', lx0, lz0, lx1, lz1, .19, 6); trees(lx0 + 3, lz0 + 3, lx1 - 3, lz1 - 3, 'leaf', 0, true); trees(lx0 + 3, lz0 + 3, lx1 - 3, lz1 - 3, 'ginkgo', 0, true);
    roof(ck, 'paving', cx - 2, lz0, cx + 2, lz1, .2, 4); roof(ck, 'paving', lx0, cz - 2, lx1, cz + 2, .2, 4);
    addGeo(ck, 'stone', new T.CylinderGeometry(4, 4.4, .8, 24), mat4(cx, .5, cz)); addCircle(cx, cz, 4.3, 1);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = cx + Math.cos(a) * 9, z = cz + Math.sin(a) * 9; addGeo(ck, 'wood', new T.BoxGeometry(2, .12, .6), mat4(x, .62, z, -a)); }
    trees(bx0, bz0, bx1, bz1, 'ginkgo'); BUILD.landmarks.park = { x: cx, z: cz + 8 }; return;
  }
}

/* ---------- 도로 · 가로등 · 신호등 ---------- */
function genRoads() {
  const ext = LIM + RH;
  // 아스팔트 (도시 전체 + 다리 진입)
  const asp = new T.Mesh(new T.PlaneGeometry(ext * 2, ext * 2), MATS.asphalt); asp.rotation.x = -Math.PI / 2; asp.receiveShadow = true;
  asp.geometry.attributes.uv.array.forEach((v, i, a) => a[i] = v * ext * 2 / 14); scene.add(asp);
  // 차선 표시 (구간마다)
  const mb = bucket('roads', 'mark');
  for (let k = -NR; k <= NR; k++)for (let i = -NR; i < NR; i++) {
    const c = k * P, a0 = i * P + RH, a1 = (i + 1) * P - RH, y = .02;
    // x 방향 도로 (z=c): u=0 at z=c-RH
    quad(mb, [a0, y, c + RH], [a1, y, c + RH], [a1, y, c - RH], [a0, y, c - RH], [0, 1, 0], [1, 0, 0, 1].length && [0, 0, 1, 1]);
    // 위 uv: (a0,c+RH)=(u0,v0)... 정확히 맞추려고 직접 넣어요
    mb.uv.splice(mb.uv.length - 12, 12, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0);
    // z 방향 도로 (x=c): u=0 at x=c+RH, v=0 at z=a0
    quad(mb, [c + RH, y, a0], [c + RH, y, a1], [c - RH, y, a1], [c - RH, y, a0], [0, 1, 0], [0, 0, 1, 1]);
    mb.uv.splice(mb.uv.length - 12, 12, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
  }
  // 도시 밖 땅
  const gr = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshStandardMaterial({ color: lin('#4a5a3a'), roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.y = -.05; gr.receiveShadow = true; scene.add(gr);
  // 가로등 · 신호등
  for (let i = -NR; i < NR; i++)for (let j = -NR; j < NR; j++) {
    const bx0 = i * P + RH, bz0 = j * P + RH, bx1 = (i + 1) * P - RH, bz1 = (j + 1) * P - RH; const ck = chunkOf(bx0 + 30, bz0 + 30);
    for (let x = bx0 + 14; x < bx1 - 10; x += 26) { lamp(ck, x, bz0 + .5, 1); lamp(ck, x, bz1 - .5, -1); }
    for (let z = bz0 + 14; z < bz1 - 10; z += 26) { lampZ(ck, bx0 + .5, z, 1); lampZ(ck, bx1 - .5, z, -1); }
  }
  for (let i = -NR; i <= NR; i++)for (let j = -NR; j <= NR; j++) trafficLights(i * P, j * P);
}
function lamp(ck, x, z, dir) { addGeo(ck, 'darkMetal', new T.CylinderGeometry(.08, .12, 7, 6), mat4(x, 3.68, z)); addGeo(ck, 'darkMetal', new T.BoxGeometry(.1, .1, 2), mat4(x, 7.1, z - dir * 1)); addGeo(ck, 'lampHead', new T.BoxGeometry(.35, .14, .7), mat4(x, 7.02, z - dir * 1.9)); addCircle(x, z, .18, 7); }
function lampZ(ck, x, z, dir) { addGeo(ck, 'darkMetal', new T.CylinderGeometry(.08, .12, 7, 6), mat4(x, 3.68, z)); addGeo(ck, 'darkMetal', new T.BoxGeometry(2, .1, .1), mat4(x - dir * 1, 7.1, z)); addGeo(ck, 'lampHead', new T.BoxGeometry(.7, .14, .35), mat4(x - dir * 1.9, 7.02, z)); addCircle(x, z, .18, 7); }
function trafficLights(nx, nz) {
  // 교차로 4모서리에 기둥. 각 기둥에 맞은편에서 오는 차를 위한 신호등
  const ck = chunkOf(nx, nz); const e = RH + .8;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = nx + sx * e, pz = nz + sz * e; if (Math.abs(px) > LIM + RH || Math.abs(pz) > LIM + RH) continue;
    addGeo(ck, 'tlBody', new T.CylinderGeometry(.1, .12, 5.5, 6), mat4(px, 2.9, pz)); addCircle(px, pz, .2, 6);
    // x축 신호 (z 방향으로 뻗은 팔): 진행 방향 +x 차량은 오른쪽(+z)… 단순하게: 팔이 도로 위로
    const arm = (ax) => {
      const dx = ax === 'x' ? 0 : -sx, dz = ax === 'x' ? -sz : 0; // 도로 쪽으로
      const L = 5.2; addGeo(ck, 'tlBody', new T.BoxGeometry(Math.abs(dx) * L + .12, .12, Math.abs(dz) * L + .12), mat4(px + dx * L / 2, 5.5, pz + dz * L / 2));
      const hx = px + dx * L, hz = pz + dz * L; const face = ax === 'x' ? (sx > 0 ? -1 : 1) : (sz > 0 ? -1 : 1); // 오는 차를 바라보게
      const ry = ax === 'x' ? (face > 0 ? Math.PI / 2 : -Math.PI / 2) : (face > 0 ? 0 : Math.PI);
      addGeo(ck, 'tlBody', new T.BoxGeometry(1.5, .5, .35), mat4(hx, 5.5, hz, ry));
      ['r', 'y', 'g'].forEach((c, k) => { const lx = (k - 1) * .45; const ox = Math.cos(ry) * lx, oz = -Math.sin(ry) * lx; const fx = Math.sin(ry) * .19, fz = Math.cos(ry) * .19; addGeo(ck, 'tl' + ax + c, new T.CircleGeometry(.17, 12), new T.Matrix4().compose(new T.Vector3(hx + ox + fx, 5.5, hz + oz + fz), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1))); });
    };
    if (sx === sz) arm('x'); else arm('z');
  }
}

/* ---------- 한강 · 다리 · 배경 ---------- */
let WATER = null;
function genRiver() {
  const ck = 'river';
  // 강변 공원
  slab(ck, 'curb', -LIM - RH - 60, LIM + RH, LIM + RH + 60, RIVER.z0, 0, .18, 4, 'grass');
  roof(ck, 'paving', -LIM - RH - 60, RIVER.z0 - 6, LIM + RH + 60, RIVER.z0 - 2, .2, 4);
  for (let x = -LIM; x < LIM; x += 18) if (Math.abs(x) > 14) tree(x + rand(-3, 3), LIM + RH + 5, R() < .5 ? 'ginkgo' : 'leaf');
  // 강물
  const nt = ctex(256, 256, (g, W, H) => { const im = g.createImageData(W, H); for (let y = 0; y < H; y++)for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const a = Math.sin(x * .1 + Math.sin(y * .05) * 3) * .5 + Math.sin(y * .13 + x * .02) * .5; im.data[i] = 128 + a * 30; im.data[i + 1] = 128 + Math.cos(y * .09) * 30; im.data[i + 2] = 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }, [40, 20]); nt.encoding = T.LinearEncoding;
  WATER = new T.Mesh(new T.PlaneGeometry(3000, RIVER.z1 - RIVER.z0 + 200), new T.MeshStandardMaterial({ color: '#2a5a6e', roughness: .12, metalness: .55, normalMap: nt, normalScale: new T.Vector2(.35, .35), envMapIntensity: 1.3 }));
  WATER.rotation.x = -Math.PI / 2; WATER.position.set(0, -1.2, (RIVER.z0 + RIVER.z1) / 2); scene.add(WATER);
  // 강둑
  slab(ck, 'stone', -1500, RIVER.z0 - .5, 1500, RIVER.z0, -1.4, .18, 4); slab(ck, 'stone', -1500, RIVER.z1, 1500, RIVER.z1 + .5, -1.4, .18, 4);
  addBox(-2000, RIVER.z0 - .1, -BRIDGE.hw - 1, RIVER.z0 + 1, 3); addBox(BRIDGE.hw + 1, RIVER.z0 - .1, 2000, RIVER.z0 + 1, 3);
  // 다리
  const z0 = BRIDGE.z0 + 14, z1 = BRIDGE.z1, hw = BRIDGE.hw;
  const deck = new T.BufferGeometry(); const pos = [], uv = [], nor = []; const n = 40;
  for (let i = 0; i < n; i++) { const za = z0 + (z1 - z0) * i / n, zb = z0 + (z1 - z0) * (i + 1) / n, ya = bridgeY(za) + .02, yb = bridgeY(zb) + .02; pos.push(-hw, ya, za, hw, ya, za, hw, yb, zb, -hw, ya, za, hw, yb, zb, -hw, yb, zb); for (let k = 0; k < 6; k++)nor.push(0, 1, 0); uv.push(0, za / 14, hw * 2 / 14, za / 14, hw * 2 / 14, zb / 14, 0, za / 14, hw * 2 / 14, zb / 14, 0, zb / 14); }
  deck.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); deck.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); deck.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  const dm = new T.Mesh(deck, Object.assign(MATS.asphalt.clone(), { side: T.DoubleSide })); dm.receiveShadow = true; scene.add(dm);
  addGeo(ck, 'bridge', new T.BoxGeometry(hw * 2 + 2, 1.6, z1 - z0 - 60), mat4(0, 3.1, (z0 + z1) / 2));
  for (let z = RIVER.z0 + 30; z < z1 - 20; z += 60) addGeo(ck, 'bridge', new T.BoxGeometry(6, 8, 4), mat4(0, -2, z));
  for (const s of [-1, 1]) { // 난간 + 아치
    for (let i = 0; i < n; i++) { const za = z0 + (z1 - z0) * i / n, zb = za + (z1 - z0) / n; addGeo(ck, 'railing', new T.BoxGeometry(.15, 1.1, zb - za), mat4(s * (hw + .1), bridgeY((za + zb) / 2) + .55, (za + zb) / 2)); }
    addBox(s * (hw + .1) - .2, z0, s * (hw + .1) + .2, z1, 4);
    for (let a = 0; a < 3; a++) { const zc = RIVER.z0 + 60 + a * 110; for (let k = 0; k < 16; k++) { const t0 = k / 16, t1 = (k + 1) / 16; const zA = zc - 50 + t0 * 100, zB = zc - 50 + t1 * 100, yA = 4 + Math.sin(t0 * Math.PI) * 18, yB = 4 + Math.sin(t1 * Math.PI) * 18; const len = Math.hypot(zB - zA, yB - yA); const m = new T.Matrix4().compose(new T.Vector3(s * (hw + .4), (yA + yB) / 2, (zA + zB) / 2), new T.Quaternion().setFromEuler(new T.Euler(-Math.atan2(yB - yA, zB - zA), 0, 0)), new T.Vector3(1, 1, 1)); addGeo(ck, 'bridge', new T.BoxGeometry(.6, .8, len + .1), m); if (k % 2) addGeo(ck, 'railing', new T.CylinderGeometry(.04, .04, yA - 4, 4), mat4(s * (hw + .4), 4 + (yA - 4) / 2, zA)); } }
  }
  for (let z = z0; z < z1; z += 30) { lamp(ck, -hw - .2, z, -1); }
  addBox(-hw, z1 - 1, hw, z1 + 3, 5); // 다리 끝 (공사중)
  addGeo(ck, 'yellow', new T.BoxGeometry(hw * 2, 1.2, .4), mat4(0, bridgeY(z1 - 2) + .6, z1 - 2));
  // 강 건너편 빌딩 숲
  for (let x = -900; x < 900; x += rr(18, 30)) { const h = rr(20, 90), w = rr(12, 22), z = RIVER.z1 + rr(10, 60); const k = rpick(['apt', 'apt2', 'glassB', 'glassS', 'apt']); walls('far' + Math.floor(x / 300), k, x, z, x + w, z + w, 0, h, MATS[k].tw, MATS[k].th); roof('far' + Math.floor(x / 300), 'roof', x, z, x + w, z + w, h); }
}
function genBackdrop() {
  // 도시 바깥 (북 · 동 · 서) 빌딩 숲: 막혀 있어요
  const ext = LIM + RH;
  for (const [x0, z0, x1, z1] of [[-ext - 160, -ext - 160, ext + 160, -ext], [-ext - 160, -ext, -ext, RIVER.z0 - 2], [ext, -ext, ext + 160, RIVER.z0 - 2]]) {
    addBox(x0, z0, x1, z1, 300);
    for (let x = x0; x < x1 - 10; x += rr(20, 34)) for (let z = z0; z < z1 - 10; z += rr(20, 34)) {
      const w = rr(12, 20), d = rr(12, 20), near = Math.min(Math.abs(Math.abs(x) - ext), Math.abs(Math.abs(z) - ext)); const h = rr(12, 50) + (near < 40 ? 0 : rr(0, 40));
      const k = rpick(['apt', 'apt2', 'shopA', 'shopB', 'villa', 'glassB']); const ck = chunkOf(x, z); walls(ck, k, x, z, x + w, z + d, 0, h, MATS[k].tw, MATS[k].th); roof(ck, 'roof', x, z, x + w, z + d, h);
      if (near < 30 && R() < .5) { const s = rpick(SIGNS.slots.h); signQuad(ck, x < -ext + 1 ? 'E' : x > ext - 1 ? 'W' : 'S', x + w / 2, z + d, 4.5, w - 2, 1.5, s.uv, .2); }
    }
  }
  // 남산 + 타워
  const hill = new T.Mesh(new T.ConeGeometry(260, 140, 18, 4), MATS.hill); hill.position.set(-120, 30, -760); hill.scale.z = .7; scene.add(hill);
  const tw = new T.Group(); const wm = MATS.white;
  const sh = new T.Mesh(new T.CylinderGeometry(4, 7, 95, 16), wm); sh.position.y = 47; tw.add(sh);
  const deck = new T.Mesh(new T.CylinderGeometry(13, 10, 14, 24), MATS.glassS); deck.position.y = 100; tw.add(deck);
  const top = new T.Mesh(new T.CylinderGeometry(9, 13, 6, 24), wm); top.position.y = 110; tw.add(top);
  for (let k = 0; k < 6; k++) { const a = new T.Mesh(new T.CylinderGeometry(1.4 - k * .2, 1.6 - k * .2, 10, 8), k % 2 ? MATS.red : wm); a.position.y = 118 + k * 10; tw.add(a); }
  const blink = new T.Mesh(new T.SphereGeometry(1.2, 8, 6), new T.MeshBasicMaterial({ color: '#ff3030' })); blink.position.y = 176; tw.add(blink); BUILD.blink = blink;
  tw.position.set(-120, 96, -760); scene.add(tw);
  // 산 능선 (북한산 느낌)
  for (let k = 0; k < 26; k++) { const a = Math.PI * (1.05 + k / 25 * .9), r = rr(950, 1150); const m = new T.Mesh(new T.ConeGeometry(rr(160, 260), rr(120, 260), 7), MATS.hill); m.position.set(Math.cos(a) * r, 40, Math.sin(a) * r); scene.add(m); }
  // 동쪽 초고층 (배경)
  const st = new T.Mesh(new T.CylinderGeometry(6, 26, 420, 4), MATS.glassS); st.position.set(780, 210, 120); st.rotation.y = Math.PI / 4; scene.add(st);
}

/* ---------- 합치기 ---------- */
const CITY_MESHES = [];
function flushBuckets() {
  for (const [k, b] of BK) {
    if (!b.pos.length) continue; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(b.nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2)); g.computeBoundingSphere();
    const m = new T.Mesh(g, MATS[b.mk]); m.matrixAutoUpdate = false; const cast = !['mark', 'sign', 'paving', 'grass', 'asphalt', 'lampHead', 'tlBody', 'tlxr', 'tlxy', 'tlxg', 'tlzr', 'tlzy', 'tlzg', 'darkMetal', 'curb', 'stone'].includes(b.mk) && !k.startsWith('far'); m.castShadow = cast; m.receiveShadow = true; scene.add(m); CITY_MESHES.push(m);
  }
  BK.clear();
}
/* 길 이름 · 동네 이름 */
const ROADS_X = ['북악로', '사직로', '종로', '을지로', '퇴계로', '한강대로', '강변북로'];
const ROADS_Z = ['연희로', '홍익로', '신촌로', '세종대로', '남대문로', '테헤란로', '강남대로'];
function areaName(x, z) { const ix = x < -P ? 0 : x < P ? 1 : 2, iz = z < -P ? 0 : z < P ? 1 : 2; if (z > LIM + RH) return '한강'; return [['홍대', '종로', '성수'], ['신촌', '명동', '이태원'], ['여의도', '용산', '강남']][iz][ix]; }
function roadName(x, z) { const kz = Math.round(z / P), kx = Math.round(x / P); const dz = Math.abs(z - kz * P), dx = Math.abs(x - kx * P); if (dz < RH && dz <= dx) return ROADS_X[kz + NR]; if (dx < RH) return ROADS_Z[kx + NR]; return ''; }

function genCity() {
  initMats(); initTL();
  for (let i = -NR; i < NR; i++)for (let j = -NR; j < NR; j++) genBlock(i, j);
  genRoads(); genRiver(); genBackdrop(); flushBuckets();
}
