'use strict';
/* ===== 진짜 목소리 (미리 만든 음성 파일) =====
   목소리마다 대사를 한 파일로 묶어 두고(스프라이트), 필요할 때만 불러와요. */
const VOX = {
  male: ['am_adam', 'am_eric', 'am_liam', 'am_michael', 'am_puck', 'bm_george'],
  female: ['af_heart', 'af_bella', 'af_jessica', 'af_nicole', 'af_sarah', 'bf_emma'],
  cop: ['am_fenrir', 'bm_fable'],
  bank: {}, loading: {}, playing: [], subT: 0
};
const CATS = { hit: 6, angry: 4, flee: 4, gun: 3, bump: 4, jacked: 2, carnear: 2, greet: 3, phone: 3 };
const COPCATS = { freeze: 3, ground: 2, armed: 3, backup: 3 };
function voxFile(v) { return v === 'dispatch' || v === 'story' || v === 'chat' ? v : VOX.cop.includes(v) && !v.endsWith('_cop') ? 'v_' + v + '_cop' : 'v_' + v; }
function voxLoad(name) {
  if (VOX.bank[name] || VOX.loading[name] || !AU.ctx) return;
  VOX.loading[name] = Promise.all([fetch('../seoul/assets/voice/' + name + '.json').then(r => r.json()), fetch('../seoul/assets/voice/' + name + '.mp3').then(r => r.arrayBuffer())])
    .then(([meta, buf]) => new Promise((res, rej) => AU.ctx.decodeAudioData(buf, res, rej)).then(b => { VOX.bank[name] = { meta, buf: b }; }))
    .catch(e => { console.warn('목소리', name, e); setTimeout(() => { delete VOX.loading[name]; }, 8000); });
}
/* 소리 내기: x,z가 있으면 거리에 따라 작아지고 좌우로 나뉘어요 */
function voxPlay(name, id, x, z, opt) {
  opt = opt || {}; if (!AU.ctx || !AU.on) return 0; const B = VOX.bank[name]; if (!B) { voxLoad(name); return 0; } const m = B.meta[id]; if (!m) return 0;
  let vol = opt.vol == null ? 1 : opt.vol, pan = 0;
  if (x != null) { const dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz); if (d > 40) return 0; vol *= clamp(1.15 - d / 34, 0, 1); const r = new T.Vector3(); cam.getWorldDirection(r); const rx = -r.z, rz = r.x; pan = clamp((dx * rx + dz * rz) / (d || 1), -1, 1) * .7; }
  if (vol < .03) return 0;
  VOX.playing = VOX.playing.filter(p => p.end > AU.ctx.currentTime); if (VOX.playing.length >= (opt.story ? 8 : 4)) return 0;
  const src = AU.ctx.createBufferSource(); src.buffer = B.buf; src.playbackRate.value = opt.rate || 1; const g = AU.ctx.createGain(); g.gain.value = vol * 1.1;
  let node = src; if (opt.radio) { const bp = AU.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.4; const ws = AU.ctx.createWaveShaper(); const cu = new Float32Array(256); for (let i = 0; i < 256; i++) { const x_ = i / 128 - 1; cu[i] = Math.tanh(x_ * 3); } ws.curve = cu; node.connect(bp); bp.connect(ws); node = ws; }
  if (AU.ctx.createStereoPanner) { const p = AU.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(g); } else node.connect(g);
  g.connect(AU.master); const t = AU.ctx.currentTime; src.start(t, m[0], m[1]); VOX.playing.push({ end: t + m[1] / (opt.rate || 1) });
  return m[1] / (opt.rate || 1);
}
function npcVoice(n) { if (!n.voice) n.voice = n.cop ? pick(VOX.cop) : n.look && n.look.w ? pick(VOX.female) : pick(VOX.male); return n.voice; }
function say(n, cat, force) {
  if (!n || n.dead || !AU.ctx) return 0; const now = G.t; if (!force && (n.sayT || 0) > now) return 0; const v = npcVoice(n);
  let id; if (n.cop) { const c = COPCATS[cat] ? cat : 'freeze'; id = c + randi(0, COPCATS[c] - 1); } else { if (!CATS[cat]) return 0; id = cat + randi(0, CATS[cat] - 1); }
  const d = voxPlay(voxFile(v), id, n.x, n.z, { rate: n.look && n.look.s ? clamp(1.04 - (n.look.s - 1) * .8, .92, 1.1) : 1 }); if (d) n.sayT = now + d + rand(2, 4); else n.sayT = now + .5; return d;
}
/* 미션 대사 (자막과 함께) */
const SUBS = {
  b_job: '박 사장: 어이, 일거리 있어.', b_good: '박 사장: 잘했어! 네 몫이야.', b_bad: '박 사장: 망쳤네. 다시 해 봐.',
  r1a: '레이: 네가 새로 온 녀석이군. 배짱 좀 볼까? 권총 줄게. 편의점 털어. 빨리 들어갔다 나와.', r1b: '레이: 나쁘지 않은데, 신입.',
  r2a: '레이: 시내에 보석상이 있어. 진열장 깨고 다이아 챙겨. 경찰 오기까지 45초야.', r2b: '레이: 이런 게 진짜 쇼핑이지.',
  r4a: '레이: 드디어 큰 거다. 서울중앙은행. 민이 현장에서 기다려. 금고 열고, 욕심내지 마.', r4b: '레이: 전부 엎드려! 아무도 안 다쳐!', r4c: '레이: 밖에 경찰이다! 가자, 가자!', r4d: '레이: 해냈다! 우린 부자야!',
  r5a: '레이: 민이 사라졌어. 돈 들고 튀었다고! 찾아내!', r5b: '레이: 이제 서울은 우리 거야.', r_bad: '레이: 엉망이네. 다시 하자.',
  m3a: '민: 안녕, 난 민이야. 은행 일정 해킹했어. 현금 수송차가 지금 출발해. 세워서 돈 챙겨.', m3b: '민: 좋아! 돈 엄청 많다.',
  m4a: '민: 드릴 돌아간다. 경찰 좀 막아 줘!', m4b: '민: 절반 왔어!', m4c: '민: 금고 열렸어! 돈 챙겨!',
  m5a: '민: 미안, 오빠들. 개인적인 감정은 없어!', m5b: '민: 알았어, 알았어! 가져가! 미안해!',
  k1: '점원: 쏘지 마세요! 돈 가져가세요!', k2: '점원: 알았어요, 알았어요! 다 가져가요!', k3: '점원: 누가 경찰 좀 불러요!',
  g1: '경비: 거기 멈춰!', g2: '경비: 공격받고 있다!', g3: '경비: 경비다! 꼼짝 마!'
};
function story(id, x, z) { const d = voxPlay('story', id, x, z, { story: true, vol: x == null ? .95 : 1 }); const s = SUBS[id]; if (s) { const e = $('#sub'); e.textContent = s; e.hidden = false; clearTimeout(story.t); story.t = setTimeout(() => e.hidden = true, Math.max(2500, (d || s.length * .09) * 1000 + 600)); } return d || s && s.length * .07 || 2; }
function dispatch(i) { voxPlay('dispatch', 'd' + i, null, null, { radio: true, vol: .55 }); }
function voxPreload() { if (!AU.ctx) return; voxLoad('story'); voxLoad('dispatch'); voxLoad('chat'); for (const v of VOX.cop) voxLoad(voxFile(v)); }

/* ---------- 사람들끼리 대화 ---------- */
const CHATS = 8;
function chatTick(dt) {
  if ((G.chatT = (G.chatT || 3) - dt) > 0 || !AU.ctx) return; G.chatT = rand(4, 8);
  const cands = NPCS.filter(n => !n.cop && !n.mission && !n.dead && n.ko <= 0 && (n.st === 'walk' || n.st === 'idle') && Math.hypot(n.x - PL.x, n.z - PL.z) < 26);
  for (const a of cands) { const b = cands.find(o => o !== a && Math.hypot(o.x - a.x, o.z - a.z) < 4.5); if (b) { startChat(a, b); return; } }
  // 짝이 없으면 한 명을 옆 사람에게 데려가요
  const a = cands[0]; if (a && Math.random() < .5) { const b = cands.find(o => o !== a && Math.hypot(o.x - a.x, o.z - a.z) < 14); if (b) { b.st = 'idle'; b.t = 8; a.st = 'goto'; a.tgt = [b.x + .9, b.z + .4]; a.onArrive = n => startChat(n, b); } }
}
function startChat(a, b) {
  const k = randi(0, CHATS - 1); a.st = b.st = 'talk'; a.t = b.t = 12; a.face = [b.x, b.z]; b.face = [a.x, a.z]; a.P.pose = b.P.pose = null; a.chatWith = b; b.chatWith = a;
  const g = n => n.look && n.look.w ? 'f' : 'm'; const d1 = voxPlay('chat', 'c' + k + 'a_' + g(a), a.x, a.z) || 2.2; setAnim(a.P, 'agree', 1);
  setTimeout(() => { if (b.st !== 'talk') return; const d2 = voxPlay('chat', 'c' + k + 'b_' + g(b), b.x, b.z) || 2.2; setAnim(b.P, 'headShake', 1); setAnim(a.P, 'idle', 1);
    setTimeout(() => { for (const n of [a, b]) if (n.st === 'talk') { n.st = 'idle'; n.t = rand(1, 3); n.chatWith = null; setAnim(n.P, 'idle', 1); } }, d2 * 1000 + 600); }, d1 * 1000 + 350);
}
