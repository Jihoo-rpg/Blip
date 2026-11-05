'use strict';
/* ===== 온라인 1:1 =====
   방장(host)이 경기를 계산하고, 참가자(guest)는 조작을 보내고 화면을 받아요.
   처음 연결(방 찾기)은 Firebase, 연결되면 가능하면 P2P(WebRTC)로 바로 주고받아요.
   데이터: hub/soccer/rooms/{코드}: h(방장) · g(참가자) · gi(참가자 조작) · s(경기 상태)   hub/soccer/q(빠른 대결 대기열) */
const NET = { role: null, code: '', ev: [], evId: 0, evSeen: 0, acts: [], actId: 0, actDone: 0, p2p: null, lastIn: 0, lastSnap: 0, sq: 0, timers: [], busy: {}, peer: null, cfg: null, tgt: null };
const FBS = () => (window.BLIP_FB || 'https://cat-jump-3afbb-default-rtdb.firebaseio.com') + '/hub/soccer/';
const nreq = (path, method, body) => fetch(FBS() + path + '.json', { method: method || 'GET', body: body === undefined ? undefined : JSON.stringify(body), keepalive: method === 'DELETE' }).then(r => r.ok ? r.json() : Promise.reject(r.status));
const myInfo = () => { const b = window.BLIP && BLIP.me; return { nick: (b && b.nick) || '나', ava: (b && b.ava) || '⚽', id: (b && b.code) || ('G' + Math.random().toString(36).slice(2, 7)) }; };
const r2 = v => Math.round(v * 100) / 100;
function onlStatus(t, sub) { $('#onlSt').innerHTML = t + (sub ? `<small>${sub}</small>` : ''); }
function openOnline(code) {
  show('#onl'); UI.screen = 'menu'; $('#onlTeam').innerHTML = `${TEAM(PICK.t0).f} ${TEAM(PICK.t0).n} <small>(빠른 경기에서 바꿀 수 있어요)</small>`; onlStatus('친구와 방 코드로 하거나, 빠른 대결로 아무나 만나요.');
  $('#onlBtns').hidden = false; $('#onlCode').value = code || ''; if (code) joinRoom(code);
}
function netClear() { for (const t of NET.timers) clearInterval(t); NET.timers = []; }
function netLeave() {
  netClear(); const c = NET.code, r = NET.role; if (c) { if (r === 'host') nreq('rooms/' + c, 'DELETE').catch(() => { }); else if (r === 'guest') nreq('rooms/' + c + '/g', 'DELETE').catch(() => { }); }
  if (NET.qid) nreq('q/' + NET.qid, 'DELETE').catch(() => { }); if (NET.p2p) try { NET.p2p.close(); } catch (e) { }
  Object.assign(NET, { role: null, code: '', p2p: null, qid: null, peer: null, ev: [], evSeen: 0, acts: [], actDone: 0 }); $('#netTag').hidden = true;
}
function newCode() { return String(Math.floor(1000 + Math.random() * 9000)); }
async function hostRoom(quick) {
  netLeave(); const me = myInfo(); const code = newCode(); NET.code = code; NET.role = 'host-wait';
  try { await nreq('rooms/' + code + '/h', 'PUT', { nick: me.nick, ava: me.ava, team: PICK.t0, form: PICK.f0, len: PICK.len, t: { '.sv': 'timestamp' } }); } catch (e) { onlStatus('서버에 연결하지 못했어요 😢', '인터넷을 확인하고 다시 해 보세요'); NET.role = null; return; }
  if (quick) { NET.qid = me.id; nreq('q/' + me.id, 'PUT', { code, nick: me.nick, t: { '.sv': 'timestamp' } }).catch(() => { }); NET.timers.push(setInterval(() => nreq('q/' + me.id + '/t', 'PUT', { '.sv': 'timestamp' }).catch(() => { }), 8000)); }
  onlStatus(quick ? '상대를 찾는 중… ⏳' : `방 코드 <b class="code">${code}</b>`, quick ? '조금만 기다려 주세요' : '친구에게 이 코드를 알려 주세요 · <a href="#" id="cpLink">링크 복사</a>');
  const cp = $('#cpLink'); if (cp) cp.onclick = e => { e.preventDefault(); const u = location.origin + location.pathname + '?room=' + code; navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('링크를 복사했어요')); };
  $('#onlBtns').hidden = true;
  NET.timers.push(setInterval(async () => { if (NET.role !== 'host-wait') return; const g = await nreq('rooms/' + code + '/g').catch(() => null); if (g && g.nick) { NET.peer = g; if (NET.qid) { nreq('q/' + NET.qid, 'DELETE').catch(() => { }); NET.qid = null; } netClear(); hostStart(g); } }, 900));
}
async function quickMatch() {
  onlStatus('상대를 찾는 중… ⏳'); $('#onlBtns').hidden = true; const me = myInfo();
  const q = await nreq('q').catch(() => null); const now = Date.now();
  const list = Object.entries(q || {}).filter(([k, v]) => k !== me.id && v && v.code && Math.abs(now - (v.t || 0)) < 25000).sort((a, b) => a[1].t - b[1].t);
  for (const [k, v] of list) { await nreq('q/' + k, 'DELETE').catch(() => { }); if (await joinRoom(v.code, true)) return; }
  hostRoom(true);
}
async function joinRoom(code, silent) {
  code = String(code || '').trim(); if (!/^\d{4}$/.test(code)) { onlStatus('방 코드는 숫자 4자리예요'); return false; }
  const h = await nreq('rooms/' + code + '/h').catch(() => null); if (!h) { if (!silent) onlStatus('그런 방이 없어요', '코드를 다시 확인해 주세요'); return false; }
  const ex = await nreq('rooms/' + code + '/g').catch(() => null); if (ex && ex.nick) { if (!silent) onlStatus('이미 두 명이 다 찼어요'); return false; }
  netLeave(); const me = myInfo(); NET.code = code; NET.role = 'guest-wait'; NET.peer = h; let tm = PICK.t0; if (tm === h.team) tm = PICK.t1 !== h.team ? PICK.t1 : (TEAMS.find(t => t.id !== h.team).id);
  await nreq('rooms/' + code + '/g', 'PUT', { nick: me.nick, ava: me.ava, team: tm, form: PICK.f0, id: me.id }).catch(() => { });
  $('#onlBtns').hidden = true; onlStatus(`${esc(h.nick)}님의 방에 들어왔어요`, '곧 시작해요…');
  startP2P(); NET.timers.push(setInterval(pollSnap, 120));
  return true;
}
function startP2P() {
  if (!window.P2P || !P2P.supported) return; const host = NET.role.startsWith('host');
  try { NET.p2p = P2P.link('soccer' + NET.code, host ? 'a' + NET.code : 'b' + NET.code, (from, d) => { if (!d) return; if (d.k === 's' && NET.role === 'guest' || d.k === 's' && NET.role === 'guest-wait') applySnap(d.s); if (d.k === 'i' && NET.role === 'host') takeInput(d.i); }); NET.p2p.connect(host ? 'b' + NET.code : 'a' + NET.code); } catch (e) { NET.p2p = null; }
}
/* ---------- 방장 ---------- */
function hostStart(g) {
  NET.role = 'host'; NET.cfg = { t0: PICK.t0, t1: g.team === PICK.t0 ? (PICK.t0 === 'KOR' ? 'JPN' : 'KOR') : g.team, f0: PICK.f0, f1: g.form || '4-3-3', len: PICK.len };
  startP2P(); NET.lastIn = Date.now();
  startGame({ t0: NET.cfg.t0, t1: NET.cfg.t1, f0: NET.cfg.f0, f1: NET.cfg.f1, len: NET.cfg.len, mode: 'online', human: [0, 1], diff: 2 });
  setTimeout(() => banner('온라인 대결!', `${esc(g.nick)}님과 1:1`, '#22d3ee', 1.8), 700);
  NET.timers.push(setInterval(async () => { if (NET.role !== 'host') return; const gi = await nreq('rooms/' + NET.code + '/gi').catch(() => null); if (gi) takeInput(gi); if (Date.now() - NET.lastIn > 12000 && M.phase !== 'over') { banner('상대 연결이 끊겼어요', null, '#ff4d5e', 2.5); M.phase = 'over'; setTimeout(showResult, 1500); netClear(); } }, 110));
}
function takeInput(gi) {
  if (!gi || (gi.t || 0) < (NET.inT || 0)) return; NET.inT = gi.t || 0; NET.lastIn = Date.now(); const I = INP[1]; I.x = gi.x || 0; I.z = gi.z || 0; I.sp = !!gi.sp;
  for (const a of (gi.a || [])) { if (!a || a.i <= NET.actDone) continue; NET.actDone = a.i; if (a.a === 'again') { if (M.phase === 'over') netRematch(true); continue; } I.acts.push({ a: a.a, t: performance.now(), dur: a.dur }); }
  const p = M.ctrl[1]; if (p && gi.px != null && gi.ci === M.players.indexOf(p) && M.phase === 'play' && p.stun <= 0 && !p.act && ball.owner !== p) { p.x += (gi.px - p.x) * .5; p.z += (gi.pz - p.z) * .5; }
}
let lastSend = 0;
function hostSend() {
  if (NET.role !== 'host' || !M.on) return; const now = performance.now(); const fast = NET.p2p && NET.p2p.any(); if (now - lastSend < (fast ? 33 : 120)) return; lastSend = now;
  for (const e of NET.ev) if (!e.i) e.i = ++NET.evId; NET.ev = NET.ev.slice(-20);
  const s = { q: ++NET.sq, ph: M.phase, ck: Math.round(M.clock), h: M.half, sc: M.score, d: M.dir, b: [r2(ball.x), r2(ball.y), r2(ball.z)], c: [M.players.indexOf(M.ctrl[0]), M.players.indexOf(M.ctrl[1])], ch: M.ctrl[1] ? r2(M.ctrl[1].charge || 0) : 0,
    p: M.players.map(p => [r2(p.x), r2(p.z), r2(p.yaw), r2(Math.hypot(p.vx, p.vz)), p.act || 0, r2(p.actT), p.diveSide || 1, r2(p.diveH || .6), p.celeKind || 0]), ev: NET.ev, cfg: NET.cfg, sp: M.sp ? [M.sp.type, M.sp.team, M.players.indexOf(M.sp.taker)] : 0, ko: M.phase === 'kickoff' ? [M.koTeam, M.players.indexOf(M.koTaker)] : 0,
    st: M.stats, gs: M.scorers, hn: myInfo().nick, kits: [M.kits[0][0], M.kits[1][0]] };
  if (fast) NET.p2p.send({ k: 's', s }); if (!fast || now - (NET.slowT || 0) > 900) { NET.slowT = now; nreq('rooms/' + NET.code + '/s', 'PUT', s).catch(() => { }); }
}
/* ---------- 참가자 ---------- */
async function pollSnap() { if (!NET.role || !NET.role.startsWith('guest')) return; if (NET.p2p && NET.p2p.any() && Date.now() - NET.lastSnap < 1500) return sendInput(); const s = await nreq('rooms/' + NET.code + '/s').catch(() => null); if (s) applySnap(s); sendInput(); if (NET.role === 'guest' && Date.now() - NET.lastSnap > 12000 && M.phase !== 'over') { banner('방장 연결이 끊겼어요', null, '#ff4d5e', 2.5); netClear(); setTimeout(quitToMenu, 2500); } }
function sendInput() {
  if (NET.role !== 'guest') return; const I = INP[0]; const c = M.ctrl[0]; NET.acts = NET.acts.slice(-16);
  const gi = { t: Date.now(), x: r2(I.x), z: r2(I.z), sp: I.sp ? 1 : 0, a: NET.acts, ci: c ? M.players.indexOf(c) : -1, px: c ? r2(c.x) : null, pz: c ? r2(c.z) : null };
  if (NET.p2p && NET.p2p.any()) NET.p2p.send({ k: 'i', i: gi }); if (!(NET.p2p && NET.p2p.any()) || Date.now() - (NET.giT || 0) > 600) { NET.giT = Date.now(); nreq('rooms/' + NET.code + '/gi', 'PUT', gi).catch(() => { }); }
}
function applySnap(s) {
  if (!s || !s.p) return; if ((s.q || 0) < (NET.lastQ || 0) - 50) NET.lastQ = 0; if ((s.q || 0) <= (NET.lastQ || 0)) return; NET.lastQ = s.q; NET.lastSnap = Date.now();
  if (NET.role === 'guest-wait') { NET.role = 'guest'; const c = s.cfg; startGame({ t0: c.t0, t1: c.t1, f0: c.f0, f1: c.f1, len: c.len, mode: 'online', human: [1, 0] }); NET.evSeen = Math.max(0, ...(s.ev || []).map(e => e.i || 0)); setTimeout(() => banner('온라인 대결!', `${esc(s.hn || '방장')}님과 1:1`, '#22d3ee', 1.8), 300); }
  const prevPh = M.phase; M.phase = s.ph; M.clock = s.ck; M.half = s.h; M.score = s.sc; M.dir = s.d; if (s.st) M.stats = s.st; if (s.gs) M.scorers = s.gs;
  NET.tgt = s; M.ctrl[0] = M.players[s.c[1]] || M.ctrl[0]; M.ctrl[1] = M.players[s.c[0]] || M.ctrl[1]; if (M.ctrl[0]) M.ctrl[0].charge = s.ch;
  M.sp = s.sp ? { type: s.sp[0], team: s.sp[1], taker: M.players[s.sp[2]] } : null; if (s.ko) { M.koTeam = s.ko[0]; M.koTaker = M.players[s.ko[1]]; }
  for (const e of (s.ev || [])) if (e.i > NET.evSeen) { NET.evSeen = e.i; if (e.k === 's') sfx(e.n, e.v); else if (e.k === 'b') banner(e.t, e.s, e.c, e.d); else if (e.k === 'c') comm(e.t); }
  $('#replay').hidden = s.ph !== 'replay'; if (s.ph === 'over' && prevPh !== 'over') setTimeout(showResult, 3000);
  if (s.ph === 'goal' && prevPh !== 'goal') { STAD.jump = 6; vibrate([60, 40, 120]); }
}
function guestTick(dt) {
  const s = NET.tgt; if (!s || !M.on) return; M.t += dt;
  const k = Math.min(1, dt * 14); ball.x = lerp(ball.x, s.b[0], k); ball.y = lerp(ball.y, s.b[1], k); ball.z = lerp(ball.z, s.b[2], k);
  M.players.forEach((p, i) => { const a = s.p[i]; if (!a) return; const mine = p === M.ctrl[0] && s.ph === 'play';
    if (mine && !a[4]) { // 내 선수는 내 화면에서 바로 움직여요
      const I = INP[0]; const mag = Math.hypot(I.x, I.z); if (mag > .15) { const sp = maxSpd(p, I.sp) * Math.min(1, mag * 1.15); accel(p, I.x / mag * sp, I.z / mag * sp, dt); } else accel(p, 0, 0, dt); p.x += p.vx * dt; p.z += p.vz * dt; if (Math.hypot(p.vx, p.vz) > .6) p.yaw += angDiff(p.yaw, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * 8);
      if (Math.hypot(a[0] - p.x, a[1] - p.z) > 2.5) { p.x = a[0]; p.z = a[1]; } else { p.x = lerp(p.x, a[0], dt * 1.5); p.z = lerp(p.z, a[1], dt * 1.5); }
    } else { p.x = lerp(p.x, a[0], k); p.z = lerp(p.z, a[1], k); p.yaw += angDiff(p.yaw, a[2]) * k; const sp = a[3]; p.vx = Math.sin(p.yaw) * sp; p.vz = Math.cos(p.yaw) * sp; }
    p.act = a[4] || null; p.actT = a[5]; p.diveSide = a[6]; p.diveH = a[7]; p.celeKind = a[8]; animPlayer(p, dt); });
}
function netRematch(fromGuest) {
  if (NET.role === 'guest') { NET.acts.push({ i: ++NET.actId, a: 'again' }); $('#rAgain').hidden = true; toast('방장에게 다시 하자고 했어요'); return; }
  if (NET.role === 'host') { const c = NET.cfg; startGame({ t0: c.t0, t1: c.t1, f0: c.f0, f1: c.f1, len: c.len, mode: 'online', human: [0, 1], diff: 2 }); }
}
function setupOnline() {
  $('#onlQuick').onclick = () => quickMatch(); $('#onlHost').onclick = () => hostRoom(false); $('#onlJoin').onclick = () => joinRoom($('#onlCode').value);
  $('#onlBack').onclick = () => { netLeave(); show('#menu'); };
  addEventListener('pagehide', () => netLeave());
  NET.timers = [];
  setInterval(() => { const t = $('#netTag'); if (NET.role === 'host' || NET.role === 'guest') { t.hidden = UI.screen !== 'game'; t.textContent = `🌐 ${NET.role === 'host' ? '방장' : '참가'}` + (NET.p2p && NET.p2p.any() ? ' · ⚡직접 연결' : ' · 서버 연결'); } }, 1000);
}
