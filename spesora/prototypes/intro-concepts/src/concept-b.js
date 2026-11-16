/*
 * CONCEPT B — SPLASH ELASTICO ILLUSTRATO
 * Una forma verde cade (accelerazione e allungamento) → si schiaccia → sboccia in uno splash a petali,
 * con gocce che volano e ricadono → tutto torna al centro in una gelatina che oscilla → la gelatina diventa
 * il marchio Spesora, le lettere "atterrano" una alla volta → un'onda verde apre la Home reale.
 */
(() => {
  const CX = 540;
  const CY = 900;
  const LOGO_Y = 820;
  const R0 = 58;
  const TI = 0.95; // impatto

  /** Contorno radiale: nucleo + petali gaussiani (un unico tracciato, contorno continuo). */
  function bloomPts(cx, cy, core, lobes, n = 200, rot = 0, wob = 0, t = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ph = (i / n) * Math.PI * 2;
      let r = core * (1 + wob * Math.sin(5 * ph + t * 9) + wob * 0.6 * Math.sin(3 * ph - t * 7));
      for (const l of lobes) {
        let d = Math.atan2(Math.sin(ph - l.a - rot), Math.cos(ph - l.a - rot));
        r += l.len * Math.exp(-Math.pow(d / l.w, 2));
      }
      pts.push([cx + Math.cos(ph) * r, cy + Math.sin(ph) * r]);
    }
    return pts;
  }

  const DROPS = (() => {
    const r = rng(42);
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + r() * 0.3;
      const v = 900 + r() * 500;
      return { a, v, size: 12 + r() * 16, color: i % 3 === 0 ? C.peach : C.green };
    });
  })();

  function draw(ctx, t) {
    background(ctx);

    /* 1 — caduta (0.15–0.95 s) */
    if (t < TI) {
      const u = seg(t, 0.15, TI);
      if (u <= 0) return;
      const y = lerp(-140, CY + 58 - R0, E.inQuad(u));
      const st = Math.pow(u, 1.6);
      shadow(ctx, CX, CY + 75, R0 * (0.4 + 0.8 * u), 0.08 * u);
      // linee di velocità
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = LW * 0.8;
      ctx.globalAlpha = clamp((u - 0.35) * 2);
      for (const dx of [-30, 0, 30]) {
        const len = 150 * st * (dx === 0 ? 1 : 0.7);
        ctx.beginPath();
        ctx.moveTo(CX + dx, y - R0 * (1 + 0.6 * st) - 30);
        ctx.lineTo(CX + dx, y - R0 * (1 + 0.6 * st) - 30 - len);
        ctx.stroke();
      }
      ctx.restore();
      smoothPath(ctx, superPts(CX, y, R0 * (1 - 0.24 * st), R0 * (1 + 0.6 * st), 2, 64));
      fillStroke(ctx, C.green);
      ellipse(ctx, CX - 18, y - R0 * 0.5, 12, 20, 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
      return;
    }

    const dt = t - TI;
    /* 2 — impatto e splash (0.95–2.0 s), 3 — ritorno (2.0–2.9 s) */
    if (t < 3.0) {
      const squash = E.outQuad(seg(t, TI, TI + 0.08)) * (1 - seg(t, TI + 0.08, TI + 0.2));
      const grow = spring(t - (TI + 0.06), 11, 4.2);
      const retract = E.inOutCubic(seg(t, 1.85, 2.5));
      const lobeLen = 330 * grow * (1 - retract);
      const core = lerp(R0, 150, E.outCubic(seg(t, 2.1, 2.75))) * (1 + 0.6 * squash);
      const wobAmp = 0.07 * Math.exp(-Math.max(0, t - 2.3) * 3) * seg(t, 2.0, 2.3);

      // gocce balistiche che tornano al centro
      for (const d of DROPS) {
        const fly = Math.max(0, Math.min(t, 2.05) - (TI + 0.08));
        let x = CX + Math.cos(d.a) * (d.v * fly - 260 * fly * fly) * 0.7;
        let y = CY + Math.sin(d.a) * (d.v * fly - 260 * fly * fly) * 0.7 + 900 * fly * fly * 0.5;
        const back = E.inOutCubic(seg(t, 2.05, 2.6));
        x = lerp(x, CX, back);
        y = lerp(y, CY, back);
        const s = d.size * E.outBack(seg(t, TI + 0.08, TI + 0.25)) * (1 - back * 0.9);
        if (fly > 0 && s > 1) {
          const vy = Math.sin(d.a) * (d.v - 520 * fly) * 0.7 + 900 * fly;
          const vx = Math.cos(d.a) * (d.v - 520 * fly) * 0.7;
          const ang = Math.atan2(vy, vx);
          const stretch = back > 0 ? 1 + 0.6 * Math.sin(Math.PI * back) : 1 + 0.35 * clamp(1 - fly * 1.2);
          smoothPath(ctx, superPts(x, y, s * stretch, s / Math.sqrt(stretch), 2, 24, ang));
          fillStroke(ctx, d.color, C.ink, LW * 0.75);
        }
      }

      const lobesG = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, len: lobeLen * (i % 2 ? 0.82 : 1), w: 0.2 }));
      const lobesP = Array.from({ length: 9 }, (_, i) => ({ a: ((i + 0.5) / 9) * Math.PI * 2, len: lobeLen * 0.58, w: 0.17 }));
      const rot = 0.25 * grow - 0.4 * retract;
      // corona verde
      smoothPath(ctx, bloomPts(CX, CY - 40 * squash, core * (1 + 0.8 * squash), lobesG, 220, rot, wobAmp, t).map(([x, y]) => [x, CY - 40 * squash + (y - CY + 40 * squash) * (1 - 0.55 * squash)]));
      fillStroke(ctx, C.green);
      // corona pesca interna
      if (lobeLen > 8) {
        smoothPath(ctx, bloomPts(CX, CY, core * 0.62, lobesP, 200, -rot * 0.6));
        fillStroke(ctx, C.peach);
        ctx.beginPath();
        ctx.arc(CX, CY, core * 0.48 + lobeLen * 0.12, 0, Math.PI * 2);
        fillStroke(ctx, C.ivory);
      } else {
        ellipse(ctx, CX - core * 0.38, CY - core * 0.42, core * 0.18, core * 0.1, -0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();
      }
      return;
    }

    /* 4 — la gelatina diventa il marchio (3.0–4.2 s), 5 — il marchio va al suo posto e arriva la scritta */
    const L = lockup(ctx, LOGO_Y, 190, 150);
    const move = E.inOutCubic(seg(t, 4.15, 4.6));
    const mx = lerp(CX, L.markX, move);
    const my = lerp(CY, L.markY, move);
    const msize = lerp(320, 190, move);
    const settle = t > 5.55 ? wobble(t - 5.55, 0.07, 20, 7) : 0;
    const reveal = seg(t, 5.95, 6.8);

    ctx.save();
    ctx.translate(540, LOGO_Y);
    ctx.scale(1 + settle, 1 - settle);
    ctx.translate(-540, -LOGO_Y);
    if (t < 3.42) {
      // morph: gelatina → quadrato arrotondato del marchio (il contorno sfuma: il logo ufficiale non ha contorni)
      const m = E.inOutCubic(seg(t, 3.0, 3.38));
      const u = msize / 64;
      const wob = 0.05 * Math.exp(-(t - 3.0) * 4);
      const pts = superPts(mx, my + 2 * u, lerp(150, 28 * u, m), lerp(150, 26 * u, m), lerp(2, 5.2, m), 96, 0, (th) => 1 + wob * Math.sin(5 * th + t * 9));
      smoothPath(ctx, pts);
      fillStroke(ctx, C.green, C.ink, LW * (1 - m));
    } else {
      const tb = 3.42;
      drawLogoMark(ctx, mx, my, msize, {
        body: 1 + wobble(t - tb, 0.05, 22, 8),
        header: seg(t, tb, tb + 0.18),
        ringL: spring(t - tb - 0.1, 18, 6.5),
        ringR: spring(t - tb - 0.17, 18, 6.5),
        plate: E.outBack(seg(t, tb + 0.26, tb + 0.45), 2.6),
        ring: E.outCubic(seg(t, tb + 0.36, tb + 0.62)),
        check: E.outCubic(seg(t, tb + 0.55, tb + 0.75)),
      });
    }
    // lettere che cadono e si schiacciano all'atterraggio
    drawWordmark(ctx, L.textX, L.baseline, 150, (i) => {
      const ti = 4.45 + i * 0.075;
      const f = seg(t, ti, ti + 0.22);
      if (f <= 0) return { a: 0 };
      const land = t - (ti + 0.22);
      const w = land > 0 ? wobble(land, 0.28, 24, 8) : -0.12 * f;
      return { dy: (1 - E.inQuad(f)) * -260, sx: 1 + w, sy: 1 - w, a: 1 };
    });
    // spruzzi minuscoli all'atterraggio delle lettere
    ctx.font = '700 150px Inter';
    let lx = L.textX;
    for (let i = 0; i < WORD.length; i++) {
      const w = ctx.measureText(WORD[i]).width;
      const k = seg(t, 4.67 + i * 0.075, 4.95 + i * 0.075);
      if (k > 0 && k < 1) {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(lx + w / 2 + s * (20 + 40 * E.outCubic(k)), L.baseline + 8 - 60 * Math.sin(Math.PI * k), 7 * (1 - k), 0, Math.PI * 2);
          fillStroke(ctx, C.peach, C.ink, 4);
        }
      }
      lx += w - 150 * 0.015;
    }
    ctx.restore();

    // Mina sbuca dal basso e saluta
    const pop = spring(t - 4.75, 15, 6);
    if (pop > 0.01) {
      const wv = seg(t, 5.0, 5.8);
      const deg = 9 * Math.sin(wv * Math.PI * 4) * Math.sin(Math.PI * wv);
      shadow(ctx, 540, 1566, 170 * clamp(pop), 0.09);
      drawMina(ctx, null, 540, 1560, 640, { sx: clamp(pop, 0, 1.2) * (1 + 0.1 * (1 - clamp(pop))), sy: pop, layers: waveLayers(deg) });
    }

    /* 6 — onda verde che apre la Home reale (5.95–6.6 s) */
    if (reveal > 0) {
      const R = 2400 * E.inOutCubic(reveal);
      const wobR = (th) => 1 + 0.06 * Math.sin(6 * th + t * 8) + 0.04 * Math.sin(3 * th - t * 5);
      smoothPath(ctx, superPts(L.markX, L.markY, R, R, 2, 120, 0, wobR));
      fillStroke(ctx, C.green, C.ink, LW);
      const R2 = 2400 * E.inOutCubic(seg(t, 6.15, 6.98));
      if (R2 > 0) {
        ctx.save();
        smoothPath(ctx, superPts(L.markX, L.markY, R2, R2, 2, 120, 0, wobR));
        ctx.clip();
        drawScreen(ctx, IMG.home);
        ctx.restore();
        if (R2 < 2350) {
          smoothPath(ctx, superPts(L.markX, L.markY, R2, R2, 2, 120, 0, wobR));
          fillStroke(ctx, null, C.ink, LW);
        }
      }
    }
  }

  CONCEPTS.B = { duration: 7.2, draw };
})();
