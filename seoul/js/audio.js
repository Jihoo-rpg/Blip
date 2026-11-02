'use strict';
/* ===== 소리 (모두 직접 합성) ===== */
const AU = { ctx: null, master: null, sfx: null, music: null, eng: null, siren: null, radio: { st: 0, next: 0, step: 0 }, on: true };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return; const c = AU.ctx = new C();
  AU.master = c.createGain(); AU.master.gain.value = .8; AU.master.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.gain.value = .9; AU.sfx.connect(AU.master);
  AU.music = c.createGain(); AU.music.gain.value = .32; AU.music.connect(AU.master);
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++)d[i] = Math.random() * 2 - 1; AU.noise = nb;
  // 엔진
  const o = c.createOscillator(); o.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; const g = c.createGain(); g.gain.value = 0;
  o.connect(f); o2.connect(f); f.connect(g); g.connect(AU.sfx); o.start(); o2.start(); AU.eng = { o, o2, f, g };
  // 사이렌
  const so = c.createOscillator(); so.type = 'sawtooth'; const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 900; sf.Q.value = 2; const sg = c.createGain(); sg.gain.value = 0; so.connect(sf); sf.connect(sg); sg.connect(AU.sfx); so.start(); AU.siren = { o: so, g: sg };
  // 도시 소음
  const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 300; const ng = c.createGain(); ng.gain.value = .05; ns.connect(nf); nf.connect(ng); ng.connect(AU.sfx); ns.start(); AU.amb = ng;
}
function noiseHit(dur, freq, vol, type) { const c = AU.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; const g = c.createGain(); const t = c.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(t, Math.random()); s.stop(t + dur + .05); }
function tone(freq, dur, vol, type, slide, when) { const c = AU.ctx; if (!c) return; const o = c.createOscillator(); o.type = type || 'sine'; const g = c.createGain(); const t = c.currentTime + (when || 0); o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AU.sfx); o.start(t); o.stop(t + dur + .05); }
const SFX = {
  punch() { noiseHit(.12, 900, .7); tone(110, .12, .5, 'sine', 50); },
  whoosh() { noiseHit(.15, 2500, .18, 'bandpass'); },
  crash(k) { k = clamp(k || 1, .2, 1.5); noiseHit(.5 * k, 700, .9 * k); tone(70, .3, .6 * k, 'sine', 35); noiseHit(.25, 3500, .25 * k, 'highpass'); },
  horn() { tone(370, .35, .25, 'square'); tone(466, .35, .2, 'square'); },
  door() { noiseHit(.08, 500, .5); tone(160, .08, .3, 'square', 90); },
  cash() { tone(1320, .08, .25, 'square'); tone(1760, .16, .22, 'square', null, .07); },
  boom() { noiseHit(1.6, 400, 1.2); tone(55, 1, .9, 'sine', 25); },
  step() { noiseHit(.04, 1200, .05, 'bandpass'); },
  pass() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, .25, 'triangle', null, i * .12)); tone(1047, .9, .2, 'triangle', null, .5); },
  fail() { [392, 330, 262].forEach((f, i) => tone(f, .4, .25, 'triangle', null, i * .18)); },
  star() { tone(880, .12, .2, 'square'); tone(660, .2, .2, 'square', null, .1); },
  hurt() { tone(220, .15, .25, 'sawtooth', 120); },
  click() { tone(900, .05, .15, 'square'); },
  gun(w, v) { v = v == null ? 1 : v; if (w === 'shotgun') { noiseHit(.35, 1800, .9 * v); tone(70, .25, .6 * v, 'sine', 30); } else if (w === 'smg') { noiseHit(.08, 3200, .45 * v, 'bandpass'); tone(140, .06, .25 * v, 'square', 60); } else { noiseHit(.16, 2600, .7 * v); tone(110, .12, .45 * v, 'sine', 45); } }
};
function engineUpdate(on, speed, max) { if (!AU.eng) return; const t = AU.ctx.currentTime; const k = clamp(Math.abs(speed) / (max || 40), 0, 1); const gear = Math.min(4, Math.floor(k * 5)); const rpm = (k * 5 - gear) * .6 + .3; const f = 38 + rpm * 70 + gear * 6;
  AU.eng.o.frequency.setTargetAtTime(f, t, .05); AU.eng.o2.frequency.setTargetAtTime(f * .5, t, .05); AU.eng.f.frequency.setTargetAtTime(300 + rpm * 900, t, .05); AU.eng.g.gain.setTargetAtTime(on ? .09 + k * .06 : 0, t, .1); }
function sirenUpdate(on, t) { if (!AU.siren) return; const c = AU.ctx.currentTime; AU.siren.g.gain.setTargetAtTime(on ? .045 : 0, c, .2); AU.siren.o.frequency.setTargetAtTime(700 + Math.sin(t * 5) * 250, c, .03); }

/* ---------- 라디오 (직접 만든 노래) ---------- */
const STATIONS = [
  { n: '라디오 끄기', off: 1 },
  { n: '서울 팝 FM 98.1', bpm: 118, scale: [0, 2, 4, 7, 9], root: 57, prog: [0, 5, 3, 4], lead: 'square', drums: 'pop' },
  { n: '한밤의 재즈 89.1', bpm: 92, scale: [0, 2, 3, 5, 7, 9, 10], root: 50, prog: [1, 4, 0, 5], lead: 'triangle', drums: 'jazz' },
  { n: '신나는 트로트 101.3', bpm: 132, scale: [0, 2, 3, 7, 8], root: 57, prog: [0, 3, 4, 0], lead: 'sawtooth', drums: 'trot' },
  { n: '힙합 서울 104.5', bpm: 88, scale: [0, 3, 5, 7, 10], root: 45, prog: [0, 0, 5, 3], lead: 'square', drums: 'hiphop' }
];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function mtone(freq, t, dur, vol, type, dest) { const c = AU.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(dest || AU.music); o.start(t); o.stop(t + dur + .02); }
function mnoise(t, dur, freq, vol, type) { const c = AU.ctx; const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(AU.music); s.start(t, Math.random()); s.stop(t + dur + .02); }
function radioTick(playing) {
  const R_ = AU.radio; if (!AU.ctx) return; const S = STATIONS[R_.st]; if (!playing || S.off) { R_.next = 0; return; }
  const c = AU.ctx, spb = 60 / S.bpm / 2; if (!R_.next || R_.next < c.currentTime) { R_.next = c.currentTime + .05; }
  if (!R_.mel || R_.melSt !== R_.st) { R_.melSt = R_.st; R_.mel = []; let n = 2; for (let i = 0; i < 32; i++) { n = clamp(n + randi(-2, 2), 0, S.scale.length * 2 - 1); R_.mel.push(Math.random() < .3 ? null : n); } }
  while (R_.next < c.currentTime + .25) {
    const t = R_.next, st = R_.step % 32, bar = Math.floor(R_.step / 8) % 4, chord = S.prog[bar], root = S.root + S.scale[chord % S.scale.length];
    const d = S.drums;
    if (d === 'pop' || d === 'trot') { if (st % 4 === 0) mtone(60, t, .18, .5, 'sine'); if (st % 8 === 4) mnoise(t, .14, 1800, .25, 'bandpass'); mnoise(t, .04, 8000, d === 'trot' ? .12 : .07, 'highpass'); }
    if (d === 'hiphop') { if (st % 8 === 0 || st % 16 === 11) mtone(55, t, .3, .55, 'sine'); if (st % 8 === 4) mnoise(t, .18, 1500, .3, 'bandpass'); if (st % 2 === 0) mnoise(t, .03, 9000, .07, 'highpass'); }
    if (d === 'jazz') { if (st % 3 === 0) mnoise(t, .2, 6000, .05, 'highpass'); if (st % 8 === 0) mtone(70, t, .2, .3, 'sine'); }
    if (st % 2 === 0) mtone(mtof(root - 12 + (d === 'jazz' ? [0, 4, 7, 9][(st / 2) % 4 | 0] : (st % 4 === 2 ? 7 : 0))), t, spb * 1.8, .22, d === 'jazz' ? 'triangle' : 'sawtooth');
    if (st % 8 === 0) for (const k of [0, 4, 7]) mtone(mtof(root + k), t, spb * 7, .05, 'triangle');
    const m = R_.mel[st]; if (m != null && (d !== 'hiphop' || st % 2 === 0)) { const oct = Math.floor(m / S.scale.length), deg = S.scale[m % S.scale.length]; mtone(mtof(S.root + 12 + deg + oct * 12), t, spb * (d === 'trot' ? 1.6 : 1.2), .07, S.lead); }
    R_.step++; R_.next += spb;
  }
}
