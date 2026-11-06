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
function persist() { SAVE._t = Date.now(); try { localStorage.setItem('blip_soccer_v1', JSON.stringify(SAVE)); } catch (e) { } if (window.BLIP && BLIP.cloud && BLIP.loggedIn && SAVE._acc === BLIP.me.acc) BLIP.cloud.saveSoon('soccer', () => SAVE); }
/* 허브 계정 저장: 로그인하면 계정(서버)에 저장 → 다른 기기에서도 이어서. 게스트로 하던 저장은 계정 저장을 덮어쓰지 않아요 */
async function cloudPull() {
  if (!window.BLIP || !BLIP.cloud || !BLIP.loggedIn) return; const acc = BLIP.me.acc; const r = await BLIP.cloud.load('soccer'); const mine = SAVE._acc === acc;
  if (r && r.d && (!mine || (r.d._t || 0) > (SAVE._t || 0))) { // 계정 저장을 불러와요
    if (!mine) { try { localStorage.setItem('blip_soccer_v1_guest', JSON.stringify(SAVE)); } catch (e) { } }
    for (const k of Object.keys(SAVE)) delete SAVE[k]; Object.assign(SAVE, r.d); SAVE._acc = acc; try { localStorage.setItem('blip_soccer_v1', JSON.stringify(SAVE)); } catch (e) { }
    if (typeof onCloudLoaded === 'function') onCloudLoaded(); toast('☁️ 허브 계정에 저장된 구단을 불러왔어요', 2600);
  } else { SAVE._acc = acc; persist(); BLIP.cloud.save('soccer', SAVE); } // 계정에 저장이 없거나 이 기기 게 더 최근이면 올려요
}

