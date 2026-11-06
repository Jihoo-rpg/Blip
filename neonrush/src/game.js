// ===== Game / rendering / menus =====
(() => {
  const cv = document.getElementById('c'), cx = cv.getContext('2d');
  const VIEW_H = 12;
  const $ = id => document.getElementById(id);
  let W = 0, H = 0, U = 40, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    U = Math.min(H / VIEW_H, W / 17);
  }
  window.addEventListener('resize', resize); resize();

  // ---------- persistence ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('nr2_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('nr2_' + k, JSON.stringify(v)); } catch (e) { } }
  };
  const prog = store.get('prog', {}); // name -> {n, p, att, done}
  const P = name => prog[name] || (prog[name] = { n: 0, p: 0, att: 0, done: false });
  const saveProg = () => store.set('prog', prog);
  let icon = store.get('icon', { d: 0, c1: 0, c2: 1 });
  const col1 = () => Art.COLORS[icon.c1], col2 = () => Art.COLORS[icon.c2];

  // ---------- levels ----------
  const LV = LEVELS.map(l => ({ ...l, L: null }));
  const getL = i => LV[i].L || (LV[i].L = Engine.buildLevel(Engine.expand(LV[i].objs)));
  const musicCfg = l => ({ bpm: l.bpm || 130, prog: l.seed % 4, lead: (l.seed >> 2) % 4, tr: [0, 2, -3, 5, -2, 3][l.seed % 6], style: l.tier >= 3 ? 2 : l.tier >= 1 ? 1 : 0 });
  const DIFF_NAMES = ['Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Demon'];
  let sel = Math.min(store.get('sel', 0), LV.length - 1);
  let cur = 0, L = getL(0), colorTrigs = [];

  // ---------- game state ----------
  let mode = 'menu'; // menu | select | icons | play | paused | win
  let practice = false;
  let s = Engine.newState(), attempt = 1, deadTimer = 0, checkpoints = [], cpTimer = 0;
  let held = false, acc = 0, last = performance.now();
  let camX = -8, camY = -2.5, shake = 0, rot = 0, shipRot = 0;
  let particles = [], ripples = [], bgCol = hex('#1f49d6'), grCol = hex('#163bb5'), bgT = bgCol.slice(), grT = grCol.slice();
  let flash = 0, levelTime = 0;

  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)));
  const lerp = (a, b, t) => a + (b - a) * t;
  function colorAt(x) {
    let bg = '#1f49d6', gr = '#163bb5';
    for (const t of colorTrigs) if (t.x <= x + 1) { bg = t.bg; gr = t.gr; }
    return [hex(bg), hex(gr)];
  }
  function loadLevel(i) { cur = i; L = getL(i); colorTrigs = L.triggers.filter(t => t.t === 'color'); }
  loadLevel(sel);

  // ---------- screens ----------
  const screens = ['menu', 'select', 'icons', 'pause', 'win'];
  function showScreen(name) {
    for (const sc of screens) $(sc).style.display = sc === name ? 'flex' : 'none';
    $('hud').style.display = (name === 'pause' || name === null) && (mode === 'play' || mode === 'paused') ? 'block' : 'none';
  }
  function goMenu() { mode = 'menu'; Music.stop(); showScreen('menu'); drawMenuIcon(); }
  function goSelect() { mode = 'select'; Music.stop(); showScreen('select'); renderSelect(); }
  function goIcons() { mode = 'icons'; showScreen('icons'); renderIcons(); }

  // level select
  function renderSelect() {
    const l = LV[sel], pr = P(l.name);
    loadLevel(sel);
    const f = $('lvFace'); f.innerHTML = ''; f.appendChild(Art.faceCanvas(l.tier, 110));
    $('lvName').textContent = l.name;
    $('lvDiff').textContent = DIFF_NAMES[l.tier]; $('lvDiff').className = 'diff t' + l.tier;
    $('lvStars').textContent = l.stars;
    $('lvNum').textContent = (sel + 1) + ' / ' + LV.length;
    $('lvBarN').style.width = pr.n + '%'; $('lvPctN').textContent = pr.n + '%';
    $('lvBarP').style.width = pr.p + '%'; $('lvPctP').textContent = pr.p + '%';
    $('lvAtt').textContent = pr.att;
    $('lvDone').style.display = pr.done ? 'block' : 'none';
    const dots = $('lvDots'); dots.innerHTML = '';
    LV.forEach((x, i) => { const d = document.createElement('i'); d.className = (i === sel ? 'on ' : '') + 't' + x.tier; d.onclick = () => { sel = i; renderSelect(); }; dots.appendChild(d); });
    store.set('sel', sel);
  }
  function selMove(d) { sel = (sel + d + LV.length) % LV.length; renderSelect(); const c = $('lvCard'); c.classList.remove('slideL', 'slideR'); void c.offsetWidth; c.classList.add(d > 0 ? 'slideL' : 'slideR'); }

  // icon kit
  function renderIcons() {
    $('iconPrev').innerHTML = ''; $('iconPrev').appendChild(Art.iconCanvas(icon.d, col1(), col2(), 120));
    const g = $('iconGrid'); g.innerHTML = '';
    for (let d = 0; d < Art.DESIGNS; d++) {
      const b = document.createElement('div'); b.className = 'cell' + (d === icon.d ? ' on' : '');
      b.appendChild(Art.iconCanvas(d, col1(), col2(), 54)); b.onclick = () => { icon.d = d; store.set('icon', icon); renderIcons(); }; g.appendChild(b);
    }
    for (const [id, key] of [['col1', 'c1'], ['col2', 'c2']]) {
      const row = $(id); row.innerHTML = '';
      Art.COLORS.forEach((c, i) => { const b = document.createElement('div'); b.className = 'sw' + (icon[key] === i ? ' on' : ''); b.style.background = c; b.onclick = () => { icon[key] = i; store.set('icon', icon); renderIcons(); }; row.appendChild(b); });
    }
  }
  function drawMenuIcon() { const m = $('menuIcon'); m.innerHTML = ''; m.appendChild(Art.iconCanvas(icon.d, col1(), col2(), 64)); }

  // ---------- run control ----------
  function startLevel(prac) {
    practice = prac; attempt = 1; checkpoints = [];
    loadLevel(sel);
    mode = 'play'; showScreen(null); $('hud').style.display = 'block';
    $('pracTag').style.display = practice ? 'block' : 'none';
    $('cpBtns').style.display = practice ? 'flex' : 'none';
    $('hudName').textContent = LV[cur].name;
    resetRun();
  }
  function resetRun() {
    const cp = practice && checkpoints.length ? checkpoints[checkpoints.length - 1] : null;
    if (cp) { s = Engine.clone(cp.s); rot = cp.rot; }
    else { s = Engine.newState(); rot = 0; levelTime = 0; }
    [bgCol, grCol] = colorAt(s.x); bgT = bgCol.slice(); grT = grCol.slice();
    camX = s.x - viewW() * 0.3; camY = targetCamY(); particles = []; ripples = []; deadTimer = 0; cpTimer = 0;
    Music.start(musicCfg(LV[cur]));
    const pr = P(LV[cur].name); pr.att++; saveProg();
  }
  const viewW = () => W / U;
  function targetCamY() { const extra = Math.max(0, H / U - VIEW_H) * 0.45; return (s.mode === 'ship' ? -1 : Math.max(-2.5, s.y - 6.5)) - extra; }

  // ---------- input ----------
  function press() { Music.init(); if (mode === 'play') held = true; }
  function release() { held = false; }
  const JUMPKEYS = ['Space', 'ArrowUp', 'KeyW'];
  window.addEventListener('keydown', e => {
    if (JUMPKEYS.includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (mode === 'select' && e.code === 'Space') startLevel(false); else press(); } return; }
    if (mode === 'select') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') selMove(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') selMove(1);
      else if (e.code === 'Enter') startLevel(false);
      else if (e.code === 'Escape') goMenu();
      return;
    }
    if (mode === 'menu' && e.code === 'Enter') { goSelect(); return; }
    if (mode === 'icons' && e.code === 'Escape') { goMenu(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'play') pause(); else if (mode === 'paused') resume(); }
    else if (e.code === 'KeyR' && (mode === 'play' || mode === 'paused')) restart();
    else if (e.code === 'KeyZ' && mode === 'play' && practice) placeCP();
    else if (e.code === 'KeyX' && mode === 'play' && practice) checkpoints.pop();
    else if (e.code === 'KeyM') $('muteBtn').textContent = Music.toggleMute() ? '🔇' : '🔊';
  });
  window.addEventListener('keyup', e => { if (JUMPKEYS.includes(e.code)) release(); });
  cv.addEventListener('mousedown', e => { if (e.button === 0) press(); });
  window.addEventListener('mouseup', release);
  cv.addEventListener('touchstart', e => { e.preventDefault(); press(); }, { passive: false });
  cv.addEventListener('touchend', e => { e.preventDefault(); if (e.touches.length === 0) release(); }, { passive: false });
  window.addEventListener('blur', () => { held = false; if (mode === 'play') pause(); });
  // swipe on level select
  let tx0 = null;
  $('select').addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
  $('select').addEventListener('touchend', e => { if (tx0 == null) return; const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 50) selMove(dx < 0 ? 1 : -1); tx0 = null; }, { passive: true });

  function pause() { mode = 'paused'; showScreen('pause'); Music.stop(); held = false; $('pausePct').textContent = Math.min(100, Math.floor(s.x / L.endX * 100)) + '%'; $('pauseName').textContent = LV[cur].name; }
  function resume() { if (mode !== 'paused') return; mode = 'play'; showScreen(null); $('hud').style.display = 'block'; last = performance.now(); Music.start(musicCfg(LV[cur])); }
  function restart() { if (mode === 'paused') resume(); if (!practice) checkpoints = []; s.dead = true; deadTimer = 99; }
  function placeCP() { if (s.dead || s.won) return; checkpoints.push({ s: Engine.clone(s), rot }); }

  const click = (id, fn) => { const el = $(id); el.onclick = e => { e.stopPropagation(); fn(); }; el.addEventListener('mousedown', e => e.stopPropagation()); el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true }); };
  click('playBtn', goSelect); click('iconBtn', goIcons); click('iconBack', goMenu); click('selBack', goMenu);
  click('lvPrev', () => selMove(-1)); click('lvNext', () => selMove(1));
  click('lvCard', () => startLevel(false)); click('lvPrac', () => startLevel(true));
  click('resumeBtn', resume); click('restartBtn', restart); click('menuBtn', goSelect);
  click('pauseBtn', () => { if (mode === 'play') pause(); });
  click('muteBtn', () => { $('muteBtn').textContent = Music.toggleMute() ? '🔇' : '🔊'; });
  click('winRestart', () => startLevel(practice)); click('winMenu', goSelect);
  click('winNext', () => { sel = (cur + 1) % LV.length; startLevel(false); });
  click('cpAdd', placeCP); click('cpDel', () => checkpoints.pop());

  // ---------- update ----------
  function burst(x, y, n, col, spd, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, col, size: size * (0.5 + Math.random()) });
    }
  }
  function update(dt) {
    if (s.dead) {
      deadTimer += dt;
      if (deadTimer > 1.0) { attempt++; resetRun(); }
    } else if (!s.won) {
      acc += dt;
      while (acc >= Engine.DT) {
        acc -= Engine.DT;
        Engine.step(L, s, held);
        levelTime += Engine.DT;
        handleEvents();
        if (s.dead || s.won) { acc = 0; break; }
        if (s.mode === 'cube') {
          if (s.onGround) { const tgt = Math.round(rot / 90) * 90; rot = lerp(rot, tgt, 0.35); }
          else rot += 400 * Engine.DT;
        }
      }
      if (practice && !s.dead) { cpTimer += dt; if (cpTimer > 2.5 && (s.onGround || s.mode === 'ship')) { cpTimer = 0; placeCP(); } }
    }
    const tgtShip = s.mode === 'ship' ? -Math.atan2(s.vy, s.speed * 1.4) * 180 / Math.PI : 0;
    shipRot = lerp(shipRot, tgtShip, 0.3);
    if (!s.dead && !s.won) {
      const c1 = hex(col1()), c2 = hex(col2());
      if (s.mode === 'cube' && s.onGround && Math.random() < 0.7)
        particles.push({ x: s.x + 0.05, y: s.y + 0.05, vx: -1 - Math.random() * 2, vy: Math.random() * 2, life: 0.35, max: 0.35, col: c2, size: 0.12 });
      if (s.mode === 'ship') for (let i = 0; i < 2; i++)
        particles.push({ x: s.x + 0.05, y: s.y + 0.3 + (Math.random() - 0.5) * 0.2, vx: -3 - Math.random() * 3, vy: (Math.random() - 0.5) * 2, life: 0.3, max: 0.3, col: held ? [255, 220, 90] : c1, size: 0.16 });
    }
    stepParticles(dt);
    if (!s.dead) camX = s.x - viewW() * 0.3;
    camY = lerp(camY, targetCamY(), Math.min(1, dt * (s.mode === 'ship' ? 4 : 5)));
    for (let i = 0; i < 3; i++) { bgCol[i] = lerp(bgCol[i], bgT[i], dt * 2.5); grCol[i] = lerp(grCol[i], grT[i], dt * 2.5); }
    shake = Math.max(0, shake - dt * 3); flash = Math.max(0, flash - dt * 2.5);
  }
  function stepParticles(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    for (const r of ripples) r.t += dt; ripples = ripples.filter(r => r.t < r.max);
  }
  function handleEvents() {
    for (const ev of s.events) {
      if (ev.e === 'die') {
        Music.stop(); Music.sfxDie(); shake = 1;
        burst(s.x + 0.5, s.y + 0.5, 40, hex(col1()), 9, 0.8, 0.22);
        ripples.push({ x: s.x + 0.5, y: s.y + 0.5, t: 0, max: 0.5, r: 3.5, col: [255, 255, 255] });
        const pct = Math.min(99, Math.floor(s.x / L.endX * 100)), pr = P(LV[cur].name);
        if (practice) { if (pct > pr.p) pr.p = pct; }
        else if (pct > pr.n) { pr.n = pct; newBest(pct); }
        saveProg();
      } else if (ev.e === 'orb' || ev.e === 'pad') {
        const o = ev.o; ripples.push({ x: o.x + 0.5, y: o.y + (ev.e === 'pad' ? 0.15 : 0.5), t: 0, max: 0.35, r: 1.6, col: o.pink ? [255, 90, 220] : [255, 230, 60] });
      } else if (ev.e === 'portal') {
        flash = 0.6; ripples.push({ x: ev.o.x + 0.5, y: ev.o.y + 1.5, t: 0, max: 0.5, r: 3, col: ev.o.mode === 'ship' ? [255, 90, 220] : [90, 255, 120] });
      } else if (ev.e === 'color') { bgT = hex(ev.o.bg); grT = hex(ev.o.gr); }
      else if (ev.e === 'win') win();
    }
    s.events.length = 0;
  }
  let nbTimer = 0;
  function newBest(p) { const el = $('newBest'); el.textContent = 'NEW BEST! ' + p + '%'; el.style.opacity = 1; el.style.transform = 'translate(-50%,-50%) scale(1.15)'; clearTimeout(nbTimer); nbTimer = setTimeout(() => { el.style.opacity = 0; el.style.transform = 'translate(-50%,-50%) scale(0.9)'; }, 900); }
  function win() {
    Music.stop(); Music.sfxWin();
    burst(s.x + 0.5, s.y + 0.5, 80, [255, 240, 120], 12, 1.4, 0.25);
    const pr = P(LV[cur].name);
    if (practice) pr.p = 100; else { pr.n = 100; pr.done = true; }
    saveProg();
    setTimeout(() => {
      mode = 'win'; showScreen('win');
      $('winName').textContent = LV[cur].name;
      $('winFace').innerHTML = ''; $('winFace').appendChild(Art.faceCanvas(LV[cur].tier, 70));
      $('winAtt').textContent = attempt; $('winJumps').textContent = s.jumps;
      $('winTime').textContent = levelTime.toFixed(1) + 's';
      $('winStars').textContent = practice ? '—' : '★ ' + LV[cur].stars;
      $('winMode').textContent = practice ? 'PRACTICE MODE' : '';
    }, 1200);
  }

  // ---------- drawing ----------
  const SX = x => (x - camX) * U, SY = y => H - (y - camY) * U;
  function beatPulse() { const b = Music.beat(); if (b < 0) return 0; return Math.pow(1 - (b - Math.floor(b)), 3); }

  function drawBG(pulse) {
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(mix(bgCol, 0.55))); g.addColorStop(1, rgb(bgCol));
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    const par = 0.12, size = 5 * U;
    const ox = -((camX * par * U) % size) - size, oy = ((camY * par * U) % size);
    cx.lineWidth = 2;
    for (let i = 0; i * size + ox < W + size; i++) for (let j = -1; j * size < H + size; j++) {
      const k = (i + Math.floor(camX * par / 5)) * 7 + j * 13;
      if ((k * 2654435761 >>> 0) % 5 < 2) {
        cx.fillStyle = rgb(mix(bgCol, 1.15), 0.12 + pulse * 0.06); cx.strokeStyle = rgb(mix(bgCol, 1.5), 0.15);
        cx.fillRect(ox + i * size + 6, oy + j * size + 6, size - 12, size - 12); cx.strokeRect(ox + i * size + 6, oy + j * size + 6, size - 12, size - 12);
      }
    }
  }
  function drawGround(y, flip, pulse) {
    const gy = SY(y);
    cx.save(); cx.beginPath(); if (flip) cx.rect(0, 0, W, gy); else cx.rect(0, gy, W, H - gy); cx.clip();
    const g = cx.createLinearGradient(0, gy, 0, flip ? gy - 4 * U : gy + 4 * U);
    g.addColorStop(0, rgb(grCol)); g.addColorStop(1, rgb(mix(grCol, 0.45)));
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    const ts = 4 * U, off = -((camX * U) % ts);
    cx.strokeStyle = rgb(mix(grCol, 1.5), 0.35); cx.lineWidth = 2;
    for (let x = off - ts; x < W + ts; x += ts) cx.strokeRect(x + 3, flip ? gy - ts + 3 : gy + 3, ts - 6, ts - 6);
    cx.restore();
    const lg = cx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, rgb(LCa, 0)); lg.addColorStop(0.5, rgb(tint(LCa, 0.5), 0.9 + pulse * 0.1)); lg.addColorStop(1, rgb(LCa, 0));
    cx.save(); cx.shadowColor = LC; cx.shadowBlur = U * 0.5; cx.fillStyle = lg; cx.fillRect(0, gy - 2, W, 4); cx.restore();
    cx.fillStyle = `rgba(255,255,255,${0.08 + pulse * 0.08})`; cx.fillRect(0, flip ? gy : gy - 6, W, 6);
  }
  let LC = 'rgb(160,220,255)', LCa = [160, 220, 255];
  const tint = (c, k) => c.map(v => v + (255 - v) * k);
  function drawBlock(b) {
    const x = SX(b.x), y = SY(b.y + b.h), w = b.w * U, h = b.h * U;
    const g = cx.createLinearGradient(0, y, 0, y + Math.max(h, U));
    g.addColorStop(0, 'rgba(0,0,0,0.96)'); g.addColorStop(0.55, 'rgba(0,0,0,0.9)'); g.addColorStop(1, rgb(mix(bgCol, 0.75), 0.9));
    cx.fillStyle = g; cx.fillRect(x, y, w, h);
    if (b.chain) { // chain up to the sky
      cx.strokeStyle = rgb(LCa, 0.9); cx.lineWidth = Math.max(2, U * 0.06);
      for (let cy = y - U * 0.3; cy > -U; cy -= U * 0.42) { cx.beginPath(); cx.ellipse(x + w / 2, cy, U * 0.1, U * 0.2, 0, 0, 7); cx.stroke(); }
    }
    cx.strokeStyle = 'rgba(255,255,255,0.10)'; cx.lineWidth = 1; cx.strokeRect(x + U * 0.12, y + U * 0.12, w - U * 0.24, h - U * 0.24);
    cx.save(); cx.strokeStyle = LC; cx.lineWidth = Math.max(2, U * 0.07); cx.shadowColor = LC; cx.shadowBlur = U * 0.35;
    cx.strokeRect(x + 1, y + 1, w - 2, h - 2); cx.restore();
  }
  function drawDeco(o) { // glowing grass tufts
    const x = SX(o.x), y = SY(o.y), n = 5 + o.v * 2;
    cx.save(); cx.fillStyle = rgb(LCa, 0.45); cx.shadowColor = LC; cx.shadowBlur = U * 0.3;
    cx.beginPath(); cx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const px = x + (i + 0.5) / n * U * (1.2 + o.v * 0.5), hh = U * (0.15 + ((i * 37 + o.v * 11) % 7) / 28);
      cx.lineTo(px - U * 0.08, y); cx.lineTo(px + ((i % 3) - 1) * U * 0.08, y - hh); cx.lineTo(px + U * 0.08, y);
    }
    cx.closePath(); cx.fill(); cx.restore();
  }
  function drawClouds() {
    const par = 0.25, sp = 9 * U;
    const ox = -((camX * par * U) % sp) - sp;
    cx.fillStyle = rgb(tint(bgCol, 0.25), 0.22);
    for (let i = 0; i * sp + ox < W + sp; i++) {
      const k = (Math.floor(camX * par / 9) + i) * 2654435761 >>> 0;
      if (k % 3 === 0) continue;
      const bx = ox + i * sp + (k % 97) / 97 * U * 3, by = SY(-0.2) - U * (1 + (k % 5) * 0.4);
      cx.beginPath();
      cx.arc(bx, by, U * 1.4, Math.PI, 0); cx.arc(bx + U * 1.8, by - U * 0.6, U * 1.7, Math.PI, 0); cx.arc(bx + U * 3.8, by, U * 1.3, Math.PI, 0);
      cx.lineTo(bx + U * 5.1, SY(-0.2)); cx.lineTo(bx - U * 1.4, SY(-0.2)); cx.closePath(); cx.fill();
    }
  }
  function drawSpike(o) {
    const x = SX(o.x), down = o.dir === 'down', hh = o.small ? 0.45 : 1;
    const base = down ? SY(o.y + 1) : SY(o.y), tip = down ? SY(o.y + 1 - hh) : SY(o.y + hh);
    const g = cx.createLinearGradient(0, base, 0, tip);
    g.addColorStop(0, rgb(mix(bgCol, 0.55), 0.95)); g.addColorStop(0.6, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0.95)');
    cx.beginPath(); cx.moveTo(x + U * 0.04, base); cx.lineTo(x + U / 2, tip); cx.lineTo(x + U * 0.96, base); cx.closePath();
    cx.fillStyle = g; cx.fill();
    cx.save(); cx.strokeStyle = LC; cx.lineWidth = Math.max(2, U * 0.065); cx.lineJoin = 'round';
    cx.shadowColor = LC; cx.shadowBlur = U * 0.3; cx.stroke(); cx.restore();
  }
  function drawSaw(o, t) { // spinning spiked disc
    const x = SX(o.x), y = SY(o.y), r = o.r * U, n = 14;
    cx.save(); cx.translate(x, y); cx.rotate(-t * 5);
    cx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * 0.72 : r; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    cx.closePath();
    cx.fillStyle = '#050505'; cx.fill();
    cx.strokeStyle = LC; cx.lineWidth = Math.max(2, U * 0.05); cx.lineJoin = 'miter'; cx.shadowColor = LC; cx.shadowBlur = 8; cx.stroke(); cx.shadowBlur = 0;
    const g = cx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.6);
    g.addColorStop(0, '#666'); g.addColorStop(1, '#111');
    cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, r * 0.55, 0, 7); cx.fill();
    cx.strokeStyle = 'rgba(255,255,255,0.35)'; cx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(0, 0, r * 0.4, i * 2.1, i * 2.1 + 1); cx.stroke(); }
    cx.restore();
  }
  function drawPad(o, pulse) {
    const x = SX(o.x), y = SY(o.y), col = o.pink ? '#ff4fd8' : '#ffe23c';
    cx.save(); cx.shadowColor = col; cx.shadowBlur = 14 + pulse * 10; cx.fillStyle = col;
    cx.beginPath(); cx.moveTo(x + U * 0.08, y); cx.quadraticCurveTo(x + U * 0.5, y - U * 0.5, x + U * 0.92, y); cx.closePath(); cx.fill();
    cx.restore();
    const g = cx.createLinearGradient(0, y, 0, y - U * 1.3); g.addColorStop(0, o.pink ? 'rgba(255,120,230,0.35)' : 'rgba(255,240,120,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(x + U * 0.1, y - U * 1.3, U * 0.8, U * 1.3);
  }
  function drawOrb(o, pulse, t) { // glowing core + white ring
    const x = SX(o.x + 0.5), y = SY(o.y + 0.5), used = s.used.has(o.id);
    const core = o.pink ? ['#ffe0f8', '#ff3fc8'] : ['#fffbd0', '#ffd400'];
    const r = U * (0.3 + pulse * 0.04);
    cx.save();
    cx.globalAlpha = used ? 0.35 : 1;
    const halo = cx.createRadialGradient(x, y, r * 0.5, x, y, U * 0.9);
    halo.addColorStop(0, o.pink ? 'rgba(255,80,220,0.45)' : 'rgba(255,230,60,0.45)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = halo; cx.beginPath(); cx.arc(x, y, U * 0.9, 0, 7); cx.fill();
    cx.strokeStyle = '#fff'; cx.lineWidth = U * 0.06; cx.shadowColor = '#fff'; cx.shadowBlur = 10;
    cx.beginPath(); cx.arc(x, y, U * (0.5 + 0.05 * Math.sin(t * 6)), 0, 7); cx.stroke();
    cx.shadowColor = core[1]; cx.shadowBlur = 18;
    const g = cx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, core[0]); g.addColorStop(1, core[1]);
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill();
    cx.restore();
  }
  // 3D ring portal: tilted ellipse ring with a dark striped side band
  const PORTAL_COL = { ship: ['#ff4fd8', '#ffc2f2'], cube: ['#3dff5a', '#c8ffd0'] };
  function drawPortal(o, t, part) {
    const cxp = SX(o.x + 0.5), cyp = SY(o.y + 1.5), rx = U * 0.42, ry = U * 1.6, depth = U * 0.75;
    const [c, light] = PORTAL_COL[o.mode];
    if (part === 'back') {
      // side band (right side, depth)
      cx.save();
      cx.beginPath();
      cx.ellipse(cxp, cyp, rx, ry, 0, -Math.PI / 2, Math.PI / 2);
      cx.lineTo(cxp + depth, cyp + ry);
      cx.ellipse(cxp + depth, cyp, rx, ry, 0, Math.PI / 2, -Math.PI / 2, true);
      cx.closePath();
      cx.fillStyle = '#050505'; cx.fill();
      cx.clip();
      // stripes (slanted light bars along band)
      cx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = -7; i <= 7; i++) {
        const yy = cyp + i * ry / 7.5, w = Math.cos(i / 7.5 * Math.PI / 2);
        const off = ((t * 0.8 + i * 0.13) % 1) * 0.15 * U;
        cx.save(); cx.translate(cxp + rx * w + depth * 0.25 + off, yy); cx.transform(1, -0.25, 0, 1, 0, 0);
        cx.fillRect(0, -U * 0.045, depth * 0.45 * (0.4 + w * 0.6), U * 0.09); cx.restore();
      }
      cx.restore();
      cx.strokeStyle = 'rgba(0,0,0,0.9)'; cx.lineWidth = 2;
      cx.beginPath(); cx.ellipse(cxp + depth, cyp, rx, ry, 0, -Math.PI / 2, Math.PI / 2); cx.stroke();
      // inner dark + glow fill
      cx.fillStyle = 'rgba(0,0,0,0.35)'; cx.beginPath(); cx.ellipse(cxp, cyp, rx * 0.8, ry * 0.92, 0, 0, 7); cx.fill();
      // back half of ring
      ring(cxp, cyp, rx, ry, c, light, Math.PI / 2, Math.PI * 1.5);
      // nodes top/bottom
      cx.fillStyle = c; cx.shadowColor = c; cx.shadowBlur = 12;
      cx.beginPath(); cx.arc(cxp + depth * 0.2, cyp - ry - U * 0.35, U * 0.16, 0, 7); cx.fill();
      cx.beginPath(); cx.arc(cxp + depth * 0.2, cyp + ry + U * 0.35, U * 0.16, 0, 7); cx.fill();
      cx.shadowBlur = 0;
    } else ring(cxp, cyp, rx, ry, c, light, -Math.PI / 2, Math.PI / 2);
  }
  function ring(x, y, rx, ry, c, light, a0, a1) {
    cx.save(); cx.shadowColor = c; cx.shadowBlur = 22;
    cx.strokeStyle = c; cx.lineWidth = U * 0.2; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, a0, a1); cx.stroke();
    cx.shadowBlur = 0; cx.strokeStyle = light; cx.lineWidth = U * 0.06; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, a0, a1); cx.stroke();
    cx.restore();
  }
  function drawSpeed(o, t) {
    const x = SX(o.x), y = SY(o.y + 1.5), col = ['#ffb340', '#40e0ff', '#3dff5a', '#ff4fd8'][o.v];
    cx.save(); cx.shadowColor = col; cx.shadowBlur = 16; cx.fillStyle = col; cx.strokeStyle = '#fff'; cx.lineWidth = 2;
    for (let i = 0; i < o.v + 1; i++) {
      const ox = x + i * U * 0.4 + Math.sin(t * 8) * 2;
      cx.beginPath(); cx.moveTo(ox, y - U * 0.8); cx.lineTo(ox + U * 0.5, y); cx.lineTo(ox, y + U * 0.8); cx.lineTo(ox + U * 0.18, y); cx.closePath(); cx.fill(); cx.stroke();
    }
    cx.restore();
  }

  function draw(t, showPlayer) {
    const pulse = beatPulse();
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sh = shake * shake * 10;
    cx.save(); if (sh) cx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    LCa = tint(bgCol, 0.62); LC = rgb(LCa);
    drawBG(pulse);
    drawClouds();
    const x0 = camX - 3, x1 = camX + viewW() + 3;
    const vis = o => o.x + (o.w || 1) > x0 && o.x - (o.r || 0) < x1;
    for (const o of L.triggers) if (o.t === 'portal' && vis(o)) drawPortal(o, t, 'back');
    for (const o of L.triggers) if (o.t === 'speed' && vis(o)) drawSpeed(o, t);
    if (mode === 'play' || mode === 'paused') {
      const ax = SX(6), ay = SY(5.5);
      if (ax > -600) {
        cx.font = `${U * 0.9}px 'Russo One', Arial Black, sans-serif`; cx.textAlign = 'left';
        cx.lineWidth = U * 0.14; cx.strokeStyle = 'rgba(0,0,0,0.55)'; cx.strokeText('Attempt ' + attempt, ax, ay);
        cx.fillStyle = '#fff'; cx.fillText('Attempt ' + attempt, ax, ay);
      }
    }
    for (const o of L.decos) if (vis(o)) drawDeco(o);
    for (const o of L.hazards) if (o.t === 'saw' && vis(o)) drawSaw(o, t);
    for (const o of L.solids) if (vis(o)) drawBlock(o);
    for (const o of L.hazards) if (o.t === 'spike' && vis(o)) drawSpike(o);
    for (const o of L.pads) if (vis(o)) drawPad(o, pulse);
    for (const o of L.orbs) if (vis(o)) drawOrb(o, pulse, t);
    if (L.endX < x1) {
      const ex = SX(L.endX);
      const g = cx.createLinearGradient(ex, 0, ex + 6 * U, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
      cx.fillStyle = g; cx.fillRect(ex, 0, 6 * U + W, H);
    }
    for (const c of checkpoints) if (c.s.x > x0 && c.s.x < x1) {
      const x = SX(c.s.x + 0.5), y = SY(c.s.y + 0.5);
      cx.fillStyle = '#4dff6a'; cx.strokeStyle = '#063'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(x, y - U * 0.35); cx.lineTo(x + U * 0.25, y); cx.lineTo(x, y + U * 0.35); cx.lineTo(x - U * 0.25, y); cx.closePath(); cx.fill(); cx.stroke();
    }
    drawGround(0, false, pulse);
    if (showPlayer && s.ceil != null) drawGround(s.ceil, true, pulse);
    for (const p of particles) {
      cx.fillStyle = rgb(p.col, Math.max(0, p.life / p.max)); const sz = p.size * U;
      cx.fillRect(SX(p.x) - sz / 2, SY(p.y) - sz / 2, sz, sz);
    }
    if (showPlayer && !s.dead) {
      cx.save(); cx.translate(SX(s.x + 0.5), SY(s.y + (s.mode === 'cube' ? 0.5 : 0.3)));
      if (s.mode === 'cube') { cx.rotate(rot * Math.PI / 180); Art.cube(cx, U, icon.d, col1(), col2()); }
      else { cx.rotate(shipRot * Math.PI / 180); Art.ship(cx, U, icon.d, col1(), col2()); }
      cx.restore();
    }
    for (const o of L.triggers) if (o.t === 'portal' && vis(o)) drawPortal(o, t, 'front');
    for (const r of ripples) {
      const k = r.t / r.max; cx.strokeStyle = rgb(r.col, 1 - k); cx.lineWidth = U * 0.12 * (1 - k) + 1;
      cx.beginPath(); cx.arc(SX(r.x), SY(r.y), r.r * U * k, 0, Math.PI * 2); cx.stroke();
    }
    cx.restore();
    if (flash > 0) { cx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; cx.fillRect(0, 0, W, H); }
    const vg = cx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
    if (mode === 'play' || mode === 'paused') {
      const p = Math.max(0, Math.min(1, s.x / L.endX));
      $('progFill').style.width = (p * 100) + '%'; $('progPct').textContent = Math.floor(p * 100) + '%';
    }
  }

  let demoX = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'play') { update(dt); draw(now / 1000, true); }
    else if (mode === 'paused') draw(now / 1000, true);
    else {
      demoX += dt * 7; camX = (demoX % Math.max(30, L.endX - 20)) - 10; camY = lerp(camY, -2.5 - Math.max(0, H / U - VIEW_H) * 0.45, 0.1);
      const [b, g] = colorAt(camX + 10); for (let i = 0; i < 3; i++) { bgCol[i] = lerp(bgCol[i], b[i], dt * 2); grCol[i] = lerp(grCol[i], g[i], dt * 2); }
      stepParticles(dt); draw(now / 1000, mode === 'win');
    }
    requestAnimationFrame(frame);
  }
  goMenu();
  requestAnimationFrame(frame);
})();
