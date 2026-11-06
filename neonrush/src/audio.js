// ===== Original synth soundtrack (WebAudio) =====
const Music = (() => {
  let ctx = null, master = null, run = null, timer = null, startT = 0, step = 0, nextT = 0, muted = false, noiseBuf = null;
  let BPM = 132, SPB = 60 / BPM, STEP = SPB / 4, TR = 0, chords, bassRoots, lead, kickPat, style = 0;
  const PROGS = [
    [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // i VI III VII
    [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]],   // i VII VI V
    [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],   // I V vi IV
    [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],   // dm Bb C A
  ];
  const LEADS = [
    [76, 0, 74, 76, 0, 72, 74, 0, 71, 72, 0, 74, 72, 0, 69, 0],
    [69, 72, 76, 0, 74, 0, 72, 74, 0, 76, 79, 0, 76, 74, 72, 0],
    [81, 0, 79, 0, 76, 0, 79, 81, 0, 84, 0, 81, 79, 0, 76, 0],
    [72, 72, 0, 74, 76, 0, 74, 72, 69, 0, 72, 0, 67, 69, 0, 0],
  ];
  function configure(cfg = {}) {
    BPM = cfg.bpm || 132; SPB = 60 / BPM; STEP = SPB / 4; TR = cfg.tr || 0; style = cfg.style || 0;
    chords = PROGS[(cfg.prog || 0) % PROGS.length].map(c => c.map(n => n + TR));
    bassRoots = chords.map(c => c[0] - 12);
    lead = LEADS[(cfg.lead || 0) % LEADS.length].map(n => n ? n + TR : 0);
    kickPat = style === 2 ? [0, 3, 6, 10, 12] : style === 1 ? [0, 4, 8, 12, 14] : [0, 4, 8, 12];
  }
  configure();
  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.002, 0.9, 0.28); o.connect(g); g.connect(run); o.start(t); o.stop(t + 0.32);
  }
  function noise(t, type, freq, peak, dec) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq;
    const g = ctx.createGain(); env(g, t, 0.001, peak, dec);
    s.connect(fl); fl.connect(g); g.connect(run); s.start(t); s.stop(t + dec + 0.02);
  }
  function tone(t, m, type, peak, dec, cutoff) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f(m);
    let n = o;
    if (cutoff) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cutoff * 3, t); fl.frequency.exponentialRampToValueAtTime(cutoff, t + dec); fl.Q.value = 6; o.connect(fl); n = fl; }
    env(g, t, 0.004, peak, dec); n.connect(g); g.connect(run); o.start(t); o.stop(t + dec + 0.05);
  }
  function sched(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16, sect = Math.floor(i / 64);
    const full = i >= 32;
    if (full && kickPat.includes(s)) kick(t);
    if (full && s % 4 === 2) noise(t, 'highpass', 8000, 0.18, 0.05);
    if (full && (s === 4 || s === 12)) noise(t, 'bandpass', 1800, 0.35, 0.14);
    if (s % 2 === 1 || !full) tone(t, bassRoots[bar] - (s % 4 === 3 ? -12 : 0), 'sawtooth', 0.22, STEP * 1.6, 380);
    const ch = chords[bar]; tone(t, ch[s % 3] + 12 + (s % 6 >= 3 ? 12 : 0), 'square', 0.045, STEP * 0.9, 2400);
    if (sect % 2 === 1 && lead[s]) tone(t, lead[s] + (bar === 3 ? 2 : bar === 1 ? -3 : 0), 'sawtooth', 0.08, STEP * 1.8, 3000);
    if (s === 0 && bar === 0 && i > 0) noise(t, 'highpass', 3000, 0.15, 0.6);
  }
  function loop() {
    while (nextT < ctx.currentTime + 0.15) { sched(step, nextT); step++; nextT += STEP; }
  }
  function start(cfg) {
    if (cfg) configure(cfg);
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    stop(true);
    run = ctx.createGain(); run.gain.value = 1; run.connect(master);
    startT = ctx.currentTime + 0.03; nextT = startT; step = 0;
    timer = setInterval(loop, 25); loop();
  }
  function stop(instant) {
    if (timer) clearInterval(timer); timer = null;
    if (run && ctx) { const r = run; r.gain.cancelScheduledValues(ctx.currentTime); r.gain.setValueAtTime(r.gain.value, ctx.currentTime); r.gain.linearRampToValueAtTime(0, ctx.currentTime + (instant ? 0.02 : 0.3)); setTimeout(() => r.disconnect(), 500); }
    run = null;
  }
  function sfxDie() {
    init(); if (!ctx) return;
    const g = ctx.createGain(); g.connect(master);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass';
    fl.frequency.setValueAtTime(3000, ctx.currentTime); fl.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.7, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    s.connect(fl); fl.connect(g); s.start(); s.stop(ctx.currentTime + 0.6);
  }
  function sfxWin() {
    init(); if (!ctx) return; const r0 = run; run = ctx.createGain(); run.connect(master);
    [69, 73, 76, 81].forEach((m, i) => tone(ctx.currentTime + i * 0.09, m, 'square', 0.12, 0.5, 4000));
    const r = run; setTimeout(() => r.disconnect(), 1500); run = r0;
  }
  function beat() { return ctx && timer ? (ctx.currentTime - startT) / SPB : -1; }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return muted; }
  return { configure, start, stop, sfxDie, sfxWin, beat, toggleMute, init, get muted() { return muted; } };
})();
