'use strict';
/* ===== 강화 (FC온라인과 같은 확률표 · 풀게이지 기준) =====
   1→2강 100% · 2→3 81% · 3→4 64% · 4→5 50% · 5→6 26% · 6→7 15% · 7→8 7% · 8→9 5% · 9→10 4%
   OVR(1강 대비) +0 · +1 · +2 · +4 · +6 · +8 · +11 · +15 · +17 · +19
   실패하면 아래 확률로 낮은 강화 단계로 떨어져요 (선수는 안 사라져요) */
const ENH = {
  rate: [1, .81, .64, .5, .26, .15, .07, .05, .04],
  bonus: [0, 1, 2, 4, 6, 8, 11, 15, 17, 19],
  drop: [[1], [1], [.65, .35], [.55, .45], [.35, .4, .25], [.1, .32, .36, .22], [.04, .1, .3, .35, .21], [.02, .04, .1, .28, .35, .21], [.01, .02, .04, .1, .28, .34, .21]],
};
const lvOf = id => { const c = club(); const v = c && c.own[id]; return v ? Math.max(1, Math.min(10, +v || 1)) : 0; };
const cardO = p => p.o + (ENH.bonus[lvOf(p.id) - 1] || 0);
function boost(p, lv) { const b = ENH.bonus[(lv || 1) - 1] || 0; if (!b) return p; const st = {}; for (const k in p.st) st[k] = (k === 'gk') !== (p.pos === 'GK') ? p.st[k] : p.st[k] + b; return Object.assign({}, p, { o: p.o + b, st, lv }); }
// 재료 가치 · 필요한 양 → 게이지 (재료 OVR이 높을수록, 강화 단계가 낮을수록 잘 차요)
const matVal = p => Math.pow(2, (cardO(p) - 70) / 10) * (1 + .3 * (lvOf(p.id) - 1));
const needVal = p => Math.pow(2, (Math.min(99, cardO(p)) - 70) / 10) * (1 + .08 * (lvOf(p.id) - 1)) * 1.15; // 펠레 같은 높은 카드 · 높은 강화 단계도 게이지 100%까지 찰 수 있어요
function upGauge() { const t = CL.upT != null ? PDB[CL.upT] : null; if (!t) return 0; const s = (CL.upM || []).reduce((a, i) => a + matVal(PDB[i]), 0); return Math.min(1, s / needVal(t)); }
const upFee = lv => 50 * lv;
const canMat = id => id !== CL.upT && !isBase(id); // 선발도 재료로 쓸 수 있어요 (자리는 자동으로 채워요)
function autoMats() { const c = club(); const L = owned().filter(p => canMat(p.id)).sort((a, b) => (c.xi.includes(a.id) - c.xi.includes(b.id)) || (matVal(a) - matVal(b))); const need = needVal(PDB[CL.upT]); const out = []; let sum = 0; for (const p of L) { if (out.length >= 5 || sum >= need) break; out.push(p.id); sum += matVal(p); } return out; }

function refillXI() { const c = club(); const F = FORMS[c.form]; c.xi = c.xi.map((id, k) => { if (id != null && c.own[id]) return id; const pool = owned().filter(q => !c.xi.includes(q.id)).sort((a, b) => cardO(b) - cardO(a)); const r = pool.find(q => q.pos === F[k][0]) || pool[0]; return r ? r.id : null; }); }
function renderUp() {
  const B = $('#clBody'), c = club(); CL.upM = (CL.upM || []).filter(i => c.own[i] && canMat(i)); if (CL.upT != null && !c.own[CL.upT]) CL.upT = null;
  const t = CL.upT != null ? PDB[CL.upT] : null; const lv = t ? lvOf(t.id) : 0, g = upGauge(); const max = lv ? (ENH.rate[lv - 1] || 0) : 0; const rate = max * g;
  const list = owned().sort((a, b) => cardO(b) - cardO(a));
  const info = !t ? `<div class="upinfo"><b>⚡ 강화</b><p>1. 아래에서 강화할 선수를 누르세요<br>2. 재료로 쓸 선수(잡카드)를 최대 5명 고르세요<br>3. 게이지가 찰수록 성공 확률이 올라가요</p><p class="tiny">확률은 FC온라인과 같아요 (풀게이지 1→2강 100% … 9→10강 4%) · 10강이면 OVR +19</p></div>`
    : lv >= 10 ? `<div class="upinfo"><b>+10 최고 단계예요! 🏆</b><p>OVR ${cardO(t)}</p><button class="btn" id="bUpReset">다른 선수 고르기</button></div>`
    : `<div class="upinfo"><b>+${lv} → +${lv + 1}</b><p>OVR ${cardO(t)} → <b class="up">${t.o + ENH.bonus[lv]}</b></p>
      <div class="gauge"><i style="width:${Math.round(g * 100)}%"></i><span>게이지 ${Math.round(g * 100)}%</span></div>
      <p>성공 확률 <b class="rate">${(rate * 100).toFixed(rate < .1 ? 1 : 0)}%</b> <small>(풀게이지 ${Math.round(max * 100)}%)</small></p>
      <p class="tiny">실패하면 ${ENH.drop[lv - 1].map((w, i) => `+${i + 1} ${Math.round(w * 100)}%`).join(' · ')}로 떨어져요 · 재료는 사라져요</p>
      <div class="row2"><button class="btn" id="bUpReset">다른 선수</button><button class="btn main" id="bUp" ${(CL.upM || []).length ? '' : 'disabled'}>⚡ 강화 🪙${upFee(lv)}</button></div></div>`;
  B.innerHTML = `<div class="upwrap"><div class="uptop">${t ? bigCard(t) : '<div class="upempty">⚡</div>'}${info}</div>
    ${t ? `<div class="uphint"><p class="hintp">재료 ${(CL.upM || []).length} / 5 · 처음 받은 기본 선수는 재료로 못 써요 · 선발을 쓰면 자리는 자동으로 채워요</p>${lv < 10 ? '<button class="chip" id="bUpAuto">✨ 재료 자동</button>' : ''}</div>${owned().some(p => canMat(p.id)) ? '' : '<p class="hintp">재료로 쓸 선수가 없어요 — 선수 뽑기 잡카드를 모아 보세요</p>'}` : '<p class="hintp">강화할 선수를 고르세요</p>'}
    <div class="bench uplist">${list.map(p => { const cls = p.id === CL.upT ? ' tgt' : (CL.upM || []).includes(p.id) ? ' mat' : t && !canMat(p.id) ? ' no' : ''; return `<div class="upc${cls}${c.xi.includes(p.id) ? ' inxi' : ''}" data-upc="${p.id}">${cardHTML(p)}</div>`; }).join('')}</div></div>`;
}
document.addEventListener('click', e => {
  if (UI.screen !== 'club' || CL.tab !== 'up') return; const el = e.target.closest('[data-upc],#bUp,#bUpReset,#bUpAuto'); if (!el) return; sfx('tick');
  if (el.id === 'bUpAuto') { CL.upM = autoMats(); if (!CL.upM.length) toast('재료로 쓸 선수가 없어요'); return clubTab('up'); }
  if (el.id === 'bUpReset') { CL.upT = null; CL.upM = []; return clubTab('up'); }
  if (el.id === 'bUp') return doUpgrade();
  const id = +el.dataset.upc;
  if (CL.upT == null || id === CL.upT) { CL.upT = id === CL.upT ? null : id; CL.upM = []; return clubTab('up'); }
  if (!canMat(id)) { toast('처음 받은 기본 선수는 재료로 못 써요', 2200); return; }
  const M_ = CL.upM = CL.upM || []; const k = M_.indexOf(id); if (k >= 0) M_.splice(k, 1); else if (M_.length < 5) M_.push(id); else toast('재료는 5명까지예요'); clubTab('up');
});
function doUpgrade() {
  const c = club(), t = PDB[CL.upT]; if (!t) return; const lv = lvOf(t.id); if (lv >= 10) return; const mats = (CL.upM || []).filter(canMat); if (!mats.length) { toast('재료를 넣어 주세요'); return; }
  const fee = upFee(lv); if ((c.coins || 0) < fee) { toast('🪙 코인이 부족해요'); return; }
  const rate = (ENH.rate[lv - 1] || 0) * upGauge(); coins(-fee);
  for (const i of mats) delete c.own[i]; CL.upM = []; refillXI();
  let nl, ok = Math.random() < rate, crit = false;
  if (ok) { nl = lv + 1; if (lv <= 3 && Math.random() < .08) { nl = Math.min(10, lv + 2); crit = true; } }
  else { const w = ENH.drop[lv - 1]; let x = Math.random(); nl = 1; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { nl = i + 1; break; } } }
  c.own[t.id] = nl; saveClub(); clubHeader();
  // 연출: 카드가 떨리다가 → 성공(빛) / 실패
  const ov = $('#reveal'); ov.hidden = false; ov.className = 'r' + t.r; c.own[t.id] = lv;
  ov.innerHTML = `<div class="rv"><div class="upfx">${bigCard(t)}<div class="upmsg">⚡ 강화 중… ${(rate * 100).toFixed(1)}%</div></div></div>`; c.own[t.id] = nl; fillPortraits(ov); sfx('kick', .6);
  setTimeout(() => {
    sfx(ok ? 'goal' : 'post'); if (ok) vibrate([40, 30, 90]); ov.className = 'r' + t.r + (ok ? ' upok' : ' upfail');
    ov.innerHTML = `<div class="rv"><div class="glow" style="--rc:${ok ? '#ffd400' : '#555'}"></div>${bigCard(t)}<div class="rvx"><div class="rvt" style="color:${ok ? '#ffd400' : '#ff6b7a'}">${ok ? (crit ? '크리티컬! ' : '') + '강화 성공!' : '강화 실패…'}</div><div class="dup">+${lv} → <b>+${nl}</b> · OVR ${t.o + ENH.bonus[lv - 1]} → <b>${t.o + ENH.bonus[nl - 1]}</b></div><div class="row2"><button class="btn" id="rvClose">닫기</button><button class="btn main" id="rvAgain">계속 강화</button></div></div></div>`;
    fillPortraits(ov); $('#rvClose').onclick = () => { ov.hidden = true; clubTab('up'); }; $('#rvAgain').onclick = () => { ov.hidden = true; clubTab('up'); };
  }, 1500);
}
// 구단 화면 탭에 '강화' 끼워 넣기
const _clubTab0 = clubTab0;
clubTab0 = function (t) { if (t === 'up') { CL.tab = 'up'; CL.sel = null; CL.sell = false; $$('#clTabs [data-ctab]').forEach(b => b.classList.toggle('on', b.dataset.ctab === 'up')); return renderUp(); } return _clubTab0(t); };

/* ===== 플레이스타일 (특기) — 경기에서 진짜로 효과가 있어요 =====
   🚀 치고 달리기: 스프린트 더 빠름 · 🎯 피니셔: 슛 정확·세게 · 🧠 킬 패스: 패스 정확 · 🪄 테크니션: 드리블 중 안 뺏기고 빠름
   🛡️ 인터셉트: 태클 잘 뺏음 · 💪 몸싸움: 안 뺏김 · 🧤 거미손: 선방 ↑
   플러스(+)는 효과 2배: GOAT · 명예의 전당 · 시즌 스페셜 · 레전드 · 8강 이상 */
const PSD = { P: ['🚀', '치고 달리기'], S: ['🎯', '피니셔'], A: ['🧠', '킬 패스'], D: ['🪄', '테크니션'], F: ['🛡️', '인터셉트'], H: ['💪', '몸싸움'], G: ['🧤', '거미손'] };
// 플레이스타일 = 기본(특기) + 뽑은 것(c.xps[id] = {S:1, D:2 …} · 1 보통 · 2 플러스) — 경기용 선수에는 p.xps가 붙어 와요
function psOf(p) {
  if (!p) return null; let k = p.pos === 'GK' ? ['G'] : [...new Set((p.tg || '').split(''))].filter(x => PSD[x] && x !== 'G');
  if (p.pos !== 'GK' && !k.length) k = [{ FW: 'S', MF: 'A', DF: 'F' }[p.pos]];
  if (p.r === 'X' && p.pos !== 'GK') k = [...new Set(k.concat({ FW: ['S', 'D', 'P'], MF: ['A', 'D', 'S'], DF: ['F', 'H', 'P'] }[p.pos]))];
  const inMatch = p.xps !== undefined; let lv = p.lv || 1, xps = p.xps || {};
  if (!inMatch) { try { const c = club(); if (c) { if (!p.lv) lv = lvOf(p.id) || 1; xps = (c.xps && c.xps[p.id]) || {}; } } catch (e) { } }
  const bp = ['X', 'I', 'T', 'L'].includes(p.r) || p.leg || lv >= 8 ? 2 : 1; const L = {}; for (const x of k) L[x] = bp; for (const x in xps) if (PSD[x]) L[x] = Math.max(L[x] || 0, xps[x]);
  const keys = Object.keys(L); return { k: keys, lv: L, base: k, plus: keys.some(x => L[x] > 1) };
}
const psHTML = p => { const s = psOf(p); return s ? `<div class="pss">${s.k.map(x => `<span class="ps${s.lv[x] > 1 ? ' plus' : ''}${s.base.includes(x) ? '' : ' got'}" title="${PSD[x][1]}${s.lv[x] > 1 ? '+' : ''}">${PSD[x][0]}${s.lv[x] > 1 ? '<sup>+</sup>' : ''}</span>`).join('')}</div>` : ''; };
/* ===== 플레이스타일 뽑기 🎲 : 선수 한 명을 골라 코인으로 플레이스타일을 뽑아요 (뽑은 칸 최대 3개 · 플러스 15%) ===== */
const PS_COST = 800, PS_MAX = 3;
const psBase = p => psOf(Object.assign({}, p, { xps: {} })).k; const psSlots = (p, xs) => Object.keys(xs).filter(x => !psBase(p).includes(x));
const psPool = p => p.pos === 'GK' ? ['G', 'A', 'H'] : ['P', 'S', 'A', 'D', 'F', 'H'];
function renderPs() {
  const B = $('#clBody'), c = club(); c.xps = c.xps || {}; if (CL.psT != null && !c.own[CL.psT]) CL.psT = null; const t = CL.psT != null ? PDB[CL.psT] : null; const list = owned().sort((a, b) => cardO(b) - cardO(a));
  const xs = t ? c.xps[t.id] || {} : {}; const R = CL.psR;
  const res = R && t && R.id === t.id ? `<div class="psres ${R.lv > 1 ? 'plus' : ''}"><div class="psbig">${PSD[R.k][0]}${R.lv > 1 ? '<sup>+</sup>' : ''}</div><b>${PSD[R.k][1]}${R.lv > 1 ? '+' : ''}</b><p>${R.msg}</p>
      ${R.full ? `<div class="pschoose">${psSlots(t, xs).map(x => `<button class="chip" data-psrep="${x}">${PSD[x][0]} ${PSD[x][1]}${xs[x] > 1 ? '+' : ''} 대신 넣기</button>`).join('')}<button class="chip" data-psrep="-">버리기</button></div>` : ''}</div>` : '';
  B.innerHTML = `<div class="upwrap"><div class="uptop">${t ? bigCard(t) : '<div class="upempty">🎲</div>'}<div class="upinfo">${!t ? `<b>🎲 플레이스타일 뽑기</b><p>1. 아래에서 선수를 고르세요<br>2. 🪙${PS_COST}로 플레이스타일을 뽑아요<br>3. 15% 확률로 플러스(+)! 효과 2배</p><p class="tiny">${Object.values(PSD).map(([i, n]) => i + ' ' + n).join(' · ')}</p>`
    : `<b>${esc(t.n)}</b><p class="tiny">기본: ${psOf(Object.assign({}, t, { xps: {} })).k.map(x => PSD[x][0] + PSD[x][1]).join(' · ')}</p><p class="tiny">뽑은 칸 ${psSlots(t, xs).length} / ${PS_MAX}: ${psSlots(t, xs).map(x => PSD[x][0] + PSD[x][1] + (xs[x] > 1 ? '+' : '')).join(' · ') || '없음'}</p>${res}
      <div class="row2"><button class="btn" id="bPsReset">다른 선수</button><button class="btn main" id="bPsRoll" ${R && R.full ? 'disabled' : ''}>🎲 뽑기 🪙${PS_COST}</button></div>`}</div></div>
    <p class="hintp">${t ? '뽑은 플레이스타일은 카드에 반짝이는 아이콘으로 보여요 · 경기에서 바로 효과가 있어요' : '플레이스타일을 뽑을 선수를 고르세요'}</p>
    <div class="bench uplist">${list.map(p => `<div class="upc${p.id === CL.psT ? ' tgt' : ''}" data-psc="${p.id}">${cardHTML(p)}</div>`).join('')}</div></div>`;
}
function psRoll() {
  const c = club(), t = PDB[CL.psT]; if (!t) return; if ((c.coins || 0) < PS_COST) { toast('🪙 코인이 부족해요'); return; } coins(-PS_COST);
  c.xps = c.xps || {}; const xs = c.xps[t.id] = c.xps[t.id] || {}; const k = pick(psPool(t)), lv = Math.random() < .15 ? 2 : 1; const cur = psOf(t).lv[k] || 0; let msg, full = false;
  if (cur >= lv) msg = cur > 1 ? '이미 플러스로 갖고 있어요… 꽝!' : '이미 갖고 있어요… 꽝!';
  else if (xs[k] || psSlots(t, xs).length < PS_MAX || psBase(t).includes(k)) { xs[k] = lv; msg = cur ? '플러스(+)로 올라갔어요! 🎉' : '새 플레이스타일을 얻었어요! 🎉'; }
  else { full = true; msg = `뽑은 칸이 ${PS_MAX}개 다 찼어요. 바꿀 걸 고르세요`; }
  if (!Object.keys(xs).length) delete c.xps[t.id]; CL.psR = { id: t.id, k, lv, msg, full }; saveClub(); clubHeader(); sfx(lv > 1 ? 'goal' : 'save'); if (lv > 1) vibrate([40, 30, 90]); clubTab('ps');
}
document.addEventListener('click', e => {
  if (UI.screen !== 'club' || CL.tab !== 'ps') return; const el = e.target.closest('[data-psc],#bPsRoll,#bPsReset,[data-psrep]'); if (!el) return; sfx('tick');
  if (el.id === 'bPsRoll') return psRoll(); if (el.id === 'bPsReset') { CL.psT = null; CL.psR = null; return clubTab('ps'); }
  if (el.dataset.psrep) { const c = club(), R = CL.psR; if (R && R.full) { const xs = c.xps[R.id] = c.xps[R.id] || {}; if (el.dataset.psrep !== '-') { delete xs[el.dataset.psrep]; xs[R.k] = R.lv; R.msg = '바꿨어요! 🎉'; } else R.msg = '버렸어요'; R.full = false; saveClub(); } return clubTab('ps'); }
  CL.psT = +el.dataset.psc; CL.psR = null; clubTab('ps');
});
{ const _ct = clubTab0; clubTab0 = function (t) { if (t === 'ps') { CL.tab = 'ps'; CL.sel = null; CL.sell = false; $$('#clTabs [data-ctab]').forEach(b => b.classList.toggle('on', b.dataset.ctab === 'ps')); return renderPs(); } return _ct(t); }; }
