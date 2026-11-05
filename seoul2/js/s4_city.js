'use strict';
/* ===== STA 2: 더 꽉 찬 서울 — 공원 4곳 추가 · 거리 소품 · 모든 가게 들어가기 ===== */
const PARKS = [];
const S4 = { ponds: [], fount: [], swings: [] };
function s4Mats() {
  if (MATS.vend) return;
  const vt = ctex(128, 256, (g, W, H) => { g.fillStyle = '#c62828'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8f4ff'; g.fillRect(10, 18, W - 20, H * .55); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = `hsl(${(r * 4 + c) * 47 % 360},70%,55%)`; g.fillRect(16 + c * 25, 26 + r * 34, 16, 28); } g.fillStyle = '#111'; g.fillRect(20, H * .7, W - 40, 24); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText('음료', 40, 16); });
  stdMat('vend', { map: vt, emissive: '#fff', emissiveMap: vt, emissiveIntensity: .1, roughness: .4 }, [.1, .9]);
  const ad = ctex(256, 384, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#ff4d6d'); gr.addColorStop(1, '#7b4dff'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = `bold 46px ${DFONT}`; g.textAlign = 'center'; g.fillText('STA 2', W / 2, 120); g.font = `bold 26px ${FONT}`; g.fillText('지금 강원도로!', W / 2, 190); g.fillText('🏔️ 🌊 🎿', W / 2, 260); });
  stdMat('adPanel', { map: ad, emissive: '#fff', emissiveMap: ad, emissiveIntensity: .15, roughness: .3 }, [.15, 1]);
  stdMat('tent', { color: '#e8501f', roughness: .8, emissive: '#ff6a2a', emissiveIntensity: 0, side: T.DoubleSide }, [0, .55]);
  stdMat('court', { map: ctex(256, 256, (g, W, H) => { g.fillStyle = '#2e6b4f'; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(10, 10, W - 20, H - 20); g.beginPath(); g.moveTo(W / 2, 10); g.lineTo(W / 2, H - 10); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 30, 0, 7); g.stroke(); g.strokeRect(10, H / 2 - 50, 40, 100); g.strokeRect(W - 50, H / 2 - 50, 40, 100); }), roughness: .9 });
  stdMat('bcourt', { map: ctex(256, 256, (g, W, H) => { g.fillStyle = '#c86b2e'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f5d8a'; g.fillRect(16, 16, W - 32, H - 32); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(16, 16, W - 32, H - 32); g.beginPath(); g.arc(W / 2, 16, 60, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(W / 2, H - 16, 60, Math.PI, 7); g.stroke(); }), roughness: .8 });
  stdMat('track', { color: '#b0412e', roughness: .9 }); stdMat('sand', { color: '#e3cf9a', roughness: 1 }); stdMat('flowerR', { color: '#e8435a', roughness: .8 }); stdMat('flowerY', { color: '#ffd23f', roughness: .8 }); stdMat('flowerP', { color: '#c86bff', roughness: .8 });
  stdMat('ddareung', { color: '#2e9d4f', roughness: .5, metalness: .3 }); stdMat('stool', { color: '#d32f2f', roughness: .6 }); stdMat('bulb', { color: '#fff7c0', emissive: '#ffd27a', emissiveIntensity: .2 }, [.2, 2.5]);
}
/* ---------- 작은 소품 ---------- */
function bench(ck, x, z, yaw) { addGeo(ck, 'wood', new T.BoxGeometry(1.8, .08, .45), mat4(x, .62, z, yaw)); const b = new T.BoxGeometry(1.8, .4, .06); b.translate(0, 0, -.22); addGeo(ck, 'wood', b, mat4(x, .95, z, yaw)); for (const s of [-.8, .8]) { const l = new T.BoxGeometry(.06, .45, .45); l.translate(s, 0, 0); addGeo(ck, 'darkMetal', l, mat4(x, .4, z, yaw)); } addCircle(x, z, .5, 1); }
function lampP(ck, x, z) { addGeo(ck, 'darkMetal', new T.CylinderGeometry(.07, .1, 3.6, 6), mat4(x, 1.98, z)); addGeo(ck, 'lampHead', new T.SphereGeometry(.28, 10, 8), mat4(x, 3.9, z)); addCircle(x, z, .15, 4); }
function flowerBed(ck, x, z, w, d) { slab(ck, 'stone', x - w / 2, z - d / 2, x + w / 2, z + d / 2, .18, .55, 2, 'grass'); for (let i = 0; i < w * d * 1.2; i++) addGeo(ck, pick(['flowerR', 'flowerY', 'flowerP']), new T.IcosahedronGeometry(.16, 0), mat4(x + rand(-w / 2 + .3, w / 2 - .3), .65, z + rand(-d / 2 + .3, d / 2 - .3))); addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, .55); }
function busStop(ck, x, z, yaw) { const f = [Math.sin(yaw), Math.cos(yaw)]; addGeo(ck, 'metal', new T.BoxGeometry(3.6, .08, 1.5), mat4(x, 2.6, z, yaw)); for (const s of [-1.7, 1.7]) { const p = new T.BoxGeometry(.08, 2.5, .08); p.translate(s, 0, -.6); addGeo(ck, 'darkMetal', p, mat4(x, 1.4, z, yaw)); } const bk = new T.BoxGeometry(3.4, 1.9, .05); bk.translate(0, 0, -.68); addGeo(ck, 'glassDark', bk, mat4(x, 1.45, z, yaw)); const ad = new T.BoxGeometry(1.1, 1.6, .12); ad.translate(1.2, 0, -.6); addGeo(ck, 'adPanel', ad, mat4(x, 1.3, z, yaw)); const sb = new T.BoxGeometry(2, .1, .4); sb.translate(-.5, 0, -.4); addGeo(ck, 'wood', sb, mat4(x, .62, z, yaw)); const s = SIGNS.slots.byName['버스정류장']; addBox(x - 1.8, z - .9, x + 1.8, z + .9, 2.7, null); }
function vending(ck, x, z, yaw) { addGeo(ck, 'vend', new T.BoxGeometry(.9, 1.9, .75), mat4(x, 1.13, z, yaw)); addCircle(x, z, .55, 2); }
function bin(ck, x, z) { addGeo(ck, 'darkMetal', new T.CylinderGeometry(.28, .24, .85, 10), mat4(x, .6, z)); addGeo(ck, 'green', new T.CylinderGeometry(.3, .3, .06, 10), mat4(x, 1.05, z)); addCircle(x, z, .3, 1); }
function hydrant(ck, x, z) { addGeo(ck, 'red', new T.CylinderGeometry(.13, .16, .6, 8), mat4(x, .48, z)); addGeo(ck, 'yellow', new T.SphereGeometry(.15, 8, 6), mat4(x, .8, z)); }
function bikeRack(ck, x, z, yaw) { for (let i = -2; i <= 2; i++) { const g = new T.TorusGeometry(.33, .035, 6, 14); g.rotateY(Math.PI / 2); g.translate(0, 0, i * .6); addGeo(ck, 'ddareung', g, mat4(x, .55, z, yaw)); const fr = new T.BoxGeometry(.05, .05, .9); fr.rotateX(.2); fr.translate(0, .25, i * .6); addGeo(ck, 'ddareung', fr, mat4(x, .55, z, yaw + Math.PI / 2)); } addBox(x - .6, z - .6, x + .6, z + .6, 1); }
function pocha(ck, x, z, yaw) { (S4.stalls = S4.stalls || []).push({ x, z, name: '포장마차', r: 2.6 }); const t = new T.BoxGeometry(3.4, .08, 2.6); addGeo(ck, 'tent', t, mat4(x, 2.4, z, yaw)); for (const [a, b] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) { const p = new T.BoxGeometry(.06, 2.3, .06); p.translate(a, 0, b); addGeo(ck, 'darkMetal', p, mat4(x, 1.33, z, yaw)); } for (const s of [-1, 1]) { const w = new T.BoxGeometry(3.3, 1.9, .04); w.translate(0, 0, s * 1.25); addGeo(ck, 'tent', w, mat4(x, 1.3, z, yaw)); } addGeo(ck, 'stool', new T.BoxGeometry(1.4, .7, .7), mat4(x, .55, z, yaw)); for (let i = 0; i < 4; i++) addGeo(ck, 'stool', new T.CylinderGeometry(.16, .16, .45, 8), mat4(x + Math.cos(i * 1.6 + yaw) * .9, .4, z + Math.sin(i * 1.6 + yaw) * .9)); for (let i = -1; i <= 1; i++) { const b = new T.SphereGeometry(.09, 6, 5); b.translate(i * 1.1, 0, 0); addGeo(ck, 'bulb', b, mat4(x, 2.25, z, yaw)); } addBox(x - 1.7, z - 1.3, x + 1.7, z + 1.3, 2.4); }
function planter(ck, x, z) { addGeo(ck, 'concrete', new T.CylinderGeometry(.55, .45, .55, 10), mat4(x, .46, z)); addGeo(ck, pick(['flowerR', 'flowerY', 'flowerP', 'leaf']), new T.IcosahedronGeometry(.45, 1), mat4(x, .9, z, 0, 1, .6, 1)); addCircle(x, z, .55, 1); }
/* ---------- 거리 소품 깔기 ---------- */
function streetFurniture() {
  s4Mats(); const r = mulberry(4321);
  for (let bi = -NR; bi < NR; bi++) for (let bj = -NR; bj < NR; bj++) {
    const bx0 = bi * P + RH, bz0 = bj * P + RH, bx1 = (bi + 1) * P - RH, bz1 = (bj + 1) * P - RH; const ck = chunkOf((bx0 + bx1) / 2, (bz0 + bz1) / 2); const e = .75;
    const sides = [['S', bz1 - e, 0], ['N', bz0 + e, Math.PI], ['E', bx1 - e, Math.PI / 2], ['W', bx0 + e, -Math.PI / 2]];
    for (const [sd, line, yaw] of sides) {
      const alongX = sd === 'S' || sd === 'N'; const a0 = (alongX ? bx0 : bz0) + 13, a1 = (alongX ? bx1 : bz1) - 13; let busDone = false;
      for (let a = a0; a < a1; a += 9 + r() * 6) {
        const x = alongX ? a : line, z = alongX ? line : a; if (TREES.some(t => Math.abs(t[0] - x) < 1.6 && Math.abs(t[1] - z) < 1.6)) continue; if (BUILD.shops.some(s => Math.abs(s.x - x) < 1.8 && Math.abs(s.z - z) < 1.8)) continue;
        const k = r(); const fy = yaw + Math.PI;
        if (!busDone && k < .14 && (bi + bj) % 2 === 0) { busStop(ck, x, z, yaw + Math.PI); busDone = true; }
        else if (k < .32) bench(ck, x, z, fy); else if (k < .42) vending(ck, x, z, fy); else if (k < .58) bin(ck, x, z); else if (k < .66) hydrant(ck, x, z); else if (k < .78) planter(ck, x, z); else if (k < .86) bikeRack(ck, alongX ? x : x, z, yaw + Math.PI / 2); else if (k < .9 && (bi * 7 + bj * 3) % 4 === 0) pocha(ck, alongX ? x : x, alongX ? z : z, yaw);
      }
    }
  }
}
/* ---------- 새 공원 ---------- */
const PARK_KIND = { '-2,-2': 'lake', '1,1': 'sports', '-3,2': 'play', '0,2': 'culture' };
const _genBlockS4 = genBlock; genBlock = function (bi, bj) { const k = PARK_KIND[bi + ',' + bj]; if (!k) return _genBlockS4(bi, bj); s4Mats(); makePark(k, bi, bj); };
function makePark(kind, bi, bj) {
  const bx0 = bi * P + RH, bz0 = bj * P + RH, bx1 = (bi + 1) * P - RH, bz1 = (bj + 1) * P - RH, lx0 = bx0 + SW, lz0 = bz0 + SW, lx1 = bx1 - SW, lz1 = bz1 - SW, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2; const ck = chunkOf(cx, cz);
  slab(ck, 'curb', bx0, bz0, bx1, bz1, 0, .18, 4, 'paving'); roof(ck, 'grass', lx0, lz0, lx1, lz1, .19, 6); trees(bx0, bz0, bx1, bz1, 'ginkgo');
  const name = { lake: '호수공원', sports: '한강 체육공원', play: '숲속 놀이터 공원', culture: '문화광장' }[kind]; PARKS.push({ kind, name, x: cx, z: cz, x0: lx0 + 2, z0: lz0 + 2, x1: lx1 - 2, z1: lz1 - 2 });
  const path = (x0, z0, x1, z1) => roof(ck, 'paving', x0, z0, x1, z1, .2, 4);
  if (typeof parkKiosks === 'function') parkKiosks(kind, cx, cz, lx0, lz0, lx1, lz1);
  if (kind === 'lake') {
    path(cx - 1.8, lz0, cx + 1.8, lz1); path(lx0, cz - 1.8, lx1, cz + 1.8); S4.ponds.push({ x: cx - 14, z: cz - 14, r: 11 }); S4.ponds.push({ x: cx + 15, z: cz + 13, r: 8 });
    for (const p of S4.ponds.slice(-2)) { addGeo(ck, 'stone', new T.TorusGeometry(p.r, .35, 6, 32).rotateX(Math.PI / 2), mat4(p.x, .25, p.z)); addCircle(p.x, p.z, p.r - .2, 1.2); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; tree(p.x + Math.cos(a) * (p.r + 3.5), p.z + Math.sin(a) * (p.r + 3.5), k % 2 ? 'leaf' : 'ginkgo', true); } }
    // 정자
    const gx = cx + 14, gz = cz - 15; for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) addGeo(ck, 'wood', new T.CylinderGeometry(.15, .15, 3, 8), mat4(gx + a, 1.68, gz + b)); slab(ck, 'wood', gx - 2.6, gz - 2.6, gx + 2.6, gz + 2.6, .18, .6, 2); addGeo(ck, 'hanokRoof', new T.ConeGeometry(4.2, 1.8, 4), mat4(gx, 4, gz, Math.PI / 4)); addGeo(ck, 'dancheong', new T.BoxGeometry(5, .3, 5), mat4(gx, 3.15, gz)); addBox(gx - 2.6, gz - 2.6, gx + 2.6, gz + 2.6, .6);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; bench(ck, cx + Math.cos(a) * 8, cz + Math.sin(a) * 8, -a + Math.PI / 2); } for (const [x, z] of [[cx - 4, cz - 4], [cx + 4, cz + 4], [cx - 4, cz + 4], [cx + 4, cz - 4]]) lampP(ck, x, z);
    flowerBed(ck, cx - 18, cz + 16, 8, 4); flowerBed(ck, cx + 18, cz - 1, 4, 8);
  }
  if (kind === 'sports') {
    roof(ck, 'track', lx0 + 2, lz0 + 2, lx1 - 2, lz1 - 2, .195, 6); roof(ck, 'grass', lx0 + 6, lz0 + 6, lx1 - 6, lz1 - 6, .2, 6);
    addGeo(ck, 'court', new T.PlaneGeometry(lx1 - lx0 - 16, cz - 2 - lz0 - 8).rotateX(-Math.PI / 2), mat4(cx, .21, (lz0 + 8 + cz - 2) / 2)); // 풋살장
    for (const s of [-1, 1]) { const gx = s < 0 ? lx0 + 8.5 : lx1 - 8.5; for (const zz of [-1.8, 1.8]) addGeo(ck, 'white', new T.CylinderGeometry(.06, .06, 2, 6), mat4(gx, 1.2, (lz0 + 8 + cz - 2) / 2 + zz)); addGeo(ck, 'white', new T.BoxGeometry(.12, .12, 3.7), mat4(gx, 2.2, (lz0 + 8 + cz - 2) / 2)); }
    for (const [a0, a1] of [[lx0 + 8, cx - 1], [cx + 1, lx1 - 8]]) addGeo(ck, 'bcourt', new T.PlaneGeometry(a1 - a0, lz1 - 8 - cz - 2).rotateX(-Math.PI / 2), mat4((a0 + a1) / 2, .21, (cz + 2 + lz1 - 8) / 2));
    for (const [hx0, hx1] of [[lx0 + 8, cx - 1], [cx + 1, lx1 - 8]]) for (const s of [-1, 1]) { const hz = s < 0 ? cz + 3 : lz1 - 9, hx = (hx0 + hx1) / 2; addGeo(ck, 'darkMetal', new T.CylinderGeometry(.08, .1, 3.3, 6), mat4(hx, 1.8, hz - s * .2)); addGeo(ck, 'white', new T.BoxGeometry(1.6, 1, .06), mat4(hx, 3.3, hz + s * .3)); addGeo(ck, 'red', new T.TorusGeometry(.24, .025, 6, 14).rotateX(Math.PI / 2), mat4(hx, 3.0, hz + s * .6)); addCircle(hx, hz - s * .2, .2, 4); }
    for (let k = 0; k < 6; k++) bench(ck, lx0 + 4, lz0 + 10 + k * 8, Math.PI / 2); for (let k = 0; k < 4; k++) lampP(ck, lx1 - 4, lz0 + 10 + k * 14);
    // 철봉 · 운동기구
    for (let k = 0; k < 3; k++) { const x = lx1 - 4.5, z = cz - 6 + k * 3; addGeo(ck, 'yellow', new T.BoxGeometry(.1, 2.2, .1), mat4(x, 1.3, z - .8)); addGeo(ck, 'yellow', new T.BoxGeometry(.1, 2.2, .1), mat4(x, 1.3, z + .8)); addGeo(ck, 'metal', new T.CylinderGeometry(.04, .04, 1.6, 6).rotateX(Math.PI / 2), mat4(x, 2.3, z)); }
  }
  if (kind === 'play') {
    path(lx0, cz - 1.5, lx1, cz + 1.5); trees(lx0 + 3, lz0 + 3, lx1 - 3, lz1 - 3, 'pine', 0, true); trees(lx0 + 3, lz0 + 3, lx1 - 3, lz1 - 3, 'leaf', 0, true);
    const px = cx - 10, pz = cz + 12; roof(ck, 'sand', px - 9, pz - 7, px + 9, pz + 7, .21, 4);
    // 미끄럼틀
    addGeo(ck, 'red', new T.BoxGeometry(1.6, 2.2, 1.6), mat4(px - 4, 1.3, pz)); addGeo(ck, 'blue', new T.ConeGeometry(1.3, 1, 4), mat4(px - 4, 2.9, pz, Math.PI / 4)); const sl = new T.BoxGeometry(.9, .08, 3.6); sl.rotateX(-.55); addGeo(ck, 'yellow', sl, mat4(px - 4, 1.2, pz + 2.4)); addBox(px - 4.8, pz - .8, px - 3.2, pz + .8, 2.4);
    // 그네
    for (const s of [-1, 1]) addGeo(ck, 'blue', new T.BoxGeometry(.12, 2.6, .12), mat4(px + 3, 1.5, pz + s * 2)); addGeo(ck, 'blue', new T.BoxGeometry(.14, .14, 4.2), mat4(px + 3, 2.8, pz)); S4.swings.push([px + 3, pz - 1, ck], [px + 3, pz + 1, ck]);
    // 시소 · 정글짐
    addGeo(ck, 'green', new T.BoxGeometry(.25, .12, 4), mat4(px, .55, pz - 5, 0)); addGeo(ck, 'darkMetal', new T.BoxGeometry(.3, .4, .3), mat4(px, .38, pz - 5));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { addGeo(ck, 'yellow', new T.BoxGeometry(.06, 1.8, .06), mat4(px + 6 + i * .8, 1.1, pz - 5 + j * .8)); } addGeo(ck, 'yellow', new T.BoxGeometry(1.7, .06, 1.7), mat4(px + 6.8, 2, pz - 4.2)); addBox(px + 5.8, pz - 5.2, px + 7.8, pz - 3.2, 2);
    for (let k = 0; k < 6; k++) bench(ck, px - 10 + k * 4, pz + 9, Math.PI); lampP(ck, cx, cz - 6); lampP(ck, cx + 14, cz + 2); flowerBed(ck, cx + 14, cz - 14, 6, 6);
  }
  if (kind === 'culture') {
    roof(ck, 'stone', lx0 + 4, lz0 + 4, lx1 - 4, lz1 - 4, .2, 3);
    S4.fount.push({ x: cx, z: cz }); addGeo(ck, 'stone', new T.CylinderGeometry(6, 6.4, .7, 32), mat4(cx, .5, cz)); addGeo(ck, 'stone', new T.CylinderGeometry(1, 1.4, 2.4, 16), mat4(cx, 1.4, cz)); addGeo(ck, 'stone', new T.CylinderGeometry(2.2, 1.2, .4, 16), mat4(cx, 2.7, cz)); addCircle(cx, cz, 6.2, 1); S4.ponds.push({ x: cx, z: cz, r: 5.6, y: .72 });
    // 무대
    const sx = cx, sz = lz0 + 9; slab(ck, 'wood', sx - 8, sz - 3, sx + 8, sz + 3, .2, 1.2, 3); addGeo(ck, 'darkMetal', new T.BoxGeometry(16.4, .3, 6.4), mat4(sx, 6, sz)); for (const s of [-8, 8]) addGeo(ck, 'darkMetal', new T.BoxGeometry(.3, 5, .3), mat4(sx + s, 3.6, sz - 3)); addBox(sx - 8, sz - 3, sx + 8, sz + 3, 1.2);
    for (let k = 0; k < 5; k++) addGeo(ck, 'bulb', new T.SphereGeometry(.2, 8, 6), mat4(sx - 6 + k * 3, 5.7, sz + 3));
    // 푸드트럭
    for (let k = 0; k < 3; k++) { const x = lx0 + 10 + k * 14, z = lz1 - 9; addGeo(ck, ['yellow', 'red', 'blue'][k], new T.BoxGeometry(5.5, 2.4, 2.4), mat4(x, 1.6, z)); (S4.stalls = S4.stalls || []).push({ x, z: z - 2.2, name: ['떡볶이 트럭', '타코 트럭', '츄러스 트럭'][k], r: 2.2 }); addGeo(ck, 'tent', new T.BoxGeometry(4, .08, 1.4), mat4(x, 2.6, z - 1.8)); for (const s of [-1.9, 1.9]) addGeo(ck, 'darkMetal', new T.CylinderGeometry(.4, .4, .3, 10).rotateZ(Math.PI / 2), mat4(x + s, .4, z)); addBox(x - 2.8, z - 1.2, x + 2.8, z + 1.2, 2.8); }
    for (let k = 0; k < 8; k++) bench(ck, cx - 14 + (k % 4) * 9, cz + (k < 4 ? -11 : 11), k < 4 ? 0 : Math.PI); for (const [x, z] of [[lx0 + 6, cz], [lx1 - 6, cz], [cx, lz1 - 16]]) lampP(ck, x, z); flowerBed(ck, lx0 + 8, lz0 + 8, 5, 5); flowerBed(ck, lx1 - 8, lz0 + 8, 5, 5);
  }
}
const _flushS4 = flushBuckets; flushBuckets = function () { try { s4Mats(); streetFurniture(); } catch (e) { console.error('거리 소품', e); } _flushS4(); for (const p of S4.ponds) { const m = new T.Mesh(new T.CircleGeometry(p.r, 32), WATER.material); m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y || .23, p.z); scene.add(m); } };
/* 분수 · 그네 움직임 · 공원 사람들 */
const FOUNT = { list: [] };
S2TICK.push(dt => {
  if (!FOUNT.built && G.on) { FOUNT.built = true; const mat = new T.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: .55, depthWrite: false }); for (const f of S4.fount) for (let k = 0; k < 8; k++) { const m = new T.Mesh(new T.ConeGeometry(.12, 2.2, 6, 1, true), mat); const a = k / 8 * 6.28; m.position.set(f.x + Math.cos(a) * 1.4, 3.4, f.z + Math.sin(a) * 1.4); m.rotation.z = Math.cos(a) * .6; m.rotation.x = -Math.sin(a) * .6; scene.add(m); FOUNT.list.push({ m, a }); } const c = new T.Mesh(new T.CylinderGeometry(.08, .2, 3.4, 8, 1, true), mat); for (const f of S4.fount) { const cc = c.clone(); cc.position.set(f.x, 4.6, f.z); scene.add(cc); FOUNT.list.push({ m: cc, a: -1 }); } }
  for (const f of FOUNT.list) f.m.scale.y = 1 + Math.sin(G.t * 6 + f.a * 3) * .12;
  if ((FOUNT.pt = (FOUNT.pt || 0) - dt) > 0) return; FOUNT.pt = 1.5;
  for (const pk of PARKS) { if (Math.hypot(PL.x - pk.x, PL.z - pk.z) > 110) continue; const have = NPCS.filter(n => n.parkId === pk.kind).length; if (have >= 7) continue; const x = rand(pk.x0, pk.x1), z = rand(pk.z0, pk.z1); if (inView(x, z, 25)) continue; const p = { x, z }; collideCircle(p, .4, 0); const n = spawnNPC(p.x, p.z, 'ped'); n.parkId = pk.kind; n.gwTown = null; n.st = 'goto'; n.spd = Math.random() < .3 ? 3.2 : 1.3; n.tgt = [rand(pk.x0, pk.x1), rand(pk.z0, pk.z1)]; n.onArrive = parkWander; }
});
function parkWander(n) { const pk = PARKS.find(q => q.kind === n.parkId); if (!pk) return; if (Math.random() < .35) { n.st = 'idle'; n.t = rand(4, 10); n.P.pose = Math.random() < .5 ? 'phone' : null; setTimeout(() => { if (NPCS.includes(n) && n.st === 'idle') { n.st = 'goto'; n.P.pose = null; n.tgt = [rand(pk.x0, pk.x1), rand(pk.z0, pk.z1)]; n.onArrive = parkWander; } }, rand(4000, 10000)); return; } n.st = 'goto'; n.tgt = [rand(pk.x0, pk.x1), rand(pk.z0, pk.z1)]; n.onArrive = parkWander; }
const _mapIconsPark = mapIcons; mapIcons = function () { const out = _mapIconsPark(); if (G.on) for (const pk of PARKS) out.push({ x: pk.x, z: pk.z, t: '🌳', c: '#4caf50', small: Math.hypot(pk.x - PL.x, pk.z - PL.z) > 150 }); return out; };
const _areaS4 = areaName; areaName = function (x, z) { for (const pk of PARKS) if (x > pk.x0 - 6 && x < pk.x1 + 6 && z > pk.z0 - 6 && z < pk.z1 + 6) return pk.name; return _areaS4(x, z); };
