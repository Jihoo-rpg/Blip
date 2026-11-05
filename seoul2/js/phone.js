'use strict';
/* ===== 휴대폰: 연락처 · 미션 · 쇼핑 · 옷장 · 지도 · 셀카 · 설정 ===== */
const PH = { open: false, store: null };
function togglePhone() { if (PH.open) closePhone(); else openPhone(); }
function openPhone(app, opt) {
  if (!G.on || G.dead) return; PH.open = true; PH.store = opt && opt.store || null; G.paused = true; document.exitPointerLock && document.exitPointerLock();
  $('#phone').hidden = false; SFX.click(); const h = Math.floor(DAY.t), m = Math.floor((DAY.t - h) * 60); $('#phClock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  if (app) phApp(app); else phHome();
}
function closePhone() { PH.open = false; PH.store = null; $('#phone').hidden = true; if ($('#menu').hidden && $('#bigMap').hidden) G.paused = false; G.selfie = false; }
$('#phX').onclick = () => closePhone();
const APPS = [['contacts', '📞', '연락처', '#34c759'], ['missions', '🎯', '미션', '#ff9f0a'], ['shop', '🛒', '블립몰', '#0a84ff'], ['clothes', '👕', '옷장', '#bf5af2'], ['map', '🗺️', '지도', '#30b0c7'], ['selfie', '📷', '셀카', '#ff375f'], ['stats', '📊', '기록', '#5e5ce6'], ['settings', '⚙️', '설정', '#8e8e93']];
function phHome() {
  const w = G.wanted ? `<div class="phAlert">🚨 수배 ${'★'.repeat(G.wanted)} — 변호사에게 전화하면 지워 줘요</div>` : '';
  const nh = (SV.heist || 0) < HEISTS.length ? `<div class="phCard" data-a="contacts"><small>🔫 레이의 작전</small><b>${(SV.heist || 0) + 1}. ${HEISTS[SV.heist || 0].n}</b><span>레이에게 전화해서 시작해요</span></div>` : '';
  const next = nh + (SV.story < STORY.length ? `<div class="phCard" data-a="missions"><small>다음 미션</small><b>${SV.story + 1}. ${STORY[SV.story].n}</b><span>박 사장에게 전화해서 시작해요</span></div>` : `<div class="phCard"><small>스토리</small><b>👑 모두 끝냈어요!</b><span>알바로 돈을 더 벌어 봐요</span></div>`);
  $('#phScr').innerHTML = `<div class="phMoney">${won(SV.money)}</div>${w}${next}<div class="phGrid">${APPS.map(a => `<button class="phApp" data-a="${a[0]}"><i style="background:${a[3]}">${a[1]}</i><span>${a[2]}</span></button>`).join('')}</div>`;
  $$('#phScr [data-a]').forEach(b => b.onclick = () => { SFX.click(); phApp(b.dataset.a); });
}
function phPage(title, html) {
  $('#phScr').innerHTML = `<div class="phHead"><button class="phBack">‹</button><b>${title}</b></div><div class="phBody">${html}</div>`;
  $('#phScr .phBack').onclick = () => { SFX.click(); if (PH.store) closePhone(); else phHome(); };
}
function phApp(a) {
  if (a === 'map') { closePhone(); openMap(); return; }
  if (a === 'selfie') { closePhone(); if (PL.car && !PL.car.S.bike) { toast('📷 차에서 내려서 찍어요'); return; } G.selfieT = 7; PL.P.pose = 'phone'; toast('📷 찰칵! 셀카 모드 (7초)'); SFX.click(); return; }
  if (a === 'contacts') return phContacts();
  if (a === 'missions') return phMissions();
  if (a === 'shop') return phShop();
  if (a === 'clothes') return phClothes();
  if (a === 'stats') return phPage('📊 기록', `<div class="phList">${[['💰 돈', won(SV.money)], ['🎯 스토리', `${SV.story} / ${STORY.length}`], ['🚗 훔친 차', SV.stolen + '대'], ['🍗 배달', SV.deliveries + '번'], ['🚕 택시 손님', SV.fares + '명'], ['💀 쓰러뜨린 사람', (SV.kills || 0) + '명'], ['👮 체포', SV.busted + '번'], ['🏥 기절', SV.wasted + '번']].map(r => `<div class="phRow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>`);
  if (a === 'settings') {
    phPage('⚙️ 설정', `<div class="phList"><button class="phBtn" id="sSnd">${AU.on ? '🔊 소리 끄기' : '🔇 소리 켜기'}</button><button class="phBtn" id="sBgm">${BGM.on ? '🎵 배경음악 끄기' : '🎵 배경음악 켜기'}</button><button class="phBtn" id="sQ">${QUALITY.low ? '🐢 그래픽: 가볍게 (바꾸기)' : '✨ 그래픽: 좋게 (바꾸기)'}</button><button class="phBtn" id="sHelp">❓ 조작법 보기</button><button class="phBtn" id="sHub">🏠 허브로 나가기</button></div>`);
    $('#sSnd').onclick = () => { AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? .8 : 0; phApp('settings'); };
    $('#sBgm').onclick = () => { bgmToggle(); phApp('settings'); };
    $('#sQ').onclick = () => { QUALITY.low = !QUALITY.low; applyQuality(); phApp('settings'); };
    $('#sHelp').onclick = () => phPage('❓ 조작법', `<div class="keys"><b>이동</b><span>WASD · Shift 전력질주 · Space 점프</span><b>주먹</b><span>클릭 · J (쓰러진 사람 앞에서 누르면 밟기)</span><b>총</b><span>Q · 1~4 무기 바꾸기 · 우클릭 조준 · 클릭 쏘기</span><b>차</b><span>F 타기·뺏기 · W/S · A/D · Space 드리프트</span><b>기타</b><span>Tab 휴대폰 · M 지도 · C 카메라 · E 가게 · T 택시 알바</span><b>폰</b><span>조이스틱 · 화면 드래그 · 👊/🔫 버튼 (총은 자동 조준)</span></div>`);
    $('#sHub').onclick = () => { save(); location.href = '../hub/'; };
  }
}
/* ---------- 연락처 ---------- */
function phContacts() {
  const hs = SV.heist || 0; const cs = [['ray', '🕶️', '레이 (작전팀)', hs < HEISTS.length ? `다음 작전: ${HEISTS[hs].n}` : '작전 끝'], ['boss', '😎', '박 사장', SV.story < STORY.length ? `다음 일: ${STORY[SV.story].n}` : '일을 다 끝냈어요'], ['chicken', '🍗', '서울치킨', '배달 알바'], ['garage', '🔧', '정비소', '차 · 오토바이 가져다주기'], ['lawyer', '⚖️', '김 변호사', '수배 지우기'], ['gun', '🔫', '총포사', '무기 · 탄약']];
  phPage('📞 연락처', `<div class="phList">${cs.map(c => `<button class="phRow phCall" data-c="${c[0]}"><span class="phAv">${c[1]}</span><span><b>${c[2]}</b><small>${c[3]}</small></span><em>📞</em></button>`).join('')}</div>`);
  $$('#phScr [data-c]').forEach(b => b.onclick = () => { SFX.click(); call(b.dataset.c); });
}
function phTalk(who, txt, btns) { phPage('📞 ' + who, `<div class="phBubble">${txt}</div><div class="phList">${btns.map((b, i) => `<button class="phBtn ${b[2] || ''}" data-i="${i}">${b[0]}</button>`).join('')}</div>`); $$('#phScr [data-i]').forEach(e => e.onclick = () => { SFX.click(); btns[+e.dataset.i][1](); }); }
function call(c) {
  if (c === 'ray') {
    const hs = SV.heist || 0; if (hs >= HEISTS.length) return phTalk('레이', '이제 서울은 우리 거야. 푹 쉬어.', [['끊기', phContacts]]);
    if (MI) return phTalk('레이', '지금 하는 일부터 끝내.', [['끊기', phContacts]]);
    const h = HEISTS[hs]; return phTalk('레이', `<b>작전 ${hs + 1}. ${h.n}</b><br>${h.intro.replace(/\n/g, '<br>')}`, [['▶ 간다', () => { closePhone(); startHeist(); }, 'y'], ['나중에', phContacts]]);
  }
  if (c === 'boss') {
    if (SV.story >= STORY.length) return phTalk('박 사장', '수고 많았어! 넌 이제 서울의 왕이야 👑<br>심심하면 알바라도 해.', [['끊기', phContacts]]);
    if (MI) return phTalk('박 사장', '지금 하는 일부터 끝내고 연락해!', [['끊기', phContacts]]);
    const s = STORY[SV.story]; return phTalk('박 사장', `<b>${SV.story + 1}. ${s.n}</b><br>${s.intro.replace(/\n/g, '<br>')}`, [['▶ 할게요', () => { closePhone(); startStory(); }, 'y'], ['나중에', phContacts]]);
  }
  if (c === 'chicken') {
    if (MI) return phTalk('서울치킨', '지금 바쁜 거 같네요. 일 끝나고 연락 주세요!', [['끊기', phContacts]]);
    return phTalk('서울치킨', '사장님 치킨 나왔어요! 가게로 와서 받아 가세요 🍗<br>빨리 배달하면 팁을 더 드려요.', [['▶ 갈게요', () => { closePhone(); chickenCall(); }, 'y'], ['끊기', phContacts]]);
  }
  if (c === 'garage') {
    const list = [['sedan', '🚗 승용차', 5000], ['suv', '🚙 SUV', 8000], ['scooter', '🛵 배달 스쿠터', 4000], ['bike', '🏍️ 오토바이', 15000], ['sports', '🏎️ 스포츠카', 40000]];
    return phTalk('정비소', '어떤 걸 가져다줄까? 바로 근처 길가에 세워 둘게.', list.map(l => [`${l[1]} · ${won(l[2])}`, () => { if (SV.money < l[2]) { toast('💸 돈이 부족해요'); return; } if (deliverCar(l[0])) { addMoney(-l[2]); closePhone(); toast(`🔧 ${l[1]}를 근처 길가에 세워 뒀어요! (지도에 파란 점)`); } }]).concat([['끊기', phContacts]]));
  }
  if (c === 'lawyer') {
    if (!G.wanted) return phTalk('김 변호사', '지금은 깨끗하시네요. 무슨 일 생기면 연락 주세요.', [['끊기', phContacts]]);
    const cost = 15000 * G.wanted * G.wanted;
    return phTalk('김 변호사', `별 ${G.wanted}개라… 제가 처리해 드리죠.<br>수임료는 <b>${won(cost)}</b>입니다.`, [[`💼 ${won(cost)} 내고 지우기`, () => { if (SV.money < cost) { toast('💸 돈이 부족해요'); return; } if (MI && MI.noLawyer) { toast('⚖️ 이번 건은 너무 커서 처리 못 해요!'); return; } addMoney(-cost); setWanted(0); closePhone(); toast('⚖️ 수배가 사라졌어요!'); SFX.cash(); }, 'y'], ['끊기', phContacts]]);
  }
  if (c === 'gun') { const g = BUILD.shops.find(s => s.name === '총포사'); return phTalk('총포사', `블립몰에서도 살 수 있지만, 가게로 오면 <b>20% 할인</b>이야!`, [['🛒 블립몰 열기', phShop], ['📍 가게 위치 표시', () => { if (g) { G.waypoint = [g.x, g.z]; toast('📍 지도에 총포사를 표시했어요'); } closePhone(); }], ['끊기', phContacts]]); }
}
function deliverCar(type) { const p = laneNear(PL.x, PL.z, 8, 45); if (!p) { toast('근처에 세울 곳이 없어요. 큰길로 나가 봐요'); return false; } const c = makeCar(type); laneSpawn(c, p.x, p.z, p.f, 1); c.ai = null; c.v = 0; c.parked = true; placeCar(c); scene.add(c.g); CARS.push(c); G.deliv = c; return true; }
/* ---------- 미션 목록 ---------- */
function phMissions() {
  phPage('🎯 미션', `<div class="phList">${STORY.map((s, i) => `<div class="phRow ${i < SV.story ? 'done' : i === SV.story ? 'now' : 'lock'}"><span>${i < SV.story ? '✅' : i === SV.story ? '▶' : '🔒'} ${i + 1}. ${s.n}</span><small>${i === SV.story ? '박 사장에게 전화' : ''}</small></div>`).join('')}
   <div class="phSub">🔫 레이의 작전</div>${HEISTS.map((h, i) => { const hs = SV.heist || 0; return `<div class="phRow ${i < hs ? 'done' : i === hs ? 'now' : 'lock'}"><span>${i < hs ? '✅' : i === hs ? '▶' : '🔒'} ${i + 1}. ${h.n}</span><small>${i === hs ? '레이에게 전화' : ''}</small></div>`; }).join('')}
   <div class="phSub">알바</div><div class="phRow"><span>🍗 치킨 배달</span><small>서울치킨에 전화</small></div><div class="phRow"><span>🚕 택시 알바</span><small>택시 타고 T / 🚕</small></div><div class="phRow"><span>🔧 수배 지우기</span><small>정비소 · 변호사</small></div></div>
   ${SV.story < STORY.length && !MI ? '<button class="phBtn y" id="mCall">📞 박 사장에게 전화하기</button>' : ''}`);
  if ($('#mCall')) $('#mCall').onclick = () => call('boss');
}
/* ---------- 쇼핑 (블립몰 · 총포사) ---------- */
function phShop() {
  const disc = PH.store === 'gun' ? .8 : 1; const items = [];
  for (const w of WORDER.filter(w => w !== 'fist')) { const W = WEAP[w], own = SV.ammo && SV.ammo[w] != null; items.push(own ? [`🔫 ${W.n} 탄약 +${W.pack}`, Math.round(W.ap * disc), () => giveWeapon(w, W.pack, false)] : [`🔫 ${W.n} (탄약 ${W.pack} 포함)`, Math.round(W.price * disc), () => giveWeapon(w, W.pack)]); }
  items.push(['🦺 방탄조끼', Math.round(20000 * disc), () => { PL.ar = 100; }], ['🩹 구급상자 (+50 체력)', 5000, () => { PL.hp = Math.min(100, PL.hp + 50); }]);
  phPage(PH.store === 'gun' ? '🔫 총포사 (20% 할인)' : '🛒 블립몰', `<div class="phSub">돈 ${won(SV.money)} · 체력 ${Math.round(PL.hp)} · 방탄 ${Math.round(PL.ar)}</div><div class="phList">${items.map((it, i) => `<button class="phRow phBuy" data-i="${i}"><span>${it[0]}</span><b>${won(it[1])}</b></button>`).join('')}</div><p class="phNote">무기는 Q · 1~7 키 (폰: 오른쪽 위 무기 아이콘)로 바꿔요.</p>`);
  $$('#phScr [data-i]').forEach(b => b.onclick = () => { const it = items[+b.dataset.i]; if (SV.money < it[1]) { b.querySelector('b').textContent = '돈 부족'; SFX.fail(); return; } addMoney(-it[1]); it[2](); SFX.cash(); save(); phShop(); });
}
function gunShop() { openPhone(null, { store: 'gun' }); phShop(); }
/* ---------- 옷장 · 옷가게 ---------- */
const OUT = {
  top: ['#151515', '#ffffff', '#22324f', '#7a1f2b', '#d9a521', '#1f5a3a', '#e88aa8', '#ff7a1a', '#6fa8dc', '#3d2b6b', '#c9b38a', '#b0b6c2'],
  bot: ['#1b1b1d', '#3e5f8a', '#22324f', '#5c6068', '#b8a27a', '#d8d0bf', '#7a1f2b', '#2d2a26'],
  shoe: ['#f2f2f2', '#121212', '#4a2d1a', '#d61f26', '#1e64d8'],
  hair: ['#120f0d', '#4a2e1a', '#7a5534', '#c9a66b', '#8f8f8f', '#d61f26', '#2a6fdb'],
  hs: [['short', '짧은 머리'], ['side', '옆가르마'], ['long', '긴 머리'], ['buzz', '반삭']], hat: [['none', '없음'], ['cap', '캡 모자'], ['hat', '페도라']]
};
function wardrobe(store) { openPhone(null, { store: store ? 'clothes' : null }); phClothes(); }
function phClothes() {
  const store = PH.store === 'clothes'; const price = store ? 2000 : 5000; const cur = playerLook();
  const sw = (k, list) => `<div class="phSw">${list.map(c => `<button data-k="${k}" data-v="${c}" style="background:${c}" class="${cur[k] === c ? 'on' : ''}"></button>`).join('')}</div>`;
  const ch = (k, list, curV) => `<div class="phChips">${list.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${curV === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const hatV = cur.head === 'cap' ? 'cap' : cur.head === 'hat' ? 'hat' : 'none'; const hsV = cur.head === 'buzz' ? 'buzz' : cur.hairStyle || 'short';
  phPage(store ? '👕 옷가게' : '👕 옷장 (택배)', `<div class="phSub">한 번 바꿀 때 ${won(price)} · 돈 ${won(SV.money)}</div>
   <div class="phLbl">상의</div>${sw('top', OUT.top)}<div class="phLbl">바지</div>${sw('bot', OUT.bot)}<div class="phLbl">신발</div>${sw('shoe', OUT.shoe)}
   <div class="phLbl">머리 모양</div>${ch('hs', OUT.hs, hsV)}<div class="phLbl">머리 색</div>${sw('hair', OUT.hair)}
   <div class="phLbl">모자</div>${ch('hatT', OUT.hat, hatV)}${hatV === 'cap' ? sw('cap', ['#d61f26', '#111111', '#1e64d8', '#f2f2f2', '#16a34a', '#ffcc33']) : hatV === 'hat' ? sw('hat', ['#1b1b1d', '#3a3f4a', '#5a3a22', '#7a7468', '#22324f']) : ''}
   <div class="phLbl">선글라스</div>${ch('gl', [['0', '안 씀'], ['1', '씀']], cur.glasses ? '1' : '0')}`);
  G.selfie = true; selfieCam();
  $$('#phScr [data-k]').forEach(b => b.onclick = () => {
    if (b.classList.contains('on')) return; if (SV.money < price) { toast('💸 돈이 부족해요'); SFX.fail(); return; }
    const o = Object.assign({}, SV.outfit || {}); const k = b.dataset.k, v = b.dataset.v;
    if (k === 'hs') { if (v === 'buzz') o.head = 'buzz'; else { o.hairStyle = v; if (!o.head || o.head === 'buzz') o.head = 'hair'; } }
    else if (k === 'hatT') { o.head = v === 'none' ? (cur.hairStyle === 'buzz' ? 'buzz' : 'hair') : v; if (v === 'cap' && !o.cap) o.cap = '#111111'; if (v === 'hat' && !o.hat) o.hat = '#1b1b1d'; }
    else if (k === 'gl') o.glasses = v === '1'; else o[k] = v;
    SV.outfit = o; addMoney(-price); SFX.cash(); spawnPlayer(); placePlayer(.01); selfieCam(); save(); phClothes();
  });
}
function selfieCam() { const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; cam.position.set(PL.x + f[0] * 2.4 - f[1] * .6, PL.y + 1.5, PL.z + f[1] * 2.4 + f[0] * .6); cam.lookAt(PL.x, PL.y + 1.15, PL.z); ren.render(scene, cam); }

/* ---------- 미션 시작 (전화 · 표시) ---------- */
function startStory() { if (MI || SV.story >= STORY.length) return; const s = STORY[SV.story]; MI = { story: true }; for (const k in GIVERS) rmMarker(GIVERS[k].M); s.start(); }
function chickenCall() {
  const ck = BUILD.shops.find(s => s.name === '서울치킨'); if (!ck) return; MI = {}; for (const k in GIVERS) rmMarker(GIVERS[k].M); const M = mkMarker(ck.x, ck.z, '#ff9f1c'); obj('🍗 <em>서울치킨</em>에 가서 치킨을 받아요');
  MI.upd = () => { if (inMarker(M, PL.x, PL.z)) { rmMarker(M); MI.cleanup = null; chickenJob(); } }; MI.cleanup = () => rmMarker(M);
}
