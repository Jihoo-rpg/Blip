'use strict';
/* ===== 조작 · 카메라 · 화면 · 리플레이 · 소리 · 메뉴 ===== */
/* ---------- 입력 ---------- */
const KEY = {}; const INP = [{ x: 0, z: 0, sp: false, acts: [], hold: {} }, { x: 0, z: 0, sp: false, acts: [], hold: {} }];
const KB = { pass: ['Space', 'KeyJ'], shoot: ['KeyF', 'KeyK'], through: ['KeyE', 'KeyL'], sw: ['KeyQ'] }; const HOLDK = ['pass', 'shoot', 'through', 'lob'];
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (KEY[e.code]) return; KEY[e.code] = true;
  for (const a in KB) if (KB[a].includes(e.code)) { pushAct(a === 'sw' ? a : a + 'Down'); e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') UI.shiftT = performance.now();
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause(); if (e.code === 'KeyC') cycleCam(); if ((e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter') && M.phase === 'replay') REPLAY.skip = true; if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') && M.phase === 'intro') skipIntro();
});
addEventListener('keyup', e => { KEY[e.code] = false; for (const a in KB) if (a !== 'sw' && KB[a].includes(e.code)) pushAct(a + 'Up');
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && UI.shiftT && performance.now() - UI.shiftT < 220) pushAct('skill'); }); // Shift 톡 = 개인기
addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; });
function pushAct(a) {
  if (!M.on || UI.paused || M.phase === 'intro') return; const now = performance.now(), H = INP[0].hold; let dur;
  const m = /^(pass|shoot|through|lob)(Down|Up)$/.exec(a); if (m) { if (m[2] === 'Down') H[m[1]] = now; else { dur = H[m[1]] ? (now - H[m[1]]) / 1000 : 0; H[m[1]] = 0; } }
  if (NET.role === 'guest') { NET.acts.push({ i: ++NET.actId, a, dur }); return; }
  INP[0].acts.push({ a, t: now, dur });
}
function holdInfo(I) { let t = 0, k = ''; const now = performance.now(); for (const q of HOLDK) if (I.hold[q]) { const d = (now - I.hold[q]) / 1000; if (d > t) { t = d; k = q; } } return [clamp(t / 1.0, 0, 1), k]; }
const STICK = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
function readLocal() {
  let ix = 0, iy = 0; if (KEY.KeyA || KEY.ArrowLeft) ix -= 1; if (KEY.KeyD || KEY.ArrowRight) ix += 1; if (KEY.KeyW || KEY.ArrowUp) iy += 1; if (KEY.KeyS || KEY.ArrowDown) iy -= 1;
  if (STICK.on) { ix = STICK.x; iy = -STICK.y; } const L = Math.hypot(ix, iy); if (L > 1) { ix /= L; iy /= L; }
  // 화면 방향 → 경기장 방향
  const f = new T.Vector3(); cam.getWorldDirection(f); f.y = 0; f.normalize(); const r = new T.Vector3(-f.z, 0, f.x);
  const I = INP[0]; I.x = r.x * ix + f.x * iy; I.z = r.z * ix + f.z * iy; I.sp = !!(KEY.ShiftLeft || KEY.ShiftRight || TOUCHB.sprint); I.mag = Math.min(1, Math.hypot(ix, iy));
}
/* 터치 */
const TOUCHB = { sprint: false };
function setupTouch() {
  const tz = $('#tzone'), knob = $('#knob'), base = $('#kbase');
  tz.addEventListener('pointerdown', e => { STICK.on = true; STICK.id = e.pointerId; STICK.ox = e.clientX; STICK.oy = e.clientY; STICK.x = STICK.y = 0; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on'); document.body.classList.add('stk'); knob.style.transform = 'translate(-50%,-50%)'; tz.setPointerCapture(e.pointerId); });
  tz.addEventListener('pointermove', e => { if (!STICK.on || e.pointerId !== STICK.id) return; const dx = e.clientX - STICK.ox, dy = e.clientY - STICK.oy, L = Math.hypot(dx, dy), R = 52; const k = L > R ? R / L : 1; STICK.x = dx * k / R; STICK.y = dy * k / R; knob.style.transform = `translate(calc(-50% + ${dx * k}px),calc(-50% + ${dy * k}px))`; });
  const end = e => { if (e.pointerId !== STICK.id) return; STICK.on = false; STICK.x = STICK.y = 0; base.classList.remove('on'); document.body.classList.remove('stk'); }; tz.addEventListener('pointerup', end); tz.addEventListener('pointercancel', end);
  const bind = (id, down, up) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('dn'); down(); b.setPointerCapture(e.pointerId); }); const u = e => { b.classList.remove('dn'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); };
  bind('#bShoot', () => pushAct('shootDown'), () => pushAct('shootUp')); bind('#bPass', () => pushAct('passDown'), () => pushAct('passUp')); bind('#bThru', () => pushAct('throughDown'), () => pushAct('throughUp')); bind('#bLob', () => pushAct('lobDown'), () => pushAct('lobUp'));
  bind('#bSprint', () => { TOUCHB.sprint = true; TOUCHB.t = performance.now(); }, () => { TOUCHB.sprint = false; if (performance.now() - TOUCHB.t < 220) pushAct('skill'); }); bind('#bSwitch', () => pushAct('sw'));
}
/* ---------- 사람이 조작 ---------- */
function dirTarget(p, vx, vz, anyMate, pw) {
  let L = Math.hypot(vx, vz); if (L < .3) { vx = Math.sin(p.yaw); vz = Math.cos(p.yaw); L = 1; } vx /= L; vz /= L; let best = null, bs = -1e9;
  for (const m of team(p.team)) { if (m === p) continue; const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz) || 1; const c = (dx * vx + dz * vz) / d; if (c < .45) continue; const s = c * 3 - (pw == null || pw < .2 ? d * .035 : Math.abs(d - (8 + pw * 36)) * .06) - (m.role === 'GK' ? 2 : 0); if (s > bs) { bs = s; best = m; } }
  return best || (anyMate ? bestPassTarget(p, true) : null);
}
function humanAct(p, a, v, pow, h) {
  const I = INP[h]; const own = ball.owner === p; const sp = M.sp; const isTaker = (M.phase === 'set' && sp && sp.taker === p) || (M.phase === 'kickoff' && M.koTaker === p);
  if (a === 'sw') { if (!own && !isTaker) switchPlayer(h); return; }
  if (a === 'skill') { if (own && !ball.held && M.phase === 'play') doSkill(p, I.x, I.z); return; }
  // 키를 누를 때(Down) · 뗄 때(Up): 공을 찰 땐 떼는 순간, 누른 시간만큼 세게 (FIFA처럼)
  const up = /Up$/.test(a), down = /Down$/.test(a), base = a.replace(/Down$|Up$/, ''); pow = clamp(pow || 0, 0, 1);
  if (isTaker) {
    if (!up) return;
    if (M.phase === 'kickoff') { if (M.koPrep || base === 'shoot') return; doPass(p, dirTarget(p, I.x, I.z, false, pow) || M.koMate, 'ground', pow); return; }
    if (!sp.ready || sp.pend || sp.done) return; // 아직 공을 놓는 중이에요
    const run = f => { sp.done = true; setPend(sp, f); };
    if (sp.type === 'throw') { const m = dirTarget(p, I.x, I.z, true, pow); if (m) run(() => throwIn(p, m.x, m.z, pow)); return; }
    if (sp.type === 'corner') { if (base === 'pass') { const m = dirTarget(p, I.x, I.z, true, pow); run(() => doPass(p, m, 'ground', pow)); } else { const az = clamp(I.z * 8, -7, 7), far = 4 + pow * 10; run(() => { const gx = goalX(p.team); const [vx, vy, vz] = passVel(p, gx - M.dir[p.team] * far, az, 'cross'); p.act = 'cross'; p.actT = 0; kickBall(p, vx, vy, vz, -Math.sign(sp.z) * Math.sign(sp.x) * 1.5); }); } return; }
    if (base === 'shoot' && (sp.type === 'pen' || sp.type === 'free')) { const aim = Math.abs(I.z) > .25 ? clamp(I.z * 1.4, -1, 1) : 0; run(() => doShoot(p, Math.max(.15, pow), aim)); return; }
    if (base !== 'shoot') { const m = dirTarget(p, I.x, I.z, true, pow); const k = base === 'pass' ? (dist(p, m) > 30 ? 'long' : 'ground') : base === 'lob' ? 'long' : 'through'; run(() => doPass(p, m, k, pow)); }
    return;
  }
  if (M.phase !== 'play') return;
  if (own) {
    if (ball.held || !up) return; const gx = goalX(p.team);
    if (base === 'pass') { const m = dirTarget(p, I.x, I.z, true, pow); if (!m) return; if (Math.abs(gx - p.x) < 26 && Math.abs(p.z) > 15 && Math.abs(gx - m.x) < 19 && Math.abs(m.z) < 18) doCross(p, m, clamp(m.z, -6, 6), pow); else doPass(p, m, dist(p, m) > 32 ? 'long' : 'ground', pow); }
    else if (base === 'through') { const m = dirTarget(p, I.x, I.z, true, pow); if (m) doPass(p, m, 'through', pow); }
    else if (base === 'lob') { if (Math.abs(gx - p.x) < 25 && Math.abs(p.z) > 14) doCross(p, null, clamp(I.z * 6, -6, 6), pow); else { const m = dirTarget(p, I.x, I.z, true, pow); if (m) doPass(p, m, 'long', pow); } }
    else if (base === 'shoot') doShoot(p, Math.max(.12, pow), Math.abs(I.z) > .25 ? clamp(I.z * 1.3, -1, 1) : null);
    return;
  }
  // 공이 거의 왔으면 받자마자 차기 (원터치): 떼는 순간 예약
  const near = !ball.owner && Math.hypot(ball.x - p.x, ball.z - p.z) < 4 && (ball.passTo === p || Math.hypot(ball.vx, ball.vz) < 14);
  if (near) { if (up) p.queued = { a, t: M.t, pow: base === 'shoot' ? Math.max(pow, .55) : pow, h }; return; }
  // 수비: 누르는 순간 바로
  if (!down) return;
  if (base === 'pass') tryTackle(p, false);
  else if (base === 'shoot') { if (ball.owner && ball.owner.team !== p.team) p.yaw = Math.atan2(ball.owner.x - p.x, ball.owner.z - p.z); tryTackle(p, true); }
  else if (base === 'through' || base === 'lob') switchPlayer(h);
}
function autoReceive(p, I, mag) {
  if (ball.owner || ball.y > 2.4) return null; const coming = ball.passTo === p; const d = Math.hypot(ball.x - p.x, ball.z - p.z); const bs = Math.hypot(ball.vx, ball.vz);
  if (!coming && !(d < 4.5 && bs < 16)) return null;
  // 공이 언제 어디로 오는지 계산해서 그 자리로
  let best = null; for (let t = .1; t <= 2; t += .1) { const pr = predictBall(t); const need = Math.hypot(pr[0] - p.x, pr[1] - p.z) / maxSpd(p, true); if (need <= t + .05) { best = pr; break; } } if (!best) best = predictBall(.4);
  if (mag > .15) { const dx = best[0] - p.x, dz = best[1] - p.z, L = Math.hypot(dx, dz) || 1; if ((I.x * dx + I.z * dz) / (L * mag) < -.35) return null; } // 일부러 반대로 가면 놔둬요
  return best;
}
function switchPlayer(h) {
  const tm = M.human[h], cur = M.ctrl[h]; const pr = predictBall(.3); const L = team(tm).filter(p => p !== cur && p.role !== 'GK').sort((a, b) => Math.hypot(a.x - pr[0], a.z - pr[1]) - Math.hypot(b.x - pr[0], b.z - pr[1]));
  if (L[0]) { M.ctrl[h] = L[0]; L[0].swT = M.t; sfx('tick'); }
}
function humanTick(dt, setMode) {
  for (let h = 0; h < 2; h++) {
    const tm = M.human[h]; if (tm < 0) continue; const I = INP[h]; let p = M.ctrl[h];
    if (!p || p.team !== tm) p = M.ctrl[h] = closestTo(team(tm).filter(q => q.role !== 'GK'), ball.x, ball.z);
    const acts = I.acts.splice(0); [p.charge, p.chargeK] = holdInfo(I);
    for (const A of acts) { const pow = A.dur != null ? clamp(A.dur / 1.0, 0, 1) : 0; humanAct(p, A.a, null, pow, h); }
    p = M.ctrl[h];
    if (setMode) { const sp = M.sp; if ((sp && sp.taker === p) || (M.phase === 'kickoff' && M.koTaker === p)) { if (Math.hypot(I.x, I.z) > .3 && sp && sp.type !== 'throw') { p.aim = Math.atan2(I.x, I.z); } } continue; }
    if (p.stun > 0 || p.act === 'slide' || p.skill || (p.role === 'GK' && ball.held)) continue;
    const mag = Math.hypot(I.x, I.z);
    // 알아서 받기: 나한테 오는 패스 · 바로 옆 굴러오는 공은 몸이 먼저 공 쪽으로 가요 (반대로 세게 밀면 그 방향으로)
    const rcv = autoReceive(p, I, mag); if (rcv) steer(p, rcv[0], rcv[1], maxSpd(p, true), dt);
    else if (mag > .15) { const s = maxSpd(p, I.sp) * Math.min(1, mag * 1.15); accel(p, I.x / mag * s, I.z / mag * s, dt); }
    else if (p.pressT > 0 && ball.owner && ball.owner.team !== tm) { p.pressT -= dt; const o = ball.owner; steer(p, o.x + o.vx * .25, o.z + o.vz * .25, maxSpd(p, true), dt); }
    else if (ball.passTo === p && !ball.owner) { const pr = predictBall(.3); steer(p, pr[0], pr[1], maxSpd(p, true), dt); }
    else if (!ball.owner && Math.hypot(ball.x - p.x, ball.z - p.z) < 6 && ball.y < 1.2) { const pr = predictBall(.2); steer(p, pr[0], pr[1], maxSpd(p, false), dt); }
    else accel(p, 0, 0, dt);
    // 자동 전환: 수비할 때 다른 선수가 훨씬 가까우면
    const o = ball.owner; if ((!o || o.team !== tm) && ball.passTo !== p && (M.t - (p.swT || 0)) > 1.2 && mag < .15) { const pr = predictBall(.4); const myD = Math.hypot(p.x - pr[0], p.z - pr[1]); const c = closestTo(team(tm).filter(q => q.role !== 'GK'), pr[0], pr[1]); if (c && c !== p && myD - Math.hypot(c.x - pr[0], c.z - pr[1]) > 7) { M.ctrl[h] = c; c.swT = M.t; } }
    if (ball.passTo && ball.passTo.team === tm && ball.passTo !== p && !ball.owner) { M.ctrl[h] = ball.passTo; }
  }
}
/* ---------- 카메라 ---------- */
const CAM = { mode: SAVE.cam || 0, tx: 0, tz: 0, shake: 0, look: new T.Vector3(), want: new T.Vector3(), wl: new T.Vector3(), orb: 0, names: ['📺 중계', '🎮 뒤에서', '🛰️ 위에서'] };
function cycleCam() { CAM.mode = (CAM.mode + 1) % 3; SAVE.cam = CAM.mode; persist(); toast('카메라: ' + CAM.names[CAM.mode]); }
function shake(s) { CAM.shake = Math.max(CAM.shake, s); }
function camTick(dt) {
  if (M.phase === 'replay') return replayCam(dt);
  const port = cam.aspect < 1; let fov = port ? 58 : 40, speed = 3;
  if (UI.screen === 'menu') { // 메뉴: 대표 선수 앞으로
    const hx = -9, hz = PL.hz - .4; if (port) { CAM.want.set(hx + .5, 1.05, hz + 5.2); CAM.wl.set(hx - .45, .3, hz); fov = 52; } else { CAM.want.set(hx + 1.2, 1.3, hz + 4.6); CAM.wl.set(hx + 1.85, 1.22, hz); fov = 38; } speed = 2.5; if (CAM.flyT > 0) { CAM.flyT -= dt; speed = 1.3; }
  } else if (UI.screen === 'pick' || UI.screen === 'club' || M.phase === 'menu') { const t = performance.now() / 1000 * .05; CAM.want.set(Math.cos(t) * 46, 16, Math.sin(t) * 28); CAM.wl.set(ball.x * .4, 1, ball.z * .4); speed = 1.5; }
  else {
    if (M.phase === 'intro') return introCam(dt, port);
    // 초점: 공 + 내가 조작하는 선수 (선수를 바꾸면 카메라가 자연스럽게 따라가요)
    const c = M.human[0] >= 0 ? M.ctrl[0] : null; let fx = ball.x, fz = ball.z; if (c && Math.hypot(c.x - ball.x, c.z - ball.z) < 24 && M.phase === 'play') { fx = lerp(ball.x, c.x, .3); fz = lerp(ball.z, c.z, .3); }
    const sp = M.sp; if (M.phase === 'set' && sp && sp.taker && sp.type !== 'throw') { fx = lerp(sp.taker.x, sp.x, .5); fz = lerp(sp.taker.z, sp.z, .5); }
    const k = Math.min(1, dt * 2.6); CAM.tx = lerp(CAM.tx, fx, k); CAM.tz = lerp(CAM.tz, fz, k);
    const near = clamp((Math.abs(CAM.tx) - 28) / 22, 0, 1); // 골문 가까이 가면 살짝 당겨요
    const mob = IS_MOBILE && !port;
    if (CAM.mode === 0 && mob) { CAM.want.set(clamp(CAM.tx * .9, -PL.hx + 7, PL.hx - 7), 14.5 - near * 2.5, CAM.tz * .28 + 26 - near * 4); CAM.wl.set(CAM.tx * .97, 0, CAM.tz * .66 - 1); fov = 42; }
    else if (CAM.mode === 0) { if (port) CAM.want.set(clamp(CAM.tx * .88, -PL.hx + 8, PL.hx - 8), 42 - near * 6, CAM.tz * .2 + 30 - near * 4), CAM.wl.set(CAM.tx * .96, 0, CAM.tz * .6 - 6); else CAM.want.set(clamp(CAM.tx * .88, -PL.hx + 8, PL.hx - 8), 20 - near * 3, CAM.tz * .25 + 37 - near * 5), CAM.wl.set(CAM.tx * .96, 0, CAM.tz * .62 - 2); }
    else if (CAM.mode === 1) { const d = M.human[0] >= 0 ? M.dir[M.human[0]] : 1; const cx = c ? lerp(c.x, CAM.tx, .5) : CAM.tx, cz = c ? lerp(c.z, CAM.tz, .5) : CAM.tz; CAM.want.set(cx - d * (port ? 22 : 17), port ? 16 : 11, cz * .9); CAM.wl.set(cx + d * 12, 0, cz * .95); }
    else { CAM.want.set(CAM.tx * .95, port ? 85 : 62, CAM.tz * .5 + (port ? 6 : 12)); CAM.wl.set(CAM.tx, 0, CAM.tz * .55); }
    // 세트피스: 차는 선수 뒤에서 (코너킥 · 프리킥 · 페널티킥)
    if (M.phase === 'set' && sp && sp.ux != null && !sp.prep && (sp.type === 'corner' || sp.type === 'free' || sp.type === 'pen')) { const back = sp.type === 'pen' ? 6.5 : sp.type === 'corner' ? 6.5 : 9, up = sp.type === 'pen' ? 2.1 : sp.type === 'corner' ? 3 : 3.2, ahead = sp.type === 'pen' ? 8 : sp.type === 'corner' ? 7 : 10; CAM.want.set(sp.x - sp.ux * back, up, sp.z - sp.uz * back); CAM.wl.set(sp.x + sp.ux * ahead, .6, sp.z + sp.uz * ahead); fov = port ? 62 : 46; speed = 2; }
    // 골: 넣은 선수를 가까이 빙 돌며 보여 줘요
    if (M.phase === 'goal' && M.celeBy && M.phT > .7) { const p = M.celeBy; CAM.orb += dt * .45; const a = CAM.orb + (p.team ? Math.PI : 0); CAM.want.set(p.x + Math.sin(a) * 6.5, 2.2, p.z + Math.cos(a) * 6.5 + 1); CAM.wl.set(p.x, 1.2, p.z); fov = port ? 55 : 38; speed = 2.2; }
    else CAM.orb = 0;
    // 하프타임 · 경기 끝: 높이 올라가요
    if (M.phase === 'half' || M.phase === 'over') { CAM.want.set(0, 34, 58); CAM.wl.set(0, 0, 0); speed = .8; }
  }
  if (CAM.snap) { CAM.snap = 0; cam.position.copy(CAM.want); CAM.look.copy(CAM.wl); cam.fov = fov; cam.updateProjectionMatrix(); }
  const kk = 1 - Math.exp(-dt * speed); cam.position.lerp(CAM.want, kk); CAM.look.lerp(CAM.wl, kk);
  if (CAM.shake > 0) { CAM.shake -= dt; cam.position.x += (Math.random() - .5) * CAM.shake; cam.position.y += (Math.random() - .5) * CAM.shake; }
  cam.lookAt(CAM.look); if (Math.abs(cam.fov - fov) > .05) { cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 3)); cam.updateProjectionMatrix(); }
  const S = STAD.sun; if (S) { S.position.set(CAM.tx - 30, 70, CAM.tz + 40); S.target.position.set(CAM.tx, 0, CAM.tz); }
}
/* ---------- 경기 인트로 ---------- */
function introCam(dt, port) {
  const t = M.phT; let speed = 3, fov = port ? 60 : 42;
  if (t < 3.2) { const a = -.9 + t * .32; CAM.want.set(Math.sin(a) * 44, 30 - t * 5, Math.cos(a) * 30); CAM.wl.set(0, 0, 3); speed = 4; }               // 경기장 위를 돌며 날아와요
  else if (t < 7.6) { const k = (t - 3.2) / 4.4, x = lerp(-13.6, 13.6, k); CAM.want.set(x, 1.55, port ? 12.5 : 10.4); CAM.wl.set(x + (port ? 0 : .4), 1.3, 7); fov = port ? 46 : 32; speed = t < 3.5 ? 30 : 6; } // 선수들 얼굴을 지나가요
  else { CAM.want.set(0, 26, 46); CAM.wl.set(0, 0, 0); speed = 1.4; }
  if (CAM.snap) { CAM.snap = 0; cam.position.copy(CAM.want); CAM.look.copy(CAM.wl); }
  const kk = 1 - Math.exp(-dt * speed); cam.position.lerp(CAM.want, kk); CAM.look.lerp(CAM.wl, kk); cam.lookAt(CAM.look);
  if (Math.abs(cam.fov - fov) > .05) { cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 4)); cam.updateProjectionMatrix(); }
}
const ovrOf = d => d.o || Math.round((d.st.spd + d.st.sht + d.st.pas + d.st.drb + d.st.def) / 5 * .55 + Math.max(d.st.spd, d.st.sht, d.st.pas, d.st.def, d.st.gk) * .45);
function introFill() {
  const tm = ti => { const T_ = ti ? M.t1 : M.t0, L = team(ti); const o = Math.round(L.reduce((a, p) => a + ovrOf(p.d), 0) / L.length); return `<div class="inTm"><i style="background:linear-gradient(135deg,${M.kits[ti][0]} 55%,${M.kits[ti][1]} 55%)">${T_.f}</i><b>${esc(T_.n)}</b><em>OVR ${o}</em></div>`; };
  $('#inTitle').innerHTML = `<div class="inT">${tm(0)}<div class="inVs">VS</div>${tm(1)}</div><p>${M.mode === 'club' ? '나만의 구단 리그' : '국가대표 친선 경기'} · 블립 스타디움</p>`;
  $('#intro').hidden = false; $('#inTitle').className = ''; $('#inName').className = ''; UI.inName = null;
}
function introTick() {
  const el = $('#intro'); document.body.classList.toggle('intro', M.phase === 'intro' && UI.screen === 'game'); if (M.phase !== 'intro') { if (!el.hidden) el.hidden = true; return; }
  const t = M.phT; $('#inTitle').className = t > .3 && t < 3.1 ? 'on' : '';
  let pl = null; if (t > 3.4 && t < 7.5) { const x = cam.position.x; pl = M.players.reduce((b, p) => Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b, M.players[0]); }
  if (pl !== UI.inName) { UI.inName = pl; const n = $('#inName'); if (pl) { const T_ = pl.team ? M.t1 : M.t0; n.innerHTML = `<b style="background:${M.kits[pl.team][0]};color:${colDist(M.kits[pl.team][0], '#ffffff') < .6 ? '#111' : '#fff'}">${pl.d.num}</b><div><span>${esc(pl.d.name)}</span><small>${ROLE_NAMES[pl.role]} · ${T_.f} ${esc(T_.n)}</small></div><em>${ovrOf(pl.d)}</em>`; n.className = 'on'; } else n.className = ''; }
}
function skipIntro() { if (M.phase === 'intro') M.introSkip = true; }
/* ---------- 모바일: 경기는 가로로 ---------- */
function mobileLandscape() {
  if (!IS_MOBILE) return; try { const d = document.documentElement; const lock = () => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(lock).catch(() => { }); else lock(); } catch (e) { }
}
function rotTick() {
  const need = IS_MOBILE && UI.screen === 'game' && innerHeight > innerWidth * 1.05 && !SAVE.portraitOK; const el = $('#rotLock');
  if (el.hidden === need) el.hidden = !need; UI.rotWait = need && !NET.role;
}
/* ---------- 리플레이 ---------- */
const REC = { frames: [], acc: 0, push() { this.acc += 1 / 60; const f = { b: [ball.x, ball.y, ball.z], p: M.players.map(p => [p.x, p.z, p.yaw, Math.hypot(p.vx, p.vz), p.act, p.actT, p.diveSide || 1, p.diveH || .6, p.celeKind || 0]) }; this.frames.push(f); if (this.frames.length > 60 * 7) this.frames.shift(); } };
const REPLAY = { on: false, i: 0, frames: null, done: null, skip: false, cam: 0 };
function startReplay(done) {
  REPLAY.frames = REC.frames.slice(-60 * 6.5); REPLAY.i = 0; REPLAY.done = done; REPLAY.skip = false; REPLAY.cam = Math.random() < .5 ? 0 : 1; M.phase = 'replay'; M.phT = 0; $('#replay').hidden = false; REC.frames = [];
}
function replayTick(dt) {
  const F = REPLAY.frames; REPLAY.i += dt * 60 * .55; const i = Math.floor(REPLAY.i);
  if (i >= F.length - 1 || REPLAY.skip) { $('#replay').hidden = true; M.phase = 'x'; REPLAY.done(); return; }
  const a = F[i], b = F[i + 1], k = REPLAY.i - i;
  ball.x = lerp(a.b[0], b.b[0], k); ball.y = lerp(a.b[1], b.b[1], k); ball.z = lerp(a.b[2], b.b[2], k);
  M.players.forEach((p, j) => { const A = a.p[j], B = b.p[j]; p.x = lerp(A[0], B[0], k); p.z = lerp(A[1], B[1], k); p.yaw = A[2] + angDiff(A[2], B[2]) * k; const sp = A[3]; p.vx = Math.sin(p.yaw) * sp; p.vz = Math.cos(p.yaw) * sp; p.act = A[4]; p.actT = A[5]; p.diveSide = A[6]; p.diveH = A[7]; p.celeKind = A[8]; animPlayer(p, dt * .55); p.vx = p.vz = 0; });
}
function replayCam(dt) {
  const s = Math.sign(ball.x) || 1; let px, py, pz;
  if (REPLAY.cam === 0) { px = s * (PL.hx + 9); py = 4.5; pz = ball.z * .5 + 9; } else { px = ball.x - s * 9; py = 3; pz = ball.z + 10; }
  cam.position.lerp(new T.Vector3(px, py, pz), Math.min(1, dt * 3)); CAM.look.set(ball.x, ball.y * .5 + .8, ball.z); cam.lookAt(CAM.look); if (cam.fov !== 45) { cam.fov = 45; cam.updateProjectionMatrix(); }
}
/* ---------- 소리 (직접 만든 소리) ---------- */
const AU = { ctx: null, crowd: null, cg: null, ex: 0 };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = AU.ctx; AU.master = c.createGain(); AU.master.gain.value = SAVE.mute ? 0 : .8; AU.master.connect(c.destination);
  const len = c.sampleRate * 4, buf = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let l = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.5 + w * .04; } }
  AU.noise = buf; const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .5; AU.cg = c.createGain(); AU.cg.gain.value = .0; src.connect(f).connect(AU.cg).connect(AU.master); src.start(); AU.cf = f;
}
function env(g, t, a, p, r) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + r); }
function sfx(k, v, delay) {
  const c = AU.ctx; if (!c || M.mode === 'demo' && k !== 'goal') return; const t = c.currentTime + (delay || 0); v = v == null ? 1 : v;
  if (NET.role === 'host' && k) NET.ev.push({ k: 's', n: k, v });
  const o = (type, f0, f1, dur, vol, at) => { const os = c.createOscillator(), g = c.createGain(); os.type = type; os.frequency.setValueAtTime(f0, at || t); if (f1) os.frequency.exponentialRampToValueAtTime(f1, (at || t) + dur); env(g, at || t, .005, vol, dur); os.connect(g).connect(AU.master); os.start(at || t); os.stop((at || t) + dur + .05); };
  const n = (dur, fq, q, vol, at, type) => { const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = fq; f.Q.value = q; const g = c.createGain(); env(g, at || t, .01, vol, dur); s.connect(f).connect(g).connect(AU.master); s.start(at || t, Math.random() * 2); s.stop((at || t) + dur + .1); };
  if (k === 'kick') { o('sine', 140, 45, .14, .55 * v + .15); n(.05, 1800, 1, .25 * v); }
  else if (k === 'bounce') o('sine', 110, 60, .08, .2 * v);
  else if (k === 'whistle') { for (let i = 0; i < 2; i++) { const os = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); os.frequency.value = 2900 + i * 180; lfo.frequency.value = 28; lg.gain.value = 120; lfo.connect(lg).connect(os.frequency); env(g, t, .01, .09, .32 * v + .15); os.connect(g).connect(AU.master); os.start(t); lfo.start(t); os.stop(t + .6); lfo.stop(t + .6); } }
  else if (k === 'post') { o('triangle', 880, 0, .7, .25); o('sine', 1320, 0, .5, .15); }
  else if (k === 'save' || k === 'catch') { n(.12, 400, 1, .5); o('sine', 160, 80, .1, .3); AU.ex = 1; }
  else if (k === 'tackle') { n(.15, 300, .8, .4); }
  else if (k === 'tick') o('sine', 1200, 0, .05, .08);
  else if (k === 'goal') { n(3.6, 900, .4, .9, t, 'bandpass'); n(3, 2200, .6, .35); for (const [f, d] of [[392, 0], [523, .15], [659, .3]]) o('sawtooth', f, 0, .7, .06, t + d + .2); AU.ex = 3; }
  else if (k === 'ooh') { n(1.2, 600, .7, .4); AU.ex = 1.4; }
}
function audioTick(dt) {
  if (!AU.cg) return; let tgt = .1; if (M.on && (M.phase === 'play' || M.phase === 'set')) { const d = Math.min(Math.abs(ball.x - PL.hx), Math.abs(ball.x + PL.hx)); tgt = .12 + clamp((30 - d) / 30, 0, 1) * .14; }
  AU.ex = Math.max(0, AU.ex - dt * .6); tgt += AU.ex * .15; if (UI.screen !== 'game') tgt = .07; AU.cg.gain.value = lerp(AU.cg.gain.value, tgt, Math.min(1, dt * 3)); AU.cf.frequency.value = 600 + AU.ex * 250;
}
function vibrate(p) { try { if (navigator.vibrate && IS_MOBILE) navigator.vibrate(p); } catch (e) { } }
/* ---------- 화면 (HUD) ---------- */
const UI = { screen: 'menu', paused: false, bannerT: 0 };
function banner(t, s, col, dur, mini) { const b = $('#banner'); b.classList.toggle('mini', !!mini); b.innerHTML = `<b style="${col ? `color:${col}` : ''}">${esc(t)}</b>${s ? `<span>${esc(s)}</span>` : ''}`; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(UI.bannerT); UI.bannerT = setTimeout(() => b.classList.remove('on'), (dur || 1.4) * 1000); if (NET.role === 'host') NET.ev.push({ k: 'b', t, s, c: col, d: dur, m: mini ? 1 : 0 }); }
function comm(t) { const c = $('#comm'); c.textContent = '🎙️ ' + t; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); clearTimeout(comm.t); comm.t = setTimeout(() => c.classList.remove('on'), 2600); if (NET.role === 'host') NET.ev.push({ k: 'c', t }); }
function clockStr() { const m = Math.floor(M.clock / 60), s = Math.floor(M.clock % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
const radar = { c: null, g: null };
function hudTick() {
  rotTick(); if (UI.screen !== 'game') { if (!$('#intro').hidden) { $('#intro').hidden = true; document.body.classList.remove('intro'); } return; } introTick();
  $('#sc0').textContent = M.score[0]; $('#sc1').textContent = M.score[1]; $('#clk').textContent = clockStr() + (M.half === 2 ? '' : ''); $('#half').textContent = M.half === 1 ? '전반' : '후반';
  const h = M.human[0] >= 0 ? 0 : -1; const p = h >= 0 ? M.ctrl[h] : null;
  const tag = $('#ptag'); if (p) { tag.hidden = false; if (UI.tagP !== p) { UI.tagP = p; const pd = p.d.pid != null ? PDB[p.d.pid] : null; const o = ovrOf(p.d); const r = pd ? pd.r : o >= 88 ? 'W' : o >= 80 ? 'G' : o >= 72 ? 'S' : 'B';
      tag.innerHTML = `<div class="mc r${r}"><div class="fr"></div><div class="in">${pd ? `<img alt="">` : ''}<em>${o}</em></div></div><div class="mt"><b>${p.d.num}</b><span>${esc(p.d.name)}</span><small>${ROLE_NAMES[p.role]}</small></div>`; if (pd) portrait(pd, u => { const im = tag.querySelector('img'); if (im && UI.tagP === p) im.src = u; }); } } else { tag.hidden = true; UI.tagP = null; }
  const pw = $('#power'); const canKick = p && (ball.owner === p || (M.sp && M.sp.taker === p) || (M.phase === 'kickoff' && M.koTaker === p) || (!ball.owner && Math.hypot(ball.x - p.x, ball.z - p.z) < 4)); const [hc, hk] = canKick ? holdInfo(INP[0]) : [0, '']; const ch = hc > .04 ? hc : 0; pw.hidden = !ch;
  if (ch) { $('#powerF').style.width = (ch * 100) + '%'; const L = { pass: '패스 세기', shoot: '슛 세기', through: '스루패스 세기', lob: '크로스 세기' }[hk]; if (pw.dataset.k !== L) { pw.dataset.k = L; pw.dataset.l = L; } }
  // 버튼 이름: 공 있을 때 / 수비할 때
  if (IS_MOBILE) { const own = p && (ball.owner === p || (M.sp && M.sp.taker === p) || (M.phase === 'kickoff' && M.koTaker === p)); const set = (id, a, b) => { const el = $(id); const t = own ? a : b; if (el.dataset.t !== t) { el.dataset.t = t; el.querySelector('b').textContent = t; } }; set('#bPass', '패스', '태클'); set('#bShoot', '슛', '슬라이딩'); set('#bThru', '스루', '전환'); $('#bLob').hidden = !own; }
  // 내 선수 표시
  for (let k = 0; k < 2; k++) { const r = UI.rings[k]; const c = M.human[k] >= 0 ? M.ctrl[k] : null; r.visible = !!c && M.phase !== 'replay' && (k === 0 || !!NET.role); if (c) { r.position.set(c.x, .03, c.z); r.rotation.y = c.yaw; } }
  // 레이더 (세트피스 카메라일 땐 흐리게)
  { const sp = M.sp, fade = M.phase === 'set' && sp && !sp.prep && /corner|free|pen/.test(sp.type); if (radar.fade !== fade) { radar.fade = fade; radar.c.style.opacity = fade ? .3 : ''; } }
  const g = radar.g, W = radar.c.width, H = radar.c.height; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(20,60,30,.72)'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.strokeRect(1, 1, W - 2, H - 2); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, H * .13, 0, 7); g.stroke();
  g.strokeRect(1, H * .2, W * .157, H * .6); g.strokeRect(W - 1 - W * .157, H * .2, W * .157, H * .6);
  const X = x => (x / PL.L + .5) * W, Z = z => (z / PL.W + .5) * H;
  for (const q of M.players) { g.fillStyle = q.team === 0 ? M.kits[0][0] : M.kits[1][0]; g.strokeStyle = '#000'; g.beginPath(); g.arc(X(q.x), Z(q.z), q === M.ctrl[0] && M.human[0] >= 0 ? 4.5 : 3, 0, 7); g.fill(); g.stroke(); if (q === M.ctrl[0] && M.human[0] >= 0) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1; } }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(X(ball.x), Z(ball.z), 2.5, 0, 7); g.fill();
  // 세트피스 안내
  const hint = $('#hint'); let ht = ''; const me = M.human[0];
  if (me >= 0 && M.phase === 'set' && M.sp && M.sp.team === me && M.sp.taker === M.ctrl[0] && (M.sp.ready || NET.role === 'guest') && !M.sp.pend && !M.sp.done) ht = { throw: IS_MOBILE ? '방향을 정하고 패스(꾹 = 멀리) → 스로인' : '방향 + Space(꾹 = 멀리) → 스로인', goalkick: IS_MOBILE ? '패스 꾹 눌렀다 떼기: 골킥 세기' : 'Space 꾹 눌렀다 떼기: 골킥 세기', corner: IS_MOBILE ? '슛 꾹→떼기: 크로스(길게 누를수록 멀리) · 패스: 짧게' : 'F 꾹→떼기: 크로스(오래 = 멀리) · Space: 짧은 패스', free: IS_MOBILE ? '슛 꾹 눌렀다 떼기: 프리킥 슛 · 패스' : 'F 꾹 눌렀다 떼기: 슛 · Space: 패스', pen: IS_MOBILE ? '방향(위·아래)을 정하고 슛 꾹 → 떼기' : '방향(W·S)을 정하고 F 꾹 → 떼기' }[M.sp.type];
  if (me >= 0 && M.phase === 'kickoff' && M.koTeam === me && !M.koPrep) ht = IS_MOBILE ? '패스 버튼으로 킥오프' : 'Space(스페이스바)로 킥오프';
  if (hint.textContent !== ht) { hint.textContent = ht; hint.hidden = !ht; }
  if (performance.now() - (UI.sbT || 0) > 1000) { UI.sbT = performance.now(); drawBoard(M.t0, M.t1, M.score, `${clockStr()} ${M.half === 1 ? '전반' : '후반'}`); }
}
/* ---------- 메뉴 ---------- */
const PICK = { t0: SAVE.t0 || 'KOR', t1: SAVE.t1 || 'JPN', f0: SAVE.f0 || '4-3-3', diff: SAVE.diff == null ? 1 : SAVE.diff, len: SAVE.len || 6, side: 0 };
function show(id) { for (const s of ['#menu', '#pick', '#hud', '#pause', '#result', '#onl', '#club', '#create']) $(s).hidden = true; if (id) $(id).hidden = false; UI.screen = id === '#hud' ? 'game' : id === '#pick' ? 'pick' : id === '#menu' ? 'menu' : id === '#club' ? 'club' : UI.screen; $('#touch').hidden = !(IS_MOBILE && id === '#hud'); if (id === '#menu') { renderMenu(); renderRecord(); CAM.snap = 1; } }
function renderPick() {
  const cur = PICK.side === 0 ? PICK.t0 : PICK.t1;
  $('#pickTabs').innerHTML = [0, 1].map(s => { const t = TEAM(s ? PICK.t1 : PICK.t0); return `<button class="ptab ${PICK.side === s ? 'on' : ''}" data-side="${s}"><small>${s ? '상대 팀' : '내 팀'}</small><span>${t.f} ${t.n}</span><em>${teamRating(t)}</em></button>`; }).join('<div class="vs">VS</div>');
  $('#teams').innerHTML = TEAMS.map(t => `<button class="tcard ${t.id === cur ? 'on' : ''} ${(PICK.side ? PICK.t0 : PICK.t1) === t.id ? 'other' : ''}" data-tid="${t.id}"><span class="fl">${t.f}</span><b>${t.n}</b><em>${teamRating(t)}</em><i style="background:linear-gradient(90deg,${t.home[0]} 50%,${t.home[1]} 50%)"></i></button>`).join('');
  $('#forms').innerHTML = Object.keys(FORMS).map(f => `<button class="chip ${PICK.f0 === f ? 'on' : ''}" data-form="${f}">${f}</button>`).join('');
  $('#diffs').innerHTML = DIFF.map((d, i) => `<button class="chip ${PICK.diff === i ? 'on' : ''}" data-diff="${i}">${d.n}</button>`).join('');
  $('#lens').innerHTML = [4, 6, 10].map(l => `<button class="chip ${PICK.len === l ? 'on' : ''}" data-len="${l}">${l}분</button>`).join('');
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-side],[data-tid],[data-form],[data-diff],[data-len]'); if (!t) return; sfx('tick');
  if (t.dataset.side) PICK.side = +t.dataset.side; else if (t.dataset.tid) { const o = PICK.side ? PICK.t0 : PICK.t1; if (t.dataset.tid === o) return; PICK[PICK.side ? 't1' : 't0'] = t.dataset.tid; if (PICK.side === 0) PICK.side = 1; } else if (t.dataset.form) PICK.f0 = t.dataset.form; else if (t.dataset.diff) PICK.diff = +t.dataset.diff; else if (t.dataset.len) PICK.len = +t.dataset.len;
  Object.assign(SAVE, { t0: PICK.t0, t1: PICK.t1, f0: PICK.f0, diff: PICK.diff, len: PICK.len }); persist(); renderPick();
});
function startGame(o) {
  auInit(); show('#hud'); UI.paused = false; $('#result').hidden = true;
  setupMatch(Object.assign({ t0: PICK.t0, t1: PICK.t1, f0: PICK.f0, f1: pick(Object.keys(FORMS)), diff: PICK.diff, len: PICK.len, mode: 'ai', human: [0, -1] }, o || {}));
  $('#n0').textContent = M.t0.id; $('#n1').textContent = M.t1.id; $('#f0').textContent = M.t0.f; $('#f1').textContent = M.t1.f; $('#k0').style.background = M.kits[0][0]; $('#k1').style.background = M.kits[1][0];
  CAM.tx = 0; CAM.tz = 0; cam.position.set(0, 30, 60); CAM.look.set(0, 0, 0); mobileLandscape();
  if (M.mode === 'ai' || M.mode === 'club') { startIntro(); CAM.snap = 1; introFill(); }
  else { banner('킥오프!', `${M.t0.n} vs ${M.t1.n}`, null, 1.8, true); comm(`${M.t0.n}와 ${M.t1.n}의 경기, 시작합니다!`); }
  if (window.BLIP) BLIP.setGame('soccer');
}
function startDemo() { setupMatch({ t0: pick(TEAMS).id, t1: 'BRA', diff: 2, len: 30, mode: 'demo', human: [-1, -1] }); if (M.t0 === M.t1) M.t1 = TEAM('ARG'); }
function togglePause() { if (UI.screen !== 'game' || NET.role) { if (NET.role && UI.screen === 'game') $('#pause').hidden = !$('#pause').hidden; return; } UI.paused = !UI.paused; $('#pause').hidden = !UI.paused; }
function showResult() {
  if (UI.screen !== 'game') return; const S = M.stats, tot = S.pos[0] + S.pos[1] || 1; const me = M.human[0] >= 0 ? M.human[0] : 0;
  const w = M.score[0] === M.score[1] ? -1 : M.score[0] > M.score[1] ? 0 : 1; const res = w < 0 ? '무승부' : w === me ? '승리!' : '패배';
  const mvp = M.players.slice().sort((a, b) => (b.rating + b.touches * .02 + (b.team === w ? .5 : 0)) - (a.rating + a.touches * .02 + (a.team === w ? .5 : 0)))[0];
  const row = (n, a, b, pct) => { const s = a + b || 1; return `<div class="srow"><b>${pct ? Math.round(a / s * 100) + '%' : a}</b><div class="sbar"><i style="width:${a / s * 100}%;background:${M.kits[0][0]}"></i><i style="width:${b / s * 100}%;background:${M.kits[1][0]}"></i></div><b>${pct ? Math.round(b / s * 100) + '%' : b}</b><span>${n}</span></div>`; };
  $('#rTitle').textContent = res; $('#rTitle').className = w === me ? 'win' : w < 0 ? 'draw' : 'lose';
  $('#rScore').innerHTML = `<span>${M.t0.f} ${esc(M.t0.n)}</span><b>${M.score[0]} : ${M.score[1]}</b><span>${esc(M.t1.n)} ${M.t1.f}</span>`;
  $('#rGoals').innerHTML = [0, 1].map(t => `<div>${M.scorers.filter(s => s.team === t).map(s => `⚽ ${esc(s.name)} ${s.min}'`).join('<br>') || '&nbsp;'}</div>`).join('');
  $('#rStats').innerHTML = row('점유율', S.pos[0], S.pos[1], true) + row('슈팅', S.sh[0], S.sh[1]) + row('유효 슈팅', S.ot[0], S.ot[1]) + row('패스 성공', S.pc[0], S.pc[1]) + row('태클', S.tk[0], S.tk[1]) + row('코너킥', S.co[0], S.co[1]) + row('파울', S.fo[0], S.fo[1]);
  $('#rMvp').innerHTML = `🏅 경기 최우수 선수 <b>${mvp.d.num} ${esc(mvp.d.name)}</b> <small>${M[mvp.team ? 't1' : 't0'].f} · ${mvp.goals ? mvp.goals + '골' : ROLE_NAMES[mvp.role]}</small>`;
  if (M.mode === 'ai') { SAVE.rec = SAVE.rec || { w: 0, d: 0, l: 0 }; SAVE.rec[w < 0 ? 'd' : w === me ? 'w' : 'l']++; persist(); }
  $('#rReward').innerHTML = M.mode === 'club' ? clubReward(w < 0 ? 'd' : w === me ? 'w' : 'l', M.score[me]) : ''; $('#rReward').hidden = M.mode !== 'club';
  $('#rAgain').hidden = M.mode === 'online' && NET.role === 'guest'; $('#result').hidden = false;
}
function quitToMenu() { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { } const wasClub = M.mode === 'club'; if (NET.role) netLeave(); UI.paused = false; $('#result').hidden = true; startDemo(); if (wasClub) openClub(); else show('#menu'); renderRecord(); if (window.BLIP) BLIP.setGame('soccer'); }
function renderRecord() { const r = SAVE.rec; $('#rec').textContent = r ? `내 전적 ${r.w}승 ${r.d}무 ${r.l}패` : ''; }
/* ---------- 시작 ---------- */
function setupUI() {
  radar.c = $('#radar'); radar.g = radar.c.getContext('2d');
  UI.rings = [0, 1].map(k => { const w = new T.Group(); const m = new T.MeshBasicMaterial({ color: k ? '#ff4d5e' : '#22d3ee', transparent: true, opacity: .9, depthWrite: false }); const r = new T.Mesh(new T.RingGeometry(.55, .7, 32), m); r.rotation.x = -Math.PI / 2; w.add(r); const ar = new T.Mesh(new T.ConeGeometry(.2, .45, 3), m); ar.rotation.x = Math.PI / 2; ar.position.set(0, .03, .95); w.add(ar); w.visible = false; scene.add(w); return w; });
  $('#bPlay').onclick = () => { auInit(); show('#pick'); renderPick(); };
  $('#bClub').onclick = () => { auInit(); const c = club(); if (!c) return openCreate(); if (c.xi.filter(x => x != null).length < 11) { CL.tab = 'squad'; return openClub(); } startClubMatch(nextOpp(c)); }; $('#clBack').onclick = () => { show('#menu'); }; $$('#clTabs [data-ctab]').forEach(b => b.onclick = () => { sfx('tick'); clubTab(b.dataset.ctab); });
  $('#bKick').onclick = () => startGame();
  $('#bBackPick').onclick = () => show('#menu');
  $('#bOnline').onclick = () => { auInit(); openOnline(); };
  $('#bResume').onclick = () => togglePause(); $('#bQuit').onclick = () => quitToMenu();
  $('#bRestart').onclick = () => { UI.paused = false; if (M.mode === 'club') return startClubMatch(CL.vs); startGame(); };
  $('#rAgain').onclick = () => { if (M.mode === 'online') return netRematch(); if (M.mode === 'club') return startClubMatch(CL.vs); startGame(); }; $('#rMenu').onclick = () => quitToMenu();
  $('#intro').onclick = () => skipIntro(); $('#rlOk').onclick = () => { SAVE.portraitOK = 1; persist(); $('#rotLock').hidden = true; }; $('#rlTry').onclick = () => mobileLandscape();
  $('#bCam').onclick = () => cycleCam(); $('#bPause').onclick = () => togglePause(); $('#bSkip').onclick = () => REPLAY.skip = true;
  $('#bMute').onclick = () => { SAVE.mute = !SAVE.mute; persist(); if (AU.master) AU.master.gain.value = SAVE.mute ? 0 : .8; $('#bMute').textContent = SAVE.mute ? '🔇' : '🔊'; }; $('#bMute').textContent = SAVE.mute ? '🔇' : '🔊';
  $('#keys').hidden = IS_MOBILE || !!SAVE.keysHide; $('#keys').style.pointerEvents = 'auto'; $('#keysX').onclick = () => { SAVE.keysHide = 1; persist(); $('#keys').hidden = true; }; setupTouch(); renderRecord();
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (UI.screen === 'game' || M.mode === 'demo') readLocal();
  if (!UI.paused && !UI.rotWait) {
    if (UI.screen === 'menu' && M.mode === 'demo' && NET.role !== 'guest') { for (const p of M.players) animPlayer(p, dt); } // 메뉴에서는 경기를 멈춰 둬요
    else if (NET.role === 'guest') guestTick(dt);
    else if (M.phase === 'replay') replayTick(dt);
    else { const steps = dt > .025 ? 2 : 1; for (let i = 0; i < steps; i++) matchTick(dt / steps); }
    if (M.mode === 'demo' && M.phase === 'over') startDemo();
    if (NET.role === 'host') hostSend();
  }
  syncBallMesh(dt); heroTick(dt, UI.screen === 'menu'); camTick(dt); stadiumTick(dt, t); hudTick(); audioTick(dt); ren.render(scene, cam);
}
async function boot() {
  buildStadium(); buildBall(); setupUI();
  try { await loadChars(); } catch (e) { $('#load').innerHTML = '선수 모델을 못 불러왔어요 😢<br><small>새로고침해 보세요</small>'; return; }
  startDemo(); show('#menu'); CAM.snap = 0; cam.position.set(30, 60, 110); CAM.look.set(0, 0, 0); CAM.flyT = 3; $('#splash').classList.add('on'); setTimeout(() => $('#splash').classList.add('out'), 1900); setTimeout(() => $('#splash').remove(), 2700); $('#mMute').textContent = SAVE.mute ? '🔇' : '🔊'; $('#load').classList.add('gone'); setTimeout(() => $('#load').remove(), 700);
  requestAnimationFrame(loop);
  const fol = new URLSearchParams(location.search).get('room'); if (fol) { auInit(); openOnline(fol); }
}
