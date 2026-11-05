'use strict';
/* ===== STA 2: 내 회사 — 스마트폰 · 전기차 · 치킨 · 패션 · 게임 회사를 세우고 키우기 + 폰 공장 타이쿤 연결 ===== */
const IND = {
  phone: { n: '📱 스마트폰', unit: '대', found: 15000000, mkt: 160, pmin: 250000, pmax: 1900000, mscale: 20000000, uc: [9000, 20000, 38000, 62000, 98000, 150000], fac: 18,
    slots: [['AP 칩', ['B1 구형', 'B2', 'B3 옥타코어', 'B4 AI', 'B5 3나노', 'B6 울트라']], ['디스플레이', ['HD LCD', 'FHD LCD', 'FHD OLED', '120Hz OLED', '2K LTPO', '폴더블']], ['카메라', ['8MP', '12MP', '48MP 듀얼', '108MP 트리플', '200MP 잠망경', 'AI 시네마']], ['배터리', ['3000mAh', '3800mAh', '4500mAh', '5000 고속충전', '5500 무선', '6000 실리콘']], ['소재', ['플라스틱', '강화유리', '알루미늄', '세라믹', '티타늄', '티타늄 폴더블']]] },
  car: { n: '🚗 전기차', unit: '대', found: 60000000, mkt: 12, pmin: 22000000, pmax: 160000000, mscale: 300000000, uc: [900000, 2000000, 3800000, 6500000, 10000000, 15000000], fac: 1.2,
    slots: [['모터', ['100kW', '150kW', '듀얼 200kW', '듀얼 300kW', '트라이 450kW', '쿼드 600kW']], ['배터리', ['50kWh', '64kWh', '77kWh', '90kWh 고속', '105kWh', '전고체 120kWh']], ['디자인', ['박스형', '세단', '패스트백', '쿠페', '쇼카', '하이퍼카']], ['안전', ['기본', '에어백 6개', 'ADAS', '레벨2 자율', '레벨3 자율', '레벨4 자율']], ['실내', ['천 시트', '인조가죽', '가죽', '파노라마 루프', '라운지', '1등석']]] },
  chicken: { n: '🍗 치킨 프랜차이즈', unit: '마리', found: 5000000, mkt: 1500, pmin: 13000, pmax: 32000, mscale: 6000000, uc: [3500, 4600, 6000, 7600, 9500, 12000], fac: 160,
    slots: [['닭', ['냉동 닭', '국내산', '무항생제', '토종닭', '유기농', '명품 토종']], ['양념', ['기본 양념', '간장', '마늘간장', '청양 매운맛', '비법 소스', '셰프 시그니처']], ['튀김', ['기름 튀김', '두 번 튀김', '크리스피', '오븐', '저온 숙성', '명장 튀김']], ['배달', ['직접 배달', '오토바이', '앱 연동', '30분 보장', '드론', '로봇 배달']], ['매장', ['포장 전문', '작은 매장', '카페형', '대형 호프', '플래그십', '테마파크']]] },
  fashion: { n: '👕 패션 브랜드', unit: '벌', found: 8000000, mkt: 700, pmin: 19000, pmax: 450000, mscale: 12000000, uc: [5000, 11000, 22000, 40000, 70000, 110000], fac: 60,
    slots: [['원단', ['폴리', '면', '린넨', '울', '캐시미어', '실크']], ['디자인', ['기본', '트렌디', '스트릿', '미니멀', '하이엔드', '오트쿠튀르']], ['봉제', ['공장', '정밀', '수제', '장인', '명장', '아틀리에']], ['모델', ['없음', '인플루언서', '아이돌', '배우', '월드스타', '전설 모델']], ['매장', ['온라인', '편집숍', '백화점', '플래그십', '해외', '파리 런웨이']]] },
  game: { n: '🎮 게임 스튜디오', unit: '장', found: 9000000, mkt: 1200, pmin: 0, pmax: 79000, mscale: 15000000, uc: [300, 400, 600, 800, 1100, 1500], fac: 999,
    slots: [['그래픽', ['도트', '2D', '저폴리 3D', '3D', '언리얼급', '실사']], ['게임성', ['단순', '재밌음', '중독성', '깊이', '명작', '전설']], ['스토리', ['없음', '짧음', '감동', '반전', '대서사시', '인생 게임']], ['사운드', ['효과음', 'BGM', '성우', '오케스트라', '돌비 애트모스', '거장 작곡']], ['플랫폼', ['웹', '모바일', 'PC', '콘솔', '멀티', '전 세계 동시']]] }
};
const RIVALS = { phone: ['삼송 갤럭시아', '애플파이 폰', '샤오미미'], car: ['테스타', '현기 아이오', 'BYB 씰'], chicken: ['교촌촌', 'BHQ', '굽네굽네'], fashion: ['나이스', '자라자라', '유니클라'], game: ['넥슨슨', '엔씨씨', '라이엇엇'] };
function coDef() { const co = SV.co; if (!co) return null; co.staff = co.staff || { dev: 2, sales: 1, fac: 1 }; co.tech = co.tech || [1, 1, 1, 1, 1]; co.prods = co.prods || []; co.hist = co.hist || []; co.queue = co.queue || 0; co.office = co.office || 1; co.hype = co.hype || 0; co.brand = co.brand == null ? 5 : co.brand; co.rq = co.rq || null; co.dev = co.dev || null; co.rivals = co.rivals || RIVALS[co.ind].map((n, i) => ({ n, q: 28 + i * 6, b: 40 + i * 10 })); co.today = co.today || { rev: 0, cost: 0, sold: 0 }; return co; }
const OFFICE = [[5, 100000, '공유 오피스'], [12, 400000, '강남 사무실'], [30, 1500000, '사옥 한 층'], [80, 5000000, '블립 타워 본사']];
const STAFF = { dev: ['👩‍💻 개발자', 160000], sales: ['🧑‍💼 영업 · 마케터', 130000], fac: ['👷 생산 직원', 110000] };
function expQ() { return clamp(28 + (SV.day || 1) * 1.4, 28, 96); }
function prodQ(spec) { const a = spec.reduce((s, l) => s + l, 0) / spec.length; const mn = Math.min(...spec); return clamp((a * .8 + mn * .2) / 6 * 100, 5, 100); }
function prodUC(ind, spec) { const I = IND[ind]; return Math.round(spec.reduce((s, l) => s + I.uc[l - 1], 0) / 100) * 100; }
function fairPrice(ind, q) { const I = IND[ind]; return Math.round(lerp(I.pmin, I.pmax, Math.pow(q / 100, 1.3)) / 1000) * 1000; }
function coValue() { const co = coDef(); if (!co) return 0; const wk = co.hist.slice(-7).reduce((s, h) => s + h.profit, 0); return Math.max(0, Math.round(co.cash + Math.max(0, wk) * 20 + co.brand * IND[co.ind].mscale / 40 + co.prods.reduce((s, p) => s + p.stock * p.uc, 0))); }
function staffN(co) { return co.staff.dev + co.staff.sales + co.staff.fac; }
/* ---------- 시간 흐름 (게임 1시간마다) ---------- */
function coHour() {
  const co = coDef(); if (!co) return; const I = IND[co.ind], boost = co.meetDay === SV.day ? 1.25 : 1;
  if (co.dev) { co.dev.prog += co.staff.dev * boost; if (co.dev.prog >= co.dev.need) { const d = co.dev; co.dev = null; const p = { n: d.n, spec: d.spec, q: prodQ(d.spec), uc: prodUC(co.ind, d.spec), price: fairPrice(co.ind, prodQ(d.spec)), stock: 0, sold: 0, rev: 0, day: SV.day, hype: .6 + co.brand / 100 }; co.prods.push(p); co.brand = Math.min(100, co.brand + Math.max(0, p.q - expQ()) * .15 + 1); note(`🎉 <b>${co.name}</b> 신제품 「${p.n}」 개발 완료!<br>품질 ${Math.round(p.q)}점 · 📱 회사 앱에서 생산을 주문해요.`, 6000); SFX.pass(); } }
  if (co.rq) { co.rq.prog += co.staff.dev * .8 * boost; if (co.rq.prog >= co.rq.need) { co.tech[co.rq.slot] = co.rq.lvl; note(`🔬 연구 완료: ${I.slots[co.rq.slot][0]} → ${I.slots[co.rq.slot][1][co.rq.lvl - 1]}`, 4500); co.rq = null; } }
  // 생산
  if (co.queue > 0 && co.prods.length) { const cap = Math.max(1, Math.round(co.staff.fac * I.fac * boost)); const n = Math.min(co.queue, cap); co.queue -= n; const p = co.prods.find(q => q.qid === co.qp) || co.prods[co.prods.length - 1]; p.stock += n; }
  // 판매
  const ex = expQ(); let rivalA = 0; for (const r of co.rivals) rivalA += Math.pow(r.q / ex, 2.2) * (.5 + r.b / 100);
  for (const p of co.prods) { if (p.stock <= 0 || p.off) continue; const fp = fairPrice(co.ind, p.q), pr = Math.max(1, p.price || 1); const a = Math.pow(p.q / ex, 2.2) * Math.pow(Math.max(fp, I.pmin * .5 || 1000) / Math.max(pr, (I.pmin || 1000) * .3), 1.5) * (.5 + co.brand / 100) * (1 + co.hype + p.hype) * (1 + co.staff.sales * .04);
    const share = a / (a + rivalA); const sold = Math.min(p.stock, Math.round(I.mkt / 24 * share * rand(.8, 1.2) * Math.pow(.97, SV.day - p.day))); p.stock -= sold; p.sold += sold; p.rev += sold * pr; co.cash += sold * pr; co.today.rev += sold * pr; co.today.sold += sold; p.hype *= .97; p.share = share; }
}
function coDay() {
  const co = coDef(); if (!co) return null; const pay = co.staff.dev * STAFF.dev[1] + co.staff.sales * STAFF.sales[1] + co.staff.fac * STAFF.fac[1] + OFFICE[co.office - 1][1]; co.cash -= pay; co.today.cost += pay;
  co.hype *= .85; for (const r of co.rivals) { r.q = Math.min(98, r.q + rand(.4, 1.6)); r.b = clamp(r.b + rand(-1, 1), 20, 95); }
  const profit = co.today.rev - co.today.cost; co.hist.push({ d: SV.day, rev: co.today.rev, profit, sold: co.today.sold }); if (co.hist.length > 30) co.hist.shift(); co.today = { rev: 0, cost: 0, sold: 0 };
  if (co.cash < 0) { co.neg = (co.neg || 0) + 1; if (co.neg >= 3) { const n = co.name; SV.co = null; big('회사 파산…', n, 'dead', 4000); return `💥 ${n} 파산 (3일 연속 적자 자금)`; } return `⚠️ ${co.name} 자금 부족! ${3 - co.neg}일 안에 돈을 넣어요`; } co.neg = 0;
  if (profit > 0) ach('coProfit'); if (coValue() >= 1e9) ach('coBillion');
  return `🏢 ${co.name}: 어제 매출 ${won(profit + pay)} · 비용 ${won(pay)} · 순이익 ${won(profit)}`;
}
DAYEV.push(coDay); ACH.coFound = ['🏢 회사 창업', 50000]; ACH.coProfit = ['📈 첫 흑자', 100000]; ACH.coBillion = ['💎 기업가치 10억', 1000000];
let _coHr = null; S2TICK.push(() => { const h = Math.floor(DAY.t); if (_coHr === null) _coHr = h; if (h !== _coHr) { _coHr = h; coHour(); } });
/* ---------- 회사 화면 ---------- */
let coTab = 'home';
function coApp(tab) {
  if (tab) coTab = tab; const co = coDef();
  if (!co) return coFoundUI();
  const I = IND[co.ind], ex = expQ(), tabs = [['home', '📊 개요'], ['dev', '🛠️ 신제품'], ['res', '🔬 연구'], ['prod', '🏭 생산·가격'], ['staff', '👥 직원'], ['fin', '💰 재무'], ['mkt', '📢 마케팅']];
  let h = `<div class="tabs">${tabs.map(t => `<button class="${coTab === t[0] ? 'on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  if (coTab === 'home') { const last = co.hist.slice(-10), mx = Math.max(1, ...last.map(x => Math.abs(x.profit)), ...last.map(x => x.rev));
    h += `<div class="kv"><b>업종</b><span>${I.n}</span><b>회사 자금</b><span>${won(co.cash)}</span><b>기업가치</b><span>${won(coValue())}</span><b>브랜드</b><span>${Math.round(co.brand)} / 100</span><b>시장 기대 품질</b><span>${Math.round(ex)}점 (매일 올라가요)</span><b>직원</b><span>${staffN(co)}명 / ${OFFICE[co.office - 1][0]}명 (${OFFICE[co.office - 1][2]})</span><b>오늘</b><span>매출 ${won(co.today.rev)} · ${co.today.sold.toLocaleString()}${I.unit} 판매</span></div>
    <div class="chart">${last.map(x => `<div><i style="height:${x.rev / mx * 100}%;background:#3aa0ff" title="매출"></i><i style="height:${Math.abs(x.profit) / mx * 100}%;background:${x.profit >= 0 ? '#7ee08a' : '#ff6b6b'}"></i><small>D${x.d}</small></div>`).join('') || '<p class="dim">하루가 지나면 그래프가 생겨요</p>'}</div>
    <p class="dim">🔵 매출 · 🟢 이익 · 🔴 손해 · ${co.meetDay === SV.day ? '✅ 오늘 경영 회의 완료 (생산성 +25%)' : '💡 본사(지도 🏢)에 가서 경영 회의를 하면 그날 생산성 +25%'}</p>
    <h3>🏆 시장 점유율</h3>${coShare(co)}`; }
  if (coTab === 'dev') { if (co.dev) h += `<p>「${co.dev.n}」 개발 중… <b>${Math.round(co.dev.prog / co.dev.need * 100)}%</b> (개발자 ${co.staff.dev}명)</p><div class="pbar"><i style="width:${co.dev.prog / co.dev.need * 100}%"></i></div>`;
    else { co.draft = co.draft || co.tech.slice(); const q = prodQ(co.draft), uc = prodUC(co.ind, co.draft), cost = Math.round(uc * 120 + co.draft.reduce((s, l) => s + l * l, 0) * I.uc[0] * 20), need = Math.round(co.draft.reduce((s, l) => s + l * l, 0) * 3);
      h += `<p>부품을 골라 신제품을 설계해요. 연구한 단계까지 고를 수 있어요.</p>${I.slots.map((s, i) => `<div class="slot"><b>${s[0]}</b><div>${s[1].map((nm, l) => `<button class="${co.draft[i] === l + 1 ? 'on' : ''}" data-s="${i}:${l + 1}" ${l + 1 > co.tech[i] ? 'disabled' : ''}>${nm}</button>`).join('')}</div></div>`).join('')}
      <div class="kv"><b>예상 품질</b><span>${Math.round(q)}점 ${q >= ex ? '✅ 시장 기대 이상' : '⚠️ 기대(' + Math.round(ex) + ') 미달'}</span><b>1${I.unit} 원가</b><span>${won(uc)}</span><b>적정가</b><span>${won(fairPrice(co.ind, q))}</span><b>개발비</b><span>${won(cost)}</span><b>개발 기간</b><span>약 ${Math.ceil(need / Math.max(1, co.staff.dev))}시간 (게임)</span></div>
      <input id="pName" class="tin" maxlength="18" placeholder="제품 이름 (예: ${co.name} ${co.prods.length + 1})"><button class="btn y" id="pGo">🛠️ 개발 시작 (${won(cost)})</button>`; } }
  if (coTab === 'res') { h += `<p>연구하면 더 좋은 부품을 쓸 수 있어요. 개발자가 많을수록 빨라요.</p>${co.rq ? `<p>🔬 ${I.slots[co.rq.slot][0]} → ${I.slots[co.rq.slot][1][co.rq.lvl - 1]} 연구 중 ${Math.round(co.rq.prog / co.rq.need * 100)}%</p><div class="pbar"><i style="width:${co.rq.prog / co.rq.need * 100}%"></i></div>` : ''}
    ${I.slots.map((s, i) => { const l = co.tech[i]; const cost = Math.round(I.uc[Math.min(5, l)] * 220 * l); return `<div class="slot"><b>${s[0]}</b><span>현재: ${s[1][l - 1]}</span>${l < 6 ? `<button class="btn" data-r="${i}" ${co.rq ? 'disabled' : ''}>→ ${s[1][l]} · ${won(cost)}</button>` : '<span>✅ 최고</span>'}</div>`; }).join('')}`; }
  if (coTab === 'prod') { h += co.prods.length ? co.prods.slice().reverse().map(p => { const fp = fairPrice(co.ind, p.q), idx = co.prods.indexOf(p); return `<div class="prod ${p.q < ex * .8 ? 'old' : ''}"><b>${p.n}</b> <small>품질 ${Math.round(p.q)} · 원가 ${won(p.uc)} · 재고 ${p.stock.toLocaleString()} · 누적 ${p.sold.toLocaleString()}${I.unit} · 점유 ${Math.round((p.share || 0) * 100)}%${p.q < ex * .8 ? ' · ⚠️ 구형' : ''}</small>
      <div class="row2">가격 <input type="range" min="${Math.round(p.uc * .8)}" max="${Math.round(Math.max(fp * 2, p.uc * 3))}" step="1000" value="${p.price}" data-pr="${idx}"><b id="pv${idx}">${won(p.price)}</b><small>적정 ${won(fp)}</small></div>
      <div class="row2">${[100, 1000, 10000].map(n => `<button class="btn" data-o="${idx}:${n}">${n.toLocaleString()}${I.unit} 생산 ${won(n * p.uc)}</button>`).join('')}</div></div>`; }).join('') + `<p class="dim">생산 대기 ${co.queue.toLocaleString()}${I.unit} · 시간당 ${Math.round(co.staff.fac * I.fac)}${I.unit} 생산 (생산 직원 ${co.staff.fac}명)</p>` : '<p>먼저 🛠️ 신제품을 개발해요.</p>'; }
  if (coTab === 'staff') { const cap = OFFICE[co.office - 1][0]; h += Object.entries(STAFF).map(([k, s]) => `<div class="slot"><b>${s[0]}</b><span>${co.staff[k]}명 · 하루 ${won(s[1])}/명</span><button class="btn" data-h="${k}:1" ${staffN(co) >= cap ? 'disabled' : ''}>+ 고용</button><button class="btn d" data-h="${k}:-1" ${co.staff[k] <= (k === 'dev' ? 1 : 0) ? 'disabled' : ''}>- 해고</button></div>`).join('') + `<p>사무실: <b>${OFFICE[co.office - 1][2]}</b> (최대 ${cap}명 · 하루 ${won(OFFICE[co.office - 1][1])})</p>${co.office < OFFICE.length ? `<button class="btn y" id="oUp">🏢 ${OFFICE[co.office][2]}로 이사 (최대 ${OFFICE[co.office][0]}명) · 이사비 ${won(OFFICE[co.office][1] * 10)}</button>` : ''}`; }
  if (coTab === 'fin') { h += `<div class="kv"><b>회사 자금</b><span>${won(co.cash)}</span><b>내 현금</b><span>${won(SV.money)}</span><b>기업가치</b><span>${won(coValue())}</span></div><div class="row2"><button class="btn" data-f="in:1000000">내 돈 100만 투자</button><button class="btn" data-f="in:10000000">1000만 투자</button></div><div class="row2"><button class="btn y" data-f="out:1000000">100만 배당받기</button><button class="btn y" data-f="out:10000000">1000만 배당받기</button></div><p class="dim">배당은 세금 15%를 떼고 내 돈으로 들어와요. 회사 자금이 3일 넘게 마이너스면 파산해요!</p><button class="btn d" id="coSell">🏷️ 회사 매각 (기업가치의 70%)</button>`; }
  if (coTab === 'mkt') { h += `<p>광고를 하면 인기(하이프)가 올라 판매가 늘어요. 하이프는 매일 15%씩 줄어요.</p><div class="kv"><b>하이프</b><span>${Math.round(co.hype * 100)}%</span><b>브랜드</b><span>${Math.round(co.brand)}</span></div>${[['📰 인터넷 광고', .02], ['📺 TV 광고', .08], ['🌟 톱스타 모델', .25], ['🎪 신제품 발표회', .6]].map(m => `<button class="btn" data-m="${m[1]}"><span>${m[0]}</span> <b>${won(I.mscale * m[1])}</b></button>`).join('')}`; }
  win(`🏢 ${co.name}`, h);
  $$('#winB [data-t]').forEach(b => b.onclick = () => coApp(b.dataset.t));
  $$('#winB [data-s]').forEach(b => b.onclick = () => { const [i, l] = b.dataset.s.split(':').map(Number); co.draft[i] = l; coApp(); });
  const pg = $('#pGo'); if (pg) pg.onclick = () => { const cost = Math.round(prodUC(co.ind, co.draft) * 120 + co.draft.reduce((s, l) => s + l * l, 0) * I.uc[0] * 20); if (co.cash < cost) { toast('💸 회사 자금이 부족해요 (재무 탭에서 투자)'); return; } co.cash -= cost; co.today.cost += cost; co.dev = { n: ($('#pName').value || `${co.name} ${co.prods.length + 1}`).slice(0, 18), spec: co.draft.slice(), prog: 0, need: Math.round(co.draft.reduce((s, l) => s + l * l, 0) * 3) }; co.draft = null; save(); SFX.cash(); coApp(); };
  $$('#winB [data-r]').forEach(b => b.onclick = () => { const i = +b.dataset.r, l = co.tech[i], cost = Math.round(I.uc[Math.min(5, l)] * 220 * l); if (co.cash < cost) { toast('💸 회사 자금이 부족해요'); return; } co.cash -= cost; co.today.cost += cost; co.rq = { slot: i, lvl: l + 1, prog: 0, need: (l + 1) * (l + 1) * 4 }; save(); coApp(); });
  $$('#winB [data-pr]').forEach(r => { r.oninput = () => { const p = co.prods[+r.dataset.pr]; p.price = +r.value; $('#pv' + r.dataset.pr).textContent = won(p.price); }; r.onchange = () => save(); });
  $$('#winB [data-o]').forEach(b => b.onclick = () => { const [i, n] = b.dataset.o.split(':').map(Number); const p = co.prods[i], c = n * p.uc; if (co.cash < c) { toast('💸 회사 자금이 부족해요'); return; } co.cash -= c; co.today.cost += c; co.queue += n; co.qp = p.qid = p.qid || Date.now() + i; save(); SFX.cash(); coApp(); });
  $$('#winB [data-h]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.h.split(':'); co.staff[k] = Math.max(0, co.staff[k] + +d); save(); coApp(); });
  const ou = $('#oUp'); if (ou) ou.onclick = () => { const c = OFFICE[co.office][1] * 10; if (co.cash < c) { toast('💸 회사 자금이 부족해요'); return; } co.cash -= c; co.office++; save(); coApp(); };
  $$('#winB [data-f]').forEach(b => b.onclick = () => { const [k, n] = b.dataset.f.split(':'); const v = +n; if (k === 'in') { if (SV.money < v) { toast('💸 내 돈이 부족해요'); return; } addMoney(-v, co.name + ' 투자'); co.cash += v; } else { if (co.cash < v) { toast('💸 회사 자금이 부족해요'); return; } co.cash -= v; addMoney(Math.round(v * .85), co.name + ' 배당'); } save(); SFX.cash(); coApp(); });
  const cs = $('#coSell'); if (cs) cs.onclick = () => { if (!confirm(`${co.name}을(를) ${won(coValue() * .7)}에 팔까요?`)) return; addMoney(Math.round(coValue() * .7), '회사 매각'); SV.co = null; save(); winClose(); big('회사 매각!', '새 회사를 세울 수 있어요', 'pass', 3000); };
  $$('#winB [data-m]').forEach(b => b.onclick = () => { const k = +b.dataset.m, c = I.mscale * k; if (co.cash < c) { toast('💸 회사 자금이 부족해요'); return; } co.cash -= c; co.today.cost += c; co.hype += k * 1.4; co.brand = Math.min(100, co.brand + k * 6); save(); SFX.pass(); coApp(); });
}
function coShare(co) { const ex = expQ(), I = IND[co.ind]; const me = co.prods.filter(p => p.stock > 0 || p.sold > 0).reduce((s, p) => Math.max(s, Math.pow(p.q / ex, 2.2) * (.5 + co.brand / 100) * (1 + co.hype)), 0); const rows = co.rivals.map(r => [r.n, Math.pow(r.q / ex, 2.2) * (.5 + r.b / 100), Math.round(r.q)]).concat([[co.name + ' (나)', me, co.prods.length ? Math.round(Math.max(...co.prods.map(p => p.q))) : 0]]); const tot = rows.reduce((s, r) => s + r[1], 0) || 1; return rows.sort((a, b) => b[1] - a[1]).map(r => `<div class="share"><span>${r[0]} <small>품질 ${r[2]}</small></span><i style="width:${r[1] / tot * 100}%;background:${r[0].endsWith('(나)') ? '#ffcc33' : '#5a6b8a'}"></i><b>${Math.round(r[1] / tot * 100)}%</b></div>`).join(''); }
function coFoundUI() {
  let pick_ = 'phone'; const draw = () => { win('🏢 회사 세우기', `<p>업종을 고르고 회사 이름을 정해요. 창업 자금은 회사 통장으로 들어가요 (내 돈에서 빠져요). 빚으로 시작하려면 📱 블립뱅크에서 대출!</p><div class="inds">${Object.entries(IND).map(([k, I]) => `<button class="${pick_ === k ? 'on' : ''}" data-i="${k}"><b>${I.n}</b><small>창업 ${won(I.found)}</small></button>`).join('')}</div><input id="cName" class="tin" maxlength="12" placeholder="회사 이름"><button class="btn y" id="cGo">🏢 ${won(IND[pick_].found)}로 창업하기</button>`);
    $$('#winB [data-i]').forEach(b => b.onclick = () => { pick_ = b.dataset.i; const v = $('#cName').value; draw(); $('#cName').value = v; });
    $('#cGo').onclick = () => { const I = IND[pick_], nm = ($('#cName').value || '').trim(); if (!nm) { $('#cName').placeholder = '❗ 이름을 적어요'; return; } if (SV.money < I.found) { $('#cGo').textContent = '돈이 부족해요 (' + won(I.found) + ')'; SFX.fail(); return; } addMoney(-I.found, nm + ' 창업'); SV.co = { name: nm, ind: pick_, cash: I.found, day0: SV.day }; coDef(); ach('coFound'); xp(300, '창업'); save(); SFX.pass(); big('창업!', nm + ' · ' + I.n, 'pass', 3000); coApp('home'); }; };
  draw();
}
/* ---------- 본사 · 경영 회의 ---------- */
const HQ = { M: null, x: 0, z: 0 };
S2TICK.push(() => {
  if (!HQ.M && G.on && BUILD.landmarks.tower) { const t = BUILD.landmarks.tower; HQ.x = t.x - 6; HQ.z = t.z; HQ.M = mkMarker(HQ.x, HQ.z, '#3aa0ff', { r: 1 }); }
  if (!HQ.M) return; HQ.M.g.visible = !!SV.co && !MI; if (!SV.co || MI || PL.car || INSIDE) return;
  if (Math.hypot(PL.x - HQ.x, PL.z - HQ.z) < 2) { setPrompt((IS_MOBILE ? '🏪 버튼: ' : 'E: ') + `🏢 ${SV.co.name} 본사 · ${SV.co.meetDay === SV.day ? '회사 관리' : '경영 회의 하기'}`); PROMPT.act = 'hq'; if (IN.act) { if (SV.co.meetDay !== SV.day) meeting(); else coApp('home'); } }
});
const _mapIconsCo = mapIcons; mapIcons = function () { const out = _mapIconsCo(); if (G.on && SV.co && HQ.M) out.push({ x: HQ.x, z: HQ.z, t: '🏢', c: '#3aa0ff', small: 0 }); return out; };
function meeting() {
  const co = coDef(); const evs = [
    ['📦 부품 공급이 부족하대요. 어떻게 할까요?', [['비싸게라도 산다 (자금 -)', () => { co.cash -= IND[co.ind].mscale * .05; co.hype += .05; }], ['생산을 잠시 줄인다', () => { co.queue = Math.round(co.queue * .7); }], ['다른 업체를 뚫는다 (도박)', () => { if (Math.random() < .5) { co.brand += 3; toast('🎉 좋은 업체를 찾았어요! 브랜드 +3'); } else { co.cash -= IND[co.ind].mscale * .08; toast('😢 사기를 당했어요…'); } }]]],
    ['📣 유명 유튜버가 리뷰하고 싶대요.', [['제품을 보내준다', () => { co.hype += .15; }], ['돈을 주고 칭찬해 달라고 한다', () => { co.cash -= IND[co.ind].mscale * .03; if (Math.random() < .3) { co.brand -= 8; toast('😱 뒷광고가 들켰어요! 브랜드 -8'); } else co.hype += .3; }], ['거절한다', () => { }]]],
    ['👥 직원들이 야근이 너무 많대요.', [['보너스를 준다 (자금 -)', () => { co.cash -= staffN(co) * 100000; co.brand += 1; }], ['조금만 더 버티자고 한다', () => { if (Math.random() < .4 && co.staff.dev > 1) { co.staff.dev--; toast('😢 개발자 1명이 퇴사했어요'); } }], ['재택근무를 허락한다', () => { co.brand += 2; }]]],
    ['💡 개발팀이 새 아이디어를 냈어요!', [['당장 연구 지원 (자금 -)', () => { co.cash -= IND[co.ind].mscale * .04; if (co.rq) co.rq.prog += co.rq.need * .4; if (co.dev) co.dev.prog += co.dev.need * .3; }], ['다음 제품에 반영', () => { co.brand += 1; }], ['쓸데없다고 무시', () => { }]]]];
  const e = pick(evs); win(`📋 ${co.name} 경영 회의`, `<p class="qq">${e[0]}</p><div class="qopts">${e[1].map((o, i) => `<button class="btn" data-c="${i}">${o[0]}</button>`).join('')}</div><p class="dim">회의를 하면 오늘 하루 개발 · 연구 · 생산 속도 +25%</p>`);
  $$('#winB [data-c]').forEach(b => b.onclick = () => { e[1][+b.dataset.c][1](); co.brand = clamp(co.brand, 0, 100); co.meetDay = SV.day; save(); xp(40, '경영 회의'); SFX.pass(); coApp('home'); });
}
/* ---------- 컴퓨터 (집) ---------- */
function pcMenu() {
  const ty = tycoonMoney(); const lim = ty == null ? 0 : Math.min(5000000, Math.max(0, Math.round((ty - 6e8) * .02)));
  win('💻 내 컴퓨터', `<div class="pc"><button class="btn y" id="pcCo">🏢 ${SV.co ? SV.co.name + ' 관리' : '회사 세우기'}</button><button class="btn" id="pcTy">🏭 폰 공장 타이쿤 (PC 게임)</button>${ty != null ? `<button class="btn" id="pcDiv" ${lim > 0 && SV.tyDay !== SV.day ? '' : 'disabled'}><span>💵 타이쿤 회사 배당 받기</span> <b>${lim > 0 ? won(lim) : '이익이 없어요'}</b></button>` : ''}<button class="btn" id="pcJob">💼 블립잡 (구직)</button><button class="btn" id="pcBank">🏦 인터넷 뱅킹</button><button class="btn" id="pcShop">🛒 장보기 (밀키트 3개 · ${won(24000)})</button></div><p class="dim">폰 공장 타이쿤에서 번 돈(₩6억 초과분)의 2%를 하루 한 번, 최대 ₩500만까지 STA로 가져올 수 있어요.</p>`);
  $('#pcCo').onclick = () => coApp(); $('#pcTy').onclick = openTycoon; $('#pcJob').onclick = () => { winClose(); openPhone(); jobApp(); }; $('#pcBank').onclick = () => { winClose(); openPhone(); bankApp(); }; $('#pcShop').onclick = () => { if (SV.money < 24000) { toast('💸 돈이 부족해요'); return; } addMoney(-24000, '장보기'); SV.fridge += 3; toast('🛒 밀키트 3개를 냉장고에 넣었어요'); };
  const dv = $('#pcDiv'); if (dv) dv.onclick = () => { try { const S = JSON.parse(localStorage.getItem('phonetycoon_v3')); S.money -= lim; localStorage.setItem('phonetycoon_v3', JSON.stringify(S)); SV.tyDay = SV.day; addMoney(lim, '폰 공장 타이쿤 배당'); save(); SFX.cash(); pcMenu(); } catch (e) { toast('타이쿤 저장을 못 읽었어요'); } };
}
function tycoonMoney() { try { const S = JSON.parse(localStorage.getItem('phonetycoon_v3') || 'null'); return S && typeof S.money === 'number' ? S.money : null; } catch (e) { return null; } }
function openTycoon() { const o = $('#tycoon'); o.hidden = false; $('#tyF').src = '../phonetycoon/'; G.paused = true; if (AU.master) AU.master.gain.value = 0; }
$('#tyX').onclick = () => { $('#tycoon').hidden = true; $('#tyF').src = 'about:blank'; if (AU.master) AU.master.gain.value = AU.on ? .8 : 0; if (!$('#win').hidden) pcMenu(); else G.paused = false; };
/* 내 회사가 스마트폰이면, 내 휴대폰이 내 제품으로 바뀌어요 */
const _openPhoneS3 = openPhone; openPhone = function (a, o) { _openPhoneS3(a, o); const co = SV.co, ph = $('#phone .ph'); if (!ph) return; if (co && co.ind === 'phone' && co.prods.length) { const p = co.prods[co.prods.length - 1]; ph.style.borderColor = ['#33363f', '#c0c0c0', '#d4af37', '#8ab4f8', '#e8e8e8', '#b0a090'][p.spec[4] - 1]; $('#phone .phNotch').textContent = p.n.slice(0, 9); } };
