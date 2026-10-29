/* =====================================================================
   blip.js — blip 허브와 모든 게임이 같이 쓰는 멀티플레이 도구
   ---------------------------------------------------------------------
   - 내 프로필: 친구 코드(6자리), 닉네임, 아바타 (이 브라우저에 저장)
   - 접속 상태: 지금 어떤 게임을 하는지 20초마다 서버에 알림
   - 친구: 코드로 친구 요청 → 상대가 수락하면 서로 친구
   - 초대 / 따라 들어가기: 친구를 게임으로 부르거나, 친구가 하는 게임으로 바로 이동
   게임 페이지에서 쓰는 법:
     <script src="../common/blip.js" data-game="catjump"></script>
   허브는 data-ui="none" 으로 넣고 화면을 직접 그려요.
   데이터는 냥냥 점프와 같은 Firebase의 hub/ 아래에 저장돼요.
   ===================================================================== */
(function () {
  'use strict';
  if (window.BLIP) return;
  const me_script = document.currentScript;
  const GAME = (me_script && me_script.dataset.game) || '';
  const UI = !(me_script && me_script.dataset.ui === 'none');
  const ROOT = me_script ? me_script.src.replace(/common\/blip\.js.*$/, '') : '../';
  const FB = window.BLIP_FB || 'https://cat-jump-3afbb-default-rtdb.firebaseio.com';
  const KEY = 'blip_hub_v1';
  const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ONLINE_MS = 55000;

  /** 게임 목록 (허브와 같은 id) */
  const GAMES = {
    catjump: { name: '냥냥 점프', icon: '🐾', path: 'catjump/' },
    virus: { name: '바이러스 시뮬레이터', icon: '🦠', path: 'virus/' },
    ball: { name: '쌍성 궤도', icon: '🪐', path: 'balldance/' },
    mudlark: { name: '머드락 섬', icon: '🐄', path: 'mudlark/' },
    hoops: { name: '하프코트 레전드', icon: '🏀', path: 'hoops/' },
    carcrash: { name: '차를 부수세요', icon: '💥', path: 'carcrash/' },
  };
  const AVAS = ['😺', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐰', '🐻', '🐧', '🦄', '👾', '🤖', '👻', '🐲'];

  /* ---------- 내 프로필 ---------- */
  function readMe() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  let me = readMe();
  if (!/^[A-Z0-9]{6}$/.test(me.code || '')) {
    // 냥냥 점프 친구 코드가 있으면 그대로 써서, 허브와 게임의 친구 코드를 하나로 맞춰요
    let cj = null; try { cj = JSON.parse(localStorage.getItem('nyangjump_save_v2') || 'null'); } catch (e) { }
    me.code = cj && /^[A-Z0-9]{6}$/.test(cj.fcode || '') ? cj.fcode : Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
    if (!me.nick) me.nick = (cj && cj.nick ? String(cj.nick) : '플레이어' + me.code.slice(0, 3)).slice(0, 12);
  }
  me.nick = String(me.nick || '플레이어').slice(0, 12);
  if (!AVAS.includes(me.ava)) me.ava = AVAS[me.code.charCodeAt(0) % AVAS.length];
  me.fav = me.fav || []; me.recent = me.recent || []; me.friends = me.friends || [];
  function saveMe() { try { const cur = readMe(); localStorage.setItem(KEY, JSON.stringify(Object.assign(cur, me))); } catch (e) { } }
  saveMe();

  /* ---------- 서버 ---------- */
  let off = 0;                                   // 서버 시계 - 내 시계
  const now = () => Date.now() + off;
  function req(path, method, body, keep) {
    return fetch(FB + '/hub/' + path + '.json', { method: method || 'GET', body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!keep })
      .then(r => r.ok ? r.json() : Promise.reject(r.status));
  }
  function raw(path, method, body) {
    return fetch(FB + '/' + path + '.json', { method: method || 'GET', body: body === undefined ? undefined : JSON.stringify(body) })
      .then(r => r.ok ? r.json() : Promise.reject(r.status));
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validCode = c => /^[A-Z0-9]{6}$/.test(String(c || '').toUpperCase());

  /* ---------- 접속 상태 ---------- */
  let curGame = GAME === 'hub' ? '' : GAME;
  async function beat() {
    try {
      const r = await req('users/' + me.code, 'PATCH', { nick: me.nick, ava: me.ava, acc: me.acc || '', game: curGame, away: false, t: { '.sv': 'timestamp' } });
      if (r && typeof r.t === 'number') off = r.t - Date.now();
    } catch (e) { }
  }
  function leave() { try { req('users/' + me.code, 'PATCH', { away: true, game: '' }, true); } catch (e) { } }
  const isOnline = u => !!u && !u.away && now() - (Number(u.t) || 0) < ONLINE_MS;

  /* ---------- 친구 ---------- */
  async function friendList() {
    const map = await req('friends/' + me.code).catch(() => null) || {};
    const codes = Object.keys(map).filter(validCode);
    const users = await Promise.all(codes.map(c => req('users/' + c).catch(() => null)));
    const list = codes.map((c, i) => { const u = users[i] || {}; return { code: c, acc: /^[a-z0-9_]{4,12}$/.test(u.acc || '') ? u.acc : '', nick: String(u.nick || '친구').slice(0, 12), ava: AVAS.includes(u.ava) ? u.ava : '🙂', online: isOnline(u), game: GAMES[u.game] ? u.game : '', t: Number(u.t) || 0 }; });
    list.sort((a, b) => (b.online - a.online) || (!!b.game - !!a.game) || (b.t - a.t));
    me.friends = list.map(f => ({ code: f.code, nick: f.nick, ava: f.ava })); saveMe();
    return list;
  }
  /** 친구 코드(6자리) 또는 아이디로 친구 요청 */
  async function requestFriend(input) {
    const raw_in = String(input || '').trim();
    if (!raw_in) throw new Error('친구 코드나 아이디를 입력하세요');
    let code = '', name = '', viaId = false;
    const up = raw_in.toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(up)) { const u = await req('users/' + up).catch(() => null); if (u) { code = up; name = u.nick; } }
    if (!code && /^[a-z0-9_]{4,12}$/i.test(raw_in)) {
      const h = await raw('users/' + raw_in.toLowerCase() + '/hub').catch(() => null);
      if (h && /^[A-Z0-9]{6}$/.test(h.code || '')) { code = h.code; name = h.nick; viaId = true; }
    }
    if (!code && /^[A-Z0-9]{6}$/.test(up)) { code = up; name = ''; }        // 아직 blip에 안 들어온 코드: 요청만 남겨 둠
    if (!code) throw new Error('그런 친구 코드나 아이디가 없어요');
    if (code === me.code) throw new Error('나 자신이에요');
    const already = await req('friends/' + me.code + '/' + code).catch(() => null);
    if (already) throw new Error('이미 친구예요');
    const back = await req('req/' + me.code + '/' + code).catch(() => null);
    if (back) { await accept(code); return { done: true, name: name || back.nick || '친구' }; }
    await req('req/' + code + '/' + me.code, 'PUT', { nick: me.nick, ava: me.ava, acc: me.acc || '', t: { '.sv': 'timestamp' } });
    return { done: false, name: name || '', pending: !name, viaId };
  }
  async function accept(from) {
    await req('friends/' + me.code + '/' + from, 'PUT', true);
    await req('friends/' + from + '/' + me.code, 'PUT', true);
    await req('req/' + me.code + '/' + from, 'DELETE');
    await req('req/' + from + '/' + me.code, 'DELETE').catch(() => { });
  }
  async function decline(from) { await req('req/' + me.code + '/' + from, 'DELETE'); }
  async function removeFriend(code) {
    await req('friends/' + me.code + '/' + code, 'DELETE');
    await req('friends/' + code + '/' + me.code, 'DELETE');
    me.friends = me.friends.filter(f => f.code !== code); saveMe();
  }
  async function invite(code, game) { await req('inv/' + code + '/' + me.code, 'PUT', { game, nick: me.nick, ava: me.ava, t: { '.sv': 'timestamp' } }); }
  async function inbox() {
    const [r, v] = await Promise.all([req('req/' + me.code).catch(() => null), req('inv/' + me.code).catch(() => null)]);
    const reqs = Object.keys(r || {}).filter(validCode).map(c => ({ code: c, acc: /^[a-z0-9_]{4,12}$/.test(r[c].acc || '') ? r[c].acc : '', nick: String(r[c].nick || '누군가').slice(0, 12), ava: AVAS.includes(r[c].ava) ? r[c].ava : '🙂', t: Number(r[c].t) || 0 }));
    const invs = Object.keys(v || {}).filter(validCode).map(c => ({ code: c, nick: String(v[c].nick || '친구').slice(0, 12), ava: AVAS.includes(v[c].ava) ? v[c].ava : '🙂', game: v[c].game, t: Number(v[c].t) || 0 }))
      .filter(x => GAMES[x.game] && now() - x.t < 10 * 60000);
    return { reqs, invs };
  }
  async function clearInvite(from) { await req('inv/' + me.code + '/' + from, 'DELETE').catch(() => { }); }
  async function allUsers() { return await req('users').catch(() => null) || {}; }
  function gameUrl(id, follow) { const g = GAMES[id]; return g ? ROOT + g.path + (follow ? '?follow=' + encodeURIComponent(follow) : '') : ROOT + 'hub/'; }
  function go(id, follow) { me.recent = [id, ...me.recent.filter(x => x !== id)].slice(0, 12); saveMe(); leave(); location.href = gameUrl(id, follow); }
  function setProfile(nick, ava) {
    if (nick != null) me.nick = String(nick).trim().slice(0, 12) || me.nick;
    if (ava != null && AVAS.includes(ava)) me.ava = ava;
    saveMe(); beat();
    if (me.acc) raw('users/' + me.acc + '/hub', 'PATCH', { nick: me.nick, ava: me.ava }).catch(() => { });
  }

  /* ---------- 계정 (냥냥 점프와 같은 아이디·비밀번호) ---------- */
  const SESS = 'nyangjump_session', SK = 'nyangjump_save_v2';
  const getSess = () => { try { const x = JSON.parse(localStorage.getItem(SESS) || 'null'); return x && x.id && x.hash ? x : null; } catch (e) { return null; } };
  async function hashPw(pw, salt) {
    const d = new TextEncoder().encode(salt + '|nyang|' + pw);
    const h = await crypto.subtle.digest('SHA-256', d);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const normId = x => String(x || '').trim().toLowerCase();
  const newCode = () => Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
  /** 게스트 때 사귄 친구들을 계정 코드로 옮김 */
  async function migrateFriends(oldC, newC) {
    if (!oldC || oldC === newC) return;
    const fr = await req('friends/' + oldC).catch(() => null) || {};
    for (const f of Object.keys(fr)) {
      if (!validCode(f) || f === newC) continue;
      await req('friends/' + newC + '/' + f, 'PUT', true).catch(() => { });
      await req('friends/' + f + '/' + newC, 'PUT', true).catch(() => { });
      await req('friends/' + f + '/' + oldC, 'DELETE').catch(() => { });
    }
    await req('friends/' + oldC, 'DELETE').catch(() => { });
  }
  /** 계정을 이 기기에 연결: 친구 코드·닉네임·아바타를 계정 것으로 맞춤 */
  async function linkAccount(id, u) {
    const prevAcc = me.acc, oldCode = me.code;
    const hub = u.hub || {};
    const code = validCode(hub.code) ? hub.code : (u.save && validCode(u.save.fcode) ? u.save.fcode : me.code);
    if (!prevAcc) me.guestCode = me.code;
    me.acc = id; me.code = code;
    if (hub.nick) me.nick = String(hub.nick).slice(0, 12); else if (u.save && u.save.nick && /^플레이어/.test(me.nick)) me.nick = String(u.save.nick).slice(0, 12);
    if (AVAS.includes(hub.ava)) me.ava = hub.ava;
    me.friends = [];
    saveMe();
    await raw('users/' + id + '/hub', 'PUT', { code: me.code, nick: me.nick, ava: me.ava }).catch(() => { });
    if (!prevAcc && oldCode !== code) await migrateFriends(oldCode, code);
    if (oldCode !== code) req('users/' + oldCode, 'PATCH', { away: true, game: '' }).catch(() => { });
    beat();
  }
  /** 냥냥 점프 저장 데이터도 계정 것으로 (냥냥 점프의 로그인과 똑같이) */
  function adoptGameSave(u) {
    try { if (u.save) { const cur = localStorage.getItem(SK); if (cur) localStorage.setItem(SK + '_guest', cur); localStorage.setItem(SK, JSON.stringify(u.save)); } } catch (e) { }
  }
  async function login(id, pw) {
    id = normId(id);
    if (!id || !pw) throw new Error('아이디와 비밀번호를 입력하세요');
    let u;
    try { u = await raw('users/' + id); } catch (e) { throw new Error('서버에 연결하지 못했어요'); }
    if (!u || !u.salt) throw new Error('없는 아이디예요');
    const h = await hashPw(pw, u.salt);
    if (h !== u.hash) throw new Error('비밀번호가 틀렸어요');
    adoptGameSave(u);
    try { localStorage.setItem(SESS, JSON.stringify({ id, hash: h })); } catch (e) { }
    await linkAccount(id, u);
    return me;
  }
  async function signup(id, pw, nick) {
    id = normId(id); nick = String(nick || '').trim().slice(0, 12);
    if (!/^[a-z0-9_]{4,12}$/.test(id)) throw new Error('아이디는 영어 소문자·숫자 4~12자예요');
    if (String(pw || '').length < 4) throw new Error('비밀번호는 4자 이상이에요');
    if (!nick) throw new Error('닉네임을 입력하세요');
    let ex;
    try { ex = await raw('users/' + id); } catch (e) { throw new Error('서버에 연결하지 못했어요'); }
    if (ex) throw new Error('이미 있는 아이디예요');
    const salt = Array.from({ length: 12 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
    const h = await hashPw(pw, salt);
    me.nick = nick; saveMe();
    await raw('users/' + id, 'PUT', { salt, hash: h, created: Date.now(), hub: { code: me.code, nick: me.nick, ava: me.ava } });
    try { localStorage.setItem(SESS, JSON.stringify({ id, hash: h })); } catch (e) { }
    await linkAccount(id, { hub: { code: me.code, nick: me.nick, ava: me.ava } });
    return me;
  }
  function logout() {
    leave();
    try { localStorage.removeItem(SESS); const g = localStorage.getItem(SK + '_guest'); if (g) localStorage.setItem(SK, g); else localStorage.removeItem(SK); } catch (e) { }
    const gc = validCode(me.guestCode) && me.guestCode !== me.code ? me.guestCode : newCode();
    me.acc = ''; me.code = gc; me.friends = []; me.nick = '플레이어' + gc.slice(0, 3);
    saveMe(); beat();
  }
  /** 다른 곳(냥냥 점프)에서 로그인·로그아웃했으면 허브도 맞춰 줌 */
  async function syncAccount() {
    const ss = getSess();
    if (ss && me.acc !== ss.id) {
      const u = await raw('users/' + ss.id).catch(() => null);
      if (u && u.hash === ss.hash) await linkAccount(ss.id, u);
    } else if (!ss && me.acc) { logout(); }
  }

  /* ---------- 게임 화면용 작은 알림창 (초대 · 친구 요청 · 따라오기) ---------- */
  let box = null, shown = {};
  function ensureBox() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '#blipBox{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;flex-direction:column;gap:8px;max-width:min(340px,calc(100vw - 24px));font:600 14px/1.35 system-ui,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}'
      + '#blipBox .bt{display:flex;align-items:center;gap:10px;background:#fff;color:#232527;border-radius:12px;padding:10px 12px;box-shadow:0 8px 28px rgba(0,0,0,.35);animation:blipIn .25s ease-out}'
      + '#blipBox .bt .a{font-size:24px}#blipBox .bt .x{flex:1;min-width:0}#blipBox .bt small{display:block;color:#606162;font-weight:500}'
      + '#blipBox button{border:0;border-radius:8px;padding:7px 11px;font:700 13px system-ui,sans-serif;cursor:pointer}#blipBox .y{background:#00b06f;color:#fff}#blipBox .n{background:#e9ecef;color:#232527}'
      + '@keyframes blipIn{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'blipBox'; document.body.appendChild(box);
    return box;
  }
  function card(key, html, onYes, onNo, ms) {
    if (shown[key]) return; shown[key] = 1;
    const b = ensureBox(), el = document.createElement('div'); el.className = 'bt'; el.innerHTML = html; b.appendChild(el);
    const close = () => { el.remove(); };
    const y = el.querySelector('.y'), n = el.querySelector('.n');
    if (y) y.onclick = () => { close(); onYes && onYes(); };
    if (n) n.onclick = () => { close(); onNo && onNo(); };
    if (ms) setTimeout(close, ms);
  }
  function notify(text, sub, ms) { card('t' + Math.random(), `<span class="a">🔔</span><span class="x">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`, null, null, ms || 5000); }
  async function pollInbox() {
    if (!UI) return;
    try {
      const { reqs, invs } = await inbox();
      for (const r of reqs) card('r' + r.code, `<span class="a">${r.ava}</span><span class="x">${esc(r.nick)}님의 친구 요청<small>코드 ${r.code}</small></span><button class="y">수락</button><button class="n">거절</button>`,
        () => accept(r.code).then(() => notify(r.nick + '님과 친구가 됐어요!')).catch(() => { }), () => decline(r.code).catch(() => { }));
      for (const v of invs) {
        const g = GAMES[v.game], same = v.game === GAME;
        card('i' + v.code + v.t, `<span class="a">${v.ava}</span><span class="x">${esc(v.nick)}님의 초대<small>${g.icon} ${esc(g.name)}${same ? ' · 지금 같은 게임이에요' : ''}</small></span>${same ? '' : '<button class="y">가기</button>'}<button class="n">${same ? '확인' : '거절'}</button>`,
          () => { clearInvite(v.code); go(v.game, v.code); }, () => clearInvite(v.code));
      }
    } catch (e) { }
  }

  /* ---------- 시작 ---------- */
  const followCode = (new URLSearchParams(location.search).get('follow') || '').toUpperCase();
  function start() {
    syncAccount().catch(() => { }).finally(() => { if (window.BLIP && window.BLIP._onAccount) window.BLIP._onAccount(); });
    beat(); setInterval(beat, 20000);
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    if (UI) {
      setTimeout(pollInbox, 2500); setInterval(pollInbox, 8000);
      if (validCode(followCode)) {
        req('users/' + followCode).then(u => { if (u) notify(`${String(u.nick || '친구').slice(0, 12)}님을 따라왔어요!`, GAMES[GAME] ? GAMES[GAME].name + '에서 같이 놀아요' : '', 6000); }).catch(() => { });
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.BLIP = {
    get me() { return me; }, GAMES, AVAS, now, isOnline, followCode,
    friendList, requestFriend, accept, decline, removeFriend, invite, inbox, clearInvite, allUsers,
    gameUrl, go, setProfile, saveMe, beat, notify, login, signup, logout, syncAccount, get loggedIn() { return !!me.acc; }, setGame(g) { curGame = g || ''; beat(); },
  };
})();
