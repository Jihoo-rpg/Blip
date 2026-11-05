'use strict';
/* ===== 경기장: 잔디 · 라인 · 골대 · 그물 · 관중석 · 조명탑 · 광고판 ===== */
const STAD = { crowd: null, crowdN: 0, crowdBase: [], ads: [], jump: 0, flags: [] };
function buildStadium() {
  // 하늘 (해질녘 → 조명 경기)
  const sky = new T.Mesh(new T.SphereGeometry(700, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){float y=vP.y;vec3 top=vec3(.04,.07,.18),hor=vec3(.55,.36,.42),sun=vec3(1.,.55,.25);vec3 c=mix(hor,top,pow(clamp(y,0.,1.),.45));float s=pow(max(dot(vP,normalize(vec3(-.6,.12,-.8))),0.),6.);c+=sun*s*.5;if(y<0.)c=vec3(.05,.05,.08);gl_FragColor=vec4(c,1.);}' }));
  scene.add(sky); scene.fog = new T.Fog('#2a2540', 160, 520);
  scene.add(new T.HemisphereLight('#d4e2ff', '#2f4a22', .62));
  const sun = new T.DirectionalLight('#fff1d8', 1.38); sun.position.set(-30, 70, 40); sun.castShadow = true; const S = sun.shadow; S.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048); S.camera.left = -38; S.camera.right = 38; S.camera.top = 38; S.camera.bottom = -38; S.camera.near = 10; S.camera.far = 180; S.bias = -.0004; S.normalBias = .02;
  scene.add(sun); scene.add(sun.target); STAD.sun = sun;
  // 잔디: 줄무늬 + 결
  const gt = ctex(1024, 1024, (g, W, H) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#3b8632' : '#4c9e3f'; g.fillRect(i * W / 16, 0, W / 16 + 1, H); } for (let j = 0; j < 10; j++) if (j % 2) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, j * H / 10, W, H / 10 + 1); } else { g.fillStyle = 'rgba(0,0,0,.03)'; g.fillRect(0, j * H / 10, W, H / 10 + 1); } const id = g.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 26; d[i] += n * .6; d[i + 1] += n; d[i + 2] += n * .4; } g.putImageData(id, 0, 0); });
  const gx = new T.Mesh(new T.PlaneGeometry(PL.L + 14, PL.W + 12), new T.MeshStandardMaterial({ map: gt, roughness: .95 })); gx.rotation.x = -Math.PI / 2; gx.receiveShadow = true; scene.add(gx);
  const det = ctex(256, 256, (g, W, H) => { g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},.09)`; g.fillRect(Math.random() * W, Math.random() * H, 1, 3); } }, [60, 40]); det.encoding = T.LinearEncoding;
  gx.material.roughnessMap = det;
  // 잔디 결: 가까이서 보면 잎 무늬가 보여요
  const blade = ctex(256, 256, (g, W, H) => { g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); for (let i = 0; i < 14000; i++) { const v = Math.random() < .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${.06 + Math.random() * .08})`; g.fillRect(Math.random() * W, Math.random() * H, 1, 2 + Math.random() * 3); } }, [1, 1]); blade.encoding = T.LinearEncoding;
  gx.material.onBeforeCompile = sh => { sh.uniforms.uBlade = { value: blade }; sh.fragmentShader = 'uniform sampler2D uBlade;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n{ float b = texture2D(uBlade, vUv * 70.).r; float b2 = texture2D(uBlade, vUv * 13.).r; diffuseColor.rgb *= .78 + b * .3 + b2 * .14; }'); };
  const out = new T.Mesh(new T.PlaneGeometry(240, 200), new T.MeshStandardMaterial({ color: lin('#2f6a2a'), roughness: 1 })); out.rotation.x = -Math.PI / 2; out.position.y = -.02; out.receiveShadow = true; scene.add(out);
  // 라인
  const lm = new T.MeshBasicMaterial({ color: '#f2f2ee' }); const lw = .12, y = .012;
  const strip = (x0, z0, x1, z1) => { const m = new T.Mesh(new T.PlaneGeometry(Math.abs(x1 - x0) || lw, Math.abs(z1 - z0) || lw), lm); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(m); };
  const ring = (x, z, r, a0, a1) => { const m = new T.Mesh(new T.RingGeometry(r - lw / 2, r + lw / 2, 64, 1, a0, a1 - a0), lm); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); };
  const { hx, hz } = PL; strip(-hx, -hz, hx, -hz); strip(-hx, hz, hx, hz); strip(-hx, -hz, -hx, hz); strip(hx, -hz, hx, hz); strip(0, -hz, 0, hz); ring(0, 0, 9.15, 0, Math.PI * 2);
  const dot = (x, z) => { const m = new T.Mesh(new T.CircleGeometry(.2, 16), lm); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); }; dot(0, 0);
  for (const s of [-1, 1]) {
    const gxl = s * hx; strip(gxl, -20.16, gxl - s * 16.5, -20.16); strip(gxl, 20.16, gxl - s * 16.5, 20.16); strip(gxl - s * 16.5, -20.16, gxl - s * 16.5, 20.16);
    strip(gxl, -9.16, gxl - s * 5.5, -9.16); strip(gxl, 9.16, gxl - s * 5.5, 9.16); strip(gxl - s * 5.5, -9.16, gxl - s * 5.5, 9.16); dot(gxl - s * 11, 0);
    const a = Math.acos(5.5 / 9.15); ring(gxl - s * 11, 0, 9.15, s > 0 ? Math.PI - a : -a, s > 0 ? Math.PI + a : a);
    for (const sz of [-1, 1]) ring(gxl, sz * hz, 1, 0, Math.PI * 2);
  }
  // 코너 깃발
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.02, .02, 1.5, 6), new T.MeshStandardMaterial({ color: '#eee' })); p.position.set(sx * hx, .75, sz * hz); scene.add(p); const f = new T.Mesh(new T.PlaneGeometry(.4, .3), new T.MeshStandardMaterial({ color: lin('#ffd400'), side: T.DoubleSide })); f.position.set(sx * hx + .2, 1.35, sz * hz); scene.add(f); STAD.flags.push(f); }
  // 골대 + 그물
  STAD.goals = [];
  const pm = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .35, metalness: .2 });
  const nt = ctex(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * W / 8, 0); g.lineTo(i * W / 8, H); g.stroke(); g.beginPath(); g.moveTo(0, i * H / 8); g.lineTo(W, i * H / 8); g.stroke(); } });
  nt.wrapS = nt.wrapT = T.RepeatWrapping; const nm = new T.MeshStandardMaterial({ map: nt, transparent: true, side: T.DoubleSide, depthWrite: false, roughness: 1 });
  for (const s of [-1, 1]) {
    const g = new T.Group(); const x = s * hx, dep = 2.2; const r = .06;
    for (const z of [-PL.gw / 2, PL.gw / 2]) { const p = new T.Mesh(new T.CylinderGeometry(r, r, PL.gh, 12), pm); p.position.set(x, PL.gh / 2, z); p.castShadow = true; g.add(p); const bp = new T.Mesh(new T.CylinderGeometry(.03, .03, PL.gh, 6), pm); bp.position.set(x + s * dep, PL.gh / 2, z); g.add(bp); const tb = new T.Mesh(new T.CylinderGeometry(.03, .03, dep, 6), pm); tb.rotation.z = Math.PI / 2; tb.position.set(x + s * dep / 2, PL.gh, z); g.add(tb); }
    const bar = new T.Mesh(new T.CylinderGeometry(r, r, PL.gw + r * 2, 12), pm); bar.rotation.x = Math.PI / 2; bar.position.set(x, PL.gh, 0); bar.castShadow = true; g.add(bar);
    const back = new T.Mesh(new T.PlaneGeometry(PL.gw, PL.gh), nm.clone()); back.material.map = nt.clone(); back.material.map.repeat.set(9, 3); back.material.map.needsUpdate = true; back.rotation.y = Math.PI / 2; back.position.set(x + s * dep, PL.gh / 2, 0); g.add(back);
    const top = new T.Mesh(new T.PlaneGeometry(dep, PL.gw), nm.clone()); top.material.map = nt.clone(); top.material.map.repeat.set(3, 9); top.material.map.needsUpdate = true; top.rotation.x = -Math.PI / 2; top.position.set(x + s * dep / 2, PL.gh, 0); g.add(top);
    for (const z of [-PL.gw / 2, PL.gw / 2]) { const sd = new T.Mesh(new T.PlaneGeometry(dep, PL.gh), nm.clone()); sd.material.map = nt.clone(); sd.material.map.repeat.set(3, 3); sd.material.map.needsUpdate = true; sd.position.set(x + s * dep / 2, PL.gh / 2, z); g.add(sd); }
    scene.add(g); STAD.goals.push({ g, back, s, shake: 0 });
  }
  // 광고판 (LED, 글자가 흘러가요)
  const adT = ctex(2048, 128, (g, W, H) => { const ads = [['blip', '#7c5cff'], ['냥냥 점프', '#ff5fa2'], ['STA 2', '#22d3ee'], ['폰 공장 타이쿤', '#ffb703'], ['당구 마스터', '#16c784'], ['블립 풋볼 11', '#ff4d5e'], ['하프코트 레전드', '#5b5bf7'], ['차를 부수세요', '#ff7a00']]; ads.forEach((a, i) => { g.fillStyle = a[1]; g.fillRect(i * W / 8, 0, W / 8, H); g.fillStyle = '#fff'; let fs = 64; g.font = `${fs}px ${DFONT}`; while (g.measureText(a[0]).width > W / 8 - 30 && fs > 20) { fs -= 4; g.font = `${fs}px ${DFONT}`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a[0], i * W / 8 + W / 16, H / 2 + 4); }); });
  adT.wrapS = T.RepeatWrapping;
  const adM = new T.MeshBasicMaterial({ map: adT, toneMapped: false }); STAD.adT = adT;
  const adBoard = (x, z, w, ry) => { const geo = new T.BoxGeometry(w, .9, .15); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / 40); const b = new T.Mesh(geo, [new T.MeshStandardMaterial({ color: '#222' }), new T.MeshStandardMaterial({ color: '#222' }), new T.MeshStandardMaterial({ color: '#222' }), new T.MeshStandardMaterial({ color: '#222' }), adM, new T.MeshStandardMaterial({ color: '#222' })]); b.position.set(x, .45, z); b.rotation.y = ry; scene.add(b); };
  adBoard(0, -hz - 4, PL.L + 6, 0); adBoard(0, hz + 4, PL.L + 6, Math.PI); adBoard(-hx - 5, 0, PL.W + 4, Math.PI / 2); adBoard(hx + 5, 0, PL.W + 4, -Math.PI / 2);
  // 관중석: 계단 + 관중 (인스턴스)
  const standM = new T.MeshStandardMaterial({ color: lin('#2a2f3a'), roughness: .9 }); const seatCols = ['#1e2a55', '#2a3a70']; const rows = IS_MOBILE ? 16 : 22;
  const people = []; const addStand = (cx, cz, len, ry, d0) => {
    const g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; scene.add(g);
    for (let r = 0; r < rows; r++) { const st = new T.Mesh(new T.BoxGeometry(len, .55, 1.1), r % 2 ? standM : new T.MeshStandardMaterial({ color: lin(seatCols[r % 2]) })); st.position.set(0, 1 + r * .55, -(d0 + r * 1.05)); g.add(st);
      const step = IS_MOBILE ? 1.15 : .8; for (let x = -len / 2 + .5; x < len / 2 - .4; x += step) if (Math.random() < .9) people.push({ g, x: x + rand(-.12, .12), y: 1.6 + r * .55, z: -(d0 + r * 1.05) + .1, r }); }
    const back = new T.Mesh(new T.BoxGeometry(len, rows * .55 + 6, 1), standM); back.position.set(0, (rows * .55 + 6) / 2, -(d0 + rows * 1.05 + .5)); g.add(back);
    const roof = new T.Mesh(new T.BoxGeometry(len + 4, .6, 16), new T.MeshStandardMaterial({ color: lin('#c9ced8'), roughness: .5, metalness: .4 })); roof.position.set(0, rows * .55 + 9, -(d0 + rows * 1.05 - 6)); g.add(roof);
    const lit = new T.Mesh(new T.BoxGeometry(len, .2, .3), new T.MeshBasicMaterial({ color: '#fff8e0' })); lit.position.set(0, rows * .55 + 8.6, -(d0 + rows * 1.05 - 13.5)); g.add(lit);
  };
  addStand(0, -hz - 6, PL.L + 20, 0, 1); addStand(0, hz + 6, PL.L + 20, Math.PI, 1); addStand(-hx - 7, 0, PL.W + 16, Math.PI / 2, 1); addStand(hx + 7, 0, PL.W + 16, -Math.PI / 2, 1);
  const geo = new T.BoxGeometry(.42, .62, .3); geo.translate(0, .31, 0); const head = new T.SphereGeometry(.13, 6, 5); head.translate(0, .75, 0);
  const mg = mergeGeos([geo, head]);
  const im = new T.InstancedMesh(mg, new T.MeshStandardMaterial({ roughness: .9 }), people.length); const m4 = new T.Matrix4(), c = new T.Color(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), v = new T.Vector3(), e = new T.Euler();
  people.forEach((p, i) => { p.g.updateMatrixWorld(true); v.set(p.x, p.y, p.z).applyMatrix4(p.g.matrixWorld); e.set(0, p.g.rotation.y, 0); q.setFromEuler(e); m4.compose(v, q, sc); im.setMatrixAt(i, m4); STAD.crowdBase.push({ p: v.clone(), q: q.clone(), ph: Math.random() * 6.28, side: p.g.position.x * 0 + (v.x < 0 ? 0 : 1) }); im.setColorAt(i, c.set(pick(['#d7142b', '#1b3f8f', '#f4f4f4', '#ffd400', '#222', '#3a3a3a', '#8a5a3a', '#e88aa8', '#16a34a', '#ff7a1a']))); });
  im.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(im); STAD.crowd = im; STAD.crowdN = people.length;
  // 조명탑
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * (hx + 16), z = sz * (hz + 16); const pole = new T.Mesh(new T.CylinderGeometry(.5, .8, 42, 10), new T.MeshStandardMaterial({ color: '#8a8f99', metalness: .6 })); pole.position.set(x, 21, z); scene.add(pole); const pan = new T.Mesh(new T.BoxGeometry(7, 4, .6), new T.MeshBasicMaterial({ color: '#fffbe8' })); pan.position.set(x, 43, z); pan.lookAt(0, 0, 0); scene.add(pan); const sp = new T.SpotLight('#fff6e0', IS_MOBILE ? 0 : .5, 220, .6, .5); sp.position.set(x, 42, z); scene.add(sp);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: STAD.glowTex || (STAD.glowTex = ctex(128, 128, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(255,255,245,1)'); r.addColorStop(.18, 'rgba(255,248,220,.75)'); r.addColorStop(.5, 'rgba(255,230,180,.18)'); r.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = r; g.fillRect(0, 0, W, W); })), blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); gl.position.set(x * .985, 43, z * .985); gl.scale.set(26, 26, 1); scene.add(gl); }
  // 전광판
  const sbT = document.createElement('canvas'); sbT.width = 512; sbT.height = 128; STAD.sbC = sbT; STAD.sbTex = new T.CanvasTexture(sbT); STAD.sbTex.encoding = T.sRGBEncoding;
  for (const s of [-1, 1]) { const sb = new T.Mesh(new T.PlaneGeometry(16, 4), new T.MeshBasicMaterial({ map: STAD.sbTex, toneMapped: false })); sb.position.set(s * (hx + 22), 18, 0); sb.rotation.y = -s * Math.PI / 2; scene.add(sb); }
}
function mergeGeos(gs) { // 간단 합치기 (index 있는 것끼리)
  const pos = [], nor = [], idx = []; let off = 0; for (const g of gs) { const gg = g.index ? g : g; const p = gg.attributes.position.array, n = gg.attributes.normal.array; for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); } const ix = gg.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += p.length / 3; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setIndex(idx); return out;
}
function drawBoard(t0, t1, sc, clock) { const g = STAD.sbC.getContext('2d'), W = 512, H = 128; g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H); g.font = `56px ${DFONT}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(`${t0.id}  ${sc[0]} - ${sc[1]}  ${t1.id}`, W / 2, 52); g.font = `32px ${DFONT}`; g.fillStyle = '#ffd400'; g.fillText(clock, W / 2, 104); STAD.sbTex.needsUpdate = true; }
function stadiumTick(dt, t) {
  if (STAD.adT) STAD.adT.offset.x = (t * .02) % 1;
  for (const f of STAD.flags) f.rotation.y = Math.sin(t * 3 + f.position.x) * .3;
  for (const g of STAD.goals) if (g.shake > 0) { g.shake -= dt; g.back.position.x = g.s * PL.hx + g.s * (2.2 + Math.sin(g.shake * 40) * .15 * g.shake); }
  // 관중: 골 넣으면 펄쩍
  if (STAD.crowd && (STAD.jump > 0 || STAD.wave)) {
    STAD.jump = Math.max(0, STAD.jump - dt); const m4 = new T.Matrix4(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1); const step = IS_MOBILE && STAD.jump > 0 ? 2 : 1;
    for (let i = (STAD.fr = ((STAD.fr || 0) + 1) % step); i < STAD.crowdN; i += step) { const b = STAD.crowdBase[i]; const happy = STAD.jumpSide == null || b.side === STAD.jumpSide || Math.random() < .3; v.copy(b.p); if (STAD.jump > 0 && happy) v.y += Math.max(0, Math.sin(t * 9 + b.ph)) * .35; m4.compose(v, b.q, s); STAD.crowd.setMatrixAt(i, m4); }
    STAD.crowd.instanceMatrix.needsUpdate = true; STAD.wave = STAD.jump > 0;
  }
}
