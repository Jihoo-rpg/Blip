// ===== Physics engine (shared by game + generator/solver) =====
const Engine = (() => {
  const SPEEDS = { 0: 8.4, 1: 10.4, 2: 12.9, 3: 15.6 };
  const G = 110, JUMP = 22, PAD = 32, PINK_PAD = 25, ORB = 22.5, PINK_ORB = 17, MAXFALL = 26;
  const SHIP_UP = 44, SHIP_DOWN = 38, SHIP_MAX = 10;
  const DT = 1 / 240;

  // compact format: [type, x, y, a, b]
  //  'b' block a=w b=h | 's' spike a=dir(1 down) b=small | 'p' pad a=pink | 'o' orb a=pink | 'w' saw a=r
  //  'P' portal a=mode(0 cube,1 ship) | 'S' speed a=v | 'C' color a=bg b=gr | 'E' end
  function expand(arr) {
    return arr.map(o => {
      const [t, x, y, a, b, c] = o;
      switch (t) {
        case 'b': return { t: 'block', x, y, w: a, h: b, chain: !!c };
        case 'g': return { t: 'deco', x, y, v: a || 0 };
        case 's': return { t: 'spike', x, y, dir: a ? 'down' : 'up', small: !!b };
        case 'p': return { t: 'pad', x, y, pink: !!a };
        case 'o': return { t: 'orb', x, y, pink: !!a };
        case 'w': return { t: 'saw', x, y, r: a };
        case 'P': return { t: 'portal', x, y, mode: a ? 'ship' : 'cube' };
        case 'S': return { t: 'speed', x, y, v: a };
        case 'C': return { t: 'color', x, y: 0, bg: a, gr: b };
        case 'E': return { t: 'end', x, y: 0 };
      }
    });
  }

  function buildLevel(objs) {
    const L = { decos: [], solids: [], hazards: [], pads: [], orbs: [], saws: [], triggers: [], all: objs, endX: 0, cols: [] };
    objs.forEach((o, i) => {
      o.id = i;
      if (o.t === 'deco') L.decos.push(o);
      else if (o.t === 'block') L.solids.push(o);
      else if (o.t === 'spike') {
        o.w = 1; o.h = 1;
        const sm = o.small;
        if (o.dir === 'down') o.hb = { x: o.x + 0.4, y: o.y + (sm ? 0.72 : 0.52), w: 0.2, h: sm ? 0.28 : 0.48 };
        else o.hb = { x: o.x + 0.4, y: o.y, w: 0.2, h: sm ? 0.28 : 0.48 };
        L.hazards.push(o);
      }
      else if (o.t === 'saw') { o.w = o.r * 2; o.h = o.r * 2; o.bx = o.x - o.r; L.hazards.push(o); }
      else if (o.t === 'pad') { o.w = 1; o.h = 0.3; L.pads.push(o); }
      else if (o.t === 'orb') { o.w = 1; o.h = 1; L.orbs.push(o); }
      else { L.triggers.push(o); if (o.t === 'end') L.endX = o.x; }
    });
    L.triggers.sort((a, b) => a.x - b.x);
    let maxX = L.endX; for (const o of objs) maxX = Math.max(maxX, o.x + (o.w || 1)); maxX = Math.ceil(maxX) + 5;
    for (let c = 0; c <= maxX; c++) L.cols.push([]);
    for (const o of [...L.solids, ...L.hazards, ...L.pads, ...L.orbs]) {
      const x0 = o.t === 'saw' ? o.x - o.r : o.x;
      for (let c = Math.max(0, Math.floor(x0)); c <= Math.min(maxX, Math.floor(x0 + o.w)); c++) L.cols[c].push(o);
    }
    return L;
  }

  function newState() {
    return { x: 0, y: 0, vy: 0, mode: 'cube', speed: SPEEDS[1], onGround: true, ceil: null,
      dead: false, won: false, used: new Set(), trig: 0, pressBuf: 0, holding: false,
      t: 0, jumps: 0, events: [] };
  }
  function clone(s) { return { ...s, used: new Set(s.used), events: [] }; }

  const ov = (ax, ay, aw, ah, bx, by, bw, bh) => ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh;
  function circRect(cx, cy, r, x, y, w, h) {
    const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h));
    return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r;
  }

  let stamp = 0;
  const buf = [];
  function nearby(L, x) {
    buf.length = 0; stamp++;
    const c0 = Math.max(0, Math.floor(x) - 2), c1 = Math.min(L.cols.length - 1, Math.floor(x) + 2);
    for (let c = c0; c <= c1; c++) for (const o of L.cols[c]) if (o._s !== stamp) { o._s = stamp; buf.push(o); }
    return buf;
  }
  function die(s) { s.dead = true; s.events.push({ e: 'die' }); }

  function step(L, s, held, dt = DT) {
    if (s.dead || s.won) return;
    s.t += dt;
    if (held && !s.holding) s.pressBuf = 0.1;
    s.holding = held;
    const H = s.mode === 'ship' ? 0.6 : 1, W = 1;

    if (s.mode === 'cube') {
      if (s.onGround && (held || s.pressBuf > 0)) { s.vy = JUMP; s.onGround = false; s.jumps++; s.pressBuf = 0; s.events.push({ e: 'jump' }); }
      else s.vy = Math.max(s.vy - G * dt, -MAXFALL);
    } else {
      s.vy += (held ? SHIP_UP : -SHIP_DOWN) * dt;
      s.vy = Math.max(-SHIP_MAX, Math.min(SHIP_MAX, s.vy));
    }
    s.x += s.speed * dt;
    s.y += s.vy * dt;
    s.pressBuf = Math.max(0, s.pressBuf - dt);

    let grounded = false;
    if (s.y <= 0) { s.y = 0; if (s.vy < 0) s.vy = 0; grounded = true; }
    if (s.ceil != null && s.y + H >= s.ceil) { s.y = s.ceil - H; if (s.vy > 0) s.vy = 0; }

    const near = nearby(L, s.x);
    const tol = 0.3 + Math.abs(s.vy) * dt;
    for (const b of near) {
      if (b.t !== 'block' || !ov(s.x, s.y, W, H, b.x, b.y, b.w, b.h)) continue;
      const penTop = b.y + b.h - s.y, penBot = s.y + H - b.y;
      if (penTop <= tol && s.vy <= 0) { s.y = b.y + b.h; s.vy = 0; grounded = true; }
      else if (penBot <= tol && s.vy >= 0) {
        if (s.mode === 'cube') { die(s); return; }
        s.y = b.y - H; s.vy = 0;
      }
    }
    const ix = s.x + 0.35, iy = s.y + H / 2 - 0.15;
    for (const b of near) if (b.t === 'block' && ov(ix, iy, 0.3, 0.3, b.x, b.y, b.w, b.h)) { die(s); return; }
    s.onGround = grounded;

    const px = s.x + 0.08, py = s.y + 0.08, pw = W - 0.16, ph = H - 0.16;
    for (const o of near) {
      if (o.t === 'spike') {
        const h = o.hb; if (ov(px, py, pw, ph, h.x, h.y, h.w, h.h)) { die(s); return; }
      } else if (o.t === 'saw') {
        if (circRect(o.x, o.y, o.r * 0.78, px, py, pw, ph)) { die(s); return; }
      } else if (o.t === 'pad') {
        if (!s.used.has(o.id) && ov(s.x, s.y, W, H, o.x, o.y, 1, 0.3)) {
          s.used.add(o.id); s.vy = s.mode === 'ship' ? 8 : (o.pink ? PINK_PAD : PAD); s.onGround = false; s.events.push({ e: 'pad', o });
        }
      } else if (o.t === 'orb') {
        if (!s.used.has(o.id) && s.pressBuf > 0 && ov(s.x, s.y, W, H, o.x - 0.2, o.y - 0.2, 1.4, 1.4)) {
          s.used.add(o.id); s.vy = s.mode === 'ship' ? 9 : (o.pink ? PINK_ORB : ORB); s.pressBuf = 0; s.onGround = false; s.jumps++;
          s.events.push({ e: 'orb', o });
        }
      }
    }
    while (s.trig < L.triggers.length && s.x + 1 >= L.triggers[s.trig].x) {
      const t = L.triggers[s.trig++];
      if (t.t === 'portal') {
        if (t.mode === 'ship') { s.mode = 'ship'; s.ceil = 10; s.vy *= 0.4; }
        else { s.mode = 'cube'; s.ceil = null; }
        s.events.push({ e: 'portal', o: t });
      } else if (t.t === 'speed') { s.speed = SPEEDS[t.v]; s.events.push({ e: 'speed', o: t }); }
      else if (t.t === 'end') { s.won = true; s.events.push({ e: 'win' }); return; }
      else s.events.push({ e: t.t, o: t });
    }
  }
  return { expand, buildLevel, newState, clone, step, DT, SPEEDS };
})();
if (typeof module !== 'undefined') module.exports = Engine;
