'use strict';
/* ===== STA 2: 생활 앱 (블립잡 · 블립뱅크 · 내 차 · 내 회사 · 내 상태) ===== */
APPS.splice(0, 0, ['job', '💼', '블립잡', '#0a84ff'], ['bank', '🏦', '블립뱅크', '#30d158'], ['mycar', '🚗', '내 차', '#ff9f0a'], ['co', '🏢', '내 회사', '#5e5ce6'], ['me', '🧍', '내 상태', '#ff375f']);
const _phAppS3 = phApp; phApp = function (a) {
  s3Def();
  if (a === 'job') return jobApp();
  if (a === 'bank') return bankApp();
  if (a === 'co') { closePhone(); return coApp(); }
  if (a === 'mycar') { const cs = SV.myCars; phPage('🚗 내 차', `<div class="phSub">${cs.length}대 · 불러오기 ${won(20000)} (탁송비) · 대리점 🚘 블립 모터스</div><div class="phList">${cs.map((m, i) => `<button class="phRow" data-c="${i}"><span><b>${SPEC[m.type].name}</b><br><small>색 <i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${m.color}"></i> ${m.tune ? '· 엔진 Lv.' + (m.tune.eng || 0) + (m.tune.armor ? ' · 방탄' : '') : ''}</small></span><em>📍 부르기</em></button>`).join('') || '<p class="phNote">아직 차가 없어요. 블립 모터스에서 사거나, 훔친 차를 정비소에서 명의 이전해요.</p>'}</div>${DEALER_POS.M ? '<button class="phBtn y" id="toDealer">🚘 대리점 위치 표시</button>' : ''}`);
    $$('#phScr [data-c]').forEach(b => b.onclick = () => { if (SV.money < 20000) { toast('💸 탁송비가 부족해요'); return; } if (INSIDE) { toast('밖에 나가서 불러요'); return; } const c = spawnMyCar(cs[+b.dataset.c], false); if (c) { addMoney(-20000, '탁송비'); closePhone(); toast('🚗 근처 길가에 세워 뒀어요 (지도에 파란 점)'); } });
    const td = $('#toDealer'); if (td) td.onclick = () => { G.waypoint = [DEALER_POS.x, DEALER_POS.z]; closePhone(); toast('📍 블립 모터스를 지도에 표시했어요'); }; return; }
  if (a === 'me') { const r = SV.job ? jobRec(SV.job) : null; return phPage('🧍 내 상태', `<div class="phList">${[['📅 날짜', `${SV.day}일차 (${WEEK[(SV.day - 1) % 7]}요일) ${String(Math.floor(DAY.t)).padStart(2, '0')}시`], ['🍚 배고픔', Math.round(SV.need.food) + '%'], ['⚡ 피로', Math.round(SV.need.sleep) + '%'], ['❤️ 체력', Math.round(PL.hp)], ['💼 직업', SV.job ? JOBS[SV.job].n + ' · ' + JOBS[SV.job].ranks[r.rank] : '백수'], ['🏠 집', SV.homes.map(id => HOMES.find(h => h.id === id).n).join(', ')], ['🪪 면허', [SV.lic.c1 && '1종 보통', SV.lic.big && '1종 대형', SV.lic.police && '경찰 시험', SV.lic.toeic && '블립전자 입사'].filter(Boolean).join(', ') || '없음'], ['💰 현금', won(SV.money)], ['🏦 예금', won(SV.bank)], ['📝 대출', won(SV.loan)], ['🏢 회사', SV.co ? SV.co.name + ' · ' + won(coValue()) : '없음']].map(x => `<div class="phRow"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><p class="phNote">🏷️ 보라색 표시는 살 수 있는 집이에요. 집에서 자면 피로가 풀리고 저장돼요.</p>`); }
  return _phAppS3(a);
};
const _phHomeS3 = phHome; phHome = function () { _phHomeS3(); s3Def(); const top = $('#phScr .phMoney'); if (top) top.insertAdjacentHTML('afterend', `<div class="phSub" style="text-align:center">🏦 ${won(SV.bank)} · D+${SV.day} · 🍚${Math.round(SV.need.food)}% ⚡${Math.round(SV.need.sleep)}%${SV.job ? ' · ' + JOBS[SV.job].n : ''}</div>`); };
/* 경찰 근무 중 V키 자경단은 막기 */
const _startVigS3 = startVigilante; startVigilante = function () { if (JOB.on) return; return _startVigS3(); };
