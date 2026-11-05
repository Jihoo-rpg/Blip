'use strict';
/* ===== 나만의 구단: 구단 만들기 · 스쿼드 · 선수 뽑기 · AI 구단과 경기 · 코인 ===== */
const EMBS = ['🦁', '🐯', '🦅', '🐺', '🐉', '⚡', '🔥', '👑', '⭐', '🌊', '🛡️', '🐻', '🦈', '🐂', '🌙', '💎'];
const KITC = ['#d7142b', '#1b3f8f', '#141414', '#f4f4f4', '#ffd400', '#00663a', '#75aadb', '#f36c21', '#6b2fb5', '#ff5fa2', '#0f8a8a', '#8a1c2b'];
const OPP = [
  { id: 'BFC', n: '블립 FC 유스', f: '🐣', c: ['#9ad1ff', '#ffffff'], o: 62 }, { id: 'SWL', n: '수원 윙즈', f: '🕊️', c: ['#1e64d8', '#ffffff'], o: 66 }, { id: 'BSW', n: '부산 웨이브', f: '🌊', c: ['#0f8a8a', '#141414'], o: 70 },
  { id: 'STG', n: '서울 타이거즈', f: '🐯', c: ['#ff7a00', '#141414'], o: 73 }, { id: 'TKS', n: '도쿄 사무라이즈', f: '⛩️', c: ['#141414', '#d7142b'], o: 76 }, { id: 'MXS', n: '멕시코시티 솔', f: '☀️', c: ['#00663a', '#f4f4f4'], o: 79 },
  { id: 'LDR', n: '런던 로열스', f: '👑', c: ['#6b2fb5', '#ffd400'], o: 82 }, { id: 'RIO', n: '리우 삼바스', f: '🥁', c: ['#ffdc02', '#1d4fae'], o: 84 }, { id: 'MLS', n: '밀라노 스텔라', f: '⭐', c: ['#8a1c2b', '#141414'], o: 86 },
  { id: 'MDB', n: '마드리드 블랑코스', f: '🤍', c: ['#f4f4f4', '#ffd400'], o: 88 }, { id: 'PRL', n: '파리 뤼미에르', f: '🗼', c: ['#1f2a5c', '#d7142b'], o: 90 }, { id: 'GAL', n: '갤럭시 올스타즈', f: '🌌', c: ['#ff4df0', '#22d3ee'], o: 94 },
];
const PACKS = [
  { k: 'basic', n: '일반 팩', p: 300, w: { B: 50, S: 32, G: 16, W: 2, L: 0 }, c: '#c98a4b', d: '브론즈 · 실버가 많이 나와요' },
  { k: 'gold', n: '골드 팩', p: 1200, w: { B: 0, S: 0, G: 78, W: 19, L: 3 }, c: '#ffd400', d: '골드 이상 확정 · 월드클래스 19%' },
  { k: 'wc', n: '월드클래스 팩', p: 4000, w: { B: 0, S: 0, G: 0, W: 85, L: 15 }, c: '#22d3ee', d: '월드클래스 확정 · 레전드 15%' },
];
const DUPC = { B: 60, S: 120, G: 350, W: 1200, L: 3500 };
const CL = { tab: 'play', sel: null, busy: false };
const club = () => SAVE.club;
function saveClub() { persist(); }
function coins(n) { const c = club(); c.coins = Math.max(0, (c.coins || 0) + n); saveClub(); clubHeader(); if (UI.screen === 'menu') renderMenu(); }
/* ---------- 구단 만들기 ---------- */
function openCreate() {
  const st = { emb: '🦁', c1: '#d7142b', c2: '#141414' }; show(null); $('#create').hidden = false;
  const draw = () => { $('#cEmb').innerHTML = EMBS.map(e => `<button class="emb ${st.emb === e ? 'on' : ''}" data-emb="${e}">${e}</button>`).join(''); $('#cC1').innerHTML = KITC.map(c => `<button class="sw ${st.c1 === c ? 'on' : ''}" data-c1="${c}" style="background:${c}"></button>`).join(''); $('#cC2').innerHTML = KITC.map(c => `<button class="sw ${st.c2 === c ? 'on' : ''}" data-c2="${c}" style="background:${c}"></button>`).join(''); $('#cPrev').innerHTML = `<div class="crest" style="background:linear-gradient(135deg,${st.c1} 55%,${st.c2} 55%)">${st.emb}</div><b>${esc($('#cName').value || '내 구단')}</b>`; };
  $('#create').onclick = e => { const t = e.target.closest('[data-emb],[data-c1],[data-c2]'); if (!t) return; if (t.dataset.emb) st.emb = t.dataset.emb; if (t.dataset.c1) st.c1 = t.dataset.c1; if (t.dataset.c2) st.c2 = t.dataset.c2; sfx('tick'); draw(); };
  $('#cName').oninput = draw; $('#cName').value = ''; draw(); $('#cBack').onclick = () => { $('#create').hidden = true; show('#menu'); };
  $('#cGo').onclick = () => {
    const name = ($('#cName').value || '').trim().slice(0, 14); if (name.length < 2) { toast('구단 이름을 2자 이상 적어 주세요'); return; }
    // 처음 선수: 유망주 18명
    const pro = PDB.filter(p => p.prospect || p.r === 'B'); const rnd = Math.random; const own = {}; const take = (pos, n) => { const L = pro.filter(p => p.pos === pos && !own[p.id]).sort(() => rnd() - .5).slice(0, n); for (const p of L) own[p.id] = 1; };
    take('GK', 2); take('DF', 6); take('MF', 6); take('FW', 4);
    SAVE.club = { name, emb: st.emb, c1: st.c1, c2: st.c2, coins: 1500, own, xi: [], form: '4-3-3', w: 0, d: 0, l: 0, beat: {}, made: Date.now(), freeGold: 1 };
    autoXI(); saveClub(); $('#create').hidden = true; openClub(); toast('🎉 구단이 생겼어요! 선물로 골드 팩 1개를 드려요', 3500);
  };
}
/* ---------- 스쿼드 ---------- */
function owned() { return Object.keys(club().own).map(Number).map(i => PDB[i]).filter(Boolean); }
function autoXI() { const c = club(); const F = FORMS[c.form]; const pool = owned().sort((a, b) => b.o - a.o); const used = new Set(); c.xi = F.map(f => { let p = pool.find(q => !used.has(q.id) && q.pos === f[0]) || pool.find(q => !used.has(q.id)); if (p) used.add(p.id); return p ? p.id : null; }); saveClub(); }
function xiPlayers() { const c = club(); return c.xi.map(i => i == null ? null : PDB[i]); }
function teamOvr(xi, form) { const F = FORMS[form]; let s = 0, n = 0; xi.forEach((p, i) => { if (!p) return; let o = p.o; if (F[i] && p.pos !== F[i][0]) o -= p.pos === 'GK' || F[i][0] === 'GK' ? 25 : 6; s += o; n++; }); return n ? Math.round(s / 11) : 0; }
const cardName = n => n.length > 6 && n.includes(' ') ? n.split(' ').pop() : n;
function cardHTML(p, extra, slot) { if (!p) return `<div class="pcard empty" ${extra || ''}><div class="fr"></div><div class="in"></div><span>${slot || '+'}</span></div>`; const off = slot && slot !== p.pos; return `<div class="pcard r${p.r}" ${extra || ''}><div class="fr"></div><div class="in"><img data-por="${p.id}" alt=""><em>${p.o}</em><i>${p.pos}</i><span class="fl">${NAT[p.nat] || ''}</span><b>${esc(cardName(p.n))}</b><small>${RAR(p.r).n}</small>${off ? '<span class="off">⚠️</span>' : ''}</div><div class="gem"></div></div>`; }
function clubTeamObj(c, xi, form) {
  return { id: (c.id || c.name.replace(/\s/g, '').slice(0, 3)).toUpperCase(), n: c.name || c.n, f: c.emb || c.f, home: [c.c1 || c.c[0], c.c2 || c.c[1], c.c1 || c.c[0]], away: ['#f4f4f4', c.c1 || c.c[0], '#f4f4f4'], num: colDist(c.c1 || c.c[0], '#ffffff') < .6 ? '#141414' : '#ffffff', r: [80, 80, 80, 80], skin: [0, 1, 2], hair: ['#120f0d'], names: ['선수'], xi, form };
}
function oppXI(o) { const rnd = mulberry([...o.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 11)); const F = FORMS['4-3-3']; const used = new Set(); return F.map(f => { const cand = PDB.filter(p => p.pos === f[0] && !used.has(p.id) && Math.abs(p.o - o.o) <= 4 && (o.o >= 90 || !p.leg)).sort((a, b) => Math.abs(a.o - o.o) - Math.abs(b.o - o.o) + (rnd() - .5) * 4); const p = cand[Math.floor(rnd() * Math.min(5, cand.length))] || PDB.filter(p => p.pos === f[0] && !used.has(p.id)).sort((a, b) => Math.abs(a.o - o.o) - Math.abs(b.o - o.o))[0]; used.add(p.id); return p; }); }
/* ---------- 구단 화면 ---------- */
function clubHeader() { const c = club(); if (!c) return; $('#clHead').innerHTML = `<div class="crest" style="background:linear-gradient(135deg,${c.c1} 55%,${c.c2} 55%)">${c.emb}</div><div class="cn"><b>${esc(c.name)}</b><small>${c.w}승 ${c.d}무 ${c.l}패 · 팀 능력치 ${teamOvr(xiPlayers(), c.form)}</small></div><div class="coin">🪙 ${(c.coins || 0).toLocaleString()}</div>`; }
function openClub() { if (!club()) return openCreate(); show('#club'); UI.screen = 'club'; clubHeader(); clubTab(CL.tab); }
function clubTab(t) { clubTab0(t); fillPortraits($('#clBody')); }
function clubTab0(t) {
  CL.tab = t; CL.sel = null; $$('#clTabs [data-ctab]').forEach(b => b.classList.toggle('on', b.dataset.ctab === t)); const B = $('#clBody'); const c = club();
  if (t === 'play') {
    B.innerHTML = `<p class="hintp">AI 구단을 이기면 코인을 받아요. 강한 팀일수록 코인이 많아요! 처음 이기면 보너스 🎁</p><div class="opps">${OPP.map((o, i) => { const lock = i > 0 && !c.beat[OPP[i - 1].id] && i > (c.w || 0) + 2; const rew = winCoins(o); return `<button class="opp ${lock ? 'lock' : ''}" data-opp="${o.id}"><div class="crest sm" style="background:linear-gradient(135deg,${o.c[0]} 55%,${o.c[1]} 55%)">${o.f}</div><div class="on"><b>${esc(o.n)}</b><small>능력치 ${o.o} ${c.beat[o.id] ? '· ✅ 이김' : ''}</small></div><div class="rw">${lock ? '🔒' : `🪙 ${rew}${c.beat[o.id] ? '' : ' 🎁'}`}</div></button>`; }).join('')}</div>`;
  } else if (t === 'squad') {
    const xi = xiPlayers(); const F = FORMS[c.form]; const bench = owned().filter(p => !c.xi.includes(p.id)).sort((a, b) => b.o - a.o);
    B.innerHTML = `<div class="sqtop"><div class="row">${Object.keys(FORMS).map(f => `<button class="chip ${c.form === f ? 'on' : ''}" data-cform="${f}">${f}</button>`).join('')}</div><button class="chip" id="bAuto">✨ 자동 배치</button></div>
      <div class="pitch">${F.map((f, i) => `<div class="slot" style="left:${50 + f[2] * 40}%;top:${89 - (f[1] + .95) / 1.0 * 76}%">${cardHTML(xi[i], `data-slot="${i}"`, f[0])}</div>`).join('')}</div>
      <p class="hintp">선수를 누르고 → 바꿀 선수를 누르면 자리를 바꿔요</p><div class="bench">${bench.map(p => cardHTML(p, `data-bench="${p.id}"`)).join('') || '<p class="hintp">후보 선수가 없어요. 뽑기에서 선수를 얻어요!</p>'}</div>`;
  } else if (t === 'shop') {
    B.innerHTML = `<div class="packs">${PACKS.map(k => `<button class="pack" data-pack="${k.k}" style="--pc:${k.c}"><div class="pk">${k.k === 'wc' ? '💎' : k.k === 'gold' ? '🏆' : '⚽'}</div><b>${k.n}</b><small>${k.d}</small><span>${k.k === 'gold' && c.freeGold ? '🎁 무료!' : '🪙 ' + k.p.toLocaleString()}</span></button>`).join('')}</div>
      <p class="hintp">이미 있는 선수가 나오면 코인으로 바꿔 드려요 (브론즈 60 · 실버 120 · 골드 350 · 월드클래스 1,200 · 레전드 3,500)</p>
      <div class="odds">${PACKS.map(k => `<div><b>${k.n}</b> ${Object.entries(k.w).filter(([, v]) => v).map(([r, v]) => `${RAR(r).n} ${v}%`).join(' · ')}</div>`).join('')}</div>`;
  } else if (t === 'all') {
    const own = club().own; const L = PDB.filter(p => !p.prospect).sort((a, b) => b.o - a.o); const n = L.filter(p => own[p.id]).length;
    B.innerHTML = `<p class="hintp">선수 도감 ${n} / ${L.length} · 아직 없는 선수는 흐리게 보여요</p><div class="rfilter">${['all', 'L', 'W', 'G', 'S', 'B'].map(r => `<button class="chip ${CL.rf === r || (!CL.rf && r === 'all') ? 'on' : ''}" data-rf="${r}">${r === 'all' ? '전체' : RAR(r).n}</button>`).join('')}</div><div class="bench all">${L.filter(p => !CL.rf || CL.rf === 'all' || p.r === CL.rf).map(p => cardHTML(p, own[p.id] ? '' : 'data-miss="1"')).join('')}</div>`;
  }
}
function winCoins(o) { return 150 + Math.max(0, o.o - 60) * 18; }
document.addEventListener('click', e => {
  if (UI.screen !== 'club') return; const t = e.target.closest('[data-ctab],[data-opp],[data-cform],[data-slot],[data-bench],[data-pack],[data-rf],#bAuto'); if (!t) return; const c = club(); sfx('tick');
  if (t.dataset.ctab) return clubTab(t.dataset.ctab);
  if (t.dataset.rf) { CL.rf = t.dataset.rf; return clubTab('all'); }
  if (t.id === 'bAuto') { autoXI(); clubHeader(); return clubTab('squad'); }
  if (t.dataset.cform) { c.form = t.dataset.cform; autoXI(); clubHeader(); return clubTab('squad'); }
  if (t.dataset.opp) { if (t.classList.contains('lock')) { toast('앞 구단들을 먼저 이겨야 해요'); return; } return startClubMatch(OPP.find(o => o.id === t.dataset.opp)); }
  if (t.dataset.pack) return buyPack(PACKS.find(k => k.k === t.dataset.pack));
  // 자리 바꾸기
  const pickA = CL.sel; const cur = t.dataset.slot != null ? { slot: +t.dataset.slot } : { bench: +t.dataset.bench };
  if (!pickA) { CL.sel = cur; $$('.pcard.sel').forEach(x => x.classList.remove('sel')); t.classList.add('sel'); return; }
  CL.sel = null; const xi = c.xi;
  if (pickA.slot != null && cur.slot != null) { const a = xi[pickA.slot]; xi[pickA.slot] = xi[cur.slot]; xi[cur.slot] = a; }
  else if (pickA.slot != null && cur.bench != null) xi[pickA.slot] = cur.bench;
  else if (pickA.bench != null && cur.slot != null) xi[cur.slot] = pickA.bench;
  saveClub(); clubHeader(); clubTab('squad');
});
/* ---------- 뽑기 ---------- */
function rollPack(k) { const w = k.w; let tot = 0; for (const r in w) tot += w[r]; let x = Math.random() * tot, r = 'B'; for (const q in w) { x -= w[q]; if (x <= 0) { r = q; break; } } const L = PDB.filter(p => p.r === r && (r !== 'B' || true)); return pick(L); }
function buyPack(k) {
  const c = club(); const free = k.k === 'gold' && c.freeGold; if (!free && (c.coins || 0) < k.p) { toast('🪙 코인이 부족해요. 경기에서 이기면 받아요!'); sfx('tick'); return; }
  if (free) c.freeGold = 0; else coins(-k.p); const p = rollPack(k); const dup = !!c.own[p.id]; if (dup) coins(DUPC[p.r]); else c.own[p.id] = 1; saveClub(); clubHeader(); revealCard(p, dup, k);
}
function revealCard(p, dup, k) {
  const ov = $('#reveal'), r = RAR(p.r); ov.hidden = false; ov.className = 'r' + p.r; ov.innerHTML = `<div class="rv"><div class="pack big" style="--pc:${k.c}"><div class="pk">${k.k === 'wc' ? '💎' : k.k === 'gold' ? '🏆' : '⚽'}</div></div></div>`;
  sfx('kick', 1); vibrate(30);
  setTimeout(() => { sfx(p.r === 'W' || p.r === 'L' ? 'goal' : 'save'); if (p.r === 'W' || p.r === 'L') vibrate([60, 40, 120]);
    ov.innerHTML = `<div class="rv"><div class="glow" style="--rc:${r.c}"></div>${bigCard(p)}<div class="rvt" style="color:${r.c}">${r.n}!</div>${dup ? `<div class="dup">이미 있는 선수 → 🪙 ${DUPC[p.r]} 코인</div>` : '<div class="dup">새 선수 획득! 스쿼드에 넣어 보세요</div>'}<div class="row2" style="margin-top:14px"><button class="btn" id="rvClose">확인</button><button class="btn main" id="rvAgain">한 번 더 🪙${k.p.toLocaleString()}</button></div></div>`;
    fillPortraits(ov); $('#rvClose').onclick = () => { ov.hidden = true; if (UI.screen === 'menu') renderMenu(); else clubTab(CL.tab); }; $('#rvAgain').onclick = () => { ov.hidden = true; buyPack(k); };
  }, 1300);
}
function bigCard(p) { const s = p.st; const sl = p.pos === 'GK' ? [['GK', s.gk], ['패스', s.pas], ['속도', s.spd]] : [['속도', s.spd], ['슈팅', s.sht], ['패스', s.pas], ['드리블', s.drb], ['수비', s.def], ['헤더', Math.round((s.def + s.sht) / 2)]]; const lau = p.r === 'W' || p.r === 'L' ? '<div class="laurel l"></div><div class="laurel r"></div>' : ''; return `<div class="pcard bcard r${p.r}">${lau}<div class="fr"></div><div class="in"><img data-por="${p.id}" alt=""><em>${p.o}</em><i>${p.pos}</i><span class="fl">${NAT[p.nat] || ''}</span><b>${esc(p.n)}</b><small>${POSN[p.pos]} · ${RAR(p.r).n}</small><div class="bs">${sl.map(([n, v]) => `<div><span>${n}</span>${v}</div>`).join('')}</div></div><div class="gem"></div></div>`; }
/* ---------- 경기 ---------- */
function startClubMatch(o) {
  const c = club(); if (c.xi.filter(x => x != null).length < 11) { toast('선수 11명이 필요해요. 자동 배치를 눌러 보세요'); return; }
  const me = clubTeamObj(c, xiPlayers(), c.form); const op = clubTeamObj({ id: o.id, n: o.n, f: o.f, c: o.c }, oppXI(o), '4-3-3');
  CL.vs = o; startGame({ T0: me, T1: op, f0: c.form, f1: '4-3-3', mode: 'club' });
}
function clubReward(res, gf) { // res: 'w' 'd' 'l'
  const c = club(), o = CL.vs; if (!c || !o) return ''; const base = winCoins(o); let n = res === 'w' ? base : res === 'd' ? Math.round(base * .4) : 50; n += gf * 25; let bonus = 0; if (res === 'w' && !c.beat[o.id]) { bonus = 500 + Math.max(0, o.o - 60) * 20; c.beat[o.id] = 1; }
  c[res]++; c.xp = (c.xp || 0) + (res === 'w' ? 60 : res === 'd' ? 30 : 15); coins(n + bonus); saveClub(); return `🪙 +${n}${bonus ? ` · 🎁 첫 승리 보너스 +${bonus}` : ''} (보유 ${c.coins.toLocaleString()})`;
}
/* ---------- 메인 메뉴 ---------- */
const today = () => new Date().toISOString().slice(0, 10);
function nextOpp(c) { return OPP.find(o => !c.beat[o.id]) || OPP[OPP.length - 1]; }
function playerValue(p) { return Math.round(Math.pow(1.165, p.o - 50) * 10) * 1000; }
function renderMenu() {
  const c = club(); const xpAll = c ? (c.xp || 0) : 0, lv = Math.floor(xpAll / 100) + 1, xp = xpAll % 100;
  $('#mClub').innerHTML = c ? `<div class="crest" style="background:linear-gradient(135deg,${c.c1} 55%,${c.c2} 55%)">${c.emb}</div><div style="min-width:0"><b>${esc(c.name)}</b><div class="lv"><i>${lv}</i><u style="--xp:${xp}%"></u>${xp} / 100 XP</div></div>` : `<div class="crest" style="background:rgba(255,255,255,.12)">➕</div><div style="min-width:0"><b>구단 만들기</b><div class="lv">눌러서 나만의 구단을 만들어요</div></div>`;
  $('#mCoins').textContent = '🪙 ' + (c ? c.coins || 0 : 0).toLocaleString();
  if (c) { const o = nextOpp(c); $('#mNext').innerHTML = `<span>다음 상대</span><div class="crest" style="background:linear-gradient(135deg,${o.c[0]} 55%,${o.c[1]} 55%)">${o.f}</div><span>${esc(o.n)} · 🪙${winCoins(o)}</span>`; $('#mFeatP').textContent = `${c.w}승 ${c.d}무 ${c.l}패 · 이기면 코인으로 선수 뽑기!`; }
  else { $('#mNext').innerHTML = ''; $('#mFeatP').textContent = '구단을 만들면 선수 18명 + 🪙1,500 + 골드 팩!'; }
  const xi = c ? xiPlayers() : []; const ovr = c ? teamOvr(xi, c.form) : 0; const val = xi.filter(Boolean).reduce((a, p) => a + playerValue(p), 0);
  $('#mTeam').innerHTML = `<div class="tt"><small>내 팀</small><p>${c ? c.form + ' 포메이션' : '구단을 만들어 주세요'}</p></div><div class="tm2">${c ? `<div class="crest" style="background:linear-gradient(135deg,${c.c1} 55%,${c.c2} 55%)">${c.emb}</div>` : '<div class="crest" style="background:#333">❔</div>'}<div class="ovr"><small>OVR</small>${ovr || '-'}</div></div><div class="val"><b>${val.toLocaleString()}</b><span>구단 가치</span></div>`;
  $('#mDailyDot').classList.toggle('on', !!c && c.daily !== today()); $('#mShopDot').classList.toggle('on', !!c && !!(c.freeGold || (c.coins || 0) >= 300));
  // 메뉴에 서 있는 선수: 우리 팀 최고 선수 (구단이 없으면 손흥민)
  const best = xi.filter(Boolean).sort((a, b) => b.o - a.o)[0] || PDB.find(p => p.n === '손흥민') || PDB[0];
  const kit = c ? [c.c1, c.c2, c.c1, c.c2] : (() => { const t = TEAMS.find(x => x.id === best.nat) || TEAMS[0]; return [t.home[0], t.home[1], t.home[2] || t.home[0], t.home[1]]; })();
  if (CH.ready) heroSet(best, kit);
}
function menuNav(tab) { auInit(); if (!club()) return openCreate(); CL.tab = tab; openClub(); }
document.addEventListener('click', e => {
  if (UI.screen !== 'menu' || $('#menu').hidden) return; const t = e.target.closest('[data-mnav],#mClub,#mTeam,#mDaily,#mKeys,#mMute,#mOnl2'); if (!t) return; sfx('tick');
  if (t.dataset.mnav) return menuNav(t.dataset.mnav);
  if (t.id === 'mClub') return menuNav('play'); if (t.id === 'mTeam') return menuNav('squad'); if (t.id === 'mOnl2') { auInit(); return openOnline(); }
  if (t.id === 'mDaily') { const c = club(); if (!c) { toast('먼저 구단을 만들어요!'); return openCreate(); } if (c.daily === today()) { toast('오늘 출석 보상은 이미 받았어요. 내일 또 와요!'); return; } c.daily = today(); coins(300); toast('🎁 출석 보상 🪙300 받았어요!', 2600); sfx('goal'); return renderMenu(); }
  if (t.id === 'mKeys') return toast(IS_MOBILE ? '왼쪽 화면 끌기: 이동 · 패스 / 슛(꾹) / 스루 / 질주 버튼' : 'WASD 이동 · Shift 질주 · Space 패스 · F 꾹→떼기 슛 · E 스루패스 · C 카메라', 4200);
  if (t.id === 'mMute') { $('#bMute').click(); $('#mMute').textContent = SAVE.mute ? '🔇' : '🔊'; }
});
