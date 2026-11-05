'use strict';
/* ===== STA 2: 진짜 생활 — 배고픔 · 피로 · 날짜 · 가계부 · 은행/대출 · 집 · 식사 · 잠 ===== */
/* ---------- 큰 창 (일 · 회사 · 미니게임) ---------- */
function win(title, html, onClose) { G.paused = true; document.exitPointerLock && document.exitPointerLock(); const w = $('#win'); w.hidden = false; $('#winT').innerHTML = title; $('#winB').innerHTML = html; WIN.onClose = onClose || null; return $('#winB'); }
function winClose() { const w = $('#win'); if (w.hidden) return; w.hidden = true; $('#winB').innerHTML = ''; G.paused = false; const f = WIN.onClose; WIN.onClose = null; if (f) f(); }
const WIN = { onClose: null };
$('#winX').onclick = () => winClose();
addEventListener('keydown', e => { if (e.code === 'Escape' && !$('#win').hidden) { e.stopImmediatePropagation(); winClose(); } }, true);
/* ---------- 기본값 · 돈 밸런스 ---------- */
function s3Def() { s2Def(); SV.need = SV.need || { food: 85, sleep: 90 }; SV.day = SV.day || 1; SV.bank = SV.bank || 0; SV.loan = SV.loan || 0; SV.ledger = SV.ledger || []; SV.home = SV.home || 'goshi'; SV.homes = SV.homes || ['goshi']; SV.fridge = SV.fridge || 0; SV.lic = SV.lic || {}; SV.job = SV.job || null; SV.jobs = SV.jobs || {}; SV.myCars = SV.myCars || []; }
CHEATS.HESOYAM = ['체력 · 방탄 가득 (돈은 직접 벌어요!)', () => { PL.hp = 100; PL.ar = 100; if (PL.car) PL.car.hp = PL.car.maxHp; }];
for (const p of PROPS) { const price = { mart: 3000000, chicken: 6500000, carwash: 9000000, club: 22000000, taxi: 32000000, tower: 65000000 }[p[0]]; if (price) { p[2] = price; p[3] = Math.round(price * .022 / 24 / 100) * 100; } }
const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
function ledger(n, memo) { s3Def(); SV.ledger.unshift([SV.day, Math.floor(DAY.t), Math.round(n), memo || (n > 0 ? '수입' : '지출')]); if (SV.ledger.length > 60) SV.ledger.length = 60; }
const _addMoneyS3 = addMoney; addMoney = function (n, memo) { _addMoneyS3(n); if (G.on && n && memo !== false) { if (!memo && Math.abs(n) >= 1000) { const L = SV.ledger || []; if (L[0] && L[0][3] === (n > 0 ? '수입' : '지출') && L[0][0] === SV.day) { L[0][2] += Math.round(n); return; } } if (memo || Math.abs(n) >= 1000) ledger(n, memo); } };
/* ---------- 배고픔 · 피로 ---------- */
function eat(food, hp, memo) { s3Def(); SV.need.food = Math.min(100, SV.need.food + food); PL.hp = Math.min(100, PL.hp + (hp || 0)); popLabel(PL.x, PL.y + 2.2, PL.z, '냠냠 🍚+' + food, '#ffe27a', 1.2); SFX.cash(); hudNeeds(); }
function rest(e) { s3Def(); SV.need.sleep = Math.min(100, SV.need.sleep + e); hudNeeds(); }
function hudNeeds() { const f = $('#ndF'), s = $('#ndS'); if (!f || !SV.need) return; f.style.width = SV.need.food + '%'; s.style.width = SV.need.sleep + '%'; f.parentNode.classList.toggle('low', SV.need.food < 20); s.parentNode.classList.toggle('low', SV.need.sleep < 20); }
const NEED = { warnT: 0 };
S2TICK.push(dt => {
  s3Def(); const hr = dt * DAY.speed; const work = typeof JOB !== 'undefined' && JOB.on;
  SV.need.food = Math.max(0, SV.need.food - hr * (100 / 22) * (PL.spd > 5 ? 1.4 : 1)); SV.need.sleep = Math.max(0, SV.need.sleep - hr * (100 / 20) * (work ? 1.35 : 1));
  if ((NEED.warnT -= dt) <= 0) { NEED.warnT = 40; if (SV.need.food < 20) note('🍚 <b>배가 고파요!</b><br>편의점 · 식당 · 집 냉장고에서 뭘 먹어요. 계속 굶으면 체력이 깎여요.', 5000); else if (SV.need.sleep < 18) note('😪 <b>너무 피곤해요!</b><br>집에 가서 자요. 계속 안 자면 쓰러져요.', 5000); }
  if (SV.need.food <= 0 && !G.dead) { PL.hp -= dt * .9; PL.dmgT = 0; if (PL.hp <= 0) { toast('🍚 배고파서 쓰러졌어요…'); wasted(); } }
  if (SV.need.sleep <= 0 && !G.dead && !PL.car) { toast('😴 너무 피곤해서 길에서 잠들었어요… (지갑에서 돈이 사라졌어요)'); const lost = Math.min(SV.money, Math.round(SV.money * .15)); addMoney(-lost, '길에서 잠듦'); SV.need.sleep = 45; DAY.t = (DAY.t + 6) % 24; knockPlayer(3, 0, 0); }
  if (SV.need.sleep < 12) IN.sprint = false;
  const v = $('#tired'); if (v) v.style.opacity = SV.need.sleep < 15 ? (.25 + Math.sin(G.t * 1.5) * .15).toFixed(2) : 0;
  if (Math.floor(G.t * 2) !== NEED.hb) { NEED.hb = Math.floor(G.t * 2); hudNeeds(); }
});
/* ---------- 날짜 · 하루가 지나면 ---------- */
const DAYEV = [];
let _lastDayT = null;
function newDay() {
  SV.day++; const msgs = [];
  if (SV.home === 'goshi' && !SV.homes.some(h => h !== 'goshi')) { addMoney(-15000, '고시원 월세 (하루치)'); msgs.push('고시원 방세 ₩15,000'); }
  if (SV.bank > 0) { const it = Math.round(SV.bank * .002); SV.bank += it; ledger(it, '예금 이자'); msgs.push('예금 이자 ' + won(it)); }
  if (SV.loan > 0) { const it = Math.round(SV.loan * .012); SV.loan += it; msgs.push('대출 이자 ' + won(it) + ' (빚 ' + won(SV.loan) + ')'); }
  const upkeep = SV.homes.reduce((s, id) => s + ((HOMES.find(h => h.id === id) || {}).fee || 0), 0); if (upkeep) { addMoney(-upkeep, '관리비'); msgs.push('관리비 ' + won(upkeep)); }
  if (SV.myCars.length) { const ins = SV.myCars.length * 4000; addMoney(-ins, '자동차 보험'); msgs.push('차 보험 ' + won(ins)); }
  for (const f of DAYEV) try { const m = f(); if (m) msgs.push(m); } catch (e) { console.error(e); }
  if (SV.money < 0 && SV.bank > 0) { const t = Math.min(SV.bank, -SV.money); SV.bank -= t; addMoney(t, false); }
  note(`📅 <b>${SV.day}일차 (${WEEK[(SV.day - 1) % 7]}요일)</b><br>${msgs.join('<br>') || '오늘도 힘내요!'}`, 7000); save();
}
S2TICK.push(() => { if (_lastDayT != null && DAY.t < _lastDayT - 12) newDay(); _lastDayT = DAY.t; });
function skipHours(h) { const before = DAY.t; let t = before + h; while (t >= 24) { t -= 24; DAY.t = 23.99; _lastDayT = 23.99; DAY.t = 0; newDay(); _lastDayT = 0; } DAY.t = t; _lastDayT = t; s3Def(); SV.need.food = Math.max(0, SV.need.food - h * 2.2); }
const _hudS3 = updateHUD; updateHUD = function (dt) { _hudS3(dt); s3Def(); const c = $('#clock'); c.textContent = `D+${SV.day} ${WEEK[(SV.day - 1) % 7]} ` + c.textContent; };
/* ---------- 집 ---------- */
const HOMES = [
  { id: 'goshi', n: '고시원 쪽방', price: 0, tier: 0, near: [-150, -80], fee: 0, d: '좁고 시끄럽지만 잠은 잘 수 있어요 (하루 ₩15,000)' },
  { id: 'oneroom', n: '신촌 원룸', price: 12000000, tier: 1, near: [-170, -170], fee: 3000, d: '내 방이 생겼어요! 냉장고 · 옷장' },
  { id: 'officetel', n: '여의도 오피스텔', price: 38000000, tier: 2, near: [-20, 150], fee: 8000, d: '컴퓨터 책상 · 소파 · 큰 TV' },
  { id: 'apt', n: '한강뷰 아파트', price: 140000000, tier: 3, near: [120, 200], fee: 20000, d: '넓은 거실 · 한강 뷰' },
  { id: 'pent', n: '강남 펜트하우스', price: 480000000, tier: 4, near: [180, -180], fee: 60000, d: '서울 꼭대기 · 성공의 상징' },
  { id: 'cabin', n: '평창 통나무집', price: 28000000, tier: 2, gw: [1205, 40], fee: 6000, d: '스키장 옆 · 벽난로' },
  { id: 'villa', n: '강릉 바닷가 별장', price: 95000000, tier: 3, gw: [1690, -110], fee: 15000, d: '파도 소리 · 바다 뷰' }];
const HOME = { rooms: {}, marks: [] };
function homeRoom(tier) {
  if (HOME.rooms[tier]) return HOME.rooms[tier];
  const W = [7, 10, 13, 17, 22][tier], D = [5, 8, 10, 13, 16][tier], Hh = tier >= 3 ? 3.6 : 2.8, ox = 2150 + tier * 60, oz = 500; const g = new T.Group(); g.visible = false; scene.add(g); const M = intMats();
  const mk = c => new T.MeshStandardMaterial({ color: lin(c), roughness: .7 });
  const add = (geo, m, x, y, z, ry) => { const o = new T.Mesh(geo, m); o.position.set(ox + x, y, oz + z); if (ry) o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const fm = (tier >= 3 ? M.marble : M.wood).clone(); fm.map = fm.map.clone(); fm.map.wrapS = fm.map.wrapT = T.RepeatWrapping; fm.map.repeat.set(W / (tier >= 3 ? 3 : 1.6), D / (tier >= 3 ? 3 : 1.6)); fm.map.needsUpdate = true; const fl = add(new T.PlaneGeometry(W, D), fm, 0, .01, 0); fl.rotation.x = -Math.PI / 2;
  const wallM = mk(['#cfc6b8', '#e8e2d6', '#dfe6ea', '#f1efe9', '#2b2e33'][tier]); const ce = add(new T.PlaneGeometry(W, D), mk('#f4f2ee'), 0, Hh, 0); ce.rotation.x = Math.PI / 2;
  add(new T.BoxGeometry(W, Hh, .2), wallM, 0, Hh / 2, -D / 2); add(new T.BoxGeometry(W, Hh, .2), wallM, 0, Hh / 2, D / 2); add(new T.BoxGeometry(.2, Hh, D), wallM, -W / 2, Hh / 2, 0); add(new T.BoxGeometry(.2, Hh, D), wallM, W / 2, Hh / 2, 0);
  addBox(ox - W / 2 - 1, oz - D / 2 - 1, ox + W / 2 + 1, oz - D / 2 + .1, 20); addBox(ox - W / 2 - 1, oz + D / 2 - .1, ox + W / 2 + 1, oz + D / 2 + 1, 20); addBox(ox - W / 2 - 1, oz - D / 2, ox - W / 2 + .1, oz + D / 2, 20); addBox(ox + W / 2 - .1, oz - D / 2, ox + W / 2 + 1, oz + D / 2, 20);
  g.add(new T.HemisphereLight('#fff6e8', '#4a4036', 1)); const pl = new T.PointLight('#ffe8c8', 1.2, Math.max(W, D) * 1.6); pl.position.set(ox, Hh - .3, oz); g.add(pl);
  // 창문 (밖이 보이는 척)
  const view = ctex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, tier === 3 ? '#7fb6e6' : '#9cc4ea'); gr.addColorStop(1, '#e8d8c0'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 18) { const bh = 40 + Math.random() * (tier >= 3 ? 70 : 140); c.fillStyle = `hsl(210,10%,${30 + Math.random() * 25}%)`; c.fillRect(x, h - bh, 16, bh); } if (tier === 3) { c.fillStyle = '#3a6e96'; c.fillRect(0, h * .78, w, h * .22); } });
  const win_ = new T.Mesh(new T.PlaneGeometry(Math.min(W - 2, 2 + tier * 2.4), Hh * .55), new T.MeshBasicMaterial({ map: view })); win_.position.set(ox, Hh * .55, oz - D / 2 + .12); g.add(win_);
  const box = (w, h, d, c, x, z, y, col) => { const o = add(new T.BoxGeometry(w, h, d), mk(c), x, (y || 0) + h / 2, z); if (col !== false) addBox(ox + x - w / 2, oz + z - d / 2, ox + x + w / 2, oz + z + d / 2, (y || 0) + h); return o; };
  const R_ = { g, ox, oz, W, D, Hh, tier, spots: {} };
  homeFurn(R_);
  R_.entry = [ox, oz + D / 2 - 1.2]; R_.door = [ox, oz + D / 2 - .5];
  const door = add(new T.BoxGeometry(1.1, 2.2, .08), mk('#5a3a24'), 0, 1.1, D / 2 - .14);
  HOME.rooms[tier] = R_; return R_;
}
function homePos(h) {
  if (h.pos) return h.pos;
  if (h.gw) { const [x, z] = h.gw, y0 = gwH(x, z); 
    const m = new T.Mesh(new T.BoxGeometry(10.6, 4.4, 8.6), new T.MeshStandardMaterial({ color: lin(h.id === 'cabin' ? '#7a4f2e' : '#f1ede4'), roughness: .8 })); m.position.set(x, y0 + 1.9, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const rf = new T.Mesh(new T.ConeGeometry(7.8, 3, 4), new T.MeshStandardMaterial({ color: lin(h.id === 'cabin' ? '#4a2e1a' : '#2f6fa0'), roughness: .7 })); rf.rotation.y = Math.PI / 4; rf.position.set(x, y0 + 5.6, z); rf.scale.z = .8; rf.castShadow = true; scene.add(rf);
    addBox(x - 5.3, z - 4.3, x + 5.3, z + 4.3, y0 + 7); h.pos = [x, z + 5.6]; return h.pos; }
  const s = BUILD.shops.filter(q => Math.abs(q.x) < LIM - 10 && Math.abs(q.z) < LIM - 10 && !HOMES.some(o => o.shop === q)).sort((a, b) => Math.hypot(a.x - h.near[0], a.z - h.near[1]) - Math.hypot(b.x - h.near[0], b.z - h.near[1]))[0];
  h.shop = s; const o = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[s.side] || [0, 1]; h.pos = [s.x + o[0] * 1.2, s.z + o[1] * 1.2]; h.out = o; return h.pos;
}
function buildHomeMarks() { for (const h of HOMES) { const p = homePos(h); const own = SV.homes.includes(h.id); const M = mkMarker(p[0], p[1], own ? '#7ee08a' : '#c86bff', { r: .9 }); HOME.marks.push({ h, M }); } }
function refreshHomeMarks() { for (const m of HOME.marks) { const own = SV.homes.includes(m.h.id); m.M.g.children.forEach(o => o.material && o.material.color && o.material.color.set(own ? '#7ee08a' : '#c86bff')); } }
const _mapIconsS3 = mapIcons; mapIcons = function () { const out = _mapIconsS3(); if (!G.on) return out; for (const m of HOME.marks) { const own = SV.homes.includes(m.h.id); if (own || Math.hypot(m.M.x - PL.x, m.M.z - PL.z) < 120) out.push({ x: m.M.x, z: m.M.z, t: own ? '🏠' : '🏷️', c: own ? '#7ee08a' : '#c86bff', small: !own }); } if (DEALER_POS.M) out.push({ x: DEALER_POS.x, z: DEALER_POS.z, t: '🚘', c: '#7ee08a', small: 1 }); return out; };
function enterHome(h) {
  const R_ = homeRoom(h.tier); fade(true); setTimeout(() => { INT.home = R_; INSIDE = 'home'; HOME.cur = h; HOME.from = [PL.x, PL.z, PL.yaw + Math.PI]; for (const r of Object.values(HOME.rooms)) r.g.visible = r === R_; if (PL.car) exitCar(); PL.x = R_.entry[0]; PL.z = R_.entry[1]; PL.yaw = Math.PI; CAMS.yaw = Math.PI; CAMS.pos.set(PL.x, 3, PL.z + 2); fade(false); note(`🏠 <b>${h.n}</b><br>🛏️ 침대: 잠자기 · 💻 컴퓨터: 회사 · 일자리 · 🍳 냉장고 · 👔 옷장${R_.spots.tv ? ' · 📺 TV' : ''}`, 5500); }, 450);
}
function exitHome() { fade(true); setTimeout(() => { INSIDE = null; for (const r of Object.values(HOME.rooms)) r.g.visible = false; const o = HOME.from; PL.x = o[0]; PL.z = o[1]; PL.yaw = o[2]; CAMS.yaw = PL.yaw; CAMS.pos.set(PL.x, 4, PL.z); HOME.cur = null; fade(false); }, 450); }
function buyHome(h) {
  win(`🏷️ ${h.n}`, `<p>${h.d}</p><div class="kv"><b>가격</b><span>${won(h.price)}</span><b>관리비</b><span>하루 ${won(h.fee)}</span><b>내 돈</b><span>${won(SV.money)} · 은행 ${won(SV.bank)}</span></div><p class="dim">돈이 모자라면 📱 <b>블립뱅크</b>에서 대출을 받을 수 있어요 (이자가 매일 붙어요!).</p><div class="row"><button class="btn y" id="hBuy">🏠 사기</button><button class="btn d" id="hNo">다음에</button></div>`);
  $('#hNo').onclick = winClose; $('#hBuy').onclick = () => { if (SV.money < h.price) { $('#hBuy').textContent = '돈이 부족해요'; SFX.fail(); return; } addMoney(-h.price, '집 구입 ' + h.n); SV.homes.push(h.id); SV.home = h.id; refreshHomeMarks(); xp(500, '내 집 마련'); save(); winClose(); SFX.pass(); big('내 집 마련!', h.n, 'pass', 3500); };
}
S2TICK.push(dt => {
  if (!HOME.marks.length && G.on && GW.built) buildHomeMarks();
  if (INSIDE === 'home' && HOME.cur) {
    const R_ = INT.home, sp = R_.spots; const near = (p, r) => p && Math.hypot(PL.x - p[0], PL.z - p[1]) < (r || 1.3); let act = null;
    if (near(R_.door, 1.4)) act = ['🚪 나가기', exitHome]; else if (near(sp.bed)) act = ['🛏️ 잠자기', sleepMenu]; else if (near(sp.pc)) act = ['💻 컴퓨터', () => typeof pcMenu === 'function' && pcMenu()]; else if (near(sp.fridge)) act = ['🍳 냉장고', fridgeMenu]; else if (near(sp.closet)) act = ['👔 옷장', () => wardrobe(false)]; else if (near(sp.tv, 1.6)) act = ['📺 TV 보기', tvMenu];
    if (act) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + act[0]); PROMPT.act = act[0]; if (IN.act) act[1](); }
    return;
  }
  if (INSIDE || PL.car || G.dead) return;
  for (const m of HOME.marks) { m.M.g.visible = !MI || !MI.act; if (!inMarker(m.M, PL.x, PL.z)) continue; const own = SV.homes.includes(m.h.id); setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + (own ? '🏠 ' + m.h.n + ' 들어가기' : '🏷️ ' + m.h.n + ' 매물 보기 ' + won(m.h.price))); PROMPT.act = 'home'; if (IN.act) { if (own) enterHome(m.h); else buyHome(m.h); } }
});
function sleepMenu() {
  if (G.wanted) { toast('🚨 경찰에 쫓기는 중엔 못 자요!'); return; }
  win('🛏️ 잠자기', `<p>지금 ${String(Math.floor(DAY.t)).padStart(2, '0')}시 · 피로 ${Math.round(SV.need.sleep)}%</p><div class="row"><button class="btn y" data-h="8">😴 8시간 푹 자기</button><button class="btn" data-h="3">💤 3시간 낮잠</button><button class="btn" data-h="m">⏰ 아침 7시까지</button></div>`);
  $$('#winB [data-h]').forEach(b => b.onclick = () => { let h = b.dataset.h === 'm' ? ((31 - DAY.t) % 24 || 24) : +b.dataset.h; winClose(); fade(true); setTimeout(() => { skipHours(h); const q = HOME.cur ? HOME.cur.tier : 0; rest(h * (11 + q)); PL.hp = 100; save(); fade(false); toast(`😊 잘 잤어요! 피로 ${Math.round(SV.need.sleep)}% · 저장했어요`); }, 900); });
}
function fridgeMenu() { win('🍳 냉장고', `<p>밀키트 ${SV.fridge}개 · 배고픔 ${Math.round(SV.need.food)}%</p><div class="row"><button class="btn y" id="fEat" ${SV.fridge ? '' : 'disabled'}>🍲 밀키트 데워 먹기 (+50)</button><button class="btn" id="fBuy">🛒 장보기 배달 3개 · ${won(24000)}</button></div>`); $('#fEat').onclick = () => { if (!SV.fridge) return; SV.fridge--; eat(50, 15); fridgeMenu(); }; $('#fBuy').onclick = () => { if (SV.money < 24000) { toast('💸 돈이 부족해요'); return; } addMoney(-24000, '장보기'); SV.fridge += 3; fridgeMenu(); }; }
const NEWS = () => { const co = SV.co; const l = ['🌧️ 기상청: ' + (WX.kind === 'rain' ? '오늘은 비가 계속돼요.' : '내일은 맑겠습니다.'), '🚗 신차 「블립 하이퍼 GT」, 출시 첫날 완판!', '🏔️ 강원도 평창 스키장 개장… 영동고속도로 정체', '📈 코스피, 반도체 호황에 사상 최고치', '🥔 강원도 감자 풍년… 감자값 소폭 하락', '🐟 속초항 오징어 대풍, 수산시장 북적', '🚨 서울 도심 폭주족 기승… 경찰 단속 강화']; if (co) l.unshift(`📺 [단독] ${co.name}, ${co.prods.length ? '「' + co.prods[co.prods.length - 1].n + '」 판매 호조' : '신제품 개발 중'} · 기업가치 ${won(coValue())}`); return l; };
function tvMenu() { win('📺 블립 뉴스', `<div class="news">${NEWS().map(n => `<p>${n}</p>`).join('')}</div><p class="dim">TV를 보니 기분이 좋아졌어요. 피로 +5</p>`); rest(5); }
/* ---------- 편의점 · 식당 ---------- */
shopMenu = function () {
  G.paused = true; document.exitPointerLock && document.exitPointerLock();
  const items = [['🍙 삼각김밥', 1500, 18, 5], ['🥛 바나나우유', 1800, 10, 5], ['🍜 컵라면', 2500, 30, 8], ['🍱 도시락', 5500, 55, 20], ['☕ 에너지 드링크', 2800, 0, 0, 25], ['🧊 밀키트 (냉장고에 넣기)', 8500, 0, 0, 0, 1]];
  menu(`<h2>🏪 편의점</h2><p>체력 ${Math.round(PL.hp)} · 🍚 배고픔 ${Math.round(SV.need.food)}% · ⚡ 피로 ${Math.round(SV.need.sleep)}% · 돈 ${won(SV.money)}</p><div class="shopL">${items.map((it, i) => `<button class="btn" data-i="${i}"><span>${it[0]} <small style="color:#666">${it[2] ? '🍚+' + it[2] : ''} ${it[4] ? '⚡+' + it[4] : ''}</small></span><b>${won(it[1])}</b></button>`).join('')}</div><button class="btn d" id="mClose">나가기</button>`);
  $$('[data-i]').forEach(b => b.onclick = () => { const it = items[+b.dataset.i]; if (SV.money < it[1]) { b.textContent = '돈이 부족해요'; return; } if (it[2] && SV.need.food >= 98) { b.textContent = '배불러요!'; return; } addMoney(-it[1], '편의점'); if (it[2]) eat(it[2], it[3]); if (it[4]) rest(it[4]); if (it[5]) SV.fridge++; SFX.cash(); shopMenu(); });
  $('#mClose').onclick = closeMenu;
};
const FOOD = [{ id: 'chicken', shop: '서울치킨', n: '🍗 서울치킨 반반', p: 19000, f: 75, h: 30 }, { t: 'chun', n: '🍲 춘천 닭갈비 + 볶음밥', p: 16000, f: 90, h: 40 }, { t: 'rest', n: '🥔 휴게소 감자 + 호두과자', p: 7000, f: 40, h: 10 }, { t: 'pc', n: '🥩 평창 한우 정식', p: 45000, f: 100, h: 60 }, { t: 'gn', n: '☕ 강릉 핸드드립 커피', p: 6500, f: 5, h: 0, e: 35 }, { t: 'sc', n: '🐟 속초 물회', p: 18000, f: 80, h: 30 }];
const FOODM = [];
S2TICK.push(() => {
  if (!FOODM.length && G.on && GW.built) for (const f of FOOD) { let p; if (f.shop) continue; else { const t = GW_TOWNS.find(q => q.id === f.t); if (!t || !t.door) continue; p = t.door; } FOODM.push({ f, M: mkMarker(p[0], p[1], '#ff9f1c', { r: .8 }), x: p[0], z: p[1] }); }
  if (INSIDE || PL.car || G.dead) return;
  for (const m of FOODM) { if (Math.hypot(PL.x - m.x, PL.z - m.z) > 2.2) continue; setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + m.f.n + ' ' + won(m.f.p)); PROMPT.act = 'food'; if (IN.act) { if (SV.money < m.f.p) { toast('💸 돈이 부족해요'); continue; } if (SV.need.food > 92 && m.f.f > 10) { toast('배불러요!'); continue; } addMoney(-m.f.p, '식사'); eat(m.f.f, m.f.h); if (m.f.e) rest(m.f.e); if (m.f.f >= 80) toast('😋 맛있다! 든든해요'); } }
});
const _mapIconsFood = mapIcons; mapIcons = function () { const out = _mapIconsFood(); if (G.on) for (const m of FOODM) if (Math.hypot(m.x - PL.x, m.z - PL.z) < 150) out.push({ x: m.x, z: m.z, t: '🍴', c: '#ff9f1c', small: 1 }); return out; };
/* ---------- 은행 (블립뱅크) ---------- */
function bankApp() {
  s3Def(); const lim = 2000000 + SV.lvl * 3000000 + SV.homes.length * 5000000;
  phPage('🏦 블립뱅크', `<div class="phMoney" style="font-size:26px">${won(SV.bank)}</div><div class="phSub">현금 ${won(SV.money)} · 대출 ${won(SV.loan)} (매일 1.2% 이자) · 한도 ${won(lim)}</div>
  <div class="phList"><button class="phRow" data-b="dep">💰 현금 전부 입금<small>예금은 매일 0.2% 이자 · 죽거나 잡혀도 안 잃어요</small></button><button class="phRow" data-b="wd">💵 100만원 출금</button><button class="phRow" data-b="wdall">💵 전부 출금</button><button class="phRow" data-b="loan">📝 대출 500만원 받기</button><button class="phRow" data-b="pay">✅ 대출 갚기 (예금에서)</button></div>
  <div class="phSub">📒 가계부</div><div class="phList">${(SV.ledger || []).slice(0, 14).map(l => `<div class="phRow"><span>D+${l[0]} ${l[1]}시 · ${l[3]}</span><b style="color:${l[2] >= 0 ? '#7ee08a' : '#ff8a8a'}">${l[2] >= 0 ? '+' : ''}${won(l[2])}</b></div>`).join('') || '<p class="phNote">아직 기록이 없어요</p>'}</div>`);
  $$('#phScr [data-b]').forEach(b => b.onclick = () => { const k = b.dataset.b; SFX.click();
    if (k === 'dep') { SV.bank += SV.money; ledger(-SV.money, '입금'); _addMoneyS3(-SV.money); }
    if (k === 'wd' || k === 'wdall') { const n = Math.min(SV.bank, k === 'wd' ? 1000000 : SV.bank); SV.bank -= n; _addMoneyS3(n); ledger(n, '출금'); }
    if (k === 'loan') { if (SV.loan + 5000000 > lim) { toast('🏦 대출 한도를 넘어요. 레벨을 올리거나 집을 사면 늘어나요'); return; } SV.loan += 5000000; _addMoneyS3(5000000); ledger(5000000, '대출'); }
    if (k === 'pay') { const n = Math.min(SV.bank + SV.money, SV.loan); let r = n; const b1 = Math.min(SV.bank, r); SV.bank -= b1; r -= b1; _addMoneyS3(-r); SV.loan -= n; ledger(-n, '대출 상환'); }
    save(); bankApp(); });
}
/* 병원비 · 벌금은 현금에서 */

/* 집 안 카메라: 천장 위로 안 나가게 */
const _updCamHome = updateCamera; updateCamera = function (dt) { _updCamHome(dt); if (INSIDE === 'home' && INT.home) { const R_ = INT.home; const p = cam.position; p.y = Math.min(p.y, R_.Hh - .25); p.x = clamp(p.x, R_.ox - R_.W / 2 + .3, R_.ox + R_.W / 2 - .3); p.z = clamp(p.z, R_.oz - R_.D / 2 + .3, R_.oz + R_.D / 2 - .3); cam.lookAt(PL.x, PL.y + 1.3, PL.z); } };
