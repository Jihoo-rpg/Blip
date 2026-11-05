'use strict';
/* ===== 게임: 플레이어 · 행인 · 교통 · 경찰 · 미션 · HUD ===== */
const SAVE_KEY = 'seoulcity_v1';
function loadSave() { try { return Object.assign({ money: 30000, story: 0, stolen: 0, deliveries: 0, fares: 0, busted: 0, wasted: 0, best: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return { money: 30000, story: 0, stolen: 0, deliveries: 0, fares: 0, busted: 0, wasted: 0, best: {} }; } }
let SV = loadSave(); const hadSave = !!localStorage.getItem(SAVE_KEY);
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SV)); } catch (e) { } }
const G = { on: false, paused: false, t: 0, wanted: 0, wantFlash: false, evadeT: 0, lastSeen: 0, crimeCD: 0, shake: 0, camMode: 1, help: !IS_MOBILE };
const MAXN = { peds: QUALITY.low ? 12 : 22, traffic: QUALITY.low ? 11 : 18 };

/* ---------- 입력 ---------- */
const K = {}; const IN = { mx: 0, mz: 0, look: [0, 0], punch: false, jump: false, car: false, act: false, sprint: false, hand: false, horn: false };
addEventListener('keydown', e => {
  if (e.repeat) { K[e.code] = 1; return; } K[e.code] = 1; auInit();
  if (!G.on) return;
  if (e.code === 'Tab') { e.preventDefault(); togglePhone(); return; }
  if (!$('#phone').hidden) { if (e.code === 'Escape') closePhone(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); return; }
  if (G.paused) return;
  if (e.code === 'KeyF' || e.code === 'Enter') IN.car = true;
  if (e.code === 'KeyE') IN.act = true;
  if (e.code === 'Space') { IN.jump = true; e.preventDefault(); }
  if (e.code === 'KeyJ') IN.punch = true;
  if (e.code === 'KeyH') IN.horn = true;
  if (e.code === 'KeyR') nextRadio();
  if (e.code === 'KeyM') openMap();
  if (e.code === 'KeyC') cycleCam();
  if (e.code === 'KeyT') startTaxiJob();
  if (e.code === 'KeyQ') IN.wsw = 1;
  const dg = /^Digit([1-4])$/.exec(e.code); if (dg) IN.wsel = WORDER[+dg[1] - 1];
  if (e.code === 'F1' || e.code === 'Slash') { G.help = !G.help; e.preventDefault(); }
});
addEventListener('keyup', e => { K[e.code] = 0; });
addEventListener('blur', () => { for (const k in K) K[k] = 0; });
cv.addEventListener('mousedown', e => { auInit(); if (!G.on || G.paused) return; if (document.pointerLockElement !== cv && !IS_MOBILE) { cv.requestPointerLock && cv.requestPointerLock(); return; } if (e.button === 0) { IN.punch = true; IN.fireHeld = true; IN.mouseL = true; } if (e.button === 2) IN.aim = true; });
addEventListener('mouseup', e => { if (e.button === 0) { IN.mouseL = false; IN.fireHeld = false; } if (e.button === 2) IN.aim = false; });
addEventListener('mousemove', e => { if (document.pointerLockElement === cv) { IN.look[0] += e.movementX; IN.look[1] += e.movementY; } });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { CAMS.zoom = clamp(CAMS.zoom * (e.deltaY > 0 ? 1.1 : .9), .55, 2); });
// 터치
const TOUCH = { joy: null, look: null, jx: 0, jy: 0 };
{
  const J = $('#joy'), Kn = $('#joyK');
  const set = (x, y) => { const r = J.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = x - cx, dy = y - cy; const m = r.width * .4, l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } Kn.style.transform = `translate(${dx}px,${dy}px)`; TOUCH.jx = dx / m; TOUCH.jy = dy / m; };
  J.addEventListener('pointerdown', e => { auInit(); TOUCH.joy = e.pointerId; J.setPointerCapture(e.pointerId); set(e.clientX, e.clientY); });
  J.addEventListener('pointermove', e => { if (TOUCH.joy === e.pointerId) set(e.clientX, e.clientY); });
  const up = () => { TOUCH.joy = null; Kn.style.transform = ''; TOUCH.jx = TOUCH.jy = 0; }; J.addEventListener('pointerup', up); J.addEventListener('pointercancel', up);
  cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return; auInit(); if (TOUCH.look == null) { TOUCH.look = e.pointerId; TOUCH.lx = e.clientX; TOUCH.ly = e.clientY; } });
  addEventListener('pointermove', e => { if (TOUCH.look === e.pointerId) { IN.look[0] += (e.clientX - TOUCH.lx) * 1.6; IN.look[1] += (e.clientY - TOUCH.ly) * 1.6; TOUCH.lx = e.clientX; TOUCH.ly = e.clientY; } });
  addEventListener('pointerup', e => { if (TOUCH.look === e.pointerId) TOUCH.look = null; }); addEventListener('pointercancel', e => { if (TOUCH.look === e.pointerId) TOUCH.look = null; });
  const hold = (id, k) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); auInit(); IN[k + 'H'] = true; b.classList.add('on'); }); const u = () => { IN[k + 'H'] = false; if (k !== 'run') b.classList.remove('on'); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
  $('#bAct').addEventListener('pointerdown', e => { e.preventDefault(); auInit(); if (PL.car) IN.horn = true; else { IN.punch = true; IN.fireHeld = IN.fireHeldTouch = true; } });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('#bAct').addEventListener(ev, () => { IN.fireHeldTouch = false; IN.fireHeld = false; });
  $('#weap').addEventListener('pointerdown', e => { e.preventDefault(); IN.wsw = 1; });
  $('#bPhone').addEventListener('pointerdown', e => { e.preventDefault(); auInit(); togglePhone(); });
  $('#bJump').addEventListener('pointerdown', e => { e.preventDefault(); auInit(); IN.jump = true; });
  $('#bCar').addEventListener('pointerdown', e => { e.preventDefault(); auInit(); if (PROMPT.act && !PL.car) IN.act = true; else IN.car = true; });
  $('#bRun').addEventListener('pointerdown', e => { e.preventDefault(); auInit(); IN.sprintT = !IN.sprintT; $('#bRun').classList.toggle('on', IN.sprintT); });
  hold('#bHand', 'hand'); $('#bHorn').addEventListener('pointerdown', e => { e.preventDefault(); IN.horn = true; });
  $('#bPause').onclick = () => togglePause(); $('#bMap').onclick = () => openMap(); $('#bRadio').onclick = () => nextRadio(); $('#bCam').onclick = () => cycleCam();
}
function readInput() {
  let mx = TOUCH.jx, mz = -TOUCH.jy;
  if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1; if (K.KeyW || K.ArrowUp) mz += 1; if (K.KeyS || K.ArrowDown) mz -= 1;
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; } IN.mx = mx; IN.mz = mz;
  IN.sprint = K.ShiftLeft || K.ShiftRight || IN.sprintT; IN.walk = K.AltLeft || K.KeyX; IN.hand = K.Space || IN.handH;
}

/* ---------- 효과 (연기 · 불 · 반짝) ---------- */
const FX = { list: [] };
const fxTex = { smoke: ctex(64, 64, (g, W, H) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }) };
function fx(kind, x, y, z, o) {
  if (FX.list.length > 140) return; o = o || {};
  const col = { smoke: '#555', dust: '#b9a98f', fire: '#ff8a1e', spark: '#ffd27a', flash: '#fff3c0', cash: '#7ee08a' }[kind];
  const m = new T.SpriteMaterial({ map: fxTex.smoke, color: col, transparent: true, depthWrite: false, blending: kind === 'fire' || kind === 'spark' || kind === 'flash' ? T.AdditiveBlending : T.NormalBlending, opacity: o.a || .8 });
  const s = new T.Sprite(m); s.position.set(x, y, z); const sz = o.s || 1; s.scale.set(sz, sz, sz); scene.add(s);
  FX.list.push({ s, t: 0, life: o.life || 1, vx: o.vx || rand(-.5, .5), vy: o.vy == null ? 1 : o.vy, vz: o.vz || rand(-.5, .5), grow: o.g || 1.5, a: o.a || .8, sz });
}
function fxUpdate(dt) { for (let i = FX.list.length - 1; i >= 0; i--) { const p = FX.list[i]; p.t += dt; const k = p.t / p.life; if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); FX.list.splice(i, 1); continue; } p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; if (!p.lbl) { const s = p.sz * (1 + k * p.grow); p.s.scale.set(s, s, s); } p.s.material.opacity = p.a * (p.lbl ? Math.min(1, (1 - k) * 3) : 1 - k); } }

/* ---------- 플레이어 ---------- */
const PL = { P: null, x: 0, z: 0, y: 0, vy: 0, yaw: 0, spd: 0, car: null, punchT: 0, punchHit: false, stompT: 0, ko: 0, koMax: 1, hp: 100, ar: 0, dmgT: 99, grab: 0, isPlayer: true, side: 1, kv: [0, 0], stepT: 0, fireCD: 0, aimT: 0, gun: null, gunW: null };
function playerLook() { return Object.assign({}, LOOKS.player, SV.outfit || {}); }
function spawnPlayer() { if (PL.P) { PL.P.root.parent && PL.P.root.parent.remove(PL.P.root); PL.P.mixer.stopAllAction(); } PL.P = makePerson(playerLook()); scene.add(PL.P.root); setShadow(PL.P, true); if (PL.car && PL.car.S.bike) mountBike(PL.car); }
function playerPos(x, z, yaw) { PL.x = x; PL.z = z; PL.y = groundY(x, z); PL.yaw = yaw || 0; CAMS.yaw = PL.yaw; }
function hurtPlayer(d, from) {
  if (G.dead || !G.on) return; d = Math.round(d); if (PL.ar > 0) { const a = Math.min(PL.ar, d * .7); PL.ar -= a; d -= a; } PL.hp -= d; PL.dmgT = 0; G.shake = Math.max(G.shake, .25); SFX.hurt(); G.hurtFlash = .5;
  if (PL.hp <= 0) wasted();
}
function knockPlayer(t, vx, vz) { if (PL.car) return; PL.ko = Math.max(PL.ko, t); PL.koMax = PL.ko; PL.kv = [vx || 0, vz || 0]; PL.P.pose = null; }
function updatePlayerFoot(dt) {
  const P = PL.P; P.root.visible = true;
  if (PL.ko > 0) { // 쓰러짐
    PL.ko -= dt; PL.x += PL.kv[0] * dt; PL.z += PL.kv[1] * dt; PL.kv[0] *= Math.pow(.05, dt); PL.kv[1] *= Math.pow(.05, dt);
    const k = PL.ko > .6 ? Math.min(1, (PL.koMax - PL.ko) / .25) : Math.max(0, PL.ko / .6); P.root.rotation.x = -Math.PI / 2 * k; setAnim(P, 'idle', 1);
    const p = { x: PL.x, z: PL.z }; collideCircle(p, .35, PL.y); inBounds(p, .35); PL.x = p.x; PL.z = p.z; PL.y = groundY(PL.x, PL.z) + k * .12; return;
  }
  P.root.rotation.x = 0;
  const wid = curWid(), armed = wid !== 'fist'; PL.fireCD -= dt; PL.aimT -= dt;
  const aiming = armed && (IN.aim || PL.aimT > 0 || IN.fireHeld);
  const fwd = [Math.sin(CAMS.yaw), Math.cos(CAMS.yaw)], rt = [-Math.cos(CAMS.yaw), Math.sin(CAMS.yaw)];
  let dx = fwd[0] * IN.mz + rt[0] * IN.mx, dz = fwd[1] * IN.mz + rt[1] * IN.mx; const mag = Math.hypot(dx, dz);
  let target = 0; if (mag > .05) { dx /= mag; dz /= mag; target = IN.walk || (IS_MOBILE && mag < .55) ? 1.8 : IN.sprint && !aiming ? 6.6 : aiming ? 3.2 : 4.4; if (PL.grab > 0) target *= .6; }
  if (PL.punchT > 0 || PL.stompT > 0) target *= .2;
  PL.spd += clamp(target - PL.spd, -18 * dt, 10 * dt);
  if (mag > .05) { PL.mvx = dx; PL.mvz = dz; if (!aiming) { const ty = Math.atan2(dx, dz); PL.yaw += angDiff(PL.yaw, ty) * Math.min(1, dt * 12); } }
  if (aiming && !IS_MOBILE && (IN.aim || IN.fireHeld)) PL.yaw += angDiff(PL.yaw, CAMS.yaw) * Math.min(1, dt * 20);
  PL.x += (PL.mvx || 0) * PL.spd * dt; PL.z += (PL.mvz || 0) * PL.spd * dt;
  // 점프
  const gy = groundY(PL.x, PL.z); if (IN.jump && PL.y <= gy + .02 && PL.punchT <= 0) { PL.vy = 4.6; SFX.whoosh(); }
  PL.vy -= 14 * dt; PL.y += PL.vy * dt; if (PL.y <= gy) { PL.y = gy; PL.vy = 0; }
  const p = { x: PL.x, z: PL.z }; collideCircle(p, .35, PL.y); inBounds(p, .35); PL.x = p.x; PL.z = p.z;
  if (armed) {
    if (IN.punch || (WEAP[wid].auto && IN.fireHeld)) playerFire();
    if (aiming) { P.pose = 'aim'; if (!IS_MOBILE || !P.aimDir || PL.aimT < 1.6) { const d = new T.Vector3(); cam.getWorldDirection(d); if (!IS_MOBILE || !P.aimDir) P.aimDir = d; } }
    else if (P.pose === 'aim') P.pose = null;
  } else {
    // 펀치 · 밟기
    if (IN.punch && PL.punchT <= 0 && PL.stompT <= 0) {
      const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; let down = null, dd = 1.7;
      for (const n of NPCS) { if (!(n.ko > 0) || n.dead) continue; const ddx = n.x - PL.x, ddz = n.z - PL.z, d = Math.hypot(ddx, ddz); if (d < dd && (d < 1.4 || (ddx * f[0] + ddz * f[1]) / d > .2)) { down = n; dd = d; } }
      if (down) { PL.combo = 0; PL.stompT = .62; PL.stompTgt = down; PL.punchHit = false; P.pose = 'stomp'; PL.yaw = Math.atan2(down.x - PL.x, down.z - PL.z); }
      else { PL.combo = G.t - (PL.lastPunch || -9) < 1 ? (PL.combo || 0) + 1 : 0; PL.lastPunch = G.t; PL.hook = PL.combo % 3 === 2; PL.punchDur = PL.hook ? .56 : .4; PL.punchT = PL.punchDur; PL.punchHit = false; PL.side = -PL.side; P.pose = 'punch'; P.punchSide = PL.side; SFX.whoosh(); }
    }
    if (PL.stompT > 0) {
      PL.stompT -= dt; P.poseT = 1 - PL.stompT / .62; const n = PL.stompTgt;
      if (!PL.punchHit && P.poseT > .55) { PL.punchHit = true; if (n && NPCS.includes(n) && Math.hypot(n.x - PL.x, n.z - PL.z) < 2) { npcDamage(n, 80, 0, 0, 'player', 'stomp'); SFX.punchHeavy(true); G.hitStop = .1; G.shake = Math.max(G.shake, .4); fx('dust', n.x, n.y + .2, n.z, { s: .7, life: .4, vy: .4, a: .7 }); } }
      if (PL.stompT <= 0) P.pose = null;
    }
    if (PL.punchT > 0) {
      PL.punchT -= dt; P.poseT = 1 - PL.punchT / (PL.punchDur || .42);
      if (!PL.punchHit && P.poseT > (PL.hook ? .3 : .22)) { PL.punchHit = true; const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; let best = null, bd = PL.hook ? 1.8 : 1.6;
        for (const n of NPCS) { if (n.ko > 0 || n.dead) continue; const ddx = n.x - PL.x, ddz = n.z - PL.z, d = Math.hypot(ddx, ddz); if (d < bd && (ddx * f[0] + ddz * f[1]) / (d || 1) > .45) { best = n; bd = d; } }
        if (best) { npcDamage(best, PL.hook ? 52 : 30, f[0], f[1], 'player', 'punch'); SFX.punchHeavy(PL.hook); G.hitStop = PL.hook ? .12 : .075; G.shake = Math.max(G.shake, PL.hook ? .38 : .22); G.fovKick = PL.hook ? 5 : 2.5; fx('flash', best.x - f[0] * .3, best.y + 1.45, best.z - f[1] * .3, { s: PL.hook ? .9 : .55, life: .09, vy: 0, a: .9, g: .4 }); fx('dust', best.x, best.y + 1.4, best.z, { s: .6, life: .35, vy: .2, a: .5 }); if (PL.grab > 0) PL.grab = 0; }
      }
      if (PL.punchT <= 0) P.pose = PL.grab > 0 ? 'hands' : null;
    }
  }
  // 애니메이션
  const s = PL.spd; if (PL.y > gy + .05) setAnim(P, 'run', .5); else if (s < .3) setAnim(P, 'idle', 1); else if (s < 2.6) setAnim(P, 'walk', s / 1.5); else setAnim(P, 'run', s / 5.2);
  PL.stepT += s * dt; if (PL.stepT > 1.4 && PL.y <= gy + .02) { PL.stepT = 0; SFX.step(); }
  if (PL.grab > 0 && PL.punchT <= 0 && !armed) P.pose = 'hands'; else if (PL.punchT <= 0 && P.pose === 'hands') P.pose = null;
}
function placePlayer(dt) {
  const P = PL.P; if (!(PL.car && PL.car.S.bike)) { P.root.position.set(PL.x, PL.y, PL.z); P.root.rotation.y = PL.yaw; } P.mixer.update(dt); applyPose(P);
  if (PL.gun) { const ok = !PL.car && PL.ko <= 0; PL.gun.visible = ok; if (ok) placeGun(P, PL.gun, P.aimDir || new T.Vector3(Math.sin(PL.yaw), 0, Math.cos(PL.yaw)), P.pose === 'aim'); }
}

/* ---------- 차 타기 · 내리기 ---------- */
function nearestCar(x, z, r) { let best = null, bd = r; for (const c of CARS) { if (c.dead || c === PL.car || c.roadblock && false) continue; const f = carFwd(c); const dx = x - c.x, dz = z - c.z; const lz = dx * f[0] + dz * f[1], lx = dx * f[1] - dz * f[0]; const ex = Math.max(0, Math.abs(lx) - c.S.W / 2), ez = Math.max(0, Math.abs(lz) - c.S.L / 2); const d = Math.hypot(ex, ez); if (d < bd) { bd = d; best = c; } } return best; }
function ejectRider(c, vx, vz) { // 오토바이 운전자 떨어뜨리기
  if (!c.rider) return; const look = c.rider.look; c.bodyG.remove(c.rider.root); c.rider.mixer.stopAllAction(); c.rider = null; c.drvP = false; c.ai = null; c.parked = true; c.fallen = true;
  const n = spawnNPC(c.x + (vx || 0) * .2, c.z + (vz || 0) * .2, look.cop ? 'cop' : 'ped', look); knockNPC(n, 1.4, vx || rand(-2, 2), vz || rand(-2, 2)); n.afterKo = n.tough ? 'fight' : 'flee'; n.t = 12; n.threat = [PL.x, PL.z]; return n;
}
function mountBike(c) { const P = PL.P; c.bodyG.add(P.root); P.root.position.set(0, (buildModel(c.type).seatY || .9) - P.hipY + .04, -.22); P.root.rotation.set(0, 0, 0); P.pose = 'ride'; setAnim(P, 'idle', 1); }
function enterCar(c) {
  if (c.rider) { const n = ejectRider(c, carLeft(c)[0] * 2.5, carLeft(c)[1] * 2.5); crime('jack', c.x, c.z); SV.stolen++; if (n && n.tough && Math.random() < .6) { n.afterKo = 'fight'; } }
  else if (c.drvP || c.ai && c.ai.mode !== 'parked') { // 운전자 끌어내기
    const look = c.drvLook || randomLook(Math.random() < .3); const L = carLeft(c); const n = spawnNPC(c.x + L[0] * (c.S.W / 2 + .7), c.z + L[1] * (c.S.W / 2 + .7), look.cop ? 'cop' : 'ped', look);
    if (n) { n.yaw = c.yaw; knockNPC(n, 1.2, L[0] * 2.5, L[1] * 2.5); n.afterKo = look.cop ? 'chase' : n.tough && Math.random() < .55 ? 'fight' : 'flee'; n.t = 15; n.threat = [PL.x, PL.z]; setTimeout(() => say(n, 'jacked', true), 500); if (look.cop && G.wanted >= 1) armNPC(n, 'pistol'); }
    crime(c.type === 'police' ? 'copcar' : 'jack', c.x, c.z); SV.stolen++;
  }
  c.ai = null; c.drvLook = null; c.drvP = false; c.chase = false; c.siren = false; c.parked = false; c.fallen = false; c.roadblock = false; c.drv = 'player'; PL.car = c; PL.P.pose = null; PL.punchT = 0; PL.stompT = 0; PL.grab = 0; PL.aimT = 0;
  if (c.S.bike) { mountBike(c); PL.P.root.visible = true; } else PL.P.root.visible = false;
  SFX.door(); radioShow(); if (c.alarm) { c.alarm = false; crime('alarm', c.x, c.z); }
  hudWeapon(); missionEvent('enter', c);
}
function carLeft(c) { const f = carFwd(c); return [f[1], -f[0]]; }
function exitCar() {
  const c = PL.car; if (!c) return; const L = carLeft(c), f = carFwd(c); const side = c.S.bike ? .7 : c.S.W / 2 + .6; let p = { x: c.x + L[0] * side + f[0] * .4, z: c.z + L[1] * side + f[1] * .4 };
  const before = { x: p.x, z: p.z }; collideCircle(p, .35, 0); if (Math.hypot(p.x - before.x, p.z - before.z) > .3) p = { x: c.x - L[0] * side, z: c.z - L[1] * side };
  if (c.S.bike) { scene.add(PL.P.root); PL.P.pose = null; PL.P.root.rotation.set(0, c.yaw, 0); c.fallen = Math.abs(c.v) > 4; }
  inBounds(p, .35); PL.x = p.x; PL.z = p.z; PL.y = groundY(p.x, p.z); PL.yaw = c.yaw; PL.spd = 0; c.drv = null; c.parked = true; PL.car = null; SFX.door();
  if (Math.abs(c.v) > 9) { knockPlayer(1.1, f[0] * c.v * .4 + L[0] * 3, f[1] * c.v * .4 + L[1] * 3); hurtPlayer(Math.abs(c.v) * .6); }
  engineUpdate(false, 0); radioHide(); hudWeapon(); missionEvent('exit', c);
}
function updatePlayerCar(dt) {
  const c = PL.car; let thr = Math.max(0, IN.mz), brk = Math.max(0, -IN.mz); const steer = -IN.mx;
  const hit = drive(c, { thr, brk, steer, hand: IN.hand }, dt);
  if (hit > 4) carHurt(c, hit, true);
  if (c.S.bike && hit > 8) { throwOffBike(hit); return; }
  if (IN.horn) { SFX.horn(); hornScare(c.x, c.z); }
  PL.x = c.x; PL.z = c.z; PL.y = c.y; PL.yaw = c.yaw;
  if (c.fire > 0 && c.fire < 1.5) setPrompt('🔥 차에 불이 붙었어요! 빨리 내려요 (F)');
}
function throwOffBike(imp) { const c = PL.car; const f = carFwd(c); const v = c.v; exitCar(); c.fallen = true; c.v *= .3; knockPlayer(1.6, f[0] * v * .5, f[1] * v * .5); hurtPlayer(6 + imp * 1.1); SFX.crash(.8); popLabel(PL.x, PL.y + 2, PL.z, '꽈당!', '#ffcc33', 1.2); }
function carHurt(c, imp, mine) {
  if (c.dead) return; const d = Math.max(0, imp - 5) * 1.3 / Math.sqrt(c.S.mass); c.hp -= d; if (imp > 6) { SFX.crash(imp / 18); G.shake = Math.max(G.shake, mine ? clamp(imp / 30, .1, .6) : 0); for (let i = 0; i < 4; i++)fx('spark', c.x + rand(-1, 1), c.y + .7, c.z + rand(-1, 1), { s: .35, life: .4, vy: 3, a: 1 }); }
  if (c.hp <= 0 && !c.fire) { c.fire = 6; c.hp = 0; }
  if (mine && imp > 18) hurtPlayer((imp - 18) * .6);
}
function explodeCar(c) {
  c.dead = true; c.fire = 0; SFX.boom(); G.shake = Math.max(G.shake, PL.car === c ? 1 : clamp(1 - Math.hypot(c.x - PL.x, c.z - PL.z) / 40, 0, .8));
  for (let i = 0; i < 18; i++) fx(i % 3 ? 'fire' : 'smoke', c.x + rand(-1.5, 1.5), c.y + 1, c.z + rand(-1.5, 1.5), { s: rand(1.5, 3), life: rand(.6, 1.6), vy: rand(1, 5), vx: rand(-3, 3), vz: rand(-3, 3), a: .9 });
  if (c.rider) ejectRider(c);
  const burnt = new T.MeshStandardMaterial({ color: lin('#151312'), roughness: .9 }); c.bodyG.traverse(o => { if (o.isMesh) o.material = burnt; }); c.v *= .2; c.ai = null; c.parked = true;
  if (PL.car === c) { exitCar(); hurtPlayer(70); knockPlayer(1.5, rand(-4, 4), rand(-4, 4)); }
  else { const d = Math.hypot(c.x - PL.x, c.z - PL.z); if (d < 7 && !PL.car) { hurtPlayer((7 - d) * 12); knockPlayer(1.2, (PL.x - c.x) / d * 6, (PL.z - c.z) / d * 6); } }
  for (const n of NPCS) { const d = Math.hypot(n.x - c.x, n.z - c.z); if (d < 6) { npcDamage(n, 200, (n.x - c.x) / (d || 1), (n.z - c.z) / (d || 1), PL.car === c || c.byPlayer ? 'player' : 'npc', 'boom'); knockNPC(n, n.dead ? 1e9 : n.ko, (n.x - c.x) / (d || 1) * 6, (n.z - c.z) / (d || 1) * 6); } else if (d < 25) npcFlee(n, c.x, c.z); }
  for (const o of CARS) if (o !== c && !o.dead && Math.hypot(o.x - c.x, o.z - c.z) < 6) carHurt(o, 30, o === PL.car);
  if (G.on) crime('boom', c.x, c.z); missionEvent('boom', c);
}
function hornScare(x, z) { for (const n of NPCS) if (n.st === 'walk' || n.st === 'idle' || n.st === 'wait') { const d = Math.hypot(n.x - x, n.z - z); if (d < 9) { if (n.tough && Math.random() < .25) { n.st = 'fight'; n.t = 12; popLabel(n.x, n.y + 2.1, n.z, '뭐야!', '#fff', 1.2); } else if (Math.random() < .4) npcFlee(n, x, z, 2.5); } } }

/* ---------- 행인 NPC ---------- */
const NPCS = [];
const RING_E = RH + 2.2;
function ringCorner(bi, bj, k) { const x0 = bi * P + RING_E, x1 = (bi + 1) * P - RING_E, z0 = bj * P + RING_E, z1 = (bj + 1) * P - RING_E; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]][((k % 4) + 4) % 4]; }
function spawnNPC(x, z, kind, look) {
  const isCop = kind === 'cop' || kind === 'swat'; look = look || (kind === 'swat' ? LOOKS.swat() : isCop ? LOOKS.police() : kind === 'thug' ? LOOKS.thug() : randomLook(Math.random() < .32));
  const P_ = makePerson(look); scene.add(P_.root);
  const n = { P: P_, look, x, z, y: groundY(x, z), yaw: rand(0, 6.28), st: 'walk', cop: isCop || !!look.cop, kind, hp: look.swat ? 200 : isCop ? 100 : kind === 'thug' ? 150 : 70, ko: 0, kos: 0, koMax: 1, kv: [0, 0], t: 0, spd: rand(1.15, 1.55), tough: kind === 'thug' || (!look.w ? Math.random() < .45 : Math.random() < .12), punchT: 0, cool: 0, money: Math.random() < .6 ? randi(1, 9) * 1000 : 0, thug: kind === 'thug' };
  n.maxHp = n.hp; n.bi = clamp(Math.floor(x / P), -NR, NR - 1); n.bj = clamp(Math.floor(z / P), -NR, NR - 1); n.k = randi(0, 3); n.dir = Math.random() < .5 ? 1 : -1; n.tgt = ringCorner(n.bi, n.bj, n.k);
  if (n.cop) { n.st = 'chase'; n.spd = 5.6; if (look.swat) armNPC(n, 'smg'); else if (G.wanted >= 2) armNPC(n, 'pistol'); }
  NPCS.push(n); return n;
}
function removeNPC(n) { scene.remove(n.P.root); if (n.gunM) scene.remove(n.gunM); n.P.mixer.stopAllAction(); n.P.root.traverse(o => { if (o.isMesh && o.material) o.material.dispose(); }); const i = NPCS.indexOf(n); if (i >= 0) NPCS.splice(i, 1); }
function knockNPC(n, t, vx, vz) { if (n.dead) { n.kv = [vx, vz]; return; } n.ko = Math.max(n.ko, t); n.koMax = n.ko; n.kv = [vx, vz]; n.st = 'ko'; n.P.pose = null; }
function npcFlee(n, fx_, fz_, t) { if (n.dead || n.ko > 0 || n.cop || n.st === 'fight' || n.st === 'shoot' || n.mission) return; n.st = 'flee'; n.threat = [fx_, fz_]; n.t = t || rand(5, 8); n.P.pose = null; }
/* 다치게 하기: 처음 쓰러지면 기절, 기절한 사람을 또 때리거나 · 깨어난 뒤 또 쓰러뜨리면 사망 */
function npcDamage(n, dmg, dx, dz, by, kind) {
  if (n.dead) { if (kind !== 'stomp') return; }
  if (n.ally) return;
  const mine = by === 'player';
  if (mine && kind !== 'boom') { missionEvent('hit', n); crime(n.cop ? 'hitcop' : kind === 'gun' ? 'shootped' : 'punch', n.x, n.z); }
  if (n.ko > 0 && !n.dead) { if (dmg >= 10) killNPC(n, by); return; }
  n.hp -= dmg; fx('dust', n.x, n.y + 1.2, n.z, { s: .5, life: .4, vy: .5, a: .6 });
  if (n.hp <= 0) {
    if (n.kos >= 1) { killNPC(n, by); knockNPC(n, 1e9, dx * 3, dz * 3); return; }
    n.kos = 1; n.hp = Math.round(n.maxHp * .5); knockNPC(n, rand(10, 14), dx * 3, dz * 3); n.afterKo = n.cop ? 'chase' : n.tough && kind !== 'gun' ? 'fight' : 'flee'; n.t = 12;
    popLabel(n.x, n.y + 1.4, n.z, '기절', '#ffd84a', 1.6); if (n.money && !n.cop) { dropCash(n.x, n.z, n.money); n.money = 0; }
    if (mine && n.cop) crime('kocop', n.x, n.z); missionEvent('ko', n);
  }
  else if (n.ally) { n.hp = n.maxHp; return; }
  else if (n.cop) { if (n.st !== 'chase') n.st = 'chase'; if (kind !== 'gun') { if (dmg >= 45) { knockNPC(n, .9, dx * 4, dz * 4); n.afterKo = 'chase'; } else flinch(n, dx, dz); } say(n, 'backup'); }
  else if (kind === 'gun' && !n.thug) { npcFlee(n, PL.x, PL.z, 9); say(n, Math.random() < .5 ? 'gun' : 'hit'); }
  else if (n.tough && mine) { const first = n.st !== 'fight'; n.st = 'fight'; n.t = 18; n.P.pose = 'guard'; if (kind === 'punch' && dmg >= 45) { knockNPC(n, .9, dx * 4, dz * 4); n.afterKo = 'fight'; } else if (kind === 'punch') flinch(n, dx, dz); say(n, first ? (Math.random() < .5 ? 'hit' : 'angry') : 'hit', first); }
  else { if (dmg >= 45) knockNPC(n, .9, dx * 4, dz * 4); else { knockNPC(n, .5, dx * 3, dz * 3); } n.afterKo = 'flee'; n.threat = [PL.x, PL.z]; say(n, 'hit', true); }
  // 주변 사람들: 센 사람은 같이 덤비고, 나머지는 도망
  if (mine && kind !== 'gun') for (const o of NPCS) { if (o === n || o.cop || o.dead || o.ko > 0 || o.mission) continue; const d = Math.hypot(o.x - n.x, o.z - n.z); if (d > 14) continue; if (o.tough && d < 11 && o.st !== 'fight' && Math.random() < .4) { o.st = 'fight'; o.t = 16; say(o, 'angry', true); } else if (o.st !== 'fight') { npcFlee(o, n.x, n.z); if (Math.random() < .25) say(o, 'flee'); } }
}
function flinch(n, dx, dz) { n.flinch = .32; n.pushV = [dx * 4, dz * 4]; }
function npcHit(n, dmg, fx_, fz_, by) { npcDamage(n, dmg, fx_, fz_, by, 'punch'); }
function killNPC(n, by) {
  if (n.dead) return; n.dead = true; n.st = 'dead'; n.ko = 1e9; n.koMax = 1e9; n.deadT = 0; n.P.pose = null; if (n.gunM) n.gunM.visible = false;
  popLabel(n.x, n.y + 1.2, n.z, '사망', '#ff4d4d', 2);
  if (n.money) { dropCash(n.x, n.z, n.money); n.money = 0; } if (n.cop && n.gun && Math.random() < .7) dropAmmo(n.x + .6, n.z, 'pistol', 12);
  if (by === 'player') { crime(n.cop ? 'killcop' : 'kill', n.x, n.z); SV.kills = (SV.kills || 0) + 1; }
  for (const o of NPCS) if (!o.cop && !o.dead && Math.hypot(o.x - n.x, o.z - n.z) < 20) npcFlee(o, n.x, n.z, 9);
  missionEvent('kill', n);
}
function moveToward(n, tx, tz, spd, dt) { const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < .05) return d; const st = Math.min(d, spd * dt); n.x += dx / d * st; n.z += dz / d * st; n.yaw += angDiff(n.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 9); return d; }
function updateNPC(n, dt) {
  const P_ = n.P; let spd = 0;
  if (n.dead) { // 쓰러진 채로
    n.deadT += dt; n.x += n.kv[0] * dt; n.z += n.kv[1] * dt; n.kv[0] *= Math.pow(.03, dt); n.kv[1] *= Math.pow(.03, dt); const k = Math.min(1, (n.layK || 0) + dt * 4); n.layK = k; P_.root.rotation.x = -Math.PI / 2 * k; n.lay = k; setAnim(P_, 'idle', 0);
    const p = { x: n.x, z: n.z }; collideCircle(p, .3, n.y); inBounds(p, .3); n.x = p.x; n.z = p.z; n.y = groundY(n.x, n.z) + k * .12; n.lastSpd = 0; return;
  }
  if (n.flinch > 0 && !(n.ko > 0)) { n.flinch -= dt; n.x += n.pushV[0] * dt; n.z += n.pushV[1] * dt; n.pushV[0] *= Math.pow(.02, dt); n.pushV[1] *= Math.pow(.02, dt); n.P.pose = n.flinch > 0 ? 'flinch' : (n.st === 'fight' ? 'guard' : null); n.P.poseT = 1 - n.flinch / .32; const p = { x: n.x, z: n.z }; collideCircle(p, .3, n.y); inBounds(p, .3); n.x = p.x; n.z = p.z; setAnim(P_, 'idle', 1); n.lastSpd = 0; return; }
  if (n.ko > 0) {
    n.ko -= dt; n.x += n.kv[0] * dt; n.z += n.kv[1] * dt; n.kv[0] *= Math.pow(.03, dt); n.kv[1] *= Math.pow(.03, dt);
    const k = n.ko > .7 ? Math.min(1, (n.koMax - n.ko) / .25) : Math.max(0, n.ko / .7); P_.root.rotation.x = -Math.PI / 2 * k; n.lay = k;
    if (n.ko <= 0) { P_.root.rotation.x = 0; n.lay = 0; n.st = n.afterKo || 'flee'; n.t = n.st === 'fight' ? 15 : rand(6, 9); n.threat = n.threat || [PL.x, PL.z]; if (n.st === 'fight') n.P.pose = 'guard'; }
    setAnim(P_, 'idle', 1);
  } else if (n.st === 'walk') {
    const d = moveToward(n, n.tgt[0], n.tgt[1], n.spd, dt); spd = n.spd;
    if (d < .4) { // 모퉁이: 계속 돌거나 길 건너기
      if (Math.random() < .35) { // 건너기
        const c = ringCorner(n.bi, n.bj, n.k); const k = ((n.k % 4) + 4) % 4; const opts = [];
        const sx = (k === 1 || k === 2) ? 1 : -1, sz = (k === 2 || k === 3) ? 1 : -1;
        if (n.bi + sx >= -NR && n.bi + sx < NR) opts.push({ ax: 'x', bi: n.bi + sx, bj: n.bj, tgt: [c[0] + sx * 2 * RING_E, c[1]], k: [1, 0, 3, 2][k] });
        if (n.bj + sz >= -NR && n.bj + sz < NR) opts.push({ ax: 'z', bi: n.bi, bj: n.bj + sz, tgt: [c[0], c[1] + sz * 2 * RING_E], k: [3, 2, 1, 0][k] });
        if (opts.length) { const o = pick(opts); n.cross = o; n.st = 'wait'; n.t = 0; }
        else { n.k += n.dir; n.tgt = ringCorner(n.bi, n.bj, n.k); }
      } else { n.k += n.dir; n.tgt = ringCorner(n.bi, n.bj, n.k); if (Math.random() < .08) { n.st = 'idle'; n.t = rand(4, 12); n.P.pose = Math.random() < .5 ? 'phone' : null; } }
    }
  } else if (n.st === 'wait') { // 신호 기다리기
    n.t += dt; const ok = lightFor(n.cross.ax) === 'g' && (LIGHT.t % 15) < 9; if (ok || n.t > 40) { n.st = 'cross'; }
    n.yaw += angDiff(n.yaw, Math.atan2(n.cross.tgt[0] - n.x, n.cross.tgt[1] - n.z)) * Math.min(1, dt * 5);
  } else if (n.st === 'cross') {
    const d = moveToward(n, n.cross.tgt[0], n.cross.tgt[1], n.spd * 1.25, dt); spd = n.spd * 1.25;
    if (d < .4) { n.bi = n.cross.bi; n.bj = n.cross.bj; n.k = n.cross.k; n.k += n.dir; n.tgt = ringCorner(n.bi, n.bj, n.k); n.st = 'walk'; n.cross = null; }
  } else if (n.st === 'idle') {
    n.t -= dt; if (n.t <= 0) { n.st = 'walk'; n.P.pose = null; }
  } else if (n.st === 'talk') {
    n.t -= dt; if (n.face) n.yaw += angDiff(n.yaw, Math.atan2(n.face[0] - n.x, n.face[1] - n.z)) * Math.min(1, dt * 5); if (n.t <= 0) { n.st = 'walk'; setAnim(P_, 'idle', 1); }
  } else if (n.st === 'ally') { spd = allyAI(n, dt);
  } else if (n.st === 'cower') {
    n.t -= dt; n.P.pose = 'cower'; if (n.t <= 0) { n.P.pose = null; npcFlee(n, PL.x, PL.z, 8); }
  } else if (n.st === 'flee') {
    n.t -= dt; const th = n.threat || [PL.x, PL.z]; let dx = n.x - th[0], dz = n.z - th[1]; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    n.x += dx * 5.2 * dt; n.z += dz * 5.2 * dt; spd = 5.2; n.yaw += angDiff(n.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 8); n.P.pose = null;
    if (n.t <= 0) { n.bi = clamp(Math.floor(n.x / P), -NR, NR - 1); n.bj = clamp(Math.floor(n.z / P), -NR, NR - 1); let best = 0, bd = 1e9; for (let k = 0; k < 4; k++) { const c = ringCorner(n.bi, n.bj, k), dd = Math.hypot(c[0] - n.x, c[1] - n.z); if (dd < bd) { bd = dd; best = k; } } n.k = best; n.tgt = ringCorner(n.bi, n.bj, best); n.st = 'walk'; }
  } else if (n.st === 'fight') {
    n.t -= dt; const d = Math.hypot(PL.x - n.x, PL.z - n.z); n.cool -= dt;
    if (PL.car) { // 차에서 끌어내기
      const c = PL.car, L = carLeft(c); const tx = c.x + L[0] * (c.S.W / 2 + .6), tz = c.z + L[1] * (c.S.W / 2 + .6); const di = Math.hypot(tx - n.x, tz - n.z);
      if (di > .5 && Math.abs(c.v) < 4) { moveToward(n, tx, tz, 5, dt); spd = 5; } if (di < 1.1 && Math.abs(c.v) < 1.5 && c.type !== 'bus') { n.pull = (n.pull || 0) + dt; if (n.pull > 1.3) { n.pull = 0; exitCar(); knockPlayer(1, L[0] * 2, L[1] * 2); popLabel(n.x, n.y + 2.1, n.z, '나와!', '#fff', 1.2); } } else n.pull = 0;
      if (Math.abs(c.v) > 8 || d > 30) { n.st = 'flee'; n.t = 4; n.P.pose = null; }
    } else {
      if (d > 1.15) { moveToward(n, PL.x, PL.z, 4.8, dt); spd = 4.8; if (n.punchT <= 0) n.P.pose = 'guard'; }
      else { n.yaw += angDiff(n.yaw, Math.atan2(PL.x - n.x, PL.z - n.z)) * Math.min(1, dt * 9); if (n.cool <= 0 && PL.ko <= 0) { n.cool = rand(.75, 1.2); n.punchT = .42; n.P.pose = 'punch'; n.P.punchSide = Math.random() < .5 ? 1 : -1; } }
      if (n.punchT > 0) { n.punchT -= dt; n.P.poseT = 1 - n.punchT / .42; if (n.punchT < .3 && !n.hitDone && d < 1.45) { n.hitDone = true; hurtPlayer(n.thug ? 9 : 7); SFX.punch(); if (Math.random() < .18) knockPlayer(.7, (PL.x - n.x) * 2, (PL.z - n.z) * 2); } if (n.punchT <= 0) { n.hitDone = false; n.P.pose = 'guard'; } }
      if (curWid() !== 'fist' && PL.aimT > 0 && !n.thug && Math.random() < dt * .8) { npcFlee(n, PL.x, PL.z, 8); n.st = 'flee'; popLabel(n.x, n.y + 2.1, n.z, '총이다!', '#fff', 1.2); }
    }
    if (n.t <= 0 && !n.thug || d > 30 || G.dead) { n.st = 'flee'; n.t = 4; n.P.pose = null; }
  } else if (n.st === 'shoot') { // 총 든 깡패
    const d = Math.hypot(PL.x - n.x, PL.z - n.z); const los = d < 40 && rayBlock(n.x, 1.5, n.z, PL.x, 1.2, PL.z) > .98;
    if (!los || d > 22) { moveToward(n, PL.x, PL.z, 4.4, dt); spd = 4.4; n.P.pose = null; } else { n.yaw += angDiff(n.yaw, Math.atan2(PL.x - n.x, PL.z - n.z)) * Math.min(1, dt * 8); if ((n.fireT -= dt) <= 0) { n.fireT = rand(.8, 1.6); npcFire(n); } }
    if (G.dead) { n.st = 'stand'; n.P.pose = null; }
  } else if (n.st === 'chase') { // 경찰
    copAI(n, dt); spd = n.lastSpd || 0;
  } else if (n.st === 'goto') { // 미션 손님
    const d = moveToward(n, n.tgt[0], n.tgt[1], 2.4, dt); spd = d > .3 ? 2.4 : 0; if (d < .3 && n.onArrive) { const f = n.onArrive; n.onArrive = null; f(n); }
  } else if (n.st === 'stand') { if (n.face) n.yaw += angDiff(n.yaw, Math.atan2(n.face[0] - n.x, n.face[1] - n.z)) * Math.min(1, dt * 4); }
  const p = { x: n.x, z: n.z }; collideCircle(p, .3, n.y); inBounds(p, .3); n.x = p.x; n.z = p.z;
  n.y = groundY(n.x, n.z) + (n.lay || 0) * .12;
  if (n.ko <= 0 && !['fight', 'chase', 'shoot', 'talk'].includes(n.st)) { if (spd < .2) setAnim(P_, n.st === 'idle' && Math.random() < .002 ? pick(['agree', 'headShake', 'idle']) : P_.cur === 'agree' || P_.cur === 'headShake' ? P_.cur : 'idle', 1); else if (spd < 2.8) setAnim(P_, 'walk', spd / 1.45); else setAnim(P_, 'run', spd / 5.2); }
  else if (n.ko <= 0) { if (spd < .2) setAnim(P_, 'idle', 1); else if (spd < 3) setAnim(P_, 'walk', spd / 1.45); else setAnim(P_, 'run', spd / 5.2); }
  n.lastSpd = spd;
}
function placeNPC(n, dt, far) { const R_ = n.P.root; R_.position.set(n.x, n.y, n.z); R_.rotation.y = n.yaw; n.acc = (n.acc || 0) + dt; if (!far || n.acc > .1) { n.P.mixer.update(n.acc); n.acc = 0; applyPose(n.P); } if (n.gunM) { n.gunM.visible = !n.dead && n.ko <= 0 && R_.visible; if (n.gunM.visible) placeGun(n.P, n.gunM, n.P.aimDir || new T.Vector3(Math.sin(n.yaw), 0, Math.cos(n.yaw)), n.P.pose === 'aim'); } }

/* ---------- 경찰 ---------- */
function copAI(n, dt) {
  const d = Math.hypot(PL.x - n.x, PL.z - n.z); n.cool -= dt;
  if (G.wanted <= 0) { n.st = 'flee'; n.cop = true; n.t = 3; n.leave = true; n.P.pose = null; return; }
  if (!n.gun && G.wanted >= 2 && !n.armT) { n.armT = 1; armNPC(n, 'pistol'); }
  if (!n.yelled && Math.hypot(PL.x - n.x, PL.z - n.z) < 30) { n.yelled = 1; say(n, G.wanted >= 3 ? 'armed' : 'freeze', true); }
  const shootMode = n.gun && (G.wanted >= 3 || n.look.swat || (G.wanted >= 2 && (curWid() !== 'fist' || PL.car || PL.spd > 5)));
  const los = d < 42 && rayBlock(n.x, 1.5, n.z, PL.x, PL.y + 1.2, PL.z) > .98;
  if (shootMode && los && d > 2 && !G.dead) {
    let mv = 0; if (n.hold && d > 10) mv = 0; else if (d > 18) mv = 5.2; else if (d < 7) mv = -2.2;
    if (mv > 0) moveToward(n, PL.x, PL.z, mv, dt); else if (mv < 0) { n.x -= (PL.x - n.x) / d * 2.2 * dt; n.z -= (PL.z - n.z) / d * 2.2 * dt; }
    n.lastSpd = Math.abs(mv); n.yaw += angDiff(n.yaw, Math.atan2(PL.x - n.x, PL.z - n.z)) * Math.min(1, dt * 8);
    n.P.pose = 'aim'; n.P.aimDir = new T.Vector3(PL.x - n.x, (PL.y + 1.2) - (n.y + 1.45), PL.z - n.z).normalize();
    if ((n.fireT = (n.fireT || 0) - dt) <= 0) { const w = WEAP[n.gun]; n.fireT = n.look.swat ? (Math.random() < .7 ? w.rate * 1.5 : rand(.8, 1.4)) : rand(.9, 1.8); npcFire(n); }
    return;
  }
  if (n.P.pose === 'aim') n.P.pose = null;
  if (n.hold && d > 12) { n.lastSpd = 0; n.yaw += angDiff(n.yaw, Math.atan2(PL.x - n.x, PL.z - n.z)) * Math.min(1, dt * 5); return; }
  if (PL.car) { // 차 안의 플레이어: 차 옆으로 가서 끌어내기
    const L = carLeft(PL.car); const tx = PL.car.x + L[0] * (PL.car.S.W / 2 + .7), tz = PL.car.z + L[1] * (PL.car.S.W / 2 + .7); const dd = Math.hypot(tx - n.x, tz - n.z);
    if (dd > .6) { moveToward(n, tx, tz, 5.6, dt); n.lastSpd = 5.6; } else n.lastSpd = 0;
    if (dd < 1.2 && Math.abs(PL.car.v) < 1.5) { PL.grab += dt * .6; if (PL.grab > 1.6) busted(); } return;
  }
  if (d > 1.1) { moveToward(n, PL.x, PL.z, d > 3 ? 5.7 : 3, dt); n.lastSpd = d > 3 ? 5.7 : 3; if (n.P.pose !== 'punch') n.P.pose = null; }
  else {
    n.lastSpd = 0; n.yaw += angDiff(n.yaw, Math.atan2(PL.x - n.x, PL.z - n.z)) * Math.min(1, dt * 9);
    if (G.wanted <= 2 && PL.ko <= 0 && curWid() === 'fist') { if (PL.grab === 0) say(n, 'ground', true); PL.grab += dt; if (PL.grab > 1.7) busted(); }
    else if (n.cool <= 0) { n.cool = 1; n.punchT = .42; n.P.pose = 'punch'; n.P.punchSide = 1; if (d < 1.4) { hurtPlayer(8); SFX.punch(); if (Math.random() < .25) knockPlayer(.9, (PL.x - n.x) * 3, (PL.z - n.z) * 3); } }
  }
  if (n.punchT > 0) { n.punchT -= dt; n.P.poseT = 1 - n.punchT / .42; if (n.punchT <= 0) n.P.pose = null; }
}
function crime(kind, x, z) {
  if (!G.on || G.dead) return; const seenBy = copsSee(x, z, 45);
  const sev = { punch: .25, hitcop: 1, kocop: 1, jack: .3, copcar: 1, carhit: .55, boom: .8, alarm: 1, mission: 1, shoot: .5, shootped: .7, kill: .75, killcop: 1 }[kind] || .3;
  let add = 0; if (kind === 'hitcop' || kind === 'kocop' || kind === 'copcar') add = 1; else if (kind === 'killcop') add = 2; else if (seenBy) add = 1; else if (Math.random() < sev) add = G.wanted ? 0 : 1;
  if ((kind === 'kocop' || kind === 'kill') && G.wanted >= 2 && seenBy) add = 1;
  G.crimes = (G.crimes || 0) + 1; if (G.wanted >= 1 && G.crimes % 4 === 0) add = Math.max(add, 1);
  if (kind === 'kill' && G.wanted < 2 && seenBy) add = Math.max(add, 2 - G.wanted);
  if (add) setWanted(Math.min(5, G.wanted + add));
  if (G.wanted) G.lastSeen = G.t;
}
function copsSee(x, z, r) { for (const n of NPCS) if (n.cop && n.ko <= 0 && !n.dead && Math.hypot(n.x - x, n.z - z) < r && rayBlock(n.x, 1.6, n.z, x, 1.2, z) > .98) return true; for (const c of CARS) if (c.type === 'police' && !c.dead && c !== PL.car && (c.chase || c.ai || c.roadblock) && Math.hypot(c.x - x, c.z - z) < r && rayBlock(c.x, 1.6, c.z, x, 1.2, z) > .98) return true; return heliSees(); }
function setWanted(w) { const up = w > G.wanted; if (G.on && AU.ctx && G.t - (G.dispT || -99) > 12) { if (up) { G.dispT = G.t; dispatch(w >= 4 ? 2 : PL.car ? 1 : w >= 3 ? 3 : 0); } else if (!w && G.wanted) { G.dispT = G.t; dispatch(4); } } G.wanted = w; G.lastSeen = G.t; G.crimes = 0; if (up) { SFX.star(); G.starPulse = 1.2; } hudStars(); if (!w) { G.evadeT = 0; } }
function updateWanted(dt) {
  if (!G.wanted) { G.wantFlash = false; return; }
  const seen = copsSee(PL.x, PL.z, 60); if (seen) G.lastSeen = G.t; G.wantFlash = !seen;
  const need = 6 + G.wanted * 3.5; if (G.t - G.lastSeen > need) { setWanted(G.wanted - 1); if (!G.wanted) toast('👮 경찰을 따돌렸어요!'); }
}
let SIRENL = null;
function updatePolice(dt) {
  const want = [0, 1, 2, 3, 4, 5][G.wanted]; const pol = CARS.filter(c => c.type === 'police' && c.chase && !c.dead && c !== PL.car);
  if (!INSIDE && pol.length < want && (G.polT = (G.polT || 0) - dt) <= 0) { G.polT = 3.5 - G.wanted * .4; spawnPoliceCar(); }
  const footWant = G.wanted >= 1 ? Math.min(7, 1 + G.wanted) : 0; const foot = NPCS.filter(n => n.cop && n.st === 'chase' && !n.dead && n.ko <= 0).length;
  if (foot < footWant && (!PL.car || INSIDE) && (G.copT = (G.copT || 0) - dt) <= 0) { G.copT = 6 - G.wanted * .6; const s = INSIDE ? (MI && MI.noInsideCops ? null : [INT[INSIDE].entry[0] + rand(-1.5, 1.5), INT[INSIDE].entry[1]]) : sidewalkNear(PL.x, PL.z, 30, 48); if (s) { spawnNPC(s[0], s[1], G.wanted >= 4 && Math.random() < .6 ? 'swat' : 'cop'); } }
  for (const c of pol) policeDrive(c, dt);
  updateHeli(dt); updateRoadblocks(dt);
  const near = CARS.filter(c => c.type === 'police' && c.siren && !c.dead && c !== PL.car).sort((a, b) => Math.hypot(a.x - PL.x, a.z - PL.z) - Math.hypot(b.x - PL.x, b.z - PL.z))[0];
  sirenUpdate(G.wanted > 0 && near && Math.hypot(near.x - PL.x, near.z - PL.z) < 90, G.t);
  const fl = Math.floor(G.t * 6) % 2; SIREN.r.color.set(fl ? '#ff2a2a' : '#4a0505'); SIREN.b.color.set(fl ? '#06103a' : '#2a64ff');
  if (!SIRENL) { SIRENL = new T.PointLight('#ff2020', 0, 22); scene.add(SIRENL); }
  if (near && Math.hypot(near.x - PL.x, near.z - PL.z) < 70) { SIRENL.position.set(near.x, near.y + 2.2, near.z); SIRENL.color.set(fl ? '#ff2a2a' : '#2a5cff'); SIRENL.intensity = 1.5 + DAY.night * 3; } else SIRENL.intensity = 0;
}
function spawnPoliceCar() {
  const pos = laneNear(PL.x, PL.z, 70, 130); if (!pos) return; const c = makeCar('police'); laneSpawn(c, pos.x, pos.z, pos.f, pos.li); c.ai = null; c.chase = true; c.siren = true; c.copsOut = false; c.v = 6; scene.add(c.g); CARS.push(c);
}
function gridPath(ax, az, bx, bz) { // 교차로 격자에서 다음으로 갈 교차로
  const ai = clamp(Math.round(ax / P), -NR, NR), aj = clamp(Math.round(az / P), -NR, NR), bi = clamp(Math.round(bx / P), -NR, NR), bj = clamp(Math.round(bz / P), -NR, NR);
  if (ai === bi && aj === bj) return [bx, bz]; const di = Math.sign(bi - ai), dj = Math.sign(bj - aj);
  const onX = Math.abs(az - aj * P) < RH + 2, onZ = Math.abs(ax - ai * P) < RH + 2;
  if (onX && di) return [(ai + di) * P, aj * P]; if (onZ && dj) return [ai * P, (aj + dj) * P];
  return [ai * P, aj * P];
}
function policeDrive(c, dt) {
  const tx = PL.x, tz = PL.z, d = Math.hypot(tx - c.x, tz - c.z); c.siren = true;
  if (G.wanted <= 0) { c.chase = false; c.ai = null; c.parked = true; c.leaving = true; drive(c, { brk: 1 }, dt); return; }
  let target; const los = d < 50 && rayBlock(c.x, 1, c.z, tx, 1, tz) > .98;
  if (los) { const pc = PL.car; target = pc ? [tx + Math.sin(pc.yaw) * pc.v * .5, tz + Math.cos(pc.yaw) * pc.v * .5] : [tx, tz]; }
  else target = gridPath(c.x, c.z, tx, tz);
  if (Math.hypot(target[0] - c.x, target[1] - c.z) < 6 && !los) target = gridPath(c.x + Math.sin(c.yaw) * 10, c.z + Math.cos(c.yaw) * 10, tx, tz);
  const want = Math.atan2(target[0] - c.x, target[1] - c.z); let a = angDiff(c.yaw, want);
  let inp = { thr: 1, steer: clamp(a * 2, -1, 1), brk: 0 };
  if (Math.abs(a) > 1.6 && c.v < 6) { inp = { brk: 1, steer: -clamp(a * 2, -1, 1) }; }
  const stopNear = (!PL.car && d < 14 + c.v * c.v / (2 * c.S.brake) + c.v * .3) || (PL.car && Math.abs(PL.car.v) < 2.5 && d < 18);
  if (stopNear) { inp.thr = 0; inp.brk = c.v > 1 ? 1 : 0; if (!c.copsOut && c.v < 3) { c.copsOut = true; const L = carLeft(c); for (let k = 0; k < (G.wanted >= 3 ? 2 : 1); k++) { spawnNPC(c.x + L[0] * (2 - k * 4) + Math.sin(c.yaw) * k, c.z + L[1] * (2 - k * 4) + Math.cos(c.yaw) * k, G.wanted >= 4 && k ? 'swat' : 'cop'); } } }
  if (c.copsOut && PL.car && d > 25 && Math.abs(PL.car.v) > 5) c.copsOut = false;
  if (c.rev > 0) { c.rev -= dt; inp = { brk: 1, steer: c.revS }; }
  else if (Math.abs(c.v) < 1 && inp.thr) { c.stk = (c.stk || 0) + dt; if (c.stk > 1.2) { c.rev = 1.3; c.revS = -inp.steer || 1; c.stk = 0; } } else c.stk = 0;
  if (d > 260) { removeCar(c); return; }
  const hit = drive(c, inp, dt); if (hit > 6) carHurt(c, hit, false);
}

/* ---------- 차 · 행인 생성 ---------- */
const CARS = [];
function addRider(c, look) { const R_ = makePerson(look); R_.root.position.set(0, (buildModel(c.type).seatY || .9) - R_.hipY + .04, -.22); R_.pose = 'ride'; c.bodyG.add(R_.root); c.rider = R_; c.drvLook = look; }
function removeCar(c) { if (c.rider) { c.rider.mixer.stopAllAction(); c.rider = null; } scene.remove(c.g); const i = CARS.indexOf(c); if (i >= 0) CARS.splice(i, 1); }
function laneNear(px, pz, r0, r1) {
  for (let tries = 0; tries < 20; tries++) {
    const ax = Math.random() < .5; const k = randi(-NR, NR) * P; const s = rand(-LIM + 10, LIM - 10); const x = ax ? s : k, z = ax ? k : s; const d = Math.hypot(x - px, z - pz); if (d < r0 || d > r1) continue;
    const fr = ((s % P) + P) % P; if (fr < RH + 6 || fr > P - RH - 6) continue; // 교차로 안은 피해요
    const f = ax ? [pick([1, -1]), 0] : [0, pick([1, -1])]; const li = randi(0, 1); const r = right(f); const lx = x + (ax ? 0 : r[0] * LANES[li]), lz = z + (ax ? r[1] * LANES[li] : 0);
    if (CARS.some(c => Math.hypot(c.x - lx, c.z - lz) < 14)) continue; return { x: lx, z: lz, f, li };
  } return null;
}
function sidewalkNear(px, pz, r0, r1) { for (let t = 0; t < 20; t++) { const bi = randi(-NR, NR - 1), bj = randi(-NR, NR - 1); const k = randi(0, 3); const a = ringCorner(bi, bj, k), b = ringCorner(bi, bj, k + 1); const u = Math.random(); const x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u); const d = Math.hypot(x - px, z - pz); if (d > r0 && d < r1) return [x, z, bi, bj, k]; } return null; }
function spawnTraffic() {
  const pos = laneNear(PL.x, PL.z, 60, 150); if (!pos) return; const r = Math.random();
  const type = r < .05 ? 'police' : r < .18 ? 'taxi' : r < .27 ? 'suv' : r < .34 ? 'truck' : r < .4 ? 'bus' : r < .43 ? 'sports' : r < .5 ? 'scooter' : r < .54 ? 'bike' : 'sedan';
  const c = makeCar(type, type === 'bus' ? pick(['blue', 'green']) : null); laneSpawn(c, pos.x, pos.z, pos.f, pos.li); c.drvLook = type === 'police' ? LOOKS.police() : randomLook(Math.random() < .3); c.drvP = true; scene.add(c.g); CARS.push(c);
  if (c.S.bike) addRider(c, Object.assign(c.drvLook, { helmet: pick(['#f2f2f2', '#111', '#d61f26', '#1e64d8', '#ffcc33']) }));
  placeCar(c);
}
function spawnParked() {
  for (const s of PARK_SPOTS) {
    const n = Math.max(1, Math.floor((s.x1 - s.x0) * (s.z1 - s.z0) / 260)); const alongX = s.x1 - s.x0 > s.z1 - s.z0;
    for (let i = 0; i < Math.min(n, 4); i++) {
      if (Math.random() < .35) continue; const type = s.kind === 'police' ? 'police' : pick(['sedan', 'sedan', 'suv', 'sedan', 'truck', 'sports', 'taxi']);
      const c = makeCar(type); c.x = alongX ? lerp(s.x0, s.x1, (i + .5) / Math.min(n, 4)) : (s.x0 + s.x1) / 2; c.z = alongX ? (s.z0 + s.z1) / 2 : lerp(s.z0, s.z1, (i + .5) / Math.min(n, 4)); c.yaw = (alongX ? 0 : Math.PI / 2) + (Math.random() < .5 ? Math.PI : 0);
      c.parked = true; c.y = .18; placeCar(c); scene.add(c.g); CARS.push(c); c.alarm = Math.random() < .25;
    }
  }
}
function spawnPedestrians(dt) {
  G.spT = (G.spT || 0) - dt; if (G.spT > 0) return; G.spT = .35;
  // 멀리 간 것 정리
  for (let i = NPCS.length - 1; i >= 0; i--) { const n = NPCS[i]; const d = Math.hypot(n.x - PL.x, n.z - PL.z); if ((d > 110 && !n.mission) || (n.leave && d > 50) || (n.dead && (n.deadT > 60 || d > 70))) removeNPC(n); }
  for (let i = CARS.length - 1; i >= 0; i--) { const c = CARS[i]; if (c === PL.car || c.mission) continue; const d = Math.hypot(c.x - PL.x, c.z - PL.z); if ((c.ai && d > 190) || (!c.ai && !c.parked && !c.chase && d > 190) || (c.dead && d > 150) || (c.leaving && d > 120)) removeCar(c); }
  const peds = NPCS.filter(n => !n.cop && !n.mission && !n.dead).length; if (peds < MAXN.peds) { const s = sidewalkNear(PL.x, PL.z, 28, 85); if (s && !inView(s[0], s[1], 40)) { const n = spawnNPC(s[0], s[1], 'ped'); n.bi = s[2]; n.bj = s[3]; n.k = s[4] + (n.dir > 0 ? 1 : 0); n.tgt = ringCorner(n.bi, n.bj, n.k); if (Math.random() < .12) { n.st = 'idle'; n.t = rand(5, 20); n.P.pose = Math.random() < .5 ? 'phone' : null; } } }
  const traf = CARS.filter(c => c.ai).length; if (traf < MAXN.traffic) spawnTraffic();
}
function inView(x, z, minD) { const v = new T.Vector3(x, 1.5, z); const d = v.distanceTo(cam.position); if (d < minD) return true; v.project(cam); return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && d < 70; }

/* ---------- 줍는 것 ---------- */
const PICKS = [];
const cashGeo = new T.BoxGeometry(.5, .05, .26), cashMat = new T.MeshStandardMaterial({ color: lin('#5fbf5f'), emissive: lin('#1f6f1f'), emissiveIntensity: .6 });
function dropCash(x, z, amt) { const m = new T.Mesh(cashGeo, cashMat); m.position.set(x, groundY(x, z) + .5, z); scene.add(m); PICKS.push({ m, x, z, amt, t: 25, kind: 'cash' }); }
function dropAmmo(x, z, w, n) { const m = new T.Mesh(new T.BoxGeometry(.35, .2, .25), new T.MeshStandardMaterial({ color: lin('#5a4a1a'), emissive: lin('#3a2a00'), emissiveIntensity: .5 })); m.position.set(x, groundY(x, z) + .4, z); scene.add(m); PICKS.push({ m, x, z, kind: 'ammo', w, amt: n, t: 40 }); }
function addPickup(kind, x, z, respawn) {
  const g = new T.Group(); if (kind === 'health') { const b = new T.Mesh(new T.BoxGeometry(.6, .45, .4), new T.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: .25 })); g.add(b); const c1 = new T.Mesh(new T.BoxGeometry(.42, .12, .41), new T.MeshBasicMaterial({ color: '#e02020' })); const c2 = new T.Mesh(new T.BoxGeometry(.12, .34, .41), c1.material); g.add(c1, c2); }
  else { const b = new T.Mesh(new T.BoxGeometry(.6, .7, .25), new T.MeshStandardMaterial({ color: lin('#2b3d63'), emissive: lin('#1a2a50'), emissiveIntensity: .5 })); g.add(b); }
  g.position.set(x, groundY(x, z) + .7, z); scene.add(g); PICKS.push({ m: g, x, z, kind, respawn, t: 1e9 });
}
function updatePicks(dt) {
  for (let i = PICKS.length - 1; i >= 0; i--) {
    const p = PICKS[i]; p.m.rotation.y += dt * 2; if (p.wait > 0) { p.wait -= dt; p.m.visible = p.wait <= 0; continue; }
    p.t -= dt; if (p.t <= 0) { scene.remove(p.m); PICKS.splice(i, 1); continue; }
    if (!PL.car && Math.hypot(PL.x - p.x, PL.z - p.z) < 1.3) {
      if (p.kind === 'cash') { addMoney(p.amt); SFX.cash(); popLabel(p.x, PL.y + 2, p.z, '+' + won(p.amt), '#7ee08a', 1); scene.remove(p.m); PICKS.splice(i, 1); }
      else if (p.kind === 'ammo') { giveWeapon(p.w, p.amt, curWid() === 'fist'); SFX.cash(); toast(`🔫 ${WEAP[p.w].n} 탄약 +${p.amt}`); scene.remove(p.m); PICKS.splice(i, 1); }
      else if (p.kind === 'health' && PL.hp < 100) { PL.hp = 100; SFX.cash(); toast('❤️ 체력 회복!'); p.wait = p.respawn; p.m.visible = false; }
      else if (p.kind === 'armor' && PL.ar < 100) { PL.ar = 100; SFX.cash(); toast('🦺 방탄조끼를 입었어요!'); p.wait = p.respawn; p.m.visible = false; }
    }
  }
}
function addMoney(n) { SV.money = Math.max(0, SV.money + n); G.moneyPulse = 1; save(); }

/* ---------- 정비소 (수배 지우기 · 수리) ---------- */
function updateGarage() {
  const g = BUILD.landmarks.garage; if (!g) return; const c = PL.car; if (MI && MI.noGarage && c && c.x > g.x0 && c.x < g.x1 && c.z > g.z0 && c.z < g.z1) { if (!G.inGarage) { G.inGarage = true; toast('🔧 경찰이 정비소를 지키고 있어요! 오늘은 안 돼요'); } return; } const inside = c && c.x > g.x0 && c.x < g.x1 && c.z > g.z0 && c.z < g.z1;
  if (inside && !G.inGarage && Math.abs(c.v) < 9) {
    G.inGarage = true; const need = G.wanted > 0 || c.hp < c.maxHp * .95; if (!need) { if (Math.abs(c.v) > 2) toast('🔧 정비소예요. 수배 중이거나 차가 망가졌을 때 오면 고쳐 줘요.'); return; }
    if (SV.money < 5000) { toast('💸 돈이 부족해요 (₩5,000 필요)'); return; }
    fade(true); setTimeout(() => { addMoney(-5000); setWanted(0); c.hp = c.maxHp; c.fire = 0; if (c.type !== 'police' && c.type !== 'taxi' && c.type !== 'bus') { const pm = paintMat(pick(PAINT)); c.bodyG.children.forEach(o => { if (o.isMesh && o.material && o.material.clearcoat && o.material !== GLASS) o.material = pm; }); } toast('🔧 새 색으로 칠하고 수리했어요! 수배도 사라졌어요 (₩5,000)'); SFX.cash(); fade(false); }, 700);
  } else if (!inside) G.inGarage = false;
}
function fade(on) { $('#fade').style.opacity = on ? 1 : 0; }

/* ---------- 편의점 ---------- */
function shopMenu() {
  G.paused = true; document.exitPointerLock && document.exitPointerLock();
  const items = [['🍙 삼각김밥', 1500, 25], ['🥛 바나나우유', 1800, 35], ['🍜 컵라면', 2500, 55], ['🍱 도시락', 4500, 100]];
  menu(`<h2>🏪 편의점</h2><p>체력 ${Math.round(PL.hp)} / 100 · 돈 ${won(SV.money)}</p><div class="shopL">${items.map((it, i) => `<button class="btn" data-i="${i}"><span>${it[0]} <small style="color:#666">+${it[2]} 체력</small></span><b>${won(it[1])}</b></button>`).join('')}</div><button class="btn d" id="mClose">나가기</button>`);
  $$('[data-i]').forEach(b => b.onclick = () => { const it = items[+b.dataset.i]; if (SV.money < it[1]) { b.textContent = '돈이 부족해요'; return; } if (PL.hp >= 100) { b.textContent = '배불러요!'; return; } addMoney(-it[1]); PL.hp = Math.min(100, PL.hp + it[2]); SFX.cash(); shopMenu(); });
  $('#mClose').onclick = closeMenu;
}

/* ---------- 미션 ---------- */
const MARKS = []; // 지도 · 화면 표시
const markGeo = new T.CylinderGeometry(1.4, 1.4, 1.2, 32, 1, true), arrowGeo = new T.ConeGeometry(.45, .9, 4);
function mkMarker(x, z, col, opt) {
  opt = opt || {}; const g = new T.Group(); const m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .45, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
  const cyl = new T.Mesh(markGeo, m); cyl.scale.setScalar(opt.r || 1); cyl.position.y = .6; g.add(cyl); const ar = new T.Mesh(arrowGeo, new T.MeshBasicMaterial({ color: col })); ar.rotation.x = Math.PI; ar.position.y = 3; g.add(ar);
  g.position.set(x, groundY(x, z), z); scene.add(g); const M = { g, ar, x, z, col, r: (opt.r || 1) * 1.6, icon: opt.icon || '', label: opt.label || '', big: opt.big }; MARKS.push(M); return M;
}
function rmMarker(M) { if (!M) return; scene.remove(M.g); const i = MARKS.indexOf(M); if (i >= 0) MARKS.splice(i, 1); }
function inMarker(M, x, z) { return M && Math.hypot(x - M.x, z - M.z) < M.r + (PL.car ? 1.5 : 0); }
let MI = null; // 지금 미션
const GIVERS = {};
function obj(html) { $('#obj').innerHTML = html || ''; }
function missionEvent(ev, a) { if (MI && MI.on) MI.on(ev, a); }
function missionPass(reward, title) { const m = MI; MI = null; obj(''); $('#timer').hidden = true; addMoney(reward); SFX.pass(); big('임무 완료!', '+' + won(reward), 'pass', 3500); if (m && m.cleanup) m.cleanup(); setupGivers(); save(); }
function missionFail(why) { const m = MI; MI = null; obj(''); $('#timer').hidden = true; if (m && m.cleanup) m.cleanup(); if (!G.dead) { SFX.fail(); big('임무 실패', why, 'dead', 3000); } setupGivers(); }
function timer(sec) { G.mTimer = sec; $('#timer').hidden = false; }
function apartmentDoor() { const bs = BUILD.shops.filter(s => Math.hypot(s.x - PL.x, s.z - PL.z) > 120 && Math.hypot(s.x - PL.x, s.z - PL.z) < 260 && Math.abs(s.x) < LIM && Math.abs(s.z) < LIM); return pick(bs.length ? bs : BUILD.shops); }
const STORY = [
  { n: '서울 첫날', who: '박 사장', intro: '어서 와! 서울은 처음이지? 일 좀 해 볼래?\n먼저 아무 차에나 타서 <b>서울타워 123</b>까지 갔다가 다시 와 봐.', start() {
    let step = 0; let M = null; obj('🚗 아무 차에나 타요 <em>(차 옆에서 F / 🚗)</em>');
    MI.on = (e) => { if (e === 'enter' && step === 0) { step = 1; const t = BUILD.landmarks.tower; M = mkMarker(t.x, t.z, '#ffcc33', { r: 2 }); obj('🏙️ <em>서울타워 123</em>으로 가요 (지도에 노란 점)'); } };
    MI.upd = () => { if (step === 1 && inMarker(M, PL.x, PL.z)) { rmMarker(M); step = 2; const g = BUILD.landmarks.garage; M = mkMarker(g.x, g.z + 13, '#ffcc33', { r: 2 }); obj('🔧 이제 <em>정비소</em> 앞으로 돌아와요'); } if (step === 2 && inMarker(M, PL.x, PL.z)) missionPass(50000); };
    MI.cleanup = () => rmMarker(M);
  } },
  { n: '치킨 대작전', who: '박 사장', intro: '서울치킨 사장님이 일손이 모자라대.\n치킨을 받아서 <b>식기 전에</b> 배달해 줘!', start() {
    const ck = BUILD.shops.find(s => s.name === '서울치킨'); let M = mkMarker(ck.x, ck.z, '#ffcc33'); let step = 0; obj('🍗 <em>서울치킨</em>에서 치킨을 받아요');
    MI.upd = () => { if (step === 0 && inMarker(M, PL.x, PL.z)) { rmMarker(M); step = 1; SFX.cash(); const d = apartmentDoor(); M = mkMarker(d.x, d.z, '#ffcc33'); const dist = Math.hypot(d.x - PL.x, d.z - PL.z); timer(Math.round(dist / 6 + 25)); obj(`🍗 치킨을 <em>${d.name}</em> 앞까지 배달해요!`); } else if (step === 1 && inMarker(M, PL.x, PL.z)) { SV.deliveries++; missionPass(80000); } };
    MI.timeUp = () => missionFail('치킨이 다 식었어요…'); MI.cleanup = () => rmMarker(M);
  } },
  { n: '빨간 스포츠카', who: '박 사장', intro: '강남에 <b>빨간 스포츠카</b>가 서 있대.\n살짝 가져와서 정비소에 넣어 줘. 망가지면 안 돼!', start() {
    const t = BUILD.landmarks.tower; const c = makeCar('sports', '#d10f1f'); c.x = t.x + 10; c.z = t.z + 4; c.yaw = Math.PI / 2; c.parked = true; c.mission = true; c.alarm = true; placeCar(c); scene.add(c.g); CARS.push(c); MI.car = c;
    let M = null; obj('🏎️ <em>빨간 스포츠카</em>를 찾아서 타요 (지도에 빨간 점)'); MI.blipCar = c;
    MI.on = (e, a) => { if (e === 'enter' && a === c && !M) { const g = BUILD.landmarks.garage; M = mkMarker(g.x, g.z + 2, '#ffcc33', { r: 2.2 }); obj('🔧 망가지지 않게 <em>정비소</em>로 가져와요'); } if (e === 'boom' && a === c) missionFail('차가 터졌어요!'); };
    MI.upd = () => { if (M && PL.car === c && inMarker(M, PL.x, PL.z)) { if (c.hp < c.maxHp * .5) { missionFail('차가 너무 망가졌어요'); return; } c.mission = false; exitCar(); removeCar(c); missionPass(200000); return; } if (M) obj(`🔧 <em>정비소</em>로 가져와요 · 차 상태 ${Math.max(0, Math.round(c.hp / c.maxHp * 100))}%`); };
    MI.cleanup = () => { rmMarker(M); c.mission = false; };
  } },
  { n: '도망자', who: '박 사장', intro: '큰일이야, 경찰이 너를 찾고 있어!\n<b>별 3개</b>! 어떻게든 따돌려 봐. (정비소에 들르면 바로 지워져)', start() {
    setWanted(3); obj('🚨 <em>경찰을 따돌려요!</em> 숨거나, 멀리 도망치거나, 정비소로'); MI.upd = () => { if (G.wanted === 0) missionPass(150000); };
  } },
  { n: '급한 손님', who: '박 사장', intro: '택시 기사가 아프대. 대신 손님 좀 태워 줄래?\n정비소 안 <b>택시</b>를 타고 손님을 병원에 데려다줘.', start() {
    const g = BUILD.landmarks.garage; const c = makeCar('taxi'); c.x = g.x; c.z = g.z - 1; c.yaw = 0; c.parked = true; c.mission = true; placeCar(c); scene.add(c.g); CARS.push(c);
    let step = 0, M = null, pas = null; obj('🚕 정비소 안 <em>택시</em>를 타요'); MI.blipCar = c;
    MI.on = (e, a) => { if (e === 'enter' && a === c && step === 0) { step = 1; MI.blipCar = null; const s = sidewalkNear(PL.x, PL.z, 120, 200); pas = spawnNPC(s[0], s[1], 'ped'); pas.mission = true; pas.st = 'stand'; pas.P.pose = 'hands'; M = mkMarker(s[0], s[1], '#4fc3ff'); obj('🙋 손을 흔드는 <em>손님</em>을 태우러 가요'); } if (e === 'exit' && step > 0 && step < 3) { obj('🚕 <em>택시</em>로 돌아가요!'); } if (e === 'enter' && a === c && step > 0) obj(step === 1 ? '🙋 <em>손님</em>을 태우러 가요' : '🏥 <em>병원</em>으로 가요!'); };
    MI.upd = (dt) => {
      if (step === 1 && PL.car === c && inMarker(M, PL.x, PL.z) && Math.abs(c.v) < 3) { step = 2; rmMarker(M); pas.st = 'goto'; pas.tgt = [c.x, c.z]; pas.onArrive = n => { removeNPC(n); }; setTimeout(() => { if (pas && NPCS.includes(pas)) removeNPC(pas); }, 2500); const h = BUILD.landmarks.hospital; M = mkMarker(h.x, h.z, '#ffcc33', { r: 2 }); timer(70); obj('🏥 손님이 아파요! <em>병원</em>으로 빨리!'); }
      if (step === 2 && PL.car === c && inMarker(M, PL.x, PL.z)) { SV.fares++; c.mission = false; missionPass(120000); }
    };
    MI.timeUp = () => missionFail('너무 늦었어요…'); MI.cleanup = () => { rmMarker(M); c.mission = false; if (pas && NPCS.includes(pas)) { pas.mission = false; pas.st = 'flee'; pas.t = 3; pas.P.pose = null; } };
  } },
  { n: '한강 질주', who: '박 사장', intro: '실력 시험이야. 서울을 가로질러 <b>한강 다리 끝</b>까지 달려!\n체크포인트를 시간 안에 다 지나야 해. 빠른 차를 골라!', start() {
    const cps = [[P, -2 * P], [-2 * P, -2 * P], [-2 * P, P], [P, P], [2 * P, 2 * P], [0, 3 * P], [0, 420], [0, 580]]; let i = -1, M = null;
    obj('🏁 먼저 <em>차</em>를 타요'); const next = () => { rmMarker(M); i++; if (i >= cps.length) { SV.best.race = Math.round(G.mTimer); missionPass(1000000); big('서울의 전설!', '다음 미션도 박 사장에게!', 'pass', 4500); return; } M = mkMarker(cps[i][0], cps[i][1], i === cps.length - 1 ? '#ff4d6d' : '#ffcc33', { r: 3 }); obj(`🏁 체크포인트 <em>${i + 1} / ${cps.length}</em>`); };
    MI.upd = () => { if (i < 0) { if (PL.car) { next(); timer(150); SFX.star(); } return; } if (inMarker(M, PL.x, PL.z)) { SFX.click(); G.mTimer += 4; next(); } };
    MI.on = e => { if (e === 'exit' && i >= 0) missionFail('차에서 내렸어요'); };
    MI.timeUp = () => missionFail('시간 초과!'); MI.cleanup = () => rmMarker(M);
  } },
  { n: '배달 라이더', who: '박 사장', intro: '요즘은 오토바이 배달이 대세지!\n정비소 앞 <b>배달 스쿠터</b>를 타고 주문 <b>3건</b>을 시간 안에 배달해 줘.', start() {
    const g = BUILD.landmarks.garage; const c = makeCar('scooter'); c.x = g.x - 4; c.z = g.z + 9; c.yaw = Math.PI / 2; c.parked = true; c.mission = true; placeCar(c); scene.add(c.g); CARS.push(c); MI.blipCar = c;
    let done = 0, M = null; obj('🛵 <em>배달 스쿠터</em>를 타요');
    const next = () => { rmMarker(M); const d = apartmentDoor(); M = mkMarker(d.x, d.z, '#ffcc33'); const dist = Math.hypot(d.x - PL.x, d.z - PL.z); timer(Math.round(dist / 8 + 22)); obj(`🛵 배달 <em>${done + 1} / 3</em> · ${d.name} 앞까지!`); };
    MI.on = (e, a) => { if (e === 'enter' && a === c && !M) { MI.blipCar = null; next(); } if (e === 'boom' && a === c) missionFail('스쿠터가 터졌어요!'); };
    MI.upd = () => { if (M && PL.car === c && inMarker(M, PL.x, PL.z)) { done++; SFX.cash(); SV.deliveries++; if (done >= 3) { c.mission = false; missionPass(250000); return; } next(); } if (M && PL.car !== c) obj('🛵 <em>스쿠터</em>로 돌아가요!'); };
    MI.timeUp = () => missionFail('음식이 다 식었어요…'); MI.cleanup = () => { rmMarker(M); c.mission = false; };
  } },
  { n: '불량배 소탕', who: '박 사장', intro: '공원에서 <b>불량배들</b>이 시민들을 괴롭힌대.\n이 <b>권총</b> 가져가. 놈들을 전부 쓰러뜨려!', start() {
    giveWeapon('pistol', 48); toast('🔫 권총을 받았어요! (Q / 무기 아이콘으로 바꾸기)'); const pk = BUILD.landmarks.park || { x: P * 1.5, z: -P * 2.5 }; const M = mkMarker(pk.x, pk.z, '#ff3040', { r: 2.5 }); const thugs = []; let on = false;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const n = spawnNPC(pk.x + Math.cos(a) * 5, pk.z + Math.sin(a) * 5, 'thug'); n.mission = true; n.st = 'stand'; n.face = [pk.x, pk.z]; n.money = 20000; if (i < 2) armNPC(n, 'pistol'); thugs.push(n); }
    obj('😠 <em>공원</em>의 불량배들에게 가요');
    MI.upd = () => { const down = thugs.filter(n => n.dead || n.kos >= 1 || !NPCS.includes(n)).length; if (!on && Math.hypot(PL.x - pk.x, PL.z - pk.z) < 32) { on = true; rmMarker(M); popLabel(pk.x, 3, pk.z, '덤벼라!', '#ff4d4d', 2); for (const n of thugs) { n.st = n.gun ? 'shoot' : 'fight'; n.t = 999; } } if (on) obj(`😠 불량배를 모두 쓰러뜨려요 <em>${down} / 5</em>`); if (down >= 5) missionPass(400000); };
    MI.cleanup = () => { rmMarker(M); for (const n of thugs) if (NPCS.includes(n)) { n.mission = false; if (!n.dead && n.ko <= 0) { n.st = 'flee'; n.t = 5; } } };
  } },
  { n: '포위망 돌파', who: '박 사장', intro: '마지막이야. 경찰이 너를 <b>별 5개</b>로 쫓고 있어!\n이번엔 정비소도 변호사도 못 도와줘. <b>60초</b> 버티고, 끝까지 따돌려!', start() {
    setWanted(5); MI.noGarage = true; MI.noLawyer = true; timer(60); let phase = 0; obj('🚨 <em>60초</em> 동안 살아남아요!');
    MI.timeUp = () => { phase = 1; obj('🚨 이제 <em>경찰을 완전히 따돌려요!</em>'); };
    MI.upd = () => { if (phase === 1 && G.wanted === 0) { missionPass(2000000); big('서울의 왕!', 'STA 1 스토리를 모두 끝냈어요 👑', 'pass', 5000); } };
  } }
];
function setupGivers() {
  for (const k in GIVERS) { rmMarker(GIVERS[k].M); if (GIVERS[k].npc && NPCS.includes(GIVERS[k].npc)) removeNPC(GIVERS[k].npc); delete GIVERS[k]; }
  if (MI) return;
  const g = BUILD.landmarks.garage;
  if (SV.story < STORY.length) { GIVERS.boss = { M: mkMarker(g.x, g.z + 10.5, '#ffcc33', { icon: 'B', label: '박 사장' }), x: g.x, z: g.z + 10.5 }; const n = spawnNPC(g.x + 1.8, g.z + 10, 'thug', { w: 0, skin: '#e9c9ad', top: '#7a1f2b', bot: '#151515', shoe: '#4a2d1a', beard: true, head: 'hat', hat: '#1b1b1d', s: 1.05, wide: 1.2 }); n.mission = true; n.st = 'stand'; n.face = [g.x, g.z + 20]; GIVERS.boss.npc = n; }
  if ((SV.heist || 0) < HEISTS.length) { const rx = -150, rz = LIM + RH + 7; GIVERS.ray = { M: mkMarker(rx, rz, '#ff4d6d', { icon: 'R', label: '레이' }), x: rx, z: rz }; const n = spawnNPC(rx + 1.6, rz - .5, 'ped', { w: 0, skin: '#e9c9ad', top: '#151515', bot: '#151515', shoe: '#121212', beard: false, head: 'hat', hat: '#1b1b1d', glasses: true, s: 1.05, wide: 1.1 }); n.mission = true; n.st = 'stand'; n.face = [rx, rz - 6]; n.voice = 'bm_daniel'; GIVERS.ray.npc = n; }
  const ck = BUILD.shops.find(s => s.name === '서울치킨'); if (ck && SV.story >= 2) GIVERS.chicken = { M: mkMarker(ck.x, ck.z, '#ff9f1c', { icon: 'C', label: '치킨 배달' }), x: ck.x, z: ck.z };
}
function checkGivers() {
  if (MI) return;
  if (GIVERS.boss && !PL.car && inMarker(GIVERS.boss.M, PL.x, PL.z)) { const s = STORY[SV.story]; askMission(`📞 ${s.who} · ${SV.story + 1}. ${s.n}`, s.intro, () => { story('b_job'); MI = { story: true }; for (const k in GIVERS) rmMarker(GIVERS[k].M); s.start(); MI.pass = MI.pass; const orig = missionPass; }); return; }
  if (GIVERS.ray && !PL.car && inMarker(GIVERS.ray.M, PL.x, PL.z)) { const h = HEISTS[SV.heist || 0]; askMission(`🔫 레이의 작전 · ${(SV.heist || 0) + 1}. ${h.n}`, h.intro, () => startHeist()); return; }
  if (GIVERS.chicken && inMarker(GIVERS.chicken.M, PL.x, PL.z)) askMission('🍗 치킨 배달 알바', '치킨을 받아 시간 안에 배달하면 돈을 받아요.\n빨리 갈수록 팁이 더 많아요!', () => { MI = {}; for (const k in GIVERS) rmMarker(GIVERS[k].M); chickenJob(); });
}
function askMission(title, text, go) {
  G.asked = G.asked || {}; const key = title; if (G.askT > G.t) return; G.askT = G.t + 4;
  G.paused = true; document.exitPointerLock && document.exitPointerLock();
  menu(`<h2>${title}</h2><p>${text.replace(/\n/g, '<br>')}</p><div class="row"><button class="btn y" id="mGo">▶ 할게요</button><button class="btn d" id="mNo">나중에</button></div>`);
  $('#mGo').onclick = () => { closeMenu(); go(); SFX.click(); }; $('#mNo').onclick = () => { closeMenu(); };
}
// 스토리 진행 저장
const _pass = missionPass; missionPass = function (r) { if (MI && MI.story) { SV.story++; setTimeout(() => story('b_good'), 900); } if (MI && MI.heistIdx != null) SV.heist = (SV.heist || 0) + 1; _pass(r); };
const _fail = missionFail; missionFail = function (why) { const h = MI && MI.heistIdx != null, st = MI && MI.story; _fail(why); if (h) setTimeout(() => story('r_bad'), 900); else if (st) setTimeout(() => story('b_bad'), 900); };
function chickenJob() {
  const ck = BUILD.shops.find(s => s.name === '서울치킨'); const d = apartmentDoor(); const M = mkMarker(d.x, d.z, '#ffcc33'); const dist = Math.hypot(d.x - ck.x, d.z - ck.z); const lim = Math.round(dist / 6 + 25); timer(lim); SFX.cash();
  obj(`🍗 <em>${d.name}</em> 앞으로 배달! (${Math.round(dist)}m)`);
  MI.upd = () => { if (inMarker(M, PL.x, PL.z)) { SV.deliveries++; const tip = Math.round(G.mTimer / lim * 20) * 1000; missionPass(15000 + tip); } };
  MI.timeUp = () => missionFail('치킨이 식었어요…'); MI.cleanup = () => rmMarker(M);
}
function startTaxiJob() {
  if (MI || !PL.car || PL.car.type !== 'taxi') { if (PL.car && PL.car.type !== 'taxi') toast('🚕 택시 알바는 택시를 타고 있을 때 T 키 (🚕)로 해요'); return; }
  MI = { taxi: true }; for (const k in GIVERS) rmMarker(GIVERS[k].M); let fares = 0; const c = PL.car;
  const nextFare = () => {
    const s = sidewalkNear(PL.x, PL.z, 60, 150); if (!s) { missionFail('손님이 없어요'); return; } const pas = spawnNPC(s[0], s[1], 'ped'); pas.mission = true; pas.st = 'stand'; pas.P.pose = 'hands'; let M = mkMarker(s[0], s[1], '#4fc3ff'); let step = 1;
    obj(`🚕 택시 알바 · 손님 ${fares + 1} · 손 흔드는 <em>손님</em>에게 가요`);
    MI.upd = () => {
      if (step === 1 && PL.car === c && inMarker(M, PL.x, PL.z) && Math.abs(c.v) < 3) { step = 2; rmMarker(M); removeNPC(pas); const d = apartmentDoor(); M = mkMarker(d.x, d.z, '#ffcc33'); MI.dist = Math.hypot(d.x - PL.x, d.z - PL.z); timer(Math.round(MI.dist / 7 + 20)); obj(`🚕 손님을 <em>${d.name}</em> 앞까지 모셔요`); }
      if (step === 2 && PL.car === c && inMarker(M, PL.x, PL.z)) { rmMarker(M); fares++; SV.fares++; const pay = Math.round(MI.dist * 40 / 100) * 100 + 3800; addMoney(pay); SFX.cash(); toast(`🚕 요금 ${won(pay)} 받았어요!`); $('#timer').hidden = true; G.mTimer = 0; nextFare(); }
    };
    MI.cleanup = () => { rmMarker(M); if (NPCS.includes(pas)) removeNPC(pas); };
  };
  MI.on = e => { if (e === 'exit') { const m = MI; MI = null; obj(''); $('#timer').hidden = true; if (m.cleanup) m.cleanup(); toast(`🚕 택시 알바 끝! 손님 ${fares}명`); setupGivers(); } };
  MI.timeUp = () => { toast('손님이 화가 나서 내렸어요…'); if (MI.cleanup) MI.cleanup(); nextFare(); };
  nextFare();
}
function updateMission(dt) {
  if (!MI) { checkGivers(); return; }
  if (!$('#timer').hidden) { G.mTimer -= dt; const s = Math.max(0, G.mTimer); $('#timer').textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); $('#timer').style.color = s < 10 ? '#ff5050' : '#fff'; if (G.mTimer <= 0) { $('#timer').hidden = true; MI.timeUp && MI.timeUp(); return; } }
  MI.upd && MI.upd(dt);
}

/* ---------- 체포 · 기절 ---------- */
function busted() {
  if (G.dead) return; G.dead = true; SV.busted++; const fine = Math.min(SV.money, Math.max(2000, Math.round(SV.money * .08 / 100) * 100)); big('체포!', `벌금 ${won(fine)}`, 'bust', 3000); SFX.fail();
  if (MI) missionFail('체포됐어요'); PL.P.pose = 'hands';
  setTimeout(() => { fade(true); setTimeout(() => { addMoney(-fine); if (SV.ammo && Object.keys(SV.ammo).length) { SV.ammo = {}; SV.wep = 'fist'; refreshGun(); toast('👮 경찰이 총을 모두 압수했어요'); } respawn(BUILD.landmarks.police); fade(false); }, 600); }, 2600);
}
function wasted() {
  if (G.dead) return; G.dead = true; SV.wasted++; const bill = Math.min(SV.money, 10000); big('기절!', `병원비 ${won(bill)}`, 'dead', 3000); SFX.fail(); if (MI) missionFail('기절했어요');
  if (PL.car) exitCar(); knockPlayer(3, 0, 0);
  setTimeout(() => { fade(true); setTimeout(() => { addMoney(-bill); respawn(BUILD.landmarks.hospital); fade(false); }, 600); }, 2600);
}
function respawn(at) {
  setWanted(0); for (let i = NPCS.length - 1; i >= 0; i--) if (NPCS[i].cop || ['fight', 'shoot'].includes(NPCS[i].st)) removeNPC(NPCS[i]); for (let i = CARS.length - 1; i >= 0; i--) if (CARS[i].chase || CARS[i].roadblock) removeCar(CARS[i]); if (HELI.h) { scene.remove(HELI.h.g); HELI.h = null; } BLOCKS.length = 0;
  if (PL.car && PL.car.S.bike) { scene.add(PL.P.root); }
  if (PL.car) { PL.car.drv = null; PL.car = null; } PL.hp = 100; PL.ko = 0; PL.grab = 0; PL.P.pose = null; PL.P.root.rotation.x = 0; playerPos(at.x, at.z, 0); G.dead = false; setupGivers(); save();
}

/* ---------- 카메라 ---------- */
const CAMS = { yaw: 0, pitch: .32, pos: new T.Vector3(), look: new T.Vector3(), zoom: 1, manualT: 9 };
function cycleCam() { G.camMode = (G.camMode + 1) % 3; CAMS.zoom = [.7, 1, 1.5][G.camMode]; }
function updateCamera(dt) {
  const lk = IN.look; const sens = 1 - (CAMS.aimK || 0) * .45; if (lk[0] || lk[1]) { CAMS.yaw -= lk[0] * .0032 * sens; CAMS.pitch = clamp(CAMS.pitch + lk[1] * .0028 * sens, -.45, 1.25); CAMS.manualT = 0; } lk[0] = lk[1] = 0; CAMS.manualT += dt;
  if (G.selfieT > 0) { G.selfieT -= dt; PL.P.pose = G.selfieT > 0 ? 'phone' : null; const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; cam.position.set(PL.x + f[0] * 1.6 - f[1] * .5, PL.y + 1.6, PL.z + f[1] * 1.6 + f[0] * .5); cam.lookAt(PL.x, PL.y + 1.45, PL.z); CAMS.pos.copy(cam.position); return; }
  let dist, h, tgt; const c = PL.car;
  if (c) {
    dist = (c.type === 'bus' ? 14 : c.type === 'truck' ? 9 : 7.2) * CAMS.zoom; h = 1.6;
    if (CAMS.manualT > 1.3 && Math.abs(c.v) > 1.5) { const want = c.v >= 0 ? c.yaw : c.yaw; CAMS.yaw += angDiff(CAMS.yaw, want) * Math.min(1, dt * 2.5); CAMS.pitch += (.2 - CAMS.pitch) * Math.min(1, dt * 1.5); }
    tgt = new T.Vector3(c.x, c.y + h, c.z);
  } else { const aim = curWid() !== 'fist' && (IN.aim || IN.fireHeld) && !IS_MOBILE; CAMS.aimK = lerp(CAMS.aimK || 0, aim ? 1 : 0, Math.min(1, dt * 10)); dist = 4.3 * CAMS.zoom * (1 - CAMS.aimK * .45); h = 1.55; tgt = new T.Vector3(PL.x, PL.y + h, PL.z); const rt = [-Math.cos(CAMS.yaw), Math.sin(CAMS.yaw)], so = .35 + CAMS.aimK * .4; tgt.x += rt[0] * so; tgt.z += rt[1] * so; }
  if (innerWidth < innerHeight) dist *= 1.35;
  const f = [Math.sin(CAMS.yaw), Math.cos(CAMS.yaw)]; const cp = Math.cos(CAMS.pitch), sp = Math.sin(CAMS.pitch);
  let want = new T.Vector3(tgt.x - f[0] * cp * dist, tgt.y + sp * dist, tgt.z - f[1] * cp * dist); want.y = Math.max(want.y, groundY(want.x, want.z) + .3);
  const k = rayBlock(tgt.x, tgt.y, tgt.z, want.x, want.y, want.z); if (k < 1) want = tgt.clone().lerp(want, Math.max(.12, k - .06));
  CAMS.pos.lerp(want, Math.min(1, dt * (c ? 9 : 14))); if (CAMS.pos.distanceTo(want) > 30) CAMS.pos.copy(want); CAMS.look.copy(tgt);
  cam.position.copy(CAMS.pos); if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt * 1.6); cam.position.x += rand(-1, 1) * G.shake * .3; cam.position.y += rand(-1, 1) * G.shake * .3; }
  G.fovKick = Math.max(0, (G.fovKick || 0) - dt * 30); cam.lookAt(CAMS.look); const fov = -(G.fovKick || 0) + (c ? 60 + clamp(Math.abs(c.v) / 45, 0, 1) * 14 : 60); if (Math.abs(cam.fov - fov) > .1) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
}

/* ---------- HUD ---------- */
function big(t, s, cls, ms) { const b = $('#big'); b.className = 'tx ' + (cls || ''); b.querySelector('b').textContent = t; b.querySelector('small').textContent = s || ''; b.hidden = false; clearTimeout(big.t); big.t = setTimeout(() => b.hidden = true, ms || 2500); }
function toast(t, ms) { const e = $('#toast'); e.innerHTML = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, ms || 3500); }
const PROMPT = { t: '', act: null };
function setPrompt(t) { PROMPT.next = t; }
function hudStars() { $('#stars').innerHTML = G.wanted ? [0, 1, 2, 3, 4].map(i => `<span class="s ${i < G.wanted ? 'on' : ''}">★</span>`).join('') : ''; }
let _mShown = -1;
function updateHUD(dt) {
  const h = Math.floor(DAY.t), m = Math.floor((DAY.t - h) * 60); $('#clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  if (_mShown !== SV.money) { _mShown += (SV.money - _mShown) * Math.min(1, dt * 8); if (Math.abs(SV.money - _mShown) < 50) _mShown = SV.money; $('#money').textContent = won(_mShown); }
  $('#stars').classList.toggle('flash', G.wantFlash);
  $('#hpB b').style.width = Math.max(0, PL.hp) + '%'; $('#arB').style.display = PL.ar > 0 ? '' : 'none'; $('#arB b').style.width = PL.ar + '%';
  const an = areaName(PL.x, PL.z), rn = roadName(PL.x, PL.z); if (an !== G.area) { G.area = an; const a = $('#area'); a.querySelector('b').textContent = an; a.querySelector('small').textContent = rn; a.style.opacity = 1; clearTimeout(G.areaT); G.areaT = setTimeout(() => a.style.opacity = 0, 4000); }
  if (PL.car) { $('#speed').hidden = false; $('#speed').innerHTML = Math.round(Math.abs(PL.car.v) * 3.6) + '<small>km/h · ' + PL.car.S.name + '</small>'; } else $('#speed').hidden = true;
  const pr = $('#prompt'); const t = PROMPT.next || ''; if (t !== PROMPT.t) { PROMPT.t = t; pr.textContent = t; pr.hidden = !t; } PROMPT.next = '';
  const hp = $('#help'); hp.hidden = !G.help; if (G.help) hp.innerHTML = PL.car ? '<kbd>W</kbd><kbd>S</kbd> 가속·브레이크 <kbd>A</kbd><kbd>D</kbd> 핸들 <kbd>Space</kbd> 핸드브레이크<br><kbd>F</kbd> 내리기 <kbd>H</kbd> 경적 <kbd>R</kbd> 라디오 <kbd>T</kbd> 택시 알바 (택시)<br><kbd>M</kbd> 지도 <kbd>C</kbd> 카메라 <kbd>Esc</kbd> 일시정지 · <kbd>/</kbd> 도움말 닫기' : '<kbd>WASD</kbd> 걷기 <kbd>Shift</kbd> 전력질주 <kbd>Space</kbd> 점프<br><kbd>클릭</kbd> 펀치·쏘기 (쓰러진 사람 앞: 밟기) <kbd>우클릭</kbd> 조준<br><kbd>Q</kbd>/<kbd>1~4</kbd> 무기 <kbd>F</kbd> 차 타기(뺏기) <kbd>E</kbd> 가게<br><kbd>Tab</kbd> 📱 휴대폰 <kbd>M</kbd> 지도 <kbd>Esc</kbd> 일시정지 · <kbd>/</kbd> 닫기';
  if (IS_MOBILE) { const inC = !!PL.car; if (G.hudCar !== inC) { G.hudCar = inC; hudWeapon(); } $('#bJump').hidden = inC; $('#bRun').hidden = inC; $('#bHand').hidden = !inC; $('#bRadio').hidden = !inC; $('#bCar').innerHTML = PROMPT.act && !inC ? '🏪<small>들어가기</small>' : inC ? '🚪<small>내리기</small>' : '🚗<small>타기</small>'; }
}
function radioShow() { $('#radio').hidden = false; $('#radio').innerHTML = '📻 ' + STATIONS[AU.radio.st].n + '<small>R 키 / 📻 로 바꾸기</small>'; clearTimeout(radioShow.t); radioShow.t = setTimeout(() => $('#radio').hidden = true, 2600); }
function radioHide() { $('#radio').hidden = true; }
function nextRadio() { if (!PL.car) return; AU.radio.st = (AU.radio.st + 1) % STATIONS.length; AU.radio.next = 0; radioShow(); SFX.click(); }

/* ---------- 지도 ---------- */
const MAP = { minX: -LIM - 70, maxX: LIM + 70, minZ: -LIM - 70, maxZ: 620, img: null };
function buildMapImg() {
  const S = 2; const W = (MAP.maxX - MAP.minX) * S, H = (MAP.maxZ - MAP.minZ) * S; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const X = x => (x - MAP.minX) * S, Z = z => (z - MAP.minZ) * S;
  g.fillStyle = '#3a4048'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2c5b86'; g.fillRect(0, Z(RIVER.z0), W, Z(RIVER.z1) - Z(RIVER.z0)); g.fillStyle = '#3d6a3a'; g.fillRect(0, Z(LIM + RH), W, Z(RIVER.z0) - Z(LIM + RH));
  g.fillStyle = '#8b9096'; g.fillRect(X(-LIM - RH), Z(-LIM - RH), X(LIM + RH) - X(-LIM - RH), Z(LIM + RH) - Z(-LIM - RH)); g.fillRect(X(-BRIDGE.hw), Z(LIM), BRIDGE.hw * 2 * S, Z(BRIDGE.z1) - Z(LIM));
  for (let i = -NR; i < NR; i++)for (let j = -NR; j < NR; j++) { const x0 = i * P + RH, z0 = j * P + RH; const sp = { '-1,-1': '#6e7a5a', '1,-3': '#4f7d3a' }[i + ',' + j]; g.fillStyle = sp || '#5a6068'; g.fillRect(X(x0), Z(z0), (P - 2 * RH) * S, (P - 2 * RH) * S); }
  for (const b of COL.boxes) if (b.tag === 'bld' && Math.abs(b.x0) < LIM + 20 && Math.abs(b.z0) < LIM + 20) { g.fillStyle = '#474d55'; g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S); }
  g.strokeStyle = 'rgba(255,214,90,.35)'; g.lineWidth = 1; for (let k = -NR; k <= NR; k++) { g.beginPath(); g.moveTo(X(-LIM - RH), Z(k * P)); g.lineTo(X(LIM + RH), Z(k * P)); g.moveTo(X(k * P), Z(-LIM - RH)); g.lineTo(X(k * P), Z(LIM + RH)); g.stroke(); }
  MAP.img = c; MAP.S = S;
}
function mapIcons() {
  const L = BUILD.landmarks; const out = [];
  if (L.hospital) out.push({ x: L.hospital.x, z: L.hospital.z, t: 'H', c: '#ff4d4d' }); if (L.police) out.push({ x: L.police.x, z: L.police.z, t: '★', c: '#4f9dff' }); if (L.garage) out.push({ x: L.garage.x, z: L.garage.z, t: '🔧', c: '#ffcc33' });
  for (const k in GIVERS) out.push({ x: GIVERS[k].x, z: GIVERS[k].z, t: GIVERS[k].M.icon, c: GIVERS[k].M.col, big: 1 });
  for (const M of MARKS) if (!M.icon) out.push({ x: M.x, z: M.z, t: '', c: M.col, mk: 1 });
  if (MI && MI.blipCar && !MI.blipCar.dead) out.push({ x: MI.blipCar.x, z: MI.blipCar.z, t: '', c: '#ff3040', mk: 1 });
  for (const s of BUILD.shops) { const ic = s.name.startsWith('편의점') ? ['🏪', '#1f8f4a'] : s.name === '총포사' ? ['🔫', '#ff9a3c'] : s.name === '옷가게' ? ['👕', '#ff7ab6'] : null; if (ic && Math.hypot(s.x - PL.x, s.z - PL.z) < 160) out.push({ x: s.x, z: s.z, t: ic[0], c: ic[1], small: 1 }); }
  if (G.waypoint) out.push({ x: G.waypoint[0], z: G.waypoint[1], t: '', c: '#c86bff', mk: 1 }); if (G.deliv && CARS.includes(G.deliv) && PL.car !== G.deliv) out.push({ x: G.deliv.x, z: G.deliv.z, t: '', c: '#3aa0ff', mk: 1 });
  return out;
}
function drawRadar() {
  const c = $('#radar'), g = c.getContext('2d'), W = c.width, H = c.height; if (INSIDE) { g.fillStyle = '#20252c'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = `bold 34px ${FONT}`; g.textAlign = 'center'; g.fillText({ mart: '🏪 편의점 안', jewel: '💎 보석상 안', bank: '🏦 은행 안' }[INSIDE], W / 2, H / 2 + 12); return; } const S = MAP.S; const zoom = PL.car ? 1.05 - clamp(Math.abs(PL.car.v) / 60, 0, .45) : 1.4;
  g.save(); g.fillStyle = '#20252c'; g.fillRect(0, 0, W, H); g.translate(W / 2, H * .62); g.scale(zoom, zoom);
  const fx_ = Math.sin(CAMS.yaw), fz_ = Math.cos(CAMS.yaw); const rot = -Math.PI / 2 - Math.atan2(fz_, fx_); g.rotate(rot);
  g.drawImage(MAP.img, -(PL.x - MAP.minX) * S, -(PL.z - MAP.minZ) * S);
  const toR = (x, z) => [(x - PL.x) * S, (z - PL.z) * S];
  for (const cc of CARS) if (cc.type === 'police' && (cc.chase || G.wanted) && !cc.dead) { const [x, y] = toR(cc.x, cc.z); g.fillStyle = Math.floor(G.t * 4) % 2 ? '#ff3030' : '#3060ff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  for (const n of NPCS) if (n.cop && n.st === 'chase') { const [x, y] = toR(n.x, n.z); g.fillStyle = '#5aa0ff'; g.fillRect(x - 3, y - 3, 6, 6); }
  g.restore();
  // 아이콘 (화면 기준으로 회전 없이)
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  for (const ic of mapIcons()) {
    let x = (ic.x - PL.x) * S * zoom, y = (ic.z - PL.z) * S * zoom; let rx = x * cosr - y * sinr, ry = x * sinr + y * cosr; rx += W / 2; ry += H * .62;
    const edge = rx < 12 || rx > W - 12 || ry < 12 || ry > H - 12; if (edge && (ic.small)) continue; rx = clamp(rx, 12, W - 12); ry = clamp(ry, 12, H - 12);
    if (ic.mk) { g.fillStyle = ic.c; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(rx, ry, edge ? 7 : 9, 0, 7); g.fill(); g.stroke(); continue; }
    g.fillStyle = ic.big ? ic.c : 'rgba(0,0,0,.65)'; g.beginPath(); g.arc(rx, ry, ic.small ? 9 : 13, 0, 7); g.fill(); g.strokeStyle = ic.c; g.lineWidth = 2; g.stroke(); g.fillStyle = ic.big ? '#111' : ic.c; g.font = `bold ${ic.small ? 11 : 15}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ic.t, rx, ry + 1);
  }
  // 나
  g.save(); g.translate(W / 2, H * .62); g.rotate(rot + Math.atan2(Math.cos(PL.yaw), Math.sin(PL.yaw)) + Math.PI / 2); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 5); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `bold 15px ${FONT}`; g.textAlign = 'left'; g.fillText('N', 8, 18);
}
function openMap() {
  if (!G.on) return; const bm = $('#bigMap'); bm.hidden = false; G.paused = true; document.exitPointerLock && document.exitPointerLock(); const c = $('#bigMapC'), g = c.getContext('2d'); const W = c.width, H = c.height;
  const sc = Math.min(W / MAP.img.width, H / MAP.img.height); g.fillStyle = '#111'; g.fillRect(0, 0, W, H); const ox = (W - MAP.img.width * sc) / 2, oy = (H - MAP.img.height * sc) / 2; g.drawImage(MAP.img, ox, oy, MAP.img.width * sc, MAP.img.height * sc);
  const P2 = (x, z) => [ox + (x - MAP.minX) * MAP.S * sc, oy + (z - MAP.minZ) * MAP.S * sc];
  g.font = `22px ${DFONT}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, z] of [[-160, -160], [0, -160], [160, -160], [-160, 0], [0, 0], [160, 0], [-160, 160], [0, 160], [160, 160]]) { const [a, b] = P2(x, z); g.fillText(areaName(x, z), a, b); } { const [a, b] = P2(-150, 300); g.fillText('한 강', a, b); }
  for (const ic of mapIcons()) { const [x, y] = P2(ic.x, ic.z); g.fillStyle = ic.mk || ic.big ? ic.c : 'rgba(0,0,0,.7)'; g.beginPath(); g.arc(x, y, ic.mk ? 9 : 14, 0, 7); g.fill(); g.strokeStyle = ic.c; g.lineWidth = 2; g.stroke(); if (ic.t) { g.fillStyle = ic.big ? '#111' : ic.c; g.font = `bold 15px ${FONT}`; g.textBaseline = 'middle'; g.fillText(ic.t, x, y + 1); } }
  const [px, py] = P2(PL.x, PL.z); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill();
  g.textBaseline = 'alphabetic'; g.font = `bold 16px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('B 박 사장 (미션)  C 치킨 배달  🔧 정비소(수배 지우기)  H 병원  ★ 경찰서  🏪 편의점', 20, H - 20);
}
$('#bigMapX').onclick = () => { $('#bigMap').hidden = true; G.paused = false; };

/* ---------- 메뉴 ---------- */
function menu(html) { $('#mbox').innerHTML = html; $('#menu').hidden = false; }
function closeMenu() { $('#menu').hidden = true; G.paused = false; }
function togglePause() {
  if (!$('#bigMap').hidden) { $('#bigMap').hidden = true; G.paused = false; return; }
  if (!$('#menu').hidden) { closeMenu(); return; }
  G.paused = true; document.exitPointerLock && document.exitPointerLock();
  menu(`<h2>⏸ 일시정지</h2><p>돈 ${won(SV.money)} · 스토리 ${SV.story}/${STORY.length} · 훔친 차 ${SV.stolen}대 · 배달 ${SV.deliveries}번 · 택시 손님 ${SV.fares}명</p>
  <button class="btn y" id="pR">▶ 계속하기</button><button class="btn" id="pM">🗺️ 지도</button>
  <div class="row"><button class="btn d" id="pS">${AU.on ? '🔊 소리 끄기' : '🔇 소리 켜기'}</button><button class="btn d" id="pQ">${QUALITY.low ? '🐢 그래픽: 가볍게' : '✨ 그래픽: 좋게'}</button></div>
  <div class="keys"><b>이동</b><span>WASD · 조이스틱 / Shift 전력질주</span><b>펀치</b><span>클릭 · J · 👊</span><b>차</b><span>F · 🚗 (사람이 탄 차는 끌어내요)</span><b>운전</b><span>W/S 가속·후진 · A/D 핸들 · Space 드리프트</span><b>수배</b><span>경찰에게 안 보이면 별이 줄어요 · 🔧정비소에 가면 바로 지워져요</span></div>
  <button class="btn d" id="pH">🏠 허브로 나가기</button>`);
  $('#pR').onclick = closeMenu; $('#pM').onclick = () => { closeMenu(); openMap(); };
  $('#pS').onclick = () => { AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? .8 : 0; togglePause(); togglePause(); };
  $('#pQ').onclick = () => { QUALITY.low = !QUALITY.low; applyQuality(); togglePause(); togglePause(); };
  $('#pH').onclick = () => { save(); location.href = '../hub/'; };
}
function applyQuality() { ren.setPixelRatio(QUALITY.low ? 1 : Math.min(devicePixelRatio, 1.5)); sun.castShadow = true; sun.shadow.mapSize.set(QUALITY.low ? 1024 : 2048, QUALITY.low ? 1024 : 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } MAXN.peds = QUALITY.low ? 12 : 22; MAXN.traffic = QUALITY.low ? 11 : 18; resize(); }

/* ---------- 메인 루프 ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!G.on) { titleCam(dt, now); return; }
  if (G.paused) { ren.render(scene, cam); return; }
  if (G.hitStop > 0) { G.hitStop -= dt; dt *= .06; }
  G.t += dt; readInput();
  updateDay(dt, new T.Vector3(PL.x, 0, PL.z)); updateEnv(); updateLights(dt);
  if (BUILD.blink) BUILD.blink.visible = Math.floor(G.t * 1.2) % 2 === 0;
  if (WATER) WATER.material.normalMap.offset.set(G.t * .01, G.t * .006);
  // 플레이어
  if (IN.car && !G.dead) { if (PL.car) exitCar(); else if (PL.ko <= 0) { const c = nearestCar(PL.x, PL.z, 3.6); if (c && (Math.abs(c.v) < 6 || nearestCar(PL.x, PL.z, 1.2) === c)) enterCar(c); } }
  if (PL.car) updatePlayerCar(dt); else if (!G.dead || PL.ko > 0) updatePlayerFoot(dt);
  placePlayer(dt); PL.P.root.visible = !PL.car || !!PL.car.S.bike;
  if (!PL.car) { const c = nearestCar(PL.x, PL.z, 2.4); if (c && !G.dead) setPrompt((IS_MOBILE ? '🚗 ' : 'F: ') + (c.ai || c.drvP ? c.S.name + ' 뺏기' : c.S.name + ' 타기')); }
  // 편의점
  PROMPT.act = null; if (!PL.car) for (const s of BUILD.shops) if ((s.name.startsWith('편의점') || s.name === '총포사' || s.name === '옷가게') && Math.hypot(s.x - PL.x, s.z - PL.z) < 2.4) { PROMPT.act = s.name; setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + s.name + ' 들어가기'); break; }
  if (IN.act && PROMPT.act) { if (PROMPT.act === '총포사') gunShop(); else if (PROMPT.act === '옷가게') wardrobe(true); else shopMenu(); }
  if (IN.wsw) { switchWeapon(IN.wsw); IN.wsw = 0; } if (IN.wsel) { selectWeapon(IN.wsel); IN.wsel = null; }
  // 차들
  const people = NPCS.filter(n => n.ko <= 0).map(n => n); people.push(PL);
  for (const c of CARS) {
    if (c === PL.car) placeCar(c);
    else if (c.ai) trafficStep(c, dt, CARS, people);
    else if (c.chase) placeCar(c);
    else if (c.flee) { }
    else if (!c.parked || Math.abs(c.v) > .05) { drive(c, { brk: c.dead ? 0 : .3 }, dt); placeCar(c); }
    if (c.fire > 0) { c.fire -= dt; if (Math.random() < dt * 14) fx(c.fire < 3 ? 'fire' : 'smoke', c.x + rand(-.5, .5), c.y + 1.2, c.z + rand(-.5, .5), { s: rand(.7, 1.3), life: rand(.6, 1.2), vy: 2.2, a: .8 }); if (c.fire <= 0) explodeCar(c); }
    else if (!c.dead && c.hp < c.maxHp * .35 && Math.random() < dt * 4) fx('smoke', c.x, c.y + 1.1, c.z + 0, { s: .6, life: 1.2, vy: 1.6, a: .5 });
    if (c.rider) { const d = Math.abs(c.x - PL.x) + Math.abs(c.z - PL.z); if (d < 70) { c.rider.mixer.update(dt); applyPose(c.rider); } }
  }
  updatePolice(dt);
  for (const c of CARS) { const d = Math.abs(c.x - PL.x) + Math.abs(c.z - PL.z); c.g.visible = d < 260; for (const w of c.wheels) w.piv.visible = d < 90; }
  // 차 충돌
  for (let i = 0; i < CARS.length; i++) { const a = CARS[i]; if (Math.abs(a.x - PL.x) > 120 || Math.abs(a.z - PL.z) > 120) continue; for (let j = i + 1; j < CARS.length; j++) { const b = CARS[j]; if (Math.abs(a.x - b.x) > 12 || Math.abs(a.z - b.z) > 12) continue; const imp = carVsCar(a, b); if (imp > 0) { for (const c of [a, b]) { if (c.ai) { c.ai.stun = 1.5; if (imp > 8 && (a === PL.car || b === PL.car)) { c.ai.stun = 3; } } carHurt(c, imp, c === PL.car); } if (imp > 5 && (a === PL.car || b === PL.car)) { const o = a === PL.car ? b : a; if (o.type === 'police' || o.chase) crime('hitcop', o.x, o.z); if (o.rider && imp > 4) { ejectRider(o, (o.x - PL.x) * .5, (o.z - PL.z) * .5); crime('carhit', o.x, o.z); } } if (PL.car && PL.car.S.bike && (a === PL.car || b === PL.car) && imp > 7) throwOffBike(imp); } } }
  // 차 ↔ 사람
  for (const c of CARS) { const sp = Math.abs(c.v); const f = carFwd(c);
    for (const n of (c === PL.car ? NPCS : NPCS.concat(PL.car ? [] : [PL]))) {
      if (n === PL && G.dead) continue; if (n.dead) continue; const dx = n.x - c.x, dz = n.z - c.z; if (Math.abs(dx) > 7 || Math.abs(dz) > 7) continue; const lz = dx * f[0] + dz * f[1], lx = dx * f[1] - dz * f[0];
      const ex = c.S.W / 2 + .3 - Math.abs(lx), ez = c.S.L / 2 + .3 - Math.abs(lz); if (ex <= 0 || ez <= 0) continue;
      if (sp > 3.2 && (n.ko || 0) <= .3 && !(c.chase && n.cop)) { const vx = f[0] * c.v * .8 + (lx > 0 ? f[1] : -f[1]) * 2, vz = f[1] * c.v * .8 + (lx > 0 ? -f[0] : f[0]) * 2;
        if (n === PL) { knockPlayer(1.6, vx, vz); hurtPlayer(sp * 2); } else { const wasKo = n.ko > 0; npcDamage(n, sp * 5, f[0], f[1], c === PL.car ? 'player' : 'npc', 'car'); if (!n.dead) { knockNPC(n, Math.max(n.ko, 1.3), vx, vz); if (!n.afterKo || n.kos === 0) n.afterKo = n.cop ? 'chase' : n.tough && Math.random() < .5 ? 'fight' : 'flee'; } else n.kv = [vx, vz]; n.threat = [c.x, c.z]; if (c === PL.car) { if (!n.cop) crime('carhit', n.x, n.z); missionEvent('runover', n); } SFX.punch(); for (const o of NPCS) if (o !== n && Math.hypot(o.x - n.x, o.z - n.z) < 18) npcFlee(o, c.x, c.z); } c.v *= c.S.bike ? .6 : .9; if (c === PL.car && c.S.bike && sp > 6) throwOffBike(sp * .6); }
      else { if (c === PL.car && n !== PL && sp > 1 && n.tough && !n.cop && n.st !== 'fight' && n.ko <= 0 && Math.random() < .05) { n.st = 'fight'; n.t = 14; popLabel(n.x, n.y + 2.1, n.z, '야! 조심해!', '#fff', 1.3); }
        if (ex < ez) { const s = Math.sign(lx) || 1; n.x += f[1] * s * ex; n.z += -f[0] * s * ex; } else { const s = Math.sign(lz) || 1; n.x += f[0] * s * ez; n.z += f[1] * s * ez; } }
    }
  }
  // 행인
  for (let i = NPCS.length - 1; i >= 0; i--) { const n = NPCS[i]; if (!NPCS.includes(n)) continue; updateNPC(n, dt); const d = Math.hypot(n.x - PL.x, n.z - PL.z); placeNPC(n, dt, d > 35); setShadow(n.P, d < 28); n.P.root.visible = d < 90; if (n.far !== (d > 18)) { n.far = d > 18; n.P.root.traverse(o => { if (o.isMesh && /Eye/.test(o.name)) o.visible = !n.far; }); } }
  // 사람끼리 밀기
  for (const n of NPCS) { if (n.ko > 0 || n.dead) continue; const dx = n.x - PL.x, dz = n.z - PL.z, d = Math.hypot(dx, dz); if (!PL.car && d < 2.2 && PL.spd < 2 && !n.cop && !n.mission && (n.st === 'walk' || n.st === 'idle') && G.t - (G.greetT || -99) > 20 && Math.random() < .01) { G.greetT = G.t; say(n, 'greet'); } if (!PL.car && d < .65 && PL.spd > 3.5 && Math.random() < .3 && !n.cop && n.st !== 'fight') { say(n, 'bump'); if (n.tough && Math.random() < .15) { n.st = 'fight'; n.t = 12; } } if (!PL.car && d < .65 && d > .01) { const p = (.65 - d) / 2; n.x += dx / d * p; n.z += dz / d * p; PL.x -= dx / d * p; PL.z -= dz / d * p; } }
  if (!PL.car && (IN.mz || IN.mx) && PL.grab > 0 && PL.spd > 3) PL.grab = Math.max(0, PL.grab - dt * 1.5);
  if (PL.grab > 0 && !NPCS.some(n => n.cop && n.ko <= 0 && !n.dead && Math.hypot(n.x - PL.x, n.z - PL.z) < 1.6)) PL.grab = Math.max(0, PL.grab - dt);
  if (PL.grab > 0) setPrompt('👮 체포당하는 중! 펀치하거나 달려서 벗어나요');
  if (PL.car && Math.abs(PL.car.v) > 8) { const c = PL.car, f = carFwd(c); for (const n of NPCS) { if (n.dead || n.ko > 0 || n.cop) continue; const dx = n.x - c.x, dz = n.z - c.z; if (Math.abs(dx) > 9 || Math.abs(dz) > 9) continue; const lz = dx * f[0] + dz * f[1], lx = Math.abs(dx * f[1] - dz * f[0]); if (lz > 0 && lz < 7 && lx < c.S.W / 2 + 1.8 && lx > c.S.W / 2 + .2 && Math.random() < .2) { say(n, 'carnear'); npcFlee(n, c.x, c.z, 2); } } }
  for (const n of NPCS) if (n.st === 'idle' && n.P.pose === 'phone' && Math.random() < dt * .08 && Math.hypot(n.x - PL.x, n.z - PL.z) < 14) say(n, 'phone');
  chatTick(dt);
  updateWanted(dt); spawnPedestrians(dt); updatePicks(dt); updateGarage(); updateMission(dt); fxUpdate(dt); updateShots(dt); G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - dt); $('#hurt').style.opacity = Math.max(G.hurtFlash * 1.4, PL.hp < 25 ? .35 + Math.sin(G.t * 6) * .15 : 0);
  for (const M of MARKS) { M.ar.position.y = 3 + Math.sin(G.t * 3) * .3; M.ar.rotation.y += dt * 2; }
  // 체력 회복
  PL.dmgT += dt; if (PL.dmgT > 6 && PL.hp < 60 && PL.hp > 0) PL.hp = Math.min(60, PL.hp + dt * 2);
  updateCamera(dt); updateHUD(dt); G.rf = (G.rf || 0) + 1; if (G.rf % 2 === 0) drawRadar();
  // 소리
  if (AU.ctx) { engineUpdate(!!PL.car && !PL.car.dead, PL.car ? PL.car.v : 0, PL.car ? PL.car.S.max : 40); radioTick(!!PL.car && AU.on); bgmDuck(!!PL.car && !STATIONS[AU.radio.st].off); AU.amb.gain.value = .03 + DAY.night * .0; }
  IN.punch = IN.jump = IN.car = IN.act = IN.horn = false; if (!IN.fireHeldTouch && !IN.mouseL) IN.fireHeld = false;
  if ((G.saveT = (G.saveT || 0) + dt) > 10) { G.saveT = 0; save(); }
  ren.render(scene, cam);
}
/* 타이틀 화면 카메라 */
function titleCam(dt, now) { const t = now / 1000 * .05; updateDay(dt * .2, new T.Vector3(0, 0, 0)); updateEnv(); updateLights(dt); cam.position.set(Math.cos(t) * 170, 70, Math.sin(t) * 170 + 40); cam.lookAt(0, 25, 0); ren.render(scene, cam); }

/* ---------- 시작 ---------- */
async function boot() {
  const ld = (t, p) => { $('#ldT').textContent = t; $('#ldB').style.width = p + '%'; };
  ld('글꼴을 불러오는 중…', 5);
  try { await Promise.race([Promise.all([document.fonts.load(`40px "Black Han Sans"`, '서울'), document.fonts.load(`700 20px "Pretendard Variable"`, '서울')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  ld('서울을 짓는 중…', 15); await new Promise(r => setTimeout(r, 30));
  genCity(); buildInteriors(); ld('사람들을 부르는 중…', 55); DAY.t = 16.5; updateDay(0, new T.Vector3()); updateEnv();
  try { await loadChars(); } catch (e) { ld('캐릭터를 불러오지 못했어요. 새로고침해 주세요.', 60); console.error(e); return; }
  ld('차를 세우는 중…', 85); spawnParked(); buildMapImg();
  const L = BUILD.landmarks; addPickup('health', L.hospital.x + 4, L.hospital.z - 1, 60); addPickup('armor', L.police.x + 4, L.police.z - 1, 120); if (L.park) addPickup('health', L.park.x, L.park.z, 60);
  spawnPlayer(); const g = L.garage; playerPos(g.x - 5, g.z + 11, Math.PI);
  for (let i = 0; i < MAXN.peds; i++) { const s = sidewalkNear(PL.x, PL.z, 6, 80); if (s) { const n = spawnNPC(s[0], s[1], 'ped'); n.bi = s[2]; n.bj = s[3]; n.k = s[4] + 1; n.tgt = ringCorner(n.bi, n.bj, n.k); } }
  for (let i = 0; i < MAXN.traffic; i++) { const p = laneNear(PL.x, PL.z, 10, 160); if (p) { const r = Math.random(); const type = r < .15 ? 'taxi' : r < .25 ? 'suv' : r < .32 ? 'truck' : r < .38 ? 'bus' : 'sedan'; const c = makeCar(type, type === 'bus' ? 'blue' : null); laneSpawn(c, p.x, p.z, p.f, p.li); c.drvLook = randomLook(Math.random() < .3); c.drvP = true; scene.add(c.g); CARS.push(c); placeCar(c); } }
  ld('준비 완료!', 100); setTimeout(() => { $('#loading').hidden = true; showTitle(); }, 250);
  requestAnimationFrame(frame);
}
function showTitle() {
  $('#title').hidden = false; const b = $('#titleBtns');
  b.innerHTML = (hadSave ? `<button class="btn y" id="tCont">▶ 이어하기 <small style="font-weight:600">· ${won(SV.money)} · 스토리 ${SV.story}/${STORY.length}</small></button><button class="btn d" id="tNew">새로 시작</button>` : `<button class="btn y" id="tNew">▶ 게임 시작</button>`) + `<button class="btn d" id="tKeys">🎮 조작법</button>`;
  const go = () => { auInit(); $('#title').hidden = true; $('#hud').hidden = false; if (IS_MOBILE) $('#touch').hidden = false; G.on = true; setupGivers(); hudStars(); refreshGun(); voxPreload(); for (const v of VOX.male.concat(VOX.female)) voxLoad(voxFile(v)); bgmStart(); _mShown = SV.money; $('#money').textContent = won(SV.money); CAMS.pos.set(PL.x, 30, PL.z + 30);
    setTimeout(() => toast(SV.story < STORY.length ? '🏙️ STA 1에 온 걸 환영해요!<br>노란 <b>B</b>(박 사장)에게 가거나, <b>📱 휴대폰</b>(Tab)으로 전화하면 일을 줘요.' : '🏙️ 다시 서울이에요! 📱 휴대폰으로 알바를 찾아봐요.', 6000), 600);
    if (!IS_MOBILE) { G.help = true; setTimeout(() => G.help = false, 25000); } };
  if ($('#tCont')) $('#tCont').onclick = go;
  $('#tNew').onclick = () => { if (hadSave && !confirmNew()) return; SV = Object.assign(loadSave(), { money: 30000, story: 0, stolen: 0, deliveries: 0, fares: 0, busted: 0, wasted: 0, best: {} }); save(); go(); };
  $('#tKeys').onclick = () => { menu(`<h2>🎮 조작법</h2><div class="keys"><b>PC 이동</b><span>WASD · Shift 전력질주 · Space 점프</span><b>둘러보기</b><span>화면 클릭 후 마우스</span><b>펀치</b><span>마우스 클릭 · J</span><b>차</b><span>F 타기·내리기 (운전자가 있으면 끌어내요)</span><b>운전</b><span>W 가속 · S 브레이크/후진 · A/D 핸들 · Space 드리프트 · H 경적 · R 라디오</span><b>기타</b><span>M 지도 · C 카메라 · E 편의점 · T 택시 알바 · Esc 일시정지</span><b>폰</b><span>왼쪽 조이스틱 · 오른쪽 화면 드래그로 둘러보기 · 버튼</span></div><p>👮 나쁜 짓을 하면 별(수배)이 생겨요. 경찰 눈에 안 띄면 별이 줄고, 🔧 정비소에 차를 넣으면 바로 지워져요.</p><button class="btn y" id="mClose">닫기</button>`); $('#mClose').onclick = () => $('#menu').hidden = true; };
}
function confirmNew() { return window.confirm('저장된 게임을 지우고 새로 시작할까요?'); }
boot();
window.__sc = { G, PL, NPCS, CARS, SV, STORY, get MI() { return MI; }, enterCar, exitCar, setWanted, spawnNPC, BUILD };
