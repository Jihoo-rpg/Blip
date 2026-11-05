'use strict';
/* ===== STA 2: 새 무기 (돌격소총 · 수류탄 · 로켓포) · 폭발 ===== */
WEAP.rifle = { n: '돌격소총', ic: '🔫', dmg: 34, rate: .1, spread: .014, range: 85, price: 220000, ap: 9000, pack: 90, auto: 1 };
WEAP.grenade = { n: '수류탄', ic: '💣', thrown: 1, rate: .9, price: 60000, ap: 15000, pack: 5, auto: 0 };
WEAP.rpg = { n: '로켓포', ic: '🚀', proj: 1, rate: 1.4, price: 400000, ap: 45000, pack: 4, auto: 0 };
WORDER.push('rifle', 'grenade', 'rpg');
const _gunModelS2 = gunModel; gunModel = function (w) {
  if (w === 'rifle') { const g = new T.Group(); const bx = (x, y, z, sx, sy, sz, m) => { const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m || GUNM); b.position.set(x, y, z); g.add(b); }; bx(0, .02, .16, .045, .06, .5); bx(0, .02, .48, .02, .02, .2); bx(0, -.07, .12, .035, .13, .05); bx(0, -.05, -.02, .032, .1, .05); bx(0, .01, -.2, .05, .08, .24, GUNW); bx(0, .07, .12, .02, .03, .12); return g; }
  if (w === 'grenade') { const g = new T.Group(); const m = new T.Mesh(new T.SphereGeometry(.06, 10, 8), new T.MeshStandardMaterial({ color: lin('#3c4a2a'), roughness: .6 })); m.scale.z = 1.25; g.add(m); return g; }
  if (w === 'rpg') { const g = new T.Group(); const tube = new T.Mesh(new T.CylinderGeometry(.06, .06, 1.1, 10), new T.MeshStandardMaterial({ color: lin('#3d4a2c'), roughness: .6 })); tube.rotation.x = Math.PI / 2; tube.position.z = .2; g.add(tube); const war = new T.Mesh(new T.ConeGeometry(.09, .28, 10), GUNM); war.rotation.x = Math.PI / 2; war.position.z = .85; g.add(war); const gr = new T.Mesh(new T.BoxGeometry(.03, .12, .05), GUNM); gr.position.set(0, -.09, .1); g.add(gr); return g; }
  return _gunModelS2(w);
};
const _sfxGunS2 = SFX.gun; SFX.gun = function (w, v) { if (w === 'rifle') { v = v == null ? 1 : v; noiseHit(.11, 2600, .6 * v, 'bandpass'); tone(120, .08, .35 * v, 'square', 50); return; } return _sfxGunS2(w, v); };
/* ---------- 폭발 ---------- */
function boomAt(x, y, z, r, dmg, by) {
  SFX.boom(); const d0 = Math.hypot(x - PL.x, z - PL.z); G.shake = Math.max(G.shake, clamp(1 - d0 / 45, 0, .9));
  for (let i = 0; i < 16; i++) fx(i % 3 ? 'fire' : 'smoke', x + rand(-r, r) * .4, y + .5, z + rand(-r, r) * .4, { s: rand(1.4, 2.8), life: rand(.5, 1.3), vy: rand(1, 5), vx: rand(-3, 3), vz: rand(-3, 3), a: .9 });
  FLASH.position.set(x, y + 1, z); FLASH.intensity = 8;
  for (const n of NPCS.slice()) { const d = Math.hypot(n.x - x, n.z - z); if (d > r) continue; const k = 1 - d / r, ux = (n.x - x) / (d || 1), uz = (n.z - z) / (d || 1); npcDamage(n, dmg * (.4 + k), ux, uz, by, 'boom'); if (NPCS.includes(n)) knockNPC(n, n.dead ? 1e9 : Math.max(n.ko, 1.4), ux * 9 * k, uz * 9 * k); }
  for (const c of CARS) { if (c.dead) continue; const d = Math.hypot(c.x - x, c.z - z); if (d > r + 1.5) continue; if (by === 'player') c.byPlayer = true; if (d < r * .55) { c.hp = 0; carHurt(c, 60, c === PL.car); if (!c.fire) c.fire = .4; else c.fire = Math.min(c.fire, .4); } else carHurt(c, 40 * (1 - d / (r + 1.5)) + 10, c === PL.car); if (c.ai) c.ai.stun = 2; }
  if (!PL.car && !G.dead && d0 < r) { hurtPlayer(dmg * .5 * (1 - d0 / r) + 8); knockPlayer(1.2, (PL.x - x) / (d0 || 1) * 7, (PL.z - z) / (d0 || 1) * 7); }
  if (HELI.h && !HELI.h.fall) { const hp = HELI.h.g.position; if (hp.distanceTo(new T.Vector3(x, y, z)) < r + 3) heliHurt(400); }
  for (const n of NPCS) if (!n.cop && !n.dead && Math.hypot(n.x - x, n.z - z) < 40) npcFlee(n, x, z, 8);
  if (by === 'player') { crime('boom', x, z); panic(x, z, 55); }
}
/* ---------- 던지기 · 로켓 ---------- */
const PROJ = [];
const grenM = new T.MeshStandardMaterial({ color: lin('#3c4a2a'), roughness: .6 }), rocketM = new T.MeshStandardMaterial({ color: lin('#c8c0a8'), roughness: .5 });
const _fireS2 = playerFire; playerFire = function () {
  const id = curWid(), w = WEAP[id]; if (!w || (!w.thrown && !w.proj)) return _fireS2();
  if (PL.fireCD > 0 || PL.car) return;
  if (!SV.ammo[id]) { if (!PL.emptyT || G.t - PL.emptyT > .6) { PL.emptyT = G.t; SFX.click(); toast('탄약이 없어요! 📱 블립몰이나 🔫 총포사에서 사요'); } return; }
  PL.fireCD = w.rate; SV.ammo[id]--; PL.aimT = 1.4; hudWeapon();
  const d = new T.Vector3(); cam.getWorldDirection(d); let tg = autoTarget(cam.position, d, IS_MOBILE ? .45 : .09, 70);
  if (w.proj) { let bc = null, bs = 1e9; for (const c of CARS) { if (c.dead || c === PL.car) continue; const dx = c.x - PL.x, dz = c.z - PL.z, dist = Math.hypot(dx, dz); if (dist > 75 || dist < 3) continue; const ang = Math.acos(clamp((dx * d.x + dz * d.z) / (dist * (Math.hypot(d.x, d.z) || 1)), -1, 1)); if (ang > (IS_MOBILE ? .4 : .12)) continue; const sc = ang * 40 + dist * .1 + (c.type === 'police' || c.chase ? -3 : 0); if (sc < bs) { bs = sc; bc = c; } } if (bc && (!tg || bs < 4)) tg = { pos: new T.Vector3(bc.x, bc.y + .8, bc.z) }; }
  if (tg) d.copy(tg.pos).sub(new T.Vector3(PL.x, PL.y + 1.5, PL.z)).normalize(); else if (w.proj) { d.y = Math.max(d.y + .12, -.02); d.normalize(); }
  PL.yaw = Math.atan2(d.x, d.z); PL.P.root.rotation.y = PL.yaw;
  const o = new T.Vector3(PL.x + Math.sin(PL.yaw) * .5, PL.y + 1.55, PL.z + Math.cos(PL.yaw) * .5);
  if (w.thrown) {
    const dist = tg ? Math.min(28, Math.hypot(tg.pos.x - PL.x, tg.pos.z - PL.z)) : 18; const fl = 1.05; const vh = dist / fl; const m = new T.Mesh(new T.SphereGeometry(.09, 10, 8), grenM); m.position.copy(o); scene.add(m);
    PROJ.push({ k: 'g', m, v: new T.Vector3(Math.sin(PL.yaw) * vh, 5.2 + Math.max(0, d.y) * 6, Math.cos(PL.yaw) * vh), t: 1.9 }); PL.P.aimDir = d.clone(); PL.P.pose = 'aim'; SFX.whoosh();
  } else {
    const g = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(.06, .06, .6, 8), rocketM); body.rotation.x = Math.PI / 2; g.add(body); const tip = new T.Mesh(new T.ConeGeometry(.07, .2, 8), GUNM); tip.rotation.x = Math.PI / 2; tip.position.z = .4; g.add(tip);
    g.position.copy(o); g.lookAt(o.clone().add(d)); scene.add(g); PROJ.push({ k: 'r', m: g, v: d.clone().multiplyScalar(48), t: 3 }); PL.P.aimDir = d.clone(); PL.P.pose = 'aim';
    noiseHit(.6, 700, .8); tone(90, .3, .5, 'sawtooth', 40); G.shake = Math.max(G.shake, .35); fx('smoke', o.x, o.y, o.z, { s: 1.4, life: .6, vy: .5, a: .6 });
  }
  if (G.t - (PL.shootCrime || -9) > 1) { PL.shootCrime = G.t; crime('shoot', PL.x, PL.z); panic(PL.x, PL.z, 45); }
};
S2TICK.push(dt => {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i], m = p.m; p.t -= dt; let boom = p.t <= 0;
    if (p.k === 'g') { p.v.y -= 15 * dt; const np = m.position.clone().addScaledVector(p.v, dt); const gy = groundY(np.x, np.z); if (np.y < gy + .09) { np.y = gy + .09; p.v.y = Math.abs(p.v.y) * .35; p.v.x *= .6; p.v.z *= .6; if (Math.abs(p.v.y) > 1) SFX.step(); } const q = { x: np.x, z: np.z }; collideCircle(q, .1, np.y); if (q.x !== np.x || q.z !== np.z) { p.v.x *= -.4; p.v.z *= -.4; } np.x = q.x; np.z = q.z; m.position.copy(np); m.rotation.x += dt * 9; }
    else { const np = m.position.clone().addScaledVector(p.v, dt); if (Math.random() < .9) fx('smoke', m.position.x, m.position.y, m.position.z, { s: .55, life: .7, vy: .3, a: .55 }); const k = rayBlock(m.position.x, m.position.y, m.position.z, np.x, np.y, np.z); if (k < 1 || np.y <= groundY(np.x, np.z) + .05) boom = true;
      for (const n of NPCS) if (!n.dead && Math.abs(n.x - np.x) < 1 && Math.abs(n.z - np.z) < 1 && np.y < n.y + 2) boom = true;
      for (const c of CARS) if (!c.dead && Math.abs(c.x - np.x) < c.S.L / 2 && Math.abs(c.z - np.z) < c.S.L / 2 && np.y < c.y + 2.2) boom = true;
      if (HELI.h && HELI.h.g.position.distanceTo(np) < 3.5) boom = true; m.position.copy(np); }
    if (boom) { const r = p.k === 'g' ? 7 : 8; boomAt(m.position.x, m.position.y, m.position.z, r, 190, 'player'); scene.remove(m); PROJ.splice(i, 1); }
  }
});
/* 1~7 숫자 키로 무기 고르기 */
addEventListener('keydown', e => { const dg = /^Digit([5-7])$/.exec(e.code); if (dg && G.on && !G.paused) IN.wsel = WORDER[+dg[1] - 1]; });
/* ---------- 날아차기 (달리다 점프하고 펀치) ---------- */
S2TICK.push(dt => {
  if (!IN.punch || PL.car || G.dead || PL.ko > 0 || curWid() !== 'fist') return; const gy = groundY(PL.x, PL.z); if (PL.y < gy + .35) return;
  const f = [Math.sin(PL.yaw), Math.cos(PL.yaw)]; let best = null, bd = 2.6;
  for (const n of NPCS) { if (n.dead || n.ko > 0) continue; const dx = n.x - PL.x, dz = n.z - PL.z, d = Math.hypot(dx, dz); if (d < bd && (dx * f[0] + dz * f[1]) / (d || 1) > .3) { best = n; bd = d; } }
  PL.punchT = 0; PL.P.pose = null; PL.vy = Math.max(PL.vy, 2); PL.spd = Math.max(PL.spd, 7);
  if (!best) return; npcDamage(best, 70, f[0], f[1], 'player', 'punch'); if (NPCS.includes(best)) knockNPC(best, best.dead ? 1e9 : Math.max(best.ko, 2), f[0] * 11, f[1] * 11);
  SFX.punchHeavy(true); G.hitStop = .14; G.shake = Math.max(G.shake, .5); slowmo(.5, .3); popLabel(best.x, best.y + 2.2, best.z, '날아차기!', '#ffcc33', 1.3); xp(5);
  fx('flash', best.x, best.y + 1.3, best.z, { s: 1, life: .1, vy: 0, a: .9, g: .4 });
});
const _boomS2 = boomAt; boomAt = function (x, y, z, r, dmg, by) { _boomS2(x, y, z, r, dmg, by); if (Math.hypot(x - PL.x, z - PL.z) < 35) slowmo(.45, .35); };
