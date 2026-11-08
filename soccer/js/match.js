'use strict';
/* ===== 경기: 공 물리 · 규칙(골 · 스로인 · 코너킥 · 골킥 · 프리킥 · 페널티) · 선수 움직임 · AI ===== */
const G = 9.81;
const M = { on: false, players: [], score: [0, 0], half: 1, clock: 0, phase: 'menu', phT: 0, dir: [1, -1], sp: null, stats: null, events: [], human: [0, -1], ctrl: [null, null], diff: 1, len: 6, mode: 'ai', t: 0, poss: [0, 0], lastShotT: -9, scorers: [] };
const ball = { x: 0, y: PL.br, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, spin: 0, mesh: null, shadow: null, shot: null, holdT: 0, rot: new T.Quaternion(), passTo: null, passT: 0, kickBy: null, kickT: 0 };
const DIFF = [{ n: '쉬움', react: .45, tk: -.12, gk: -.1, think: .6, err: 1.5 }, { n: '보통', react: .28, tk: 0, gk: 0, think: .38, err: 1 }, { n: '어려움', react: .14, tk: .1, gk: .08, think: .2, err: .6 }, { n: '월드클래스', react: .08, tk: .16, gk: .14, think: .12, err: .4 }];
function buildBall() {
  const tx = ctex(512, 256, (g, W, H) => { g.fillStyle = '#f7f7f7'; g.fillRect(0, 0, W, H); g.fillStyle = '#141414'; for (let i = 0; i < 12; i++) { const x = (i % 6) * W / 6 + (i > 5 ? W / 12 : 0), y = i > 5 ? H * .72 : H * .28; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 22); } g.fill(); } g.fillStyle = '#ff4d5e'; g.fillRect(0, H / 2 - 4, W, 8); });
  ball.mesh = new T.Mesh(new T.SphereGeometry(PL.br, 24, 16), new T.MeshStandardMaterial({ map: tx, roughness: .35 })); ball.mesh.castShadow = true; scene.add(ball.mesh);
  ball.shadow = new T.Mesh(new T.CircleGeometry(.16, 16), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false })); ball.shadow.rotation.x = -Math.PI / 2; scene.add(ball.shadow);
}
/* ---------- 선수 만들기 ---------- */
function setupMatch(o) {
  for (const p of M.players) { scene.remove(p.P.root); if (p.P.blob) scene.remove(p.P.blob); } M.players = [];
  M.t0 = o.T0 || TEAM(o.t0); M.t1 = o.T1 || TEAM(o.t1); M.form = [o.f0 || '4-3-3', o.f1 || '4-3-3']; M.diff = o.diff == null ? 1 : o.diff; M.len = o.len || 6; M.mode = o.mode || 'ai'; M.human = o.human || [0, -1];
  const [k0, k1] = pickKits(M.t0, M.t1); const gkk = [['#1fbf5a', '#141414', '#1fbf5a', '#0b3a1a'], ['#ffd400', '#141414', '#ffd400', '#141414']]; if (colDist(gkk[0][0], k1[0]) < .5) gkk[0] = ['#ff7a00', '#141414', '#ff7a00', '#141414'];
  M.kits = [Object.assign(k0.slice(), { gk: gkk[0] }), Object.assign(k1.slice(), { gk: gkk[1] })];
  [M.t0, M.t1].forEach((t, ti) => roster(t, M.form[ti]).forEach(d => {
    const P = makeFootballer(d, M.kits[ti], t.num, d.role === 'GK'); scene.add(P.root);
    const blob = new T.Mesh(SHADOW_GEO, SHADOW_MAT); blob.rotation.x = -Math.PI / 2; blob.position.y = .015; blob.renderOrder = 1; P.blob = blob; scene.add(blob);
    M.players.push({ team: ti, d, P, role: d.role, st: d.st, x: 0, z: 0, vx: 0, vz: 0, yaw: 0, act: null, actT: 0, foot: 'Right', stun: 0, tkCd: 0, kCd: 0, think: Math.random() * .3, tx: 0, tz: 0, run: null, goals: 0, rating: 6, touches: 0 });
  }));
  M.score = [0, 0]; M.half = 1; M.clock = 0; M.dir = [1, -1]; M.stats = { sh: [0, 0], ot: [0, 0], pa: [0, 0], pc: [0, 0], tk: [0, 0], fo: [0, 0], co: [0, 0], pos: [0, 0] }; M.scorers = []; M.ctrl = [null, null]; M.on = true; M.t = 0;
  REC.frames = []; kickoff(0);
}
const team = ti => M.players.filter(p => p.team === ti);
const gkOf = ti => M.players.find(p => p.team === ti && p.role === 'GK');
const goalX = ti => M.dir[ti] * PL.hx;                 // ti팀이 공격하는 골의 x
const ownGoalX = ti => -M.dir[ti] * PL.hx;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const fx = (p, x) => x * M.dir[p.team] / PL.hx;        // 팀 기준 앞쪽 비율
function homeXZ(p, ballX, ballZ, att) {
  const d = p.d; let f = d.fx, z = d.fz; const bf = clamp(ballX * M.dir[p.team] / PL.hx, -1, 1);
  if (p.role !== 'GK') {
    f += clamp(bf, -.7, .85) * (p.role === 'DF' ? .5 : p.role === 'MF' ? .55 : .45) + (att ? (p.role === 'FW' ? .3 : p.role === 'MF' ? .2 : .1) : -.06);
    f = clamp(f, p.role === 'DF' ? -.9 : -.8, p.role === 'DF' ? .35 : p.role === 'MF' ? .7 : .86);
    z = z * (att ? .92 : .72) + clamp(ballZ / PL.hz, -1, 1) * (att ? .15 : .3);
  }
  return [f * PL.hx * M.dir[p.team] * .96, clamp(z, -1, 1) * PL.hz * .86];
}
/* ---------- 경기 시작 · 재개 ---------- */
function kickoff(ti, walk) {
  M.phase = 'kickoff'; M.phT = 0; M.koTeam = ti; M.koPrep = !!walk; ball.owner = null; ball.last = null; ball.shot = null; ball.passTo = null; ball.inNet = 0; resetBall(0, 0);
  const lk = walk === 2 ? .25 : .55; const goTo = (p, x, z) => { p.kx = x; p.kz = z; if (walk) { p.x = lerp(p.x, x, lk); p.z = lerp(p.z, z, lk); p.vx = p.vz = 0; p.act = null; p.stun = 0; } else place(p, x, z); p.yaw = M.dir[p.team] > 0 ? Math.PI / 2 : -Math.PI / 2; };
  for (const p of M.players) { let [x, z] = homeXZ(p, 0, 0, false); x = M.dir[p.team] < 0 ? Math.max(x, 1.2) : Math.min(x, -1.2); if (p.role === 'FW' && Math.abs(p.d.fz) < .1) x = M.dir[p.team] * -.4; if (p.team !== ti) { const r = Math.hypot(x, z); if (r < 9.6) { x *= 9.6 / r; z *= 9.6 / r; } } goTo(p, x, z); }
  const t = team(ti); const a = t.filter(p => p.role === 'FW').sort((a, b) => Math.abs(a.d.fz) - Math.abs(b.d.fz))[0] || t[9]; const b = t.filter(p => p !== a && p.role !== 'GK').sort((q, r) => Math.abs(q.d.fz) + Math.abs(q.d.fx) - Math.abs(r.d.fz) - Math.abs(r.d.fx))[0];
  goTo(a, -M.dir[ti] * .35, 0); goTo(b, -M.dir[ti] * 1.2, 4); M.koTaker = a; M.koMate = b; M.ctrl[ti] = M.human[0] === ti || M.human[1] === ti ? a : M.ctrl[ti];
  for (let h = 0; h < 2; h++) if (M.human[h] >= 0) { const tm = M.human[h]; if (tm === ti) M.ctrl[h] = a; else M.ctrl[h] = closestTo(team(tm).filter(p => p.role !== 'GK'), 0, 0); }
  if (!walk) sfx('whistle');
}
/* ---------- 경기 인트로: 하프라인에 두 팀이 나란히 서요 ---------- */
function startIntro() {
  M.phase = 'intro'; M.phT = 0; M.introSkip = false; ball.owner = null; resetBall(0, 0); M.ctrl = [null, null];
  for (const ti of [0, 1]) team(ti).forEach((p, i) => { place(p, (ti ? 1 : -1) * (1.3 + i * 1.1), 7); p.yaw = 0; p.act = null; });
  if (AU.ctx) AU.ex = 2.5;
}
function place(p, x, z) { p.x = x; p.z = z; p.vx = p.vz = 0; p.act = null; p.stun = 0; }
function resetBall(x, z, y) { ball.inNet = 0; ball.x = x; ball.z = z; ball.y = y || PL.br; ball.vx = ball.vy = ball.vz = 0; ball.spin = 0; }
function closestTo(list, x, z) { let b = null, bd = 1e9; for (const p of list) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = p; } } return b; }
function startSet(type, ti, x, z) {
  M.phase = 'set'; M.phT = 0; M.sp = { type, team: ti, x, z, taker: null, done: false }; ball.owner = null; ball.shot = null; ball.passTo = null;
  resetBall(x, z); const t = team(ti);
  let tk; if (type === 'goalkick') tk = gkOf(ti); else if (type === 'pen') tk = t.filter(p => p.role === 'FW').sort((a, b) => b.st.sht - a.st.sht)[0] || t[10]; else tk = closestTo(t.filter(p => p.role !== 'GK'), x, z);
  M.sp.taker = tk; Object.assign(M.sp, takerSpot(type, ti, x, z)); M.sp.placeT = 0; M.sp.prep = true;
  // 차는 선수가 공까지 걸어가요 (너무 멀면 조금 당겨 줘요)
  tk.stun = 0; tk.act = null; tk.vx = tk.vz = 0; const dd = Math.hypot(M.sp.sx - tk.x, M.sp.sz - tk.z); if (dd > 11) { const k = 1 - 11 / dd; tk.x = lerp(tk.x, M.sp.sx, k); tk.z = lerp(tk.z, M.sp.sz, k); }
  for (let h = 0; h < 2; h++) { const tm = M.human[h]; if (tm < 0) continue; if (tm === ti && type !== 'goalkick') M.ctrl[h] = tk; else if (tm !== ti) M.ctrl[h] = closestTo(team(tm).filter(p => p.role !== 'GK'), x, z); }
  for (const p of M.players) if (p !== tk) { p.stun = 0; p.act = null; const [hx, hz] = setSpot(p, type, ti, x, z); p.tx = hx; p.tz = hz; if (type === 'pen' || type === 'corner' || type === 'goalkick') { p.x = lerp(p.x, hx, .45); p.z = lerp(p.z, hz, .45); } }
  if (type === 'free' || type === 'pen') sfx('whistle', .6);
}
const SETN = { throw: '스로인', corner: '코너킥', goalkick: '골킥', free: '프리킥', pen: '페널티킥!' };
function takerSpot(type, ti, x, z) { // 공 뒤 도움닫기 자리
  const gx = goalX(ti); let ax, az, back = 2.2;
  if (type === 'throw') return { sx: x, sz: z + Math.sign(z) * .3, yaw: Math.atan2(M.dir[ti] * .45, -Math.sign(z)), ux: 0, uz: -Math.sign(z) };
  if (type === 'corner') { ax = gx - M.dir[ti] * 7; az = 0; back = 1.9; } else if (type === 'goalkick') { ax = 0; az = z * .3; } else if (type === 'pen') { ax = gx; az = 0; back = 2.6; } else { const d = Math.hypot(gx - x, z); ax = d < 35 ? gx : x + M.dir[ti] * 20; az = d < 35 ? 0 : z * .7; }
  const dx = ax - x, dz = az - z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d; return { sx: x - ux * back, sz: z - uz * back, yaw: Math.atan2(ux, uz), ux, uz, ax, az };
}
// 공이 나갔어요: 바로 시작하지 않고 잠깐 멈춰요 (공은 굴러가고, 선수들은 속도를 줄여요)
function outOfPlay(type, ti, x, z) { M.phase = 'out'; M.phT = 0; M.outNext = [type, ti, x, z]; ball.shot = null; ball.passTo = null; ball.owner = null; if (type !== 'throw') sfx('whistle', .5); banner(SETN[type], M[ti ? 't1' : 't0'].n, type === 'pen' ? '#ff4d5e' : null, 1.6, true); if (type === 'corner') { M.stats.co[ti]++; comm(pick(['코너킥이에요!', '코너킥 기회!'])); } }
function setSpot(p, type, ti, x, z) {
  const att = p.team === ti; const gx = goalX(ti), s = Math.sign(gx);
  if (type === 'pen') { if (p.role === 'GK' && !att) return [gx, 0]; const i = M.players.indexOf(p) % 11; return [gx - s * (18 + (i % 3) * 2), -14 + i * 2.6]; }
  if (type === 'corner') { if (p.role === 'GK') return att ? homeXZ(p, gx * .4, 0, true) : [gx - s * .6, 0]; const i = p.d.i; if (att) { if (p.role === 'DF' && i % 2 === 0) return [gx * .1, (i - 2) * 6]; return [gx - s * (5 + (i % 4) * 2.5), -6 + (i % 5) * 3]; } else { if (p.role === 'FW' && i === 9) return [gx * .3, 0]; return [gx - s * (3 + (i % 4) * 2), -7 + (i % 6) * 2.8]; } }
  return homeXZ(p, x, z, att);
}
/* ---------- 공 차기 ---------- */
function kickBall(p, vx, vy, vz, spin) {
  ball.owner = null; if (!(M.phase === 'set' && M.sp && M.sp.type !== 'throw')) { ball.x = p.x + Math.sin(p.yaw) * .4; ball.z = p.z + Math.cos(p.yaw) * .4; } ball.y = Math.max(PL.br, ball.y);
  ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.spin = spin || 0; ball.last = p; ball.kickBy = p; ball.kickT = M.t; p.kCd = .35; p.touches++;
  sfx('kick', Math.min(1, Math.hypot(vx, vy, vz) / 30));
  if (M.phase === 'set' || M.phase === 'kickoff') { M.phase = 'play'; M.phT = 0; M.sp = null; }
}
function passVel(p, tx, tz, kind, pow) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1; const acc = Math.max(.02, (106 - p.st.pas) / 75) * (DIFFOF(p).err) * (1 - .22 * psv(p, 'A'));
  const ea = (Math.random() - .5) * acc * (kind === 'ground' ? .12 : .2), c = Math.cos(ea), s = Math.sin(ea); const ux = (dx * c - dz * s) / d, uz = (dx * s + dz * c) / d;
  const pm = pow ? lerp(1, 1.3, pow) : 1; // 세게 누를수록 빠르게
  if (kind === 'ground') { const v = clamp((Math.sqrt(2 * 3.4 * d) + 3.5 + d * .05) * pm, 7, 34); return [ux * v, .3, uz * v]; }
  const vy = clamp(d * (kind === 'cross' ? .22 : kind === 'through' ? .14 : .2), 3, 13) * (pow == null ? 1 : lerp(.95, 1.08, pow)); const tf = 2 * vy / G; const vh = d / tf * (kind === 'through' ? 1.05 : .9) * (1 + (Math.random() - .5) * acc * .15) * (pow == null ? 1 : lerp(.97, 1.12, pow));
  return [ux * vh, vy, uz * vh];
}
function doCross(p, m, az, pow) { const gx = goalX(p.team); const [vx, vy, vz] = passVel(p, gx - M.dir[p.team] * (pow == null ? 8 : 4 + pow * 9), az, 'cross'); p.act = 'cross'; p.actT = 0; p.yaw = Math.atan2(gx - M.dir[p.team] * 8 - p.x, az - p.z); kickBall(p, vx, vy, vz, 0); ball.passTo = m || team(p.team).filter(q => q !== p && q.role !== 'GK').sort((a, b) => Math.abs(gx - a.x) - Math.abs(gx - b.x))[0]; ball.passKind = 'cross'; ball.passT = 0; M.stats.pa[p.team]++; comm(`${shortName(p)}, 크로스!`); for (let k = 0; k < 2; k++) if (M.human[k] === p.team && ball.passTo) M.ctrl[k] = ball.passTo; }
function doPass(p, target, kind, pow) {
  kind = kind || 'ground'; let tx = target.x, tz = target.z; const lead = kind === 'through' ? 1.2 : .55;
  const d = Math.hypot(tx - p.x, tz - p.z); const tf = kind === 'ground' ? d / 16 : d / 13; tx += target.vx * tf * lead; tz += target.vz * tf * lead;
  if (kind === 'through') { tx += M.dir[target.team] * (pow == null ? 5 : 2.5 + pow * 8); } tx = clamp(tx, -PL.hx + 1, PL.hx - 1); tz = clamp(tz, -PL.hz + 1, PL.hz - 1);
  const [vx, vy, vz] = passVel(p, tx, tz, kind, pow); p.act = kind === 'ground' ? 'pass' : 'kick'; p.actT = 0; p.yaw = Math.atan2(tx - p.x, tz - p.z);
  kickBall(p, vx, vy, vz, 0); ball.passTo = target; ball.passT = 0; ball.passKind = kind; M.stats.pa[p.team]++; target.run = null;
  for (let h = 0; h < 2; h++) if (M.human[h] === p.team && M.ctrl[h] === p) M.ctrl[h] = target;
}
function doShoot(p, power, aimZ) {
  const gx = goalX(p.team), gk = gkOf(1 - p.team); power = clamp(power, .15, 1);
  let tz = aimZ != null ? clamp(aimZ, -1, 1) * (PL.gw / 2 - .45) : (gk ? (gk.z > 0 ? -1 : 1) : 1) * (PL.gw / 2 - rand(.5, 1.4));
  const d = Math.hypot(gx - p.x, tz - p.z); const sk = p.st.sht / 100; const er = Math.max(.06, 1.32 - sk) * 1.2 * DIFFOF(p).err * (.55 + power * .9) * (1 + d / 22) * (ball.owner === p || ball.y < .3 ? 1 : 1.4) * (1 - .2 * psv(p, 'S'));
  tz += (Math.random() - .5) * er * 7; let ty = .2 + power * power * 1.55 + (Math.random() - .35) * er * 3.2; if (ball.y > .5) ty += .3;
  const v = Math.min(46, 11 + power * 12 + Math.max(0, p.st.sht - 40) / 50 * 14 + psv(p, 'S') * 1.5); const tf = d / v; const vy = (ty - ball.y) / tf + .5 * G * tf * .92;
  const ux = (gx - p.x) / d, uz = (tz - p.z) / d; p.yaw = Math.atan2(ux, uz); p.act = 'kick'; p.actT = 0;
  kickBall(p, ux * v, clamp(vy, -2, 14), uz * v, (Math.random() - .5) * power * 3);
  M.stats.sh[p.team]++; M.lastShotT = M.t; ball.passTo = null;
  const onT = Math.abs(tz) < PL.gw / 2 && ty < PL.gh; if (onT) M.stats.ot[p.team]++;
  planSave(1 - p.team, onT); comm(pick([`${shortName(p)}, 슛!`, `${shortName(p)}의 슈팅!`, `강력한 슛! ${shortName(p)}!`]));
}
function planSave(ti, onTarget) {
  const gk = gkOf(ti); if (!gk) return; const gx = ownGoalX(ti); const vx = ball.vx; if (Math.abs(vx) < 1) return;
  const t = (gx - Math.sign(gx) * .8 - ball.x) / vx; if (t <= 0 || t > 3) return; let zz = ball.z + ball.vz * t, yy = ball.y + ball.vy * t - .5 * G * t * t; yy = Math.max(PL.br, Math.abs(yy));
  const sp = Math.hypot(ball.vx, ball.vy, ball.vz); const reach = Math.abs(zz - gk.z); const df = DIFFOF(gk);
  let pr = .92 - reach / 4.2 * .7 - Math.max(0, sp - 24) / 40 + clamp(t - .5, 0, .8) * .55 + (Math.min(99, gk.st.gk) - 80) / 48 + Math.max(0, gk.st.gk - 99) / 160 + (gk.team === M.human[0] || gk.team === M.human[1] ? .03 : df.gk) + .04 * psv(gk, 'G') - (yy > 1.9 ? .12 : 0);
  if (!onTarget) pr = 1; pr = clamp(pr, .08, .97);
  ball.shot = { gk, t, z: zz, y: yy, save: Math.random() < pr, catch: sp < 21 && reach < 1.2 && yy < 1.7, at: M.t + t, on: onTarget };
  if (onTarget && (reach > .7 || yy > 1.6)) { gk.act = 'dive'; gk.actT = -Math.max(0, t - .45); gk.diveSide = Math.sign(zz - gk.z) * (gk.yaw > 0 ? 1 : -1) * (M.dir[ti] > 0 ? 1 : -1) || 1; gk.diveH = clamp(yy - .4, .2, 1.4); gk.diveTo = zz; }
}
/* ---------- 공 물리 ---------- */
const POSTS = []; for (const s of [-1, 1]) for (const z of [-PL.gw / 2, PL.gw / 2]) POSTS.push([s * PL.hx, z]);
function ballPhys(dt) {
  if (ball.owner) return;
  const air = ball.y > PL.br + .02 || ball.vy > .5;
  if (air) { ball.vy -= G * dt; const k = 1 - .012 * dt * Math.hypot(ball.vx, ball.vz); ball.vx *= k; ball.vz *= k; if (ball.spin) { const sp = Math.hypot(ball.vx, ball.vz) || 1; ball.vx += -ball.vz / sp * ball.spin * dt; ball.vz += ball.vx / sp * ball.spin * dt; ball.spin *= 1 - dt * .6; } }
  // 패스 보정: 땅볼 패스는 받을 선수 쪽으로 살짝 휘어 가요
  const R = ball.passTo; if (R && M.phase === 'play' && ball.passKind !== 'through' && ball.passT < 2.5) { const sp = Math.hypot(ball.vx, ball.vz); if (sp > 2) { const tx = R.x + R.vx * .15 - ball.x, tz = R.z + R.vz * .15 - ball.z; if (Math.hypot(tx, tz) > .8) { const df = angDiff(Math.atan2(ball.vx, ball.vz), Math.atan2(tx, tz)); if (Math.abs(df) < .7) { const hum = R.team === M.human[0] || R.team === M.human[1]; const a = clamp(df, -1, 1) * Math.min(1, dt * (air ? 1 : 2.4) * (hum ? 1.4 : .8)); const c = Math.cos(a), sn = Math.sin(a); const vx = ball.vx * c + ball.vz * sn, vz = -ball.vx * sn + ball.vz * c; ball.vx = vx; ball.vz = vz; } } } }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
  if (M.phase === 'out') { if (Math.abs(ball.x) > PL.hx + 4.6) { ball.x = Math.sign(ball.x) * (PL.hx + 4.6); ball.vx *= -.25; } if (Math.abs(ball.z) > PL.hz + 3.6) { ball.z = Math.sign(ball.z) * (PL.hz + 3.6); ball.vz *= -.25; } }
  if (ball.y <= PL.br) { ball.y = PL.br; if (ball.vy < -1.4) { ball.vy = -ball.vy * .52; ball.vx *= .86; ball.vz *= .86; sfx('bounce', Math.min(1, -ball.vy / 8)); } else { ball.vy = 0; const sp = Math.hypot(ball.vx, ball.vz); if (sp > 0) { const ns = Math.max(0, sp - (3.2 + sp * .06) * dt); ball.vx *= ns / sp; ball.vz *= ns / sp; } ball.spin = 0; } }
  // 골대 · 크로스바
  for (const [px, pz] of POSTS) { if (ball.y > PL.gh + .1) continue; const dx = ball.x - px, dz = ball.z - pz, d = Math.hypot(dx, dz); if (d < .06 + PL.br && d > 0) { const nx = dx / d, nz = dz / d; const vn = ball.vx * nx + ball.vz * nz; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vz -= 1.6 * vn * nz; ball.x = px + nx * (.06 + PL.br); ball.z = pz + nz * (.06 + PL.br); sfx('post'); comm('골대를 맞았어요!'); ball.shot = null; shake(.3); } } }
  for (const s of [-1, 1]) { const px = s * PL.hx; if (Math.abs(ball.z) < PL.gw / 2) { const dx = ball.x - px, dy = ball.y - PL.gh, d = Math.hypot(dx, dy); if (d < .06 + PL.br && d > 0) { const nx = dx / d, ny = dy / d; const vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; sfx('post'); comm('크로스바!'); ball.shot = null; shake(.3); } } } }
  // 골 그물 안
  if (Math.abs(ball.x) > PL.hx && Math.abs(ball.z) < PL.gw / 2 + .05 && ball.y < PL.gh) {
    const s = Math.sign(ball.x); if (Math.abs(ball.x) > PL.hx + 2.1) { ball.x = s * (PL.hx + 2.1); ball.vx *= -.15; ball.vz *= .3; STAD.goals[s > 0 ? 1 : 0].shake = .6; }
    if (Math.abs(ball.z) > PL.gw / 2 - PL.br && Math.abs(ball.x) > PL.hx + .1) { ball.z = Math.sign(ball.z) * (PL.gw / 2 - PL.br); ball.vz *= -.2; }
    if (ball.y > PL.gh - PL.br && Math.abs(ball.x) > PL.hx + .1) { ball.y = PL.gh - PL.br; ball.vy = -Math.abs(ball.vy) * .2; }
  }
}
function netContain() {
  const s = ball.inNet; if (!s) return; const x0 = PL.hx + .2, x1 = PL.hx + 2.0, zm = PL.gw / 2 - PL.br - .05, ym = PL.gh - PL.br - .02;
  const ax = ball.x * s; if (ax < x0) { ball.x = s * x0; ball.vx = s * Math.abs(ball.vx) * .2; } if (ax > x1) { ball.x = s * x1; ball.vx = -s * Math.abs(ball.vx) * .2; STAD.goals[s > 0 ? 1 : 0].shake = Math.max(STAD.goals[s > 0 ? 1 : 0].shake, .4); }
  if (Math.abs(ball.z) > zm) { ball.z = Math.sign(ball.z) * zm; ball.vz *= -.2; } if (ball.y > ym) { ball.y = ym; ball.vy = -Math.abs(ball.vy) * .2; }
  ball.vx *= .97; ball.vz *= .97;
}
/* ---------- 규칙: 골 · 나간 공 ---------- */
function checkRules() {
  if (M.phase !== 'play') return;
  const ax = Math.abs(ball.x);
  if (ax > PL.hx + PL.br && Math.abs(ball.z) < PL.gw / 2 && ball.y < PL.gh) { const s = Math.sign(ball.x); const scorer = M.dir[0] === s ? 0 : 1; goal(scorer); return; }
  if (Math.abs(ball.z) > PL.hz + PL.br) { const lt = ball.last ? ball.last.team : 0; outOfPlay('throw', 1 - lt, clamp(ball.x, -PL.hx + 1, PL.hx - 1), Math.sign(ball.z) * PL.hz); return; }
  if (ax > PL.hx + PL.br) { const s = Math.sign(ball.x); const defT = M.dir[0] === s ? 1 : 0; const lt = ball.last ? ball.last.team : 1 - defT;
    if (lt === defT) outOfPlay('corner', 1 - defT, s * PL.hx, Math.sign(ball.z || 1) * PL.hz); else outOfPlay('goalkick', defT, s * (PL.hx - 5.5), Math.sign(ball.z || 1) * 4); }
}
function goal(ti) {
  M.score[ti]++; M.phase = 'goal'; M.phT = 0; ball.inNet = Math.sign(ball.x) || 1; ball.owner = null; ball.shot = null; ball.passTo = null; const sc = ball.last && ball.last.team === ti ? ball.last : null; const og = ball.last && ball.last.team !== ti;
  const min = Math.min(M.half > 2 ? 120 : 90, Math.floor(M.clock / 60) + 1); M.scorers.push({ team: ti, name: sc ? sc.d.name : (og ? (ball.last.d.name + ' (자책)') : '?'), min }); if (sc) { sc.goals++; sc.rating += 1.2; }
  STAD.jump = 6; STAD.jumpSide = null; sfx('goal'); banner('GOAL!', `${M[ti ? 't1' : 't0'].f} ${sc ? sc.d.name : '자책골'} ${min}'`, '#ffd400', 2.6);
  comm(og ? '아… 자책골이에요!' : pick([`골!!! ${shortName(sc)}!!`, `${shortName(sc)}, 골망을 흔듭니다!`, `들어갔어요! ${shortName(sc)}!`])); M.goalTeam = ti; M.celeBy = sc;
  for (const p of M.players) { if (p.team === ti) { if (p === sc) { p.act = 'cele'; p.actT = 0; p.celeKind = randi(0, 4); } else if (p.role !== 'GK') { p.act = null; } } else if (p.role !== 'GK') { p.act = Math.random() < .5 ? 'sad' : null; p.actT = 0; } }
  vibrate([60, 40, 120]);
}
/* ---------- 선수 움직임 ---------- */
function maxSpd(p, sprint) { const s = p.st.spd / 100; return (sprint ? 5.2 + s * 5 : 4 + s * 3) * (ball.owner === p ? .72 + p.st.drb / 560 : 1) * (p.boostT > 0 ? 1.1 : 1) * (sprint ? 1 + .045 * psv(p, 'P') : 1) * (ball.owner === p ? 1 + .03 * psv(p, 'D') : 1); }
// 플레이스타일: 0 = 없음 · 1 = 있음 · 2 = 플러스(+)
const psv = (p, k) => { const s = p && p.d && p.d.ps; return (s && s.lv && s.lv[k]) || 0; };
function steer(p, tx, tz, spd, dt, face) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); let wx = 0, wz = 0; if (d > .25) { const s = Math.min(spd, d * 2.2); wx = dx / d * s; wz = dz / d * s; }
  accel(p, wx, wz, dt); if (face != null) p.yaw += angDiff(p.yaw, face) * Math.min(1, dt * 8);
}
function accel(p, wx, wz, dt) { const a = 16 * dt; const dvx = wx - p.vx, dvz = wz - p.vz, dv = Math.hypot(dvx, dvz); if (dv > a) { p.vx += dvx / dv * a; p.vz += dvz / dv * a; } else { p.vx = wx; p.vz = wz; } }
function movePlayers(dt) {
  for (const p of M.players) {
    if (p.stun > 0) { p.stun -= dt; p.vx *= 1 - dt * 4; p.vz *= 1 - dt * 4; }
    if (p.act === 'slide') { p.vx *= 1 - dt * 1.6; p.vz *= 1 - dt * 1.6; }
    if (p.skill) { if (ball.owner !== p && p.skill.k !== 'flick') { p.skill = null; p.act = null; } else skillTick(p, dt); } if (p.boostT > 0) p.boostT -= dt;
    p.x += p.vx * dt; p.z += p.vz * dt; const sp = Math.hypot(p.vx, p.vz);
    if (sp > .6 && p.act !== 'slide' && p.act !== 'dive' && !(p.faceLock > 0)) p.yaw += angDiff(p.yaw, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * (ball.owner === p ? 9 : 7));
    if (p.faceLock > 0) p.faceLock -= dt;
    p.x = clamp(p.x, -PL.hx - 4, PL.hx + 4); p.z = clamp(p.z, -PL.hz - 3, PL.hz + 3);
    p.kCd -= dt; p.tkCd -= dt; if (p.act) { p.actT += dt; const D = { skill: 1.5, kick: .5, pass: .38, cross: .5, slide: .8, dive: 1.3, throw: .7, header: .55, stumble: .7, catch: .4, trap: .3, place: .75, pickup: .7, point: 1.2 }[p.act]; if (D && p.actT > D) { p.act = (p.role === 'GK' && ball.owner === p && ball.held) ? 'hold' : null; p.diveCatch = false; } }
  }
  // 몸끼리 겹치지 않게
  const L = M.players; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 < .49 && d2 > 1e-6) { const d = Math.sqrt(d2), o = (.7 - d) / 2; a.x -= dx / d * o; a.z -= dz / d * o; b.x += dx / d * o; b.z += dz / d * o; } }
}
/* ---------- 공 잡기 · 드리블 ---------- */
function ballControl(dt) {
  if (M.phase !== 'play') return;
  const o = ball.owner;
  if (o) {
    if (o.role === 'GK' && ball.held) { gkBallInHands(o, dt); return; }
    const sp = Math.hypot(o.vx, o.vz); const sk = o.skill; const by = sk ? Math.atan2(sk.dx, sk.dz) : o.yaw; const lead = sk ? (sk.k === 'roulette' ? .22 : sk.k === 'drag' && sk.t / sk.d < .45 ? .15 : .38 + sp * .04) : .42 + sp * .05;
    const tx = o.x + Math.sin(by) * lead + (sk && sk.k === 'stepover' && sk.t / sk.d < .55 ? Math.cos(by) * .0 : 0), tz = o.z + Math.cos(by) * lead; const k = Math.min(1, dt * (sk ? 18 : 14));
    const nx = lerp(ball.x, tx, k), nz = lerp(ball.z, tz, k); ball.vx = (nx - ball.x) / dt; ball.vz = (nz - ball.z) / dt; ball.x = nx; ball.z = nz; ball.y = PL.br; ball.vy = 0;
    M.stats.pos[o.team] += dt; return;
  }
  // GK 선방 계획
  const sh = ball.shot; if (sh && !sh.save && sh.on) sh.gk.kCd = Math.max(sh.gk.kCd, .25); if (sh && M.t >= sh.at - .02) { ball.shot = null; const gk = sh.gk; if (!sh.save) gk.kCd = .6; if (sh.on && sh.save && Math.abs(ball.x) < PL.hx + .3) {
      if (sh.catch) { gkCatch(gk); comm(pick(['골키퍼가 잡아냅니다!', '안정적인 캐치!'])); }
      else { const s = -Math.sign(ball.vx); const wide = Math.random() < .4; ball.vx = wide ? -s * rand(2, 4) : s * rand(4, 9); ball.vz = (ball.z >= 0 ? 1 : -1) * (wide ? rand(7, 11) : rand(3, 9)); ball.vy = rand(1, wide ? 5 : 4); ball.last = gk; sfx('save'); comm(pick(['슈퍼 세이브!!', '막아냅니다! 엄청난 선방!', '손끝으로 쳐냅니다!'])); gk.rating += .6; shake(.2); }
    } }
  // 가까운 선수가 공을 받아요
  let best = null, bd = 9; const bsp = Math.hypot(ball.vx, ball.vz);
  for (const p of M.players) {
    if (p.stun > 0 || p.kCd > 0 || p.act === 'dive' && p.actT < .3) continue; const d = Math.hypot(p.x - ball.x, p.z - ball.z);
    const gkHands = p.role === 'GK' && inOwnBox(p, ball.x, ball.z); const hum = p === M.ctrl[0] || p === M.ctrl[1]; const reach = gkHands ? 1.25 : ball.passTo === p ? (hum ? 1.25 : 1) : hum ? .95 : .78; const hmax = gkHands ? 2.5 : ball.passTo === p ? 1.3 : .95;
    if (d < reach && ball.y < hmax && d < bd) { best = p; bd = d; }
    else if (!gkHands && d < .9 && ball.y > .95 && ball.y < 2.3 && ball.vy < 2 && p.kCd <= 0 && d < bd) { best = p; bd = d; best.head = true; }
  }
  if (!best) return;
  if (best.head) { best.head = false; header(best); return; }
  if (best.role === 'GK' && inOwnBox(best, ball.x, ball.z) && !(ball.last && ball.last.team === best.team && ball.kickBy === ball.last && M.t - ball.kickT < 2 && ball.last !== best)) { gkCatch(best); return; }
  // 첫 터치: 너무 빠르면 튕길 수도
  const soft = ball.passTo === best && (best === M.ctrl[0] || best === M.ctrl[1]); // 내 선수가 패스 받을 땐 첫 터치를 부드럽게
  if (bsp > (soft ? 26 : 20) && Math.random() < (soft ? .12 : clamp(.25 + (92 - best.st.drb) / 110, .04, .7))) { ball.vx *= -.3; ball.vz *= -.3; ball.vy = 1.5; ball.last = best; best.kCd = .3; sfx('kick', .3); return; }
  gainBall(best);
}
function gainBall(p) {
  const prev = ball.last; if (!p.act && p.role !== 'GK' && Math.hypot(ball.vx, ball.vz) > 7) { p.act = 'trap'; p.actT = 0; p.foot = Math.random() < .7 ? 'Right' : 'Left'; } ball.owner = p; ball.held = false; ball.last = p; ball.shot = null; p.touches++; p.holdT = 0; p.think = Math.min(p.think, DIFFOF(p).react * .6);
  if (ball.passTo) { if (ball.passTo.team === p.team) { M.stats.pc[p.team]++; } ball.passTo = null; }
  if (prev && prev.team !== p.team) M.lastTurn = M.t;
  for (let h = 0; h < 2; h++) { const tm = M.human[h]; if (tm < 0) continue; if (tm === p.team) M.ctrl[h] = p; else { const c = closestTo(team(tm).filter(q => q.role !== 'GK'), p.x, p.z); if (c && c !== M.ctrl[h]) { M.ctrl[h] = c; c.swT = M.t; } } } // 상대가 공을 잡으면 그 선수에게 가장 가까운 우리 선수로
  if (p.queued && M.t - p.queued.t < .45) { const q = p.queued; p.queued = null; humanAct(p, q.a, q.v, q.pow, q.h); }
}
// 키퍼가 잡은 공: 순간이동 없이 손까지 날아와서, 그다음엔 손을 따라가요
const _hl = new T.Vector3(), _hr = new T.Vector3();
function gkBallInHands(o, dt) {
  let hx = o.x + Math.sin(o.yaw) * .35, hy = 1.1, hz = o.z + Math.cos(o.yaw) * .35; const B = o.P && o.P.B;
  if (B && B.LeftHand && B.RightHand) { B.LeftHand.getWorldPosition(_hl); B.RightHand.getWorldPosition(_hr); hx = (_hl.x + _hr.x) / 2 + Math.sin(o.yaw) * .06; hy = Math.max(PL.br, (_hl.y + _hr.y) / 2); hz = (_hl.z + _hr.z) / 2 + Math.cos(o.yaw) * .06; }
  if (ball.cT != null && ball.cT < .2) { ball.cT += dt; const k = Math.min(1, ball.cT / .2), e = k * k * (3 - 2 * k); ball.x = lerp(ball.cF[0], hx, e); ball.y = lerp(ball.cF[1], hy, e); ball.z = lerp(ball.cF[2], hz, e); }
  else { const k = Math.min(1, dt * 25); ball.x = lerp(ball.x, hx, k); ball.y = lerp(ball.y, hy, k); ball.z = lerp(ball.z, hz, k); }
  ball.vx = ball.vy = ball.vz = 0;
}
function gkCatch(gk) { ball.cF = [ball.x, ball.y, ball.z]; ball.cT = 0; const diving = gk.act === 'dive'; ball.owner = gk; ball.held = true; ball.last = gk; ball.shot = null; ball.vx = ball.vy = ball.vz = 0; if (!diving) { gk.act = 'catch'; gk.actT = 0; } else gk.diveCatch = true; gk.holdT = 0; gk.vx = gk.vz = 0; sfx('catch'); for (let h = 0; h < 2; h++) if (M.human[h] === gk.team) M.ctrl[h] = closestTo(team(gk.team).filter(p => p.role !== 'GK'), gk.x, gk.z); }
function inOwnBox(p, x, z) { const gx = ownGoalX(p.team); return Math.abs(x - gx) < 16.5 && Math.abs(z) < 20.16 && Math.sign(x) === Math.sign(gx); }
function header(p) {
  p.act = 'header'; p.actT = 0; p.kCd = .4; const gx = goalX(p.team); const dg = Math.hypot(gx - p.x, p.z);
  if (dg < 16) { const tz = (Math.random() - .5) * PL.gw * 1.1; const d = Math.hypot(gx - p.x, tz - p.z); const v = 13 + p.st.sht / 10; const ux = (gx - p.x) / d, uz = (tz - p.z) / d; kickBall(p, ux * v, rand(-1, 2.5), uz * v, 0); M.stats.sh[p.team]++; const onT = Math.abs(tz) < PL.gw / 2; if (onT) M.stats.ot[p.team]++; planSave(1 - p.team, onT); comm(`${shortName(p)}의 헤더!`); sfx('kick', .5); }
  else { const mate = bestPassTarget(p, true); if (mate) { const dx = mate.x - p.x, dz = mate.z - p.z, d = Math.hypot(dx, dz) || 1; const v = Math.min(14, d * .9 + 4); kickBall(p, dx / d * v, 3, dz / d * v, 0); ball.passTo = mate; } else kickBall(p, M.dir[p.team] * 10, 4, rand(-4, 4), 0); }
}
/* ---------- 개인기 (질주 버튼 톡) ---------- */
const SKILLS = { roulette: { d: .62, n: '마르세유 룰렛' }, stepover: { d: .58, n: '헛다리' }, elastico: { d: .48, n: '엘라스티코' }, drag: { d: .5, n: '드래그 백' }, flick: { d: .55, n: '레인보우 플릭' } };
function doSkill(p, ix, iz, k) {
  if (ball.owner !== p || ball.held || p.skill || (p.skillCd || 0) > M.t || p.role === 'GK') return false;
  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); const L = Math.hypot(ix, iz); let dx = fx, dz = fz;
  if (L > .3) { dx = ix / L; dz = iz / L; const dot = dx * fx + dz * fz; k = k || (dot < -.45 ? 'drag' : dot < .55 ? pick(['stepover', 'elastico']) : (Math.hypot(p.vx, p.vz) > 5 && Math.random() < .5 ? 'flick' : 'roulette')); }
  else k = k || pick(['roulette', 'stepover', 'elastico']);
  const slow = clamp(1 + (85 - p.st.drb) / 90, .85, 1.35); const side = Math.sign(fx * dz - fz * dx) || (Math.random() < .5 ? 1 : -1);
  p.skill = { k, t: 0, d: SKILLS[k].d * slow, dx, dz, y0: p.yaw, side }; p.skillCd = M.t + p.skill.d + .45; p.act = 'skill'; p.actT = 0; p.faceLock = p.skill.d; p.foot = side > 0 ? 'Right' : 'Left';
  if (k === 'flick') { ball.owner = null; ball.last = p; ball.vx = dx * 8 + p.vx * .3; ball.vz = dz * 8 + p.vz * .3; ball.vy = 5.4; ball.y = .4; p.kCd = .45; for (const q of team(1 - p.team)) if (dist(q, p) < 4) q.kCd = Math.max(q.kCd, .75); }
  comm(`${shortName(p)}, ${SKILLS[k].n}!`); sfx('kick', .15); return true;
}
function skillTick(p, dt) {
  const s = p.skill; s.t += dt; const k = Math.min(1, s.t / s.d), px = -s.dz, pz = s.dx; let vx = 0, vz = 0;
  if (s.k === 'roulette') { p.yaw = s.y0 + s.side * k * Math.PI * 2; const v = 4.2; vx = s.dx * v + px * s.side * Math.sin(k * Math.PI) * 1.6; vz = s.dz * v + pz * s.side * Math.sin(k * Math.PI) * 1.6; }
  else if (s.k === 'stepover') { if (k < .55) { vx = -s.dx * 1.2; vz = -s.dz * 1.2; } else { vx = s.dx * 8; vz = s.dz * 8; } p.yaw += angDiff(p.yaw, Math.atan2(s.dx, s.dz)) * Math.min(1, dt * (k < .55 ? 1 : 10)); }
  else if (s.k === 'elastico') { if (k < .4) { vx = -s.dx * 2.2; vz = -s.dz * 2.2; } else { vx = s.dx * 8.4; vz = s.dz * 8.4; } p.yaw += angDiff(p.yaw, Math.atan2(s.dx, s.dz)) * Math.min(1, dt * 8); }
  else if (s.k === 'drag') { if (k < .45) { vx = p.vx * .8; vz = p.vz * .8; } else { vx = s.dx * 6; vz = s.dz * 6; p.yaw += angDiff(p.yaw, Math.atan2(s.dx, s.dz)) * Math.min(1, dt * 12); } }
  else if (s.k === 'flick') { vx = s.dx * 7.6; vz = s.dz * 7.6; }
  p.vx = vx; p.vz = vz;
  if (s.t >= s.d) { p.skill = null; if (p.act === 'skill') p.act = null; p.boostT = .8; p.faceLock = 0; }
}
/* ---------- 태클 ---------- */
function tryTackle(p, slide) {
  const o = ball.owner; if (p.tkCd > 0 || p.stun > 0) return false; p.tkCd = slide ? 1.4 : .7;
  if (slide) { p.act = 'slide'; p.actT = 0; const f = p.yaw; p.vx = Math.sin(f) * 8.5; p.vz = Math.cos(f) * 8.5; p.faceLock = .8; return true; }
  if (!o || o.team === p.team || o.held) return false; const d = dist(p, o); if (d > 1.5) return false;
  const pr = clamp(.45 + (p.st.def - o.st.drb) / 65 + (p.team === M.human[0] || p.team === M.human[1] ? .03 : DIFFOF(p).tk) + .06 * psv(p, 'F') - .06 * psv(o, 'D') - .04 * psv(o, 'H'), .08, .92) * (o.skill ? .25 : o.boostT > 0 ? .7 : 1); // 개인기 중엔 잘 안 뺏겨요
  p.act = 'pass'; p.actT = .08; p.yaw = Math.atan2(o.x - p.x, o.z - p.z);
  if (Math.random() < pr) { looseBall(o, p); M.stats.tk[p.team]++; sfx('tackle'); comm(pick([`${shortName(p)}, 깔끔한 태클!`, '공을 빼앗았어요!'])); return true; }
  p.stun = .45; return false;
}
function slideHit(p) { // 슬라이딩 중 공 · 사람에 닿기
  if (p.act !== 'slide' || p.actT > .55) return; const fx_ = p.x + Math.sin(p.yaw) * .7, fz_ = p.z + Math.cos(p.yaw) * .7;
  const o = ball.owner; const dB = Math.hypot(ball.x - fx_, ball.z - fz_);
  if (dB < .9 && ball.y < .6) {
    if (o && o.team !== p.team && !o.held && o.skill && Math.random() < .6) { p.act = 'slide'; return; } // 개인기로 피했어요
    if (o && o.team !== p.team && !o.held) { const behind = Math.cos(angDiff(o.yaw, Math.atan2(p.x - o.x, p.z - o.z))) < -.55; looseBall(o, p); ball.vx = Math.sin(p.yaw) * 7; ball.vz = Math.cos(p.yaw) * 7; M.stats.tk[p.team]++; sfx('tackle');
      if (behind && Math.random() < .55) { foul(p, o); return; } comm(pick(['멋진 슬라이딩 태클!', `${shortName(p)}의 슬라이딩!`])); p.act = 'slide'; return; }
    if (!o) { ball.vx = Math.sin(p.yaw) * 9; ball.vz = Math.cos(p.yaw) * 9; ball.last = p; sfx('kick', .5); }
  } else if (o && o.team !== p.team && !o.held && dist(o, { x: fx_, z: fz_ }) < .7 && Math.random() < .5) foul(p, o);
}
function looseBall(o, by) { ball.owner = null; ball.last = by; ball.vx = (ball.x - o.x) * 4 + rand(-2, 2); ball.vz = (ball.z - o.z) * 4 + rand(-2, 2); o.stun = .55; o.act = 'stumble'; o.actT = 0; by.kCd = .15; }
function foul(p, o) {
  M.stats.fo[p.team]++; o.act = 'stumble'; o.actT = 0; o.stun = 1; sfx('whistle', 1); comm(pick(['반칙이에요!', `${shortName(p)}, 뒤에서 들어가요! 반칙!`]));
  const card = Math.random() < .3; if (card) banner('🟨 옐로카드', shortName(p), '#ffd400', 1.4);
  const inBox = inOwnBox(p, o.x, o.z); M.foulNext = inBox ? ['pen', o.team, goalX(o.team) - M.dir[o.team] * 11, 0] : ['free', o.team, clamp(o.x, -PL.hx + 2, PL.hx - 2), clamp(o.z, -PL.hz + 1, PL.hz - 1)];
  M.phase = 'foul'; M.phT = 0; ball.owner = null; ball.vx = ball.vz = 0; banner(SETN[M.foulNext[0]], M[o.team ? 't1' : 't0'].n, inBox ? '#ff4d5e' : null, 1.6, true);
}
/* ---------- AI ---------- */
const DIFFOF = p => (p.team === M.human[0] || p.team === M.human[1]) ? DIFF[2] : DIFF[M.diff];
function bestPassTarget(p, any) {
  let best = null, bs = -1e9; const opp = team(1 - p.team);
  for (const m of team(p.team)) { if (m === p || (m.role === 'GK' && !any)) continue; const d = dist(p, m); if (d < 5 || d > 42) continue;
    const prog = (m.x - p.x) * M.dir[p.team]; let open = 99; for (const q of opp) { const t = clamp(((q.x - p.x) * (m.x - p.x) + (q.z - p.z) * (m.z - p.z)) / (d * d), 0, 1); const ex = p.x + (m.x - p.x) * t - q.x, ez = p.z + (m.z - p.z) * t - q.z; open = Math.min(open, Math.hypot(ex, ez) / (t * 1.5 + .5)); }
    let space = 99; for (const q of opp) space = Math.min(space, dist(q, m));
    const sc = prog * .55 + Math.min(open, 6) * 2 + Math.min(space, 8) * .9 - d * .11 + (d < 18 ? 1.2 : 0) + (m.role === 'FW' ? 2 : 0) + (Math.random() - .5) * 4 * DIFFOF(p).err;
    if (sc > bs) { bs = sc; best = m; } }
  return best && (any || bs > 4) ? best : null;
}
function aiCarrier(p, dt) {
  const gx = goalX(p.team); const dg = Math.hypot(gx - p.x, p.z); const opp = team(1 - p.team); let near = null, nd = 99; for (const q of opp) { const d = dist(p, q); if (d < nd) { nd = d; near = q; } }
  p.holdT = (p.holdT || 0) + dt;
  if (p.role === 'GK') { if (p.holdT > (ball.held ? 1.2 : .5)) { const m = bestPassTarget(p, false) || closestTo(team(p.team).filter(q => q.role === 'DF'), p.x, p.z); if (m) { ball.held = false; doPass(p, m, dist(p, m) > 25 ? 'long' : 'ground'); } } p.vx *= .8; p.vz *= .8; return; }
  // 앞에 빈 공간이 있는지
  const fdx = M.dir[p.team]; let block = 99; for (const q of opp) { const ax = (q.x - p.x) * fdx; if (ax > -.5 && ax < 9 && Math.abs(q.z - p.z) < 3 + ax * .4) block = Math.min(block, Math.hypot(q.x - p.x, q.z - p.z)); }
  p.think -= dt; if (p.think <= 0) {
    p.think = DIFFOF(p).think * rand(.7, 1.3);
    const ang = Math.abs(p.z) / Math.max(1, Math.abs(gx - p.x));
    const shootP = dg < 12 ? .95 : dg < 20 ? (ang < 1.3 ? .65 : .25) : dg < 29 ? (ang < .8 ? .3 : .06) : 0;
    if (Math.random() < shootP * (block < 3 && dg > 14 ? .5 : 1)) { const gk = gkOf(1 - p.team); doShoot(p, clamp(dg / 24 + rand(-.15, .1), .35, .95), gk ? (gk.z > 0 ? -.85 : .85) * rand(.4, 1) : null); return; }
    if (near && nd < 2.8 && p.st.drb >= 80 && Math.random() < (p.st.drb - 74) / 70) { const ax = p.x - near.x, az = p.z - near.z, al = Math.hypot(ax, az) || 1; const sd = Math.sign(az) || 1; if (doSkill(p, fdx * .7 + (-az / al) * 0 + 0, sd * .9)) return; } // 스타 선수는 개인기로 제쳐요
    const runner = team(p.team).find(q => q.run && q.role !== 'GK' && (q.run.x - p.x) * fdx > 5);
    if (runner && block < 6 && Math.random() < .25) { doPass(p, runner, 'through'); return; }
    const pressured = nd < 2.3; const m = bestPassTarget(p, pressured && p.holdT > .3);
    const open = block > 7 && dg > 18; const want = pressured ? .7 : open ? .03 : block < 4 ? .4 : .1;
    if (m && (Math.random() < want || p.holdT > 3.2)) { const d = dist(p, m); const ahead = (m.x - p.x) * fdx; const fwdRun = m.role !== 'DF' && ahead > 8 && m.run && Math.random() < .5; doPass(p, m, fwdRun && d > 12 ? 'through' : d > 32 && Math.random() < .6 ? 'long' : 'ground'); return; }
    // 측면에서 크로스
    if (Math.abs(gx - p.x) < 22 && Math.abs(p.z) > 16 && Math.random() < .45) { const tgt = team(p.team).filter(q => q.role === 'FW' || q.role === 'MF').sort((a, b) => Math.abs(gx - a.x) - Math.abs(gx - b.x))[0]; if (tgt) { const [vx, vy, vz] = passVel(p, gx - M.dir[p.team] * rand(6, 11), rand(-5, 5), 'cross'); p.act = 'cross'; p.actT = 0; kickBall(p, vx, vy, vz, 0); ball.passTo = tgt; M.stats.pa[p.team]++; comm(`${shortName(p)}, 크로스!`); return; } }
  }
  // 드리블: 골 쪽으로, 수비 피해서
  let tx = gx - M.dir[p.team] * 6, tz = dg < 30 ? p.z * .5 : p.z * .85; if (near && nd < 5) { const side = (p.z - near.z) >= 0 ? 1 : -1; tz = clamp(p.z + side * 6, -PL.hz + 2, PL.hz - 2); tx = p.x + M.dir[p.team] * 6; }
  steer(p, tx, tz, maxSpd(p, block > 3 || dg < 30), dt);
}
function aiOff(p, dt, att, hasBall) {
  const b = ball; const owner = b.owner;
  if (p.role === 'GK') return aiGK(p, dt);
  const [hx, hz] = homeXZ(p, b.x, b.z, att); let tx = hx, tz = hz, spd = maxSpd(p, false) * .75;
  // 빈 공간으로 뛰어들기
  if (att && owner && owner.team === p.team && p.role === 'FW') { if (!p.run && Math.random() < dt * .6) { const deep = Math.max(...team(1 - p.team).filter(q => q.role === 'DF').map(q => q.x * M.dir[p.team])); p.run = { t: 2.2, x: clamp(Math.max(owner.x * M.dir[p.team] + 8, deep + rand(2, 7)) * M.dir[p.team], -PL.hx + 6, PL.hx - 6), z: clamp(p.z * .7 + rand(-6, 6), -PL.hz + 4, PL.hz - 4) }; } if (p.run) { p.run.t -= dt; tx = p.run.x; tz = p.run.z; spd = maxSpd(p, true); if (p.run.t < 0) p.run = null; } }
  // 공이 오면 받으러
  if (b.passTo === p) { const pr = predictBall(.35); tx = pr[0]; tz = pr[1]; spd = maxSpd(p, true); }
  steer(p, tx, tz, spd, dt);
}
function aiDef(p, dt, role) {
  if (p.role === 'GK') return aiGK(p, dt);
  const o = ball.owner; const [hx, hz] = homeXZ(p, ball.x, ball.z, false);
  if (role === 1) { // 압박
    const pr = o ? [o.x + o.vx * .3, o.z + o.vz * .3] : predictBall(.4); steer(p, pr[0], pr[1], maxSpd(p, true), dt);
    if (o && o.team !== p.team && dist(p, o) < 1.35 && p.tkCd <= 0) { p.think -= dt; if (p.think <= 0) { p.think = DIFFOF(p).react * rand(.8, 1.6); if (Math.random() < .12 && dist(p, o) < 2.4 && (p.role === 'DF' || Math.random() < .5)) { p.yaw = Math.atan2(o.x - p.x, o.z - p.z); tryTackle(p, true); } else tryTackle(p, false); } }
  } else if (role === 2) { // 길목 막기: 공과 우리 골 사이
    const gx = ownGoalX(p.team); const bx = o ? o.x : ball.x, bz = o ? o.z : ball.z; steer(p, lerp(bx, gx, .3), lerp(bz, 0, .3), maxSpd(p, true) * .9, dt);
  } else { // 대형 유지 + 가까운 상대 마크
    let tx = hx, tz = hz; const opp = team(1 - p.team); const mk = closestTo(opp.filter(q => q !== o && q.role !== 'GK'), hx, hz); if (mk && Math.hypot(mk.x - hx, mk.z - hz) < 12 && p.role === 'DF') { const gx = ownGoalX(p.team); tx = lerp(mk.x, gx, .12); tz = lerp(mk.z, 0, .1); }
    steer(p, tx, tz, maxSpd(p, false) * .8, dt);
  }
}
function aiGK(p, dt) {
  if (p.act === 'dive') { if (p.actT > 0 && p.diveTo != null) { const tz = clamp(p.diveTo, -PL.gw / 2 - .5, PL.gw / 2 + .5); p.vz = (tz - p.z) * 5; p.vx *= .9; } return; }
  const gx = ownGoalX(p.team), s = Math.sign(gx); const bx = ball.x, bz = ball.z; const db = Math.hypot(bx - gx, bz);
  let adv = clamp((32 - db) / 32, 0, 1) * 4.5; let tx = gx - s * (1 + adv), tz = clamp(bz * (db < 20 ? .28 : .15), -1.9, 1.9);
  // 공이 박스로 오면 나가서 잡기
  if (!ball.owner && inOwnBox(p, bx, bz) && db < 14) { const pr = predictBall(.3); const myD = Math.hypot(pr[0] - p.x, pr[1] - p.z); const opp = closestTo(team(1 - p.team), pr[0], pr[1]); if (!opp || myD < dist(opp, { x: pr[0], z: pr[1] }) + 1) { tx = pr[0]; tz = pr[1]; } }
  if (ball.owner && ball.owner.team !== p.team && db < 10) { tx = lerp(gx, ball.owner.x, .55); tz = lerp(0, ball.owner.z, .55); }
  steer(p, tx, tz, maxSpd(p, db < 25), dt, Math.atan2(bx - p.x, bz - p.z));
}
function predictBall(t) { if (ball.owner) return [ball.owner.x, ball.owner.z]; let x = ball.x, z = ball.z, vx = ball.vx, vz = ball.vz; const st = .05; for (let i = 0; i < t / st; i++) { x += vx * st; z += vz * st; const s = Math.hypot(vx, vz); if (s > 0 && ball.y < .3) { const n = Math.max(0, s - 3.5 * st); vx *= n / s; vz *= n / s; } } return [x, z]; }
function teamAI(ti, dt) {
  const T_ = team(ti); const o = ball.owner; const att = o ? o.team === ti : (ball.last ? ball.last.team === ti : false);
  const humanCtrl = [0, 1].map(h => M.human[h] === ti ? M.ctrl[h] : null).filter(Boolean);
  // 압박할 선수 고르기 (사람이 조작 중인 선수는 빼고)
  let press = [], free = !o;
  if (!att || free) { const pr = predictBall(.4); const cand = T_.filter(p => p.role !== 'GK' && !humanCtrl.includes(p) && p.stun <= 0).sort((a, b) => Math.hypot(a.x - pr[0], a.z - pr[1]) - Math.hypot(b.x - pr[0], b.z - pr[1]));
    const hc = humanCtrl[0]; const hcClose = hc && Math.hypot(hc.x - pr[0], hc.z - pr[1]) < 8; press = hcClose ? [null, cand[0]] : [cand[0], cand[1]]; if (free) { press = [cand[0]]; if (hc && hcClose) press = []; } }
  for (const p of T_) {
    if (humanCtrl.includes(p)) continue; if (p.stun > 0 || p.act === 'slide') continue;
    if (p.skill) continue; if (o === p) { aiCarrier(p, dt); continue; }
    if (free && press[0] === p) { const pr = predictBall(.35); steer(p, pr[0], pr[1], maxSpd(p, true), dt); continue; }
    if (!att && !free) { const r = press[0] === p ? 1 : press[1] === p ? 2 : 0; aiDef(p, dt, r); } else aiOff(p, dt, att || free, o && o.team === ti);
  }
}
/* ---------- 세트피스 진행 ---------- */
function setPieceTick(dt) {
  const sp = M.sp; if (!sp) return; const tk = sp.taker; resetBallAt(sp);
  for (const p of M.players) if (p !== tk) steer(p, p.tx, p.tz, maxSpd(p, false) * (M.phT < 2 ? .85 : .6), dt, Math.atan2(ball.x - p.x, ball.z - p.z));
  if (sp.type === 'pen') { const gk = gkOf(1 - sp.team); if (gk) { gk.tx = goalX(sp.team) - M.dir[sp.team] * .3; gk.tz = 0; if (Math.hypot(gk.x - gk.tx, gk.z) < .5) gk.yaw = Math.atan2(-M.dir[sp.team], 0); } }
  // 1) 공까지 걸어가기
  if (sp.prep) { steer(tk, sp.sx, sp.sz, maxSpd(tk, false) * .9, dt); const d = Math.hypot(sp.sx - tk.x, sp.sz - tk.z); if ((d < .35 && M.phT > .6) || M.phT > 5) { sp.prep = false; place(tk, sp.sx, sp.sz); tk.yaw = sp.yaw; sp.placeT = .001; if (sp.type !== 'goalkick' || true) { tk.act = sp.type === 'throw' ? 'pickup' : 'place'; tk.actT = 0; tk.foot = 'Right'; } if (sp.type === 'throw') { tk.x = sp.x; tk.z = sp.sz; } } return; }
  // 2) 공 내려놓기 · 줍기
  if (sp.placeT > 0) { sp.placeT += dt; tk.vx = tk.vz = 0; tk.yaw += angDiff(tk.yaw, sp.yaw) * Math.min(1, dt * 6); if (sp.type === 'throw') { tk.x = sp.x; tk.z = sp.sz; } if (sp.placeT > .8) { sp.placeT = 0; sp.ready = true; sp.readyT = M.t; tk.act = null; if (sp.type === 'pen') { sfx('whistle', .7); } } return; }
  // 3) 도움닫기 → 차기
  if (sp.pend) { sp.pendT += dt; if (sp.type === 'throw') { tk.vx = tk.vz = 0; tk.act = 'throw'; tk.actT = Math.min(.3, sp.pendT); if (sp.pendT > .32) { const f = sp.pend; sp.pend = null; f(); } } else { steer(tk, ball.x - sp.ux * .35, ball.z - sp.uz * .35, sp.type === 'pen' ? 5.5 : 4.6, dt); tk.yaw = Math.atan2(ball.x - tk.x, ball.z - tk.z); if (Math.hypot(ball.x - tk.x, ball.z - tk.z) < .62 || sp.pendT > .9) { const f = sp.pend; sp.pend = null; tk.yaw = sp.yaw; f(); } } return; }
  tk.vx = tk.vz = 0; if (sp.type === 'throw') { tk.act = 'throw'; tk.actT = 0; }
  const hum = [0, 1].some(h => M.human[h] === sp.team && M.ctrl[h] === tk);
  if (M.t - sp.readyT > (hum ? 7 : 1.1) && !sp.done) { sp.done = true; setPend(sp, () => aiSetPiece(tk, sp)); }
}
function setPend(sp, f) { sp.pend = f; sp.pendT = 0; }
function resetBallAt(sp) { if (sp.pend && sp.type !== 'throw') return; if (sp.type === 'throw') { const tk = sp.taker; if (sp.prep || (sp.placeT > 0 && sp.placeT < .45)) { ball.x = sp.x; ball.z = sp.z; ball.y = PL.br; } else { ball.x = tk.x; ball.z = tk.z; ball.y = 2.15; } } else { ball.x = sp.x; ball.z = sp.z; ball.y = PL.br; } ball.vx = ball.vy = ball.vz = 0; }
function aiSetPiece(tk, sp) {
  if (sp.type === 'pen' || (sp.type === 'free' && Math.hypot(goalX(sp.team) - sp.x, sp.z) < 28)) { doShoot(tk, sp.type === 'pen' ? rand(.5, .8) : rand(.6, .9), rand(-1, 1)); return; }
  if (sp.type === 'corner') { const gx = goalX(sp.team); const [vx, vy, vz] = passVel(tk, gx - M.dir[sp.team] * rand(5, 10), rand(-5, 5), 'cross'); tk.act = 'cross'; tk.actT = 0; kickBall(tk, vx, vy, vz, -Math.sign(sp.z) * Math.sign(sp.x) * 1.5); return; }
  if (sp.type === 'throw') { const m = closestTo(team(sp.team).filter(q => q !== tk && q.role !== 'GK'), tk.x, tk.z); throwIn(tk, m.x, m.z); return; }
  const m = bestPassTarget(tk, true) || closestTo(team(sp.team).filter(q => q !== tk), tk.x, tk.z); doPass(tk, m, sp.type === 'goalkick' ? 'long' : dist(tk, m) > 26 ? 'long' : 'ground');
}
function throwIn(tk, tx, tz, pow) { const dx = tx - tk.x, dz = tz - tk.z, d = Math.hypot(dx, dz) || 1; const v = clamp((d * .9 + 3) * (pow == null ? 1 : lerp(.9, 1.3, pow)), 6, 18); tk.act = 'throw'; tk.actT = .35; kickBall(tk, dx / d * v, 2.4, dz / d * v, 0); ball.y = 2.1; tk.kCd = .5; M.stats.pa[tk.team]++; const m = closestTo(team(tk.team).filter(q => q !== tk), tx, tz); ball.passTo = m; for (let h = 0; h < 2; h++) if (M.human[h] === tk.team) M.ctrl[h] = m; }
/* ---------- 한 프레임 ---------- */
function matchTick(dt) {
  if (!M.on) return; M.t += dt; M.phT += dt;
  const P = M.phase;
  if (P === 'play') {
    M.clock += dt * 90 * 60 / (M.len * 60);
    const halfEnd = [45, 90, 105, 120][M.half - 1] * 60;
    if (M.clock >= halfEnd && !ball.shot && (!ball.owner || Math.abs(ball.x) < PL.hx - 20)) { M.clock = halfEnd; endHalf(); return; }
    humanTick(dt); teamAI(0, dt); teamAI(1, dt); movePlayers(dt); for (const p of M.players) slideHit(p); ballPhys(dt); ballControl(dt); checkRules();
    if (ball.passTo) { ball.passT += dt; if (ball.passT > 4) ball.passTo = null; }
  } else if (P === 'kickoff') {
    ball.owner = null; resetBall(0, 0);
    if (M.koPrep) { // 골 뒤: 다들 자기 자리로 걸어가요
      let far = 0; for (const p of M.players) { steer(p, p.kx, p.kz, maxSpd(p, false) * .9, dt); far = Math.max(far, Math.hypot(p.x - p.kx, p.z - p.kz)); } movePlayers(dt);
      if (far < .5 || M.phT > 3.2) { for (const p of M.players) { place(p, p.kx, p.kz); p.yaw = M.dir[p.team] > 0 ? Math.PI / 2 : -Math.PI / 2; } M.koPrep = false; M.phT = 0; sfx('whistle'); }
    } else {
      for (const p of M.players) { p.vx = p.vz = 0; }
      const hum = [0, 1].some(h => M.human[h] === M.koTeam); if (hum) humanTick(dt, true);
      if (M.phT > (hum ? 6 : 1.4)) { doPass(M.koTaker, M.koMate, 'ground'); }
    }
  } else if (P === 'intro') {
    for (const p of M.players) { p.vx = p.vz = 0; p.yaw = 0; }
    if (M.phT > 8.2 || M.introSkip) { const sk = M.introSkip; M.introSkip = false; if (sk) kickoff(0); else kickoff(0, 2); banner('킥오프!', `${M.t0.n} vs ${M.t1.n}`, null, 1.8, true); comm(`${M.t0.n}와 ${M.t1.n}의 경기, 시작합니다!`); }
  } else if (P === 'out') {
    for (const p of M.players) { p.vx *= 1 - dt * 2.2; p.vz *= 1 - dt * 2.2; } movePlayers(dt); ballPhys(dt);
    if (M.phT > (M.outNext[0] === 'throw' ? .9 : 1.3)) { const f = M.outNext; M.outNext = null; startSet(f[0], f[1], f[2], f[3]); }
  } else if (P === 'set') { humanTick(dt, true); setPieceTick(dt); movePlayers(dt); }
  else if (P === 'goal') {
    const sc = M.celeBy; for (const p of M.players) { if (p === sc) { const tx = clamp(p.x + M.dir[p.team] * -.5, -PL.hx + 2, PL.hx - 2); steer(p, tx, clamp(p.z * 1.02, -PL.hz + 2, PL.hz - 2) + Math.sign(p.z || 1) * 2, 6, dt); if (!p.act) { p.act = 'cele'; p.actT = 0; } } else if (p.team === M.goalTeam && sc && p.role !== 'GK') { const d = dist(p, sc); steer(p, sc.x, sc.z, d < 2.5 ? 2 : 6.5, dt); if (d < 3.5 && p.act !== 'cheer') { p.act = 'cheer'; p.actT = 0; } } else { p.vx *= .9; p.vz *= .9; } }
    movePlayers(dt); ballPhys(dt); netContain();
    if (M.phT > 3.2) { if (REC.frames.length > 40 && !M.noReplay) startReplay(() => kickoff(1 - M.goalTeam, true)); else kickoff(1 - M.goalTeam, true); }
  } else if (P === 'foul') { movePlayers(dt); for (const p of M.players) { p.vx *= .9; p.vz *= .9; } if (M.phT > .9 && M.foulNext) { const f = M.foulNext; M.foulNext = null; startSet(f[0], f[1], f[2], f[3]); } }
  else if (P === 'half') { if (M.phT > (M.half === 2 ? 4.2 : 3.5)) { M.half++; M.dir = M.half % 2 ? [1, -1] : [-1, 1]; kickoff(M.half % 2 ? 0 : 1); banner(HALFN[M.half - 1] + ' 시작', null, M.half > 2 ? '#ff8a1f' : '#22d3ee', 1.4); } }
  else if (P === 'over') { for (const p of M.players) { p.vx *= .9; p.vz *= .9; } movePlayers(dt); }
  // 사람 · 공 메시 · 애니메이션
  for (const p of M.players) animPlayer(p, dt);
  if (P !== 'replay') REC.push();
}
const HALFN = ['전반전', '후반전', '연장 전반', '연장 후반'];
function endHalf() {
  sfx('whistle', 1); sfx('whistle', 1, .35);
  const draw = M.score[0] === M.score[1];
  if (M.half === 1 || M.half === 3) { M.phase = 'half'; M.phT = 0; banner(M.half === 1 ? '하프타임' : '연장 전반 끝', `${M.t0.f} ${M.score[0]} : ${M.score[1]} ${M.t1.f}`, '#22d3ee', 3.2); comm(M.half === 1 ? '전반전이 끝났어요.' : '연장 전반이 끝났어요.'); }
  else if (M.half === 2 && draw && M.mode !== 'demo') { M.phase = 'half'; M.phT = 0; banner('연장전!', `${M.t0.f} ${M.score[0]} : ${M.score[1]} ${M.t1.f} · 15분씩 두 번 더`, '#ff8a1f', 4); comm('비겼어요! 연장전으로 갑니다!'); STAD.jump = 2; }
  else { M.phase = 'over'; M.phT = 0; const w = M.score[0] === M.score[1] ? -1 : M.score[0] > M.score[1] ? 0 : 1; for (const p of M.players) { p.act = w < 0 ? null : p.team === w ? 'clap' : 'sad'; p.actT = 0; } banner('경기 종료', `${M.t0.f} ${M.score[0]} : ${M.score[1]} ${M.t1.f}`, '#ffd400', 3); STAD.jump = 3; setTimeout(showResult, 3200); }
}
/* ---------- 그리기 ---------- */
const SHADOW_GEO = new T.CircleGeometry(.42, 20), SHADOW_MAT = new T.MeshBasicMaterial({ map: ctex(64, 64, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(0,0,0,.3)'); r.addColorStop(.6, 'rgba(0,0,0,.12)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, W, W); }), transparent: true, depthWrite: false });
function animPlayer(p, dt) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.yaw)) { p.x = Number.isFinite(p.x) ? p.x : 0; p.z = Number.isFinite(p.z) ? p.z : 0; p.yaw = Number.isFinite(p.yaw) ? p.yaw : 0; p.vx = p.vz = 0; }
  const P = p.P; P.root.position.set(p.x, 0, p.z); if (P.blob) P.blob.position.set(p.x, .015, p.z);
  // 보이는 방향은 부드럽게 돌아요 (킥·패스 때 몸이 순간이동하듯 확 도는 것 막기) · 개인기 회전은 빠르게 따라가요
  if (p.ry == null || !Number.isFinite(p.ry) || dt > .3) p.ry = p.yaw; else { const d = angDiff(p.ry, p.yaw); p.ry += d * Math.min(1, dt * (p.act === 'skill' ? 30 : 16)); } P.root.rotation.y = p.ry;
  // 걷기·뛰기가 경계에서 깜빡이지 않게 (켜는 속도와 끄는 속도를 다르게)
  const sp = Math.hypot(p.vx, p.vz); const pv = p._an || 'idle'; const an = pv === 'run' ? (sp > 2.5 ? 'run' : sp > .35 ? 'walk' : 'idle') : pv === 'walk' ? (sp > 3.1 ? 'run' : sp > .3 ? 'walk' : 'idle') : (sp > 3.1 ? 'run' : sp > .6 ? 'walk' : 'idle'); p._an = an;
  p._ts = lerp(p._ts || 1, an === 'run' ? clamp(sp / 4.6, .85, 2) : an === 'walk' ? clamp(sp / 1.35, .55, 2.1) : 1, Math.min(1, dt * 8)); setAnim(P, an, p._ts); // 발이 미끄러지지 않게 걸음 속도를 실제 속도에 맞춰요
  P.mixer.update(dt); footballPose(p, dt);
}
function syncBallMesh(dt) {
  const m = ball.mesh; const dx = ball.x - m.position.x, dz = ball.z - m.position.z; m.position.set(ball.x, ball.y, ball.z);
  const d = Math.hypot(dx, dz); if (d > 1e-4 && d < 5) { const ax = new T.Vector3(dz, 0, -dx).normalize(); m.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(ax, d / PL.br)); }
  ball.shadow.position.set(ball.x, .02, ball.z); const s = 1 + ball.y * .25; ball.shadow.scale.set(s, s, s); ball.shadow.material.opacity = clamp(.4 - ball.y * .05, .08, .4);
}
const shortName = p => p ? p.d.name.split(' ').pop() : '';
