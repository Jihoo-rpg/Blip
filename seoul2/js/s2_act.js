'use strict';
/* ===== STA 2: 활동 — 스트리트 레이스 · 광란 · 자경단 · 숨은 꾸러미 · 수출 · 청부 · 거리 사건 · 부동산 ===== */
const ACT = { marks: [], blips: [], ev: null, evT: 50 };
function actHud(html) { const e = $('#race'); if (!e) return; e.hidden = !html; if (html) e.innerHTML = html; }
function grid(i, j) { return [i * P, j * P]; }
/* ---------------- 스트리트 레이스 ---------------- */
const RACES = [
  { id: 'r1', n: '도심 스프린트', pts: [[-2, -2], [0, -2], [0, 0], [2, 0], [2, 2], [0, 2]], prize: 40000 },
  { id: 'r2', n: '한강 다리 질주', pts: [[-3, -3], [-3, 3], [0, 3], [0, 7]], prize: 55000 },
  { id: 'r3', n: '외곽 순환 (2바퀴)', pts: [[1, -3], [3, -3], [3, 3], [1, 3], [1, -3], [3, -3], [3, 3], [1, 3], [1, -3]], prize: 90000 },
  { id: 'r4', n: '서울 대횡단', pts: [[3, -3], [3, -1], [-1, -1], [-1, 1], [-3, 1], [-3, 3], [2, 3]], prize: 70000 }];
function raceStart(R_) { const a = grid(...R_.pts[0]), b = grid(...R_.pts[1]); const dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]); return { x: a[0] + dx * 16, z: a[1] + dz * 16, dx, dz }; }
function startRace(R_) {
  const c = PL.car; if (!c || c.dead) { toast('🏁 차를 타고 와야 레이스를 할 수 있어요'); return; }
  MI = { act: 'race', noGarage: true }; for (const k in GIVERS) rmMarker(GIVERS[k].M);
  const s = raceStart(R_), yaw = Math.atan2(s.dx, s.dz), side = [s.dz, -s.dx];
  const cps = R_.pts.slice(1).map(p => grid(...p)); const racers = [];
  const put = (car, lane, back) => { car.x = s.x + side[0] * lane - s.dx * back; car.z = s.z + side[1] * lane - s.dz * back; car.yaw = yaw; car.v = 0; car.vl = 0; placeCar(car); };
  put(c, -2.1, 0); PL.x = c.x; PL.z = c.z; CAMS.yaw = yaw; CAMS.pitch = .2; CAMS.manualT = 9;
  const cols = ['#d10f1f', '#f2c200', '#1f5ea8'], names = ['빨강 R8', '노랑 번개', '파랑 유령'];
  for (let i = 0; i < 3; i++) { const r = makeCar(i === 2 ? 'bike' : 'sports', cols[i]); r.S = Object.assign({}, r.S); r.mission = true; r.flee = true; r.racer = { cp: 0, done: 0, name: names[i], base: r.S.max * (.9 + i * .03) }; r.drvP = true; r.drvLook = randomLook(false); if (r.S.bike) addRider(r, Object.assign(randomLook(false), { helmet: '#ffcc33' })); put(r, [2.1, -2.1, 2.1][i], [0, 9, 9][i]); scene.add(r.g); CARS.push(r); racers.push(r); }
  // 길에 있는 다른 차 치우기
  for (let i = CARS.length - 1; i >= 0; i--) { const o = CARS[i]; if (o.ai && Math.hypot(o.x - s.x, o.z - s.z) < 40) removeCar(o); }
  let cp = 0, M = null, M2 = null, cd = 3.2, place = 0, outT = 0; const lastCd = { v: 4 };
  const mark = () => { rmMarker(M); rmMarker(M2); const p = cps[cp]; M = mkMarker(p[0], p[1], cp === cps.length - 1 ? '#ffffff' : '#ffcc33', { r: 3.2 }); if (cps[cp + 1]) M2 = mkMarker(cps[cp + 1][0], cps[cp + 1][1], '#7a6a2a', { r: 2 }); G.waypoint = p; };
  mark(); xpPop('🏁 ' + R_.n);
  const prog = car => car.racer ? car.racer.cp * 1e4 - Math.hypot(car.x - cps[Math.min(car.racer.cp, cps.length - 1)][0], car.z - cps[Math.min(car.racer.cp, cps.length - 1)][1]) : cp * 1e4 - Math.hypot(PL.x - cps[cp][0], PL.z - cps[cp][1]);
  MI.upd = dt => {
    if (cd > 0) { cd -= dt; c.v = 0; for (const r of racers) r.v = 0; const n = Math.ceil(cd); if (n !== lastCd.v) { lastCd.v = n; if (n > 0) { big(String(n), R_.n, '', 900); tone(440, .15, .3, 'square'); } else { big('GO!', '', 'pass', 900); tone(880, .4, .3, 'square'); } } return; }
    // 라이벌 AI
    for (const r of racers) { const rc = r.racer; if (rc.done || r.dead) continue; const t = cps[rc.cp]; const want = Math.atan2(t[0] - r.x, t[1] - r.z), a = angDiff(r.yaw, want); const ahead = prog(r) - prog(c);
      r.S.max = rc.base * (ahead > 1.2e4 ? .86 : ahead < -1.2e4 ? 1.12 : 1); let inp = { thr: 1, steer: clamp(a * 2.2, -1, 1) }; const dd = Math.hypot(t[0] - r.x, t[1] - r.z); if (Math.abs(a) > .5 && r.v > 16 && dd < 40) inp = { brk: .7, steer: clamp(a * 2.2, -1, 1) };
      if (r.rev > 0) { r.rev -= dt; inp = { brk: 1, steer: r.revS }; } else if (Math.abs(r.v) < 1.5) { r.stk = (r.stk || 0) + dt; if (r.stk > 1.2) { r.rev = 1; r.revS = -inp.steer || 1; r.stk = 0; } } else r.stk = 0;
      const hit = drive(r, inp, dt); if (hit > 6) carHurt(r, hit * .5, false); placeCar(r);
      if (dd < 12) { rc.cp++; if (rc.cp >= cps.length) { rc.done = ++place; popLabel(r.x, r.y + 2.5, r.z, rc.name + ' 골인!', '#fff', 2); } } }
    if (PL.car !== c) { outT += dt; setPrompt('🏁 차에 다시 타요! ' + Math.ceil(10 - outT) + '초'); if (outT > 10) missionFail('차에서 내렸어요'); return; } outT = 0; if (c.dead) { missionFail('차가 부서졌어요'); return; }
    if (inMarker(M, PL.x, PL.z) || Math.hypot(PL.x - cps[cp][0], PL.z - cps[cp][1]) < 8) { cp++; tone(1200, .08, .2, 'square'); if (cp >= cps.length) { const pl = ++place; const pay = [R_.prize, Math.round(R_.prize * .45), Math.round(R_.prize * .2), 0][pl - 1]; SV.races[R_.id] = Math.min(SV.races[R_.id] || 9, pl); actHud(''); G.waypoint = null;
        if (pl === 1) { ach('race1'); if (RACES.every(q => SV.races[q.id] === 1)) ach('raceAll'); } if (pay) { missionPass(pay); big(pl === 1 ? '🏆 우승!' : pl + '등!', R_.n + ' · +' + won(pay), 'pass', 3500); } else missionFail('꼴찌… 다시 도전해요'); return; } mark(); }
    const all = [{ me: 1, p: prog(c) }].concat(racers.map(r => ({ p: r.racer.done ? 9e9 - r.racer.done : prog(r) }))).sort((a, b) => b.p - a.p); const pos = all.findIndex(o => o.me) + 1;
    actHud(`🏁 <b>${R_.n}</b><br>순위 <em>${pos}/4</em> · 체크포인트 ${cp}/${cps.length}`); obj(`🏁 노란 <em>체크포인트</em>를 따라 달려요!`);
  };
  MI.cleanup = () => { rmMarker(M); rmMarker(M2); actHud(''); G.waypoint = null; for (const r of racers) { r.flee = false; r.mission = false; r.parked = true; r.racer = null; } };
}
/* ---------------- 광란 (해골) ---------------- */
const RAMPAGES = [
  { id: 'p1', w: 'fist', n: '맨주먹 광란', goal: 10, t: 50, txt: '50초 안에 맨주먹으로 10명 쓰러뜨리기', prize: 25000 },
  { id: 'p2', w: 'smg', n: '기관단총 광란', goal: 20, t: 60, txt: '60초 안에 20명 쓰러뜨리기', prize: 35000 },
  { id: 'p3', w: 'rpg', n: '로켓포 광란', goal: 8, t: 60, txt: '60초 안에 차 8대 터뜨리기', cars: 1, prize: 50000 },
  { id: 'p4', w: 'grenade', n: '수류탄 광란', goal: 12, t: 55, txt: '55초 안에 수류탄으로 12명 쓰러뜨리기', prize: 40000 }];
const skullTex = ctex(128, 128, (g, W, H) => { g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💀', W / 2, H / 2 + 6); });
function startRampage(Rp) {
  MI = { act: 'rampage' }; for (const k in GIVERS) rmMarker(GIVERS[k].M);
  const keep = { ammo: Object.assign({}, SV.ammo || {}), wep: SV.wep }; SV.ammo = SV.ammo || {}; if (Rp.w !== 'fist') SV.ammo[Rp.w] = 999; SV.wep = Rp.w; refreshGun();
  let cnt = 0; const seen = new Set(); timer(Rp.t); big('광란!', Rp.txt, 'dead', 2600); SFX.star(); slowmo(.8, .35);
  MI.on = (e, a) => { if (Rp.cars ? e === 'boom' : (e === 'ko' || e === 'kill')) { if (seen.has(a)) return; seen.add(a); cnt++; popLabel(a.x, (a.y || 0) + 2.4, a.z, cnt + '/' + Rp.goal, '#ff4d4d', 1); if (cnt >= Rp.goal) { const first = !SV.rampage.includes(Rp.id); if (first) SV.rampage.push(Rp.id); ach('rampage'); missionPass(Rp.prize * (first ? 1 : .5)); big('광란 완료!', '+' + won(Rp.prize * (first ? 1 : .5)), 'pass', 3000); } } };
  MI.upd = () => { actHud(`💀 <b>${Rp.n}</b><br><em>${cnt} / ${Rp.goal}</em>`); obj(`💀 ${Rp.txt}`); };
  MI.timeUp = () => missionFail(`시간 끝! ${cnt}/${Rp.goal}`);
  MI.cleanup = () => { actHud(''); SV.ammo = keep.ammo; SV.wep = keep.wep; refreshGun(); };
}
/* ---------------- 자경단 (경찰차) ---------------- */
function startVigilante() {
  if (MI) return; if (!PL.car || PL.car.type !== 'police') { toast('🚨 자경단은 경찰차를 타고 V 키 (🚨 버튼)로 시작해요'); return; }
  MI = { act: 'vigil', noGarage: true }; for (const k in GIVERS) rmMarker(GIVERS[k].M); const pc = PL.car; let lvl = 0, crook = null, earned = 0;
  const next = () => { lvl++; const pos = laneNear(PL.x, PL.z, 80, 170) || laneNear(PL.x, PL.z, 40, 220); if (!pos) { missionFail('범인이 없어요'); return; } crook = makeCar(lvl % 3 === 0 ? 'sports' : lvl % 2 ? 'sedan' : 'suv', '#222'); laneSpawn(crook, pos.x, pos.z, pos.f, 0); crook.ai = null; crook.flee = true; crook.mission = true; crook.drvP = true; crook.drvLook = LOOKS.thug(); crook.maxHp = crook.hp = 120 + lvl * 25; crook.S = Object.assign({}, crook.S); crook.S.max *= .82 + Math.min(.2, lvl * .03); scene.add(crook.g); CARS.push(crook); MI.blipCar = crook; timer(Math.max(60, 120 - lvl * 5)); note(`🚨 <b>자경단 ${lvl}단계</b><br>도망치는 범인 차를 부수거나 멈춰요!`, 4000); pc.siren = true; };
  MI.upd = dt => {
    if (PL.car !== pc) { MI.outT = (MI.outT || 0) + dt; setPrompt('🚨 경찰차로 돌아가요! ' + Math.ceil(12 - MI.outT)); if (MI.outT > 12) end(); return; } MI.outT = 0;
    if (crook && !crook.dead && crook.hp > crook.maxHp * .12) { fleeDrive(crook, dt); actHud(`🚨 <b>자경단 ${lvl}단계</b><br>범인 차 ${Math.round(crook.hp / crook.maxHp * 100)}% · ${Math.round(Math.hypot(crook.x - PL.x, crook.z - PL.z))}m`); obj('🚨 빨간 점 <em>범인 차</em>를 들이받거나 쏴서 멈춰요'); }
    else if (crook) { const pay = 3000 * lvl; earned += pay; addMoney(pay); SFX.cash(); xp(30 + lvl * 10, '자경단'); big('범인 검거!', `${lvl}단계 · +${won(pay)}`, 'pass', 2200); SV.vigil = Math.max(SV.vigil, lvl); if (lvl >= 5) ach('vig5'); crook.flee = false; crook.mission = false; crook.parked = true; crook.v *= .3; const L = carLeft(crook); const n = spawnNPC(crook.x + L[0] * 2, crook.z + L[1] * 2, 'thug'); knockNPC(n, 8, L[0] * 2, L[1] * 2); n.afterKo = 'flee'; crook = null; setTimeout(() => { if (MI && MI.act === 'vigil') next(); }, 2500); }
  };
  const end = () => { const m = MI; MI = null; obj(''); $('#timer').hidden = true; actHud(''); if (crook) { crook.flee = false; crook.mission = false; } toast(`🚨 자경단 끝! ${lvl - (crook ? 1 : 0)}단계 · 번 돈 ${won(earned)}`); setupGivers(); };
  MI.timeUp = () => { if (crook) { crook.flee = false; crook.mission = false; crook.ai = null; crook.parked = true; } big('범인을 놓쳤어요', '자경단 끝', 'dead', 2500); end(); };
  MI.cleanup = () => { actHud(''); if (crook) { crook.flee = false; crook.mission = false; } };
  next();
}
addEventListener('keydown', e => { if (e.code === 'KeyV' && G.on && !G.paused && $('#phone').hidden) startVigilante(); });
/* ---------------- 청부 의뢰 ---------------- */
function startContract() {
  if (MI) { toast('지금 하는 일을 먼저 끝내요'); return; }
  const lv = SV.hits + 1, s = sidewalkNear(PL.x, PL.z, 110, 200) || sidewalkNear(PL.x, PL.z, 60, 240); if (!s) { toast('지금은 의뢰가 없어요'); return; }
  MI = { act: 'hit' }; for (const k in GIVERS) rmMarker(GIVERS[k].M);
  const names = ['사채업자 최', '배신자 김', '마약상 박', '부패 형사 오', '조직 보스 강']; const nm = names[(lv - 1) % names.length];
  const tg = spawnNPC(s[0], s[1], 'thug', { w: 0, skin: '#e9c9ad', top: '#f2f2f2', bot: '#1b1b1d', shoe: '#121212', beard: lv % 2 === 0, head: 'hat', hat: '#7a1f2b', glasses: true, s: 1.05, wide: 1.15 }); tg.mission = true; tg.st = 'stand'; tg.hp = tg.maxHp = 160 + lv * 20; tg.money = 0;
  const guards = []; for (let i = 0; i < Math.min(5, 1 + lv); i++) { const a = i / 3 * 6.28; guards.push(hostile(s[0] + Math.cos(a) * 2.5, s[1] + Math.sin(a) * 2.5, lv > 1 ? pick(['pistol', 'smg']) : 'pistol')); guards[i].st = 'stand'; }
  MI.blip = tg; timer(240); note(`🎯 <b>청부 의뢰 #${lv}</b><br>목표: ${nm}<br>경호원이 ${guards.length}명 있어요. 조심해요!`, 5000); let alert = false;
  MI.upd = () => { const d = Math.hypot(tg.x - PL.x, tg.z - PL.z); if (!alert && (d < 18 || tg.hp < tg.maxHp || guards.some(g => g.hp < g.maxHp))) { alert = true; for (const g of guards) if (!g.dead && g.ko <= 0) g.st = g.gun ? 'shoot' : 'fight'; tg.st = 'flee'; tg.threat = [PL.x, PL.z]; tg.t = 999; popLabel(tg.x, tg.y + 2.2, tg.z, '저놈 잡아!', '#fff', 1.5); }
    if (alert && tg.st === 'flee') { tg.threat = [PL.x, PL.z]; tg.t = 5; }
    if (tg.dead || tg.ko > 0) { const pay = 30000 + lv * 15000; SV.hits++; if (SV.hits >= 3) ach('hit3'); missionPass(pay); return; }
    obj(`🎯 <em>${nm}</em>을(를) 처리해요 · ${Math.round(d)}m`); actHud(`🎯 <b>청부 #${lv}</b><br>${nm}`); };
  MI.timeUp = () => missionFail('목표가 도망쳤어요');
  MI.cleanup = () => { actHud(''); for (const g of guards) if (NPCS.includes(g)) { g.mission = false; g.leave = true; } if (NPCS.includes(tg)) { tg.mission = false; tg.leave = true; } };
}
/* ---------------- 숨은 꾸러미 ---------------- */
const PKG = { list: [], tex: null };
function buildPackages() {
  const r = mulberry(4242); const geo = new T.BoxGeometry(.6, .6, .6); const mat = new T.MeshStandardMaterial({ color: lin('#2bd96b'), emissive: lin('#0d6b2a'), emissiveIntensity: .9, map: ctex(64, 64, (g, W, H) => { g.fillStyle = '#2bd96b'; g.fillRect(0, 0, W, H); g.strokeStyle = '#0a4a1e'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6); g.fillStyle = '#063'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', W / 2, H / 2 + 3); }) });
  for (let k = 0; k < 30; k++) { let x, z; for (let t = 0; t < 30; t++) { const bi = Math.floor(r() * 2 * NR) - NR, bj = Math.floor(r() * 2 * NR) - NR, c = ringCorner(bi, bj, Math.floor(r() * 4)), c2 = ringCorner(bi, bj, Math.floor(r() * 4)); const f = r(); x = lerp(c[0], c2[0], f); z = lerp(c[1], c2[1], f); const p = { x, z }; collideCircle(p, .5, 0); if (Math.hypot(p.x - x, p.z - z) < .01) break; }
    if (k >= 27) { x = [6, -6, 3][k - 27]; z = [300, 420, 540][k - 27]; } // 다리 위
    const m = new T.Mesh(geo, mat); m.position.set(x, groundY(x, z) + .7, z); m.visible = !SV.pk.includes(k); scene.add(m); PKG.list.push({ k, x, z, m }); }
}
/* ---------------- 수출 주문 (부두) ---------------- */
const EXPORT = { x: 150, z: LIM + RH + 9 };
function exportList() { const d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); const r = mulberry(seed); const types = ['sports', 'suv', 'police', 'taxi', 'truck', 'bike', 'armored', 'sedan', 'bus', 'scooter']; const out = []; while (out.length < 4) { const t = types[Math.floor(r() * types.length)]; if (!out.includes(t)) out.push(t); } const k = d.toDateString(); if (!SV.expDay || SV.expDay.k !== k) SV.expDay = { k, done: [] }; return out; }
const EXPAY = { sports: 60000, suv: 30000, police: 70000, taxi: 22000, truck: 26000, bike: 35000, armored: 120000, sedan: 18000, bus: 50000, scooter: 9000 };
/* ---------------- 부동산 ---------------- */
const PROPS = [['mart', '🏪 편의점 체인', 150000, 2500], ['chicken', '🍗 서울치킨 본점', 300000, 5000], ['carwash', '🚿 셀프 세차장', 450000, 7500], ['club', '🪩 강남 클럽', 900000, 15000], ['taxi', '🚕 택시 회사', 1300000, 22000], ['tower', '🏙️ 한강뷰 펜트하우스', 2500000, 40000]];
function buyProp(id) { const p = PROPS.find(q => q[0] === id); if (!p || SV.props[id]) return false; if (SV.money < p[2]) { toast('💸 돈이 부족해요'); SFX.fail(); return false; } addMoney(-p[2]); SV.props[id] = 1; SFX.pass(); big('구입 완료!', p[1] + ' · 1시간마다 ' + won(p[3]), 'pass', 3000); xp(200, '사업 시작'); ach('prop'); if (PROPS.every(q => SV.props[q[0]])) ach('prop6'); save(); return true; }
function propIncome() { return PROPS.reduce((s, p) => s + (SV.props[p[0]] ? p[3] : 0), 0); }
/* ---------------- 지도에 표시 ---------------- */
const _mapIconsS2 = mapIcons; mapIcons = function () {
  const out = _mapIconsS2(); if (!G.on) return out;
  if (!MI) { for (const R_ of RACES) { const s = raceStart(R_); out.push({ x: s.x, z: s.z, t: '🏁', c: '#ffffff', small: Math.hypot(s.x - PL.x, s.z - PL.z) > 160 }); } for (const m of ACT.marks) if (m.kind === 'skull') out.push({ x: m.x, z: m.z, t: '💀', c: '#ff4d4d', small: 1 }); out.push({ x: EXPORT.x, z: EXPORT.z, t: '🚢', c: '#4fc3ff', small: 1 }); }
  if (MI && MI.blip && NPCS.includes(MI.blip)) out.push({ x: MI.blip.x, z: MI.blip.z, t: '', c: '#ff3040', mk: 1 });
  if (ACT.ev && ACT.ev.blip) { const b = ACT.ev.blip; out.push({ x: b.x, z: b.z, t: '', c: ACT.ev.col || '#ff3040', mk: 1 }); }
  for (const R_ of RAMPS) if (!SV.stunts.includes(R_.id) && Math.hypot(R_.x - PL.x, R_.z - PL.z) < 140) out.push({ x: R_.x, z: R_.z, t: '🛫', c: '#f2c200', small: 1 });
  return out;
};
/* ---------------- 시작 지점 마커 ---------------- */
function buildActs() {
  for (const R_ of RACES) { const s = raceStart(R_); const M = mkMarker(s.x, s.z, '#ffffff', { r: 2.2 }); ACT.marks.push({ kind: 'race', R_, M, x: s.x, z: s.z }); }
  const skullPos = [[-1, -1, 2], [1, 1, 0], [2, -2, 3], [-2, 1, 1]];
  RAMPAGES.forEach((Rp, i) => { const [bi, bj, k] = skullPos[i]; const c = ringCorner(bi, bj, k); const sp = new T.Sprite(new T.SpriteMaterial({ map: skullTex, depthTest: true })); sp.scale.set(1.3, 1.3, 1); sp.position.set(c[0], 1.4, c[1]); scene.add(sp); ACT.marks.push({ kind: 'skull', Rp, sp, x: c[0], z: c[1] }); });
  const em = mkMarker(EXPORT.x, EXPORT.z, '#4fc3ff', { r: 3 }); ACT.marks.push({ kind: 'export', M: em, x: EXPORT.x, z: EXPORT.z });
  buildPackages();
}
S2TICK.push(dt => {
  if (!ACT.built && G.on) { ACT.built = true; buildActs(); }
  // 마커 보이기/숨기기 · 시작
  for (const m of ACT.marks) { const vis = !MI; if (m.M) m.M.g.visible = vis; if (m.sp) { m.sp.visible = vis; m.sp.position.y = 1.4 + Math.sin(G.t * 3) * .2; }
    if (!vis || G.dead) continue; const d = Math.hypot(PL.x - m.x, PL.z - m.z);
    if (m.kind === 'race' && d < 5 && PL.car) { setPrompt('🏁 ' + m.R_.n + ' — 멈추면 시작'); if (Math.abs(PL.car.v) < 2) askMission(`🏁 스트리트 레이스 · ${m.R_.n}`, `라이벌 3명과 체크포인트 ${m.R_.pts.length - 1}개를 달려요.\n1등 상금 ${won(m.R_.prize)} · 2등 ${won(m.R_.prize * .45)} · 3등 ${won(m.R_.prize * .2)}\n${SV.races[m.R_.id] ? '최고 기록: ' + SV.races[m.R_.id] + '등' : '아직 도전 안 했어요'}\n🔥 Shift(니트로)를 아껴 써요!`, () => startRace(m.R_)); }
    if (m.kind === 'race' && d < 5 && !PL.car) setPrompt('🏁 차를 타고 오면 레이스를 시작해요');
    if (m.kind === 'skull' && d < 1.6 && !PL.car) askMission('💀 ' + m.Rp.n, m.Rp.txt + '\n무기는 미션 동안 무한으로 줘요.\n상금 ' + won(m.Rp.prize) + (SV.rampage.includes(m.Rp.id) ? ' (다시 하면 절반)' : ''), () => startRampage(m.Rp));
    if (m.kind === 'export' && d < 6) { const list = exportList(); const c = PL.car; if (!c) { setPrompt('🚢 수출 부두 — 주문한 차를 가져와요 (📱 활동 앱에서 목록 확인)'); continue; } const ok = list.includes(c.type) && !SV.expDay.done.includes(c.type);
      if (!ok) { setPrompt(list.includes(c.type) ? '🚢 오늘 이 차는 이미 받았어요' : '🚢 이 차는 주문에 없어요: ' + list.map(t => SPEC[t].name).join(', ')); continue; }
      if (Math.abs(c.v) < 2) { const pay = Math.round(EXPAY[c.type] * clamp(c.hp / c.maxHp, .3, 1) / 100) * 100; exitCar(); SV.expDay.done.push(c.type); SV.exports++; removeCar(c); addMoney(pay); SFX.cash(); big('수출 완료!', SPEC[c.type].name + ' · +' + won(pay), 'pass', 2500); xp(60, '수출'); if (SV.exports >= 5) ach('export5'); save(); } else setPrompt('🚢 멈추면 넘겨요'); }
  }
  // 꾸러미
  for (const p of PKG.list) { if (!p.m.visible) continue; p.m.rotation.y += dt * 2; p.m.position.y = groundY(p.x, p.z) + .7 + Math.sin(G.t * 2 + p.k) * .12; if (Math.abs(p.x - PL.x) < 1.4 && Math.abs(p.z - PL.z) < 1.4 && Math.abs(p.m.position.y - (PL.y + .8)) < 1.8) { p.m.visible = false; SV.pk.push(p.k); const n = SV.pk.length; addMoney(1000); SFX.cash(); xp(20); note(`📦 <b>숨은 꾸러미 ${n}/30</b>${n === 10 ? '<br>🎁 보상: 돌격소총!' : n === 20 ? '<br>🎁 보상: 로켓포!' : n === 30 ? '<br>🎁 모두 찾았어요! ₩300,000' : ''}`); if (n === 10) { giveWeapon('rifle', 180, false); ach('pk10'); } if (n === 20) giveWeapon('rpg', 8, false); if (n === 30) { addMoney(300000); ach('pkAll'); } save(); } }
  // 사업 수익 (게임 시간 1시간마다)
  const hr = Math.floor(DAY.t); if (ACT.hr == null) ACT.hr = hr; if (hr !== ACT.hr) { ACT.hr = hr; const inc = propIncome(); if (inc) { addMoney(inc); xpPop('🏢 사업 수익 +' + won(inc)); } }
  // 거리 사건
  streetEvents(dt);
});
/* ---------------- 거리 사건 ---------------- */
function streetEvents(dt) {
  const E = ACT.ev;
  if (E) { E.t -= dt; try { E.upd(dt); } catch (e) { console.error(e); ACT.ev = null; } if (ACT.ev && E.t <= 0) { E.end && E.end(false); ACT.ev = null; } return; }
  if (MI || G.dead || INSIDE) return; ACT.evT -= dt; if (ACT.evT > 0) return; ACT.evT = rand(55, 100);
  const kinds = ['snatch', 'cash', 'gang', 'snatch', 'cash']; if (DAY.night > .5) kinds.push('gang', 'gang'); const k = pick(kinds);
  if (k === 'snatch') evSnatch(); else if (k === 'cash') evCash(); else evGang();
}
function evSnatch() {
  const v = NPCS.find(n => !n.cop && !n.mission && !n.dead && n.ko <= 0 && n.look && n.look.w && Math.hypot(n.x - PL.x, n.z - PL.z) < 40 && Math.hypot(n.x - PL.x, n.z - PL.z) > 8); if (!v) return;
  const th = spawnNPC(v.x + 1, v.z + 1, 'ped', Object.assign(randomLook(false), { top: '#151515', head: 'cap', cap: '#151515' })); th.mission = true; th.st = 'flee'; th.threat = [v.x, v.z]; th.t = 999; th.hp = th.maxHp = 60; th.tough = false; th.spdK = 1;
  v.st = 'stand'; v.face = [th.x, th.z]; popLabel(v.x, v.y + 2.1, v.z, '내 가방! 도둑이야!', '#ff6b6b', 2.5); say(v, 'flee', true);
  ACT.ev = { t: 40, blip: th, col: '#ff3040', upd: () => { th.threat = [PL.x, PL.z]; th.t = 5; const d = Math.hypot(th.x - PL.x, th.z - PL.z); setPrompt('👜 소매치기를 잡아요! ' + Math.round(d) + 'm');
    if (th.ko > 0 || th.dead) { addMoney(8000); SFX.cash(); xp(60, '소매치기 검거'); SV.snatch++; ach('snatch'); popLabel(th.x, th.y + 1.5, th.z, '가방 회수! +₩8,000', '#7ee08a', 2.5); if (NPCS.includes(v) && !v.dead) { popLabel(v.x, v.y + 2.1, v.z, '고마워요!! 🙏', '#fff', 2.5); v.st = 'walk'; } th.mission = false; ACT.ev = null; } },
    end: () => { th.mission = false; th.leave = true; toast('👜 소매치기가 도망쳤어요…'); if (NPCS.includes(v)) v.st = 'walk'; } };
  note('👜 <b>소매치기다!</b><br>빨간 점 도둑을 쫓아가서 쓰러뜨리면 사례금을 받아요.', 4500);
}
function evCash() {
  const pos = laneNear(PL.x, PL.z, 70, 140); if (!pos) return; const c = makeCar('armored'); laneSpawn(c, pos.x, pos.z, pos.f, pos.li); c.drvLook = guardLook(); c.drvP = true; c.mission = true; scene.add(c.g); CARS.push(c); placeCar(c);
  ACT.ev = { t: 90, blip: c, col: '#ffcc33', upd: () => { if (c.dead || PL.car === c || c.hp < c.maxHp * .3) { const k = PL.car === c ? 3 : 5; for (let i = 0; i < k; i++) dropCash(c.x + rand(-3, 3), c.z + rand(-3, 3), 6000); if (PL.car === c) addMoney(10000); crime('jack', c.x, c.z); setWanted(Math.max(G.wanted, 2)); SFX.cash(); popLabel(c.x, c.y + 3, c.z, '돈이 쏟아진다!', '#7ee08a', 2.5); xp(80, '현금수송차'); c.mission = false; ACT.ev = null; } },
    end: () => { c.mission = false; } };
  note('💰 <b>현금수송차</b>가 근처를 지나가요!<br>노란 점 — 부수거나 뺏으면 돈이 쏟아져요. (경찰 주의 ★★)', 5000);
}
function evGang() {
  const s = sidewalkNear(PL.x, PL.z, 18, 34); if (!s || PL.car) return; const gs = []; for (let i = 0; i < 3; i++) { const n = spawnNPC(s[0] + rand(-2, 2), s[1] + rand(-2, 2), 'thug'); n.mission = true; n.st = 'fight'; n.t = 999; n.money = randi(3, 8) * 1000; if (i === 0 && SV.lvl >= 4) armNPC(n, 'pistol'), n.st = 'shoot'; gs.push(n); }
  popLabel(gs[0].x, gs[0].y + 2.2, gs[0].z, '어이, 거기! 돈 내놔!', '#fff', 2.5); say(gs[0], 'angry', true);
  ACT.ev = { t: 60, blip: gs[0], col: '#b04aff', upd: () => { const alive = gs.filter(n => !n.dead && n.ko <= 0); ACT.ev.blip = alive[0] || gs[0]; for (const n of alive) if (n.st !== 'fight' && n.st !== 'shoot') { n.st = n.gun ? 'shoot' : 'fight'; n.t = 999; } if (!alive.length) { xp(90, '깡패 소탕'); popLabel(PL.x, PL.y + 2.4, PL.z, '깡패 소탕!', '#ffcc33', 2); for (const n of gs) n.mission = false; ACT.ev = null; } },
    end: () => { for (const n of gs) { n.mission = false; n.leave = true; if (n.st === 'fight' || n.st === 'shoot') { n.st = 'flee'; n.t = 6; } } } };
  note('🥊 <b>깡패들이 시비를 걸어요!</b><br>모두 쓰러뜨리면 그들이 가진 돈을 가져요.', 4000);
}
