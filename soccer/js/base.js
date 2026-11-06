'use strict';
/* ===== 블립 풋볼 11 — 공통 ===== */
const T = THREE;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a), randi = (a, b) => Math.floor(rand(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const IS_MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/.test(navigator.userAgent);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lin = c => new T.Color(c).convertSRGBToLinear();
const FONT = '"Pretendard Variable","Pretendard",system-ui,sans-serif', DFONT = '"Black Han Sans","Pretendard Variable",sans-serif';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 경기장 크기 (m) */
const PL = { L: 105, W: 68, hx: 52.5, hz: 34, gw: 7.32, gh: 2.44, br: .11 };

const cv = $('#cv');
const ren = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
ren.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 1.75));
ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.12;
ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const cam = new T.PerspectiveCamera(42, 1, .3, 900);
function resize() { ren.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, c); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy()); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function toast(t, ms) { const el = $('#toast'); el.innerHTML = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms || 2200); }
const SAVE = (() => { try { return JSON.parse(localStorage.getItem('blip_soccer_v1') || '{}') || {}; } catch (e) { return {}; } })();
/* ===== 허브 계정 저장 (폰 · 컴퓨터 같게) =====
   기기 시계 대신 '버전 번호'로 비교해요. 앱을 다시 볼 때 · 15초마다 계정 저장을 확인하고,
   두 기기에서 동시에 바뀌면 합쳐요(카드는 다 모으고 강화는 높은 쪽 · 코인 · 전적은 큰 쪽) */
const localSave = () => { try { localStorage.setItem('blip_soccer_v1', JSON.stringify(SAVE)); } catch (e) { } };
const cloudOn = () => !!(window.BLIP && BLIP.cloud && BLIP.loggedIn);
const DEVICE_KEYS = ['cam', 'mute', 'keysHide', 'portraitOK'];
const CLOUD = { busy: false, timer: 0, last: 0 };
function persist() { SAVE._t = Date.now(); SAVE._dirty = 1; localSave(); if (cloudOn()) { clearTimeout(CLOUD.timer); CLOUD.timer = setTimeout(() => cloudSync(), 900); } }
function replaceSave(d, acc) { const keep = {}; for (const k of DEVICE_KEYS) if (k in SAVE) keep[k] = SAVE[k]; for (const k of Object.keys(SAVE)) delete SAVE[k]; Object.assign(SAVE, JSON.parse(JSON.stringify(d)), keep); SAVE._acc = acc; SAVE._dirty = 0; localSave(); }
function mergeSave(a, b) { // a: 이 기기(안 올린 변경 있음) · b: 계정
  const r = JSON.parse(JSON.stringify(b)); r.keys = a.keys || b.keys;
  if (a.club && !b.club) r.club = JSON.parse(JSON.stringify(a.club));
  else if (a.club && b.club) { const A = a.club, R = r.club; R.own = R.own || {}; for (const id in A.own || {}) R.own[id] = Math.max(+R.own[id] || 0, +A.own[id] || 0);
    for (const k of ['coins', 'w', 'd', 'l', 'xp']) R[k] = Math.max(+R[k] || 0, +A[k] || 0); R.beat = Object.assign({}, A.beat || {}, R.beat || {}); if ((A.daily || '') > (R.daily || '')) R.daily = A.daily; R.base = R.base || A.base;
    R.xi = (R.xi || []).map(i => i != null && R.own[i] ? i : null); }
  r.gifts = Object.assign({}, a.gifts || {}, b.gifts || {}); return r; }
async function cloudSync(opt) {
  if (!cloudOn() || CLOUD.busy) return; if (typeof UI !== 'undefined' && UI.screen === 'game' && !(opt && opt.force)) return; CLOUD.busy = true; CLOUD.last = Date.now();
  try {
    const acc = BLIP.me.acc; const r = await BLIP.cloud.load('soccer'); const cd = r && r.d; const crev = cd ? (+cd._rev || 0) : -1; const mine = SAVE._acc === acc;
    if (!mine) { // 이 기기 저장이 이 계정 것이 아니에요 (게스트로 하던 것은 따로 보관)
      if (cd) { try { localStorage.setItem('blip_soccer_v1_guest', JSON.stringify(SAVE)); } catch (e) { } replaceSave(cd, acc); loaded('☁️ 허브 계정에 저장된 구단을 불러왔어요'); }
      else { SAVE._acc = acc; SAVE._rev = 1; SAVE._dirty = 0; localSave(); await BLIP.cloud.save('soccer', SAVE); }
      return; }
    const cloudNewer = cd && (crev > (+SAVE._rev || 0) || (cd._rev == null && SAVE._rev == null && (cd._t || 0) > (SAVE._t || 0)));
    if (cloudNewer) { // 다른 기기에서 더 새로 저장했어요
      if (SAVE._dirty) { const m = mergeSave(SAVE, cd); replaceSave(m, acc); SAVE._rev = crev + 1; localSave(); await BLIP.cloud.save('soccer', SAVE); loaded('☁️ 다른 기기에서 한 것과 합쳤어요'); }
      else { replaceSave(cd, acc); loaded('☁️ 다른 기기에서 한 것을 불러왔어요'); }
    } else if (SAVE._dirty || !cd) { SAVE._rev = Math.max(+SAVE._rev || 0, crev) + 1; SAVE._dirty = 0; localSave(); const ok = await BLIP.cloud.save('soccer', SAVE); if (!ok) SAVE._dirty = 1; }
  } catch (e) { } finally { CLOUD.busy = false; }
}
function loaded(msg) { if (typeof onCloudLoaded === 'function') onCloudLoaded(); toast(msg, 2600); }
const cloudPull = () => cloudSync();
// 앱을 다시 볼 때 · 15초마다 (경기 중엔 안 해요)
document.addEventListener('visibilitychange', () => { if (!document.hidden) cloudSync(); });
addEventListener('focus', () => { if (Date.now() - CLOUD.last > 3000) cloudSync(); });
setInterval(() => { if (!document.hidden) cloudSync(); }, 15000);
addEventListener('pagehide', () => { if (cloudOn() && SAVE._dirty && SAVE._acc === BLIP.me.acc) { SAVE._rev = (+SAVE._rev || 0) + 1; localSave(); BLIP.cloud.saveSoon('soccer', () => SAVE, 0); } });

