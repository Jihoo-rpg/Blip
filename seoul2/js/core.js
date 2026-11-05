'use strict';
/* ===== 공통: 렌더러 · 유틸 · 하늘 · 낮밤 ===== */
const T = THREE;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a), randi = (a, b) => Math.floor(rand(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const IS_MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/.test(navigator.userAgent);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = mulberry(20261102), rr = (a, b) => a + R() * (b - a), rpick = a => a[Math.floor(R() * a.length)];
const won = n => '₩' + Math.round(n).toLocaleString('ko-KR');

const QUALITY = { low: IS_MOBILE };
const cv = $('#cv');
const ren = new T.WebGLRenderer({ canvas: cv, antialias: !IS_MOBILE, powerPreference: 'high-performance' });
ren.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.25 : 1.5));
ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0;
ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const cam = new T.PerspectiveCamera(60, 1, .15, 1600);
function resize() { ren.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, c); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy()); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; if (rep.length) t.repeat.set(rep[0], rep[1]); } return t; }
const lin = c => new T.Color(c).convertSRGBToLinear();
const FONT = '"Pretendard Variable","Pretendard",system-ui,sans-serif', DFONT = '"Black Han Sans","Pretendard Variable",sans-serif';

/* ---------- 하늘 ---------- */
const skyU = { top: { value: new T.Color() }, hor: { value: new T.Color() }, bot: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color() }, night: { value: 0 } };
const sky = new T.Mesh(new T.SphereGeometry(1200, 32, 16), new T.ShaderMaterial({
  uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform vec3 top,hor,bot,sunCol,sunDir;uniform float night;varying vec3 vP;
  float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
  void main(){float y=vP.y;vec3 c=y>0.?mix(hor,top,pow(clamp(y,0.,1.),.55)):mix(hor,bot,clamp(-y*4.,0.,1.));
   float s=max(dot(vP,normalize(sunDir)),0.);c+=sunCol*(pow(s,600.)*4.+pow(s,12.)*.35);
   if(night>.01&&y>0.){vec3 q=floor(vP*420.);float st=step(.9965,h(q));c+=vec3(st)*night*.9*clamp(y*3.,0.,1.);}
   gl_FragColor=vec4(c,1.);}`
}));
sky.renderOrder = -10; scene.add(sky);

const hemi = new T.HemisphereLight('#cfe2ff', '#5a5040', .6); scene.add(hemi);
const sun = new T.DirectionalLight('#fff3e0', 1.8); sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY.low ? 1024 : 2048, QUALITY.low ? 1024 : 2048);
{ const s = sun.shadow.camera; s.left = -70; s.right = 70; s.top = 70; s.bottom = -70; s.near = 10; s.far = 400; }
sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; scene.add(sun); scene.add(sun.target);
scene.fog = new T.Fog('#bcd0e6', 160, 900);

/* ---------- 낮밤 ---------- */
const DAY = { t: 17.2, speed: 24 / (18 * 60), night: 0 }; // 18분 = 하루
const KEYS = [ // 시간, 하늘위, 지평선, 아래, 해색, 해세기, 반구, 노출
  [0, '#030614', '#0b1428', '#05070d', '#6f86b8', .25, .18],
  [5, '#0a1430', '#3a3f62', '#0d0f16', '#8090c0', .3, .22],
  [6.5, '#3b5d9a', '#f0a77a', '#2a2724', '#ffb070', 1.2, .45],
  [8, '#4f86d6', '#bcd6f2', '#4a463e', '#fff1dc', 1.8, .5],
  [16, '#3f7fd4', '#c8dcf2', '#4a463e', '#fff0d6', 1.8, .5],
  [18, '#3d5fa8', '#ffb27a', '#3a3029', '#ffa060', 1.6, .5],
  [19.3, '#1d2350', '#c0607a', '#1a1518', '#ff7050', .6, .32],
  [20.5, '#070c22', '#232a50', '#07080d', '#7b8cc0', .25, .2],
  [24, '#030614', '#0b1428', '#05070d', '#6f86b8', .25, .18]];
const _c1 = new T.Color(), _c2 = new T.Color();
function dayColor(i, h) { let a = KEYS[0], b = KEYS[1]; for (let k = 0; k < KEYS.length - 1; k++) if (h >= KEYS[k][0] && h <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; } const t = (h - a[0]) / (b[0] - a[0] || 1); if (typeof a[i] === 'number') return lerp(a[i], b[i], t); return _c1.set(a[i]).lerp(_c2.set(b[i]), t).clone(); }
const NIGHT_MATS = []; // {m, base} 밤에 빛나는 재질
function updateDay(dt, center) {
  DAY.t = (DAY.t + dt * DAY.speed) % 24; const h = DAY.t;
  const ang = (h - 6) / 12 * Math.PI; // 6시 해뜸 18시 해짐
  const sd = new T.Vector3(Math.cos(ang) * .8, Math.sin(ang), -.45).normalize();
  const night = clamp((-sd.y + .08) / .25, 0, 1); DAY.night = night;
  const isMoon = sd.y < -.05; const ld = isMoon ? sd.clone().multiplyScalar(-1).setX(-.4) : sd;
  skyU.top.value.copy(dayColor(1, h)); skyU.hor.value.copy(dayColor(2, h)); skyU.bot.value.copy(dayColor(3, h));
  skyU.sunDir.value.copy(sd); skyU.sunCol.value.copy(dayColor(4, h)).multiplyScalar(isMoon ? 0 : 1); skyU.night.value = night;
  sun.color.copy(dayColor(4, h)); sun.intensity = dayColor(5, h) * (isMoon ? .35 : 1);
  sun.position.copy(center).addScaledVector(ld, 220); sun.target.position.copy(center);
  hemi.intensity = dayColor(6, h) * 1.2; hemi.color.copy(dayColor(2, h)).lerp(_c1.set('#cfe2ff'), .5);
  scene.fog.color.copy(dayColor(2, h)).lerp(dayColor(1, h), .25);
  scene.fog.near = lerp(160, 90, night); scene.fog.far = lerp(900, 520, night);
  for (const n of NIGHT_MATS) n.m.emissiveIntensity = n.day + (n.night - n.day) * night;
  sky.position.copy(cam.position);
}

/* 반사용 환경맵 (하늘을 그림으로 그려서 만들어요) */
const PMG = new T.PMREMGenerator(ren); const ENV = {};
function envFor(h) {
  const top = dayColor(1, h), hor = dayColor(2, h), bot = dayColor(3, h);
  const tex = ctex(256, 128, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(.48, '#' + hor.getHexString()); gr.addColorStop(.52, '#' + bot.clone().lerp(hor, .3).getHexString()); gr.addColorStop(1, '#' + bot.getHexString()); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // 주변 건물 실루엣 (반사에 도시가 비치게)
    for (let x = 0; x < W; x += 6) { const bh = 6 + Math.random() * 22; g.fillStyle = 'rgba(30,34,40,.55)'; g.fillRect(x, H / 2 - bh, 5, bh); } });
  tex.mapping = T.EquirectangularReflectionMapping; const rt = PMG.fromEquirectangular(tex); tex.dispose(); return rt.texture;
}
function updateEnv() { const k = DAY.t < 5 || DAY.t > 20.5 ? 'n' : DAY.t < 7 || DAY.t > 17.5 ? 's' : 'd'; if (ENV.cur === k) return; ENV.cur = k; if (!ENV[k]) ENV[k] = envFor({ n: 23, s: 18.5, d: 13 }[k]); scene.environment = ENV[k]; }
