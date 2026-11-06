// ===== Physics engine (shared by game + generator/solver) =====
const Engine = (() => {
  const SPEEDS = { 0: 8.4, 1: 10.4, 2: 12.9, 3: 15.6, 4: 19.2 };
  const MODES = ['cube', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'];
  const CORRIDOR = { ship: 1, ball: 1, ufo: 1, wave: 1, spider: 1 };
  const G = 110, JUMP = 22, PAD = 34, PINK_PAD = 26, ORB = 22.5, PINK_ORB = 17, MAXFALL = 26;
  const SHIP_UP = 44, SHIP_DOWN = 38, SHIP_MAX = 10;
  const BALL_G = 80, BALL_MAX = 20;
  const UFO_G = 62, UFO_J = 12.5, UFO_MAX = 16;
  const ROBOT_J = 12, ROBOT_HOLD = 0.2;
  const DT = 1 / 240;
  // hitbox per mode: [offsetX, width, height]
  const BOX = { cube: [0, 1, 1], robot: [0, 1, 1], spider: [0, 1, 1], ball: [0, 1, 1], ship: [0, 1, 0.6], ufo: [0, 1, 0.7], wave: [0.25, 0.5, 0.5] };

  // compact format: [type, x, y, a, b, c]
  //  'b' block a=w b=h c=chain | 's' spike a=dir(1 down) b=small | 'p' pad a=pink | 'o' orb a=pink | 'w' saw a=r
  //  'P' portal a=mode index | 'S' speed a=v | 'C' color a=bg b=gr | 'E' end | 'g' deco
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
        case 'P': return { t: 'portal', x, y, mode: MODES[a] };
        case 'S': return { t: 'speed', x, y, v: a };
        case 'C': return { t: 'color', x, y: 0, bg: a, gr: b };
        case 'E': return { t: 'end', x, y: 0 };
      }
    });
  }

  function buildLevel(objs, cfg = {}) {
    const L = { jump: JUMP * (cfg.jump || 1), stepUp: cfg.step != null ? cfg.step : 0.4, pad: (cfg.pad || 1), decos: [], solids: [], hazards: [], pads: [], orbs: [], triggers: [], all: objs, endX: 0, cols: [] };
    objs.forEach((o, i) => {
      o.id = i;
      if (o.t === 'deco') L.decos.push(o);
      else if (o.t === 'block') L.solids.push(o);
      else if (o.t === 'spike') {
        o.w = 1; o.h = 1;
        const sm = o.small;
        if (o.dir === 'down') o.hb = { x: o.x + 0.32, y: o.y + (sm ? 0.68 : 0.42), w: 0.36, h: sm ? 0.32 : 0.58 };
        else o.hb = { x: o.x + 0.32, y: o.y, w: 0.36, h: sm ? 0.32 : 0.58 };
        L.hazards.push(o);
      }
      else if (o.t === 'saw') { o.w = o.r * 2; o.h = o.r * 2; L.hazards.push(o); }
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
    return { x: 0, y: 0, vy: 0, mode: 'cube', grav: 1, speed: SPEEDS[1], onGround: true, ceil: null,
      dead: false, won: false, used: new Set(), trig: 0, pressBuf: 0, holding: false, robotT: 0,
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

  function spiderTarget(s, near, H) {
    const x0 = s.x + 0.1, x1 = s.x + 0.9;
    if (s.grav === 1) {
      let t = s.ceil != null ? s.ceil - H : null;
      for (const b of near) if (b.t === 'block' && b.x < x1 && b.x + b.w > x0 && b.y >= s.y + H - 0.01) { const v = b.y - H; if (t == null || v < t) t = v; }
      return t;
    }
    let t = 0;
    for (const b of near) if (b.t === 'block' && b.x < x1 && b.x + b.w > x0 && b.y + b.h <= s.y + 0.01) t = Math.max(t, b.y + b.h);
    return t;
  }

  function step(L, s, held, dt = DT) {
    if (s.dead || s.won) return;
    s.t += dt;
    if (held && !s.holding) s.pressBuf = 0.1;
    s.holding = held;
    const m = s.mode, [OX, W, H] = BOX[m], g = s.grav;
    const near = nearby(L, s.x);
    const wantTap = s.pressBuf > 0;

    switch (m) {
      case 'cube':
        if (s.onGround && (held || wantTap)) { s.vy = L.jump * g; s.onGround = false; s.jumps++; s.pressBuf = 0; s.events.push({ e: 'jump' }); }
        else s.vy = clamp(s.vy - G * g * dt, MAXFALL);
        break;
      case 'robot':
        if (s.onGround && (held || wantTap)) { s.vy = ROBOT_J; s.robotT = ROBOT_HOLD; s.onGround = false; s.jumps++; s.pressBuf = 0; s.events.push({ e: 'jump' }); }
        else if (held && s.robotT > 0) { s.vy = Math.max(s.vy, ROBOT_J); s.robotT -= dt; }
        else { s.robotT = 0; s.vy = clamp(s.vy - G * dt, MAXFALL); }
        break;
      case 'ship':
        s.vy = clamp(s.vy + (held ? SHIP_UP : -SHIP_DOWN) * dt, SHIP_MAX); break;
      case 'ufo':
        if (wantTap) { s.vy = UFO_J; s.pressBuf = 0; s.jumps++; s.events.push({ e: 'jump' }); }
        else s.vy = clamp(s.vy - UFO_G * dt, UFO_MAX);
        break;
      case 'wave':
        s.vy = held ? s.speed : -s.speed; break;
      case 'ball':
        if (s.onGround && wantTap) { s.grav = -g; s.vy = -s.grav * 5; s.onGround = false; s.pressBuf = 0; s.jumps++; s.events.push({ e: 'flip' }); }
        else s.vy = clamp(s.vy - BALL_G * g * dt, BALL_MAX);
        break;
      case 'spider':
        if (s.onGround && wantTap) {
          const ty = spiderTarget(s, near, H);
          if (ty != null) { s.events.push({ e: 'teleport', y0: s.y, y1: ty }); s.y = ty; s.grav = -g; s.vy = 0; s.pressBuf = 0; s.jumps++; }
        } else s.vy = clamp(s.vy - G * g * dt, MAXFALL);
        break;
    }
    s.x += s.speed * dt;
    s.y += s.vy * dt;
    s.pressBuf = Math.max(0, s.pressBuf - dt);

    const gg = s.grav;
    let grounded = false;
    if (s.y <= 0) { s.y = 0; if (s.vy < 0) s.vy = 0; if (gg === 1) grounded = true; }
    if (s.ceil != null && s.y + H >= s.ceil) { s.y = s.ceil - H; if (s.vy > 0) s.vy = 0; if (gg === -1) grounded = true; }

    const px = s.x + OX, tol = 0.3 + Math.abs(s.vy) * dt;
    const bonkDies = m === 'cube' || m === 'robot';
    for (const b of near) {
      if (b.t !== 'block' || !ov(px, s.y, W, H, b.x, b.y, b.w, b.h)) continue;
      const penTop = b.y + b.h - s.y, penBot = s.y + H - b.y;
      if (penTop <= tol && s.vy <= 0) { s.y = b.y + b.h; s.vy = 0; if (gg === 1) grounded = true; }
      else if (L.stepUp && bonkDies && penTop <= L.stepUp) { s.y = b.y + b.h; if (s.vy <= 0) { s.vy = 0; grounded = true; } } // step assist
      else if (penBot <= tol && s.vy >= 0) {
        if (bonkDies) { die(s); return; }
        s.y = b.y - H; s.vy = 0; if (gg === -1) grounded = true;
      }
    }
    // inner hitbox: touching a block's side kills almost immediately (0.15 block of overlap)
    const iw = W - 0.3, ih = H - 0.3, ix = px + 0.15, iy = s.y + 0.15;
    for (const b of near) if (b.t === 'block' && ov(ix, iy, iw, ih, b.x, b.y, b.w, b.h)) { die(s); return; }
    s.onGround = grounded;

    const sh = m === 'wave' ? 0.03 : 0.05;
    const hx = px + sh, hy = s.y + sh, hw = W - sh * 2, hh = H - sh * 2;
    for (const o of near) {
      if (o.t === 'spike') {
        const h = o.hb; if (ov(hx, hy, hw, hh, h.x, h.y, h.w, h.h)) { die(s); return; }
      } else if (o.t === 'saw') {
        if (circRect(o.x, o.y, o.r * 0.88, hx, hy, hw, hh)) { die(s); return; }
      } else if (o.t === 'pad') {
        if (!s.used.has(o.id) && ov(px, s.y, W, H, o.x - 0.2, o.y, 1.4, 2.3)) { // tall zone: jumping just before a pad still triggers it
          s.used.add(o.id); s.vy = CORRIDOR[m] ? 8 : (o.pink ? PINK_PAD : PAD) * L.pad * s.grav; s.onGround = false; s.robotT = 0; s.events.push({ e: 'pad', o });
        }
      } else if (o.t === 'orb') {
        if (!s.used.has(o.id) && s.pressBuf > 0 && ov(px, s.y, W, H, o.x - 0.2, o.y - 0.2, 1.4, 1.4)) {
          s.used.add(o.id); s.pressBuf = 0; s.onGround = false; s.jumps++; s.robotT = 0;
          s.vy = (m === 'ship' || m === 'ufo' ? 0.6 : 1) * (o.pink ? PINK_ORB : ORB) * s.grav;
          s.events.push({ e: 'orb', o });
        }
      }
    }
    while (s.trig < L.triggers.length && s.x + 1 >= L.triggers[s.trig].x) {
      const t = L.triggers[s.trig++];
      if (t.t === 'portal') {
        const prev = s.mode;
        s.mode = t.mode; s.grav = 1; s.robotT = 0;
        if (CORRIDOR[t.mode]) { s.ceil = 10; s.vy *= 0.4; if (s.y + BOX[t.mode][2] > 10) s.y = 10 - BOX[t.mode][2]; }
        else s.ceil = null;
        if (prev !== t.mode) s.events.push({ e: 'portal', o: t });
      } else if (t.t === 'speed') { s.speed = SPEEDS[t.v]; s.events.push({ e: 'speed', o: t }); }
      else if (t.t === 'end') { s.won = true; s.events.push({ e: 'win' }); return; }
      else s.events.push({ e: t.t, o: t });
    }
  }
  function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }
  return { expand, buildLevel, newState, clone, step, DT, SPEEDS, MODES, CORRIDOR, BOX };
})();
if (typeof module !== 'undefined') module.exports = Engine;
