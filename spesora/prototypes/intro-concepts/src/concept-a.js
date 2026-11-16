/*
 * CONCEPT A — MINA PRENDE VITA
 * Forma verde elastica → ricettario illustrato che si apre e sfoglia → si richiude con un colpo e diventa Mina →
 * Mina apre gli occhi e saluta → apre la copertina e ne escono ingredienti → si ricompongono nel logo →
 * Mina vola al suo posto nella Home reale, che si apre attorno a lei.
 */
(() => {
  const FEET = { x: 540, y: 1330 };
  const SIZE = 900;
  // regione del ricettario di Mina (in px a SIZE 900), usata per far combaciare il libro vettoriale
  const BOOK = { cx: 496, cy: 942, w: 470, h: 600 };
  const LOGO_Y = 560;

  function book(ctx, t, cx, cy, w, h, details, openT, flipT) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    const hinge = x + w * 0.13;
    // pagine (visibili quando la copertina si apre)
    if (openT > 0) {
      rrect(ctx, hinge - 6, y + 14, x + w - hinge - 4, h - 28, 22);
      fillStroke(ctx, C.paper);
      ctx.save();
      ctx.strokeStyle = C.sage;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(hinge + 50, y + 120 + i * 70);
        ctx.lineTo(x + w - 60 - (i % 2) * 70, y + 120 + i * 70);
        ctx.stroke();
      }
      ctx.restore();
      // pagine che sfogliano
      for (let i = 0; i < 3; i++) {
        const k = seg(t, 1.72 + i * 0.07, 1.98 + i * 0.07);
        if (k <= 0 || k >= 1) continue;
        const sx = Math.cos(Math.PI * E.inOutCubic(k));
        ctx.save();
        ctx.translate(hinge, 0);
        ctx.transform(sx, 0.05 * Math.sin(Math.PI * k), 0, 1, 0, 0);
        ctx.translate(-hinge, 0);
        rrect(ctx, hinge, y + 20, x + w - hinge - 14, h - 40, 20);
        fillStroke(ctx, sx >= 0 ? C.paper : C.ivory, C.ink, LW / Math.max(0.35, Math.abs(sx)));
        ctx.restore();
      }
    }
    // copertina verde che ruota sul dorso (squash orizzontale, nessun 3D)
    const sx = Math.cos(Math.PI * openT);
    ctx.save();
    ctx.translate(hinge, 0);
    ctx.transform(sx, -0.07 * Math.sin(Math.PI * openT), 0, 1, 0, 0);
    ctx.translate(-hinge, 0);
    rrect(ctx, hinge - 10, y, x + w - hinge + 10, h, 34);
    fillStroke(ctx, sx >= 0 ? C.green : C.sage, C.ink, LW / Math.max(0.3, Math.abs(sx)));
    if (sx > 0.2 && details > 0) {
      // decorazione botanica sulla copertina
      ctx.save();
      ctx.globalAlpha = clamp(details * 2) * clamp((sx - 0.2) * 3);
      ctx.translate(cx + 30, cy + 70);
      ctx.scale(E.outBack(clamp(details)), E.outBack(clamp(details)));
      drawIngredient(ctx, 1, 0, 0, 120, -0.4);
      ctx.restore();
    }
    ctx.restore();
    // dorso
    rrect(ctx, x, y - 4, w * 0.16, h + 8, 30);
    fillStroke(ctx, C.greenDark);
    if (details > 0) {
      const d = E.outBack(seg(details, 0, 1));
      // elastico, segnalibro e linguette
      ctx.save();
      rrect(ctx, x + w - 46, y - 8, 22 * d, h + 16, 8);
      fillStroke(ctx, C.greenDark);
      const sw = Math.sin(t * 9) * Math.exp(-(t - 1.3) * 3) * 0.25;
      ctx.translate(x + w * 0.32, y + h - 4);
      ctx.rotate(sw);
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-18, 90 * d);
      ctx.lineTo(0, 72 * d);
      ctx.lineTo(18, 90 * d);
      ctx.lineTo(18, 0);
      ctx.closePath();
      fillStroke(ctx, C.peach);
      ctx.restore();
      for (const [i, col] of [[0, C.peach], [1, C.sage]]) {
        const k = E.outBack(seg(details, 0.2 + i * 0.2, 0.8 + i * 0.2));
        if (k <= 0) continue;
        rrect(ctx, x + w - 10, y + 80 + i * 130, 46 * k, 100, 14);
        fillStroke(ctx, col);
      }
    }
  }

  function draw(ctx, t) {
    background(ctx);

    /* 1 — forma verde elastica (0–1 s) */
    if (t < 1.0) {
      const k = E.outBack(seg(t, 0.1, 0.5), 2.4);
      const w = wobble(t - 0.1, 0.22, 22, 6) + (t > 0.62 ? -wobble(t - 0.62, 0.18, 18, 6) : 0);
      const lift = t > 0.62 ? -Math.sin(Math.PI * seg(t, 0.62, 0.95)) * 70 : 0;
      const r = 92 * k;
      shadow(ctx, 540, 1240, r * (1 - lift / 400), 0.08 * k);
      if (r > 0.5) {
        smoothPath(ctx, superPts(540, 940 + lift, r * (1 + w), r * (1 - w), 2, 64, 0, (th) => 1 + 0.035 * Math.sin(3 * th + t * 7)));
        fillStroke(ctx, C.green);
        ellipse(ctx, 540 - r * 0.38, 940 + lift - r * 0.4, r * 0.2, r * 0.12, -0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fill();
      }
      return;
    }

    /* 2 — morph nel ricettario, apertura e pagine (1–2.3 s) */
    if (t < 2.32) {
      const m = spring(t - 1.0, 13, 6.5);
      const e = lerp(2, 7, clamp(m));
      const cx = lerp(540, BOOK.cx, clamp(m));
      const cy = lerp(940, BOOK.cy, clamp(m));
      const a = lerp(92, BOOK.w / 2, m);
      const b = lerp(92, BOOK.h / 2, m) * (1 + 0.08 * Math.sin(Math.PI * clamp(m)));
      shadow(ctx, 540, 1250, lerp(92, 260, clamp(m)), 0.1);
      if (t < 1.28) {
        smoothPath(ctx, superPts(cx, cy, a, b, e, 72));
        fillStroke(ctx, C.green);
        return;
      }
      const details = seg(t, 1.28, 1.6);
      const openT = E.inOutCubic(seg(t, 1.55, 1.85)) - E.inCubic(seg(t, 2.05, 2.28));
      // impatto alla chiusura
      const imp = t > 2.22 ? seg(t, 2.22, 2.32) : 0;
      ctx.save();
      ctx.translate(540, BOOK.cy + BOOK.h / 2);
      ctx.scale(1 + 0.08 * imp, 1 - 0.1 * imp);
      ctx.translate(-540, -(BOOK.cy + BOOK.h / 2));
      // il libro scivola a destra mentre si apre, così la doppia pagina resta tutta nell'inquadratura
      ctx.translate(205 * E.inOutCubic(clamp(openT)), 0);
      book(ctx, t, BOOK.cx, BOOK.cy, BOOK.w, BOOK.h, details, clamp(openT), 0);
      ctx.restore();
      return;
    }

    /* 3 — diventa Mina, apre gli occhi e saluta (2.32–3.55 s) */
    const lines = seg(t, 2.32, 2.6);
    if (lines > 0 && lines < 1) {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = LW;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const r0 = 380 + 140 * E.outCubic(lines);
        const r1 = r0 + 70 * (1 - lines);
        ctx.beginPath();
        ctx.moveTo(BOOK.cx + Math.cos(a) * r0, BOOK.cy + Math.sin(a) * r0 * 1.15);
        ctx.lineTo(BOOK.cx + Math.cos(a) * r1, BOOK.cy + Math.sin(a) * r1 * 1.15);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (t < 4.75) {
      shadow(ctx, 540, FEET.y + 6, 250, 0.1);
    }

    if (t < 3.55) {
      const pop = spring(t - 2.32, 20, 7);
      const sy = 0.82 + 0.18 * pop;
      const sx = 1.12 - 0.12 * pop;
      const open = E.outCubic(seg(t, 2.6, 2.78));
      const blink = Math.sin(Math.PI * seg(t, 3.12, 3.26));
      const closed = t < 2.6 ? 1 : Math.max(1 - open, blink);
      const wv = seg(t, 2.8, 3.5);
      const deg = 9 * Math.sin(wv * Math.PI * 2 * 2) * Math.sin(Math.PI * wv);
      const anticip = seg(t, 3.42, 3.55);
      drawMina(ctx, null, FEET.x, FEET.y, SIZE, {
        sx: sx * (1 + 0.06 * anticip),
        sy: sy * (1 - 0.1 * anticip),
        rot: 0.03 * Math.sin(wv * Math.PI * 4) * Math.sin(Math.PI * wv),
        layers: (c) => {
          waveLayers(deg)(c);
          eyelids(closed)(c);
        },
      });
      return;
    }

    /* 4 — saltello, apre la copertina, escono gli ingredienti (3.55–4.7 s) */
    const hop = Math.sin(Math.PI * seg(t, 3.55, 3.86));
    const land = t > 3.86 ? wobble(t - 3.86, 0.1, 22, 8) : 0;
    const coverK = 0.06 * E.outBack(seg(t, 3.95, 4.25)) * (1 - seg(t, 4.55, 4.75));
    const emit = { x: FEET.x + (745 - 530) * (SIZE / 1024), y: FEET.y + (430 - 905) * (SIZE / 1024) };
    const ring = (i) => {
      const a = -Math.PI / 2 + (i - 2.5) * 0.5;
      return { x: 540 + Math.cos(a) * 360, y: LOGO_Y + 120 + Math.sin(a) * 260 };
    };

    // Mina (posa ricettario, fino a 4.75 s; poi posa di benvenuto)
    if (t < 4.75) {
      drawMina(ctx, null, FEET.x, FEET.y - 90 * hop, SIZE, {
        sx: 1 - 0.05 * hop + land,
        sy: 1 + 0.07 * hop - land,
        layers: (c) => {
          c.drawImage(IMG.bookBody, 0, 0, 1024, 1024);
          c.save();
          c.translate(380, 0);
          c.scale(1 - coverK, 1);
          c.translate(-380, 0);
          c.drawImage(IMG.bookCover, 0, 0, 1024, 1024);
          c.restore();
        },
      });
    }

    // ingredienti che escono dal libro, poi convergono nel logo
    for (let i = 0; i < 6; i++) {
      const ti = 4.0 + i * 0.07;
      const out = seg(t, ti, ti + 0.5);
      if (out <= 0) continue;
      const r = ring(i);
      const p = E.outCubic(out);
      const ctrl = { x: (emit.x + r.x) / 2 + 80, y: Math.min(emit.y, r.y) - 260 };
      let x = (1 - p) * (1 - p) * emit.x + 2 * (1 - p) * p * ctrl.x + p * p * r.x;
      let y = (1 - p) * (1 - p) * emit.y + 2 * (1 - p) * p * ctrl.y + p * p * r.y;
      let s = 120 * E.outBack(seg(t, ti, ti + 0.32), 2);
      let rot = (1 - p) * (i % 2 ? 2.4 : -2.4) + Math.sin(t * 3 + i) * 0.12;
      // convergenza verso il marchio
      const cv = E.inOutCubic(seg(t, 4.72 + i * 0.03, 5.02 + i * 0.03));
      if (cv > 0) {
        const L = lockup(ctx, LOGO_Y, 190, 150);
        x = lerp(x, L.markX, cv);
        y = lerp(y, L.markY, cv);
        s *= 1 - cv;
        rot += cv * 3;
      }
      if (s > 1) {
        const sq = wobble(t - ti - 0.3, 0.18, 24, 7);
        drawIngredient(ctx, i, x, y, s, rot, 1 + sq, 1 - sq);
      }
    }

    /* 5 — logo e Mina che lo presenta (4.75–6 s) */
    const L = lockup(ctx, LOGO_Y, 190, 150);
    const tb = 4.9;
    const exit = E.inOutCubic(seg(t, 6.05, 6.45));
    if (t > tb) {
      ctx.save();
      ctx.globalAlpha = 1 - seg(t, 6.2, 6.5);
      ctx.translate(540, LOGO_Y);
      ctx.scale(1 - 0.35 * exit, 1 - 0.35 * exit);
      ctx.translate(-540, -LOGO_Y - 260 * exit);
      drawLogoMark(ctx, L.markX, L.markY, 190, {
        body: spring(t - tb, 16, 6),
        header: seg(t, tb + 0.08, tb + 0.25),
        ringL: spring(t - tb - 0.12, 18, 7),
        ringR: spring(t - tb - 0.17, 18, 7),
        plate: E.outBack(seg(t, tb + 0.2, tb + 0.38), 2.5),
        ring: E.outCubic(seg(t, tb + 0.28, tb + 0.55)),
        check: E.outCubic(seg(t, tb + 0.45, tb + 0.65)),
      });
      drawWordmark(ctx, L.textX, L.baseline, 150, (i) => {
        const ti = tb + 0.25 + i * 0.06;
        const k = spring(t - ti, 17, 7);
        return { sx: clamp(k, 0, 1.3) * (1 + 0.15 * (1 - clamp(k))), sy: k, dy: (1 - clamp(k)) * 40, a: seg(t, ti, ti + 0.08) };
      });
      ctx.restore();
    }

    if (t >= 4.75) {
      // Mina passa alla posa di benvenuto con un saltello e si sposta sotto il logo
      const k = E.inOutCubic(seg(t, 4.75, 5.15));
      const hop2 = Math.sin(Math.PI * seg(t, 4.75, 5.1));
      const land2 = t > 5.1 ? wobble(t - 5.1, 0.12, 22, 8) : 0;
      let fx = FEET.x;
      let fy = lerp(FEET.y, 1560, k) - 120 * hop2;
      let size = lerp(SIZE, 780, k);
      // 6 — vola al suo posto nella Home reale
      const fly = E.inOutCubic(seg(t, 6.05, 6.6));
      const target = { x: 190, y: 803, size: 305 };
      if (fly > 0) {
        const ctrl = { x: 360, y: 1050 };
        const p = fly;
        fx = (1 - p) * (1 - p) * fx + 2 * (1 - p) * p * ctrl.x + p * p * target.x;
        fy = (1 - p) * (1 - p) * fy + 2 * (1 - p) * p * ctrl.y + p * p * target.y;
        size = lerp(size, target.size, p);
      }
      // la Home si apre attorno a Mina
      const iris = E.inOutCubic(seg(t, 6.25, 6.85));
      if (iris > 0) irisReveal(ctx, IMG.home, target.x, target.y - 120, iris * 2300, iris < 0.98);
      const landHome = t > 6.6 ? wobble(t - 6.6, 0.12, 24, 9) : 0;
      if (fly <= 0) shadow(ctx, fx, 1566, size * 0.27, 0.09);
      drawMina(ctx, IMG.welcome, fx, fy, size, {
        sx: 1 - 0.06 * hop2 + land2 + landHome,
        sy: 1 + 0.08 * hop2 - land2 - landHome,
        rot: 0.04 * Math.sin(t * 2.2) * (1 - fly),
        alpha: 1 - seg(t, 6.78, 7.0),
      });
    }
  }

  CONCEPTS.A = { duration: 7.3, draw };
})();
