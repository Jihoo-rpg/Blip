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
const needVal = p => Math.pow(2, (cardO(p) - 70) / 10) * (1 + .35 * (lvOf(p.id) - 1)) * 1.6;
function upGauge() { const t = CL.upT != null ? PDB[CL.upT] : null; if (!t) return 0; const s = (CL.upM || []).reduce((a, i) => a + matVal(PDB[i]), 0); return Math.min(1, s / needVal(t)); }
const upFee = lv => 50 * lv;
const canMat = id => { const c = club(); return id !== CL.upT && !c.xi.includes(id) && !isBase(id); };

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
    ${t ? `<p class="hintp">재료 ${(CL.upM || []).length} / 5 · 선발 · 처음 받은 기본 선수는 재료로 못 써요</p>` : '<p class="hintp">강화할 선수를 고르세요</p>'}
    <div class="bench uplist">${list.map(p => { const cls = p.id === CL.upT ? ' tgt' : (CL.upM || []).includes(p.id) ? ' mat' : t && !canMat(p.id) ? ' no' : ''; return `<div class="upc${cls}" data-upc="${p.id}">${cardHTML(p)}</div>`; }).join('')}</div></div>`;
}
document.addEventListener('click', e => {
  if (UI.screen !== 'club' || CL.tab !== 'up') return; const el = e.target.closest('[data-upc],#bUp,#bUpReset'); if (!el) return; sfx('tick');
  if (el.id === 'bUpReset') { CL.upT = null; CL.upM = []; return clubTab('up'); }
  if (el.id === 'bUp') return doUpgrade();
  const id = +el.dataset.upc;
  if (CL.upT == null || id === CL.upT) { CL.upT = id === CL.upT ? null : id; CL.upM = []; return clubTab('up'); }
  if (!canMat(id)) { toast(club().xi.includes(id) ? '선발 선수는 재료로 못 써요' : '처음 받은 기본 선수는 재료로 못 써요', 2200); return; }
  const M_ = CL.upM = CL.upM || []; const k = M_.indexOf(id); if (k >= 0) M_.splice(k, 1); else if (M_.length < 5) M_.push(id); else toast('재료는 5명까지예요'); clubTab('up');
});
function doUpgrade() {
  const c = club(), t = PDB[CL.upT]; if (!t) return; const lv = lvOf(t.id); if (lv >= 10) return; const mats = (CL.upM || []).filter(canMat); if (!mats.length) { toast('재료를 넣어 주세요'); return; }
  const fee = upFee(lv); if ((c.coins || 0) < fee) { toast('🪙 코인이 부족해요'); return; }
  const rate = (ENH.rate[lv - 1] || 0) * upGauge(); coins(-fee);
  for (const i of mats) { dropFromXI(i); delete c.own[i]; } CL.upM = [];
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
