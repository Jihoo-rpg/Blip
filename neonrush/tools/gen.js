// Rhythm-structured level generator with fairness verification.
// Obstacles are laid on the music's beat grid as a continuous terrain (platforms, steps, pits),
// and every beat-event is accepted only if it is beatable on a coarse input grid at every phase
// offset (guaranteed minimum timing window per difficulty). Backtracks when stuck.
const E = require(process.env.ENGINE || '../src/engine.js');
const fs = require('fs');

const TIERS = [
  { name: 'Easy', N: 32, k: 4, rest: 0.42, shipGap: 5.6, shipMove: 1, speeds: [1], cube: [22, 28], ship: [12, 14],
    ev: { spike1: 6, spike2: 3, small: 2, up: 4, down: 4, pad: 2, hang: 2 } },
  { name: 'Normal', N: 24, k: 4, rest: 0.3, shipGap: 4.9, shipMove: 1, speeds: [1], cube: [24, 30], ship: [14, 16],
    ev: { spike1: 4, spike2: 4, small: 2, up: 4, down: 4, pad: 3, hang: 2, pit: 3, orbPit: 2, saw: 2 } },
  { name: 'Hard', N: 16, k: 4, rest: 0.2, shipGap: 4.3, shipMove: 2, speeds: [1, 1, 2], cube: [26, 32], ship: [16, 18],
    ev: { spike1: 3, spike2: 4, spike3: 3, small: 2, up: 4, down: 3, pad: 3, hang: 3, pit: 4, orbPit: 3, saw: 3, downSpike: 2 } },
  { name: 'Harder', N: 12, k: 4, rest: 0.14, shipGap: 3.8, shipMove: 2, speeds: [1, 2], cube: [28, 34], ship: [16, 20],
    ev: { spike1: 2, spike2: 3, spike3: 4, small: 2, up: 4, down: 3, pad: 3, hang: 3, pit: 4, orbPit: 4, saw: 3, downSpike: 3 } },
  { name: 'Insane', N: 8, k: 4, rest: 0.08, shipGap: 3.3, shipMove: 2, speeds: [2, 2, 3], cube: [30, 36], ship: [18, 22],
    ev: { spike2: 3, spike3: 4, small: 2, up: 4, down: 3, pad: 3, hang: 3, pit: 4, orbPit: 4, saw: 4, downSpike: 4 } },
  { name: 'Demon', N: 6, k: 3, rest: 0.04, shipGap: 2.9, shipMove: 3, speeds: [2, 3], cube: [32, 38], ship: [20, 24],
    ev: { spike2: 2, spike3: 4, small: 2, up: 4, down: 3, pad: 3, hang: 3, pit: 4, orbPit: 4, saw: 4, downSpike: 4 } },
];
const LEVELS = [
  ['First Steps', 0, 1, 4, 11, 128], ['Blue Horizon', 0, 2, 5, 22, 132], ['Green Valley', 1, 3, 5, 33, 130], ['Pulse Runner', 1, 3, 5, 44, 136],
  ['Orange Crush', 2, 4, 5, 55, 128], ['Night Drive', 2, 5, 5, 66, 134], ['Metro Line', 2, 5, 6, 77, 138], ['Red Alert', 3, 6, 6, 88, 132],
  ['Overclock', 3, 7, 6, 99, 140], ['Static Storm', 3, 7, 7, 111, 136], ['Prism Break', 4, 8, 7, 122, 140], ['Hyperdrive', 4, 9, 7, 133, 144],
  ['Voltage', 4, 9, 7, 144, 146], ['Abyss', 5, 10, 7, 155, 140], ['Doomsday Engine', 5, 10, 8, 166, 148], ['Event Horizon', 5, 10, 8, 177, 150],
].map(([name, tier, stars, secs, seed, bpm]) => ({ name, tier, stars, secs, seed, bpm }));

// bright GD-like palettes: [bg, ground]
const PALETTES = [
  ['#2463ff', '#173fbf'], ['#1fae3a', '#127a26'], ['#8a2cff', '#5d16c0'], ['#ff2d7a', '#c0145a'], ['#ff7a14', '#c4520a'],
  ['#14b8c4', '#0b7f8a'], ['#e0b012', '#a07a06'], ['#d42020', '#8e1010'], ['#3a40d8', '#22279a'], ['#b026c8', '#7a1590'],
];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const r2 = v => Math.round(v * 100) / 100;

// ---------- verification ----------
const key = s => `${s.mode}|${Math.round(s.y * 12)}|${Math.round(s.vy * 1.5)}|${s.onGround}|${s.holding}|${s.used.size}|${s.pressBuf > 0}`;
function initFront(N, p) { return { N, layer: [{ s: E.newState(), path: null }], first: p }; }
function advance(L, F, xTarget) {
  let layer = F.layer;
  while (layer.length && layer[0].s.x < xTarget && !layer[0].s.won) {
    const next = new Map(), n = F.first != null ? F.first : F.N;
    for (const node of layer) for (const h of (F.first != null ? [false] : [false, true])) {
      const s = E.clone(node.s);
      for (let i = 0; i < n; i++) { E.step(L, s, h); if (s.dead || s.won) break; }
      if (s.dead) continue;
      const k = key(s); if (!next.has(k)) next.set(k, { s, path: { h, n, p: node.path } });
    }
    F = { N: F.N, layer: [...next.values()], first: null };
    if (F.layer.length > 1200) { const st = Math.ceil(F.layer.length / 1200); F.layer = F.layer.filter((_, i) => i % st === 0); }
    layer = F.layer;
  }
  return F;
}
const cloneF = f => ({ ...f, layer: f.layer.map(n => ({ s: E.clone(n.s), path: n.path })) });

function generate(def) {
  const T = TIERS[def.tier], rnd = rng(def.seed);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let objs = [], F = [];
  for (let i = 0; i < T.k; i++) F.push(initFront(T.N, Math.round(i * T.N / T.k)));
  const st = { x: 0, h: 0, mode: 'cube', speed: 1, f: 0, c: 10 };
  const bpb = () => E.SPEEDS[st.speed] * 60 / def.bpm;
  const sfac = () => E.SPEEDS[st.speed] / 10.4;
  let L = null;

  function tryAdd(arr, endX) {
    const list = objs.concat(arr); L = E.buildLevel(E.expand(list));
    const nf = [];
    for (const f of F) { const r = advance(L, cloneF(f), endX); if (!r.layer.length) return false; nf.push(r); }
    objs = list; F = nf; return true;
  }

  // ---------- cube beat events ----------
  // each returns {arr, h, beats} given start x, height h
  function floor(arr, x0, x1, h) { if (h > 0 && x1 - x0 > 0.01) arr.push(['b', r2(x0), 0, r2(x1 - x0), h]); }
  function deco(arr, x0, x1, h) { if (rnd() < 0.55) arr.push(['g', r2(x0 + rnd() * (x1 - x0)), h, rint(0, 2)]); }
  const EV = {
    rest(x, h, w) { const a = []; floor(a, x, x + w, h); deco(a, x, x + w, h); return { a, h }; },
    spikes(x, h, w, k, small) { const a = []; floor(a, x, x + w, h); const s0 = x + 0.5 + 2.1 * sfac() - k / 2; for (let i = 0; i < k; i++) a.push(['s', r2(s0 + i), h, 0, small ? 1 : 0]); if (rnd() < 0.5) a.push(['g', r2(s0 - 1.2), h, rint(0, 2)]); return { a, h }; },
    spike1(x, h, w) { return EV.spikes(x, h, w, 1); },
    spike2(x, h, w) { return EV.spikes(x, h, w, 2); },
    spike3(x, h, w) { return EV.spikes(x, h, w, 3); },
    small(x, h, w) { return EV.spikes(x, h, w, rint(1, 2), true); },
    up(x, h, w) { if (h >= 4) return null; const a = [], p = x + 2.0 * sfac() + 0.3; floor(a, x, p, h); floor(a, p, x + w, h + 1); return { a, h: h + 1 }; },
    down(x, h, w) { if (h <= 0) return null; const a = [], p = x + 1.2, nh = T.name === 'Easy' ? h - 1 : (rnd() < 0.5 ? 0 : h - 1); floor(a, x, p, h); floor(a, p, x + w, nh); deco(a, p + 1, x + w, nh); return { a, h: nh }; },
    downSpike(x, h, w) { if (h <= 0) return null; const a = [], p = x + 1.2, nh = h - 1; floor(a, x, p, h); floor(a, p, x + w, nh); a.push(['s', r2(x + w - 0.6), nh, 0, 0]); return { a, h: nh }; },
    pit(x, h, w) {
      if (h <= 0) return EV.spikes(x, h, w, Math.min(3, rint(2, 3)));
      const gw = rint(2, T.name === 'Normal' ? 2 : 3), a = [], p = x + 2.6 * sfac() - gw / 2 + 0.5;
      floor(a, x, p, h); for (let i = 0; i < gw; i++) a.push(['s', r2(p + i), 0, 0, 0]); floor(a, p + gw, x + w, h); return { a, h };
    },
    pad(x, h, w) {
      if (h > 2) return null; const a = [], p0 = x + 1.6, p1 = x + 3.8 * sfac() + 0.8, nh = h + 2;
      a.push(['p', r2(x + 0.4), h, 0]); floor(a, x, p0, h);
      for (let sx = p0; sx + 1 <= p1 + 0.01; sx++) a.push(['s', r2(sx), 0, 0, 0]);
      floor(a, p1, x + w * 2, nh); return { a, h: nh, beats: 2 };
    },
    orbPit(x, h, w) {
      const a = [], p0 = x + 1.4, gl = Math.round(7.5 * sfac()), p1 = p0 + gl;
      floor(a, x, p0, h); for (let i = 0; i < gl; i++) a.push(['s', r2(p0 + i), 0, 0, 0]);
      a.push(['o', r2(p0 + 2.4 * sfac()), r2(h + 2.4), 0]); floor(a, p1, x + w * 2, h); return { a, h, beats: 2 };
    },
    hang(x, h, w) {
      if (h > 3) return null; const r = EV.spikes(x, h, w, 1); const sx = r.a.find(o => o[0] === 's')[1];
      r.a.push(['s', sx, h + 3, 1, 0]); r.a.push(['b', sx, h + 4, 1, 1, 1]); return r;
    },
    saw(x, h, w) { const a = []; floor(a, x, x + w, h); a.push(['w', r2(x + 1 + 2.1 * sfac()), r2(h - 0.15), 0.95]); return { a, h }; },
  };
  const evNames = Object.keys(T.ev), evW = evNames.map(n => T.ev[n]);
  function chooseEvent(ramp) {
    if (rnd() < T.rest + (1 - ramp) * 0.25) return 'rest';
    let r = rnd() * evW.reduce((a, b) => a + b), i = 0; while ((r -= evW[i]) > 0) i++;
    return evNames[i];
  }

  // ---------- ship segment ----------
  function shipSeg(x, w, open) {
    const a = [];
    if (open) { // ease corridor toward fully open (for exits)
      st.f = Math.max(0, st.f - 2); st.c = Math.min(10, st.c + 2);
    } else {
      const G = T.shipGap + (rnd() < 0.3 ? 0.6 : 0);
      const mid = (st.f + st.c) / 2, mv = (rint(-T.shipMove, T.shipMove)) * (rnd() < 0.35 ? 0 : 1);
      let nm = Math.max(G / 2 + 0.5, Math.min(10 - G / 2 - 0.5, mid + mv));
      // narrow gradually
      const curG = st.c - st.f, g = Math.max(G, curG - 1.5);
      st.f = Math.max(0, Math.round((nm - g / 2) * 2) / 2); st.c = Math.min(10, st.f + g);
    }
    if (st.f > 0) a.push(['b', r2(x), 0, r2(w), st.f]);
    if (st.c < 10) a.push(['b', r2(x), st.c, r2(w), r2(10 - st.c)]);
    if (!open && st.c - st.f >= T.shipGap + 0.5 && rnd() < 0.35) {
      if (rnd() < 0.5) a.push(['s', r2(x + w / 2 - 0.5), st.f, 0, 0]); else a.push(['s', r2(x + w / 2 - 0.5), r2(st.c - 1), 1, 0]);
    }
    return a;
  }

  // ---------- assemble ----------
  const hist = [];
  const snap = () => ({ objs, F, st: { ...st }, rndState: null });
  let pal = Math.floor(rnd() * PALETTES.length);
  objs.push(['C', 0, 0, ...PALETTES[pal]]);
  st.x = r2(bpb() * 3); // intro: 3 beats
  let totalBeats = 0, backtracks = 0;
  function cubeBeat(forceRest, ramp, wantH0) {
    const w = bpb();
    let names = forceRest ? ['rest'] : [chooseEvent(ramp), chooseEvent(ramp), 'rest'];
    if (wantH0) names = st.h > 0 ? ['down', 'down', 'rest'] : ['rest'];
    for (const n of names) {
      const r = EV[n](st.x, st.h, w); if (!r) continue;
      const beats = r.beats || 1, end = st.x + w * beats;
      if (tryAdd(r.a, end - 2.4)) { st.x = r2(end); st.h = r.h; totalBeats += beats; return true; }
    }
    return false;
  }
  function withBacktrack(fn) {
    for (let tries = 0; tries < 6; tries++) {
      hist.push(snap()); if (hist.length > 6) hist.shift();
      if (fn(tries)) return;
      hist.pop();
      // backtrack two steps and force rests
      backtracks++;
      if (backtracks > 400) throw new Error(def.name + ': too many backtracks');
      const back = hist.length >= 2 ? hist.splice(hist.length - 2)[0] : hist.pop();
      if (back) { objs = back.objs; F = back.F; Object.assign(st, back.st); }
      if (!cubeOrShipRest()) continue;
    }
    throw new Error(def.name + ': stuck at x=' + st.x);
  }
  function cubeOrShipRest() {
    const w = bpb();
    if (st.mode === 'cube') { const r = EV.rest(st.x, st.h, w); if (tryAdd(r.a, st.x + w - 2.4)) { st.x = r2(st.x + w); return true; } return false; }
    const save = { f: st.f, c: st.c }; const a = shipSeg(st.x, w / 2, true);
    if (tryAdd(a, st.x + w / 2 - 2.4)) { st.x = r2(st.x + w / 2); return true; } Object.assign(st, save); return false;
  }

  for (let sec = 0; sec < def.secs; sec++) {
    const ship = sec % 2 === 1;
    if (sec > 0) {
      // bring cube down to ground before a ship portal
      if (ship) { let g = 0; while (st.h > 0 && g++ < 6) withBacktrack(() => cubeBeat(false, 1, true)); }
      // open ship corridor before a cube portal
      if (!ship) { let g = 0; while ((st.f > 0 || st.c < 10) && g++ < 8) withBacktrack(() => { const save = { f: st.f, c: st.c }, w = bpb() / 2; const a = shipSeg(st.x, w, true); if (tryAdd(a, st.x + w - 2.4)) { st.x = r2(st.x + w); return true; } Object.assign(st, save); return false; }); }
      pal = (pal + 1 + Math.floor(rnd() * (PALETTES.length - 1))) % PALETTES.length;
      const arr = [['C', st.x, 0, ...PALETTES[pal]]];
      const sp = pick(T.speeds); if (sp !== st.speed) { arr.push(['S', st.x + 0.5, 0.5, sp]); }
      arr.push(['P', r2(st.x + 1.5), 3, ship ? 1 : 0]);
      const w = bpb();
      if (!ship) floor(arr, st.x, st.x + w, 0);
      if (!tryAdd(arr, st.x + w - 2.4)) throw new Error('portal fail');
      st.speed = sp; st.mode = ship ? 'ship' : 'cube'; st.h = 0; st.f = 0; st.c = 10;
      st.x = r2(st.x + w);
      hist.length = 0; // never backtrack across a portal
    }
    const nBeats = ship ? rint(...T.ship) : rint(...T.cube);
    const start = totalBeats;
    if (!ship) {
      while (totalBeats - start < nBeats) {
        const ramp = Math.min(1, (sec * 30 + totalBeats - start) / 40);
        withBacktrack(tries => cubeBeat(tries > 1, ramp));
      }
    } else {
      for (let i = 0; i < nBeats * 2; i++) {
        withBacktrack(tries => {
          const save = { f: st.f, c: st.c }, w = bpb() / 2;
          const a = shipSeg(st.x, w, tries > 1 || i < 2);
          if (tryAdd(a, st.x + w - 2.4)) { st.x = r2(st.x + w); return true; }
          Object.assign(st, save); return false;
        });
      }
      totalBeats += nBeats;
    }
  }
  if (st.mode === 'ship') {
    let g = 0; while ((st.f > 0 || st.c < 10) && g++ < 8) withBacktrack(() => cubeOrShipRest());
    const w = bpb(); if (!tryAdd([['P', r2(st.x + 1.5), 3, 0]], st.x + w - 2.4)) throw new Error('end portal'); st.x = r2(st.x + w); st.mode = 'cube'; hist.length = 0;
  }
  { let g = 0; while (st.h > 0 && g++ < 6) withBacktrack(() => cubeBeat(false, 1, true)); }
  for (let i = 0; i < 3; i++) withBacktrack(() => cubeBeat(true, 1));
  const endX = r2(st.x + bpb() * 2);
  objs.push(['C', r2(endX - 10), 0, '#14142e', '#0c0c20']);
  objs.push(['E', endX, 0]);

  // merge adjacent blocks of same y/h
  const blocks = objs.filter(o => o[0] === 'b' && !o[5]).sort((a, b) => a[2] - b[2] || a[4] - b[4] || a[1] - b[1]);
  const rest = objs.filter(o => !(o[0] === 'b' && !o[5]));
  const merged = [];
  for (const b of blocks) {
    const m = merged[merged.length - 1];
    if (m && m[2] === b[2] && m[4] === b[4] && Math.abs(m[1] + m[3] - b[1]) < 0.02) m[3] = r2(b[1] + b[3] - m[1]);
    else merged.push(b.slice());
  }
  objs = merged.concat(rest);
  // final verification from scratch on every phase
  L = E.buildLevel(E.expand(objs));
  let sol = null;
  for (let i = 0; i < T.k; i++) {
    const r = advance(L, initFront(T.N, Math.round(i * T.N / T.k)), endX + 1);
    const won = r.layer.find(n => n.s.won);
    if (!won) throw new Error(def.name + ' failed final check phase ' + i);
    if (i === 0) { const inp = []; for (let p = won.path; p; p = p.p) inp.push([p.h ? 1 : 0, p.n]); sol = inp.reverse(); }
  }
  return { objs, endX, sol, backtracks, beats: totalBeats };
}

const only = process.argv[2] != null ? process.argv[2].split(',').map(Number) : null;
const out = [], sols = [];
for (let i = 0; i < LEVELS.length; i++) {
  const def = LEVELS[i]; if (only && !only.includes(i)) continue;
  const t0 = Date.now();
  let g, seed = def.seed;
  for (let a = 0; a < 5; a++) { try { g = generate({ ...def, seed }); break; } catch (e) { console.log('  retry', def.name, e.message); seed += 1000; } }
  if (!g) throw new Error('could not generate ' + def.name);
  const T = TIERS[def.tier];
  out.push({ name: def.name, diff: T.name, tier: def.tier, stars: def.stars, seed, bpm: def.bpm, objs: g.objs, len: g.endX });
  sols.push(g.sol);
  const secs = g.sol.reduce((a, [, n]) => a + n, 0) / 240;
  console.log(def.name.padEnd(16), T.name.padEnd(7), 'objs', String(g.objs.length).padStart(4), 'len', String(g.endX).padStart(6), 'time', secs.toFixed(0) + 's', 'bt', g.backtracks, (Date.now() - t0) + 'ms');
}
const OUT = process.env.OUT || (__dirname + '/../src');
fs.writeFileSync(OUT + '/levels.js', 'const LEVELS = ' + JSON.stringify(out) + ';\nif (typeof module !== "undefined") module.exports = LEVELS;\n');
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(sols));
