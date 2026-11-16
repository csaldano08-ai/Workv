/*
 * Spesora · prototipi intro — libreria di animazione 2D (Canvas).
 * Tutto è disegnato fotogramma per fotogramma in funzione del tempo t (secondi):
 * nessuna dissolvenza tra immagini statiche, nessun 3D. Deterministico (stesso t ⇒ stesso fotogramma).
 */
const W = 1080;
const H = 1920;
const C = {
  green: '#386E55',
  greenDark: '#2B5643',
  greenMid: '#4F8468',
  sage: '#A7B897',
  sageLight: '#CFE0D3',
  greenSoft: '#E3ECE5',
  ivory: '#F6F3EA',
  paper: '#FFFDF8',
  cover: '#F8ECDA',
  peach: '#E6A46D',
  peachLight: '#F3C9A2',
  peachSoft: '#F8E6D5',
  ink: '#24332C',
  tomato: '#D8613F',
  lemon: '#F2CB5C',
  wood: '#B98552',
};
const LW = 8; // spessore del contorno scuro (px a 1080)

/* ---------- tempo ed easing ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  outElastic: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};
/** Molla smorzata: 0 → 1 con rimbalzo (freq in rad/s, smorzamento in 1/s). */
function spring(dt, freq = 18, damp = 6) {
  if (dt <= 0) return 0;
  return 1 - Math.exp(-damp * dt) * Math.cos(freq * dt);
}
/** Oscillazione smorzata attorno a 0 (per squash & stretch dopo un impatto). */
function wobble(dt, amp = 0.25, freq = 20, damp = 7) {
  if (dt <= 0) return 0;
  return amp * Math.exp(-damp * dt) * Math.sin(freq * dt);
}

/* ---------- rumore deterministico ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- forme ---------- */
/** Punti di una "superellisse": e=2 ellisse/cerchio, e≈5–8 quadrato arrotondato. Morph continuo variando a, b, e. */
function superPts(cx, cy, a, b, e, n = 72, rot = 0, wob = null) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    let y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    if (wob) {
      const r = wob(th);
      x *= r;
      y *= r;
    }
    const xr = x * Math.cos(rot) - y * Math.sin(rot);
    const yr = x * Math.sin(rot) + y * Math.cos(rot);
    pts.push([cx + xr, cy + yr]);
  }
  return pts;
}
function lerpPts(A, B, k) {
  return A.map((p, i) => [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]);
}
/** Tracciato chiuso morbido passante vicino ai punti (curve quadratiche sui punti medi). */
function smoothPath(ctx, pts) {
  const n = pts.length;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}
function fillStroke(ctx, fill, stroke = C.ink, lw = LW) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}
function shadow(ctx, cx, cy, rx, alpha = 0.1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, cx, cy, rx, rx * 0.16);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}
/** Tratto parziale di una polilinea (per spunte e linee "disegnate a mano"). */
function partialLine(ctx, pts, k) {
  if (k <= 0) return;
  let total = 0;
  const lens = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let left = total * clamp(k);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const l = lens[i - 1];
    const f = Math.min(1, left / l);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
    left -= l;
  }
}

/* ---------- sfondo ---------- */
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + r() * 120;
    img.data[i] = v;
    img.data[i + 1] = v * 0.97;
    img.data[i + 2] = v * 0.9;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  GRAIN = c;
  return c;
}
function background(ctx, color = C.ivory) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(grain(), 0, 0, W, H);
  ctx.restore();
}

/* ---------- immagini ---------- */
const IMG = {};
function loadImages(map) {
  return Promise.all(
    Object.entries(map).map(
      ([k, src]) =>
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => {
            IMG[k] = im;
            res();
          };
          im.onerror = () => rej(new Error(`immagine mancante: ${src}`));
          im.src = src;
        }),
    ),
  );
}

/* ---------- Mina (asset originali di Google Flow, canvas 1024) ---------- */
const MINA_FOOT = { x: 530, y: 905 }; // punto d'appoggio dei piedi nel canvas 1024
/**
 * Disegna una posa di Mina con i piedi in (x, y). size = lato del canvas 1024 in px.
 * Squash & stretch e rotazione attorno ai piedi: la grafica originale non viene ridisegnata.
 */
function drawMina(ctx, img, x, y, size, o = {}) {
  const { sx = 1, sy = 1, rot = 0, alpha = 1, layers = null } = o;
  const k = size / 1024;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.translate(-MINA_FOOT.x * k, -MINA_FOOT.y * k);
  ctx.scale(k, k);
  if (layers) layers(ctx);
  else ctx.drawImage(img, 0, 0, 1024, 1024);
  ctx.restore();
}
/** Saluto: braccio (livello separato, dietro al corpo) ruotato attorno alla spalla (797, 522). */
function waveLayers(deg) {
  return (ctx) => {
    ctx.save();
    ctx.translate(797, 522);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.translate(-797, -522);
    ctx.drawImage(IMG.waveArm, 0, 0, 1024, 1024);
    ctx.restore();
    ctx.drawImage(IMG.waveBody, 0, 0, 1024, 1024);
  };
}
/** Palpebre per far "aprire gli occhi" (closed: 1 = chiusi). Coordinate degli occhi della posa wave_body. */
const MINA_EYES = [
  { x: 460, y: 414, rx: 46, ry: 55, rot: -0.12 },
  { x: 632, y: 379, rx: 44, ry: 57, rot: -0.12 },
];
function eyelids(closed) {
  return (ctx) => {
    if (closed <= 0.001) return;
    for (const e of MINA_EYES) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ellipse(ctx, 0, 0, e.rx + 7, e.ry + 9);
      ctx.clip();
      const top = -e.ry - 9;
      const edge = top + closed * (2 * (e.ry + 9));
      ctx.fillStyle = C.cover;
      ctx.fillRect(-e.rx - 10, top - 4, 2 * e.rx + 20, edge - top + 4);
      ctx.restore();
      // bordo della palpebra / occhio chiuso (arco scuro, come nelle pose "happy")
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ctx.strokeStyle = C.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = 9;
      const yEdge = -e.ry + closed * (2 * e.ry) - 4;
      const w = e.rx * Math.sqrt(Math.max(0, 1 - Math.pow(yEdge / (e.ry + 9), 2))) + 4;
      ctx.beginPath();
      ctx.moveTo(-w, yEdge - 4 * closed);
      ctx.quadraticCurveTo(0, yEdge + 12 * closed, w, yEdge - 4 * closed);
      ctx.stroke();
      ctx.restore();
    }
  };
}

/* ---------- logo Spesora (geometria identica a src/ui/Logo.tsx, viewBox 64) ---------- */
/**
 * p: { body, header, ringL, ringR, plate, ring, check } in 0..1 (stato di costruzione);
 * bodyShape: punti personalizzati del corpo (per i morph), altrimenti il rettangolo arrotondato ufficiale.
 */
function drawLogoMark(ctx, cx, cy, size, p = {}) {
  const q = { body: 1, header: 1, ringL: 1, ringR: 1, plate: 1, ring: 1, check: 1, ...p };
  const u = size / 64;
  ctx.save();
  ctx.translate(cx - 32 * u, cy - 32 * u);
  ctx.scale(u, u);
  // corpo verde
  if (q.body > 0) {
    ctx.save();
    ctx.translate(32, 34);
    ctx.scale(q.body, q.body);
    ctx.translate(-32, -34);
    rrect(ctx, 4, 8, 56, 52, 14);
    ctx.fillStyle = C.green;
    ctx.fill();
    if (q.header > 0) {
      ctx.save();
      rrect(ctx, 4, 8, 56, 52, 14);
      ctx.clip();
      ctx.globalAlpha *= clamp(q.header);
      rrect(ctx, 4, 8, 56, 14 * clamp(q.header, 0, 1.2), 7);
      ctx.fillStyle = C.greenDark;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // anelli pesca (cadono dall'alto)
  const ring = (x, k) => {
    if (k <= 0) return;
    const dy = (1 - k) * -26;
    rrect(ctx, x, 3 + dy, 5, 12, 2.5);
    ctx.fillStyle = C.peach;
    ctx.fill();
  };
  ring(16, q.ringL);
  ring(43, q.ringR);
  // piatto
  if (q.plate > 0) {
    ctx.beginPath();
    ctx.arc(32, 40, 14 * q.plate, 0, Math.PI * 2);
    ctx.fillStyle = C.ivory;
    ctx.fill();
  }
  if (q.ring > 0) {
    ctx.beginPath();
    ctx.arc(32, 40, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(q.ring));
    ctx.strokeStyle = C.peach;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  if (q.check > 0) {
    partialLine(ctx, [[29, 40], [31.5, 42.5], [36.5, 37]], q.check);
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/** Scritta "Spesora" (Inter Bold, verde come in app). letter(i) → { s, dy, rot, a } per animare ogni lettera. */
const WORD = 'Spesora';
function wordmarkWidth(ctx, px) {
  ctx.font = `700 ${px}px Inter`;
  return ctx.measureText(WORD).width;
}
function drawWordmark(ctx, x, baseline, px, letter = () => ({})) {
  ctx.save();
  ctx.font = `700 ${px}px Inter`;
  ctx.fillStyle = C.green;
  ctx.textBaseline = 'alphabetic';
  let cx = x;
  for (let i = 0; i < WORD.length; i++) {
    const ch = WORD[i];
    const w = ctx.measureText(ch).width;
    const { s = 1, sx = s, sy = s, dy = 0, rot = 0, a = 1 } = letter(i);
    if (a > 0 && sx > 0.001 && sy > 0.001) {
      ctx.save();
      ctx.globalAlpha *= clamp(a);
      ctx.translate(cx + w / 2, baseline + dy);
      ctx.rotate(rot);
      ctx.scale(sx, sy);
      ctx.fillText(ch, -w / 2, 0);
      ctx.restore();
    }
    cx += w - px * 0.015;
  }
  ctx.restore();
}
/** Disposizione ufficiale del logo (marchio a sinistra, scritta a destra, come in app). */
function lockup(ctx, cy, markSize, px) {
  const gap = markSize * 0.16;
  const tw = wordmarkWidth(ctx, px);
  const total = markSize + gap + tw;
  const x0 = (W - total) / 2;
  return { markX: x0 + markSize / 2, markY: cy, textX: x0 + markSize + gap, baseline: cy + px * 0.36, width: total };
}

/* ---------- ingredienti illustrati (contorno scuro, forme morbide) ---------- */
function ingTomato(ctx, s) {
  smoothPath(ctx, superPts(0, 4, s * 0.48, s * 0.42, 2.3, 48));
  fillStroke(ctx, C.tomato);
  ellipse(ctx, -s * 0.18, -s * 0.06, s * 0.1, s * 0.06, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    ctx.moveTo(0, -s * 0.33);
    ctx.quadraticCurveTo(Math.cos(a) * s * 0.12, -s * 0.33 + Math.sin(a) * s * 0.02 - s * 0.04, Math.cos(a) * s * 0.22, -s * 0.33 + Math.sin(a + Math.PI / 2) * s * 0.05);
  }
  ctx.strokeStyle = C.green;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.33);
  ctx.lineTo(s * 0.03, -s * 0.47);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
}
function ingCarrot(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.28);
  ctx.quadraticCurveTo(0, -s * 0.36, s * 0.2, -s * 0.28);
  ctx.quadraticCurveTo(s * 0.12, s * 0.2, 0, s * 0.5);
  ctx.quadraticCurveTo(-s * 0.12, s * 0.2, -s * 0.2, -s * 0.28);
  ctx.closePath();
  fillStroke(ctx, '#E58A3F');
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.05);
  ctx.lineTo(s * 0.03, -s * 0.05);
  ctx.moveTo(-s * 0.04, s * 0.15);
  ctx.lineTo(s * 0.07, s * 0.15);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = LW * 0.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  for (const [dx, h] of [[-0.09, 0.26], [0, 0.32], [0.09, 0.24]]) {
    ctx.beginPath();
    ctx.moveTo(dx * s * 0.6, -s * 0.31);
    ctx.quadraticCurveTo(dx * s * 2.2, -s * 0.31 - h * s * 0.6, dx * s * 1.6, -s * 0.31 - h * s);
    ctx.strokeStyle = C.green;
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
  }
}
function ingLeaf(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.48);
  ctx.bezierCurveTo(s * 0.42, s * 0.2, s * 0.36, -s * 0.32, 0, -s * 0.48);
  ctx.bezierCurveTo(-s * 0.36, -s * 0.32, -s * 0.42, s * 0.2, 0, s * 0.48);
  ctx.closePath();
  fillStroke(ctx, C.greenMid);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.42);
  ctx.lineTo(0, -s * 0.36);
  for (const y of [0.18, -0.02, -0.2]) {
    ctx.moveTo(0, y * s + s * 0.04);
    ctx.lineTo(s * 0.17, y * s - s * 0.08);
    ctx.moveTo(0, y * s + s * 0.04);
    ctx.lineTo(-s * 0.17, y * s - s * 0.08);
  }
  ctx.strokeStyle = C.sageLight;
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  ctx.stroke();
}
function ingLemon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
  fillStroke(ctx, C.lemon);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = '#FBE7A6';
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * s * 0.05, Math.sin(a) * s * 0.05);
    ctx.lineTo(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33);
  }
  ctx.strokeStyle = C.lemon;
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.stroke();
}
function ingMushroom(ctx, s) {
  rrect(ctx, -s * 0.12, -s * 0.02, s * 0.24, s * 0.46, s * 0.1);
  fillStroke(ctx, C.paper);
  ctx.beginPath();
  ctx.moveTo(-s * 0.46, s * 0.04);
  ctx.bezierCurveTo(-s * 0.46, -s * 0.5, s * 0.46, -s * 0.5, s * 0.46, s * 0.04);
  ctx.quadraticCurveTo(0, -s * 0.06, -s * 0.46, s * 0.04);
  ctx.closePath();
  fillStroke(ctx, '#C98A5E');
  for (const [x, y, r] of [[-0.18, -0.18, 0.06], [0.12, -0.24, 0.05], [0.24, -0.06, 0.04]]) {
    ctx.beginPath();
    ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    ctx.fillStyle = C.peachLight;
    ctx.fill();
  }
}
function ingPeas(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-s * 0.48, s * 0.1);
  ctx.bezierCurveTo(-s * 0.3, -s * 0.38, s * 0.3, -s * 0.38, s * 0.48, s * 0.06);
  ctx.bezierCurveTo(s * 0.26, s * 0.2, -s * 0.26, s * 0.24, -s * 0.48, s * 0.1);
  ctx.closePath();
  fillStroke(ctx, C.greenMid);
  for (const x of [-0.22, 0, 0.22]) {
    ctx.beginPath();
    ctx.arc(x * s, -s * 0.03, s * 0.1, 0, Math.PI * 2);
    fillStroke(ctx, C.sage, C.ink, LW * 0.6);
  }
}
const INGREDIENTS = [ingTomato, ingLeaf, ingCarrot, ingLemon, ingMushroom, ingPeas];
function drawIngredient(ctx, i, x, y, size, rot = 0, sx = 1, sy = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  INGREDIENTS[i % INGREDIENTS.length](ctx, size);
  ctx.restore();
}

/* ---------- schermate reali (per il collegamento finale) ---------- */
function drawScreen(ctx, img, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
}
/** Rivela una schermata dentro un cerchio (con bordo scuro morbido). */
function irisReveal(ctx, img, cx, cy, r, ring = true) {
  if (r <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
  if (ring && r < 2300) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = LW;
    ctx.stroke();
  }
}

const CONCEPTS = {};
