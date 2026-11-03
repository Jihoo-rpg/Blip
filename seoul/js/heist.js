'use strict';
/* ===== 레이의 작전: 편의점 · 보석상 · 현금수송차 · 은행 · 배신자 =====
   건물 안(실내)은 도시 밖 먼 곳(x=2000)에 따로 지어 두고, 문에 들어가면 순간이동해요. */
const INT = {};
function intMats() {
  if (INT.m) return INT.m;
  const marble = ctex(512, 512, (g, W, H) => { g.fillStyle = '#e9e6df'; g.fillRect(0, 0, W, H); for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,115,110,${rand(.08, .25)})`; g.lineWidth = rand(1, 3); g.beginPath(); let x = rand(0, W), y = rand(0, H); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rand(-60, 60); y += rand(-60, 60); g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, W, H); }, [1, 1]);
  const wood = ctex(256, 256, (g, W, H) => { for (let y = 0; y < H; y += 32) { g.fillStyle = `rgb(${110 + rand(0, 30)},${70 + rand(0, 20)},${40 + rand(0, 15)})`; g.fillRect(0, y, W, 31); } }, [1, 1]);
  const goods = ctex(512, 256, (g, W, H) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, W, H); for (let r = 0; r < 4; r++) { g.fillStyle = '#999'; g.fillRect(0, r * 64 + 58, W, 6); for (let x = 4; x < W; x += rand(14, 30)) { g.fillStyle = `hsl(${rand(0, 360)},70%,${rand(40, 65)}%)`; const h = rand(30, 52); g.fillRect(x, r * 64 + 58 - h, rand(10, 24), h); } } }, [1, 1]);
  const mk = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: .6 }, o));
  INT.m = { marble: mk({ map: marble, roughness: .15, metalness: .1 }), wall: mk({ color: lin('#e8e2d6'), side: T.DoubleSide }), wallDark: mk({ color: lin('#2a2f38'), side: T.DoubleSide }), wood: mk({ map: wood }), goods: mk({ map: goods }), counter: mk({ color: lin('#5a3a28') }), gold: mk({ color: lin('#ffcc33'), metalness: 1, roughness: .25, emissive: lin('#553300'), emissiveIntensity: .3 }), cash: mk({ color: lin('#5fbf5f'), emissive: lin('#1a4a1a'), emissiveIntensity: .3 }), steel: mk({ color: lin('#9aa2ab'), metalness: .9, roughness: .3 }), glass: new T.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: .25, roughness: .05, metalness: .1, depthWrite: false }), red: mk({ color: lin('#8a1020') }), gem: new T.MeshStandardMaterial({ color: lin('#9ff3ff'), emissive: lin('#3fd8ff'), emissiveIntensity: 1.2, metalness: .5, roughness: .1 }), fridge: mk({ color: lin('#ffffff'), emissive: lin('#cfe9ff'), emissiveIntensity: .8 }) };
  return INT.m;
}
function room(kind, ox, oz, w, d, h) { // 바닥 · 벽 · 천장 + 충돌 상자
  const M = intMats(); const g = new T.Group(); g.visible = false; scene.add(g);
  const add = (geo, m, x, y, z, ry, cast) => { const o = new T.Mesh(geo, m); o.position.set(ox + x, y, oz + z); if (ry) o.rotation.y = ry; o.castShadow = !!cast; o.receiveShadow = true; g.add(o); return o; };
  const fl = add(new T.PlaneGeometry(w, d), kind === 'mart' ? M.wood : M.marble, 0, .01, 0); fl.rotation.x = -Math.PI / 2; fl.material.map && fl.material.map.repeat.set(w / 4, d / 4);
  const ce = add(new T.PlaneGeometry(w, d), M.wall, 0, h, 0); ce.rotation.x = Math.PI / 2;
  const wm = kind === 'bank' ? M.wall : kind === 'jewel' ? M.wallDark : M.wall;
  add(new T.BoxGeometry(w, h, .3), wm, 0, h / 2, -d / 2); add(new T.BoxGeometry(w, h, .3), wm, 0, h / 2, d / 2); add(new T.BoxGeometry(.3, h, d), wm, -w / 2, h / 2, 0); add(new T.BoxGeometry(.3, h, d), wm, w / 2, h / 2, 0);
  addBox(ox - w / 2 - 1, oz - d / 2 - 1, ox + w / 2 + 1, oz - d / 2 + .15, 20); addBox(ox - w / 2 - 1, oz + d / 2 - .15, ox + w / 2 + 1, oz + d / 2 + 1, 20); addBox(ox - w / 2 - 1, oz - d / 2, ox - w / 2 + .15, oz + d / 2, 20); addBox(ox + w / 2 - .15, oz - d / 2, ox + w / 2 + 1, oz + d / 2, 20);
  const hl = new T.HemisphereLight('#fff6e8', '#4a4036', .9); g.add(hl);
  for (const [x, z] of [[-w / 4, -d / 4], [w / 4, -d / 4], [-w / 4, d / 4], [w / 4, d / 4]]) { const pl = new T.PointLight('#fff1d8', 1.1, Math.max(w, d) * 1.2); pl.position.set(ox + x, h - .4, oz + z); g.add(pl); const lp = add(new T.BoxGeometry(1.2, .06, .5), M.fridge, x, h - .04, z); }
  // 문 (안쪽에서 보이는 출구)
  const door = add(new T.BoxGeometry(2.2, 2.6, .1), M.glass, 0, 1.3, d / 2 - .2); add(new T.BoxGeometry(2.4, .12, .14), M.steel, 0, 2.66, d / 2 - .2);
  return { g, add, ox, oz, w, d, h, entry: [ox, oz + d / 2 - 1.6], exitDoor: [ox, oz + d / 2 - .7] };
}
function buildInteriors() {
  const M = intMats();
  // 편의점
  { const R_ = room('mart', 2000, 0, 12, 9, 3.4); INT.mart = R_;
    for (const x of [-3.5, 0, 3.5]) { R_.add(new T.BoxGeometry(1, 1.8, 5), M.goods, x, .9, -1, 0, true); addBox(R_.ox + x - .5, R_.oz - 3.5, R_.ox + x + .5, R_.oz + 1.5, 2); }
    R_.add(new T.BoxGeometry(11.6, 2.4, .6), M.fridge, 0, 1.2, -4.1);
    R_.add(new T.BoxGeometry(3.2, 1, .8), M.counter, -3.6, .5, 2.6, 0, true); addBox(R_.ox - 5.2, R_.oz + 2.2, R_.ox - 2, R_.oz + 3, 1.2); R_.add(new T.BoxGeometry(.5, .3, .4), M.steel, -3.2, 1.15, 2.6);
    R_.clerk = [R_.ox - 3.6, R_.oz + 1.6]; R_.reg = [R_.ox - 3.2, R_.oz + 3.4]; }
  // 보석상
  { const R_ = room('jewel', 2000, 100, 14, 10, 3.6); INT.jewel = R_; R_.cases = [];
    const car = R_.add(new T.PlaneGeometry(4, 9), M.red, 0, .02, 0); car.rotation.x = -Math.PI / 2;
    for (const [x, z] of [[-4.5, -2.5], [-4.5, 0], [-4.5, 2.5], [4.5, -2.5], [4.5, 0], [4.5, 2.5], [-1.6, -3.4], [1.6, -3.4]]) {
      const base = R_.add(new T.BoxGeometry(1.6, .9, .9), M.counter, x, .45, z, 0, true); const gl = R_.add(new T.BoxGeometry(1.6, .5, .9), M.glass, x, 1.15, z);
      const gems = new T.Group(); for (let k = 0; k < 5; k++) { const gm = new T.Mesh(new T.OctahedronGeometry(.07), M.gem); gm.position.set(rand(-.6, .6), .97, rand(-.3, .3)); gems.add(gm); } gems.position.set(R_.ox + x, 0, R_.oz + z); R_.g.add(gems);
      addBox(R_.ox + x - .8, R_.oz + z - .45, R_.ox + x + .8, R_.oz + z + .45, 1.4); R_.cases.push({ x: R_.ox + x, z: R_.oz + z, gl, gems, broken: false });
    }
    R_.add(new T.BoxGeometry(4, 1, .8), M.counter, 0, .5, -1.4, 0, true); addBox(R_.ox - 2, R_.oz - 1.8, R_.ox + 2, R_.oz - 1, 1.2); R_.clerk = [R_.ox, R_.oz - 2.4]; }
  // 은행
  { const R_ = room('bank', 2000, 220, 28, 22, 7); INT.bank = R_;
    for (const [x, z] of [[-7, -2], [7, -2], [-7, 5], [7, 5]]) { R_.add(new T.CylinderGeometry(.5, .55, 7, 16), M.marble, x, 3.5, z, 0, true); addCircle(R_.ox + x, R_.oz + z, .55, 8); }
    R_.add(new T.BoxGeometry(16, 1.1, 1), M.counter, 0, .55, -4.5, 0, true); addBox(R_.ox - 8, R_.oz - 5, R_.ox + 8, R_.oz - 4, 1.4);
    for (let k = -3; k <= 3; k++) R_.add(new T.BoxGeometry(.05, 1.2, .9), M.glass, k * 2.3, 1.7, -4.5);
    for (const x of [-9, -5, 5, 9]) for (const z of [3, 6]) { R_.add(new T.BoxGeometry(1.8, .45, .6), M.red, x, .45, z, 0, true); }
    // 금고 방
    R_.add(new T.BoxGeometry(10, 7, .6), M.wall, -9, 3.5, -7.5); R_.add(new T.BoxGeometry(10, 7, .6), M.wall, 9, 3.5, -7.5); addBox(R_.ox - 14, R_.oz - 7.8, R_.ox - 4, R_.oz - 7.2, 20); addBox(R_.ox + 4, R_.oz - 7.8, R_.ox + 14, R_.oz - 7.2, 20);
    R_.add(new T.BoxGeometry(8, 1.5, .6), M.wall, 0, 6.25, -7.5);
    const vd = new T.Group(); const disk = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, .6, 32), M.steel); disk.rotation.x = Math.PI / 2; vd.add(disk); for (let k = 0; k < 6; k++) { const sp = new T.Mesh(new T.BoxGeometry(.15, 2, .15), M.steel); sp.rotation.z = k / 6 * Math.PI; sp.position.z = .35; vd.add(sp); }
    const piv = new T.Group(); piv.position.set(R_.ox - 2.6, 2.7, R_.oz - 7.5); vd.position.set(2.6, 0, 0); piv.add(vd); R_.g.add(piv); R_.vault = piv; R_.vaultBox = addBox(R_.ox - 3, R_.oz - 7.9, R_.ox + 3, R_.oz - 7.1, 20);
    R_.loot = []; for (const [x, z] of [[-3, -13], [0, -13], [3, -13], [-3, -10.5], [3, -10.5]]) { const st = R_.add(new T.BoxGeometry(1.2, .8, .6), x % 2 ? M.gold : M.cash, x, .4, z + 2.6, 0, true); R_.loot.push({ x: R_.ox + x, z: R_.oz + z + 2.6, m: st }); }
    R_.vaultSpot = [R_.ox, R_.oz - 6.4]; }
}
let INSIDE = null, OUTSIDE = null;
function enterInterior(k, from) {
  fade(true); setTimeout(() => { const R_ = INT[k]; OUTSIDE = from; INSIDE = k; for (const kk of ['mart', 'jewel', 'bank']) INT[kk].g.visible = kk === k; if (PL.car) exitCar(); PL.x = R_.entry[0]; PL.z = R_.entry[1] - 1; PL.yaw = Math.PI; CAMS.yaw = Math.PI; CAMS.pos.set(PL.x, 3, PL.z + 3); fade(false); missionEvent('inside', k); }, 450);
}
function exitInterior() {
  const k = INSIDE; fade(true); setTimeout(() => { INSIDE = null; for (const kk of ['mart', 'jewel', 'bank']) INT[kk].g.visible = false; const o = OUTSIDE; PL.x = o[0]; PL.z = o[1]; PL.yaw = o[2] || 0; CAMS.yaw = PL.yaw; CAMS.pos.set(PL.x, 4, PL.z); fade(false); missionEvent('outside', k); }, 450);
}
function shopDoor(name, near) { let best = null, bd = 1e9; for (const s of BUILD.shops) if (s.name === name || (!name && true)) { const d = Math.hypot(s.x - (near ? near[0] : 0), s.z - (near ? near[1] : 0)); if (d < bd) { bd = d; best = s; } } return best; }
function doorOut(s) { const o = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[s.side] || [0, 1]; return [s.x + o[0] * .6, s.z + o[1] * .6, Math.atan2(o[0], o[1])]; }
function guardLook() { return { w: 0, skin: pick(SKIN.slice(0, 4)), top: '#1b1b1d', bot: '#1b1b1d', shoe: '#121212', beard: false, head: 'cap', cap: '#111111', glasses: Math.random() < .5, s: 1.04, wide: 1.1 }; }
function hostile(x, z, gun, look) { const n = spawnNPC(x, z, 'thug', look || guardLook()); n.mission = true; n.money = 0; if (gun) { armNPC(n, gun); n.st = 'shoot'; } else n.st = 'fight'; n.t = 999; return n; }
function ally(x, z, look, voice) { const n = spawnNPC(x, z, 'ped', look); n.mission = true; n.ally = true; n.voice = voice; n.money = 0; n.hp = n.maxHp = 9999; n.tough = false; armNPC(n, 'smg'); n.st = 'ally'; return n; }
/* 같은 편: 따라다니며 경찰 · 적을 쏴요 */
function allyAI(n, dt) {
  const d = Math.hypot(PL.x - n.x, PL.z - n.z); let tgt = null, td = 32;
  for (const o of NPCS) { if (o === n || o.ally || o.dead || o.ko > 0) continue; if (!(o.cop && o.st === 'chase') && !(o.thug && (o.st === 'shoot' || o.st === 'fight'))) continue; const dd = Math.hypot(o.x - n.x, o.z - n.z); if (dd < td && rayBlock(n.x, 1.5, n.z, o.x, 1.2, o.z) > .98) { td = dd; tgt = o; } }
  if (tgt) { n.yaw += angDiff(n.yaw, Math.atan2(tgt.x - n.x, tgt.z - n.z)) * Math.min(1, dt * 8); n.P.pose = 'aim'; n.P.aimDir = new T.Vector3(tgt.x - n.x, 0, tgt.z - n.z).normalize(); if ((n.fireT = (n.fireT || 0) - dt) <= 0) { n.fireT = rand(.25, .7); const o = new T.Vector3(n.x, n.y + 1.45, n.z); const tp = new T.Vector3(tgt.x, tgt.y + 1.2, tgt.z); const dir = tp.clone().sub(o).normalize(); shotFx(muzzleOf(n.P, n.gunM, dir), { p: tp, kind: 'npc' }, 'smg', clamp(1 - d / 60, .2, .8)); if (Math.random() < .55) npcDamage(tgt, 26, dir.x, dir.z, 'ally', 'gun'); } n.lastSpd = 0; return 0; }
  if (n.P.pose === 'aim') n.P.pose = null;
  if (d > 3.5 && !PL.car) { const sp = d > 8 ? 5.4 : 2.4; moveToward(n, PL.x + rand(-1, 1), PL.z + rand(-1, 1), sp, dt); return sp; }
  return 0;
}

/* ---------- 작전 목록 ---------- */
const HEISTS = [
  { n: '편의점 강도', reward: 150000, intro: '레이: 신입, 배짱 좀 볼까? 권총 줄게.\n<b>편의점</b>에 들어가서 점원한테 총을 겨누고 돈을 받아 와.', start() {
    story('r1a'); if (!SV.ammo || SV.ammo.pistol == null) giveWeapon('pistol', 36); else selectWeapon('pistol');
    const s = shopDoor('편의점', [PL.x, PL.z]) || shopDoor('편의점24', [PL.x, PL.z]); const out = doorOut(s); let M = mkMarker(s.x, s.z, '#ff3040'); let step = 0, prog = 0, clerk = null; obj('🏪 표시된 <em>편의점</em>에 들어가요');
    MI.upd = (dt) => {
      if (step === 0 && !INSIDE && inMarker(M, PL.x, PL.z) && !PL.car) { rmMarker(M); M = null; enterInterior('mart', out); step = 1; }
      if (step === 1 && INSIDE === 'mart') { const R_ = INT.mart; if (!clerk) { clerk = spawnNPC(R_.clerk[0], R_.clerk[1], 'ped', { w: 0, skin: '#f6e3d3', top: '#1f8f4a', bot: '#22324f', shoe: '#121212', head: 'hair', hair: '#120f0d', hairStyle: 'short', s: 1, wide: 1 }); clerk.mission = true; clerk.st = 'stand'; clerk.face = [R_.ox, R_.oz + 4]; clerk.voice = 'am_puck'; }
        const aimAt = curWid() !== 'fist' && (PL.aimT > 0 || IN.aim) && Math.hypot(clerk.x - PL.x, clerk.z - PL.z) < 9; const down = clerk.dead || clerk.ko > 0; const atReg = Math.hypot(R_.reg[0] - PL.x, R_.reg[1] - PL.z) < 1.6;
        if (aimAt && !down) { prog += dt / 4; clerk.P.pose = 'hands'; if (!clerk.said) { clerk.said = 1; story('k1', clerk.x, clerk.z); } } else if (down && atReg) prog += dt / 3;
        obj(down ? `💰 계산대 옆에 서서 금고를 털어요 <em>${Math.round(prog * 100)}%</em>` : `🔫 점원에게 <em>총을 겨눠요</em> (조준 유지) ${Math.round(prog * 100)}%`);
        if (prog >= 1) { step = 2; if (!down) { story('k2', clerk.x, clerk.z); } dropCash(R_.reg[0], R_.reg[1] - 1, 150000); obj('💰 돈을 줍고 <em>가게를 나가요</em> (문 앞 표시)'); M = mkMarker(R_.exitDoor[0], R_.exitDoor[1] - .8, '#ffcc33'); } }
      if (step === 2 && INSIDE && inMarker(M, PL.x, PL.z)) { rmMarker(M); M = null; exitInterior(); step = 2.5; setTimeout(() => { setWanted(2); step = 3; obj('🚨 <em>경찰을 따돌려요!</em>'); }, 600); }
      if (step === 3 && !INSIDE && G.wanted === 0) { heistPass(this.reward, 'r1b'); }
    };
    MI.cleanup = () => { rmMarker(M); if (clerk && NPCS.includes(clerk)) removeNPC(clerk); if (INSIDE) exitInterior(); };
  } },
  { n: '보석상 털기', reward: 0, intro: '레이: 시내 보석상이다. <b>진열장</b>을 부수고(펀치·총) 보석을 챙겨.\n경찰 오기까지 <b>45초</b>! 나오면 오토바이가 있어.', start() {
    story('r2a'); const s = shopDoor('안경', [0, 0]) || shopDoor(null, [0, 0]); const out = doorOut(s); let M = mkMarker(s.x, s.z, '#ff3040', { r: 1.2 }); let step = 0, got = 0, bike = null, folks = []; obj('💎 표시된 <em>보석상</em>에 들어가요');
    MI.upd = (dt) => {
      const R_ = INT.jewel;
      if (step === 0 && !INSIDE && inMarker(M, PL.x, PL.z) && !PL.car) { rmMarker(M); M = null; for (const c of R_.cases) { c.broken = false; c.gl.visible = true; c.gems.visible = true; } enterInterior('jewel', out); step = 1; }
      if (step === 1 && INSIDE === 'jewel') { step = 2; timer(45); const cl = spawnNPC(R_.clerk[0], R_.clerk[1], 'ped'); cl.mission = true; cl.st = 'cower'; cl.t = 999; folks.push(cl); for (let i = 0; i < 2; i++) { const n = spawnNPC(R_.ox + rand(-3, 3), R_.oz + rand(0, 3), 'ped'); n.mission = true; n.st = 'cower'; n.t = 999; folks.push(n); } setTimeout(() => story('k3', cl.x, cl.z), 1200); }
      if (step === 2) {
        const smash = (c) => { c.broken = true; c.gl.visible = false; c.gems.visible = false; got++; SFX.glass(); for (let i = 0; i < 8; i++) fx('spark', c.x + rand(-.6, .6), 1.2, c.z + rand(-.3, .3), { s: .25, life: .5, vy: rand(1, 3), a: 1 }); popLabel(c.x, 2, c.z, '+' + won(120000), '#7ee08a', 1.2); addMoney(120000); };
        for (const c of R_.cases) if (!c.broken) { if (IN.punch && curWid() === 'fist' && Math.hypot(c.x - PL.x, c.z - PL.z) < 1.5) smash(c); else if (G.lastShot && G.t - G.lastShot.t < .1 && Math.hypot(G.lastShot.p.x - c.x, G.lastShot.p.z - c.z) < 1) smash(c); }
        obj(`💎 진열장 부수기 <em>${got} / ${R_.cases.length}</em> · 다 했으면 나가요`); if (!M) M = mkMarker(R_.exitDoor[0], R_.exitDoor[1] - .8, '#ffcc33');
        if (inMarker(M, PL.x, PL.z) && got > 0) { rmMarker(M); M = null; $('#timer').hidden = true; exitInterior(); step = 2.5; setTimeout(() => { setWanted(3); step = 3; bike = makeCar('bike'); bike.x = PL.x + 3; bike.z = PL.z; bike.yaw = PL.yaw; bike.parked = true; bike.mission = true; placeCar(bike); scene.add(bike.g); CARS.push(bike); MI.blipCar = bike; obj('🏍️ <em>오토바이</em>로 도망쳐서 경찰을 따돌려요!'); }, 700); }
      }
      if (step === 3 && !INSIDE && G.wanted === 0) { if (bike) bike.mission = false; heistPass(100000, 'r2b', `💎 보석 ${got}개 · ${won(got * 120000)}`); }
    };
    MI.timeUp = () => { if (INSIDE === 'jewel') { setWanted(3); dispatch(0); toast('🚨 경찰이 왔어요! 빨리 나가요!'); } };
    MI.cleanup = () => { rmMarker(M); for (const n of folks) if (NPCS.includes(n)) removeNPC(n); if (INSIDE) exitInterior(); if (bike) bike.mission = false; };
  } },
  { n: '현금수송차', reward: 0, intro: '민: 안녕, 난 해커 민이야. 은행 일정을 털었어.\n<b>현금수송차</b>가 지금 출발해. 들이받거나 쏴서 세우고 돈가방을 챙겨!', start() {
    story('m3a'); const pos = laneNear(PL.x, PL.z, 120, 200) || laneNear(PL.x, PL.z, 60, 250); const c = makeCar('armored'); laneSpawn(c, pos.x, pos.z, pos.f, 1); c.mission = true; c.drvP = false; c.ai.vd = 12; scene.add(c.g); CARS.push(c); MI.blipCar = c; let step = 0, bags = [], guards = [];
    obj('🚚 <em>현금수송차</em>를 찾아서 세워요 (지도 빨간 점)');
    MI.upd = () => {
      if (step === 0) { if (c.hp < c.maxHp * .99 && c.ai) { c.ai.vd = 22; if (!c.alarmed) { c.alarmed = 1; setWanted(Math.max(G.wanted, 2)); } } obj(`🚚 현금수송차를 세워요 · 차 상태 <em>${Math.round(c.hp / c.maxHp * 100)}%</em>`);
        if (c.hp < c.maxHp * .4 || c.dead || PL.car === c) { if (PL.car === c) exitCar(); step = 1; c.ai = null; c.parked = true; c.v *= .3; const f = carFwd(c), L = carLeft(c); for (const s of [-1, 1]) { const g = hostile(c.x + L[0] * s * 2, c.z + L[1] * s * 2, 'pistol'); guards.push(g); } story('g2', c.x, c.z); for (let i = 0; i < 3; i++) { const bx = c.x - f[0] * (4 + i * .8) + L[0] * (i - 1) * .8, bz = c.z - f[1] * (4 + i * .8) + L[1] * (i - 1) * .8; dropCash(bx, bz, 250000); bags.push(PICKS[PICKS.length - 1]); } MI.blipCar = null; obj('💰 경비를 처리하고 <em>돈가방 3개</em>를 주워요'); } }
      if (step === 1) { const left = bags.filter(b => PICKS.includes(b)).length; obj(`💰 돈가방 <em>${3 - left} / 3</em>`); if (!left) { step = 2; setWanted(Math.max(G.wanted, 3)); dispatch(1); obj('🚨 <em>경찰을 따돌려요!</em>'); } }
      if (step === 2 && G.wanted === 0) heistPass(200000, 'm3b');
    };
    MI.cleanup = () => { c.mission = false; for (const g of guards) if (NPCS.includes(g)) g.mission = false; };
  } },
  { n: '은행 털기', reward: 0, intro: '레이: 드디어 큰 거다. <b>서울중앙은행</b>.\n민이 금고를 뚫는 동안 경찰을 막아. 돈 챙기고 도망치면 끝!', start() {
    story('r4a'); const s = shopDoor('은행', [0, 0]) || shopDoor(null, [0, 0]); const out = doorOut(s); let M = mkMarker(s.x, s.z, '#ff3040', { r: 1.3 }); let step = 0, prog = 0, ray = null, min = null, folks = [], got = 0, car = null; const R_ = INT.bank;
    obj('🏦 <em>서울중앙은행</em>으로 가요 (레이 · 민과 합류)');
    MI.upd = (dt) => {
      if (step === 0) { if (!ray && Math.hypot(PL.x - s.x, PL.z - s.z) < 45) { ray = ally(out[0] + 2, out[1], { w: 0, skin: '#e9c9ad', top: '#151515', bot: '#151515', shoe: '#121212', head: 'hat', hat: '#1b1b1d', glasses: true, s: 1.05, wide: 1.1 }, 'bm_daniel'); min = ally(out[0] - 2, out[1], randomLook(1), 'af_nova'); }
        if (inMarker(M, PL.x, PL.z) && !PL.car) { rmMarker(M); M = null; enterInterior('bank', out); step = 1; } }
      if (step === 1 && INSIDE === 'bank') { step = 2; for (const a of [ray, min]) if (a) { a.x = R_.entry[0] + (a === ray ? 1.5 : -1.5); a.z = R_.entry[1] - 1.5; }
        for (let i = 0; i < 6; i++) { const n = spawnNPC(R_.ox + rand(-10, 10), R_.oz + rand(-3, 7), 'ped'); n.mission = true; n.st = 'cower'; n.t = 999; folks.push(n); }
        folks.push(hostile(R_.ox - 6, R_.oz - 3, 'pistol'), hostile(R_.ox + 6, R_.oz - 3, 'pistol')); setTimeout(() => story('r4b'), 600); M = mkMarker(R_.vaultSpot[0], R_.vaultSpot[1], '#ffcc33'); obj('🏦 경비를 처리하고 <em>금고 앞</em>으로 가요'); }
      if (step === 2 && inMarker(M, PL.x, PL.z)) { rmMarker(M); M = null; step = 3; story('m4a'); setWanted(4); MI.noInsideCops = true; G.waveT = 3; if (min) { min.st = 'stand'; min.x = R_.vaultSpot[0] + 1; min.z = R_.vaultSpot[1] + .5; min.face = [R_.vaultSpot[0], R_.vaultSpot[1] - 2]; } }
      if (step === 3) { prog += dt / 35; obj(`🔩 금고 뚫는 중 <em>${Math.round(prog * 100)}%</em> · 들어오는 경찰을 막아요!`); if (prog > .5 && !MI.half) { MI.half = 1; story('m4b'); }
        if ((G.waveT -= dt) <= 0) { G.waveT = 8; const alive = NPCS.filter(n => n.cop && !n.dead && n.ko <= 0 && Math.abs(n.x) > 1500).length; if (alive < 4) for (let i = 0; i < 2; i++) { const n = spawnNPC(R_.entry[0] + rand(-2, 2), R_.entry[1] + rand(-.5, .5), Math.random() < .5 ? 'swat' : 'cop'); if (!n.gun) armNPC(n, 'pistol'); } }
        if (prog >= 1) { step = 4; story('m4c'); R_.vaultBox.x0 = R_.vaultBox.x1 = -9999; for (const l of R_.loot) l.m.visible = true; MI.loot = R_.loot.map(l => l); obj('💰 금고 안의 <em>돈 · 금괴</em>를 챙겨요'); if (min) min.st = 'ally'; } }
      if (step === 4) { R_.vault.rotation.y = Math.max(-1.6, R_.vault.rotation.y - dt * .8);
        for (const l of MI.loot) if (l.m.visible && Math.hypot(l.x - PL.x, l.z - PL.z) < 1.4) { l.m.visible = false; got++; addMoney(700000); SFX.cash(); popLabel(l.x, 1.8, l.z, '+' + won(700000), '#7ee08a', 1.2); }
        obj(`💰 챙긴 돈 <em>${got} / ${MI.loot.length}</em> · 3개 이상이면 나갈 수 있어요`); if (got >= 3 && !M) { M = mkMarker(R_.exitDoor[0], R_.exitDoor[1] - .8, '#ffcc33'); }
        if (M && inMarker(M, PL.x, PL.z)) { rmMarker(M); M = null; step = 4.5; exitInterior(); setTimeout(() => { story('r4c'); setWanted(5); step = 5; car = makeCar('suv', '#111214'); car.x = out[0] + Math.cos(out[2]) * 6; car.z = out[1] - Math.sin(out[2]) * 6; car.yaw = out[2] + Math.PI / 2; car.parked = true; car.mission = true; placeCar(car); scene.add(car.g); CARS.push(car); MI.blipCar = car; for (const a of [ray, min]) if (a && NPCS.includes(a)) { a.x = PL.x + rand(-2, 2); a.z = PL.z + rand(-2, 2); } obj('🚙 검은 <em>도주 차량</em>을 타고 경찰을 따돌려요!'); }, 700); } }
      if (step === 5) { if (PL.car && ray && NPCS.includes(ray)) { removeNPC(ray); removeNPC(min); ray = min = null; toast('레이와 민은 각자 흩어졌어요. 은신처에서 만나요!'); } if (G.wanted === 0) { if (car) car.mission = false; heistPass(500000, 'r4d', `🏦 은행에서 ${won(got * 700000)}`); } }
    };
    MI.cleanup = () => { rmMarker(M); for (const n of folks.concat([ray, min])) if (n && NPCS.includes(n)) removeNPC(n); for (const n of NPCS.slice()) if (n.cop && Math.abs(n.x) > 1500) removeNPC(n); if (INSIDE) exitInterior(); if (car) car.mission = false; R_.vault.rotation.y = 0; R_.vaultBox.x0 = R_.ox - 3; R_.vaultBox.x1 = R_.ox + 3; for (const l of R_.loot) l.m.visible = true; };
  } },
  { n: '배신자', reward: 0, intro: '레이: 민이 사라졌어. <b>돈을 들고 튀었다고!</b>\n민의 빨간 차를 들이받아 세우고, 돈가방을 되찾아 와!', start() {
    story('r5a'); const pos = laneNear(PL.x, PL.z, 120, 200) || laneNear(PL.x, PL.z, 60, 250); const c = makeCar('sports', '#d10f1f'); laneSpawn(c, pos.x, pos.z, pos.f, 0); c.ai = null; c.mission = true; c.flee = true; c.v = 10; scene.add(c.g); CARS.push(c); MI.blipCar = c; let step = 0, min = null, bag = null;
    obj('🏎️ 민의 <em>빨간 스포츠카</em>를 쫓아 세워요');
    MI.upd = (dt) => {
      if (step === 0) { if (Math.hypot(c.x - PL.x, c.z - PL.z) < 40 && !MI.said) { MI.said = 1; voxPlay('story', 'm5a', c.x, c.z, { story: true }); const e = $('#sub'); e.textContent = SUBS.m5a; e.hidden = false; setTimeout(() => e.hidden = true, 3000); }
        fleeDrive(c, dt); obj(`🏎️ 민의 차를 세워요 · 차 상태 <em>${Math.round(c.hp / c.maxHp * 100)}%</em>`);
        if (c.hp < c.maxHp * .35 || c.dead) { step = 1; c.flee = false; c.parked = true; const L = carLeft(c); min = spawnNPC(c.x + L[0] * 2, c.z + L[1] * 2, 'ped', randomLook(1)); min.mission = true; min.voice = 'af_nova'; min.st = 'flee'; min.t = 999; min.threat = [PL.x, PL.z]; MI.blipCar = null; obj('🏃 도망치는 <em>민</em>을 쓰러뜨려요!'); } }
      if (step === 1) { if (min.st === 'flee') min.threat = [PL.x, PL.z]; if (min.ko > 0 || min.dead) { step = 2; story('m5b', min.x, min.z); dropCash(min.x + .8, min.z, 1000000); bag = PICKS[PICKS.length - 1]; obj('💰 <em>돈가방</em>을 주워요'); } }
      if (step === 2 && !PICKS.includes(bag)) heistPass(500000, 'r5b', '👑 레이의 작전을 모두 끝냈어요!');
    };
    MI.cleanup = () => { c.mission = false; c.flee = false; if (min) min.mission = false; };
  } }
];
function heistPass(bonus, line, sub) { if (line) setTimeout(() => story(line), 900); if (MI) MI.heist = true; missionPass(bonus); if (sub) setTimeout(() => toast(sub), 3600); }
function startHeist() { if (MI || (SV.heist || 0) >= HEISTS.length) return; const h = HEISTS[SV.heist || 0]; MI = { heistIdx: SV.heist || 0 }; for (const k in GIVERS) rmMarker(GIVERS[k].M); h.start(); }
/* 도망가는 차: 경찰처럼 길을 따라 멀리 달려요 */
function fleeDrive(c, dt) {
  if (!c.goal || Math.hypot(c.goal[0] - c.x, c.goal[1] - c.z) < 12) { const far = [randi(-NR, NR) * P, randi(-NR, NR) * P]; c.goal = far; }
  const t = gridPath(c.x, c.z, c.goal[0], c.goal[1]); const want = Math.atan2(t[0] - c.x, t[1] - c.z); const a = angDiff(c.yaw, want); let inp = { thr: .92, steer: clamp(a * 2, -1, 1) };
  if (Math.abs(a) > 1.4 && c.v < 8) inp = { brk: 1, steer: -clamp(a * 2, -1, 1) }; if (c.rev > 0) { c.rev -= dt; inp = { brk: 1, steer: c.revS }; } else if (Math.abs(c.v) < 1) { c.stk = (c.stk || 0) + dt; if (c.stk > 1) { c.rev = 1.2; c.revS = -inp.steer || 1; c.stk = 0; } } else c.stk = 0;
  const hit = drive(c, inp, dt); if (hit > 6) carHurt(c, hit, false); placeCar(c);
}
