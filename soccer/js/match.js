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
  for (const p of M.players) scene.remove(p.P.root); M.players = [];
  M.t0 = TEAM(o.t0); M.t1 = TEAM(o.t1); M.form = [o.f0 || '4-3-3', o.f1 || '4-3-3']; M.diff = o.diff == null ? 1 : o.diff; M.len = o.len || 6; M.mode = o.mode || 'ai'; M.human = o.human || [0, -1];
  const [k0, k1] = pickKits(M.t0, M.t1); const gkk = [['#1fbf5a', '#141414', '#1fbf5a', '#0b3a1a'], ['#ffd400', '#141414', '#ffd400', '#141414']]; if (colDist(gkk[0][0], k1[0]) < .5) gkk[0] = ['#ff7a00', '#141414', '#ff7a00', '#141414'];
  M.kits = [Object.assign(k0.slice(), { gk: gkk[0] }), Object.assign(k1.slice(), { gk: gkk[1] })];
  [M.t0, M.t1].forEach((t, ti) => roster(t, M.form[ti]).forEach(d => {
    const P = makeFootballer(d, M.kits[ti], t.num, d.role === 'GK'); scene.add(P.root);
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
function kickoff(ti) {
  M.phase = 'kickoff'; M.phT = 0; M.koTeam = ti; ball.owner = null; ball.last = null; ball.shot = null; ball.passTo = null; resetBall(0, 0);
  for (const p of M.players) { let [x, z] = homeXZ(p, 0, 0, false); x = M.dir[p.team] < 0 ? Math.max(x, 1.2) : Math.min(x, -1.2); if (p.role === 'FW' && Math.abs(p.d.fz) < .1) x = M.dir[p.team] * -.4; if (p.team !== ti) { const r = Math.hypot(x, z); if (r < 9.6) { x *= 9.6 / r; z *= 9.6 / r; } } place(p, x, z); p.yaw = M.dir[p.team] > 0 ? Math.PI / 2 : -Math.PI / 2; }
  const t = team(ti); const a = t.filter(p => p.role === 'FW').sort((a, b) => Math.abs(a.d.fz) - Math.abs(b.d.fz))[0] || t[9]; const b = t.filter(p => p !== a && p.role !== 'GK').sort((q, r) => Math.abs(q.d.fz) + Math.abs(q.d.fx) - Math.abs(r.d.fz) - Math.abs(r.d.fx))[0];
  place(a, -M.dir[ti] * .35, 0); a.yaw = M.dir[ti] > 0 ? Math.PI / 2 : -Math.PI / 2; place(b, -M.dir[ti] * 1.2, 4); M.koTaker = a; M.koMate = b; M.ctrl[ti] = M.human[0] === ti || M.human[1] === ti ? a : M.ctrl[ti];
  for (let h = 0; h < 2; h++) if (M.human[h] >= 0) { const tm = M.human[h]; if (tm === ti) M.ctrl[h] = a; else M.ctrl[h] = closestTo(team(tm).filter(p => p.role !== 'GK'), 0, 0); }
  sfx('whistle');
}
function place(p, x, z) { p.x = x; p.z = z; p.vx = p.vz = 0; p.act = null; p.stun = 0; }
function resetBall(x, z, y) { ball.x = x; ball.z = z; ball.y = y || PL.br; ball.vx = ball.vy = ball.vz = 0; ball.spin = 0; }
function closestTo(list, x, z) { let b = null, bd = 1e9; for (const p of list) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = p; } } return b; }
function startSet(type, ti, x, z) {
  M.phase = 'set'; M.phT = 0; M.sp = { type, team: ti, x, z, taker: null, done: false }; ball.owner = null; ball.shot = null; ball.passTo = null;
  resetBall(x, z); const t = team(ti);
  let tk; if (type === 'goalkick') tk = gkOf(ti); else if (type === 'pen') tk = t.filter(p => p.role === 'FW').sort((a, b) => b.st.sht - a.st.sht)[0] || t[10]; else tk = closestTo(t.filter(p => p.role !== 'GK'), x, z);
  M.sp.taker = tk; const off = type === 'throw' ? .6 : .5; const ang = Math.atan2(-x, -z * (type === 'throw' ? 1 : 0) + (type === 'corner' ? 0 : 0));
  let px = x, pz = z; if (type === 'throw') pz = z + Math.sign(z) * off; else if (type === 'corner') { px = x + Math.sign(x) * .5; pz = z + Math.sign(z) * .5; } else { px = x - M.dir[ti] * .6; }
  place(tk, px, pz); tk.yaw = Math.atan2(-px * (type === 'throw' ? .2 : 1) + (type === 'throw' ? 0 : 0), -pz); if (type !== 'throw') tk.yaw = Math.atan2(goalX(ti) - px, -pz * .4);
  if (type === 'throw') tk.yaw = Math.atan2(M.dir[ti] * .5, -Math.sign(z));
  for (let h = 0; h < 2; h++) { const tm = M.human[h]; if (tm < 0) continue; if (tm === ti && type !== 'goalkick') M.ctrl[h] = tk; else if (tm !== ti) M.ctrl[h] = closestTo(team(tm).filter(p => p.role !== 'GK'), x, z); }
  for (const p of M.players) if (p !== tk) { p.stun = 0; p.act = null; const [hx, hz] = setSpot(p, type, ti, x, z); p.tx = hx; p.tz = hz; if (type === 'pen' || type === 'corner' || type === 'goalkick') { p.x = lerp(p.x, hx, .7); p.z = lerp(p.z, hz, .7); } }
  sfx('whistle', .6);
  const names = { throw: '스로인', corner: '코너킥', goalkick: '골킥', free: '프리킥', pen: '페널티킥!' }; banner(names[type], M[ti ? 't1' : 't0'].n, type === 'pen' ? '#ff4d5e' : null, 1.1);
  if (type === 'corner') M.stats.co[ti]++;
}
function setSpot(p, type, ti, x, z) {
  const att = p.team === ti; const gx = goalX(ti), s = Math.sign(gx);
  if (type === 'pen') { if (p.role === 'GK' && !att) return [gx, 0]; const i = M.players.indexOf(p) % 11; return [gx - s * (18 + (i % 3) * 2), -14 + i * 2.6]; }
  if (type === 'corner') { if (p.role === 'GK') return att ? homeXZ(p, gx * .4, 0, true) : [gx - s * .6, 0]; const i = p.d.i; if (att) { if (p.role === 'DF' && i % 2 === 0) return [gx * .1, (i - 2) * 6]; return [gx - s * (5 + (i % 4) * 2.5), -6 + (i % 5) * 3]; } else { if (p.role === 'FW' && i === 9) return [gx * .3, 0]; return [gx - s * (3 + (i % 4) * 2), -7 + (i % 6) * 2.8]; } }
  return homeXZ(p, x, z, att);
}
/* ---------- 공 차기 ---------- */
function kickBall(p, vx, vy, vz, spin) {
  ball.owner = null; ball.x = p.x + Math.sin(p.yaw) * .4; ball.z = p.z + Math.cos(p.yaw) * .4; ball.y = Math.max(PL.br, ball.y);
  ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.spin = spin || 0; ball.last = p; ball.kickBy = p; ball.kickT = M.t; p.kCd = .35; p.touches++;
  sfx('kick', Math.min(1, Math.hypot(vx, vy, vz) / 30));
  if (M.phase === 'set' || M.phase === 'kickoff') { M.phase = 'play'; M.phT = 0; M.sp = null; }
}
function passVel(p, tx, tz, kind) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1; const acc = (100 - p.st.pas) / 100 * (DIFFOF(p).err);
  const ea = (Math.random() - .5) * acc * (kind === 'ground' ? .12 : .2), c = Math.cos(ea), s = Math.sin(ea); const ux = (dx * c - dz * s) / d, uz = (dx * s + dz * c) / d;
  if (kind === 'ground') { const v = clamp(Math.sqrt(2 * 3.4 * d) + 3.5 + d * .05, 7, 30); return [ux * v, .3, uz * v]; }
  const vy = clamp(d * (kind === 'cross' ? .22 : kind === 'through' ? .14 : .2), 3, 13); const tf = 2 * vy / G; const vh = d / tf * (kind === 'through' ? 1.05 : .9) * (1 + (Math.random() - .5) * acc * .15);
  return [ux * vh, vy, uz * vh];
}
function doPass(p, target, kind) {
  kind = kind || 'ground'; let tx = target.x, tz = target.z; const lead = kind === 'through' ? 1.2 : .55;
  const d = Math.hypot(tx - p.x, tz - p.z); const tf = kind === 'ground' ? d / 16 : d / 13; tx += target.vx * tf * lead; tz += target.vz * tf * lead;
  if (kind === 'through') { tx += M.dir[target.team] * 5; } tx = clamp(tx, -PL.hx + 1, PL.hx - 1); tz = clamp(tz, -PL.hz + 1, PL.hz - 1);
  const [vx, vy, vz] = passVel(p, tx, tz, kind); p.act = kind === 'ground' ? 'pass' : 'kick'; p.actT = 0; p.yaw = Math.atan2(tx - p.x, tz - p.z);
  kickBall(p, vx, vy, vz, 0); ball.passTo = target; ball.passT = 0; M.stats.pa[p.team]++; target.run = null;
  for (let h = 0; h < 2; h++) if (M.human[h] === p.team && M.ctrl[h] === p) M.ctrl[h] = target;
}
function doShoot(p, power, aimZ) {
  const gx = goalX(p.team), gk = gkOf(1 - p.team); power = clamp(power, .15, 1);
  let tz = aimZ != null ? clamp(aimZ, -1, 1) * (PL.gw / 2 - .45) : (gk ? (gk.z > 0 ? -1 : 1) : 1) * (PL.gw / 2 - rand(.5, 1.4));
  const d = Math.hypot(gx - p.x, tz - p.z); const sk = p.st.sht / 100; const er = (1.15 - sk) * DIFFOF(p).err * (.55 + power * .9) * (1 + d / 22) * (ball.owner === p || ball.y < .3 ? 1 : 1.4);
  tz += (Math.random() - .5) * er * 7; let ty = .2 + power * power * 1.55 + (Math.random() - .35) * er * 3.2; if (ball.y > .5) ty += .3;
  const v = 15 + power * 14 + sk * 6; const tf = d / v; const vy = (ty - ball.y) / tf + .5 * G * tf * .92;
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
  let pr = .92 - reach / 4.2 * .7 - Math.max(0, sp - 24) / 40 + clamp(t - .5, 0, .8) * .55 + (gk.st.gk - 80) / 70 + (gk.team === M.human[0] || gk.team === M.human[1] ? .03 : df.gk) - (yy > 1.9 ? .12 : 0);
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
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
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
/* ---------- 규칙: 골 · 나간 공 ---------- */
function checkRules() {
  if (M.phase !== 'play') return;
  const ax = Math.abs(ball.x);
  if (ax > PL.hx + PL.br && Math.abs(ball.z) < PL.gw / 2 && ball.y < PL.gh) { const s = Math.sign(ball.x); const scorer = M.dir[0] === s ? 0 : 1; goal(scorer); return; }
  if (Math.abs(ball.z) > PL.hz + PL.br) { const lt = ball.last ? ball.last.team : 0; startSet('throw', 1 - lt, clamp(ball.x, -PL.hx + 1, PL.hx - 1), Math.sign(ball.z) * PL.hz); return; }
  if (ax > PL.hx + PL.br) { const s = Math.sign(ball.x); const defT = M.dir[0] === s ? 1 : 0; const lt = ball.last ? ball.last.team : 1 - defT;
    if (lt === defT) startSet('corner', 1 - defT, s * PL.hx, Math.sign(ball.z || 1) * PL.hz); else startSet('goalkick', defT, s * (PL.hx - 5.5), Math.sign(ball.z || 1) * 4); }
}
function goal(ti) {
  M.score[ti]++; M.phase = 'goal'; M.phT = 0; const sc = ball.last && ball.last.team === ti ? ball.last : null; const og = ball.last && ball.last.team !== ti;
  const min = Math.min(90, Math.floor(M.clock / 60) + 1); M.scorers.push({ team: ti, name: sc ? sc.d.name : (og ? (ball.last.d.name + ' (자책)') : '?'), min }); if (sc) { sc.goals++; sc.rating += 1.2; }
  STAD.jump = 6; STAD.jumpSide = null; sfx('goal'); banner('GOAL!!', `${M[ti ? 't1' : 't0'].f} ${sc ? sc.d.name : '자책골'} ${min}'`, '#ffd400', 3);
  comm(og ? '아… 자책골이에요!' : pick([`골!!! ${shortName(sc)}!!`, `${shortName(sc)}, 골망을 흔듭니다!`, `들어갔어요! ${shortName(sc)}!`])); M.goalTeam = ti; M.celeBy = sc;
  for (const p of M.players) { if (p.team === ti) { if (p === sc) { p.act = 'cele'; p.actT = 0; p.celeKind = randi(0, 2); } else if (p.role !== 'GK') { p.act = null; } } else if (p.role !== 'GK') { p.act = Math.random() < .5 ? 'sad' : null; p.actT = 0; } }
  vibrate([60, 40, 120]);
}
/* ---------- 선수 움직임 ---------- */
function maxSpd(p, sprint) { const s = p.st.spd / 100; return (sprint ? 7.0 + s * 2.4 : 5.2 + s * 1.6) * (ball.owner === p ? .9 : 1); }
function steer(p, tx, tz, spd, dt, face) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); let wx = 0, wz = 0; if (d > .25) { const s = Math.min(spd, d * 2.2); wx = dx / d * s; wz = dz / d * s; }
  accel(p, wx, wz, dt); if (face != null) p.yaw += angDiff(p.yaw, face) * Math.min(1, dt * 8);
}
function accel(p, wx, wz, dt) { const a = 16 * dt; const dvx = wx - p.vx, dvz = wz - p.vz, dv = Math.hypot(dvx, dvz); if (dv > a) { p.vx += dvx / dv * a; p.vz += dvz / dv * a; } else { p.vx = wx; p.vz = wz; } }
function movePlayers(dt) {
  for (const p of M.players) {
    if (p.stun > 0) { p.stun -= dt; p.vx *= 1 - dt * 4; p.vz *= 1 - dt * 4; }
    if (p.act === 'slide') { p.vx *= 1 - dt * 1.6; p.vz *= 1 - dt * 1.6; }
    p.x += p.vx * dt; p.z += p.vz * dt; const sp = Math.hypot(p.vx, p.vz);
    if (sp > .6 && p.act !== 'slide' && p.act !== 'dive' && !(p.faceLock > 0)) p.yaw += angDiff(p.yaw, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * (ball.owner === p ? 9 : 7));
    if (p.faceLock > 0) p.faceLock -= dt;
    p.x = clamp(p.x, -PL.hx - 4, PL.hx + 4); p.z = clamp(p.z, -PL.hz - 3, PL.hz + 3);
    p.kCd -= dt; p.tkCd -= dt; if (p.act) { p.actT += dt; const D = { kick: .5, pass: .38, cross: .5, slide: .8, dive: 1.3, throw: .7, header: .55, stumble: .7, catch: .4 }[p.act]; if (D && p.actT > D) p.act = null; }
  }
  // 몸끼리 겹치지 않게
  const L = M.players; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 < .49 && d2 > 1e-6) { const d = Math.sqrt(d2), o = (.7 - d) / 2; a.x -= dx / d * o; a.z -= dz / d * o; b.x += dx / d * o; b.z += dz / d * o; } }
}
/* ---------- 공 잡기 · 드리블 ---------- */
function ballControl(dt) {
  if (M.phase !== 'play') return;
  const o = ball.owner;
  if (o) {
    if (o.role === 'GK' && ball.held) { ball.x = o.x + Math.sin(o.yaw) * .35; ball.z = o.z + Math.cos(o.yaw) * .35; ball.y = 1.1; return; }
    const sp = Math.hypot(o.vx, o.vz); const lead = .42 + sp * .05; const tx = o.x + Math.sin(o.yaw) * lead, tz = o.z + Math.cos(o.yaw) * lead; const k = Math.min(1, dt * 14);
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
    const gkHands = p.role === 'GK' && inOwnBox(p, ball.x, ball.z); const reach = gkHands ? 1.25 : .78; const hmax = gkHands ? 2.5 : .95;
    if (d < reach && ball.y < hmax && d < bd) { best = p; bd = d; }
    else if (!gkHands && d < .9 && ball.y > .95 && ball.y < 2.3 && ball.vy < 2 && p.kCd <= 0 && d < bd) { best = p; bd = d; best.head = true; }
  }
  if (!best) return;
  if (best.head) { best.head = false; header(best); return; }
  if (best.role === 'GK' && inOwnBox(best, ball.x, ball.z) && !(ball.last && ball.last.team === best.team && ball.kickBy === ball.last && M.t - ball.kickT < 2 && ball.last !== best)) { gkCatch(best); return; }
  // 첫 터치: 너무 빠르면 튕길 수도
  if (bsp > 20 && Math.random() < .35 + (90 - best.st.drb) / 200) { ball.vx *= -.3; ball.vz *= -.3; ball.vy = 1.5; ball.last = best; best.kCd = .3; sfx('kick', .3); return; }
  gainBall(best);
}
function gainBall(p) {
  const prev = ball.last; ball.owner = p; ball.held = false; ball.last = p; ball.shot = null; p.touches++; p.holdT = 0; p.think = Math.min(p.think, DIFFOF(p).react * .6);
  if (ball.passTo) { if (ball.passTo.team === p.team) { M.stats.pc[p.team]++; } ball.passTo = null; }
  if (prev && prev.team !== p.team) M.lastTurn = M.t;
  for (let h = 0; h < 2; h++) if (M.human[h] === p.team) M.ctrl[h] = p;
  if (p.queued && M.t - p.queued.t < .45) { const q = p.queued; p.queued = null; humanAct(p, q.a, q.v, q.pow, q.h); }
}
function gkCatch(gk) { ball.owner = gk; ball.held = true; ball.last = gk; ball.shot = null; ball.vx = ball.vy = ball.vz = 0; gk.act = 'catch'; gk.actT = 0; gk.holdT = 0; gk.vx = gk.vz = 0; sfx('catch'); for (let h = 0; h < 2; h++) if (M.human[h] === gk.team) M.ctrl[h] = closestTo(team(gk.team).filter(p => p.role !== 'GK'), gk.x, gk.z); }
function inOwnBox(p, x, z) { const gx = ownGoalX(p.team); return Math.abs(x - gx) < 16.5 && Math.abs(z) < 20.16 && Math.sign(x) === Math.sign(gx); }
function header(p) {
  p.act = 'header'; p.actT = 0; p.kCd = .4; const gx = goalX(p.team); const dg = Math.hypot(gx - p.x, p.z);
  if (dg < 16) { const tz = (Math.random() - .5) * PL.gw * 1.1; const d = Math.hypot(gx - p.x, tz - p.z); const v = 13 + p.st.sht / 10; const ux = (gx - p.x) / d, uz = (tz - p.z) / d; kickBall(p, ux * v, rand(-1, 2.5), uz * v, 0); M.stats.sh[p.team]++; const onT = Math.abs(tz) < PL.gw / 2; if (onT) M.stats.ot[p.team]++; planSave(1 - p.team, onT); comm(`${shortName(p)}의 헤더!`); sfx('kick', .5); }
  else { const mate = bestPassTarget(p, true); if (mate) { const dx = mate.x - p.x, dz = mate.z - p.z, d = Math.hypot(dx, dz) || 1; const v = Math.min(14, d * .9 + 4); kickBall(p, dx / d * v, 3, dz / d * v, 0); ball.passTo = mate; } else kickBall(p, M.dir[p.team] * 10, 4, rand(-4, 4), 0); }
}
/* ---------- 태클 ---------- */
function tryTackle(p, slide) {
  const o = ball.owner; if (p.tkCd > 0 || p.stun > 0) return false; p.tkCd = slide ? 1.4 : .7;
  if (slide) { p.act = 'slide'; p.actT = 0; const f = p.yaw; p.vx = Math.sin(f) * 8.5; p.vz = Math.cos(f) * 8.5; p.faceLock = .8; return true; }
  if (!o || o.team === p.team || o.held) return false; const d = dist(p, o); if (d > 1.5) return false;
  const pr = clamp(.45 + (p.st.def - o.st.drb) / 120 + (p.team === M.human[0] || p.team === M.human[1] ? .03 : DIFFOF(p).tk), .12, .9);
  p.act = 'pass'; p.actT = .08; p.yaw = Math.atan2(o.x - p.x, o.z - p.z);
  if (Math.random() < pr) { looseBall(o, p); M.stats.tk[p.team]++; sfx('tackle'); comm(pick([`${shortName(p)}, 깔끔한 태클!`, '공을 빼앗았어요!'])); return true; }
  p.stun = .45; return false;
}
function slideHit(p) { // 슬라이딩 중 공 · 사람에 닿기
  if (p.act !== 'slide' || p.actT > .55) return; const fx_ = p.x + Math.sin(p.yaw) * .7, fz_ = p.z + Math.cos(p.yaw) * .7;
  const o = ball.owner; const dB = Math.hypot(ball.x - fx_, ball.z - fz_);
  if (dB < .9 && ball.y < .6) {
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
  M.phase = 'foul'; M.phT = 0; ball.owner = null; ball.vx = ball.vz = 0;
}
/* ---------- AI ---------- */
const DIFFOF = p => (p.team === M.human[0] || p.team === M.human[1]) ? DIFF[2] : DIFF[M.diff];
function bestPassTarget(p, any) {
  let best = null, bs = -1e9; const opp = team(1 - p.team);
  for (const m of team(p.team)) { if (m === p || (m.role === 'GK' && !any)) continue; const d = dist(p, m); if (d < 5 || d > 42) continue;
    const prog = (m.x - p.x) * M.dir[p.team]; let open = 99; for (const q of opp) { const t = clamp(((q.x - p.x) * (m.x - p.x) + (q.z - p.z) * (m.z - p.z)) / (d * d), 0, 1); const ex = p.x + (m.x - p.x) * t - q.x, ez = p.z + (m.z - p.z) * t - q.z; open = Math.min(open, Math.hypot(ex, ez) / (t * 1.5 + .5)); }
    let space = 99; for (const q of opp) space = Math.min(space, dist(q, m));
    const sc = prog * .85 + Math.min(open, 6) * 2 + Math.min(space, 8) * .9 - d * .06 + (m.role === 'FW' ? 2 : 0) + (Math.random() - .5) * 4 * DIFFOF(p).err;
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
    const runner = team(p.team).find(q => q.run && q.role !== 'GK' && (q.run.x - p.x) * fdx > 5);
    if (runner && block < 6 && Math.random() < .5) { doPass(p, runner, 'through'); return; }
    const pressured = nd < 2.3; const m = bestPassTarget(p, pressured && p.holdT > .3);
    const open = block > 7 && dg > 18; const want = pressured ? .7 : open ? .03 : block < 4 ? .4 : .1;
    if (m && (Math.random() < want || p.holdT > 3.2)) { const d = dist(p, m); const ahead = (m.x - p.x) * fdx; const fwdRun = m.role !== 'DF' && ahead > 6 && (m.run || Math.random() < .35); doPass(p, m, fwdRun && d > 10 ? 'through' : d > 30 ? 'long' : 'ground'); return; }
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
    if (o === p) { aiCarrier(p, dt); continue; }
    if (free && press[0] === p) { const pr = predictBall(.35); steer(p, pr[0], pr[1], maxSpd(p, true), dt); continue; }
    if (!att && !free) { const r = press[0] === p ? 1 : press[1] === p ? 2 : 0; aiDef(p, dt, r); } else aiOff(p, dt, att || free, o && o.team === ti);
  }
}
/* ---------- 세트피스 진행 ---------- */
function setPieceTick(dt) {
  const sp = M.sp; if (!sp) return; const tk = sp.taker; resetBallAt(sp);
  for (const p of M.players) if (p !== tk) steer(p, p.tx, p.tz, maxSpd(p, false), dt, Math.atan2(ball.x - p.x, ball.z - p.z)); else { p.vx = p.vz = 0; }
  if (sp.type === 'throw') { tk.act = 'throw'; tk.actT = 0; }
  if (sp.type === 'pen') { const gk = gkOf(1 - sp.team); if (gk) { gk.x = lerp(gk.x, goalX(sp.team) - M.dir[sp.team] * .3, .1); gk.z = lerp(gk.z, 0, .1); gk.yaw = Math.atan2(-M.dir[sp.team], 0); } }
  const hum = [0, 1].some(h => M.human[h] === sp.team && M.ctrl[h] === tk);
  if (M.phT > (hum ? 12 : 1.7) && !sp.done) { sp.done = true; aiSetPiece(tk, sp); }
}
function resetBallAt(sp) { if (sp.type === 'throw') { const tk = sp.taker; ball.x = tk.x; ball.z = tk.z; ball.y = 2.15; } else { ball.x = sp.x; ball.z = sp.z; ball.y = PL.br; } ball.vx = ball.vy = ball.vz = 0; }
function aiSetPiece(tk, sp) {
  if (sp.type === 'pen' || (sp.type === 'free' && Math.hypot(goalX(sp.team) - sp.x, sp.z) < 28)) { doShoot(tk, sp.type === 'pen' ? rand(.5, .8) : rand(.6, .9), rand(-1, 1)); return; }
  if (sp.type === 'corner') { const gx = goalX(sp.team); const [vx, vy, vz] = passVel(tk, gx - M.dir[sp.team] * rand(5, 10), rand(-5, 5), 'cross'); tk.act = 'cross'; tk.actT = 0; kickBall(tk, vx, vy, vz, -Math.sign(sp.z) * Math.sign(sp.x) * 1.5); return; }
  if (sp.type === 'throw') { const m = closestTo(team(sp.team).filter(q => q !== tk && q.role !== 'GK'), tk.x, tk.z); throwIn(tk, m.x, m.z); return; }
  const m = bestPassTarget(tk, true) || closestTo(team(sp.team).filter(q => q !== tk), tk.x, tk.z); doPass(tk, m, sp.type === 'goalkick' ? 'long' : dist(tk, m) > 26 ? 'long' : 'ground');
}
function throwIn(tk, tx, tz) { const dx = tx - tk.x, dz = tz - tk.z, d = Math.hypot(dx, dz) || 1; const v = clamp(d * .9 + 3, 6, 15); tk.act = 'throw'; tk.actT = .35; kickBall(tk, dx / d * v, 2.4, dz / d * v, 0); ball.y = 2.1; tk.kCd = .5; M.stats.pa[tk.team]++; const m = closestTo(team(tk.team).filter(q => q !== tk), tx, tz); ball.passTo = m; for (let h = 0; h < 2; h++) if (M.human[h] === tk.team) M.ctrl[h] = m; }
/* ---------- 한 프레임 ---------- */
function matchTick(dt) {
  if (!M.on) return; M.t += dt; M.phT += dt;
  const P = M.phase;
  if (P === 'play') {
    M.clock += dt * 90 * 60 / (M.len * 60);
    const halfEnd = M.half === 1 ? 45 * 60 : 90 * 60;
    if (M.clock >= halfEnd && !ball.shot && (!ball.owner || Math.abs(ball.x) < PL.hx - 20)) { M.clock = halfEnd; endHalf(); return; }
    humanTick(dt); teamAI(0, dt); teamAI(1, dt); movePlayers(dt); for (const p of M.players) slideHit(p); ballPhys(dt); ballControl(dt); checkRules();
    if (ball.passTo) { ball.passT += dt; if (ball.passT > 4) ball.passTo = null; }
  } else if (P === 'kickoff') {
    for (const p of M.players) { p.vx = p.vz = 0; } ball.owner = null; resetBall(0, 0);
    const hum = [0, 1].some(h => M.human[h] === M.koTeam); if (hum) humanTick(dt, true);
    if (M.phT > (hum ? 6 : 1.4)) { doPass(M.koTaker, M.koMate, 'ground'); }
  } else if (P === 'set') { humanTick(dt, true); setPieceTick(dt); movePlayers(dt); }
  else if (P === 'goal') {
    const sc = M.celeBy; for (const p of M.players) { if (p === sc) { const tx = clamp(p.x + M.dir[p.team] * -.5, -PL.hx + 2, PL.hx - 2); steer(p, tx, clamp(p.z * 1.02, -PL.hz + 2, PL.hz - 2) + Math.sign(p.z || 1) * 2, 6, dt); if (!p.act) { p.act = 'cele'; p.actT = 0; } } else if (p.team === M.goalTeam && sc && p.role !== 'GK') steer(p, sc.x, sc.z, 6.5, dt); else { p.vx *= .9; p.vz *= .9; } }
    movePlayers(dt); ballPhys(dt);
    if (M.phT > 3.2) { if (REC.frames.length > 40 && !M.noReplay) startReplay(() => kickoff(1 - M.goalTeam)); else kickoff(1 - M.goalTeam); }
  } else if (P === 'foul') { movePlayers(dt); for (const p of M.players) { p.vx *= .9; p.vz *= .9; } if (M.phT > .9 && M.foulNext) { const f = M.foulNext; M.foulNext = null; startSet(f[0], f[1], f[2], f[3]); } }
  else if (P === 'half') { if (M.phT > 3.5) { M.half = 2; M.dir = [-1, 1]; kickoff(1); banner('후반전 시작', null, '#22d3ee', 1.4); } }
  else if (P === 'over') { for (const p of M.players) { p.vx *= .9; p.vz *= .9; } movePlayers(dt); }
  // 사람 · 공 메시 · 애니메이션
  for (const p of M.players) animPlayer(p, dt);
  if (P !== 'replay') REC.push();
}
function endHalf() {
  sfx('whistle', 1); sfx('whistle', 1, .35);
  if (M.half === 1) { M.phase = 'half'; M.phT = 0; banner('하프타임', `${M.t0.f} ${M.score[0]} : ${M.score[1]} ${M.t1.f}`, '#22d3ee', 3.2); comm('전반전이 끝났어요.'); }
  else { M.phase = 'over'; M.phT = 0; const w = M.score[0] === M.score[1] ? -1 : M.score[0] > M.score[1] ? 0 : 1; for (const p of M.players) { p.act = w < 0 ? null : p.team === w ? 'clap' : 'sad'; p.actT = 0; } banner('경기 종료', `${M.t0.f} ${M.score[0]} : ${M.score[1]} ${M.t1.f}`, '#ffd400', 3); STAD.jump = 3; setTimeout(showResult, 3200); }
}
/* ---------- 그리기 ---------- */
function animPlayer(p, dt) {
  const P = p.P; P.root.position.set(p.x, 0, p.z); P.root.rotation.y = p.yaw;
  const sp = Math.hypot(p.vx, p.vz); const an = sp > 4.6 ? 'run' : sp > .5 ? 'walk' : 'idle'; setAnim(P, an, an === 'run' ? clamp(sp / 6.4, .8, 1.5) : an === 'walk' ? clamp(sp / 1.6, .6, 2) : 1);
  P.mixer.update(dt); footballPose(p);
}
function syncBallMesh(dt) {
  const m = ball.mesh; const dx = ball.x - m.position.x, dz = ball.z - m.position.z; m.position.set(ball.x, ball.y, ball.z);
  const d = Math.hypot(dx, dz); if (d > 1e-4 && d < 5) { const ax = new T.Vector3(dz, 0, -dx).normalize(); m.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(ax, d / PL.br)); }
  ball.shadow.position.set(ball.x, .02, ball.z); const s = 1 + ball.y * .25; ball.shadow.scale.set(s, s, s); ball.shadow.material.opacity = clamp(.4 - ball.y * .05, .08, .4);
}
const shortName = p => p ? p.d.name.split(' ').pop() : '';
