import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C, FORE, RIG, SHOULDER, UPPER, apronPart, armFrame, armRotations, armTo, bodyPart, browsPart, minaStaticSvg, poseFrame, tubeD, type ArmLen, type Side, type Variant } from '../ui/mascot/mina2/art';
import { ARM, CHEF_POSES, MINA_POSES, POSES, resolvePose } from '../ui/mascot/mina2/poses';
import { MINA_STATE_POSE } from '../ui/mascot/mina2/states';

const ROOT = join(__dirname, '..', '..');

/** Centro del palmo per una posa del braccio (stessa geometria del disegno: 3 unità oltre il polso). */
function hand(side: Side, out: number, bend: number, variant: Variant = 'classic', len?: ArmLen) {
  const r = armRotations(side, { out, bend });
  const s = variant === 'classic' ? SHOULDER[side] : RIG[variant].shoulder[side];
  const [a, b0] = len ?? (variant === 'classic' ? [UPPER, FORE] : [RIG[variant].upper, RIG[variant].fore]);
  const b = b0 + 3;
  const rad = (d: number) => (d * Math.PI) / 180;
  const ex = s.x - a * Math.sin(rad(r.upper));
  const ey = s.y + a * Math.cos(rad(r.upper));
  const t = r.upper + r.fore;
  return { x: ex - b * Math.sin(rad(t)), y: ey + b * Math.cos(rad(t)) };
}

describe('Mina 2.0 — la borsetta della spesa', () => {
  it('ogni posa è un SVG valido e chiuso, con l’identità fissa della borsa', () => {
    expect(MINA_POSES).toHaveLength(27);
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s.endsWith('</svg>')).toBe(true);
      expect(s).not.toMatch(/<text/);
      // corpo avorio, manico e braccia verdi, contorno verde scuro, guance rosa
      for (const color of [C.ivory, C.green, C.line, C.cheek]) expect(s, p).toContain(color);
      const open = (s.match(/<(?!\/|\?|!)[a-zA-Z]/g) ?? []).length;
      const selfClosed = (s.match(/\/>/g) ?? []).length;
      const closed = (s.match(/<\/[a-zA-Z]+>/g) ?? []).length;
      expect(open, p).toBe(selfClosed + closed);
    }
  });

  it('nessun id né url(#…) nel disegno: con più Mina nella pagina gli id collidono e il corpo restava trasparente', () => {
    // sul web ogni SvgXml è un <svg> dello stesso documento: un id ripetuto punta sempre al primo, anche se è in una
    // scheda nascosta. Il fronte della borsa (e ogni altro riempimento) deve quindi essere un colore pieno.
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      expect(s, p).not.toMatch(/\burl\(#/);
      expect(s, p).not.toMatch(/\sid="/);
      expect(s, p).not.toMatch(/<(linearGradient|radialGradient|clipPath|mask|pattern)\b/);
    }
    for (const variant of ['classic', 'chef'] as const) {
      const body = bodyPart(variant);
      expect(body).not.toMatch(/\burl\(#/);
      // il fronte è opaco: colore pieno senza trasparenza sul riempimento principale
      expect(body).toContain(`fill="${C.ivory}"/>`);
    }
  });

  it('non è un libro: nessun colore della vecchia Mina ricettario', () => {
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      // copertina, dorso e segnalibro della vecchia Mina
      for (const old of ['#FAF6EC', '#2F5C47', '#E6A46D']) expect(s, p).not.toContain(old);
    }
  });

  it('Mina Chef (cappello e grembiule) solo nelle pose di cucina e ricette', () => {
    expect(CHEF_POSES.sort()).toEqual(['checklist', 'cooking', 'mixing', 'recipe', 'serving']);
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      const hasHat = s.includes(C.hatShade);
      expect(hasHat, p).toBe(CHEF_POSES.includes(p));
    }
  });

  it('le pose delle braccia portano davvero la mano dove indicato (cinematica inversa)', () => {
    const targets: [Side, number, number][] = [
      ['R', 181, 103],
      ['L', 26, 146],
      ['R', 150, 140],
      ['L', 30, 141],
    ];
    for (const [side, x, y] of targets) {
      const pose = armTo(side, x, y);
      const h = hand(side, pose.out, pose.bend);
      expect(Math.hypot(h.x - x, h.y - y), `${side} ${x},${y}`).toBeLessThan(0.6);
    }
    // bersaglio troppo lontano: il braccio si distende (quasi dritto) verso di lui
    const far = armTo('R', 200, 40);
    expect(Math.abs(far.bend)).toBeLessThan(20);
  });

  it('Mina Chef è Mina 2.0 con gli accessori: stesso scheletro, nessuna lunghezza propria delle braccia', () => {
    expect(RIG.chef.shoulder).toEqual(RIG.classic.shoulder);
    expect([RIG.chef.upper, RIG.chef.fore]).toEqual([RIG.classic.upper, RIG.classic.fore]);
    for (const p of CHEF_POSES) {
      const look = POSES[p].look;
      expect(look.armL.len, `${p} L`).toBeUndefined();
      expect(look.armR.len, `${p} R`).toBeUndefined();
    }
    for (const [side, x, y] of [
      ['R', 185, 100],
      ['L', 31.5, 165.6],
    ] as const) {
      const pose = armTo(side, x, y, {}, 'chef');
      const h = hand(side, pose.out, pose.bend, 'chef');
      expect(Math.hypot(h.x - x, h.y - y), `${side} ${x},${y}`).toBeLessThan(0.6);
    }
  });

  it('Mina Chef nelle sue pose: cucchiaio e occhiolino, ciotola, cloche, cartellina, sulla borsa di Mina 2.0', () => {
    const chef = (p: keyof typeof POSES) => POSES[p].look;
    expect(chef('cooking').armR.prop).toBe('spoon');
    expect(chef('cooking').eyes).toBe('wink');
    expect(chef('mixing').armR.prop).toBe('whisk');
    expect(chef('mixing').eyes).toBe('happy');
    expect(chef('serving').armR.prop).toBe('cloche');
    expect(chef('checklist').armR.prop).toBe('clipboard');
    // gli oggetti larghi restano dentro il riquadro: la figura si sposta a sinistra
    expect(chef('serving').shift ?? 0).toBeLessThan(0);
    for (const p of CHEF_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      expect(s, p).toContain(C.ivoryShade); // la stessa borsa di Mina 2.0 (fianco e fronte)
      expect(s, p).not.toContain(C.chefSide); // nessuna borsa diversa
    }
  });

  it('a riposo le braccia sono quasi distese (gomito oltre 140°), non piegate a metà', () => {
    for (const side of ['L', 'R'] as const) {
      const f = poseFrame(side, side === 'L' ? ARM.restL : ARM.restR, 'classic');
      const v1 = { x: f.s.x - f.e.x, y: f.s.y - f.e.y };
      const v2 = { x: f.w.x - f.e.x, y: f.w.y - f.e.y };
      const ang = (Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180) / Math.PI;
      expect(ang, side).toBeGreaterThan(140);
    }
    // il saluto non resta fisso: da ferma Mina sta a riposo
    expect(POSES.welcome.look.armR).toEqual(ARM.restR);
  });

  it('ogni stato di MinaAnimated porta a una posa esistente, in entrambe le varianti', () => {
    for (const variant of ['standard', 'chef'] as const) {
      for (const state of Object.keys(MINA_STATE_POSE[variant]) as (keyof (typeof MINA_STATE_POSE)[typeof variant])[]) {
        const pose = MINA_STATE_POSE[variant][state];
        expect(MINA_POSES, `${variant}/${String(state)}`).toContain(pose);
        // la variante chef usa solo pose di Mina Chef
        if (variant === 'chef') expect(POSES[pose].look.variant, String(state)).toBe('chef');
      }
    }
  });

  it('braccia rigide e collegate: partono dalla spalla, braccio e avambraccio non cambiano mai lunghezza, la mano segue l’avambraccio', () => {
    for (const variant of ['classic', 'chef'] as const) {
      for (const [upper, fore] of [
        [10, 20],
        [-40, 60],
        [120, -30],
        [170, 15],
        [-95, -70],
      ]) {
        for (const side of ['L', 'R'] as const) {
          const f = armFrame(side, upper, fore, variant);
          // l'attacco è la spalla dello scheletro: il braccio non si stacca mai dal corpo
          expect(f.s).toEqual(RIG[variant].shoulder[side]);
          // nessuna deformazione: i due segmenti hanno sempre la lunghezza dello scheletro
          expect(Math.hypot(f.e.x - f.s.x, f.e.y - f.s.y)).toBeCloseTo(RIG[variant].upper, 6);
          expect(Math.hypot(f.w.x - f.e.x, f.w.y - f.e.y)).toBeCloseTo(RIG[variant].fore, 6);
          // la mano è attaccata al polso e orientata come l'avambraccio (non ruota da sola)
          const dir = (Math.atan2(-(f.w.x - f.e.x), f.w.y - f.e.y) * 180) / Math.PI;
          expect(Math.abs(((f.hand - dir + 540) % 360) - 180)).toBeLessThan(1e-6);
          expect(Math.hypot(f.palm.x - f.w.x, f.palm.y - f.w.y)).toBeCloseTo(3, 6);
          // un solo tracciato continuo dalla spalla al polso (contorno senza interruzioni)
          const d = tubeD(f);
          expect(d.match(/M/g)).toHaveLength(1);
          expect(d.startsWith(`M${f.s.x.toFixed(2)},${f.s.y.toFixed(2)}`)).toBe(true);
          expect(d.endsWith(`${f.w.x.toFixed(2)},${f.w.y.toFixed(2)}`)).toBe(true);
        }
      }
    }
  });

  it('nessuna posa fa passare il braccio davanti al viso', () => {
    // occhi e bocca di Mina 2.0 e di Mina Chef (riquadri del viso nel disegno)
    const face: Record<Variant, { x0: number; x1: number; y0: number; y1: number }> = {
      classic: { x0: 84, x1: 141, y0: 96, y1: 132 },
      chef: { x0: 84, x1: 141, y0: 96, y1: 132 },
    };
    for (const p of MINA_POSES) {
      const look = POSES[p].look;
      for (const side of ['L', 'R'] as const) {
        const f = poseFrame(side, side === 'L' ? look.armL : look.armR, look.variant);
        const box = face[look.variant];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          // braccio (spalla → gomito) e avambraccio (gomito → polso)
          for (const [a, b] of [
            [f.s, f.e],
            [f.e, f.w],
          ]) {
            const x = a.x + (b.x - a.x) * t;
            const y = a.y + (b.y - a.y) * t;
            const inside = x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1;
            expect(inside, `${p} ${side} t=${t}`).toBe(false);
          }
        }
      }
    }
  });

  it('le mani di Mina 2.0 non passano sopra gli ingredienti (lattuga, apertura, ciuffo della carota)', () => {
    const zones = [
      { name: 'lattuga', x0: 14, x1: 52, y0: 68, y1: 104 },
      { name: 'apertura', x0: 58, x1: 146, y0: 8, y1: 80 },
      { name: 'ciuffo', x0: 146, x1: 184, y0: 26, y1: 70 },
    ];
    for (const [name, pose] of Object.entries(ARM)) {
      const side = name.endsWith('L') ? 'L' : 'R';
      const f = poseFrame(side, pose, 'classic');
      for (const z of zones) {
        const inside = f.palm.x > z.x0 && f.palm.x < z.x1 && f.palm.y > z.y0 && f.palm.y < z.y1;
        expect(inside, `${name} sopra ${z.name}`).toBe(false);
      }
    }
  });

  it('sopracciglia e grembiule sono livelli a parte (espressioni e trasformazione in Mina Chef)', () => {
    expect(browsPart('none')).toBe('');
    for (const b of ['soft', 'worried', 'raised', 'focus'] as const) {
      expect(browsPart(b), b).toContain(C.eye);
      expect(browsPart(b, 'chef'), b).toContain(C.eye);
    }
    expect(POSES.concerned.look.brows).toBe('worried');
    expect(POSES.thinking.look.brows).toBe('focus');
    // il corpo di Mina Chef senza grembiule è la base della trasformazione; con il grembiule è identico a prima
    const apron = apronPart(true);
    expect(bodyPart('chef')).toContain(apron);
    expect(bodyPart('chef', { apron: false })).not.toContain(apron.slice(0, 40));
    expect(bodyPart('chef', { apron: false }).length).toBe(bodyPart('chef').length - apron.length);
  });

  it('i vecchi nomi delle pose restano validi e un nome ignoto usa la posa neutra', () => {
    expect(resolvePose('saluto')).toBe('welcome');
    expect(resolvePose('spesa')).toBe('shopping');
    expect(resolvePose('success')).toBe('success');
    expect(resolvePose('inesistente')).toBe('neutral');
  });

  it('nessuna immagine raster o di rete: la mascotte è solo vettoriale e locale', () => {
    const dir = join(ROOT, 'src', 'ui', 'mascot');
    const files = [join(dir, 'Mina.tsx'), ...readdirSync(join(dir, 'mina2')).map((f) => join(dir, 'mina2', f))];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/require\(/);
      expect(src, f).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    // la vecchia Mina (ricettario) non è più nel progetto
    expect(existsSync(join(ROOT, 'assets', 'mascot', 'mina'))).toBe(false);
    expect(existsSync(join(dir, 'minaRaster.ts'))).toBe(false);
  });
});
