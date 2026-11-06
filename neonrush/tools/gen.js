// Level generator with fairness verification.
// Each chunk is accepted only if it can be beaten on a coarse input grid at every phase offset,
// which guarantees a minimum timing window per difficulty.
const E = require('../src/engine.js');
const fs = require('fs');

const TIERS = [
  { name: 'Easy',   N: 32, k: 4, gap: [6, 10], shipGap: 5.2, speeds: [1],       secLen: [9, 12], shipLen: [4, 5] },
  { name: 'Normal', N: 24, k: 4, gap: [6, 10], shipGap: 4.4, speeds: [1],       secLen: [9, 11], shipLen: [5, 6] },
  { name: 'Hard',   N: 16, k: 4, gap: [4, 7],  shipGap: 3.7, speeds: [1, 1, 2], secLen: [10, 12], shipLen: [6, 7] },
  { name: 'Harder', N: 12, k: 4, gap: [3, 6],  shipGap: 3.2, speeds: [1, 2],    secLen: [10, 12], shipLen: [6, 8] },
  { name: 'Insane', N: 8,  k: 4, gap: [2, 5],  shipGap: 2.8, speeds: [2, 2, 3], secLen: [11, 13], shipLen: [7, 9] },
  { name: 'Demon',  N: 6,  k: 3, gap: [2, 4],  shipGap: 2.4, speeds: [2, 3],    secLen: [12, 14], shipLen: [8, 10] },
];

const LEVELS = [
  { name: 'First Steps',     tier: 0, stars: 1, secs: 4, seed: 11 },
  { name: 'Blue Horizon',    tier: 0, stars: 2, secs: 5, seed: 22 },
  { name: 'Green Valley',    tier: 1, stars: 3, secs: 4, seed: 33 },
  { name: 'Pulse Runner',    tier: 1, stars: 3, secs: 5, seed: 44 },
  { name: 'Orange Crush',    tier: 2, stars: 4, secs: 5, seed: 55 },
  { name: 'Night Drive',     tier: 2, stars: 5, secs: 5, seed: 66 },
  { name: 'Metro Line',      tier: 2, stars: 5, secs: 6, seed: 77 },
  { name: 'Red Alert',       tier: 3, stars: 6, secs: 6, seed: 88 },
  { name: 'Overclock',       tier: 3, stars: 7, secs: 6, seed: 99 },
  { name: 'Static Storm',    tier: 3, stars: 7, secs: 7, seed: 111 },
  { name: 'Prism Break',     tier: 4, stars: 8, secs: 7, seed: 122 },
  { name: 'Hyperdrive',      tier: 4, stars: 9, secs: 7, seed: 133 },
  { name: 'Voltage',         tier: 4, stars: 9, secs: 8, seed: 144 },
  { name: 'Abyss',           tier: 5, stars: 10, secs: 8, seed: 155 },
  { name: 'Doomsday Engine', tier: 5, stars: 10, secs: 8, seed: 166 },
  { name: 'Event Horizon',   tier: 5, stars: 10, secs: 9, seed: 177 },
];

const PALETTES = [
  ['#1f49d6', '#163bb5'], ['#6b22d8', '#5418b0'], ['#c2186b', '#9b1155'], ['#d9541a', '#b04212'],
  ['#0e9e8c', '#0a7a6c'], ['#b8860b', '#8f6808'], ['#1a8f2e', '#136e22'], ['#2b2b6e', '#1d1d52'],
  ['#a01818', '#7a1010'], ['#0f6fb8', '#0a5490'], ['#7d1fa0', '#5f1479'], ['#3a3a3a', '#262626'],
];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- chunk library (x relative, returns width) ----------
const R = Math.round;
const round = v => typeof v === 'number' ? Math.round(v * 100) / 100 : v;
const CUBE = [
  { d: 0, f: c => { c.spk(0); return 1; } },
  { d: 0, f: c => { c.spk(0, 0, 2); return 2; } },
  { d: 0, f: c => { c.blk(0, 0, 2, 1); return 2; } },
  { d: 0, f: c => { c.blk(0, 0, 3, 1); c.blk(3, 0, 3, 2); return 6; } },
  { d: 0, f: c => { c.blk(0, 0, 4, 1); c.spk(1, 1); return 4; } },
  { d: 0, f: c => { c.sspk(0, 0, 2); return 2; } },
  { d: 0, f: c => { c.pad(0); c.spk(R(3 * c.sf), 0, 2); return R(3 * c.sf) + 2; } },
  { d: 1, f: c => { c.blk(0, 0, 3, 1); c.blk(3, 0, 3, 2); c.blk(6, 0, 3, 3); return 9; } },
  { d: 1, f: c => { c.blk(0, 0, 2, 1); c.spk(2, 0, 2); c.blk(4, 0, 2, 2); return 6; } },
  { d: 1, f: c => { c.blk(0, 0, 4, 1); c.spk(4); return 5; } },
  { d: 1, f: c => { c.saw(0.5, -0.15, 1.0); return 1; } },
  { d: 1, f: c => { const p = R(4 * c.sf); c.pad(0); c.spk(1, 0, p - 1); c.blk(p, 0, 5, 3); return p + 5; } },
  { d: 1, f: c => { const n = R(7 * c.sf); c.blk(0, 0, 3, 2); c.spk(3, 0, n); c.orb(3 + R(2.5 * c.sf), 4.2); c.blk(3 + n, 0, 4, 2); return 7 + n; } },
  { d: 1, f: c => { c.spk(0); c.spk(R(4.5 * c.sf)); return R(4.5 * c.sf) + 1; } },
  { d: 2, f: c => { c.spk(0, 0, 3); return 3; } },
  { d: 2, f: c => { c.blk(0, 0, 9, 2); c.spk(3, 2); c.spk(7, 2); return 9; } },
  { d: 2, f: c => { c.blk(0, 0, 2, 1); c.spk(2, 0, 2); c.blk(4, 0, 2, 2); c.spk(6, 0, 2); c.blk(8, 0, 2, 3); return 10; } },
  { d: 2, f: c => { c.pad(0, 0, 1); c.spk(1, 0, 2); return 3; } },
  { d: 2, f: c => { c.spk(0); c.sspk(R(3.5 * c.sf)); c.spk(R(7 * c.sf)); return R(7 * c.sf) + 1; } },
  { d: 2, f: c => { c.saw(0.5, -0.15, 1.0); c.saw(R(4.5 * c.sf) + 0.5, -0.15, 1.0); return R(4.5 * c.sf) + 1; } },
  { d: 2, f: c => { c.blk(0, 0, 1, 1); c.spk(1, 0, 3); c.blk(4, 0, 1, 1); c.spk(5, 0, 3); c.blk(8, 0, 1, 1); return 9; } },
  { d: 3, f: c => { const n = R(11 * c.sf); c.blk(0, 0, 3, 3); c.spk(3, 0, n); c.orb(3 + R(3 * c.sf), 4.5); c.orb(3 + R(7 * c.sf), 4.5); c.blk(3 + n, 0, 4, 2); return 7 + n; } },
  { d: 3, f: c => { c.spk(0, 0, 3); c.spk(3 + R(2.5 * c.sf), 0, 2); return 5 + R(2.5 * c.sf); } },
  { d: 3, f: c => { c.blk(0, 0, 1, 1); c.spk(1, 0, 4); c.blk(5, 0, 1, 2); c.spk(6, 0, 4); c.blk(10, 0, 1, 3); return 11; } },
  { d: 3, f: c => { c.blk(0, 0, 6, 3); c.spk(6, 0, 3); c.saw(2.5, 5.4, 0.9); return 9; } },
  { d: 3, f: c => { const p = R(4 * c.sf); c.pad(0, 0, 1); c.spk(1, 0, 2); c.orb(p, 2.8); c.spk(3, 0, p); c.blk(3 + p, 0, 4, 2); return 7 + p; } },
  { d: 4, f: c => { c.spk(0, 0, 5); c.orb(1, 2.2); return 5; } },
  { d: 4, f: c => { c.spk(0, 0, 3); c.blk(3, 0, 1, 1); c.spk(4, 0, 3); return 7; } },
  { d: 4, f: c => { c.blk(0, 0, 2, 2); c.saw(3.5, 0.6, 1.1); c.blk(5, 0, 2, 2); c.spk(5, 2); return 7; } },
  { d: 4, f: c => { const n = R(13 * c.sf); c.spk(0, 0, n); c.orb(R(1.5 * c.sf), 2.4); c.orb(R(5.5 * c.sf), 3.2, 1); c.orb(R(9 * c.sf), 3.2); c.blk(n, 0, 4, 2); return n + 4; } },
  { d: 5, f: c => { c.spk(0, 0, 3); c.blk(3, 0, 1, 2); c.spk(4, 0, 3); c.blk(7, 0, 1, 3); c.spk(8, 0, 2); return 10; } },
  { d: 5, f: c => { c.saw(0.5, 0.3, 1.0); c.saw(R(3.6 * c.sf) + 0.5, 0.3, 1.0); c.saw(R(7.2 * c.sf) + 0.5, 0.3, 1.0); return R(7.2 * c.sf) + 1; } },
];
const SHIP = [
  { d: 0, f: c => { const h = 2 + R(c.rnd() * 2); c.blk(0, 0, 2, h); return 2; } },
  { d: 0, f: c => { const h = 2 + R(c.rnd() * 2); c.blk(0, 10 - h, 2, h); return 2; } },
  { d: 1, f: c => { const g = c.T.shipGap + 0.6, a = 1 + c.rnd() * (8.5 - g); c.blk(0, 0, 2, a); c.blk(0, a + g, 2, 10 - a - g); return 2; } },
  { d: 1, f: c => { c.saw(1, 3 + c.rnd() * 4, 1.1); return 2; } },
  { d: 1, f: c => { const h = 3 + R(c.rnd() * 2); c.blk(0, 0, 2, h); c.spk(0, h, 2); return 2; } },
  { d: 2, f: c => { const len = 12 + R(c.rnd() * 8), g = c.T.shipGap + 1.4, f = 1 + c.rnd() * (8 - g);
      c.blk(0, 0, len, f); c.blk(0, f + g, len, 10 - f - g);
      for (let x = 4; x < len - 2; x += 6) { if ((x / 6 | 0) % 2) c.spk(x, f); else c.spk(x, f + g - 1, 1, 1); }
      return len; } },
  { d: 3, f: c => { const g = c.T.shipGap + 0.4; let w = 0;
      for (let i = 0; i < 3; i++) { const a = i % 2 ? 6 - g / 2 : 2.5; const x = R(i * 6 * c.sf); c.blk(x, 0, 2, a); c.blk(x, a + g, 2, 10 - a - g); w = x + 2; }
      return w; } },
  { d: 4, f: c => { c.saw(1, 2.5, 1.2); c.saw(R(5 * c.sf) + 1, 7.5, 1.2); return R(5 * c.sf) + 2; } },
];

// ---------- verification (coarse-grid BFS per phase) ----------
const key = s => `${s.mode}|${Math.round(s.y * 12)}|${Math.round(s.vy * 1.5)}|${s.onGround}|${s.holding}|${s.used.size}|${s.pressBuf > 0}`;
function initFront(N, p) { return { N, layer: [{ s: E.newState(), path: null }], first: p }; }
function advance(L, F, xTarget) {
  let layer = F.layer;
  let guard = 0;
  while (layer.length && layer[0].s.x < xTarget && !layer[0].s.won) {
    const next = new Map();
    const n = F.first != null ? F.first : F.N;
    for (const node of layer) {
      for (const h of (F.first != null ? [false] : [false, true])) {
        const s = E.clone(node.s);
        for (let i = 0; i < n; i++) { E.step(L, s, h); if (s.dead || s.won) break; }
        if (s.dead) continue;
        const k = key(s); if (!next.has(k)) next.set(k, { s, path: { h, n, p: node.path } });
      }
    }
    F = { N: F.N, layer: [...next.values()], first: null };
    if (F.layer.length > 1500) { const st = Math.ceil(F.layer.length / 1500); F.layer = F.layer.filter((_, i) => i % st === 0); }
    layer = F.layer;
    if (++guard > 100000) break;
  }
  return F;
}

function generate(def) {
  const T = TIERS[def.tier], rnd = rng(def.seed);
  const objs = [];
  const fronts = []; for (let i = 0; i < T.k; i++) fronts.push(initFront(T.N, Math.round(i * T.N / T.k)));
  let F = fronts, x = 14, mode = 'cube', speed = 1;
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  function mk(base, arr) {
    return {
      T, rnd, sf: E.SPEEDS[speed] / 10.4,
      blk: (dx, y, w, h) => arr.push(['b', base + dx, y, w, h]),
      spk: (dx, y = 0, n = 1, down = 0) => { for (let i = 0; i < n; i++) arr.push(['s', base + dx + i, y, down, 0]); },
      sspk: (dx, y = 0, n = 1) => { for (let i = 0; i < n; i++) arr.push(['s', base + dx + i, y, 0, 1]); },
      pad: (dx, y = 0, pink = 0) => arr.push(['p', base + dx, y, pink]),
      orb: (dx, y, pink = 0) => arr.push(['o', base + dx, y, pink]),
      saw: (dx, y, r) => arr.push(['w', base + dx, y, r]),
    };
  }
  const build = list => E.buildLevel(E.expand(list));
  function frontX(F) { return Math.max(...F.map(f => f.layer.length ? f.layer[0].s.x : 0)); }
  function tryAdd(arr, endX) {
    const list = objs.concat(arr); const L = build(list);
    const nf = [];
    for (const f of F) { const r = advance(L, { ...f, layer: f.layer.map(n => ({ s: E.clone(n.s), path: n.path })) }, endX); if (!r.layer.length) return false; nf.push(r); }
    objs.push(...arr); F = nf; return true;
  }
  function placeChunk(pool, maxD) {
    const cands = pool.filter(ch => ch.d <= maxD);
    for (let tries = 0; tries < 8; tries++) {
      const w8 = cands.map(ch => ch.d === maxD ? 4 : ch.d === maxD - 1 ? 3 : 1);
      let r = rnd() * w8.reduce((a, b) => a + b), i = 0; while ((r -= w8[i]) > 0) i++;
      const ch = cands[i];
      const start = Math.max(x, Math.ceil(frontX(F)) + 2);
      const arr = []; const w = ch.f(mk(start, arr)); arr.forEach((o, j) => arr[j] = o.map(round));
      if (tryAdd(arr, start + w + 1.5)) { x = start + w; return true; }
    }
    return false;
  }
  function gap(mul = 1) { const sf = E.SPEEDS[speed] / 10.4; x += Math.round(rint(T.gap[0], T.gap[1]) * sf * mul); }

  let pal = rint(0, PALETTES.length - 1);
  objs.push(['C', 0, 0, ...PALETTES[pal]]);
  let lastPortalShip = false;
  for (let sec = 0; sec < def.secs; sec++) {
    const ship = sec > 0 && sec % 2 === 1 && !lastPortalShip;
    if (sec > 0) {
      pal = (pal + 1 + rint(0, 3)) % PALETTES.length;
      const sx = Math.max(x, Math.ceil(frontX(F)) + 3);
      const arr = [['C', sx, 0, ...PALETTES[pal]]];
      const sp = T.speeds[rint(0, T.speeds.length - 1)];
      if (sp !== speed) { arr.push(['S', sx, 0.5, sp]); speed = sp; }
      if (ship !== (mode === 'ship')) { arr.push(['P', sx + 1, 3, ship ? 1 : 0]); mode = ship ? 'ship' : 'cube'; }
      if (!tryAdd(arr, sx + 3)) throw new Error('portal failed');
      x = sx + 3; gap(ship ? 0.8 : 1.2);
    }
    lastPortalShip = ship;
    const n = ship ? rint(...T.shipLen) : rint(...T.secLen);
    for (let i = 0; i < n; i++) {
      // ramp: first chunks of the level are easier
      const ramp = Math.min(def.tier, Math.floor((sec * 6 + i) / 5));
      if (!placeChunk(ship ? SHIP : CUBE, ramp) && !placeChunk(ship ? SHIP : CUBE, 0)) { x += 3; }
      gap(ship ? 1.1 : 1);
    }
  }
  if (mode === 'ship') { const sx = Math.max(x, Math.ceil(frontX(F)) + 3); tryAdd([['P', sx, 3, 0]], sx + 2); x = sx + 10; }
  const endX = Math.max(x, Math.ceil(frontX(F))) + 14;
  objs.push(['E', endX, 0]);
  objs.push(['C', endX - 8, 0, '#14142e', '#0c0c20']);
  // final full verification from scratch on every phase
  const L = build(objs);
  let sol = null;
  for (let i = 0; i < T.k; i++) {
    const r = advance(L, initFront(T.N, Math.round(i * T.N / T.k)), endX + 1);
    const won = r.layer.find(n => n.s.won);
    if (!won) throw new Error(def.name + ' failed final check phase ' + i);
    if (i === 0) { const inp = []; for (let p = won.path; p; p = p.p) inp.push([p.h ? 1 : 0, p.n]); sol = inp.reverse(); }
  }
  return { objs, endX, sol };
}

const out = [], sols = [];
for (const def of LEVELS) {
  const t0 = Date.now();
  const g = generate(def);
  const T = TIERS[def.tier];
  const L = E.buildLevel(E.expand(g.objs));
  // estimate duration
  let secs = 0; { const s = E.newState(); while (!s.won && secs < 600) { E.step(L, s, false); if (s.dead) { s.dead = false; } secs += E.DT; } }
  out.push({ name: def.name, diff: T.name, tier: def.tier, stars: def.stars, seed: def.seed, objs: g.objs, len: g.endX });
  sols.push(g.sol);
  console.log(def.name.padEnd(16), T.name.padEnd(7), 'objs', String(g.objs.length).padStart(4), 'len', g.endX, 'gen', (Date.now() - t0) + 'ms');
}
fs.writeFileSync(__dirname + '/../src/levels.js', 'const LEVELS = ' + JSON.stringify(out.map(l => ({ ...l, objs: l.objs.map(o => o.map(round)) }))) + ';\nif (typeof module !== "undefined") module.exports = LEVELS;\n');
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(sols));
