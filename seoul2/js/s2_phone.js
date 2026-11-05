'use strict';
/* ===== STA 2: 휴대폰 새 앱 (활동 · 부동산 · 업적 · 치트) · 새 연락처 ===== */
APPS.splice(2, 0, ['acts', '🎮', '활동', '#ff453a'], ['props', '🏢', '부동산', '#32d74b']);
APPS.push(['ach', '🏆', '업적', '#ffd60a'], ['cheat', '🕹️', '치트', '#636366']);
const _phAppS2 = phApp; phApp = function (a) {
  if (a === 'acts') return phActs();
  if (a === 'props') return phProps();
  if (a === 'ach') { s2Def(); const ks = Object.keys(ACH); return phPage('🏆 업적 ' + SV.ach.length + '/' + ks.length, `<div class="phSub">Lv.${SV.lvl} ${rankOf(SV.lvl)} · 다음 레벨까지 ${needXp(SV.lvl) - SV.xp} XP</div><div class="phList">${ks.map(k => `<div class="phRow ${SV.ach.includes(k) ? '' : 'lock'}"><span>${SV.ach.includes(k) ? '' : '🔒 '}${ACH[k][0]}</span><small>${won(ACH[k][1])}</small></div>`).join('')}</div>`); }
  if (a === 'cheat') { phPage('🕹️ 치트', `<div class="phBubble">PC에서는 게임 중에 <b>키보드로 그냥 치면</b> 돼요 (예: HESOYAM).<br>폰에서는 여기에 입력해요.</div><input id="chIn" style="padding:12px;border-radius:12px;border:0;font:700 18px var(--ui);text-transform:uppercase" placeholder="치트 코드" autocomplete="off"><button class="phBtn y" id="chGo">입력</button><div class="phNote">힌트: HESOYAM · LEAVEMEALONE · VROOM · ROCKETMAN · BOOMBOOM · SLOWMO · MOONJUMP · RAINY · SPEEDFREAK · LXGIWYL … 더 있어요!</div>`); $('#chGo').onclick = () => { if (cheat($('#chIn').value)) { closePhone(); } else { $('#chIn').value = ''; $('#chIn').placeholder = '❌ 없는 코드예요'; SFX.fail(); } }; return; }
  if (a === 'stats') { s2Def(); return phPage('📊 기록', `<div class="phList">${[['⭐ 레벨', 'Lv.' + SV.lvl + ' ' + rankOf(SV.lvl)], ['💰 돈', won(SV.money)], ['🎯 스토리', `${SV.story} / ${STORY.length}`], ['🔫 작전', `${SV.heist || 0} / ${HEISTS.length}`], ['🏁 레이스 우승', RACES.filter(r => SV.races[r.id] === 1).length + ' / ' + RACES.length], ['🛫 스턴트', SV.stunts.length + ' / ' + RAMPS.length], ['📦 숨은 꾸러미', SV.pk.length + ' / 30'], ['💀 광란', SV.rampage.length + ' / ' + RAMPAGES.length], ['🚨 자경단 최고', SV.vigil + '단계'], ['🚢 수출', SV.exports + '대'], ['🎯 청부', SV.hits + '건'], ['🚗 훔친 차', SV.stolen + '대'], ['💀 쓰러뜨린 사람', (SV.kills || 0) + '명'], ['👮 체포', SV.busted + '번'], ['🏥 기절', SV.wasted + '번']].map(r => `<div class="phRow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>`); }
  return _phAppS2(a);
};
function phActs() {
  s2Def(); const ex = exportList();
  const row = (ic, t, s, act) => `<button class="phRow" data-go="${act || ''}"><span>${ic} <b>${t}</b><br><small>${s}</small></span><em>${act ? '📍' : ''}</em></button>`;
  phPage('🎮 활동', `<div class="phSub">지도에서 아이콘을 찾아가거나, 📍를 눌러 길 안내를 받아요.</div><div class="phList">
  ${RACES.map((R_, i) => row('🏁', R_.n, `상금 ${won(R_.prize)} · ${SV.races[R_.id] ? '최고 ' + SV.races[R_.id] + '등' : '도전 전'}`, 'race' + i)).join('')}
  ${RAMPAGES.map((Rp, i) => row('💀', Rp.n, Rp.txt + (SV.rampage.includes(Rp.id) ? ' · ✅' : ''), 'skull' + i)).join('')}
  ${row('🚨', '자경단', '경찰차를 타고 V 키 (🚨 버튼) · 최고 ' + SV.vigil + '단계')}
  ${row('🎯', '청부 의뢰', '의뢰인 K에게 전화해요 · ' + SV.hits + '건 완료', 'hit')}
  ${row('🚢', '오늘의 수출 주문', ex.map(t => (SV.expDay.done.includes(t) ? '✅' : '') + SPEC[t].name + ' ' + won(EXPAY[t])).join(' · '), 'export')}
  ${row('🛫', '스턴트 점프', `노란 점프대를 빠르게 달려 올라가요 · ${SV.stunts.length}/${RAMPS.length}`)}
  ${row('📦', '숨은 꾸러미', `초록 상자 ${SV.pk.length}/30 · 10개마다 무기 보상`)}
  ${row('🔧', '튜닝 정비소', '엔진 · 니트로 · 방탄 · 도색 — 차를 타고 정비소로', 'garage')}
  </div>`);
  $$('#phScr [data-go]').forEach(b => b.onclick = () => { const g = b.dataset.go; if (!g) return; SFX.click(); let p = null;
    if (g.startsWith('race')) { const s = raceStart(RACES[+g.slice(4)]); p = [s.x, s.z]; } else if (g.startsWith('skull')) { const m = ACT.marks.filter(m => m.kind === 'skull')[+g.slice(5)]; p = m && [m.x, m.z]; } else if (g === 'export') p = [EXPORT.x, EXPORT.z]; else if (g === 'garage') { const q = BUILD.landmarks.garage; p = [q.x, q.z]; } else if (g === 'hit') return call('k');
    if (p) { G.waypoint = p; toast('📍 지도에 보라색 점으로 표시했어요'); closePhone(); } });
}
function phProps() {
  s2Def(); const inc = propIncome();
  phPage('🏢 부동산', `<div class="phSub">돈 ${won(SV.money)} · 1시간(게임 시간)마다 수익 <b>${won(inc)}</b></div><div class="phList">${PROPS.map(p => `<button class="phRow phBuy ${SV.props[p[0]] ? 'done' : ''}" data-p="${p[0]}"><span>${p[1]}<br><small>1시간마다 ${won(p[3])}</small></span><b>${SV.props[p[0]] ? '보유 중' : won(p[2])}</b></button>`).join('')}</div><p class="phNote">사업체를 사면 게임 시간 1시간(약 45초)마다 자동으로 돈이 들어와요.</p>`);
  $$('#phScr [data-p]').forEach(b => b.onclick = () => { if (buyProp(b.dataset.p)) phProps(); });
}
const _phContactsS2 = phContacts; phContacts = function () { _phContactsS2(); const l = $('#phScr .phList'); if (!l) return; const b = document.createElement('button'); b.className = 'phRow phCall'; b.innerHTML = `<span class="phAv">🎩</span><span><b>의뢰인 K</b><small>청부 의뢰 · ${SV.hits}건 완료</small></span><em>📞</em>`; b.onclick = () => { SFX.click(); call('k'); }; l.prepend(b); };
const _callS2 = call; call = function (c) {
  if (c === 'k') { if (MI) return phTalk('의뢰인 K', '…바쁜가 보군. 끝나면 다시 연락해.', [['끊기', phContacts]]); const lv = SV.hits + 1; return phTalk('의뢰인 K', `조용히 처리할 일이 있어.<br><b>의뢰 #${lv}</b> · 보수 <b>${won(30000 + lv * 15000)}</b><br>목표 주변에 경호원이 있으니 무기를 챙겨.`, [['▶ 맡겠다', () => { closePhone(); startContract(); }, 'y'], ['끊기', phContacts]]); }
  return _callS2(c);
};
/* ---------- 폰 버튼 (니트로 · 자경단) ---------- */
{ const b = $('#bNos'); b.addEventListener('pointerdown', e => { e.preventDefault(); auInit(); IN.nosH = true; b.classList.add('on'); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { IN.nosH = false; b.classList.remove('on'); }); $('#bVig').onclick = () => startVigilante(); }
S2TICK.push(() => { const v = $('#bVig'); if (v) v.hidden = !(PL.car && PL.car.type === 'police' && !MI); });
