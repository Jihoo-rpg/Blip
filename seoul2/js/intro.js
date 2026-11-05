'use strict';
/* ===== STA 2: GTA처럼 시작하는 오프닝 (도시를 훑는 카메라 · 크레딧 · 음악) · 타이틀 · 첫 등장 ===== */
const INTRO = { on: false, t: 0, i: -1, shots: null, title: false, tt: 0, ti: 0 };
function introShots() {
  const L = BUILD.landmarks, g = L.gate || { x: 0, z: -160 }, tw = L.tower || { x: 160, z: 0 }, pk = L.park || { x: -80, z: -80 };
  return [
    { d: 4.6, h: 18.3, a: [-260, 55, 600], b: [-120, 34, 470], la: [0, 30, 0], lb: [0, 22, -40], c: ['블립 게임즈', '제공'], col: '#ff4d6d', pos: 'bl' },
    { d: 4.4, h: 18.7, a: [10.5, 6, 590], b: [10.5, 7, 330], la: [0, 5, 160], lb: [0, 6, 100], c: ['서울특별시', 'SEOUL · 2026'], col: '#ffcc33', pos: 'tr' },
    { d: 4.4, h: 12.5, a: [g.x - 34, 4, g.z + 46], b: [g.x + 24, 9, g.z + 38], la: [g.x, 8, g.z], lb: [g.x, 9, g.z], c: ['주연', '당신'], col: '#4fd1ff', pos: 'br' },
    { d: 4.6, h: 15.5, a: [-250, 150, -250], b: [230, 135, -170], la: [0, 0, 0], lb: [40, 0, 40], c: ['레이싱 · 스턴트 · 광란', '그리고 혼돈'], col: '#7ee08a', pos: 'tl' },
    { d: 4.2, h: 21.6, a: [P + 4.5, 4.5, -210], b: [P + 4.5, 5.5, -40], la: [P, 3, 40], lb: [P, 3, 160], c: ['음악', 'BLIP RADIO'], col: '#c86bff', pos: 'bl' },
    { d: 4.2, h: 22.4, a: [tw.x + 40, 60, tw.z + 50], b: [tw.x - 30, 95, tw.z + 20], la: [tw.x, 50, tw.z], lb: [tw.x, 70, tw.z - 30], c: ['경찰 · 헬기 · 은행 털이', '서울은 잠들지 않아'], col: '#ff9f1c', pos: 'tr' },
    { d: 5.4, h: 19.2, a: [pk.x + 90, 70, pk.z + 260], b: [-40, 230, 420], la: [0, 20, 0], lb: [-120, 120, -760], c: ['SEOUL THEFT AUTO', ''], col: '#ffffff', pos: 'end' }];
}
const ease = t => t * t * (3 - 2 * t);
function camShot(s, k) { const e = ease(clamp(k, 0, 1)); cam.position.set(lerp(s.a[0], s.b[0], e), lerp(s.a[1], s.b[1], e), lerp(s.a[2], s.b[2], e)); cam.lookAt(lerp(s.la[0], s.lb[0], e), lerp(s.la[1], s.lb[1], e), lerp(s.la[2], s.lb[2], e)); if (Math.abs(cam.fov - 55) > .1) { cam.fov = 55; cam.updateProjectionMatrix(); } }
/* 도시가 살아 움직이게 (차 · 사람) */
function cityAlive(dt) {
  const ppl = NPCS.filter(n => n.ko <= 0);
  for (const c of CARS) { try { if (c.ai) trafficStep(c, dt, CARS, ppl); if (c.rider) { c.rider.mixer.update(dt); applyPose(c.rider); } c.g.visible = true; } catch (e) { } }
  for (const n of NPCS) { try { updateNPC(n, dt); placeNPC(n, dt, false); n.P.root.visible = true; } catch (e) { } }
  if (WATER) WATER.material.normalMap.offset.set(performance.now() * 1e-5, performance.now() * 6e-6);
}
/* 사람 · 차를 카메라 근처로 옮겨 놓기 */
function populateNear(x, z) { for (const c of CARS) if (c.ai && Math.hypot(c.x - x, c.z - z) > 220 && Math.random() < .5) { const p = laneNear(x, z, 20, 160); if (p) { laneSpawn(c, p.x, p.z, p.f, p.li); placeCar(c); } } }
/* ---------- 오프닝 음악 (직접 만든 비트) ---------- */
const IMUS = { on: false, next: 0, step: 0, g: null, timer: null };
function introMusic(on) {
  if (!AU.ctx) return; const c = AU.ctx;
  if (!on) { if (IMUS.g) { IMUS.g.gain.setTargetAtTime(0, c.currentTime, .4); const g = IMUS.g; setTimeout(() => g.disconnect(), 2000); } IMUS.on = false; clearInterval(IMUS.timer); IMUS.g = null; return; }
  if (IMUS.on) return; IMUS.on = true; IMUS.g = c.createGain(); IMUS.g.gain.value = .55; IMUS.g.connect(AU.master); IMUS.next = c.currentTime + .1; IMUS.step = 0;
  const spb = 60 / 94 / 2, prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass = [45, 41, 36, 43];
  const kick = t => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); o.connect(g); g.connect(IMUS.g); o.start(t); o.stop(t + .4); };
  const nz = (t, d, f, v, ty) => { const s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = ty || 'highpass'; fl.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(fl); fl.connect(g); g.connect(IMUS.g); s.start(t, Math.random()); s.stop(t + d + .05); };
  const syn = (t, m, d, v, ty, cut) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = mtof(m); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(cut * .3, t + d); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(f); f.connect(g); g.connect(IMUS.g); o.start(t); o.stop(t + d + .05); };
  IMUS.timer = setInterval(() => { if (!IMUS.on) return; while (IMUS.next < c.currentTime + .35) { const t = IMUS.next, s = IMUS.step, bar = Math.floor(s / 8) % 4, b8 = s % 8, intro = s < 16;
      if (!intro || b8 === 0) { if (b8 === 0 || b8 === 3 || b8 === 5) kick(t); }
      if (!intro && (b8 === 2 || b8 === 6)) { nz(t, .22, 1800, .5, 'bandpass'); syn(t, 50, .1, .15, 'triangle', 900); }
      nz(t, .05, 7000, b8 % 2 ? .1 : .18);
      if (b8 === 0 || b8 === 3 || b8 === 6) syn(t, bass[bar], spb * 2.2, .45, 'sawtooth', 700);
      if (b8 === 0) for (const m of prog[bar]) syn(t, m + 12, spb * 7.5, .07, 'sawtooth', 2200);
      if (!intro && s % 2 === 0) syn(t, prog[bar][(s / 2) % 3] + 24, spb * .9, .06, 'square', 3000);
      IMUS.step++; IMUS.next += spb; } }, 80);
}
/* ---------- 오프닝 진행 ---------- */
function startIntro() {
  if (INTRO.on) return; INTRO.on = true; INTRO.t = 0; INTRO.i = -1; INTRO.shots = introShots(); $('#title').hidden = true; $('#press').hidden = true; $('#cine').hidden = false; $('#cine').classList.add('on'); introMusic(true);
  for (let k = 0; k < 20; k++) { const n = NPCS[k]; if (!n) break; }
}
function endIntro() {
  if (!INTRO.on) return; INTRO.on = false; $('#cine').classList.remove('on'); $('#cine').hidden = true; $('#cred').innerHTML = ''; introMusic(false);
  const tl = $('#title'); tl.hidden = false; tl.classList.remove('slam'); void tl.offsetWidth; tl.classList.add('slam'); if (AU.ctx) { noiseHit(.9, 300, .9); tone(55, .8, .7, 'sine', 30); }
  INTRO.title = true; INTRO.tt = 0; INTRO.ti = 3;
}
function introTick(dt) {
  INTRO.t += dt; const S = INTRO.shots; let acc = 0, i = 0; for (; i < S.length; i++) { if (INTRO.t < acc + S[i].d) break; acc += S[i].d; }
  if (i >= S.length) { endIntro(); return; }
  const s = S[i], k = (INTRO.t - acc) / s.d;
  if (i !== INTRO.i) { INTRO.i = i; DAY.t = s.h; populateNear(s.b[0], s.b[2]); const cr = $('#cred'); cr.className = 'p-' + s.pos; cr.style.setProperty('--ac', s.col);
    cr.innerHTML = s.pos === 'end' ? `<div class="logoBig">STA <span>2</span></div><div class="sub2">${s.c[0]}</div>` : `<small>${s.c[0]}</small><b>${s.c[1]}</b>`; cr.classList.remove('show'); void cr.offsetWidth; cr.classList.add('show'); $('#cine').classList.add('cut'); setTimeout(() => $('#cine').classList.remove('cut'), 120); }
  $('#cred').style.opacity = s.pos === 'end' ? clamp(k * 3, 0, 1) : clamp(Math.min((k - .08) * 4, (1 - k) * 5), 0, 1);
  updateDay(0, new T.Vector3(s.b[0], 0, s.b[2])); updateEnv(); camShot(s, k);
}
/* 타이틀 화면 뒤 배경: 천천히 도는 장면들 */
function titleBg(dt) {
  if (!INTRO.shots) INTRO.shots = introShots(); const S = INTRO.shots; INTRO.tt += dt; const D = 11;
  if (INTRO.tt > D || INTRO.ti >= S.length) { INTRO.tt = 0; INTRO.ti = (INTRO.ti + 1) % S.length; if (INTRO.ti === 2) INTRO.ti = 3; DAY.t = S[INTRO.ti].h; populateNear(S[INTRO.ti].b[0], S[INTRO.ti].b[2]); }
  const s = S[INTRO.ti]; updateDay(dt * .05, new T.Vector3(s.b[0], 0, s.b[2])); updateEnv(); camShot(s, INTRO.tt / D);
}
titleCam = function (dt, now) { updateLights(dt); cityAlive(dt); if (INTRO.on) introTick(dt); else titleBg(dt); ren.render(scene, cam); };
/* ---------- 누르면 시작 ---------- */
const _showTitleS2 = showTitle;
showTitle = function () {
  _showTitleS2(); const tl = $('#title'); tl.hidden = true; const pr = $('#press'); pr.hidden = false;
  const b = $('#titleBtns'); const op = document.createElement('button'); op.className = 'btn d'; op.textContent = '🎬 오프닝 다시 보기'; op.onclick = () => { startIntro(); }; b.appendChild(op);
  const go = e => { if (pr.hidden) return; auInit(); pr.hidden = true; startIntro(); removeEventListener('keydown', go); };
  pr.onclick = go; addEventListener('keydown', go);
};
addEventListener('keydown', e => { if (INTRO.on && (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter')) endIntro(); });
$('#skip') && ($('#skip').onclick = () => endIntro());
/* ---------- 게임 시작: 하늘에서 내려오는 카메라 ---------- */
const SWOOP = { t: 0, D: 3.2 };
function swoopStart(first) { SWOOP.t = SWOOP.D; G.swoopFirst = first; INTRO.title = false; if (AU.ctx) noiseHit(.8, 1200, .3, 'bandpass'); }
const _updCamS2 = updateCamera; updateCamera = function (dt) {
  if (SWOOP.t > 0) { SWOOP.t -= dt; const k = 1 - SWOOP.t / SWOOP.D; const stage = k < .3 ? 0 : k < .62 ? 1 : 2; if (stage !== SWOOP.st) { SWOOP.st = stage; if (AU.ctx) { noiseHit(.35, 2500, .25, 'bandpass'); tone(stage === 2 ? 220 : 160, .25, .2, 'sine', 90); } }
    const hgt = [320, 110, lerp(40, 3, ease(clamp((k - .62) / .38, 0, 1)))][stage], back = [0, 0, lerp(30, 6, ease(clamp((k - .62) / .38, 0, 1)))][stage], f = [Math.sin(CAMS.yaw), Math.cos(CAMS.yaw)];
    cam.position.set(PL.x - f[0] * back + .01, PL.y + hgt, PL.z - f[1] * back); cam.lookAt(PL.x, PL.y + 1.2, PL.z); CAMS.pos.copy(cam.position);
    if (SWOOP.t <= 0) { SWOOP.st = -1; if (G.swoopFirst) setTimeout(() => { const e = $('#sub'); e.textContent = '2년 만에 돌아온 서울. 박 사장이 일거리가 있다고 했다…'; e.hidden = false; setTimeout(() => e.hidden = true, 4500); }, 300); }
    return; }
  _updCamS2(dt);
};
