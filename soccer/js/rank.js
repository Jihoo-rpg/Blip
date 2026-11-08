'use strict';
/* ===== 🏆 랭킹전: 점수가 비슷한 사람과 자동 매칭 · 이기면 점수↑ (엘로) · 티어 · 순위표 =====
   서버: hub/soccer/rank/{친구코드} = { nick, ava, club, emb, pts, w, d, l, t } · 대기열: rq/ */
const RK = { pts: 1000, w: 0, d: 0, l: 0, loaded: false };
const TIERS = [[0, '브론즈', '#c98a4b', '🥉'], [1080, '실버', '#c9d2dc', '🥈'], [1160, '골드', '#ffd34d', '🥇'], [1260, '플래티넘', '#5fe0c8', '💠'], [1380, '다이아', '#7db7ff', '💎'], [1520, '마스터', '#c86bff', '👑'], [1700, '챌린저', '#ff4d4d', '🔥']];
const tierOf = p => { let t = TIERS[0]; for (const x of TIERS) if (p >= x[0]) t = x; return t; };
const tierHTML = p => { const t = tierOf(p); return `<span class="tier" style="color:${t[2]}">${t[3]} ${t[1]}</span>`; };
const rkKey = () => window.BLIP && BLIP.me && BLIP.me.code;
async function rkLoad() { const k = rkKey(); if (!k) return RK; try { const r = await nreq('rank/' + k); if (r && r.pts != null) Object.assign(RK, { pts: +r.pts || 1000, w: r.w || 0, d: r.d || 0, l: r.l || 0 }); } catch (e) { } RK.loaded = true; rkDraw(); return RK; }
function rkDraw() { const el = $('#rkMe'); if (!el) return; el.innerHTML = `${tierHTML(RK.pts)} <b>${RK.pts}점</b> <small>${RK.w}승 ${RK.d}무 ${RK.l}패</small>`; }
const RK_COIN = { w: 300, d: 120, l: 60 };
async function rkResult(r) {
  const k = rkKey(); if (!k) return; await rkLoad(); const op = NET.peer && NET.peer.rk != null ? +NET.peer.rk : 1000; const S = r === 'w' ? 1 : r === 'd' ? .5 : 0;
  const E = 1 / (1 + Math.pow(10, (op - RK.pts) / 400)); let dlt = Math.round(32 * (S - E)); if (r === 'w') dlt = Math.max(8, dlt); if (r === 'l') dlt = Math.min(-5, dlt);
  const t0 = tierOf(RK.pts); RK.pts = Math.max(0, RK.pts + dlt); RK[r]++; const t1 = tierOf(RK.pts); const c = club();
  try { await nreq('rank/' + k, 'PUT', { nick: myInfo().nick, ava: myInfo().ava, club: c ? c.name : '', emb: c ? c.emb : '⚽', pts: RK.pts, w: RK.w, d: RK.d, l: RK.l, t: { '.sv': 'timestamp' } }); } catch (e) { }
  if (c) { coins(RK_COIN[r]); saveClub(); }
  const up = t1[0] > t0[0] ? `<div class="rkup">⬆️ ${t1[3]} ${t1[1]} 승급!</div>` : t1[0] < t0[0] ? `<div class="rkdn">⬇️ ${t1[1]}로 내려갔어요</div>` : '';
  $('#rReward').innerHTML = `<div class="rkres">🏆 랭킹전 <b class="${dlt >= 0 ? 'up' : 'dn'}">${dlt >= 0 ? '+' : ''}${dlt}점</b> → ${tierHTML(RK.pts)} ${RK.pts}점 · 🪙 +${RK_COIN[r]}</div>${up}`; rkDraw();
}
async function rkBoard() {
  const m = $('#rkm'); m.hidden = false; $('#rkList').innerHTML = '<p class="hintp">불러오는 중…</p>'; await rkLoad();
  let all = null; try { all = await nreq('rank'); } catch (e) { }
  const L = Object.entries(all || {}).map(([k, v]) => Object.assign({ k }, v)).filter(v => v && v.pts != null).sort((a, b) => b.pts - a.pts); const me = rkKey(); const myI = L.findIndex(v => v.k === me);
  $('#rkTop').innerHTML = `내 순위 <b>${myI >= 0 ? myI + 1 + '위' : '-'}</b> / ${L.length}명 · ${tierHTML(RK.pts)} ${RK.pts}점`;
  $('#rkList').innerHTML = L.slice(0, 50).map((v, i) => `<div class="rkRow${v.k === me ? ' me' : ''}"><span class="rkN">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="fa">${v.ava || '⚽'}</span><span class="fn">${esc(v.nick || '?')}<small>${esc(v.emb || '')} ${esc(v.club || '')} · ${v.w || 0}승 ${v.d || 0}무 ${v.l || 0}패</small></span>${tierHTML(v.pts)}<b>${v.pts}</b></div>`).join('') || '<p class="hintp">아직 랭킹전 기록이 없어요. 첫 번째가 되어 보세요!</p>';
}
document.addEventListener('click', e => { if (e.target.closest('#rkClose')) $('#rkm').hidden = true; });
