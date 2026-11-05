'use strict';
/* ===== 총 · 사격 · 경찰 헬기 · 바리케이드 · 떠오르는 글씨 ===== */
const WEAP = {
  fist: { n: '주먹', ic: '👊' },
  pistol: { n: '권총', ic: '🔫', dmg: 45, rate: .3, spread: .008, range: 70, price: 30000, ap: 3000, pack: 24, auto: 0 },
  smg: { n: '기관단총', ic: '🔫', dmg: 24, rate: .085, spread: .026, range: 55, price: 120000, ap: 6000, pack: 60, auto: 1 },
  shotgun: { n: '산탄총', ic: '🔫', dmg: 17, pellets: 8, rate: .85, spread: .065, range: 28, price: 90000, ap: 5000, pack: 16, auto: 0 }
};
const WORDER = ['fist', 'pistol', 'smg', 'shotgun'];
function ownedW() { return WORDER.filter(w => w === 'fist' || (SV.ammo && SV.ammo[w] != null)); }
function curWid() { return SV.wep && (SV.wep === 'fist' || (SV.ammo && SV.ammo[SV.wep] != null)) ? SV.wep : 'fist'; }
function switchWeapon(dir) { const own = ownedW(); let i = own.indexOf(curWid()); i = ((i + dir) % own.length + own.length) % own.length; SV.wep = own[i]; refreshGun(); SFX.click(); }
function selectWeapon(w) { if (ownedW().includes(w)) { SV.wep = w; refreshGun(); SFX.click(); } }
function giveWeapon(w, ammo, equip) { SV.ammo = SV.ammo || {}; SV.ammo[w] = (SV.ammo[w] || 0) + ammo; if (equip !== false) SV.wep = w; refreshGun(); save(); }

/* ---------- 총 모델 ---------- */
const GUNM = new T.MeshStandardMaterial({ color: lin('#1a1c20'), metalness: .7, roughness: .35 }), GUNW = new T.MeshStandardMaterial({ color: lin('#4a3324'), roughness: .7 });
function gunModel(w) {
  const g = new T.Group(); const bx = (x, y, z, sx, sy, sz, m) => { const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m || GUNM); b.position.set(x, y, z); b.castShadow = true; g.add(b); };
  if (w === 'pistol') { bx(0, .02, .05, .035, .045, .19); bx(0, -.045, -.01, .032, .1, .05); }
  else if (w === 'smg') { bx(0, .02, .08, .045, .07, .32); bx(0, -.06, .06, .035, .12, .04); bx(0, -.05, -.03, .032, .1, .05); bx(0, .03, -.15, .03, .05, .16); }
  else if (w === 'shotgun') { bx(0, .02, .2, .04, .04, .6); bx(0, -.01, .12, .05, .05, .22, GUNW); bx(0, -.03, -.16, .045, .09, .28, GUNW); }
  return g;
}
function refreshGun() {
  const w = curWid(); if (PL.gunW === w) { hudWeapon(); return; } if (PL.gun) { scene.remove(PL.gun); PL.gun = null; } PL.gunW = w; if (w !== 'fist') { PL.gun = gunModel(w); scene.add(PL.gun); } hudWeapon();
}
function placeGun(P, mesh, dir, aiming) {
  if (!mesh) return; const h = P.B.RightHand; if (!h) return; h.getWorldPosition(mesh.position);
  let d = dir; if (!aiming) { const y = P.root.rotation.y; d = new T.Vector3(Math.sin(y) * .6, -.8, Math.cos(y) * .6).normalize(); }
  mesh.position.addScaledVector(d, .04); mesh.position.y += aiming ? .02 : 0; mesh.lookAt(mesh.position.clone().add(d)); mesh.visible = P.root.visible;
}
function hudWeapon() { const w = curWid(), W = WEAP[w]; const a = w === 'fist' ? '' : ` <small>${SV.ammo[w]}</small>`; $('#weap').innerHTML = `<i>${W.ic}</i>${W.n}${a}`; $('#cross').style.opacity = w !== 'fist' && !PL.car && !IS_MOBILE ? .9 : 0; if (IS_MOBILE) $('#bAct').innerHTML = PL.car ? '📯<small>경적</small>' : w === 'fist' ? '👊<small>펀치</small>' : '🔫<small>쏘기</small>'; }

/* ---------- 떠오르는 글씨 ---------- */
const _lblTex = {};
function popLabel(x, y, z, txt, col, life) {
  const k = txt + col; const tex = _lblTex[k] || (_lblTex[k] = ctex(256, 64, (g, W, H) => { g.font = `40px ${DFONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(txt, W / 2, H / 2 + 2); g.fillStyle = col; g.fillText(txt, W / 2, H / 2 + 2); }));
  const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); s.scale.set(1.6, .4, 1); s.position.set(x, y, z); s.renderOrder = 20; scene.add(s);
  FX.list.push({ s, t: 0, life: life || 1.6, vx: 0, vy: .5, vz: 0, grow: 0, a: 1, sz: 1, lbl: 1 });
}

/* ---------- 총알 판정 ---------- */
const _o = new T.Vector3(), _d = new T.Vector3();
function rayCyl(o, d, cx, cz, y0, y1, r) {
  const ox = o.x - cx, oz = o.z - cz, a = d.x * d.x + d.z * d.z; if (a < 1e-8) return null; const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r; const disc = b * b - 4 * a * c; if (disc < 0) return null;
  const sq = Math.sqrt(disc); for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) { if (t < 0) continue; const y = o.y + d.y * t; if (y >= y0 && y <= y1) return t; } return null;
}
function raySph(o, d, cx, cy, cz, r) { const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz; const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r; const disc = b * b - c; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : null; }
function rayCar(o, d, c) {
  const f = carFwd(c); const rx = o.x - c.x, rz = o.z - c.z; const lo = [rx * f[1] - rz * f[0], o.y - c.y, rx * f[0] + rz * f[1]], ld = [d.x * f[1] - d.z * f[0], d.y, d.x * f[0] + d.z * f[1]];
  const hi = c.type === 'bike' || c.type === 'scooter' ? 1.3 : c.type === 'bus' ? 3.2 : 1.5; const mn = [-c.S.W / 2, .25, -c.S.L / 2], mx = [c.S.W / 2, hi, c.S.L / 2]; let t0 = 0, t1 = 1e9;
  for (let i = 0; i < 3; i++) { if (Math.abs(ld[i]) < 1e-8) { if (lo[i] < mn[i] || lo[i] > mx[i]) return null; continue; } let a = (mn[i] - lo[i]) / ld[i], b = (mx[i] - lo[i]) / ld[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; } return t0;
}
/* 총알 하나: 가장 먼저 맞는 것 */
function castShot(o, d, range, from) {
  let best = { t: range * rayBlock(o.x, o.y, o.z, o.x + d.x * range, o.y + d.y * range, o.z + d.z * range), kind: 'wall' };
  if (o.y + d.y * best.t <= .05 && d.y < 0) best = { t: Math.min(best.t, (o.y - .02) / -d.y), kind: 'ground' };
  for (const n of NPCS) { if (n === from) continue; let t; if (n.ko > 0 || n.dead) { t = raySph(o, d, n.x, n.y + .2, n.z, .5); } else t = rayCyl(o, d, n.x, n.z, n.y, n.y + 1.78 * (n.look && n.look.s || 1), .36); if (t != null && t < best.t) best = { t, kind: 'npc', n }; }
  if (from !== 'player' && !PL.car && !G.dead) { const t = rayCyl(o, d, PL.x, PL.z, PL.y, PL.y + 1.8, .38); if (t != null && t < best.t) best = { t, kind: 'player' }; }
  for (const c of CARS) { if (c.dead && c.g.visible === false) continue; if (from === 'player' && c === PL.car) continue; if (Math.abs(c.x - o.x) > range + 6 || Math.abs(c.z - o.z) > range + 6) continue; const t = rayCar(o, d, c); if (t != null && t < best.t) best = { t, kind: 'car', c }; }
  if (HELI.h && from === 'player') { const h = HELI.h; const t = raySph(o, d, h.g.position.x, h.g.position.y, h.g.position.z, 3); if (t != null && t < best.t) best = { t, kind: 'heli' }; }
  best.p = o.clone().addScaledVector(d, best.t); return best;
}
/* ---------- 총소리 · 총구 불꽃 · 총알 선 ---------- */
const FLASH = new T.PointLight('#ffcf80', 0, 9); scene.add(FLASH);
const TRACERS = [];
function tracer(a, b) { const g = new T.BufferGeometry().setFromPoints([a, b]); const l = new T.Line(g, new T.LineBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: .9 })); scene.add(l); TRACERS.push({ l, t: .07 }); }
function shotFx(muzzle, hit, w, vol) {
  fx('flash', muzzle.x, muzzle.y, muzzle.z, { s: .45, life: .06, vy: 0, a: 1, g: .3 }); FLASH.position.copy(muzzle); FLASH.intensity = 3;
  tracer(muzzle, hit.p); if (hit.kind === 'wall' || hit.kind === 'ground' || hit.kind === 'car') fx(hit.kind === 'car' ? 'spark' : 'dust', hit.p.x, hit.p.y, hit.p.z, { s: .25, life: .3, vy: .6, a: .9 });
  SFX.gun(w, vol);
}
function updateShots(dt) { FLASH.intensity = Math.max(0, FLASH.intensity - dt * 40); for (let i = TRACERS.length - 1; i >= 0; i--) { const t = TRACERS[i]; t.t -= dt; if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); t.l.material.dispose(); TRACERS.splice(i, 1); } } }
function muzzleOf(P, mesh, dir) { const p = mesh ? mesh.position.clone() : P.root.position.clone().add(new T.Vector3(0, 1.4, 0)); return p.addScaledVector(dir, .3); }

/* ---------- 플레이어 사격 ---------- */
function autoTarget(o, d, cone, range) {
  let best = null, bs = -1e9; const dl = Math.hypot(d.x, d.z) || 1;
  const ox = IS_MOBILE ? PL.x : o.x, oz = IS_MOBILE ? PL.z : o.z;
  for (const n of NPCS) { if (n.dead || n.mission === 'giver') continue; const dx = n.x - ox, dz = n.z - oz, dist = Math.hypot(dx, dz); if (dist > range + 6 || dist < .5) continue;
    const ang = Math.acos(clamp((dx * d.x + dz * d.z) / (dist * dl), -1, 1)); if (ang > cone) continue; if (rayBlock(PL.x, 1.4, PL.z, n.x, 1.2, n.z) < .98) continue;
    const hostile = (n.cop && G.wanted) || n.st === 'fight' || n.st === 'shoot' || n.thug; const sc = -ang * 3 - dist * .02 + (hostile ? 1.5 : 0) - (n.ko > 0 ? 2 : 0); if (sc > bs) { bs = sc; best = n; } }
  if (HELI.h) { const h = HELI.h.g.position; const dx = h.x - PL.x, dz = h.z - PL.z; const dist = Math.hypot(dx, dz); const ang = Math.acos(clamp((dx * d.x + dz * d.z) / ((dist || 1) * dl), -1, 1)); if (ang < cone && (!best || bs < 0)) return { pos: h.clone(), heli: 1 }; }
  return best ? { n: best, pos: new T.Vector3(best.x, best.y + (best.ko > 0 ? .25 : 1.25), best.z) } : null;
}
function playerFire() {
  const id = curWid(), w = WEAP[id]; if (id === 'fist' || PL.fireCD > 0 || PL.car) return;
  if (!SV.ammo[id]) { if (!PL.emptyT || G.t - PL.emptyT > .6) { PL.emptyT = G.t; SFX.click(); toast('탄약이 없어요! 📱 휴대폰 쇼핑이나 🔫 총포사에서 사요'); } return; }
  PL.fireCD = w.rate; SV.ammo[id]--; PL.aimT = 2; hudWeapon();
  const o = cam.position.clone(); const d = new T.Vector3(); cam.getWorldDirection(d);
  const tg = autoTarget(o, d, IS_MOBILE ? .5 : .07, w.range); if (tg) { d.copy(tg.pos).sub(o).normalize(); if (IS_MOBILE) { const a = Math.atan2(tg.pos.x - PL.x, tg.pos.z - PL.z); CAMS.yaw += angDiff(CAMS.yaw, a) * .5; } }
  PL.yaw = Math.atan2(d.x, d.z); PL.P.root.rotation.y = PL.yaw; PL.P.aimDir = d.clone(); PL.P.pose = 'aim';
  const muzzle = muzzleOf(PL.P, PL.gun, d); let first = null;
  for (let k = 0; k < (w.pellets || 1); k++) {
    const dd = d.clone().add(new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(w.spread * (PL.spd > 3 ? 2 : 1))).normalize();
    const hit = castShot(o, dd, w.range + 6, 'player'); if (!first || k === 0) first = hit; tracer(muzzle, hit.p);
    if (hit.kind === 'npc') { npcDamage(hit.n, w.dmg * (hit.p.y > hit.n.y + 1.45 && !(hit.n.ko > 0) ? 2.2 : 1), dd.x, dd.z, 'player', 'gun'); fx('dust', hit.p.x, hit.p.y, hit.p.z, { s: .3, life: .3, vy: .3, a: .7 }); }
    else if (hit.kind === 'car') { carHurt(hit.c, 4 + w.dmg * .35, false); if (hit.c.ai) hit.c.ai.stun = 1; if ((hit.c.type === 'police' || hit.c.chase) && G.on) crime('hitcop', hit.c.x, hit.c.z); }
    else if (hit.kind === 'heli') heliHurt(w.dmg);
  }
  G.lastShot = { p: first.p, t: G.t }; shotFx(muzzle, first, id, 1); G.shake = Math.max(G.shake, id === 'shotgun' ? .25 : .06);
  if (G.t - (PL.shootCrime || -9) > 1) { PL.shootCrime = G.t; crime('shoot', PL.x, PL.z); panic(PL.x, PL.z, 45); }
}
function panic(x, z, r) { for (const n of NPCS) { if (n.cop || n.mission || n.dead || n.ko > 0 || n.st === 'fight' || n.st === 'shoot' || n.thug) continue; const d = Math.hypot(n.x - x, n.z - z); if (d > r) continue; if (d < 12 && Math.random() < .35) { n.st = 'cower'; n.t = rand(3, 6); n.P.pose = 'cower'; } else npcFlee(n, x, z, rand(7, 11)); if (Math.random() < .3) say(n, Math.random() < .6 ? 'gun' : 'flee'); } }

/* ---------- NPC 사격 (경찰 · 특공대 · 깡패) ---------- */
function npcFire(n) {
  const w = WEAP[n.gun] || WEAP.pistol; const tgt = PL.car ? new T.Vector3(PL.car.x, PL.car.y + 1, PL.car.z) : new T.Vector3(PL.x, PL.y + 1.2, PL.z);
  const o = new T.Vector3(n.x, n.y + 1.45, n.z); const d = tgt.clone().sub(o); const dist = d.length(); d.normalize(); n.P.aimDir = d.clone(); n.P.pose = 'aim';
  const acc = (n.look && n.look.swat ? .5 : n.thug ? .3 : .38) * clamp(1.2 - dist / 45, .25, 1.1) * (PL.spd > 3 && !PL.car ? .6 : 1) * (PL.car ? .7 : 1);
  const miss = Math.random() > acc; const dd = d.clone(); if (miss) dd.add(new T.Vector3(rand(-1, 1), rand(-.5, .5), rand(-1, 1)).multiplyScalar(.12)).normalize();
  const hit = castShot(o, dd, w.range, n); const muzzle = muzzleOf(n.P, n.gunM, d); const vol = clamp(1 - dist / 80, .1, 1);
  shotFx(muzzle, hit, n.gun, vol);
  if (hit.kind === 'player') { hurtPlayer(w.dmg * .15 * (n.look && n.look.swat ? 1.2 : 1)); fx('dust', hit.p.x, hit.p.y, hit.p.z, { s: .25, life: .3, vy: .3, a: .7 }); }
  else if (hit.kind === 'car' && hit.c === PL.car) { carHurt(PL.car, 4 + w.dmg * .2, false); if (Math.random() < .25) hurtPlayer(w.dmg * .1); }
  else if (hit.kind === 'npc' && hit.n !== n) npcDamage(hit.n, w.dmg * .5, dd.x, dd.z, 'npc', 'gun');
}
function armNPC(n, w) { n.gun = w; n.gunM = gunModel(w); scene.add(n.gunM); n.fireT = rand(.5, 1.5); }

/* ---------- 경찰 헬기 ---------- */
const HELI = { h: null };
function makeHeli() {
  const g = new T.Group(); const body = new T.MeshPhysicalMaterial({ color: lin('#1d2c55'), metalness: .4, roughness: .35, clearcoat: 1 }), wht = new T.MeshStandardMaterial({ color: lin('#e9e9e9'), roughness: .5 }), dark = new T.MeshStandardMaterial({ color: lin('#111'), roughness: .5 });
  const b = new T.Mesh(new T.SphereGeometry(1.6, 20, 14), body); b.scale.set(1, .95, 1.7); g.add(b); const gl = new T.Mesh(new T.SphereGeometry(1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GLASS); gl.position.set(0, .2, 1.4); gl.scale.set(1, .8, 1); gl.rotation.x = .4; g.add(gl);
  const stripe = new T.Mesh(new T.BoxGeometry(3.25, .35, 3.2), wht); stripe.position.y = -.3; g.add(stripe);
  const tail = new T.Mesh(new T.CylinderGeometry(.18, .35, 5, 10), body); tail.rotation.x = Math.PI / 2; tail.position.set(0, .3, -4.2); g.add(tail);
  const fin = new T.Mesh(new T.BoxGeometry(.1, 1.2, .7), body); fin.position.set(0, .8, -6.5); g.add(fin);
  for (const s of [-1, 1]) { const sk = new T.Mesh(new T.BoxGeometry(.1, .1, 3.4), dark); sk.position.set(s * 1.1, -1.75, 0); g.add(sk); }
  const rotor = new T.Group(); for (let k = 0; k < 4; k++) { const bl = new T.Mesh(new T.BoxGeometry(.25, .04, 5.2), dark); bl.rotation.y = k * Math.PI / 4 * 2; bl.position.y = 0; rotor.add(bl); } rotor.position.y = 1.7; g.add(rotor);
  const tr = new T.Mesh(new T.BoxGeometry(.04, 1.4, .15), dark); tr.position.set(.2, .8, -6.5); g.add(tr);
  const spot = new T.SpotLight('#eef4ff', 0, 90, .32, .5, 1.2); spot.position.set(0, -1.6, 1); g.add(spot); g.add(spot.target);
  const lt = new T.Mesh(new T.SphereGeometry(.15, 8, 6), new T.MeshBasicMaterial({ color: '#ff2020' })); lt.position.set(0, -1.6, 1.8); g.add(lt);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
  return { g, rotor, tr, spot, lt, hp: 260, vel: new T.Vector3(), ang: rand(0, 6.28), fireT: 2, fall: 0 };
}
function heliHurt(d) { const h = HELI.h; if (!h || h.fall) return; h.hp -= d; fx('spark', h.g.position.x, h.g.position.y, h.g.position.z, { s: .5, life: .3, vy: 0, a: 1 }); if (h.hp <= 0) { h.fall = 1; crime('kocop', PL.x, PL.z); popLabel(h.g.position.x, h.g.position.y + 3, h.g.position.z, '헬기 격추!', '#ffcc33', 2); } }
function updateHeli(dt) {
  const want = G.wanted >= 4; let h = HELI.h;
  if (want && !h) { h = HELI.h = makeHeli(); h.g.position.set(PL.x + 120, 60, PL.z + 120); }
  if (!h) return;
  h.rotor.rotation.y += dt * 28; h.tr.rotation.x += dt * 40; h.lt.visible = Math.floor(G.t * 2) % 2 === 0;
  const p = h.g.position;
  if (h.fall) { h.vel.y -= 14 * dt; p.addScaledVector(h.vel, dt); h.g.rotation.y += dt * 4; if (Math.random() < dt * 20) fx('smoke', p.x, p.y, p.z, { s: 2, life: 1.2, vy: 1, a: .6 }); if (p.y < 1.5) { const c = { x: p.x, z: p.z }; SFX.boom(); for (let i = 0; i < 20; i++) fx(i % 3 ? 'fire' : 'smoke', p.x + rand(-3, 3), 1, p.z + rand(-3, 3), { s: rand(2, 4), life: rand(.8, 1.8), vy: rand(1, 6), a: .9 }); const d = Math.hypot(PL.x - p.x, PL.z - p.z); if (d < 10) hurtPlayer((10 - d) * 6); scene.remove(h.g); HELI.h = null; } return; }
  if (!want) { p.y += dt * 8; p.x += dt * 20; if (Math.hypot(p.x - PL.x, p.z - PL.z) > 220) { scene.remove(h.g); HELI.h = null; } h.spot.intensity = 0; return; }
  h.ang += dt * .35; const tgt = new T.Vector3(PL.x + Math.cos(h.ang) * 26, Math.max(groundY(PL.x, PL.z) + 30, 34), PL.z + Math.sin(h.ang) * 26);
  h.vel.lerp(tgt.clone().sub(p).multiplyScalar(.8), Math.min(1, dt * .9)); const sp = h.vel.length(); if (sp > 30) h.vel.multiplyScalar(30 / sp); p.addScaledVector(h.vel, dt);
  h.g.rotation.y = Math.atan2(PL.x - p.x, PL.z - p.z); h.g.rotation.x = clamp(h.vel.length() * .01, 0, .25);
  h.spot.intensity = DAY.night * 6 + .3; h.spot.target.position.set(0, -10, 0); h.spot.target.updateMatrixWorld(); { const lp = new T.Vector3(PL.x, PL.y, PL.z); h.g.worldToLocal(lp); h.spot.target.position.copy(lp); }
  if (G.wanted >= 5 && (h.fireT -= dt) <= 0) { h.fireT = rand(.6, 1.4); const o = p.clone().add(new T.Vector3(0, -1.6, 0)); const tg = PL.car ? new T.Vector3(PL.car.x, PL.car.y + 1, PL.car.z) : new T.Vector3(PL.x, PL.y + 1.2, PL.z); const d = tg.clone().sub(o).normalize(); if (Math.random() > .22) d.add(new T.Vector3(rand(-1, 1), 0, rand(-1, 1)).multiplyScalar(.06)).normalize(); const hit = castShot(o, d, 90, 'heli'); shotFx(o, hit, 'smg', .5); if (hit.kind === 'player') hurtPlayer(5); else if (hit.kind === 'car' && hit.c === PL.car) carHurt(PL.car, 8, false); }
}
function heliSees() { const h = HELI.h; if (!h || h.fall) return false; const p = h.g.position; return Math.hypot(p.x - PL.x, p.z - PL.z) < 90 && rayBlock(p.x, p.y - 2, p.z, PL.x, PL.y + 1, PL.z) > .97; }

/* ---------- 바리케이드 ---------- */
const BLOCKS = [];
function spawnRoadblock() {
  const c = PL.car; if (!c || Math.abs(c.v) < 9) return; const f = carFwd(c); const ax = Math.abs(f[0]) > Math.abs(f[1]) ? 'x' : 'z'; const sg = Math.sign(ax === 'x' ? f[0] : f[1]) * Math.sign(c.v);
  const lineC = ax === 'x' ? Math.round(PL.z / P) * P : Math.round(PL.x / P) * P; if (Math.abs((ax === 'x' ? PL.z : PL.x) - lineC) > RH) return;
  let along = (ax === 'x' ? PL.x : PL.z) + sg * 95; const fr = ((along % P) + P) % P; if (fr < RH + 8) along += sg * (RH + 10); else if (fr > P - RH - 8) along -= sg * (RH + 10); if (Math.abs(along) > LIM - 5) return;
  const cars = [], cops = [];
  for (const off of [-4.8, 0, 4.8]) { const pc = makeCar('police'); if (ax === 'x') { pc.x = along + rand(-1, 1); pc.z = lineC + off; pc.yaw = Math.PI / 2 * (Math.random() < .5 ? 0 : 2) + rand(-.3, .3); } else { pc.z = along + rand(-1, 1); pc.x = lineC + off; pc.yaw = Math.PI / 2 + rand(-.3, .3); } pc.parked = true; pc.siren = true; pc.roadblock = true; pc.copsOut = true; placeCar(pc); scene.add(pc.g); CARS.push(pc); cars.push(pc); }
  for (const s of [-1, 1]) { const x = ax === 'x' ? along - sg * 4 : lineC + s * 3, z = ax === 'x' ? lineC + s * 3 : along - sg * 4; const n = spawnNPC(x, z, 'cop'); armNPC(n, 'pistol'); n.hold = 1; cops.push(n); }
  BLOCKS.push({ cars, cops, t: 45 }); popLabel(PL.x, PL.y + 3, PL.z, '앞에 바리케이드!', '#4fa3ff', 1.5);
}
function updateRoadblocks(dt) {
  if (G.wanted >= 3 && PL.car && (G.rbT = (G.rbT == null ? 25 : G.rbT) - dt) <= 0) { G.rbT = 28 - G.wanted * 2; spawnRoadblock(); }
  for (let i = BLOCKS.length - 1; i >= 0; i--) { const b = BLOCKS[i]; b.t -= dt; if (b.t <= 0 || (!G.wanted && b.t < 40)) { for (const c of b.cars) if (Math.hypot(c.x - PL.x, c.z - PL.z) > 60 || b.t < -30) removeCar(c); else { c.roadblock = false; c.leaving = true; } BLOCKS.splice(i, 1); } }
}
