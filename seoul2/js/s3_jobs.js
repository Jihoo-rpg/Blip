'use strict';
/* ===== STA 2: 직업 — 편의점 · 택배 · 버스 · 경찰 · 회사원 · 감자 농부 · 어부 + 면허 · 시험 ===== */
const JOB = { on: false, id: null, marks: [] };
const JOBS = {
  mart: { n: '🏪 편의점 알바', ranks: ['알바생', '매니저', '점장'], base: 42000, hours: '언제든', d: '계산대에서 물건을 찍고 거스름돈을 줘요', req: () => null },
  courier: { n: '📦 택배 기사', ranks: ['기사', '팀장', '센터장'], base: 9000, unit: '1건당', hours: '07~21시', d: '물류센터에서 탑차를 받아 집집마다 상자를 배달해요', req: () => SV.lic.c1 ? null : '1종 보통 운전면허' },
  bus: { n: '🚌 버스 기사', ranks: ['기사', '선임 기사', '운행 과장'], base: 7000, unit: '정류장당', hours: '05~24시', d: '정류장마다 멈춰서 손님을 태우고 시간표를 지켜요', req: () => SV.lic.big ? null : '1종 대형 운전면허' },
  police: { n: '👮 경찰관', ranks: ['순경', '경장', '경사', '경위'], base: 35000, unit: '사건당', hours: '언제든', d: '순찰차로 신고 사건을 처리해요 (도주차 · 소매치기 · 깡패 · 과속)', req: () => SV.lvl < 4 ? '레벨 4 이상' : !SV.lic.c1 ? '1종 보통 운전면허' : !SV.lic.police ? '경찰 시험 합격 (경찰서)' : G.wanted ? '수배 중이 아니어야 해요' : null },
  office: { n: '💼 회사원 (블립전자)', ranks: ['사원', '대리', '과장', '차장', '부장', '이사'], base: 110000, hours: '09~18시', d: '엑셀 · 결재 · 보고서 타자 업무를 처리해요', req: () => SV.lic.toeic ? null : '입사 시험 합격 (서울타워123 로비)' },
  farm: { n: '🥔 감자 농부 (강원도)', ranks: ['일꾼', '반장', '농장주'], base: 6500, unit: '상자당', hours: '06~18시', d: '감자를 캐서 상자에 담아 트럭에 실어요', req: () => null },
  fish: { n: '🎣 어부 (속초항)', ranks: ['선원', '갑판장', '선장'], base: 0, unit: '물고기 시세', hours: '04~16시', d: '부두 끝에서 낚시해서 수산시장에 팔아요', req: () => null }
};
function jobRec(id) { SV.jobs = SV.jobs || {}; return SV.jobs[id] = SV.jobs[id] || { xp: 0, rank: 0, shifts: 0, earned: 0 }; }
function rankMul(id) { return 1 + jobRec(id).rank * .45; }
function jobPay(id, amt, why) { const r = jobRec(id); amt = Math.round(amt / 100) * 100; addMoney(amt, JOBS[id].n.replace(/^\S+ /, '') + ' ' + (why || '급여')); r.earned += amt; SFX.cash(); return amt; }
function jobDone(id, perf) {
  const r = jobRec(id), J = JOBS[id]; r.shifts++; r.xp += Math.max(1, Math.round(perf)); const need = [0, 8, 22, 40, 62, 90][r.rank + 1]; xp(60 + perf * 8, '근무');
  if (need && r.xp >= need && r.rank < J.ranks.length - 1) { r.rank++; setTimeout(() => { big('승진!', `${J.n} · ${J.ranks[r.rank]}`, 'pass', 3500); note(`🎉 <b>${J.ranks[r.rank]}</b>(으)로 승진했어요!<br>급여가 ${Math.round(rankMul(id) * 100)}%로 올랐어요.`); }, 1800); }
  save();
}
function roadSpot(q) { const kx = Math.round(q[0] / P) * P, kz = Math.round(q[1] / P) * P; if (Math.abs(q[0] - kx) < Math.abs(q[1] - kz)) return { x: kx + Math.sign(q[0] - kx || 1) * 5.5, z: q[1] + Math.sign(-q[1] || 1) * 14, yaw: Math.sign(-q[1] || 1) > 0 ? 0 : Math.PI }; return { x: q[0] + Math.sign(-q[0] || 1) * 14, z: kz + Math.sign(q[1] - kz || 1) * 5.5, yaw: Math.sign(-q[0] || 1) > 0 ? Math.PI / 2 : -Math.PI / 2 }; }
function placeJobCar(c, q) { const r = roadSpot(q); c.x = r.x; c.z = r.z; c.yaw = r.yaw; c.parked = true; c.mission = true; for (const o of CARS.slice()) if (o !== c && !o.mission && Math.hypot(o.x - c.x, o.z - c.z) < 8) removeCar(o); placeCar(c); scene.add(c.g); CARS.push(c); }
function hourIn(a, b) { const h = DAY.t; return a <= b ? h >= a && h < b : h >= a || h < b; }
/* ---------- 일터 ---------- */
const WORK = {};
function workPlaces() {
  const L = BUILD.landmarks; const mart = BUILD.shops.filter(s => s.name.startsWith('편의점')).sort((a, b) => Math.hypot(a.x + 150, a.z + 80) - Math.hypot(b.x + 150, b.z + 80))[0];
  const off = (s, k) => { const o = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[s.side] || [0, 1]; return [s.x + o[0] * (k || 1.2), s.z + o[1] * (k || 1.2)]; };
  WORK.mart = mart ? off(mart) : [0, 0]; WORK.martShop = mart;
  WORK.courier = ringCorner(-2, 2, 0); WORK.bus = ringCorner(1, -3, 1); WORK.police = L.police ? [L.police.x + 6, L.police.z + 2] : [0, 0]; WORK.office = L.tower ? [L.tower.x, L.tower.z] : [0, 0];
  const fm = GW_TOWNS.find(t => t.id === 'farm'), sc = GW_TOWNS.find(t => t.id === 'sc'); WORK.farm = fm ? [fm.x - 20, fm.z - 18] : [1000, 40]; WORK.fish = [PIER.x1 - 3, (PIER.z0 + PIER.z1) / 2]; WORK.fishMkt = sc && sc.door ? sc.door : [1650, -640];
  WORK.dmv = ringCorner(-2, -3, 1);
  for (const k of ['mart', 'courier', 'bus', 'police', 'office', 'farm', 'fish', 'dmv']) { const p = WORK[k]; JOB.marks.push({ k, M: mkMarker(p[0], p[1], k === 'dmv' ? '#4fc3ff' : '#ffd166', { r: 1 }), x: p[0], z: p[1] }); }
  for (const [k, t, c] of [['courier', '블립 물류센터', '#1f5ea8'], ['bus', '시내버스 차고지', '#2a9d4b'], ['dmv', '운전면허시험장', '#0277bd']]) { const q = WORK[k]; const pl = new T.Mesh(new T.CylinderGeometry(.12, .12, 4, 6), MATS.darkMetal); pl.position.set(q[0] + 1.6, 2, q[1] + 1.6); scene.add(pl); signMesh(t, c, q[0] + 1.6, 4.4, q[1] + 1.6, Math.PI / 4, 5); }
}
const _mapIconsJob = mapIcons; mapIcons = function () { const out = _mapIconsJob(); if (!G.on) return out; const ic = { mart: '🏪', courier: '📦', bus: '🚌', police: '👮', office: '💼', farm: '🥔', fish: '🎣', dmv: '🪪' }; for (const m of JOB.marks) { const mine = SV.job === m.k || m.k === 'dmv'; if (mine || Math.hypot(m.x - PL.x, m.z - PL.z) < 110) out.push({ x: m.x, z: m.z, t: ic[m.k], c: mine ? '#ffd166' : '#a0a0a0', small: !mine }); } return out; };
S2TICK.push(() => {
  if (!JOB.marks.length && G.on && GW.built) workPlaces();
  if (JOB.on || MI || INSIDE || G.dead) { for (const m of JOB.marks) m.M.g.visible = false; return; }
  for (const m of JOB.marks) { m.M.g.visible = m.k === 'dmv' || SV.job === m.k || !SV.job; if (Math.hypot(PL.x - m.x, PL.z - m.z) > (PL.car ? 4 : 2)) continue; const J = JOBS[m.k];
    if (m.k === 'dmv') { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + '🪪 운전면허시험장'); PROMPT.act = 'dmv'; if (IN.act) dmvMenu(); continue; }
    if (m.k === 'police' && !SV.lic.police) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + '👮 경찰 시험 보기'); PROMPT.act = 'job'; if (IN.act) policeExam(); continue; }
    if (m.k === 'office' && !SV.lic.toeic) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + '💼 블립전자 입사 시험'); PROMPT.act = 'job'; if (IN.act) officeExam(); continue; }
    if (SV.job !== m.k) { setPrompt(`${J.n} — 📱 블립잡 앱에서 먼저 지원해요`); continue; }
    setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + `출근하기 · ${J.n} (${J.ranks[jobRec(m.k).rank]})`); PROMPT.act = 'job'; if (IN.act) startShift(m.k);
  }
});
function startShift(id) {
  if (SV.need.sleep < 10) { toast('😪 너무 피곤해서 일을 못 해요. 먼저 자요'); return; }
  const hrs = { courier: [7, 21], bus: [5, 24], farm: [6, 18], fish: [4, 16], office: [9, 18] }[id]; if (hrs && !hourIn(hrs[0], hrs[1] % 24 || 24)) { toast(`⏰ 지금은 근무 시간이 아니에요 (${JOBS[id].hours})`); return; }
  JOB.on = true; JOB.id = id; ({ mart: shiftMart, courier: shiftCourier, bus: shiftBus, police: shiftPolice, office: shiftOffice, farm: shiftFarm, fish: shiftFish })[id]();
}
function endShift() { JOB.on = false; JOB.id = null; actHud(''); obj(''); $('#timer').hidden = true; }
function jobMI(id, o) { MI = Object.assign({ act: 'job', job: id }, o || {}); for (const k in GIVERS) rmMarker(GIVERS[k].M); const c0 = MI.cleanup; MI.cleanup = () => { try { c0 && c0(); } catch (e) { } endShift(); }; }
function jobFinish(id, pay, perf, msg) { const m = MI; MI = null; obj(''); $('#timer').hidden = true; if (m && m.cleanup) m.cleanup(); else endShift(); const got = pay > 0 ? jobPay(id, pay) : 0; jobDone(id, perf); big('퇴근!', (msg || '') + (got ? ' · +' + won(got) : ''), 'pass', 3200); setupGivers(); }
/* ---------- 미니게임 공통 ---------- */
function quiz(title, qs, need, done) {
  let i = 0, ok = 0; const order = qs.slice().sort(() => Math.random() - .5).slice(0, 10);
  const show = () => { if (i >= order.length) { const pass = ok >= need; win(title, `<div class="bigNum ${pass ? 'ok' : 'no'}">${ok} / ${order.length}</div><p>${pass ? '🎉 합격이에요!' : `😢 불합격… ${need}개 이상 맞혀야 해요.`}</p><button class="btn y" id="qX">확인</button>`); $('#qX').onclick = () => { winClose(); done(pass); }; return; }
    const q = order[i]; const opts = q[1].map((t, k) => [t, k]).sort(() => Math.random() - .5);
    win(title, `<div class="qn">문제 ${i + 1} / ${order.length}</div><p class="qq">${q[0]}</p><div class="qopts">${opts.map(o => `<button class="btn" data-k="${o[1]}">${o[0]}</button>`).join('')}</div>`);
    $$('#winB [data-k]').forEach(b => b.onclick = () => { const right = +b.dataset.k === 0; if (right) { ok++; tone(880, .1, .15, 'square'); } else tone(220, .2, .2, 'square'); b.classList.add(right ? 'good' : 'bad'); setTimeout(() => { i++; show(); }, 450); }); };
  show();
}
const Q_LAW = [['빨간불일 때 우회전은?', ['보행자가 없을 때 일단 멈춘 뒤 천천히', '그냥 빨리 지나간다', '경적을 울리고 지나간다', '절대 못 한다']], ['스쿨존 제한 속도는?', ['시속 30km', '시속 50km', '시속 60km', '제한 없음']], ['음주운전 단속 기준(면허 정지)은?', ['혈중알코올 0.03% 이상', '0.1% 이상', '0.5% 이상', '취한 느낌이 들 때']], ['고속도로 1차로는?', ['앞지르기할 때 쓰는 차로', '트럭 전용', '정차 가능', '천천히 달리는 차로']], ['구급차가 사이렌을 켜고 오면?', ['길 가장자리로 비켜 준다', '같이 빨리 달린다', '멈추지 않는다', '경적으로 알린다']], ['안전벨트는 누가 매야 할까?', ['모든 좌석 사람', '운전자만', '앞자리만', '고속도로에서만']], ['비 오는 날 속도는?', ['평소보다 20% 줄인다', '평소대로', '더 빠르게', '상관없다']], ['노란 실선 중앙선은?', ['넘어가면 안 된다', '넘어가도 된다', '밤에만 넘을 수 있다', '버스만 넘는다']], ['횡단보도 앞 정지선은?', ['반드시 멈춘다', '보행자가 없으면 무시', '버스만 지킨다', '없어도 된다']], ['운전 중 휴대폰 사용은?', ['위법이다 (거치대로 내비만)', '짧게는 괜찮다', '신호대기 중엔 괜찮다', '문자는 괜찮다']], ['깜빡이(방향지시등)는 언제?', ['차로를 바꾸거나 돌기 전', '돈 뒤에', '필요 없다', '밤에만']], ['과속카메라 앞에서 급정거하면?', ['뒤차와 사고 위험이 크다', '안전하다', '벌금이 줄어든다', '괜찮다']]];
const Q_POLICE = [['현행범 체포 때 꼭 알려줘야 하는 것은?', ['범죄 사실 · 변호인 선임권 · 진술 거부권', '경찰 월급', '오늘 날씨', '아무것도 없다']], ['112는 어떤 번호?', ['범죄 신고', '화재 신고', '전화번호 안내', '택시 호출']], ['119는 어떤 번호?', ['화재 · 구급 신고', '범죄 신고', '날씨 안내', '은행 상담']], ['경찰관이 지켜야 할 가장 중요한 것은?', ['시민의 생명과 안전', '빠른 퇴근', '실적 올리기', '멋진 제복']], ['교통사고 현장 도착 후 먼저 할 일은?', ['부상자 확인 · 2차 사고 예방', '사진 찍기', '음료수 사기', '돌아가기']], ['영장 없이도 체포할 수 있는 경우는?', ['현행범', '기분이 나쁠 때', '모든 경우', '절대 없다']], ['총은 언제 쓸 수 있을까?', ['생명이 위험한 최후의 경우', '도망칠 때 언제나', '겁줄 때', '연습할 때']], ['순찰차 사이렌은 언제 켤까?', ['긴급 출동할 때', '심심할 때', '퇴근할 때', '항상']], ['미아를 발견하면?', ['보호하고 보호자를 찾는다', '그냥 둔다', '집에 데려간다', '사진만 찍는다']], ['음주 단속은 어떤 법 때문에?', ['도로교통법', '민법', '헌법만', '규칙이 없다']]];
const Q_OFFICE = [['"deadline"의 뜻은?', ['마감 기한', '죽은 선', '휴가', '회의']], ['"invoice"의 뜻은?', ['청구서 · 송장', '초대장', '목소리', '투자']], ['"revenue"의 뜻은?', ['매출 · 수익', '복수', '검토', '휴식']], ['"meeting"의 뜻은?', ['회의', '고기', '만남의 광장', '식사']], ['엑셀에서 합계 함수는?', ['SUM', 'ADD', 'PLUS', 'TOTALIZE']], ['"I look forward to hearing from you"는?', ['답장을 기다리겠습니다', '당신을 보고 있어요', '앞을 보세요', '전화하지 마세요']], ['보고서에서 결론을 먼저 쓰는 방식은?', ['두괄식', '미괄식', '양괄식', '무괄식']], ['"budget"의 뜻은?', ['예산', '양동이', '버짓 항공', '세금']], ['1,250 × 4 는?', ['5,000', '4,500', '5,250', '6,000']], ['"ASAP"의 뜻은?', ['가능한 한 빨리', '나중에', '취소', '다시 보내기']], ['비즈니스 메일 끝인사로 알맞은 것은?', ['감사합니다. ○○○ 드림', 'ㅋㅋ 바이', '끝', '수고']], ['"merger"의 뜻은?', ['합병', '분리', '병합된 머리', '재고']]];
/* ---------- 운전면허 ---------- */
function dmvMenu() {
  const has = SV.lic; win('🪪 운전면허시험장', `<p>필기시험(10문제 중 7개)에 붙으면 도로주행 시험을 봐요. 도로주행: 체크포인트 6곳을 시간 안에 · 시속 70km 넘거나 세게 박으면 감점!</p>
  <div class="shopL"><button class="btn ${has.c1 ? 'd' : 'y'}" id="l1" ${has.c1 ? 'disabled' : ''}><span>🚗 1종 보통 (승용차 · 택배 · 경찰)</span><b>${has.c1 ? '✅ 보유' : won(150000)}</b></button><button class="btn ${has.big ? 'd' : ''}" id="l2" ${has.big || !has.c1 ? 'disabled' : ''}><span>🚌 1종 대형 (버스)</span><b>${has.big ? '✅ 보유' : has.c1 ? won(300000) : '1종 보통 먼저'}</b></button></div>`);
  const go = (k, fee) => { if (SV.money < fee) { toast('💸 돈이 부족해요'); return; } addMoney(-fee, '면허 응시료'); quiz('📝 필기시험', Q_LAW, 7, pass => { if (pass) roadTest(k); else toast('😢 필기 불합격… 응시료는 돌려주지 않아요'); }); };
  $('#l1').onclick = () => go('c1', 150000); $('#l2').onclick = () => go('big', 300000);
}
function roadTest(k) {
  const c = makeCar(k === 'big' ? 'bus' : 'hatch', k === 'big' ? 'green' : '#f2c200'); const s = WORK.dmv; placeJobCar(c, s); enterCar(c); CAMS.yaw = c.yaw;
  MI = { act: 'test', noGarage: true }; for (const q in GIVERS) rmMarker(GIVERS[q].M); const pts = [[-2 * P, -2 * P], [-P, -2 * P], [-P, -P], [-2 * P, -P], [-2 * P, -2 * P], [c.x, c.z]]; let i = 0, pen = 0, M = mkMarker(pts[0][0], pts[0][1], '#4fc3ff', { r: 2.2 }), lastHp = c.hp, spT = 0; timer(150);
  MI.upd = dt => { if (PL.car !== c) { missionFail('차에서 내렸어요 — 불합격'); return; } if (c.hp < lastHp - 6) { pen++; popLabel(c.x, c.y + 3, c.z, '쾅! 감점', '#ff5050', 1.2); } lastHp = c.hp; if (Math.abs(c.v) * 3.6 > 70) { spT += dt; if (spT > 1.2) { spT = 0; pen++; popLabel(c.x, c.y + 3, c.z, '과속! 감점', '#ff5050', 1.2); } } else spT = 0;
    if (pen >= 3) { missionFail('감점 3번 — 불합격'); return; } if (inMarker(M, PL.x, PL.z)) { i++; rmMarker(M); tone(1200, .08, .2, 'square'); if (i >= pts.length) { SV.lic[k] = 1; missionPass(0); big('면허 합격!', k === 'big' ? '1종 대형' : '1종 보통', 'pass', 3000); xp(150, '면허'); save(); return; } M = mkMarker(pts[i][0], pts[i][1], '#4fc3ff', { r: 2.2 }); }
    obj(`🪪 도로주행 시험 · 체크포인트 <em>${i + 1}/${pts.length}</em> · 감점 ${pen}/3 · 시속 70km 이하`); };
  MI.timeUp = () => missionFail('시간 초과 — 불합격'); MI.cleanup = () => { rmMarker(M); c.mission = false; if (PL.car === c) exitCar(); removeCar(c); };
}
function policeExam() { if (SV.lvl < 4) { toast('👮 레벨 4부터 경찰 시험을 볼 수 있어요'); return; } if (G.wanted) { toast('🚨 수배 중엔 시험을 못 봐요!'); return; } quiz('👮 경찰 공무원 시험', Q_POLICE, 7, p => { if (p) { SV.lic.police = 1; save(); note('👮 <b>경찰 시험 합격!</b><br>📱 블립잡에서 경찰관으로 지원할 수 있어요.'); } }); }
function officeExam() { quiz('💼 블립전자 입사 시험', Q_OFFICE, 7, p => { if (p) { SV.lic.toeic = 1; save(); note('💼 <b>입사 시험 합격!</b><br>📱 블립잡에서 회사원으로 지원할 수 있어요.'); } }); }
/* ---------- 🏪 편의점 ---------- */
const GOODS = [['🍙', '삼각김밥', 1500], ['🥛', '우유', 1800], ['🍜', '컵라면', 1300], ['🍫', '초콜릿', 1700], ['🥤', '콜라', 2000], ['🍞', '빵', 2300], ['🍌', '바나나', 2900], ['🧃', '주스', 1600], ['🍦', '아이스크림', 1200], ['🔋', '건전지', 4500], ['🍺', '맥주', 3000], ['🧻', '휴지', 5900]];
function shiftMart() {
  const s = WORK.martShop; jobMI('mart'); MI.noInsideCops = false; enterInterior('mart', [WORK.mart[0], WORK.mart[1], 0]);
  setTimeout(() => { let n = 0, score = 0, tips = 0; const N = 6;
    const next = () => { if (n >= N) { win('🏪 근무 끝', `<p>손님 ${N}명 · 정확 ${score}명 · 팁 ${won(tips)}</p><button class="btn y" id="mDone">퇴근하기</button>`); $('#mDone').onclick = () => { winClose(); skipHours(4); const pay = JOBS.mart.base * rankMul('mart') * (.5 + score / N * .5) + tips; jobFinish('mart', pay, score, '편의점 4시간'); }; return; }
      n++; const k = randi(1, 4), cart = []; for (let i = 0; i < k; i++) cart.push(pick(GOODS)); const total = cart.reduce((a, g) => a + g[2], 0); const paid = [1000, 5000, 10000, 50000].find(b => b >= total + 100) || 50000; const change = paid - total; let scanned = 0, given = 0, t0 = performance.now(); const who = pick(['🧑', '👩', '👴', '👧', '🧔', '👩‍🦱', '👨‍💼']);
      const body = win(`🏪 손님 ${n}/${N}`, `<div class="cust">${who} <span id="mSay">계산해 주세요~</span></div><div class="belt">${cart.map((g, i) => `<button class="item" data-i="${i}">${g[0]}<small>${g[1]}</small></button>`).join('')}</div><div class="pos"><span>합계</span><b id="mTot">₩0</b></div><div id="mPay" hidden><p>손님이 <b>${won(paid)}</b>을 냈어요. 거스름돈은?</p><div class="pos"><span>줄 돈</span><b id="mGive">₩0</b></div><div class="coins">${[10000, 5000, 1000, 500, 100].map(v => `<button class="btn" data-v="${v}">${won(v)}</button>`).join('')}<button class="btn d" data-v="0">↺</button></div><button class="btn y" id="mOk">💵 거스름돈 주기</button></div><div class="tbar"><i id="mTime"></i></div>`, () => { if (JOB.on && JOB.id === 'mart' && $('#win').hidden) { } });
      let run = true; const tick = () => { if (!run) return; const e = (performance.now() - t0) / 1000, lim = 28 - jobRec('mart').rank * 2; const el = $('#mTime'); if (!el) return; el.style.width = Math.max(0, 100 - e / lim * 100) + '%'; if (e > lim) { run = false; $('#mSay').textContent = '아 왜 이렇게 느려요?!'; SFX.fail(); setTimeout(next, 900); return; } requestAnimationFrame(tick); }; tick();
      $$('#winB .item').forEach(b => b.onclick = () => { if (b.classList.contains('done')) return; b.classList.add('done'); scanned++; tone(1800, .05, .12, 'square'); $('#mTot').textContent = won(cart.slice(0, scanned).reduce((a, g) => a + g[2], 0)); if (scanned === cart.length) { $('#mTot').textContent = won(total); $('#mPay').hidden = false; } });
      $$('#winB [data-v]').forEach(b => b.onclick = () => { const v = +b.dataset.v; given = v ? given + v : 0; $('#mGive').textContent = won(given); tone(600, .04, .1, 'square'); });
      $('#mOk').onclick = () => { if (!run) return; run = false; if (given === change) { score++; const tip = Math.random() < .3 ? randi(1, 5) * 1000 : 0; tips += tip; $('#mSay').textContent = tip ? `고마워요! 팁이에요 (${won(tip)})` : '감사합니다~'; SFX.cash(); } else { $('#mSay').textContent = given > change ? '어? 너무 많이 주셨네요 ㅎㅎ (손해!)' : '거스름돈이 모자라요!'; SFX.fail(); } setTimeout(next, 900); };
    }; next(); }, 700);
  MI.cleanup = () => { if (INSIDE === 'mart') exitInterior(); endShift(); };
}
/* ---------- 📦 택배 ---------- */
function shiftCourier() {
  const s = WORK.courier; const van = makeCar('van'); placeJobCar(van, s); const home = [van.x, van.z];
  jobMI('courier', { noGarage: true }); MI.blipCar = van; let left = 6 + jobRec('courier').rank * 2, done = 0, carry = false, M = null, dest = null, box = null, segT = 0; const total = left;
  const newDest = () => { const d = apartmentDoor(); dest = d; rmMarker(M); M = mkMarker(d.x, d.z, '#ffcc33'); const dist = Math.hypot(d.x - PL.x, d.z - PL.z); segT = 0; timer(Math.round(dist / 7 + 50)); };
  const boxM = new T.Mesh(new T.BoxGeometry(.45, .35, .45), new T.MeshStandardMaterial({ color: lin('#c8a26a'), roughness: .8 }));
  MI.upd = dt => {
    if (van.dead) { missionFail('탑차가 망가졌어요! (수리비는 월급에서…)'); return; }
    if (!dest && PL.car === van) { newDest(); }
    if (!dest) { obj(done ? `📦 ${done}건 완료! <em>탑차</em>에 타면 다음 배달지가 나와요` : '📦 물류센터의 <em>택배 탑차</em>에 타요 (파란 점)'); return; }
    const dv = Math.hypot(PL.x - van.x, PL.z - van.z), dd = Math.hypot(PL.x - dest.x, PL.z - dest.z);
    if (!carry && !PL.car && dv < 4 && dd < 60) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + '📦 상자 꺼내기'); PROMPT.act = 'box'; if (IN.act) { carry = true; scene.add(boxM); SFX.door(); } }
    if (carry) { boxM.position.set(PL.x + Math.sin(PL.yaw) * .45, PL.y + 1.05, PL.z + Math.cos(PL.yaw) * .45); boxM.rotation.y = PL.yaw; PL.spd = Math.min(PL.spd, 4); if (PL.car) { carry = false; scene.remove(boxM); } }
    if (carry && inMarker(M, PL.x, PL.z)) { carry = false; scene.remove(boxM); done++; left--; const tipK = clamp(G.mTimer / 60, 0, 1); const pay = JOBS.courier.base * rankMul('courier') * (1 + tipK * .6); jobPay('courier', pay, '배달'); popLabel(dest.x, 2.5, dest.z, '배송 완료! 띵동~', '#7ee08a', 1.5); $('#timer').hidden = true; G.mTimer = 0; dest = null; rmMarker(M); M = null; if (left <= 0) { M = mkMarker(home[0], home[1], '#4fc3ff', { r: 2.2 }); dest = { x: home[0], z: home[1], back: 1 }; } else if (PL.car !== van) { obj('📦 탑차로 돌아가요'); } }
    if (dest && dest.back) { obj('📦 배달 끝! <em>물류센터</em>에 탑차를 반납해요'); if (PL.car === van && inMarker(M, PL.x, PL.z)) { exitCar(); const dmg = Math.round((1 - van.hp / van.maxHp) * 60000); if (dmg > 0) addMoney(-dmg, '탑차 수리비'); jobFinish('courier', 0, done * 1.5, `택배 ${done}건${dmg ? ' · 수리비 -' + won(dmg) : ''}`); } return; }
    if (dest && !dest.back && PL.car === van) { if (!$('#timer').hidden) { } if (dest && !M) newDest(); }
    if (dest && !dest.back) obj(`📦 배달 <em>${done + 1}/${total}</em> · ${dest.name || ''} 앞 · ${carry ? '상자를 문 앞까지!' : PL.car ? '근처에 세우고 내려요' : '탑차에서 상자를 꺼내요 (E)'}`);
  };
  MI.timeUp = () => { toast('📦 늦었어요… 고객 불만 접수 (팁 없음)'); if (dest && !dest.back) { timer(40); } };
  MI.cleanup = () => { rmMarker(M); scene.remove(boxM); van.mission = false; if (PL.car === van) exitCar(); removeCar(van); endShift(); };
  note('📦 <b>택배 근무 시작!</b><br>탑차를 타고 노란 집 앞에 세운 뒤, 내려서 상자를 꺼내(E) 문 앞까지 들고 가요.', 6000);
}
/* ---------- 🚌 버스 ---------- */
function shiftBus() {
  const s = WORK.bus; const bus = makeCar('bus', 'green'); placeJobCar(bus, s);
  jobMI('bus', { noGarage: true }); MI.blipCar = bus; const route = []; let bi = Math.round(bus.x / P), bj = Math.round(bus.z / P); for (let k = 0; k < 7; k++) { const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => Math.abs(bi + d[0]) <= NR && Math.abs(bj + d[1]) <= NR); const d = pick(dirs); const mx = (bi + d[0] / 2) * P, mz = (bj + d[1] / 2) * P; const off = d[0] ? [0, 6.5] : [6.5, 0]; route.push([mx + off[0], mz + off[1]]); bi += d[0]; bj += d[1]; }
  route.push([bus.x, bus.z]); let i = 0, M = null, wait = 0, pax = 0, rating = 5, lastHp = bus.hp; const started = () => PL.car === bus;
  const mark = () => { rmMarker(M); M = mkMarker(route[i][0], route[i][1], i === route.length - 1 ? '#4fc3ff' : '#2a9d4b', { r: 2.4 }); timer(Math.round(Math.hypot(route[i][0] - PL.x, route[i][1] - PL.z) / 6 + 35)); };
  MI.upd = dt => {
    if (bus.dead) { missionFail('버스가 망가졌어요!'); return; } if (!started() && i === 0 && !M) { obj('🚌 차고지의 <em>초록 버스</em>에 타요'); return; } if (!M) mark();
    if (bus.hp < lastHp - 5) { rating = Math.max(0, rating - 1); popLabel(bus.x, bus.y + 4, bus.z, '승객 불만 ⭐-1', '#ff8080', 1.2); } lastHp = bus.hp;
    if (PL.car === bus && inMarker(M, PL.x, PL.z) && Math.abs(bus.v) < 1) { wait += dt; setPrompt(i === route.length - 1 ? '🚌 차고지 도착!' : `🚌 손님 타는 중… ${Math.max(0, 2.5 - wait).toFixed(1)}`); if (wait > 2.5) { wait = 0; if (i === route.length - 1) { rmMarker(M); M = null; exitCar(); jobFinish('bus', pax * 1300 * rankMul('bus') + rating * 4000, 2 + rating, `손님 ${pax}명 · 별점 ${'⭐'.repeat(rating)}`); return; } const n = randi(1, 4); pax += n; jobPay('bus', JOBS.bus.base * rankMul('bus') * (G.mTimer > 0 ? 1 : .5), '정류장'); popLabel(route[i][0], 3, route[i][1], `+${n}명 탑승`, '#7ee08a', 1.2); SFX.door(); i++; mark(); } } else wait = 0;
    obj(`🚌 정류장 <em>${Math.min(i + 1, route.length)}/${route.length}</em> · 초록 표시에 <em>완전히 멈춰요</em> · 승객 ${pax}명 · ${'⭐'.repeat(rating)}`);
  };
  MI.timeUp = () => { rating = Math.max(0, rating - 1); toast('🚌 배차 시간이 늦었어요 ⭐-1'); timer(30); };
  MI.cleanup = () => { rmMarker(M); bus.mission = false; if (PL.car === bus) exitCar(); removeCar(bus); endShift(); };
}
/* ---------- 👮 경찰 ---------- */
const _crimeS3 = crime; crime = function (kind, x, z) { if (G.noCrime) return; if (JOB.on && JOB.id === 'police' && ['kill', 'killcop', 'hitcop', 'kocop', 'shootped', 'carhit'].includes(kind) && !G.noCrime) { if (MI && MI.cleanup) { const m = MI; MI = null; m.cleanup(); } big('파면!', '경찰관이 범죄를 저질렀어요', 'dead', 3500); SV.job = null; SV.lic.police = 0; save(); } return _crimeS3(kind, x, z); };
const _npcDmgS3 = npcDamage; npcDamage = function (n, dmg, dx, dz, by, kind) { if (n && n.crim) { G.noCrime = true; try { return _npcDmgS3(n, dmg, dx, dz, by, kind); } finally { G.noCrime = false; } } return _npcDmgS3(n, dmg, dx, dz, by, kind); };
function shiftPolice() {
  const s = WORK.police; const pc = makeCar('police'); placeJobCar(pc, s); pc.duty = true; MI && (MI.blipCar = pc);
  giveWeapon('pistol', 24, false); jobMI('police', { noGarage: true }); MI.blipCar = pc; let calls = 0, call = null, earned = 0, cool = 4; const N = 4 + jobRec('police').rank;
  const end = () => { const m = MI; MI = null; m.cleanup(); jobDone('police', calls * 2); big('퇴근!', `사건 ${calls}건 · ${won(earned)}`, 'pass', 3000); setupGivers(); };
  const newCall = () => { const kinds = ['chase', 'thief', 'gang', 'speed']; const k = pick(kinds); call = { k };
    if (k === 'chase' || k === 'speed') { const pos = laneNear(PL.x, PL.z, 70, 150) || (inGW(PL.x, PL.z) && null); if (!pos) { call = null; return; } const c = makeCar(k === 'speed' ? 'sports' : pick(['sedan', 'suv', 'hatch'])); laneSpawn(c, pos.x, pos.z, pos.f, 0); c.ai = null; c.flee = true; c.mission = true; c.drvP = true; c.drvLook = LOOKS.thug(); c.maxHp = c.hp = 160; scene.add(c.g); CARS.push(c); call.c = c; MI.blipCar = c; call.near = 0; note(k === 'speed' ? '📻 <b>과속 차량 신고!</b><br>따라가서 사이렌을 켠 채 10m 안에서 4초 따라붙으면 멈춰요.' : '📻 <b>도주 차량!</b><br>들이받아서 멈춰요.', 4500); }
    else if (k === 'thief') { const sp = sidewalkNear(PL.x, PL.z, 50, 110); if (!sp) { call = null; return; } const n = spawnNPC(sp[0], sp[1], 'ped', Object.assign(randomLook(false), { top: '#151515', head: 'cap', cap: '#151515' })); n.mission = true; n.crim = true; n.st = 'idle'; n.t = 999; call.n = [n]; MI.blip = n; note('📻 <b>소매치기 신고!</b><br>현장에 가서 범인을 제압해요 (주먹으로 기절시키면 체포).', 4500); }
    else { const sp = sidewalkNear(PL.x, PL.z, 50, 110); if (!sp) { call = null; return; } call.n = []; for (let i = 0; i < 3; i++) { const n = spawnNPC(sp[0] + rand(-2, 2), sp[1] + rand(-2, 2), 'thug'); n.mission = true; n.crim = true; n.st = 'stand'; call.n.push(n); } MI.blip = call.n[0]; note('📻 <b>패싸움 신고!</b><br>깡패 3명을 모두 제압해요.', 4500); }
    timer(120); };
  const solve = (pay) => { calls++; const got = jobPay('police', pay * rankMul('police'), '사건 처리'); earned += got; big('사건 해결!', '+' + won(got), 'pass', 2000); MI.blipCar = null; MI.blip = null; $('#timer').hidden = true; G.mTimer = 0; call = null; cool = 6; if (calls >= N) setTimeout(() => { if (MI && MI.job === 'police') { obj('👮 근무 끝! 경찰서로 돌아오지 않아도 돼요'); end(); } }, 2200); };
  MI.upd = dt => {
    if (!call) { if ((cool -= dt) <= 0) { cool = 3; newCall(); } obj(`👮 순찰 중… 사건 <em>${calls}/${N}</em> · 순찰차를 타고 기다려요`); return; }
    if (call.k === 'chase' || call.k === 'speed') { const c = call.c; if (!c.dead && c.hp > c.maxHp * .15 && !call.stop) fleeDrive(c, dt); const d = Math.hypot(c.x - PL.x, c.z - PL.z);
      if (call.k === 'speed' && PL.car && PL.car.type === 'police' && d < 12) { call.near += dt; setPrompt('🚨 정지 명령 중… ' + Math.max(0, 4 - call.near).toFixed(1)); if (call.near > 4 && !call.stop) { call.stop = true; c.flee = false; c.parked = true; c.v *= .3; } } else if (call.k === 'speed') call.near = Math.max(0, call.near - dt);
      if (c.dead || c.hp <= c.maxHp * .15 || call.stop) { c.flee = false; c.mission = false; c.parked = true; const L = carLeft(c), n = spawnNPC(c.x + L[0] * 2, c.z + L[1] * 2, 'thug'); n.crim = true; knockNPC(n, 6, 0, 0); n.afterKo = 'flee'; solve(call.k === 'speed' ? 30000 : JOBS.police.base); return; }
      obj(`👮 ${call.k === 'speed' ? '과속 차량 정지시키기' : '도주 차량 멈추기'} · ${Math.round(d)}m`); }
    else { const left = call.n.filter(n => !n.dead && n.ko <= 0 && NPCS.includes(n)); for (const n of left) if (Math.hypot(n.x - PL.x, n.z - PL.z) < 14 && n.st !== 'fight' && n.st !== 'flee') { n.st = call.k === 'thief' ? 'flee' : 'fight'; n.t = 999; n.threat = [PL.x, PL.z]; } for (const n of left) if (n.st === 'flee') { n.threat = [PL.x, PL.z]; n.t = 5; }
      if (!left.length) { for (const n of call.n) { n.mission = false; n.crim = false; } solve(call.k === 'gang' ? 45000 : 32000); return; } MI.blip = left[0]; obj(`👮 ${call.k === 'thief' ? '소매치기 체포' : '깡패 제압'} · 남은 범인 ${left.length}명`); }
  };
  MI.timeUp = () => { toast('📻 범인을 놓쳤어요…'); if (call) { if (call.c) { call.c.flee = false; call.c.mission = false; } if (call.n) for (const n of call.n) { n.mission = false; n.leave = true; } } call = null; cool = 5; MI.blipCar = null; MI.blip = null; };
  MI.cleanup = () => { pc.mission = false; if (call && call.c) { call.c.flee = false; call.c.mission = false; } if (call && call.n) for (const n of call.n) { n.mission = false; n.crim = false; n.leave = true; } endShift(); };
  note('👮 <b>근무 시작!</b><br>순찰차를 타고 신고를 기다려요. 시민을 다치게 하면 <b>파면</b>이에요!', 6000);
}
/* ---------- 💼 회사원 ---------- */
function shiftOffice() {
  jobMI('office'); let stage = 0, score = 0; const R_ = jobRec('office'), lvl = R_.rank;
  const tasks = [
    () => { const nums = Array.from({ length: 5 + lvl }, () => randi(12, 98) * 100); const sum = nums.reduce((a, b) => a + b, 0); const opts = [sum, sum + 100 * randi(1, 9), sum - 100 * randi(1, 9), sum + 1000].sort(() => Math.random() - .5);
      win('📊 엑셀: 이번 달 경비 합계는?', `<table class="xl">${nums.map((n, i) => `<tr><td>${['교통비', '식대', '비품', '출장', '회의비', '택배', '통신', '접대', '야근 식대'][i % 9]}</td><td>${n.toLocaleString()}</td></tr>`).join('')}<tr><td><b>=SUM()</b></td><td>?</td></tr></table><div class="qopts">${opts.map(o => `<button class="btn" data-o="${o}">${o.toLocaleString()}</button>`).join('')}</div>`);
      $$('#winB [data-o]').forEach(b => b.onclick = () => { const ok = +b.dataset.o === sum; if (ok) score++; b.classList.add(ok ? 'good' : 'bad'); setTimeout(nextT, 450); }); },
    () => { const lim = [500000, 1000000, 3000000][randi(0, 2)]; const docs = Array.from({ length: 3 }, () => ({ d: pick(['마케팅부', '개발부', '영업부', '총무부']), a: randi(1, 60) * 100000, r: Math.random() < .25 })); let k = 0, ok = 0;
      const show = () => { if (k >= docs.length) { score += ok / docs.length; nextT(); return; } const d = docs[k]; const right = d.r ? 'no' : d.a > lim ? 'up' : 'yes';
        win('🗂️ 결재 서류', `<p class="rule">📌 규칙: <b>${won(lim)}</b> 넘으면 부장님께 올리기 · 영수증이 없으면 반려</p><div class="doc"><b>${d.d}</b> 지출 결의서<br>금액: <b>${won(d.a)}</b><br>영수증: ${d.r ? '❌ 없음' : '✅ 첨부'}</div><div class="qopts"><button class="btn y" data-a="yes">✅ 승인</button><button class="btn" data-a="up">⬆️ 부장님께</button><button class="btn d" data-a="no">❌ 반려</button></div>`);
        $$('#winB [data-a]').forEach(b => b.onclick = () => { const good = b.dataset.a === right; if (good) ok++; b.classList.add(good ? 'good' : 'bad'); setTimeout(() => { k++; show(); }, 400); }); }; show(); },
    () => { const S_ = pick(['이번 분기 매출이 전년 대비 십오 퍼센트 증가했습니다', '신제품 출시 일정을 다음 달로 조정합니다', '고객 만족도 조사 결과를 보고드립니다', '내일 오전 열 시 전체 회의가 있습니다', '해외 지사와 화상 회의를 진행했습니다']); const t0 = performance.now();
      win('⌨️ 보고서 타자', `<p class="doc">${S_}</p><input id="tIn" class="tin" autocomplete="off" placeholder="여기에 똑같이 쳐요"><button class="btn y" id="tOk">제출</button>`); setTimeout(() => $('#tIn') && $('#tIn').focus(), 50);
      const fin = () => { const v = $('#tIn').value.replace(/\s+/g, ' ').trim(); let same = 0; for (let i = 0; i < S_.length; i++) if (v[i] === S_[i]) same++; const acc = same / S_.length, sec = (performance.now() - t0) / 1000; score += clamp(acc * (sec < 25 ? 1 : 25 / sec), 0, 1); nextT(); };
      $('#tOk').onclick = fin; $('#tIn').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') fin(); }; }];
  const order = [0, 1, 2, pick([0, 1])]; const nextT = () => { if (stage >= order.length) { const perf = score / order.length; win('💼 오늘의 업무 평가', `<div class="bigNum ${perf > .6 ? 'ok' : 'no'}">${Math.round(perf * 100)}점</div><p>${perf > .85 ? '부장님: "아주 훌륭해!"' : perf > .6 ? '팀장님: "수고했어요."' : '부장님: "내일은 더 잘하자…"'}</p><button class="btn y" id="oDone">퇴근 (8시간 근무)</button>`); $('#oDone').onclick = () => { winClose(); skipHours(8); jobFinish('office', JOBS.office.base * rankMul('office') * (.6 + perf * .5), 1 + perf * 4, `업무 평가 ${Math.round(perf * 100)}점`); }; return; } tasks[order[stage++]](); };
  fade(true); setTimeout(() => { fade(false); nextT(); }, 500);
}
/* ---------- 🥔 감자 농장 ---------- */
function shiftFarm() {
  jobMI('farm'); const fm = GW_TOWNS.find(t => t.id === 'farm'); const plants = []; const mat = new T.MeshStandardMaterial({ color: lin('#3f7d2a'), roughness: 1, flatShading: true });
  for (let i = 0; i < 18; i++) { const x = fm.x - 22 + (i % 6) * 8 + rand(-1, 1), z = fm.z - 8 + Math.floor(i / 6) * 9 + rand(-1, 1); const m = new T.Mesh(new T.IcosahedronGeometry(.55, 0), mat); m.scale.y = .6; m.position.set(x, gwH(x, z) + .3, z); scene.add(m); plants.push({ x, z, m, done: false }); }
  const truck = [fm.x + 26, fm.z - 16]; const tM = mkMarker(truck[0], truck[1], '#4fc3ff', { r: 1.6 }); let carry = 0, crates = 0, dig = 0, cur = null; timer(240);
  MI.upd = dt => { const near = plants.find(p => !p.done && Math.hypot(p.x - PL.x, p.z - PL.z) < 1.4);
    if (near && carry < 4 && !PL.car) { setPrompt(`🥔 ${IS_MOBILE ? '버튼을 계속 눌러' : 'E를 꾹 눌러'} 캐기 ${Math.round(dig * 100)}%`); PROMPT.act = 'dig'; if (K.KeyE || IN.act || IN.digH) { dig += (IN.act && !K.KeyE ? .22 : dt * .9) * (1 + jobRec('farm').rank * .3); PL.P.pose = 'stomp'; PL.P.poseT = (G.t * 2) % 1; if (Math.random() < dt * 8) fx('dust', near.x, gwH(near.x, near.z) + .2, near.z, { s: .5, life: .4, vy: .6, a: .6 }); } if (dig >= 1) { dig = 0; near.done = true; scene.remove(near.m); carry++; SFX.whoosh(); popLabel(near.x, gwH(near.x, near.z) + 1.5, near.z, '감자 1상자!', '#ffe27a', 1); PL.P.pose = null; } } else if (cur !== near) dig = 0; cur = near;
    if (carry && inMarker(tM, PL.x, PL.z)) { crates += carry; jobPay('farm', JOBS.farm.base * carry * rankMul('farm'), '감자 ' + carry + '상자'); carry = 0; SFX.cash(); }
    if (plants.every(p => p.done) && !carry) { rmMarker(tM); jobFinish('farm', 15000, crates * .8, `감자 ${crates}상자`); return; }
    obj(`🥔 감자 캐기 <em>${plants.filter(p => p.done).length}/${plants.length}</em> · 들고 있는 상자 ${carry}/4 · 다 차면 파란 <em>트럭</em>에 실어요`); };
  MI.timeUp = () => { rmMarker(tM); jobFinish('farm', 0, crates * .5, `시간 끝 · 감자 ${crates}상자`); };
  MI.cleanup = () => { for (const p of plants) scene.remove(p.m); rmMarker(tM); endShift(); };
  note('🥔 <b>감자 캐기!</b><br>초록 감자 줄기 앞에서 E(폰: 🏪 버튼)를 꾹 눌러 캐요. 4상자까지 들 수 있어요.', 6000);
}
addEventListener('keydown', e => { if (e.code === 'KeyE') IN.digH = true; }); addEventListener('keyup', e => { if (e.code === 'KeyE') IN.digH = false; });
/* ---------- 🎣 낚시 ---------- */
const FISH = [['🦑', '오징어', 8000, .35], ['🐟', '고등어', 5000, .3], ['🐠', '광어', 18000, .18], ['🦀', '대게', 45000, .1], ['🐡', '복어', 25000, .05], ['🐋', '참치 (전설)', 250000, .02]];
function shiftFish() {
  jobMI('fish'); let casts = 0, catchV = 0, list = []; const N = 8;
  const castOne = () => { if (casts >= N) { win('🎣 오늘의 조황', `<p>${list.join(' ') || '꽝…'}</p><p>수산시장 판매 <b>${won(catchV)}</b></p><button class="btn y" id="fDone">팔고 퇴근</button>`); $('#fDone').onclick = () => { winClose(); skipHours(3); jobFinish('fish', catchV * rankMul('fish'), 1 + list.length * .5, `물고기 ${list.length}마리`); }; return; }
    casts++; let r = Math.random(), f = FISH[FISH.length - 1]; for (const q of FISH) { if (r < q[3]) { f = q; break; } r -= q[3]; }
    const body = win(`🎣 낚시 ${casts}/${N}`, `<p id="fMsg">찌를 던졌어요… 기다려요</p><div class="fish"><div class="fbar"><i id="fZone"></i><b id="fFish">${f[0]}</b></div><div class="fprog"><i id="fProg"></i></div></div><button class="btn y fhold" id="fHold">🎣 꾹 눌러서 감기</button>`);
    let hold = false, zone = 20, zv = 0, fy = 50, fv = 0, prog = 30, bite = rand(1.2, 3.2), last = performance.now(), run = true; const diff = 1 + FISH.indexOf(f) * .35 - jobRec('fish').rank * .15;
    const hb = $('#fHold'); hb.onpointerdown = e => { e.preventDefault(); hold = true; }; for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hb.addEventListener(ev, () => hold = false); const kd = e => { if (e.code === 'Space') { hold = true; e.preventDefault(); } }, ku = e => { if (e.code === 'Space') hold = false; }; addEventListener('keydown', kd); addEventListener('keyup', ku);
    const stop = () => { run = false; removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
    WIN.onClose = () => { stop(); if (MI && MI.job === 'fish') { const m = MI; MI = null; m.cleanup(); jobFinish('fish', catchV, list.length * .5, '중간에 퇴근'); } };
    const loop = now => { if (!run || !$('#fZone')) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (bite > 0) { bite -= dt; if (bite <= 0) { $('#fMsg').textContent = '입질이다!! 감아요!'; tone(660, .15, .25, 'square'); } requestAnimationFrame(loop); return; }
      zv += (hold ? 70 : -55) * dt; zv *= .96; zone = clamp(zone + zv * dt * 6, 0, 70); if (zone <= 0 || zone >= 70) zv *= -.3;
      if (Math.random() < dt * 1.6 * diff) fv = rand(-60, 60) * diff; fy = clamp(fy + fv * dt, 0, 92); fv *= .985;
      const inZ = fy + 4 > zone && fy + 4 < zone + 30; prog = clamp(prog + (inZ ? 22 : -16 * diff) * dt, 0, 100);
      $('#fZone').style.bottom = zone + '%'; $('#fFish').style.bottom = fy + '%'; $('#fProg').style.width = prog + '%'; $('#fZone').classList.toggle('on', inZ);
      if (prog >= 100) { stop(); catchV += f[2]; list.push(f[0]); $('#fMsg').innerHTML = `잡았다! <b>${f[1]}</b> (${won(f[2])})`; SFX.pass(); if (f[2] >= 100000) { ach('fishLegend'); } setTimeout(castOne, 1200); return; }
      if (prog <= 0) { stop(); $('#fMsg').textContent = '놓쳤어요…'; SFX.fail(); setTimeout(castOne, 1000); return; }
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop); };
  MI.cleanup = () => endShift(); castOne();
}
ACH.fishLegend = ['🐋 전설의 참치 낚기', 100000]; ACH.job1 = ['💼 첫 출근', 5000]; ACH.promo = ['📈 첫 승진', 20000];
const _jobDoneS3 = jobDone; jobDone = function (id, perf) { _jobDoneS3(id, perf); ach('job1'); if (Object.values(SV.jobs).some(r => r.rank > 0)) ach('promo'); };
/* ---------- 📱 블립잡 (구직 앱) ---------- */
function jobApp() {
  s3Def(); const rows = Object.entries(JOBS).map(([id, J]) => { const r = jobRec(id), need = J.req(); const pay = J.unit ? `${J.unit} ${won(J.base * rankMul(id))}` : `하루 약 ${won(J.base * rankMul(id))}`;
    return `<div class="phRow ${SV.job === id ? 'now' : need ? 'lock' : ''}"><span>${J.n}<br><small>${J.d}<br>⏰ ${J.hours} · 💰 ${pay} · ${J.ranks[r.rank]} (근무 ${r.shifts}번)${need ? '<br>🔒 필요: ' + need : ''}</small></span><button class="phBtn ${SV.job === id ? '' : 'y'}" data-j="${id}" ${need && SV.job !== id ? 'disabled' : ''}>${SV.job === id ? '📍' : '지원'}</button></div>`; }).join('');
  phPage('💼 블립잡', `<div class="phSub">지금 직업: <b>${SV.job ? JOBS[SV.job].n : '백수'}</b> · 면허 ${SV.lic.c1 ? '1종보통 ✅' : '❌'} ${SV.lic.big ? '· 대형 ✅' : ''}</div><div class="phList">${rows}</div><p class="phNote">지원하면 일터(지도의 노란 아이콘)에 가서 출근해요. 면허는 🪪 운전면허시험장에서 따요.</p>`);
  $$('#phScr [data-j]').forEach(b => b.onclick = () => { const id = b.dataset.j; if (SV.job !== id) { SV.job = id; save(); SFX.pass(); toast(`💼 ${JOBS[id].n}에 합격했어요!`); } const m = JOB.marks.find(q => q.k === id); if (m) { G.waypoint = [m.x, m.z]; } closePhone(); toast('📍 일터를 지도에 표시했어요'); });
}
