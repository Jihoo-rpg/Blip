// ===== Shared art: player icons + difficulty faces (original designs) =====
const Art = (() => {
  const COLORS = ['#29e3ff', '#ff3fa4', '#7dff3a', '#ffe23c', '#ff7a1a', '#ff3030', '#b04dff', '#3a6bff',
    '#ffffff', '#9a9a9a', '#1b1b1b', '#00c9a7', '#ffb3e6', '#8b5a2b', '#c8ff8a', '#ffd9a0'];
  const DESIGNS = 16;
  const sq = (c, x, y, w, h) => { c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); };
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); c.stroke(); }

  // draws a cube icon centered at (0,0) in current transform, size s
  function cube(c, s, d, c1, c2, glow = true) {
    const h = s / 2, k = s / 100; // k = unit
    c.lineJoin = 'round'; c.lineWidth = Math.max(1.5, s * 0.07); c.strokeStyle = '#05080f';
    if (glow) { c.shadowColor = c1; c.shadowBlur = s * 0.25; }
    c.fillStyle = c1; c.fillRect(-h, -h, s, s); c.shadowBlur = 0; c.strokeRect(-h, -h, s, s);
    c.fillStyle = c2;
    switch (d % DESIGNS) {
      case 0: sq(c, -30 * k, -30 * k, 60 * k, 60 * k); c.fillStyle = c1; poly(c, [[0, -20 * k], [20 * k, 0], [0, 20 * k], [-20 * k, 0]]); break;
      case 1: // two eyes + mouth (original face)
        sq(c, -32 * k, -24 * k, 22 * k, 22 * k); sq(c, 10 * k, -24 * k, 22 * k, 22 * k); sq(c, -26 * k, 14 * k, 52 * k, 12 * k); break;
      case 2: sq(c, -40 * k, -12 * k, 80 * k, 24 * k); sq(c, -12 * k, -40 * k, 24 * k, 80 * k); break;
      case 3: for (let i = -2; i <= 2; i += 2) sq(c, -38 * k, (i * 14 - 6) * k, 76 * k, 12 * k); break;
      case 4: c.beginPath(); c.arc(0, 0, 30 * k, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = c1; c.beginPath(); c.arc(0, 0, 13 * k, 0, Math.PI * 2); c.fill(); c.stroke(); break;
      case 5: poly(c, [[-36 * k, -24 * k], [-24 * k, -36 * k], [0, -12 * k], [24 * k, -36 * k], [36 * k, -24 * k], [12 * k, 0], [36 * k, 24 * k], [24 * k, 36 * k], [0, 12 * k], [-24 * k, 36 * k], [-36 * k, 24 * k], [-12 * k, 0]]); break;
      case 6: for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) sq(c, (-36 + i * 24) * k, (-36 + j * 24) * k, 24 * k, 24 * k); break;
      case 7: poly(c, [[-30 * k, -32 * k], [10 * k, -32 * k], [36 * k, 0], [10 * k, 32 * k], [-30 * k, 32 * k], [-6 * k, 0]]); break;
      case 8: // robot visor
        sq(c, -36 * k, -20 * k, 72 * k, 26 * k); c.fillStyle = c1; sq(c, -26 * k, -12 * k, 14 * k, 10 * k); sq(c, 12 * k, -12 * k, 14 * k, 10 * k); c.fillStyle = c2; sq(c, -16 * k, 18 * k, 32 * k, 10 * k); break;
      case 9: { c.beginPath(); for (let i = 0; i < 10; i++) { const r = (i % 2 ? 15 : 36) * k, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); break; }
      case 10: poly(c, [[-38 * k, 38 * k], [38 * k, -38 * k], [38 * k, 38 * k]]); break;
      case 11: sq(c, -38 * k, -38 * k, 30 * k, 30 * k); sq(c, 8 * k, -38 * k, 30 * k, 30 * k); sq(c, -38 * k, 8 * k, 30 * k, 30 * k); sq(c, 8 * k, 8 * k, 30 * k, 30 * k); break;
      case 12: // sleepy eyes
        sq(c, -32 * k, -10 * k, 24 * k, 8 * k); sq(c, 8 * k, -10 * k, 24 * k, 8 * k); c.beginPath(); c.arc(0, 18 * k, 10 * k, 0, Math.PI); c.fill(); c.stroke(); break;
      case 13: poly(c, [[0, -38 * k], [38 * k, 0], [0, 38 * k], [-38 * k, 0]]); c.fillStyle = c1; poly(c, [[0, -18 * k], [18 * k, 0], [0, 18 * k], [-18 * k, 0]]); break;
      case 14: for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); poly(c, [[-8 * k, -38 * k], [8 * k, -38 * k], [0, -10 * k]]); c.restore(); } c.beginPath(); c.arc(0, 0, 9 * k, 0, 7); c.fill(); c.stroke(); break;
      case 15: // cyclops
        c.beginPath(); c.arc(0, -6 * k, 22 * k, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#05080f'; c.beginPath(); c.arc(4 * k, -6 * k, 9 * k, 0, 7); c.fill(); c.fillStyle = c2; sq(c, -20 * k, 24 * k, 40 * k, 8 * k); break;
    }
  }

  function ship(c, U, d, c1, c2) {
    c.save(); c.translate(-U * 0.05, -U * 0.32); cube(c, U * 0.48, d, c1, c2, false); c.restore();
    c.beginPath();
    c.moveTo(-U * 0.55, -U * 0.05); c.lineTo(U * 0.35, -U * 0.08); c.lineTo(U * 0.62, U * 0.12);
    c.lineTo(U * 0.3, U * 0.32); c.lineTo(-U * 0.45, U * 0.32); c.lineTo(-U * 0.6, U * 0.12); c.closePath();
    c.fillStyle = c1; c.shadowColor = c1; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0;
    c.lineWidth = U * 0.07; c.strokeStyle = '#05080f'; c.lineJoin = 'round'; c.stroke();
    c.fillStyle = c2; c.beginPath(); c.moveTo(-U * 0.3, U * 0.06); c.lineTo(U * 0.3, U * 0.06); c.lineTo(U * 0.2, U * 0.2); c.lineTo(-U * 0.35, U * 0.2); c.closePath(); c.fill(); c.stroke();
  }

  // Difficulty faces (own designs): 0 easy .. 5 demon
  const FACE_COL = [['#7fe3ff', '#1d8fd6'], ['#9dff7a', '#2fb52a'], ['#ffd86a', '#f08a12'], ['#ff8a6a', '#d42a1a'], ['#ff9ae6', '#d42ab0'], ['#ff5a5a', '#8a0a14']];
  function face(c, s, tier) {
    const r = s * (tier === 5 ? 0.34 : 0.4), [hi, lo] = FACE_COL[tier];
    c.save(); c.translate(s / 2, s / 2 + (tier === 5 ? s * 0.12 : 0));
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (tier === 5) { // horns
      c.fillStyle = '#f2f2f2'; c.strokeStyle = '#1a0004'; c.lineWidth = s * 0.035;
      for (const m of [-1, 1]) { c.beginPath(); c.moveTo(m * r * 0.55, -r * 0.7); c.quadraticCurveTo(m * r * 1.25, -r * 1.0, m * r * 1.05, -r * 1.45); c.quadraticCurveTo(m * r * 0.95, -r * 0.95, m * r * 0.2, -r * 0.85); c.closePath(); c.fill(); c.stroke(); }
    }
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, hi); g.addColorStop(1, lo);
    c.fillStyle = g; c.strokeStyle = '#120a10'; c.lineWidth = s * 0.05;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.5, r * 0.32, r * 0.16, -0.5, 0, 7); c.fill();
    c.fillStyle = '#120a10'; c.strokeStyle = '#120a10'; c.lineWidth = s * 0.055;
    const eye = (x, y, w, h, tilt) => { c.save(); c.translate(x, y); c.rotate(tilt); c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, 7); c.fill(); c.restore(); };
    const brow = (x, y, a) => { c.beginPath(); c.moveTo(x - r * 0.22, y - a * r * 0.12); c.lineTo(x + r * 0.22, y + a * r * 0.12); c.stroke(); };
    if (tier === 0) { // big happy
      eye(-r * 0.33, -r * 0.18, r * 0.11, r * 0.17, 0); eye(r * 0.33, -r * 0.18, r * 0.11, r * 0.17, 0);
      c.beginPath(); c.arc(0, r * 0.12, r * 0.48, 0.15 * Math.PI, 0.85 * Math.PI); c.closePath(); c.fill();
      c.fillStyle = '#ff6a8a'; c.beginPath(); c.arc(0, r * 0.48, r * 0.16, Math.PI, 0); c.fill();
    } else if (tier === 1) { // smile
      eye(-r * 0.3, -r * 0.2, r * 0.1, r * 0.15, 0); eye(r * 0.3, -r * 0.2, r * 0.1, r * 0.15, 0);
      c.beginPath(); c.arc(0, r * 0.05, r * 0.42, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    } else if (tier === 2) { // unsure
      eye(-r * 0.3, -r * 0.15, r * 0.1, r * 0.13, 0); eye(r * 0.3, -r * 0.15, r * 0.1, r * 0.13, 0);
      brow(-r * 0.3, -r * 0.45, 0.6); brow(r * 0.3, -r * 0.45, -0.6);
      c.beginPath(); c.moveTo(-r * 0.3, r * 0.45); c.lineTo(r * 0.3, r * 0.38); c.stroke();
    } else if (tier === 3) { // frown
      eye(-r * 0.3, -r * 0.12, r * 0.1, r * 0.12, 0); eye(r * 0.3, -r * 0.12, r * 0.1, r * 0.12, 0);
      brow(-r * 0.3, -r * 0.4, 1); brow(r * 0.3, -r * 0.4, -1);
      c.beginPath(); c.arc(0, r * 0.75, r * 0.35, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
    } else if (tier === 4) { // furious, gritted
      eye(-r * 0.32, -r * 0.1, r * 0.13, r * 0.09, 0.4); eye(r * 0.32, -r * 0.1, r * 0.13, r * 0.09, -0.4);
      brow(-r * 0.3, -r * 0.38, 1.4); brow(r * 0.3, -r * 0.38, -1.4);
      c.fillStyle = '#fff'; c.beginPath(); c.rect(-r * 0.42, r * 0.28, r * 0.84, r * 0.3); c.fill(); c.stroke();
      c.lineWidth = s * 0.025; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * 0.22, r * 0.28); c.lineTo(i * r * 0.22, r * 0.58); c.stroke(); }
    } else { // demon
      c.fillStyle = '#ffe23c';
      for (const m of [-1, 1]) { c.beginPath(); c.moveTo(m * r * 0.1, -r * 0.05); c.lineTo(m * r * 0.6, -r * 0.35); c.lineTo(m * r * 0.5, r * 0.02); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = '#120a10'; c.beginPath(); c.moveTo(-r * 0.55, r * 0.25); c.quadraticCurveTo(0, r * 0.15, r * 0.55, r * 0.25); c.quadraticCurveTo(0, r * 0.85, -r * 0.55, r * 0.25); c.fill();
      c.fillStyle = '#fff'; c.lineWidth = s * 0.02;
      for (let i = 0; i < 4; i++) { const x = -r * 0.36 + i * r * 0.24; c.beginPath(); c.moveTo(x - r * 0.08, r * 0.24); c.lineTo(x, r * 0.42); c.lineTo(x + r * 0.08, r * 0.24); c.fill(); }
    }
    c.restore();
  }
  function faceCanvas(tier, size) {
    const cv = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d'); c.scale(d, d); face(c, size, tier); return cv;
  }
  function iconCanvas(design, c1, c2, size) {
    const cv = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d'); c.scale(d, d); c.translate(size / 2, size / 2); cube(c, size * 0.78, design, c1, c2, false); return cv;
  }
  return { COLORS, DESIGNS, cube, ship, face, faceCanvas, iconCanvas };
})();
