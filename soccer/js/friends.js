'use strict';
/* ===== 친구: 축구 게임 안에서 친구 추가 · 요청 수락 · 초대해서 같이 하기 (허브 계정 친구와 같아요) ===== */
const FRND = { list: [], reqs: [], busy: false };
async function openFriends() {
  if (needAccount()) return; $('#frm').hidden = false; $('#frCode').textContent = BLIP.me.code || '------'; $('#frIn').value = ''; $('#frMsg').textContent = ''; await frLoad();
}
async function frLoad() {
  if (FRND.busy) return; FRND.busy = true; $('#frList').innerHTML = '<p class="hintp">불러오는 중…</p>';
  try { const [list, box] = await Promise.all([BLIP.friendList(), BLIP.inbox()]); FRND.list = list; FRND.reqs = box.reqs || []; } catch (e) { FRND.list = []; FRND.reqs = []; }
  FRND.busy = false; frDraw();
}
function frDraw() {
  const G = BLIP.GAMES || {};
  const reqs = FRND.reqs.map(r => `<div class="frRow req"><span class="fa">${r.ava}</span><span class="fn">${esc(r.nick)}<small>친구 요청 · ${r.code}</small></span><button class="btn main sm" data-fra="${r.code}">수락</button><button class="btn sm" data-frd="${r.code}">거절</button></div>`).join('');
  const fr = FRND.list.map(f => { const g = f.game && G[f.game]; const st = f.online ? (g ? `🟢 ${g.icon} ${esc(g.name)} 하는 중` : '🟢 접속 중') : '⚪ 오프라인';
    return `<div class="frRow"><span class="fa">${f.ava}</span><span class="fn">${esc(f.nick)}<small>${st}</small></span><button class="btn main sm" data-frp="${f.code}" ${f.online ? '' : 'title="오프라인이어도 초대는 남아요(10분)"'}>⚽ 같이 하기</button></div>`; }).join('');
  $('#frList').innerHTML = (reqs ? `<p class="frH">받은 친구 요청</p>${reqs}` : '') + `<p class="frH">내 친구 ${FRND.list.length}명</p>` + (fr || '<p class="hintp">아직 친구가 없어요. 위에 친구 코드나 아이디를 넣어 추가해요!</p>');
}
async function frAdd() {
  const v = $('#frIn').value.trim(); const msg = $('#frMsg'); if (!v) { msg.textContent = '친구 코드나 아이디를 넣어 주세요'; return; }
  msg.textContent = '보내는 중…';
  try { const r = await BLIP.requestFriend(v); msg.textContent = r.done ? `🎉 ${r.name}님과 친구가 됐어요!` : `✉️ ${r.name || v}님에게 친구 요청을 보냈어요. 수락하면 친구가 돼요`; $('#frIn').value = ''; frLoad(); }
  catch (e) { msg.textContent = e.message || '다시 해 보세요'; }
}
// 친구 초대: 비공개 방을 만들고, 친구에게 초대를 보내요 (친구가 초대를 누르면 바로 내 방으로)
async function frPlay(code) {
  const f = FRND.list.find(x => x.code === code); $('#frm').hidden = true; if (needClub()) return;
  openOnline(); if (!$('#onl') || $('#onl').hidden) return; await hostRoom(false); if (!NET.code || NET.role !== 'host-wait') return;
  await nreq('byHost/' + BLIP.me.code, 'PUT', { code: NET.code, t: { '.sv': 'timestamp' } }).catch(() => { });
  try { await BLIP.invite(code, 'soccer'); toast(`✉️ ${f ? f.nick : '친구'}님에게 초대를 보냈어요! 친구가 들어오면 바로 시작해요`, 3600); } catch (e) { toast('초대를 보내지 못했어요. 방 코드를 알려 주세요'); }
}
// 초대받은 쪽: 친구(방장) 코드로 방을 찾아 들어가요
async function joinFriendRoom(host) {
  const r = await nreq('byHost/' + host).catch(() => null); if (!r || !r.code || Date.now() - (+r.t || 0) > 15 * 60000) { toast('친구가 방을 닫았어요. 다시 초대해 달라고 해요', 3000); return; }
  auInit(); openOnline(r.code);
}
document.addEventListener('click', e => {
  const t = e.target.closest('#frAdd,#frClose,#frCopy,#frRef,[data-fra],[data-frd],[data-frp]'); if (!t) return; sfx('tick');
  if (t.id === 'frAdd') return frAdd(); if (t.id === 'frClose') { $('#frm').hidden = true; return; } if (t.id === 'frRef') return frLoad();
  if (t.id === 'frCopy') { const c = BLIP.me.code; navigator.clipboard && navigator.clipboard.writeText(c).then(() => toast('내 친구 코드를 복사했어요: ' + c)); return; }
  if (t.dataset.fra) return BLIP.accept(t.dataset.fra).then(() => { toast('🎉 친구가 됐어요!'); frLoad(); }).catch(() => toast('다시 해 보세요'));
  if (t.dataset.frd) return BLIP.decline(t.dataset.frd).then(frLoad).catch(() => { });
  if (t.dataset.frp) return frPlay(t.dataset.frp);
});
addEventListener('keydown', e => { if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'frIn') frAdd(); });
