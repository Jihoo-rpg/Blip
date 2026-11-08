'use strict';
/* ===== 나만의 구단: 구단 만들기 · 스쿼드 · 선수 뽑기 · AI 구단과 경기 · 코인 ===== */
const EMBS = ['🦁', '🐯', '🦅', '🐺', '🐉', '⚡', '🔥', '👑', '⭐', '🌊', '🛡️', '🐻', '🦈', '🐂', '🌙', '💎'];
const KITC = ['#d7142b', '#1b3f8f', '#141414', '#f4f4f4', '#ffd400', '#00663a', '#75aadb', '#f36c21', '#6b2fb5', '#ff5fa2', '#0f8a8a', '#8a1c2b'];
const OPP = [
  { id: 'BFC', n: '블립 FC 유스', f: '🐣', c: ['#9ad1ff', '#ffffff'], o: 58 }, { id: 'SWL', n: '수원 윙즈', f: '🕊️', c: ['#1e64d8', '#ffffff'], o: 62 }, { id: 'BSW', n: '부산 웨이브', f: '🌊', c: ['#0f8a8a', '#141414'], o: 66 },
  { id: 'STG', n: '서울 타이거즈', f: '🐯', c: ['#ff7a00', '#141414'], o: 73 }, { id: 'TKS', n: '도쿄 사무라이즈', f: '⛩️', c: ['#141414', '#d7142b'], o: 76 }, { id: 'MXS', n: '멕시코시티 솔', f: '☀️', c: ['#00663a', '#f4f4f4'], o: 79 },
  { id: 'LDR', n: '런던 로열스', f: '👑', c: ['#6b2fb5', '#ffd400'], o: 82 }, { id: 'RIO', n: '리우 삼바스', f: '🥁', c: ['#ffdc02', '#1d4fae'], o: 84 }, { id: 'MLS', n: '밀라노 스텔라', f: '⭐', c: ['#8a1c2b', '#141414'], o: 86 },
  { id: 'MDB', n: '마드리드 블랑코스', f: '🤍', c: ['#f4f4f4', '#ffd400'], o: 88 }, { id: 'PRL', n: '파리 뤼미에르', f: '🗼', c: ['#1f2a5c', '#d7142b'], o: 90 }, { id: 'GAL', n: '갤럭시 올스타즈', f: '🌌', c: ['#ff4df0', '#22d3ee'], o: 94 },
  { id: 'RCL', n: '레알 클래식', f: '🏛️', c: ['#ffffff', '#6b2fb5'], o: 100 }, { id: 'WDT', n: '월드 드림팀', f: '🌍', c: ['#0b1020', '#22d3ee'], o: 110 }, { id: 'ICN', n: '명예의 전당 올스타', f: '👑', c: ['#fff1b0', '#141414'], o: 122 },
];
const PACKS = [
  { k: 'basic', n: '일반 팩', p: 120, w: { B: 50, S: 32, G: 16, W: 2, L: 0 }, c: '#c98a4b', d: '브론즈 · 실버가 많이 나와요', j: ['B', 'B'] },
  { k: 'gold', n: '골드 팩', p: 500, w: { B: 0, S: 0, G: 78, W: 19, L: 3 }, c: '#ffd400', d: '골드 이상 확정 · 월드클래스 19%', j: ['B', 'S', 'S'] },
  { k: 'wc', n: '월드클래스 팩', p: 1700, w: { B: 0, S: 0, G: 0, W: 80, L: 15, T: 5 }, c: '#22d3ee', d: '월드클래스 확정 · 레전드 15% · 스페셜 5%', j: ['S', 'S', 'G'] },
  { k: 'sp', n: '스페셜 팩', p: 4700, w: { T: 88, I: 12 }, c: '#c86bff', d: '시즌 스페셜(100+) 확정 · 명예의 전당 12%', j: ['G', 'G', 'G', 'W'] },
  { k: 'goat', n: 'GOAT 팩', p: 15000, w: { I: 93, X: 7 }, c: '#ff4d4d', d: '명예의 전당 확정 · GOAT 7% (게임 최고 카드 136~145)', j: ['W', 'W', 'L'] },
];
/* 되팔기 · 중복 코인: 팩 값의 1/3쯤만 돌아와요 (뽑고 팔기로 돈 복사 막기) */
const DUPC = { B: 10, S: 20, G: 60, W: 250, L: 800, T: 900, I: 3000, X: 12000 };
/* 선수 팔기: 처음 받은 기본 선수 18명만 못 팔아요 (선발이어도 팔면 자동으로 채워요) · 강화할수록 비싸요 */
const SELLC = DUPC; const isBase = id => { const c = club(); return c.base ? c.base.includes(id) : !!(PDB[id] && PDB[id].prospect); };
const sellPrice = id => Math.round(SELLC[PDB[id].r] * Math.pow(1.45, Math.max(0, lvOf(id) - 1)) / 10) * 10;
function sellBar() { const c = club(); const n = Object.keys(c.own).length; const S = (CL.sellSel = (CL.sellSel || []).filter(i => c.own[i] && !sellCheck(i))); const tot = S.reduce((a, i) => a + sellPrice(i), 0);
  return `<div class="sellbar"><span>${S.length ? `<b>${S.length}명</b> 골랐어요 → 🪙${tot.toLocaleString()}` : '💰 팔 선수를 누르세요 (여러 명 돼요 · 선발도 돼요) · 처음 받은 기본 선수는 못 팔아요'}</span>
    <button class="chip" data-sellq="BS">잡카드 전부</button>${['B', 'S', 'G', 'W', 'L', 'T', 'I', 'X'].map(r => `<button class="chip" data-sellq="${r}" style="color:${RAR(r).c}">${RAR(r).n} 전부</button>`).join('')}${S.length ? `<button class="chip" data-sellno="1">선택 해제</button><button class="btn main" data-sellok="1">${S.length}명 팔기</button>` : ''}</div><p class="hintp" style="margin-top:0">지금 ${n}명 · "전부" 버튼은 선발이 아닌 선수만 골라요 · 선발도 직접 누르면 팔 수 있어요</p>`; }
function sellCheck(id) { const c = club(), p = PDB[id]; if (!p || !c.own[id]) return '없는 선수예요'; if (isBase(id)) return '처음 받은 기본 선수는 못 팔아요'; return ''; }
function dropFromXI(id) { const c = club(); const i = c.xi.indexOf(id); if (i < 0) return; const pos = FORMS[c.form][i][0]; const pool = owned().filter(q => q.id !== id && !c.xi.includes(q.id)).sort((a, b) => cardO(b) - cardO(a)); const r = pool.find(q => q.pos === pos) || pool[0]; c.xi[i] = r ? r.id : null; }
function sellPlayer(id, quiet) { const c = club(), p = PDB[id]; const why = sellCheck(id); if (why) { if (!quiet) toast(why, 2400); return 0; } const n = sellPrice(id); dropFromXI(id); delete c.own[id]; coins(n); saveClub(); if (quiet) return n; toast(`💰 ${p.n} 선수를 팔았어요 · 🪙 +${n.toLocaleString()}`, 2600); sfx('goal'); }
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
    SAVE.club.base = Object.keys(SAVE.club.own).map(Number); autoXI(); saveClub(); giveGifts(); $('#create').hidden = true; openClub(); toast('🎉 구단이 생겼어요! 선물로 골드 팩 1개를 드려요', 3500);
  };
}
/* ---------- 스쿼드 ---------- */
function owned() { return Object.keys(club().own).map(Number).map(i => PDB[i]).filter(Boolean); }
function autoXI() { const c = club(); const F = FORMS[c.form]; const pool = owned().sort((a, b) => cardO(b) - cardO(a)); const used = new Set(), nm = new Set(); const ok = q => !used.has(q.id) && !nm.has(q.n); c.xi = F.map(f => { let p = pool.find(q => ok(q) && q.pos === f[0]) || pool.find(ok); if (p) { used.add(p.id); nm.add(p.n); } return p ? p.id : null; }); saveClub(); }
function xiPlayers() { const c = club(); return c.xi.map(i => i == null ? null : PDB[i]); }
function teamOvr(xi, form) { const F = FORMS[form]; let s = 0, n = 0; xi.forEach((p, i) => { if (!p) return; let o = cardO(p); if (F[i] && p.pos !== F[i][0]) o -= p.pos === 'GK' || F[i][0] === 'GK' ? 25 : 6; s += o; n++; }); return n ? Math.round(s / 11) : 0; }
const cardName = n => n.length > 6 && n.includes(' ') ? n.split(' ').pop() : n;
function cardHTML(p, extra, slot) { if (!p) return `<div class="pcard empty" ${extra || ''}><div class="fr"></div><div class="in"></div><span>${slot || '+'}</span></div>`; const off = slot && slot !== p.pos; const lv = lvOf(p.id); return `<div class="pcard r${p.r}" ${extra || ''}><div class="fr"></div><div class="in"><img data-por="${p.id}" alt=""><em>${cardO(p)}</em>${lv > 1 ? `<span class="lvb l${lv >= 8 ? 3 : lv >= 5 ? 2 : 1}${lv === 10 ? ' max' : ''}">+${lv}</span>` : ''}<i>${p.pos}</i><span class="fl">${NAT[p.nat] || ''}</span><b>${esc(cardName(p.n))}</b><small>${RAR(p.r).n}</small>${off ? '<span class="off">⚠️</span>' : ''}</div><div class="gem"></div></div>`; }
function clubTeamObj(c, xi, form) {
  return { id: (c.id || c.name.replace(/\s/g, '').slice(0, 3)).toUpperCase(), n: c.name || c.n, f: c.emb || c.f, home: [c.c1 || c.c[0], c.c2 || c.c[1], c.c1 || c.c[0]], away: ['#f4f4f4', c.c1 || c.c[0], '#f4f4f4'], num: colDist(c.c1 || c.c[0], '#ffffff') < .6 ? '#141414' : '#ffffff', r: [80, 80, 80, 80], skin: [0, 1, 2], hair: ['#120f0d'], names: ['선수'], xi, form };
}
function oppXI(o) { const rnd = mulberry([...o.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 11)); const F = FORMS['4-3-3']; const used = new Set(), names = new Set(); return F.map(f => { const cand = PDB.filter(p => p.pos === f[0] && !used.has(p.id) && !names.has(p.n) && Math.abs(p.o - o.o) <= 4 && (o.o >= 90 || !p.leg)).sort((a, b) => Math.abs(a.o - o.o) - Math.abs(b.o - o.o) + (rnd() - .5) * 4); const p = cand[Math.floor(rnd() * Math.min(5, cand.length))] || PDB.filter(p => p.pos === f[0] && !used.has(p.id)).sort((a, b) => Math.abs(a.o - o.o) - Math.abs(b.o - o.o))[0]; used.add(p.id); names.add(p.n); return fitO(p, o.o); }); }
// 상대 팀 수준 맞추기: 비슷한 선수가 없으면 빌려 온 선수 능력치를 팀 OVR에 맞춰요
function fitO(p, o) { const d = Math.round(o + (p.o - o) * .25) - p.o; if (Math.abs(p.o - o) <= 3 || !d) return p; const st = {}; for (const k in p.st) st[k] = Math.max(20, (k === 'gk') !== (p.pos === 'GK') ? p.st[k] : p.st[k] + d); return Object.assign({}, p, { o: p.o + d, st }); }
/* ---------- 구단 화면 ---------- */
function clubHeader() { const c = club(); if (!c) return; $('#clHead').innerHTML = `<div class="crest" style="background:linear-gradient(135deg,${c.c1} 55%,${c.c2} 55%)">${c.emb}</div><div class="cn"><b>${esc(c.name)}</b><small>${c.w}승 ${c.d}무 ${c.l}패 · 팀 능력치 ${teamOvr(xiPlayers(), c.form)}</small></div><div class="coin">🪙 ${(c.coins || 0).toLocaleString()}</div>`; }
function openClub() { if (!club()) return openCreate(); show('#club'); UI.screen = 'club'; clubHeader(); clubTab(CL.tab); }
function clubTab(t) { clubTab0(t); fillPortraits($('#clBody')); }
function clubTab0(t) {
  if (t !== 'squad') { CL.sell = false; CL.sellSel = []; } CL.tab = t; CL.sel = null; $$('#clTabs [data-ctab]').forEach(b => b.classList.toggle('on', b.dataset.ctab === t)); const B = $('#clBody'); const c = club();
  if (t === 'play') {
    B.innerHTML = `<p class="hintp">AI 구단을 이기면 코인을 받아요. 강한 팀일수록 코인이 많아요! 처음 이기면 보너스 🎁</p><div class="opps">${OPP.map((o, i) => { const my = teamOvr(xiPlayers(), c.form); const lock = i > 0 && !c.beat[OPP[i - 1].id] && i > (c.w || 0) + 2 && my < o.o; const rew = winCoins(o); return `<button class="opp ${lock ? 'lock' : ''}" data-opp="${o.id}"><div class="crest sm" style="background:linear-gradient(135deg,${o.c[0]} 55%,${o.c[1]} 55%)">${o.f}</div><div class="on"><b>${esc(o.n)}</b><small>능력치 ${o.o} ${c.beat[o.id] ? '· ✅ 이김' : ''}</small></div><div class="rw">${lock ? `🔒<small class="lk">${o.o}↑</small>` : `🪙 ${rew}${c.beat[o.id] ? '' : ' 🎁'}`}</div></button>`; }).join('')}</div>`;
  } else if (t === 'squad') {
    const xi = xiPlayers(); const F = FORMS[c.form]; const bench = owned().filter(p => !c.xi.includes(p.id)).sort((a, b) => b.o - a.o);
    B.innerHTML = `<div class="sqtop"><div class="row">${Object.keys(FORMS).map(f => `<button class="chip ${c.form === f ? 'on' : ''}" data-cform="${f}">${f}</button>`).join('')}</div><div class="row"><button class="chip ${CL.sell ? 'on' : ''}" id="bSell">💰 선수 팔기</button><button class="chip" id="bAuto">✨ 자동 배치</button></div></div>
      <div class="sqwrap"><div class="pitch">${F.map((f, i) => `<div class="slot" style="left:${50 + f[2] * 40}%;top:${89 - (f[1] + .95) / 1.0 * 76}%">${cardHTML(xi[i], `data-slot="${i}"${CL.sell && xi[i] && (CL.sellSel || []).includes(xi[i].id) ? ' data-ssel="1"' : ''}`, f[0])}</div>`).join('')}</div>
      <div>${CL.sell ? sellBar() : '<p class="hintp">선수를 누르고 → 바꿀 선수를 누르면 자리를 바꿔요</p>'}<div class="bench${CL.sell ? ' selling' : ''}">${bench.map(p => cardHTML(p, `data-bench="${p.id}"${CL.sell && (CL.sellSel || []).includes(p.id) ? ' data-ssel="1"' : ''}`) .replace('<div class="gem">', CL.sell ? `<span class="price">🪙${SELLC[p.r]}</span><div class="gem">` : '<div class="gem">')).join('') || '<p class="hintp">후보 선수가 없어요. 뽑기에서 선수를 얻어요!</p>'}</div></div></div>`;
  } else if (t === 'shop') {
    const pn = CL.pn || 1; B.innerHTML = `<div class="pnrow"><b>몇 개 뽑을까요?</b>${[1, 5, 10, 30, 50].map(n => `<button class="chip ${!CL.pmax && pn === n ? 'on' : ''}" data-pn="${n}">${n}개</button>`).join('')}<button class="chip ${CL.pmax ? 'on' : ''}" data-pn="max">최대 (코인만큼)</button><label class="pnl">직접 <input id="pnIn" type="number" min="1" max="200" value="${CL.pmax ? '' : pn}" placeholder="개수" inputmode="numeric">개</label></div>
      <div class="packs">${PACKS.map(k => `<button class="pack" data-pack="${k.k}" style="--pc:${k.c}"><div class="pk">${k.k === 'goat' ? '🐐' : k.k === 'sp' ? '✨' : k.k === 'wc' ? '💎' : k.k === 'gold' ? '🏆' : '⚽'}</div><b>${k.n}</b><small>${k.d}</small><span>${packN(k) > 1 ? `${packN(k)}개 🪙 ${(k.p * (packN(k) - (k.k === 'gold' && c.freeGold ? 1 : 0))).toLocaleString()}` : k.k === 'gold' && c.freeGold ? '🎁 무료!' : '🪙 ' + k.p.toLocaleString()}</span></button>`).join('')}</div>
      <p class="hintp">이미 있는 선수가 나오면 코인으로 바꿔 드려요 · 팔 때도 같은 값이에요 (${Object.entries(DUPC).map(([r, v]) => `${RAR(r).n} ${v.toLocaleString()}`).join(' · ')})</p>
      <div class="odds">${PACKS.map(k => `<div><b>${k.n}</b> ${Object.entries(k.w).filter(([, v]) => v).map(([r, v]) => `${RAR(r).n} ${v}%`).join(' · ')}</div>`).join('')}</div>`;
  } else if (t === 'all') {
    const own = club().own; const L = PDB.filter(p => !p.prospect).sort((a, b) => b.o - a.o); const n = L.filter(p => own[p.id]).length;
    B.innerHTML = `<p class="hintp">선수 도감 ${n} / ${L.length} · 아직 없는 선수는 흐리게 보여요</p><div class="rfilter">${['all', 'X', 'I', 'T', 'L', 'W', 'G', 'S', 'B'].map(r => `<button class="chip ${CL.rf === r || (!CL.rf && r === 'all') ? 'on' : ''}" data-rf="${r}">${r === 'all' ? '전체' : RAR(r).n}</button>`).join('')}</div><div class="bench all">${L.filter(p => !CL.rf || CL.rf === 'all' || p.r === CL.rf).map(p => cardHTML(p, own[p.id] ? '' : 'data-miss="1"')).join('')}</div>`;
  }
}
function winCoins(o) { return 220 + Math.max(0, o.o - 60) * 24; }
document.addEventListener('click', e => {
  if (UI.screen !== 'club') return; const t = e.target.closest('[data-ctab],[data-opp],[data-cform],[data-slot],[data-bench],[data-pack],[data-rf],#bAuto,#bSell,[data-sellok],[data-sellno],[data-sellq],[data-pn]'); if (!t) return; const c = club(); sfx('tick');
  if (t.id === 'bSell') { CL.sell = !CL.sell; CL.sellSel = []; return clubTab('squad'); }
  if (t.dataset.sellq) { const rs = t.dataset.sellq.split(''); CL.sellSel = owned().filter(q => rs.includes(q.r) && !c.xi.includes(q.id) && !sellCheck(q.id)).map(q => q.id); if (!CL.sellSel.length) toast('고를 선수가 없어요'); return clubTab('squad'); }
  if (t.dataset.sellok) { const L = (CL.sellSel || []).slice(); CL.sellSel = []; let sum = 0, cnt = 0; for (const id of L) { const g = sellPlayer(id, true); if (g) { sum += g; cnt++; } } if (cnt) { toast(`💰 ${cnt}명을 팔았어요 · 🪙 +${sum.toLocaleString()}`, 2800); sfx('goal'); } return clubTab('squad'); }
  if (t.dataset.sellno) { CL.sellSel = []; return clubTab('squad'); }
  if (CL.sell && (t.dataset.bench != null || t.dataset.slot != null)) { const id = t.dataset.bench != null ? +t.dataset.bench : c.xi[+t.dataset.slot]; if (id == null) return; const why = sellCheck(id); if (why) { toast(why, 2400); return; } const S = CL.sellSel = CL.sellSel || []; const k = S.indexOf(id); if (k >= 0) S.splice(k, 1); else S.push(id); return clubTab('squad'); }
  if (t.dataset.ctab) return clubTab(t.dataset.ctab);
  if (t.dataset.rf) { CL.rf = t.dataset.rf; return clubTab('all'); }
  if (t.id === 'bAuto') { autoXI(); clubHeader(); return clubTab('squad'); }
  if (t.dataset.cform) { c.form = t.dataset.cform; autoXI(); clubHeader(); return clubTab('squad'); }
  if (t.dataset.opp) { if (t.classList.contains('lock')) { toast(`앞 구단을 이기거나, 팀 능력치를 ${OPP.find(o => o.id === t.dataset.opp).o} 이상으로 올리면 열려요`, 2600); return; } return startClubMatch(OPP.find(o => o.id === t.dataset.opp)); }
  if (t.dataset.pn) { CL.pn = t.dataset.pn === 'max' ? 'max' : +t.dataset.pn; if (CL.pn === 'max') { CL.pn = 1; CL.pmax = 1; } else CL.pmax = 0; return clubTab('shop'); }
  if (t.dataset.pack) { const k = PACKS.find(x => x.k === t.dataset.pack); const n = packN(k); return n > 1 ? buyMany(k, n) : buyPack(k); }
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
  if (free) c.freeGold = 0; else coins(-k.p); const p = rollPack(k); const dup = !!c.own[p.id]; if (dup) coins(DUPC[p.r]); else c.own[p.id] = 1;
  const junk = (k.j || []).map(r => { let L = PDB.filter(q => q.r === r && !q.prospect); if (!L.length) L = PDB.filter(q => q.r === r); if (!L.length) L = PDB.filter(q => q.r === 'B' || q.r === 'S'); const q = pick(L); const d = !!c.own[q.id]; if (d) coins(DUPC[q.r]); else c.own[q.id] = 1; return { p: q, dup: d }; }); // 잡카드도 같이
  const tk = tixRoll(); saveClub(); clubHeader(); revealCard(p, dup, k, junk, tk);
}
// 🎫 강화권: 팩 하나 열 때마다 15% — 쓰면 재료·코인 없이 무조건 +1강
const TIX_P = .15; function tixRoll() { const c = club(); if (Math.random() < TIX_P) { c.tix = (c.tix || 0) + 1; return 1; } return 0; }
function rollOne(k) { // 팩 하나 열기 (코인은 밖에서) → {p, dup, junk}
  const c = club(); const p = rollPack(k); const dup = !!c.own[p.id]; if (dup) coins(DUPC[p.r]); else c.own[p.id] = 1;
  const junk = (k.j || []).map(r => { let L = PDB.filter(q => q.r === r && !q.prospect); if (!L.length) L = PDB.filter(q => q.r === r); if (!L.length) L = PDB.filter(q => q.r === 'B' || q.r === 'S'); const q = pick(L); const d = !!c.own[q.id]; if (d) coins(DUPC[q.r]); else c.own[q.id] = 1; return { p: q, dup: d }; });
  return { p, dup, junk, tk: tixRoll() };
}
const packN = k => { const c = club(); const fr = k.k === 'gold' && c.freeGold ? 1 : 0; return CL.pmax ? Math.max(1, Math.min(200, Math.floor((c.coins || 0) / k.p) + fr)) : (CL.pn || 1); };
const RORD = { X: 8, I: 7, T: 6, L: 5, W: 4, G: 3, S: 2, B: 1 };
function buyMany(k, n) {
  const c = club(); const free = k.k === 'gold' && c.freeGold ? 1 : 0; const cost = k.p * (n - free);
  if ((c.coins || 0) < cost) { const can = Math.floor((c.coins || 0) / k.p) + free; toast(can ? `🪙 코인이 부족해요 · 지금은 ${can}개까지 살 수 있어요` : '🪙 코인이 부족해요. 경기에서 이기면 받아요!', 2600); sfx('tick'); return; }
  if (free) c.freeGold = 0; coins(-cost); const c0 = c.coins;
  const R = []; for (let i = 0; i < n; i++) R.push(rollOne(k)); const gain = c.coins - c0;
  saveClub(); clubHeader(); revealMany(k, n, R, gain);
}
function revealMany(k, n, R, gain) {
  const ov = $('#reveal'); const best = R.slice().sort((a, b) => RORD[b.p.r] - RORD[a.p.r] || b.p.o - a.p.o)[0]; ov.hidden = false; ov.className = 'r' + best.p.r;
  ov.innerHTML = `<div class="rv"><div class="pack big" style="--pc:${k.c}"><div class="pk">${k.k === 'goat' ? '🐐' : k.k === 'sp' ? '✨' : k.k === 'wc' ? '💎' : k.k === 'gold' ? '🏆' : '⚽'}</div><b class="pkn">× ${n}</b></div></div>`; sfx('kick', 1); vibrate(30);
  setTimeout(() => { const top = RORD[best.p.r] >= 4; sfx(top ? 'goal' : 'save'); if (top) vibrate([60, 40, 120]);
    const main = R.slice().sort((a, b) => RORD[b.p.r] - RORD[a.p.r] || b.p.o - a.p.o); const nw = R.filter(x => !x.dup).length + R.reduce((a, x) => a + x.junk.filter(j => !j.dup).length, 0); const jn = R.reduce((a, x) => a + x.junk.length, 0);
    const cnt = {}; for (const x of R) cnt[x.p.r] = (cnt[x.p.r] || 0) + 1; const sum = Object.keys(cnt).sort((a, b) => RORD[b] - RORD[a]).map(r => `<span style="color:${RAR(r).c}">${RAR(r).n} ${cnt[r]}</span>`).join(' · ');
    ov.innerHTML = `<div class="rv multi"><div class="rvt" style="color:${RAR(best.p.r).c}">${k.n} ${n}개 열었어요!</div><div class="msum">${sum}</div><div class="dup">새 선수 ${nw}명 · 잡카드 ${jn}장${gain ? ` · 중복 → 🪙 +${gain.toLocaleString()}` : ''}</div>${R.some(x => x.tk) ? `<div class="tixgot">🎫 강화권 +${R.filter(x => x.tk).length}장!</div>` : ''}
      <div class="mgrid">${main.map(x => `<div class="mc${x.dup ? ' d' : ''}">${cardHTML(x.p)}${x.dup ? `<span class="jd">🪙${DUPC[x.p.r]}</span>` : '<span class="nw">NEW</span>'}</div>`).join('')}</div>
      <div class="row2" style="margin-top:12px"><button class="btn" id="rvClose">확인</button><button class="btn main" id="rvAgain">${n}개 더 🪙${(k.p * n).toLocaleString()}</button></div></div>`;
    fillPortraits(ov); $('#rvClose').onclick = () => { ov.hidden = true; if (UI.screen === 'menu') renderMenu(); else clubTab(CL.tab); }; $('#rvAgain').onclick = () => { ov.hidden = true; buyMany(k, n); };
  }, 1300);
}
function revealCard(p, dup, k, junk, tk) {
  const ov = $('#reveal'), r = RAR(p.r); ov.hidden = false; ov.className = 'r' + p.r; ov.innerHTML = `<div class="rv"><div class="pack big" style="--pc:${k.c}"><div class="pk">${k.k === 'goat' ? '🐐' : k.k === 'sp' ? '✨' : k.k === 'wc' ? '💎' : k.k === 'gold' ? '🏆' : '⚽'}</div></div></div>`;
  sfx('kick', 1); vibrate(30);
  setTimeout(() => { const big = RANK[p.r] >= 3; sfx(big ? 'goal' : 'save'); if (big) vibrate(p.r === 'X' ? [80, 40, 80, 40, 200] : [60, 40, 120]);
    ov.innerHTML = `<div class="rv"><div class="glow" style="--rc:${r.c}"></div>${bigCard(p)}<div class="rvx"><div class="rvt" style="color:${r.c}">${r.n}!</div>${dup ? `<div class="dup">이미 있는 선수 → 🪙 ${DUPC[p.r]} 코인</div>` : '<div class="dup">새 선수 획득! 스쿼드에 넣어 보세요</div>'}${tk ? '<div class="tixgot">🎫 강화권 +1장! <small>(강화 탭에서 써요 · 무조건 성공)</small></div>' : ''}<div class="row2" style="margin-top:14px"><button class="btn" id="rvClose">확인</button><button class="btn main" id="rvAgain">한 번 더 🪙${k.p.toLocaleString()}</button></div></div></div>`;
    if (junk && junk.length) { const j = document.createElement('div'); j.className = 'junk'; j.innerHTML = `<p>+ 잡카드 ${junk.length}장 <small>(팔거나 강화 재료로 써요)</small></p><div>${junk.map(x => cardHTML(x.p) + (x.dup ? `<span class="jd">중복 🪙${DUPC[x.p.r]}</span>` : '')).join('')}</div>`; ov.querySelector('.rv').appendChild(j); }
    fillPortraits(ov); $('#rvClose').onclick = () => { ov.hidden = true; if (UI.screen === 'menu') renderMenu(); else clubTab(CL.tab); }; $('#rvAgain').onclick = () => { ov.hidden = true; buyPack(k); };
  }, 1300);
}
function bigCard(p0) { const p = boost(p0, lvOf(p0.id)); const s = p.st; const sl = p.pos === 'GK' ? [['GK', s.gk], ['패스', s.pas], ['속도', s.spd]] : [['속도', s.spd], ['슈팅', s.sht], ['패스', s.pas], ['드리블', s.drb], ['수비', s.def], ['헤더', Math.round((s.def + s.sht) / 2)]]; const lau = p.r === 'W' || p.r === 'L' ? '<div class="laurel l"></div><div class="laurel r"></div>' : ''; return `<div class="pcard bcard r${p.r}">${lau}<div class="fr"></div><div class="in"><img data-por="${p.id}" alt=""><em>${p.o}</em>${lvOf(p.id) > 1 ? `<span class="lvb big l${lvOf(p.id) >= 8 ? 3 : lvOf(p.id) >= 5 ? 2 : 1}${lvOf(p.id) === 10 ? ' max' : ''}">+${lvOf(p.id)}</span>` : ''}<i>${p.pos}</i><span class="fl">${NAT[p.nat] || ''}</span><b>${esc(p.n)}</b><small>${POSN[p.pos]} · ${RAR(p.r).n}</small><div class="bs">${sl.map(([n, v]) => `<div><span>${n}</span>${v}</div>`).join('')}</div>${typeof psHTML === 'function' ? psHTML(p) : ''}</div><div class="gem"></div></div>`; }
/* ---------- 경기 ---------- */
function startClubMatch(o) {
  const c = club(); if (c.xi.filter(x => x != null).length < 11) { toast('선수 11명이 필요해요. 자동 배치를 눌러 보세요'); return; }
  const me = clubTeamObj(c, xiPlayers().map(p => p && Object.assign({}, boost(p, lvOf(p.id)), { lv: lvOf(p.id), xps: (c.xps && c.xps[p.id]) || {} })), c.form); const op = clubTeamObj({ id: o.id, n: o.n, f: o.f, c: o.c }, oppXI(o), '4-3-3');
  CL.vs = o; startGame({ T0: me, T1: op, f0: c.form, f1: '4-3-3', mode: 'club', diff: Math.max(0, (o.o < 70 ? 0 : o.o < 90 ? 1 : o.o < 110 ? 2 : 3) - (teamOvr(xiPlayers(), c.form) - o.o >= 20 ? 2 : teamOvr(xiPlayers(), c.form) - o.o >= 10 ? 1 : 0)) }); // 내 팀이 훨씬 세면 AI도 덜 빡빡하게
}
function clubReward(res, gf) { // res: 'w' 'd' 'l'
  const c = club(), o = CL.vs; if (!c || !o) return ''; const base = winCoins(o); let n = res === 'w' ? base : res === 'd' ? Math.round(base * .45) : 80; n += gf * 30; let bonus = 0; if (res === 'w' && !c.beat[o.id]) { bonus = 500 + Math.max(0, o.o - 60) * 20; c.beat[o.id] = 1; }
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
  const acc = window.BLIP && BLIP.loggedIn; const ap = $('#mAcc'); if (ap) { ap.textContent = acc ? '☁️ ' + (BLIP.me.nick || '계정') : '☁️ 로그인'; ap.classList.toggle('off', !acc); ap.title = acc ? '허브 계정에 자동 저장 중 (다른 기기에서도 이어서 해요)' : '허브에서 로그인하면 구단이 계정에 저장돼요'; }
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
/* 선물: 새로고침하면 한 번만 받아요 (구단이 없으면 만들 때 받아요) */
const GIFTS = [{ id: 'coin5000_1106', coins: 5000, msg: '🎁 운영자 선물! 🪙5,000 코인을 받았어요' }, { id: 'coin5000_limited_1107', coins: 5000, until: '2026-11-10T23:59:59+09:00', msg: '🎁 한정 선물! 🪙5,000 코인을 받았어요 (11/10까지)' }];
function giveGifts() { const c = club(); if (!c) return; SAVE.gifts = SAVE.gifts || {}; let got = 0; for (const g of GIFTS) if (!SAVE.gifts[g.id] && (!g.until || Date.now() < Date.parse(g.until))) { SAVE.gifts[g.id] = 1; c.coins = (c.coins || 0) + g.coins; got++; setTimeout(() => { toast(g.msg, 4000); sfx('goal'); }, 1200 + got * 400); } if (got) { saveClub(); if (UI.screen === 'menu') renderMenu(); } }
function onCloudLoaded() { giveGifts(); KMC = KM(); keysHelp(); if (UI.screen === 'menu') renderMenu(); else if (UI.screen === 'club') { clubHeader(); clubTab(CL.tab); } }
function menuNav(tab) { auInit(); if (!club()) return openCreate(); CL.tab = tab; openClub(); }
document.addEventListener('click', e => {
  if (UI.screen !== 'menu' || $('#menu').hidden) return; const t = e.target.closest('[data-mnav],#mClub,#mTeam,#mDaily,#mKeys,#mMute,#mOnl2,#mAcc,#mFr');
  if (t && t.id === 'mFr') { sfx('tick'); return openFriends(); } if (!t) return; sfx('tick');
  if (t.dataset.mnav) return menuNav(t.dataset.mnav);
  if (t.id === 'mClub') return menuNav('play'); if (t.id === 'mTeam') return menuNav('squad'); if (t.id === 'mOnl2') { auInit(); return openOnline(); }
  if (t.id === 'mDaily') { const c = club(); if (!c) { toast('먼저 구단을 만들어요!'); return openCreate(); } if (c.daily === today()) { toast('오늘 출석 보상은 이미 받았어요. 내일 또 와요!'); return; } c.daily = today(); coins(300); toast('🎁 출석 보상 🪙300 받았어요!', 2600); sfx('goal'); return renderMenu(); }
  if (t.id === 'mAcc') { if (window.BLIP && BLIP.loggedIn) return toast('☁️ 허브 계정에 자동 저장 중이에요. 다른 기기에서 같은 계정으로 로그인하면 그대로 이어서 해요', 4200); return toast('허브(🏠)에서 로그인하면 구단·코인·선수·키 설정이 계정에 저장돼요', 4200); }
  if (t.id === 'mKeys' && !IS_MOBILE) return openKeys();
  if (t.id === 'mKeys') return toast(IS_MOBILE ? '왼쪽 화면 끌기: 이동 · 패스 / 슛(꾹) / 스루 / 질주 버튼' : 'WASD 이동 · Shift 질주 · Q 개인기 · Space 슛 · E 패스 · F 스루패스 (꾹 = 세게) · C 카메라', 4200);
  if (t.id === 'mMute') { $('#bMute').click(); $('#mMute').textContent = SAVE.mute ? '🔇' : '🔊'; }
});

document.addEventListener('change', e => { if (e.target.id !== 'pnIn') return; const v = Math.max(1, Math.min(200, Math.floor(+e.target.value) || 1)); CL.pn = v; CL.pmax = 0; clubTab('shop'); });
