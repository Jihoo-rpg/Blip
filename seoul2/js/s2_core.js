'use strict';
/* ===== STA 2: 레벨 · 업적 · 알림 · 슬로모션 · 날씨 · 치트 ===== */
const S2 = { slow: 0, slowK: 1, notes: [] };
function s2Def() { SV.xp = SV.xp || 0; SV.lvl = SV.lvl || 1; SV.ach = SV.ach || []; SV.props = SV.props || {}; SV.pk = SV.pk || []; SV.stunts = SV.stunts || []; SV.races = SV.races || {}; SV.rampage = SV.rampage || []; SV.vigil = SV.vigil || 0; SV.exports = SV.exports || 0; SV.hits = SV.hits || 0; SV.nosLv = SV.nosLv || 0; SV.snatch = SV.snatch || 0; }
/* ---------- 레벨 ---------- */
const RANKS = ['동네 양아치', '골목 대장', '거리의 무법자', '뒷골목 해결사', '조직의 신참', '조직의 간부', '강남 큰손', '서울의 그림자', '서울의 전설', 'STA 레전드'];
function needXp(l) { return Math.round(400 * Math.pow(l, 1.45)); }
function rankOf(l) { return RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 3))]; }
function xp(n, why) {
  if (!G.on || !n) return; s2Def(); SV.xp += n; xpPop('+' + n + ' XP' + (why ? ' · ' + why : ''));
  let up = false; while (SV.xp >= needXp(SV.lvl)) { SV.xp -= needXp(SV.lvl); SV.lvl++; up = true; }
  if (up) { const bonus = SV.lvl * 5000; addMoney(bonus); SFX.pass(); big('레벨 업!', `Lv.${SV.lvl} ${rankOf(SV.lvl)} · 보너스 ${won(bonus)}`, 'pass', 3200); note(`⭐ <b>레벨 ${SV.lvl}</b>이 됐어요! 주먹이 더 세지고 경찰을 더 빨리 따돌려요.`); }
  hudLvl();
}
function hudLvl() { const e = $('#lvl'); if (!e) return; s2Def(); e.querySelector('b').textContent = 'Lv.' + SV.lvl; e.querySelector('span').textContent = rankOf(SV.lvl); e.querySelector('u').style.width = Math.min(100, SV.xp / needXp(SV.lvl) * 100) + '%'; }
function xpPop(t) { const e = $('#xpPop'); if (!e) return; const d = document.createElement('div'); d.textContent = t; e.appendChild(d); setTimeout(() => d.remove(), 1900); while (e.children.length > 4) e.firstChild.remove(); }
/* 레벨이 오르면 주먹이 세지고, 수배가 빨리 풀려요 */
const _npcDamageS2 = npcDamage; npcDamage = function (n, dmg, dx, dz, by, kind) { if (by === 'player' && (kind === 'punch' || kind === 'stomp')) dmg *= 1 + (SV.lvl - 1) * .04; return _npcDamageS2(n, dmg, dx, dz, by, kind); };
const _killS2 = killNPC; killNPC = function (n, by) { const was = n.dead; _killS2(n, by); if (!was && by === 'player') { xp(n.cop ? 25 : 10); if ((SV.kills || 0) >= 100) ach('k100'); } };
const _passS2 = missionPass; missionPass = function (r, t) { const st = MI && MI.story, h = MI && MI.heistIdx != null; _passS2(r, t); xp(st || h ? 400 : 150, '임무'); };
const _setWS2 = setWanted; setWanted = function (w) { const was = G.wanted; _setWS2(w); if (G.on && !w && was >= 1 && !G.dead) { xp(was * 60, '수배 따돌림'); if (was >= 5) ach('w5'); } if (w >= 5) G.w5T = G.t; };
const _enterS2 = enterCar; enterCar = function (c) { const steal = c.drvP || c.rider || (c.ai && c.ai.mode !== 'parked'); _enterS2(c); if (steal) { xp(5); ach('steal'); } if (c.type === 'police') ach('cop'); };
/* ---------- 알림 (GTA 왼쪽 위 도움말 상자) ---------- */
function note(html, ms) { const e = $('#note'); if (!e) return; e.innerHTML = html; e.hidden = false; e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); SFX.click(); clearTimeout(note.t); note.t = setTimeout(() => e.hidden = true, ms || 6500); }
/* ---------- 업적 ---------- */
const ACH = { steal: ['🚗 첫 차 뺏기', 5000], cop: ['🚓 경찰차 탈취', 10000], w5: ['⭐ 별 5개 따돌리기', 100000], k100: ['💀 100명 쓰러뜨리기', 50000], stunt: ['🛫 첫 스턴트 점프', 10000], stunt5: ['🏆 스턴트 5곳 완료', 60000], race1: ['🏁 첫 레이스 우승', 30000], raceAll: ['🏆 모든 레이스 우승', 150000], pk10: ['📦 꾸러미 10개', 20000], pkAll: ['📦 꾸러미 전부', 300000], rampage: ['💥 첫 광란 클리어', 20000], vig5: ['🚨 자경단 5단계', 50000], prop: ['🏢 첫 사업체', 10000], prop6: ['🏙️ 부동산 왕', 500000], cheat: ['🕹️ 치트 발견', 1000], export5: ['🚢 수출 5대', 40000], hit3: ['🎯 청부 3건', 60000], lvl10: ['👑 레벨 10', 200000], snatch: ['🦸 소매치기 잡기', 8000], nos: ['🔥 니트로 질주', 3000] };
function ach(id) { s2Def(); if (!ACH[id] || SV.ach.includes(id)) return; SV.ach.push(id); const [n, r] = ACH[id]; addMoney(r); save(); setTimeout(() => { note(`🏆 <b>업적 달성!</b><br>${n}<br><small>보상 ${won(r)}</small>`); SFX.pass(); }, 400); }
/* ---------- 슬로모션 ---------- */
function slowmo(t, k) { S2.slow = Math.max(S2.slow, t); S2.slowK = k || .3; }
/* ---------- 날씨 (맑음 · 비 · 안개) ---------- */
const WX = { kind: 'clear', k: 0, want: 0, next: 30, rain: null, flash: 0 };
function wxInit() {
  const N = QUALITY.low ? 1400 : 3200, pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = rand(-40, 40), y = rand(0, 40), z = rand(-40, 40); pos.set([x, y, z, x, y - .7, z], i * 6); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  WX.rain = new T.LineSegments(g, new T.LineBasicMaterial({ color: '#d8e6ff', transparent: true, opacity: 0, depthWrite: false })); WX.rain.frustumCulled = false; scene.add(WX.rain);
}
function setWeather(kind) { WX.kind = kind; WX.want = kind === 'clear' ? 0 : 1; WX.next = rand(140, 260); if (kind === 'rain') note('🌧️ 비가 와요. 길이 미끄러우니 조심해서 운전해요!', 4500); }
function wxUpdate(dt) {
  if (!WX.rain) wxInit(); WX.next -= dt; if (WX.next <= 0) setWeather(Math.random() < .42 ? 'rain' : Math.random() < .25 ? 'fog' : 'clear');
  WX.rk = clamp((WX.rk || 0) + clamp((WX.kind === 'rain' ? 1 : 0) - (WX.rk || 0), -dt * .12, dt * .12), 0, 1); WX.fk = clamp((WX.fk || 0) + clamp((WX.kind === 'fog' ? 1 : 0) - (WX.fk || 0), -dt * .12, dt * .12), 0, 1);
  const rain = WX.rk, fogK = WX.fk; WX.k = Math.max(rain, fogK);
  WX.rain.material.opacity = rain * .8; WX.rain.visible = rain > .01; { const w = $('#wet'); if (w) w.style.opacity = (rain * .75).toFixed(2); }
  if (WX.rain.visible) { WX.rain.position.set(cam.position.x, cam.position.y - 18, cam.position.z); const a = WX.rain.geometry.attributes.position, p = a.array; const fall = dt * 34; for (let i = 0; i < p.length; i += 6) { p[i + 1] -= fall; p[i + 4] -= fall; if (p[i + 1] < 0) { p[i + 1] += 40; p[i + 4] += 40; } } a.needsUpdate = true; }
  const dark = Math.max(rain * .45, fogK * .2);
  scene.fog.near *= 1 - Math.max(rain * .55, fogK * .85); scene.fog.far *= 1 - Math.max(rain * .5, fogK * .78); sun.intensity *= 1 - dark; hemi.intensity *= 1 - dark * .5;
  if (fogK > 0) scene.fog.color.lerp(_c1.set('#b9bec6'), fogK * .6); if (rain > 0) scene.fog.color.lerp(_c1.set('#4a5260'), rain * .5);
  if (rain > .7 && Math.random() < dt * .03) { WX.flash = .25; setTimeout(() => { if (AU.ctx) { noiseHit(2.4, 160, .9); tone(40, 1.6, .6, 'sine', 22); } }, rand(300, 1600)); }
  if (WX.flash > 0) { WX.flash -= dt; hemi.intensity += 3 * Math.max(0, WX.flash) * 4; }
  // 비 오면 차가 미끄러워요
  if (PL.car && rain > .5 && !PL.car.S.bike) PL.car.vl *= 1 + dt * .9 * rain;
  if (AU.ctx) { if (!WX.snd) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; const g = AU.ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(AU.sfx || AU.master); s.start(); WX.snd = g; } WX.snd.gain.value = rain * .05; }
}
/* ---------- 치트 (GTA처럼 키보드로 쳐요 · 폰 치트 앱) ---------- */
const CHEATS = {
  HESOYAM: ['체력 · 방탄 · 돈 25만', () => { PL.hp = 100; PL.ar = 100; addMoney(250000); if (PL.car) PL.car.hp = PL.car.maxHp; }],
  ASPIRINE: ['체력 가득', () => { PL.hp = 100; }],
  LEAVEMEALONE: ['수배 없애기', () => setWanted(0)],
  BRINGITON: ['수배 5개', () => setWanted(5)],
  LXGIWYL: ['무기 세트', () => { for (const w of WORDER) if (w !== 'fist') giveWeapon(w, WEAP[w].pack * 3, false); }],
  ROCKETMAN: ['로켓포', () => giveWeapon('rpg', 10)],
  VROOM: ['스포츠카 소환', () => s2SpawnCar('sports')],
  MOTORMAN: ['오토바이 소환', () => s2SpawnCar('bike')],
  COPCAR: ['경찰차 소환', () => s2SpawnCar('police')],
  BOOMBOOM: ['주변 차 전부 폭발', () => { for (const c of CARS) if (!c.dead && c !== PL.car && Math.hypot(c.x - PL.x, c.z - PL.z) < 50) { c.byPlayer = true; explodeCar(c); } }],
  SLOWMO: ['슬로모션 10초', () => slowmo(10, .4)],
  MOONJUMP: ['달 점프 30초', () => { S2.moon = 30; }],
  RAINY: ['비', () => setWeather('rain')], SUNNY: ['맑음', () => setWeather('clear')], FOGGY: ['안개', () => setWeather('fog')],
  NIGHTOWL: ['밤으로', () => { DAY.t = 22; }], MORNING: ['아침으로', () => { DAY.t = 8; }],
  SPEEDFREAK: ['니트로 무한 60초', () => { S2.nosInf = 60; }],
};
const CB = { s: '' };
function cheat(code) { code = String(code || '').toUpperCase().replace(/[^A-Z]/g, ''); const c = CHEATS[code]; if (!c) return false; c[1](); hudWeapon(); SFX.pass(); note(`🕹️ <b>치트 활성화</b><br>${c[0]}`, 3500); ach('cheat'); return true; }
addEventListener('keydown', e => { if (!G.on || !/^Key[A-Z]$/.test(e.code) || e.repeat) return; CB.s = (CB.s + e.code[3]).slice(-14); for (const k in CHEATS) if (CB.s.endsWith(k)) { CB.s = ''; cheat(k); break; } });
function s2SpawnCar(type) { const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; const c = makeCar(type, type === 'sports' ? pick(['#d10f1f', '#f2c200', '#1f5ea8', '#111214']) : null); c.x = PL.x + f[0] * 5; c.z = PL.z + f[1] * 5; c.yaw = PL.yaw + Math.PI / 2; c.parked = true; const p = { x: c.x, z: c.z }; collideCircle(p, 1.5, 0); inBounds(p, 1.5); c.x = p.x; c.z = p.z; placeCar(c); scene.add(c.g); CARS.push(c); fx('dust', c.x, c.y + .5, c.z, { s: 2, life: .6, vy: 1, a: .6 }); return c; }
/* ---------- 매 프레임 (기존 updateMission 뒤에 붙어요) ---------- */
const S2TICK = [];
const _updMS2 = updateMission; updateMission = function (dt) { _updMS2(dt); for (const f of S2TICK) { try { f(dt); } catch (e) { console.error(e); } } };
S2TICK.push(dt => {
  if (S2.slow > 0) S2.slow -= dt / S2.slowK;
  if (S2.moon > 0) { S2.moon -= dt; if (!PL.car && PL.vy !== 0) { if (PL.vy > 3 && PL.y - groundY(PL.x, PL.z) < .35) PL.vy = 13; PL.vy += 10 * dt; } }
  if (S2.nosInf > 0) S2.nosInf -= dt;
  wxUpdate(dt);
  if (SV.lvl >= 10) ach('lvl10');
  // 레벨이 높으면 별이 더 빨리 꺼져요
  if (G.wanted && SV.lvl > 1) G.lastSeen -= dt * Math.min(.5, (SV.lvl - 1) * .04);
});
/* STA 1을 했던 사람에게 보너스 */
S2TICK.push(() => { if (SV.sta1b || G.t < 6) return; SV.sta1b = 1; let had = false; try { had = !!localStorage.getItem('seoulcity_v1'); } catch (e) { } if (had) { addMoney(100000); setTimeout(() => note('🎁 <b>STA 1 플레이어 보너스!</b><br>STA 1을 해 줘서 고마워요. ₩100,000을 드려요.'), 12000); } save(); });
