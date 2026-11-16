/*
 * CONCEPT C — GLI INGREDIENTI CHE DANZANO
 * Sei ingredienti illustrati entrano uno alla volta → danzano su due orbite controrotanti (si incrociano senza
 * toccarsi) → un vortice li stringe e ognuno si gira come una carta diventando un pallino verde o pesca →
 * i pallini costruiscono il marchio, Mina compare a presentarlo → i pallini rimasti atterrano sulle icone
 * della barra in basso mentre la Home reale sale dal fondo.
 */
(() => {
  const CX = 540;
  const CY = 860;
  const LOGO_Y = 800;
  const SIZE = 185;
  const ORBIT = [372, 186]; // esterna (pari), interna (dispari)
  const OMEGA = [1.5, -2.1];
  const DOT = [C.green, C.peach, C.green, C.peach, C.green, C.peach];
  const TABS_Y = 1832;
  const TABS_X = [105, 321, 540, 756, 972];

  /** Angolo cumulato (velocità che cresce nel vortice). */
  function phase(i, t) {
    const ring = i % 2;
    const base = -Math.PI / 2 + (i * Math.PI) / 3;
    const dance = OMEGA[ring] * Math.max(0, t - 1.1);
    const vortex = (ring ? -1 : 1) * 9 * Math.pow(seg(t, 2.55, 3.7), 2);
    return base + dance + vortex;
  }
  function radius(i, t) {
    const ring = i % 2;
    const toRing = E.inOutCubic(seg(t, 1.05, 1.5));
    const r = lerp(285, ORBIT[ring], toRing) + 18 * Math.sin(t * 3 + i) * toRing;
    return r * (1 - 0.88 * E.inCubic(seg(t, 2.55, 3.65)));
  }

  function draw(ctx, t) {
    background(ctx);
    const L = lockup(ctx, LOGO_Y, 190, 150);
    const u = 190 / 64;
    const mark0 = { x: L.markX - 32 * u, y: L.markY - 32 * u };
    const targets = [
      { x: L.markX, y: L.markY + 2 * u },
      { x: mark0.x + 18.5 * u, y: mark0.y + 9 * u },
      { x: L.markX, y: L.markY + 2 * u },
      { x: mark0.x + 45.5 * u, y: mark0.y + 9 * u },
      { x: L.markX, y: L.markY + 2 * u },
      { x: L.markX, y: mark0.y + 40 * u },
    ];

    // scie del vortice
    const sw = seg(t, 2.6, 3.75);
    if (sw > 0 && sw < 1) {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = LW * 0.7;
      ctx.globalAlpha = Math.sin(Math.PI * sw) * 0.8;
      for (let k = 0; k < 3; k++) {
        const r = lerp(300, 60, E.inCubic(sw)) * (1 - k * 0.22);
        const a0 = t * 7 + (k * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(CX, CY, r, a0, a0 + 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }

    const fly = (i) => E.inOutCubic(seg(t, 3.62 + i * 0.05, 4.02 + i * 0.05));
    for (let i = 0; i < 6; i++) {
      const ti = 0.12 + i * 0.13;
      const pop = seg(t, ti, ti + 0.32);
      if (pop <= 0) continue;
      const a = phase(i, t);
      const r = radius(i, t);
      let x = CX + Math.cos(a) * r;
      let y = CY + Math.sin(a) * r * 0.92 + 14 * Math.sin(t * 6 + i) * seg(t, 1.1, 1.4) * (1 - seg(t, 2.6, 3.0));
      const sq = wobble(t - ti - 0.22, 0.22, 24, 7);
      const scale = E.outBack(pop, 2.4);
      const rot = (1 - pop) * (i % 2 ? 0.9 : -0.9) + 0.22 * Math.sin(t * 4 + i * 1.3);
      const m = seg(t, 2.95 + i * 0.05, 3.3 + i * 0.05); // carta che gira: ingrediente → pallino
      const f = fly(i);
      if (f > 0) {
        const tg = targets[i];
        const ctrl = { x: (x + tg.x) / 2 + (i % 2 ? 160 : -160), y: Math.min(y, tg.y) - 220 };
        x = (1 - f) * (1 - f) * x + 2 * (1 - f) * f * ctrl.x + f * f * tg.x;
        y = (1 - f) * (1 - f) * y + 2 * (1 - f) * f * ctrl.y + f * f * tg.y;
      }
      if (m < 0.5) {
        const sx = Math.cos(Math.PI * m);
        drawIngredient(ctx, i, x, y, SIZE * scale, rot, (1 + sq) * sx, 1 - sq);
      } else {
        const sx = -Math.cos(Math.PI * m);
        const arrive = seg(t, 3.98 + i * 0.05, 4.12 + i * 0.05);
        const rad = 30 * (1 - arrive);
        if (rad > 0.5) {
          const stretch = f > 0 && f < 1 ? 1 + 0.7 * Math.sin(Math.PI * f) : 1;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(sx, 1);
          smoothPath(ctx, superPts(0, 0, rad * stretch, rad / Math.sqrt(stretch), 2, 32, f > 0 ? Math.PI / 2 : 0));
          fillStroke(ctx, DOT[i], C.ink, LW * 0.8);
          ctx.restore();
        }
      }
    }

    /* marchio costruito dai pallini, poi la scritta */
    const tb = 4.0;
    const exit = E.inOutCubic(seg(t, 6.0, 6.5));
    if (t > tb) {
      ctx.save();
      ctx.globalAlpha = 1 - exit;
      ctx.translate(0, -180 * exit);
      drawLogoMark(ctx, L.markX, L.markY, 190, {
        body: spring(t - tb - 0.05, 16, 6),
        header: seg(t, tb + 0.1, tb + 0.25),
        ringL: spring(t - tb - 0.02, 20, 7),
        ringR: spring(t - tb - 0.12, 20, 7),
        plate: E.outBack(seg(t, tb + 0.2, tb + 0.38), 2.5),
        ring: E.outCubic(seg(t, tb + 0.26, tb + 0.5)),
        check: E.outCubic(seg(t, tb + 0.42, tb + 0.6)),
      });
      drawWordmark(ctx, L.textX, L.baseline, 150, (i) => {
        const ti = tb + 0.25 + i * 0.065;
        const k = spring(t - ti, 15, 6.5);
        return { dy: (1 - k) * 90, rot: (1 - clamp(k)) * (i % 2 ? 0.35 : -0.35), s: clamp(k, 0, 1.15), a: seg(t, ti, ti + 0.1) };
      });
      ctx.restore();
    }

    /* Mina, che ha appena messo tutto in ordine */
    const mp = spring(t - 4.45, 14, 6);
    if (mp > 0.01) {
      const tilt = 0.035 * Math.sin((t - 4.45) * 3);
      const k = E.inOutCubic(seg(t, 6.0, 6.5));
      shadow(ctx, 540, 1546, 190 * clamp(mp), 0.09 * (1 - k));
      drawMina(ctx, IMG.explaining, 540, 1540 - 220 * k, 700, { sx: clamp(mp, 0, 1.2) * (1 + 0.1 * (1 - clamp(mp))), sy: mp, rot: tilt, alpha: 1 - k });
    }

    /* rametti decorativi che crescono e diventano i pallini della barra in basso */
    for (let j = 0; j < 5; j++) {
      const ts = 5.05 + j * 0.06;
      const g = seg(t, ts, ts + 0.35);
      if (g <= 0) continue;
      const start = { x: 540 + (j - 2) * 150, y: LOGO_Y + 175 - 26 * (2 - Math.abs(j - 2)) };
      const go = E.inOutCubic(seg(t, 5.6 + j * 0.05, 6.05 + j * 0.05));
      const tx = TABS_X[j];
      const ctrl = { x: (start.x + tx) / 2, y: 1150 };
      const p = go;
      const x = (1 - p) * (1 - p) * start.x + 2 * (1 - p) * p * ctrl.x + p * p * tx;
      const y = (1 - p) * (1 - p) * start.y + 2 * (1 - p) * p * ctrl.y + p * p * TABS_Y;
      const s = 58 * E.outBack(g, 2.2) * (1 - 0.6 * go);
      const fade = 1 - seg(t, 6.25, 6.45);
      if (fade <= 0) continue;
      ctx.save();
      ctx.globalAlpha = fade;
      if (go < 0.5) drawIngredient(ctx, 1, x, y, s, (j - 2) * 0.4 + go * 6, Math.cos(Math.PI * go), 1);
      else {
        ctx.beginPath();
        ctx.arc(x, y, 16 * -Math.cos(Math.PI * go) + 2, 0, Math.PI * 2);
        fillStroke(ctx, j % 2 ? C.peach : C.green, C.ink, 5);
      }
      ctx.restore();
    }

    /* la Home reale sale dal fondo con un bordo morbido */
    const up = E.inOutCubic(seg(t, 5.95, 6.6));
    if (up > 0) {
      const top = H - (H + 140) * up;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, top);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, top + 40 * Math.sin(x / 140 + t * 6) * (1 - up));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      drawScreen(ctx, IMG.home);
      ctx.restore();
      if (up < 0.99) {
        ctx.beginPath();
        ctx.moveTo(0, top);
        for (let x = 0; x <= W; x += 40) ctx.lineTo(x, top + 40 * Math.sin(x / 140 + t * 6) * (1 - up));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = LW;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  CONCEPTS.C = { duration: 6.9, draw };
})();
