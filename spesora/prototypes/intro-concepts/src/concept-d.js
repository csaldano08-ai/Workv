/*
 * CONCEPT D — IL CALENDARIO MAGICO DI MINA
 * Una pagina illustrata cade e si posa → si taglia in sette giornate che si separano con molle sfalsate →
 * nelle giornate compaiono i piatti veri del ricettario e la lista della spesa si spunta →
 * Mina arriva, le giornate si raccolgono in un ricettario e la copertina si chiude →
 * il libro gira e sul retro c'è il marchio Spesora → il marchio si allarga e diventa la Settimana reale.
 */
(() => {
  const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const SHOP = [0, 3]; // giorni di spesa (intestazione pesca)
  const STRIP = { x: 50, y: 470, w: 980, h: 470 };
  const COLW = (STRIP.w - 6 * 14) / 7;
  const BOOKR = { cx: 540, cy: 820, w: 400, h: 520 };
  const LOGO_Y = 700;

  function colRect(i, gap) {
    const w = (STRIP.w - 6 * gap) / 7;
    return { x: STRIP.x + i * (w + gap), y: STRIP.y, w, h: STRIP.h };
  }

  function thumb(ctx, img, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const s = (r * 2) / 600;
    ctx.drawImage(img, 100, 0, 600, 600, x - r, y - r, 600 * s, 600 * s);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    fillStroke(ctx, null, C.ink, LW * 0.7);
  }

  function checklist(ctx, t, x, y, w, h) {
    rrect(ctx, x, y, w, h, 34);
    fillStroke(ctx, C.paper);
    for (let i = 0; i < 3; i++) {
      const ry = y + 70 + i * 82;
      const ck = seg(t, 2.62 + i * 0.17, 2.82 + i * 0.17);
      const bump = 1 + wobble(t - (2.62 + i * 0.17), 0.18, 26, 9);
      ctx.save();
      ctx.translate(x + 70, ry);
      ctx.scale(bump, bump);
      rrect(ctx, -26, -26, 52, 52, 14);
      fillStroke(ctx, ck > 0 ? C.greenSoft : C.paper, C.ink, LW * 0.8);
      if (ck > 0) {
        partialLine(ctx, [[-14, 0], [-4, 11], [16, -12]], E.outCubic(ck));
        ctx.strokeStyle = C.green;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
      rrect(ctx, x + 125, ry - 11, (w - 200) * (i === 1 ? 0.7 : 0.88), 22, 11);
      ctx.fillStyle = ck >= 1 ? C.sageLight : '#E2DDCF';
      ctx.fill();
    }
  }

  function draw(ctx, t) {
    background(ctx);

    /* 1 — la pagina cade e si posa (0–1 s) */
    const drop = E.inQuad(seg(t, 0.1, 0.5));
    const land = t > 0.5 ? wobble(t - 0.5, 0.1, 20, 6) : 0;
    const split = E.outCubic(seg(t, 1.0, 1.25));
    const gather = (i) => E.inOutCubic(seg(t, 3.45 + i * 0.035, 3.78 + i * 0.035));
    // copertina: spunta di taglio dal dorso (0.5), si apre (1), poi si chiude (0)
    const coverT = t < 4.0 ? 0.5 + 0.5 * E.outCubic(seg(t, 3.84, 4.0)) : 1 - E.inCubic(seg(t, 4.0, 4.22));
    const SHIFT = 150; // il libro sta a destra mentre è aperto, così la copertina resta nell'inquadratura
    const shiftX = SHIFT * (1 - E.inOutCubic(seg(t, 4.0, 4.24)));
    const closed = t >= 4.22;

    if (t < 1.0) {
      const y = lerp(-700, STRIP.y, drop);
      shadow(ctx, 540, STRIP.y + STRIP.h + 50, 460 * drop, 0.09);
      ctx.save();
      ctx.translate(540, y + STRIP.h);
      ctx.rotate((1 - drop) * -0.12);
      ctx.scale(1 + land, 1 - land);
      ctx.translate(-540, -(y + STRIP.h));
      rrect(ctx, STRIP.x, y, STRIP.w, STRIP.h, 40);
      fillStroke(ctx, C.paper);
      ctx.restore();
      return;
    }

    /* 2 — le sette giornate (1–2 s) e 3 — piatti e spesa (2–3 s) */
    if (!closed) shadow(ctx, 540, STRIP.y + STRIP.h + 50, 460 * (1 - gather(3)) + 200 * gather(3), 0.08);
    // linee di taglio
    if (t < 1.25) {
      ctx.save();
      ctx.setLineDash([22, 16]);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 5;
      for (let i = 1; i < 7; i++) {
        const xx = STRIP.x + (STRIP.w / 7) * i;
        partialLine(ctx, [[xx, STRIP.y], [xx, STRIP.y + STRIP.h]], seg(t, 1.0 + i * 0.02, 1.2 + i * 0.02));
        ctx.stroke();
      }
      ctx.restore();
    }
    if (t < 4.0) {
      for (let i = 0; i < 7; i++) {
        const s = spring(t - 1.12 - i * 0.05, 15, 6);
        const gap = 14 * clamp(s, 0, 1.4);
        const r0 = colRect(i, 0);
        const r1 = colRect(i, 14);
        let rx = lerp(r0.x, r1.x, s);
        let ry = STRIP.y - 26 * Math.sin(Math.PI * clamp(s)) * (i % 2 ? 1 : 0.6);
        let rw = lerp(r0.w, r1.w, clamp(s));
        let rh = STRIP.h;
        const g = gather(i);
        if (g > 0) {
          rx = lerp(rx, BOOKR.cx + SHIFT - BOOKR.w / 2 + 20, g);
          ry = lerp(ry, BOOKR.cy - BOOKR.h / 2 + 20, g);
          rw = lerp(rw, BOOKR.w - 40, g);
          rh = lerp(rh, BOOKR.h - 40, g);
        }
        ctx.save();
        rrect(ctx, rx, ry, rw, rh, lerp(4, 26, clamp(s)) + 10 * g);
        fillStroke(ctx, C.paper);
        // intestazione del giorno
        rrect(ctx, rx, ry, rw, 74, lerp(4, 26, clamp(s)));
        ctx.fillStyle = SHOP.includes(i) ? C.peachSoft : C.greenSoft;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(rx, ry + 74);
        ctx.lineTo(rx + rw, ry + 74);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = LW * 0.6;
        ctx.stroke();
        rrect(ctx, rx, ry, rw, rh, lerp(4, 26, clamp(s)) + 10 * g);
        fillStroke(ctx, null);
        const lk = E.outBack(seg(t, 1.35 + i * 0.05, 1.6 + i * 0.05), 2.4) * (1 - g);
        if (lk > 0) {
          ctx.save();
          ctx.font = '700 44px Inter';
          ctx.fillStyle = SHOP.includes(i) ? C.peachInk || '#8A4F1F' : C.greenDark;
          ctx.textAlign = 'center';
          ctx.translate(rx + rw / 2, ry + 52);
          ctx.scale(lk, lk);
          ctx.fillText(DAYS[i], 0, 0);
          ctx.restore();
        }
        // piatti veri del ricettario
        const pk = E.outBack(seg(t, 1.95 + i * 0.075, 2.25 + i * 0.075), 2.6) * (1 - g);
        if (pk > 0.01) {
          ctx.save();
          ctx.translate(rx + rw / 2, ry + 190);
          ctx.rotate((1 - clamp(pk)) * 0.8);
          ctx.scale(pk, pk);
          thumb(ctx, IMG['thumb' + i], 0, 0, 54);
          ctx.restore();
          for (let l = 0; l < 2; l++) {
            rrect(ctx, rx + 22, ry + 290 + l * 40, (rw - 44) * (l ? 0.6 : 1) * clamp(pk), 18, 9);
            ctx.fillStyle = '#E2DDCF';
            ctx.fill();
          }
        }
        ctx.restore();
      }
      // lista della spesa che si spunta
      const cs = spring(t - 2.3, 14, 6);
      const cg = E.inOutCubic(seg(t, 3.55, 3.95));
      if (cs > 0.01) {
        const w = lerp(640, BOOKR.w - 40, cg);
        const h = lerp(320, BOOKR.h - 40, cg);
        const x = lerp(220, BOOKR.cx + SHIFT - w / 2, cg);
        const y = lerp(H + 40 - (H + 40 - 1020) * cs, BOOKR.cy - h / 2, cg);
        ctx.save();
        ctx.globalAlpha = 1 - seg(t, 3.85, 3.95);
        checklist(ctx, t, x, y, w, h);
        ctx.restore();
      }
    }

    /* 4 — la copertina verde si chiude sul ricettario (3.95–4.2 s) */
    const flip = seg(t, 4.55, 4.95); // 5 — il libro gira e mostra il marchio
    const bump = t > 4.22 ? wobble(t - 4.22, 0.08, 22, 7) : 0;
    if (t >= 3.84 && flip < 0.5) {
      const hingeX = BOOKR.cx - BOOKR.w / 2;
      const sxBook = flip > 0 ? Math.cos(Math.PI * flip) : 1;
      ctx.save();
      ctx.translate(shiftX, 0);
      ctx.translate(BOOKR.cx, BOOKR.cy + BOOKR.h / 2);
      ctx.scale((1 + bump) * sxBook, 1 - bump);
      ctx.translate(-BOOKR.cx, -(BOOKR.cy + BOOKR.h / 2));
      // pagine (blocco): compaiono sotto le giornate raccolte; poi la copertina ruota sul dorso
      ctx.save();
      ctx.globalAlpha *= seg(t, 3.9, 4.0);
      rrect(ctx, hingeX, BOOKR.cy - BOOKR.h / 2, BOOKR.w, BOOKR.h, 30);
      fillStroke(ctx, C.paper);
      ctx.restore();
      const csx = Math.cos(Math.PI * coverT);
      ctx.save();
      ctx.translate(hingeX, 0);
      ctx.transform(csx, -0.06 * Math.sin(Math.PI * coverT), 0, 1, 0, 0);
      ctx.translate(-hingeX, 0);
      rrect(ctx, hingeX, BOOKR.cy - BOOKR.h / 2 - 6, BOOKR.w + 6, BOOKR.h + 12, 32);
      fillStroke(ctx, csx >= 0 ? C.green : C.sage, C.ink, LW / Math.max(0.3, Math.abs(csx)));
      if (csx > 0.6) {
        drawIngredient(ctx, 1, BOOKR.cx + 20, BOOKR.cy + 40, 130, -0.4);
      }
      ctx.restore();
      rrect(ctx, hingeX - 18, BOOKR.cy - BOOKR.h / 2 - 10, 62, BOOKR.h + 20, 28);
      fillStroke(ctx, C.greenDark);
      // segnalibro che oscilla dopo la chiusura
      const swing = t > 4.22 ? Math.sin((t - 4.22) * 10) * Math.exp(-(t - 4.22) * 3.5) * 0.4 : 0;
      ctx.save();
      ctx.translate(BOOKR.cx - 60, BOOKR.cy + BOOKR.h / 2);
      ctx.rotate(swing);
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-20, 110);
      ctx.lineTo(0, 88);
      ctx.lineTo(20, 110);
      ctx.lineTo(20, 0);
      ctx.closePath();
      fillStroke(ctx, C.peach);
      ctx.restore();
      ctx.restore();
    }

    /* 5 — sul retro, il marchio; poi la scritta (4.75–5.8 s) */
    const L = lockup(ctx, LOGO_Y, 190, 150);
    const toLock = E.inOutCubic(seg(t, 5.05, 5.45));
    const grow = E.inOutCubic(seg(t, 6.0, 6.75));
    if (flip >= 0.5) {
      const sx = -Math.cos(Math.PI * flip);
      const msize = lerp(360, 190, toLock);
      const mx = lerp(BOOKR.cx, L.markX, toLock);
      const my = lerp(BOOKR.cy, L.markY, toLock);
      if (grow <= 0) {
        ctx.save();
        ctx.translate(mx, my);
        ctx.scale(sx * (1 + wobble(t - 4.95, 0.06, 20, 7)), 1 - wobble(t - 4.95, 0.06, 20, 7));
        ctx.translate(-mx, -my);
        drawLogoMark(ctx, mx, my, msize, { check: E.outCubic(seg(t, 4.95, 5.15)) });
        ctx.restore();
      }
      drawWordmark(ctx, L.textX, L.baseline, 150, (i) => {
        const ti = 5.42 + i * 0.06;
        const k = spring(t - ti, 16, 6.5);
        return { sx: clamp(k, 0, 1.2), sy: k, dy: (1 - clamp(k)) * 50, a: seg(t, ti, ti + 0.1) * (1 - seg(t, 6.0, 6.25)) };
      });
    }

    /* Mina: arriva, assiste alla chiusura, festeggia */
    const mIn = spring(t - 3.05, 14, 6);
    const MX = 830;
    if (mIn > 0.01) {
      const happy = t >= 4.22;
      const hop = happy ? Math.sin(Math.PI * seg(t, 4.22, 4.55)) : 0;
      const landM = t > 4.55 ? wobble(t - 4.55, 0.1, 22, 8) : 0;
      const k = E.inOutCubic(seg(t, 5.0, 5.4));
      const fx = lerp(lerp(1400, MX, clamp(mIn)), 540, k);
      const fy = lerp(1800, 1600, k) - 120 * hop;
      const size = lerp(560, 640, k);
      shadow(ctx, fx, lerp(1806, 1606, k), size * 0.27, 0.09 * (1 - grow));
      drawMina(ctx, happy ? IMG.happy : IMG.calendar, fx, fy, size, {
        sx: 1 - 0.05 * hop + landM,
        sy: 1 + 0.07 * hop - landM,
        rot: happy ? 0 : -0.05 * (1 - clamp(mIn)),
        alpha: 1 - seg(t, 6.05, 6.35),
      });
    }

    /* 6 — il marchio si allarga e diventa la Settimana reale (6.0–6.75 s) */
    if (grow > 0) {
      const u = 190 / 64;
      const x0 = lerp(L.markX - 28 * u, 0, grow);
      const y0 = lerp(L.markY - 24 * u, 0, grow);
      const w = lerp(56 * u, W, grow);
      const h = lerp(52 * u, H, grow);
      const r = lerp(14 * u, 0, grow);
      ctx.save();
      rrect(ctx, x0, y0, w, h, r);
      ctx.fillStyle = C.green;
      ctx.fill();
      ctx.clip();
      // i dettagli del marchio crescono con il riquadro e svaniscono mentre compare la schermata
      ctx.save();
      ctx.globalAlpha = 1 - seg(t, 6.05, 6.35);
      const ms = 190 * (w / (56 * u));
      drawLogoMark(ctx, x0 + w / 2, y0 + h / 2 - 2 * (ms / 64), ms, {});
      ctx.restore();
      ctx.globalAlpha = E.inOutCubic(seg(t, 6.15, 6.6));
      ctx.drawImage(IMG.week, 0, 0, W, H);
      ctx.restore();
    }
  }

  CONCEPTS.D = { duration: 7.1, draw };
})();
