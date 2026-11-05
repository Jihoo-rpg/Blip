'use strict';
/* ===== STA 2: 니트로 · 스턴트 점프 · 튜닝 정비소 ===== */
/* ---------- 니트로 ---------- */
const NOS = { fuel: 1, on: false, t: 0 };
function nosCap() { return 2.6 + (SV.nosLv || 0) * 1.3; }
S2TICK.push(dt => {
  const c = PL.car, want = !!c && !c.dead && (K.ShiftLeft || K.ShiftRight || IN.nosH) && IN.mz > 0;
  const inf = S2.nosInf > 0; NOS.on = want && (NOS.fuel > 0 || inf);
  if (NOS.on) {
    if (!inf) NOS.fuel = Math.max(0, NOS.fuel - dt / nosCap()); const mx = c.S.max * (1.4 + (SV.nosLv || 0) * .06);
    if (c.v < mx) c.v += (14 + (SV.nosLv || 0) * 3) * dt * (c.S.bike ? .8 : 1); NOS.t += dt; if (NOS.t > 2) ach('nos');
    G.fovKick = Math.min(G.fovKick || 0, -7); const f = carFwd(c), b = c.S.L / 2 + .2;
    if (Math.random() < .8) fx('fire', c.x - f[0] * b, c.y + .45, c.z - f[1] * b, { s: rand(.35, .6), life: .16, vx: -f[0] * 8, vz: -f[1] * 8, vy: 0, a: .9 });
    if (!NOS.snd && AU.ctx) { NOS.snd = 1; noiseHit(.6, 900, .35, 'bandpass'); setTimeout(() => NOS.snd = 0, 500); }
  } else { NOS.t = 0; NOS.fuel = Math.min(1, NOS.fuel + dt / (16 - (SV.nosLv || 0) * 3)); }
  const e = $('#nos'); if (e) { e.hidden = !c; if (c) { e.querySelector('b').style.width = (inf ? 100 : NOS.fuel * 100) + '%'; e.classList.toggle('on', NOS.on); } }
  const bn = $('#bNos'); if (bn) bn.hidden = !c;
});
/* ---------- 스턴트 점프대 ---------- */
const RAMPS = [];
const rampMat = new T.MeshStandardMaterial({ map: ctex(128, 128, (g, W, H) => { g.fillStyle = '#f2c200'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; for (let i = -W; i < W * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - H, H); g.lineTo(i - H, H); g.fill(); } }, [1, 2]), roughness: .6, metalness: .2 });
function makeRamp(x, z, ax, dir, id) {
  // ax: 'x'(동서로 달려요) 또는 'z', dir: +1/-1 올라가는 쪽
  const L = 8, Wd = 2.3, Hh = 1.7; const s = new T.Shape(); s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, Hh); s.lineTo(L / 2 - .4, Hh); s.closePath();
  const geo = new T.ExtrudeGeometry(s, { depth: Wd, bevelEnabled: false }); geo.translate(0, 0, -Wd / 2);
  const m = new T.Mesh(geo, rampMat); m.castShadow = m.receiveShadow = true; const yaw = ax === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  m.rotation.y = yaw; m.position.set(x, groundY(x, z) - .02, z); scene.add(m);
  const R_ = { x, z, ax, dir, L, Wd, Hh, m, id }; RAMPS.push(R_); return R_;
}
function rampLocal(R_, x, z) { const along = (R_.ax === 'x' ? x - R_.x : z - R_.z) * R_.dir, lat = R_.ax === 'x' ? z - R_.z : x - R_.x; return [along, lat]; }
function buildRamps() {
  const spots = [[-1, -3, 'x', 1], [1, -2, 'z', 1], [-2, 0, 'x', -1], [2, 1, 'z', -1], [0, 2, 'x', 1], [-3, 1, 'z', 1], [2, -1, 'x', -1], [-1, 2, 'z', -1], [1, 0, 'x', 1], [-2, -2, 'z', -1]];
  spots.forEach(([i, j, ax, dir], k) => { const x = ax === 'x' ? i * P + P / 2 : i * P, z = ax === 'x' ? j * P : j * P + P / 2; if (Math.abs(x) > LIM - 5 || Math.abs(z) > LIM - 5) return; makeRamp(x, z, ax, dir, k); });
}
const _placeCarS2 = placeCar; placeCar = function (c) { _placeCarS2(c); if (c.air) { c.y = c.airY; c.g.position.y = c.y; c.bodyG.rotation.x = c.airPitch || 0; } else if (c.rampY) { c.y = c.rampY; c.g.position.y = c.y; c.bodyG.rotation.x = -c.rampTilt; } };
const STUNT = { c: null };
S2TICK.push(dt => {
  if (!RAMPS.length && G.on) buildRamps();
  const c = PL.car;
  for (const cc of CARS) { if (cc === c || !cc.rampY) continue; cc.rampY = 0; }
  for (const cc of CARS) if (cc.air && cc !== c) { cc.vy -= 16 * dt; cc.airY += cc.vy * dt; if (cc.airY <= groundY(cc.x, cc.z)) { cc.air = false; cc.airPitch = 0; } placeCar(cc); }
  if (!c) return;
  if (c.air) {
    c.airT += dt; c.vy -= 16 * dt; c.airY += c.vy * dt; c.airPitch = clamp(-c.vy * .03, -.35, .35); const gy = groundY(c.x, c.z);
    if (c.airY <= gy) { // 착지
      const t = c.airT, d = Math.hypot(c.x - c.ax0, c.z - c.az0), hard = -c.vy; c.air = false; c.airY = 0; c.airPitch = 0; c.y = gy; S2.slow = 0;
      G.shake = Math.max(G.shake, clamp(hard / 18, .2, .9)); SFX.crash(clamp(hard / 14, .3, 1.2)); for (let i = 0; i < 6; i++) fx('dust', c.x + rand(-1.5, 1.5), gy + .2, c.z + rand(-1.5, 1.5), { s: 1.2, life: .7, vy: 1, a: .6 });
      if (hard > 12) carHurt(c, hard * .9, true);
      if (t > .7) { const pay = Math.round((1500 + d * 120 + t * 2000) / 100) * 100, R_ = c.airRamp, first = R_ && !SV.stunts.includes(R_.id);
        let msg = `비행 ${t.toFixed(1)}초 · ${Math.round(d)}m`; if (first) { SV.stunts.push(R_.id); msg += ` · 새 스턴트 ${SV.stunts.length}/${RAMPS.length}`; }
        const total = pay + (first ? 15000 : 0); addMoney(total); SFX.cash(); big(first ? '유니크 스턴트 보너스!' : '스턴트 점프!', msg + ' · +' + won(total), 'pass', 2800); xp(first ? 150 : 40, '스턴트'); ach('stunt'); if (SV.stunts.length >= 5) ach('stunt5'); save(); }
    }
    return;
  }
  // 점프대 위?
  c.rampY = 0; c.rampTilt = 0;
  for (const R_ of RAMPS) {
    if (Math.abs(c.x - R_.x) > 9 || Math.abs(c.z - R_.z) > 9) continue; const [al, lat] = rampLocal(R_, c.x, c.z); if (Math.abs(lat) > R_.Wd / 2 + .3 || al < -R_.L / 2 || al > R_.L / 2 + .2) continue;
    const f = carFwd(c), fd = (R_.ax === 'x' ? f[0] : f[1]) * R_.dir * Math.sign(c.v || 1); if (fd < .55) continue;
    const k = clamp((al + R_.L / 2) / R_.L, 0, 1); c.rampY = groundY(c.x, c.z) + k * R_.Hh; c.rampTilt = Math.atan2(R_.Hh, R_.L) * Math.sign(c.v || 1);
    if (al > R_.L / 2 - .25 && Math.abs(c.v) > 11) { // 발사!
      const sp = Math.abs(c.v); c.air = true; c.airT = 0; c.airY = c.rampY; c.vy = sp * .36 + 2; c.ax0 = c.x; c.az0 = c.z; c.airRamp = R_; c.rampY = 0; c.v *= 1.05;
      slowmo(1.4, .38); G.shake = Math.max(G.shake, .25); SFX.whoosh(); if (!SV.stunts.includes(R_.id)) popLabel(c.x, c.airY + 3, c.z, '스턴트!', '#ffcc33', 1.2);
    }
    break;
  }
});
/* ---------- 튜닝 정비소 ---------- */
const PAINTS2 = [['빨강', '#c3121f'], ['노랑', '#f2c200'], ['파랑', '#1f5ea8'], ['검정', '#111214'], ['흰색', '#f4f4f2'], ['초록', '#2e7d32'], ['보라', '#6a1b9a'], ['주황', '#ef6c00'], ['은색', '#c4c8cc'], ['핑크', '#e91e63']];
function tuneCar(c) { if (!c.tuned) { c.S = Object.assign({}, c.S); c.tuned = { eng: 0, armor: 0 }; } return c.tuned; }
function garageMenu(c) {
  G.paused = true; document.exitPointerLock && document.exitPointerLock(); const tu = c.tuned || { eng: 0, armor: 0 }; const engP = [25000, 50000, 90000][tu.eng], nosP = [30000, 60000, 120000][SV.nosLv || 0];
  const need = G.wanted > 0 || c.hp < c.maxHp * .95;
  menu(`<h2>🔧 정비소 · ${c.S.name}</h2><p>돈 ${won(SV.money)} · 차 상태 ${Math.round(c.hp / c.maxHp * 100)}% ${G.wanted ? ' · 🚨 수배 ' + '★'.repeat(G.wanted) : ''}</p>
  <div class="shopL">
  <button class="btn ${need ? 'y' : ''}" id="gFix"><span>🛠️ 수리 + 새 번호판 (수배 지우기)</span><b>${won(5000)}</b></button>
  <button class="btn" id="gEng" ${tu.eng >= 3 ? 'disabled' : ''}><span>⚙️ 엔진 튜닝 Lv.${tu.eng}→${Math.min(3, tu.eng + 1)} <small style="color:#666">(이 차)</small></span><b>${tu.eng >= 3 ? '최고' : won(engP)}</b></button>
  <button class="btn" id="gArm" ${tu.armor ? 'disabled' : ''}><span>🛡️ 방탄 차체 <small style="color:#666">(이 차 · 튼튼하게)</small></span><b>${tu.armor ? '장착됨' : won(40000)}</b></button>
  <button class="btn" id="gNos" ${(SV.nosLv || 0) >= 3 ? 'disabled' : ''}><span>🔥 니트로 키트 Lv.${SV.nosLv || 0}→${Math.min(3, (SV.nosLv || 0) + 1)} <small style="color:#666">(모든 차)</small></span><b>${(SV.nosLv || 0) >= 3 ? '최고' : won(nosP)}</b></button>
  </div><p style="font-size:13px">🎨 도색 (${won(3000)})</p><div class="row" style="gap:6px">${PAINTS2.map((p, i) => `<button class="btn" data-pc="${i}" title="${p[0]}" style="flex:0 0 38px;height:38px;padding:0;background:${p[1]};box-shadow:0 3px 0 #555"></button>`).join('')}</div>
  <button class="btn d" id="gX">나가기</button>`);
  const pay = (n, f) => { if (SV.money < n) { toast('💸 돈이 부족해요'); SFX.fail(); return; } addMoney(-n); f(); SFX.cash(); save(); garageMenu(c); };
  $('#gFix').onclick = () => pay(5000, () => { setWanted(0); c.hp = c.maxHp; c.fire = 0; toast('🔧 수리 완료! 수배도 사라졌어요'); });
  $('#gEng').onclick = () => { if (tu.eng >= 3) return; pay(engP, () => { const t = tuneCar(c); t.eng++; c.S.acc *= 1.18; c.S.max *= 1.1; toast('⚙️ 엔진이 더 세졌어요!'); }); };
  $('#gArm').onclick = () => { if (tu.armor) return; pay(40000, () => { const t = tuneCar(c); t.armor = 1; c.maxHp = Math.round(c.maxHp * 2); c.hp = c.maxHp; c.S.mass *= 1.25; toast('🛡️ 방탄 차체 장착!'); }); };
  $('#gNos').onclick = () => { if ((SV.nosLv || 0) >= 3) return; pay(nosP, () => { SV.nosLv = (SV.nosLv || 0) + 1; NOS.fuel = 1; toast('🔥 니트로가 더 오래가요! (Shift · 🔥 버튼)'); }); };
  $$('[data-pc]').forEach(b => b.onclick = () => { if (c.type === 'police' || c.type === 'taxi' || c.type === 'bus') { toast('이 차는 칠할 수 없어요'); return; } pay(3000, () => { const pm = paintMat(PAINTS2[+b.dataset.pc][1]); c.bodyG.children.forEach(o => { if (o.isMesh && o.material && o.material.clearcoat && o.material !== GLASS) o.material = pm; }); if (G.wanted) setWanted(Math.max(0, G.wanted - 1)); }); });
  $('#gX').onclick = closeMenu;
}
updateGarage = function () {
  const g = BUILD.landmarks.garage; if (!g) return; const c = PL.car; const inside = c && c.x > g.x0 && c.x < g.x1 && c.z > g.z0 && c.z < g.z1;
  if (inside && MI && MI.noGarage) { if (!G.inGarage) { G.inGarage = true; toast('🔧 경찰이 정비소를 지키고 있어요! 오늘은 안 돼요'); } return; }
  if (inside && !G.inGarage && Math.abs(c.v) < 9) { G.inGarage = true; c.v = 0; garageMenu(c); }
  else if (!inside) G.inGarage = false;
};
