'use strict';
/* ===== 💱 거래소: 다른 사람과 선수를 코인으로 사고팔아요 =====
   서버: mk/{id} = { s: 판 사람 코드, sn: 닉네임, p: 선수 id, lv: 강화, xps: 뽑은 플레이스타일, pr: 가격, t }
         sold/{판 사람 코드}/{id} = { p, pr, b: 산 사람, t } → 판 사람이 접속하면 코인으로 받아요 (수수료 5%)
   등록하면 선수는 내 구단에서 빠지고(맡겨 둠), 취소하면 돌아와요. 동시에 두 명이 사지 못하게 ETag로 확인해요 */
const MK = { list: [], busy: false, f: 'all', sort: 'new', sel: null };
const MK_FEE = .05, MK_MAX = 10, MK_PMAX = 500000;
const mkMin = p => Math.max(10, DUPC[p.r] || 10);
const mkMe = () => window.BLIP && BLIP.me && BLIP.me.code;
async function fbGetTag(path) { try { const r = await fetch(FBS() + path + '.json', { headers: { 'X-Firebase-ETag': 'true' } }); if (r.ok) return { etag: r.headers.get('ETag'), val: await r.json() }; } catch (e) { } return { etag: null, val: await nreq(path) }; }
async function fbDelIf(path, etag) { if (etag) { try { const r = await fetch(FBS() + path + '.json', { method: 'DELETE', headers: { 'if-match': etag } }); if (r.status === 412) return false; if (r.ok) return true; } catch (e) { } } const still = await nreq(path).catch(() => null); if (!still) return false; await nreq(path, 'DELETE'); return true; }
// 내가 판 선수 코인 받기
async function mkCollect(quiet) {
  const me = mkMe(), c = club(); if (!me || !c) return 0; let s = null; try { s = await nreq('sold/' + me); } catch (e) { return 0; } if (!s) return 0; let got = 0; const names = [];
  for (const id in s) { const v = s[id]; if (!v) continue; try { await nreq('sold/' + me + '/' + id, 'DELETE'); } catch (e) { continue; } c.mk = c.mk || {}; delete c.mk[id]; const g = Math.floor((+v.pr || 0) * (1 - MK_FEE)); coins(g); got += g; if (PDB[v.p]) names.push(PDB[v.p].n); }
  if (got) { saveClub(); clubHeader(); if (!quiet || true) toast(`💱 ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` 외 ${names.length - 2}명` : ''}이(가) 팔렸어요! 🪙 +${got.toLocaleString()} (수수료 5%)`, 3600); sfx('goal'); }
  return got;
}
setInterval(() => { if (mkMe() && club() && document.visibilityState !== 'hidden') mkCollect(true); }, 45000);
setTimeout(() => { if (mkMe() && club()) mkCollect(true); }, 4000);
async function mkFetch() { MK.busy = true; try { const r = await nreq('mk'); MK.list = Object.entries(r || {}).map(([id, v]) => Object.assign({ id }, v)).filter(v => v && PDB[v.p] && v.pr > 0); } catch (e) { MK.list = []; toast('거래소에 연결하지 못했어요'); } MK.busy = false; }
function renderMk() {
  const B = $('#clBody'), c = club(); c.mk = c.mk || {}; const v = CL.mkv || 'buy'; const me = mkMe();
  const tabs = `<div class="mktabs">${[['buy', '🛒 사기'], ['sell', '💰 팔기'], ['mine', `📋 내 등록 ${Object.keys(c.mk).length}`]].map(([k, n]) => `<button class="chip ${v === k ? 'on' : ''}" data-mkv="${k}">${n}</button>`).join('')}<button class="chip" id="mkRef">🔄</button></div>`;
  if (!me) { B.innerHTML = tabs + '<p class="hintp">거래소는 블립 계정으로 로그인해야 쓸 수 있어요</p><button class="btn main" id="mkLogin">로그인하기</button>'; return; }
  if (v === 'buy') {
    const R = ['all', 'X', 'I', 'T', 'L', 'W', 'G', 'S', 'B']; let L = MK.list.filter(x => x.s !== me && (MK.f === 'all' || PDB[x.p].r === MK.f));
    L.sort(MK.sort === 'low' ? (a, b) => a.pr - b.pr : MK.sort === 'high' ? (a, b) => b.pr - a.pr : MK.sort === 'ovr' ? (a, b) => (PDB[b.p].o + (ENH.bonus[(b.lv || 1) - 1] || 0)) - (PDB[a.p].o + (ENH.bonus[(a.lv || 1) - 1] || 0)) : (a, b) => (b.t || 0) - (a.t || 0));
    B.innerHTML = tabs + `<div class="mkf">${R.map(r => `<button class="chip ${MK.f === r ? 'on' : ''}" data-mkf="${r}" ${r !== 'all' ? `style="color:${RAR(r).c}"` : ''}>${r === 'all' ? '전체' : RAR(r).n}</button>`).join('')}</div>
      <div class="mkf">${[['new', '최신'], ['low', '싼 순'], ['high', '비싼 순'], ['ovr', '능력치 순']].map(([k, n]) => `<button class="chip ${MK.sort === k ? 'on' : ''}" data-mks="${k}">${n}</button>`).join('')}</div>
      ${MK.busy ? '<p class="hintp">불러오는 중…</p>' : L.length ? `<div class="mklist">${L.slice(0, 80).map(x => { const p = PDB[x.p]; const has = !!c.own[p.id]; return `<div class="mkit">${mkCard(p, x.lv)}<div class="mki"><b>🪙 ${(+x.pr).toLocaleString()}</b><small>${esc(x.sn || '?')}</small><button class="btn sm ${has ? '' : 'main'}" data-mkbuy="${x.id}" ${has ? 'disabled' : ''}>${has ? '이미 있음' : '사기'}</button></div></div>`; }).join('')}</div>` : '<p class="hintp">팔고 있는 선수가 없어요. 내 선수를 먼저 올려 보세요!</p>'}`;
  } else if (v === 'sell') {
    const t = MK.sel != null && c.own[MK.sel] ? PDB[MK.sel] : null; const list = owned().filter(p => !isBase(p.id)).sort((a, b) => cardO(b) - cardO(a));
    const sug = t ? Math.max(mkMin(t), Math.round(DUPC[t.r] * 3 * Math.pow(1.45, lvOf(t.id) - 1) / 10) * 10) : 0;
    B.innerHTML = tabs + (t ? `<div class="mksell">${bigCard(t)}<div class="upinfo"><b>${esc(t.n)} 팔기</b><p class="tiny">최소 🪙${mkMin(t).toLocaleString()} · 최대 🪙${MK_PMAX.toLocaleString()} · 팔리면 5% 수수료를 떼고 받아요</p>
        <div class="mkpr"><span>🪙</span><input id="mkPrice" type="number" inputmode="numeric" min="${mkMin(t)}" max="${MK_PMAX}" value="${sug}"></div>
        <div class="mkf">${[1, 2, 5, 10].map(m => `<button class="chip" data-mkx="${sug * m}">${(sug * m).toLocaleString()}</button>`).join('')}</div>
        <p class="tiny">${c.xi.includes(t.id) ? '⚠️ 선발 선수예요 · 올리면 자리는 자동으로 채워요' : ''} 올린 동안은 내 구단에서 빠져요 · 취소하면 돌아와요</p>
        <div class="row2"><button class="btn" id="mkBack">다른 선수</button><button class="btn main" id="mkList">💱 거래소에 올리기</button></div></div></div>`
      : `<p class="hintp">팔 선수를 고르세요 · 처음 받은 기본 선수는 못 팔아요 · 최대 ${MK_MAX}명까지 올릴 수 있어요</p>`) + `<div class="bench uplist">${list.map(p => `<div class="upc${p.id === MK.sel ? ' tgt' : ''}" data-mksel="${p.id}">${cardHTML(p)}</div>`).join('')}</div>`;
  } else {
    const L = Object.entries(c.mk); B.innerHTML = tabs + (L.length ? `<div class="mklist">${L.map(([id, x]) => `<div class="mkit">${mkCard(PDB[x.p], x.lv)}<div class="mki"><b>🪙 ${(+x.pr).toLocaleString()}</b><small>파는 중…</small><button class="btn sm" data-mkcan="${id}">취소</button></div></div>`).join('')}</div><p class="hintp">팔리면 다음에 들어왔을 때 코인이 자동으로 들어와요</p>` : '<p class="hintp">올린 선수가 없어요</p>');
  }
}
// 거래소 카드: 강화 단계를 잠깐 덮어써서 보여 줘요
function mkCard(p, lv) { const c = club(); const had = c.own[p.id]; c.own[p.id] = lv || 1; const h = cardHTML(p); if (had) c.own[p.id] = had; else delete c.own[p.id]; return h; }
async function mkBuy(id) {
  const c = club(); const me = mkMe(); let r; try { r = await fbGetTag('mk/' + id); } catch (e) { toast('거래소에 연결하지 못했어요'); return; }
  const x = r.val; if (!x || !PDB[x.p]) { toast('이미 팔렸어요 😢'); await mkFetch(); return clubTab('mk'); }
  if (x.s === me) { toast('내가 올린 선수예요'); return; } if (c.own[x.p]) { toast('이미 가진 선수예요'); return; } if ((c.coins || 0) < x.pr) { toast('🪙 코인이 부족해요'); return; }
  let ok = false; try { ok = await fbDelIf('mk/' + id, r.etag); } catch (e) { } if (!ok) { toast('한발 늦었어요… 다른 사람이 샀어요'); await mkFetch(); return clubTab('mk'); }
  coins(-x.pr); c.own[x.p] = x.lv || 1; if (x.xps && Object.keys(x.xps).length) { c.xps = c.xps || {}; c.xps[x.p] = x.xps; } saveClub(); clubHeader();
  nreq('sold/' + x.s + '/' + id, 'PUT', { p: x.p, pr: x.pr, b: myInfo().nick, t: { '.sv': 'timestamp' } }).catch(() => { });
  MK.list = MK.list.filter(v => v.id !== id); sfx('goal'); vibrate([40, 30, 90]); toast(`🎉 ${PDB[x.p].n}${x.lv > 1 ? ' +' + x.lv : ''}을(를) 샀어요! 스쿼드에 넣어 보세요`, 3000); clubTab('mk');
}
async function mkPut() {
  const c = club(), p = PDB[MK.sel]; if (!p || !c.own[p.id]) return; if (isBase(p.id)) { toast('기본 선수는 못 팔아요'); return; }
  c.mk = c.mk || {}; if (Object.keys(c.mk).length >= MK_MAX) { toast(`최대 ${MK_MAX}명까지 올릴 수 있어요`); return; }
  const pr = Math.floor(+$('#mkPrice').value || 0); if (pr < mkMin(p) || pr > MK_PMAX) { toast(`가격은 🪙${mkMin(p).toLocaleString()} ~ ${MK_PMAX.toLocaleString()} 사이로 정해요`); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const lv = lvOf(p.id); const xps = (c.xps && c.xps[p.id]) || null;
  try { await nreq('mk/' + id, 'PUT', { s: mkMe(), sn: myInfo().nick, p: p.id, lv, xps, pr, t: { '.sv': 'timestamp' } }); } catch (e) { toast('올리지 못했어요. 다시 해 보세요'); return; }
  c.mk[id] = { p: p.id, lv, pr, xps }; dropFromXI(p.id); delete c.own[p.id]; if (c.xps) delete c.xps[p.id]; refillXI(); saveClub(); clubHeader(); MK.sel = null; CL.mkv = 'mine'; toast(`💱 ${p.n}을(를) 🪙${pr.toLocaleString()}에 올렸어요`); clubTab('mk');
}
async function mkCancel(id) {
  const c = club(); const x = c.mk && c.mk[id]; if (!x) return; let r; try { r = await fbGetTag('mk/' + id); } catch (e) { toast('거래소에 연결하지 못했어요'); return; }
  if (!r.val) { await mkCollect(); delete c.mk[id]; saveClub(); return clubTab('mk'); } // 이미 팔렸어요
  let ok = false; try { ok = await fbDelIf('mk/' + id, r.etag); } catch (e) { } if (!ok) { await mkCollect(); return clubTab('mk'); }
  c.own[x.p] = Math.max(c.own[x.p] || 0, x.lv || 1); if (x.xps) { c.xps = c.xps || {}; c.xps[x.p] = x.xps; } delete c.mk[id]; saveClub(); clubHeader(); toast(`${PDB[x.p].n}이(가) 돌아왔어요`); clubTab('mk');
}
document.addEventListener('click', e => {
  if (UI.screen !== 'club' || CL.tab !== 'mk') return; const t = e.target.closest('[data-mkv],#mkRef,#mkLogin,[data-mkf],[data-mks],[data-mkbuy],[data-mksel],[data-mkx],#mkBack,#mkList,[data-mkcan]'); if (!t) return; sfx('tick');
  if (t.dataset.mkv) { CL.mkv = t.dataset.mkv; if (CL.mkv === 'buy') { mkFetch().then(() => clubTab('mk')); } return clubTab('mk'); }
  if (t.id === 'mkRef') { mkCollect(); MK.busy = true; clubTab('mk'); return mkFetch().then(() => clubTab('mk')); }
  if (t.id === 'mkLogin') return needAccount();
  if (t.dataset.mkf) { MK.f = t.dataset.mkf; return clubTab('mk'); } if (t.dataset.mks) { MK.sort = t.dataset.mks; return clubTab('mk'); }
  if (t.dataset.mkbuy) { t.disabled = true; return mkBuy(t.dataset.mkbuy); }
  if (t.dataset.mksel) { MK.sel = +t.dataset.mksel; return clubTab('mk'); } if (t.id === 'mkBack') { MK.sel = null; return clubTab('mk'); }
  if (t.dataset.mkx) { $('#mkPrice').value = t.dataset.mkx; return; } if (t.id === 'mkList') { t.disabled = true; return mkPut(); }
  if (t.dataset.mkcan) { t.disabled = true; return mkCancel(t.dataset.mkcan); }
});
{ const _ct = clubTab0; clubTab0 = function (t) { if (t === 'mk') { const first = CL.tab !== 'mk'; CL.tab = 'mk'; CL.sel = null; CL.sell = false; $$('#clTabs [data-ctab]').forEach(b => b.classList.toggle('on', b.dataset.ctab === 'mk')); if (first) { mkCollect(); if ((CL.mkv || 'buy') === 'buy') { MK.busy = true; mkFetch().then(() => { if (CL.tab === 'mk') clubTab('mk'); }); } } return renderMk(); } return _ct(t); }; }
