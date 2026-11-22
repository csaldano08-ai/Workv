/*
 * Monta la presentazione: cartello iniziale, giro reale dell'app in una cornice da telefono con didascalie
 * per capitolo, cartello finale. Usa out/marks.json e il video registrato da tour.cjs.
 *   node compose.cjs <cartella-out>
 */
const sharp = require('../../../node_modules/sharp');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const out = path.resolve(process.argv[2]);
const tmp = path.join(out, 'tmp');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const { marks, video } = JSON.parse(fs.readFileSync(path.join(out, 'marks.json'), 'utf8'));
const at = (id, last = false) => {
  const m = marks.filter((x) => x.id === id);
  return (last ? m[m.length - 1] : m[0]).t;
};

const CHAPTERS = [
  ['intro', "L'apertura", "Al primo avvio Spesora si presenta. Si può saltare."],
  ['benvenuto', 'Benvenuto', 'Mina, il ricettario vivente, ti accompagna.'],
  ['questionario', 'Due minuti di domande', 'Persone, pasti, dieta, allergie, gusti, tempi, spesa.'],
  ['caricamento', 'Spesora compone la settimana', 'Ricette, giorni e quantità, calcolati sul telefono.', true],
  ['anteprima', 'La tua prima settimana', 'Controlli tutto prima di iniziare.'],
  ['oggi', 'Oggi', 'Cosa cucinare e quando, cosa manca, la prossima spesa.'],
  ['ricetta', 'La ricetta', 'Ingredienti per le tue porzioni, passaggi con timer.'],
  ['settimana', 'La settimana', 'Pasti e giorni di spesa a colpo d’occhio.'],
  ['griglia', 'La settimana a griglia', 'Tutti i pasti in un colpo d’occhio, con i giorni di spesa.'],
  ['rigenera', 'Rifare il menù', 'Nuove ricette per i pasti ancora da cucinare.'],
  ['spesa', 'La lista della spesa', 'Divisa per giorno di spesa, con le quantità giuste.'],
  ['conferma', 'Spesa fatta', 'Confermi e i prodotti entrano in dispensa.'],
  ['dispensa', 'La dispensa', 'Sa cosa hai in casa e cosa potrebbe non bastare.'],
  ['cucinato', 'Ho cucinato', 'La dispensa si aggiorna da sola.'],
  ['ricettario', '500 ricette illustrate', 'Cerca per nome, ingrediente o regione.'],
];
const END = at('fine') + 1.4;
const W = 1080;
const H = 1920;
const PHONE = { w: 721, h: 1560, x: 180, y: 330, r: 56 };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const C = { ivory: '#F6F3EA', green: '#386E55', greenDark: '#2B5643', peach: '#E6A46D', ink: '#24332C', soft: '#56645D', paper: '#FFFDF8' };

const logoMark = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 64})">
  <rect x="4" y="8" width="56" height="52" rx="14" fill="${C.green}"/><rect x="4" y="8" width="56" height="14" rx="7" fill="${C.greenDark}"/>
  <rect x="16" y="3" width="5" height="12" rx="2.5" fill="${C.peach}"/><rect x="43" y="3" width="5" height="12" rx="2.5" fill="${C.peach}"/>
  <circle cx="32" cy="40" r="14" fill="${C.ivory}"/><circle cx="32" cy="40" r="9" fill="none" stroke="${C.peach}" stroke-width="2.5"/>
  <path d="M29 40 l2.5 2.5 l5 -5.5" stroke="${C.green}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

(async () => {
  // didascalie
  for (let i = 0; i < CHAPTERS.length; i++) {
    const [, title, sub] = CHAPTERS[i];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="320">
      <rect width="${W}" height="320" fill="${C.ivory}"/>
      <rect x="72" y="70" rx="22" ry="22" width="${84}" height="44" fill="${C.green}" stroke="${C.ink}" stroke-width="3"/>
      <text x="114" y="101" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="${C.ivory}">${i + 1}/${CHAPTERS.length}</text>
      <text x="72" y="190" font-family="Inter" font-weight="700" font-size="62" fill="${C.ink}">${esc(title)}</text>
      <text x="72" y="252" font-family="Inter" font-size="34" fill="${C.soft}">${esc(sub)}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(tmp, `cap_${String(i).padStart(2, '0')}.png`));
  }
  // cornice del telefono (fuori avorio, dentro trasparente, contorno scuro come nello stile dell'app)
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><mask id="m"><rect width="${W}" height="${H}" fill="white"/><rect x="${PHONE.x}" y="${PHONE.y}" width="${PHONE.w}" height="${PHONE.h}" rx="${PHONE.r}" fill="black"/></mask></defs>
    <rect width="${W}" height="${H}" fill="${C.ivory}" mask="url(#m)"/>
    <rect x="${PHONE.x - 4}" y="${PHONE.y - 4}" width="${PHONE.w + 8}" height="${PHONE.h + 8}" rx="${PHONE.r + 4}" fill="none" stroke="${C.ink}" stroke-width="8"/>
  </svg>`;
  await sharp(Buffer.from(frame)).png().toFile(path.join(tmp, 'frame.png'));
  // cartelli
  const mina = (await sharp(path.resolve(__dirname, '../../../assets/mascot/mina/poses/mina_welcome.png')).resize(620, 620).png().toBuffer()).toString('base64');
  const card = (lines, mina64) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${C.ivory}"/>
    ${mina64 ? `<image x="230" y="250" width="620" height="620" xlink:href="data:image/png;base64,${mina64}"/>` : ''}
    ${logoMark(268, 960, 150)}
    <text x="440" y="1075" font-family="Inter" font-weight="700" font-size="128" fill="${C.green}">Spesora</text>
    ${lines.map((l, i) => `<text x="540" y="${1250 + i * 62}" text-anchor="middle" font-family="Inter" font-weight="${l.bold ? 700 : 400}" font-size="${l.size || 40}" fill="${l.color || C.ink}">${esc(l.t)}</text>`).join('')}
  </svg>`;
  await sharp(Buffer.from(card([
    { t: 'Il calendario che decide cosa cucinare,' },
    { t: 'quando fare la spesa e cosa comprare.' },
    { t: 'Presentazione dell’app · demo reale', size: 32, color: C.soft },
  ], mina))).png().toFile(path.join(tmp, 'start.png'));
  await sharp(Buffer.from(card([
    { t: 'Tu pensi solo a cucinare.', bold: true, size: 46 },
    { t: 'Funziona senza connessione e senza account:' },
    { t: 'i tuoi dati restano sul telefono.' },
  ], mina))).png().toFile(path.join(tmp, 'end.png'));

  // montaggio del giro con didascalie
  const starts = CHAPTERS.map(([id, , , last]) => at(id, !!last));
  const args = ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=${C.ivory}:s=${W}x${H}:r=30:d=${END}`, '-i', video, '-i', path.join(tmp, 'frame.png')];
  CHAPTERS.forEach((_, i) => args.push('-i', path.join(tmp, `cap_${String(i).padStart(2, '0')}.png`)));
  let f = `[1:v]fps=30,scale=${PHONE.w}:${PHONE.h},setsar=1[ph];[0:v][ph]overlay=${PHONE.x}:${PHONE.y}:shortest=1[a0];[a0][2:v]overlay=0:0[b0]`;
  let last = 'b0';
  CHAPTERS.forEach((_, i) => {
    const s = starts[i];
    const e = i + 1 < CHAPTERS.length ? starts[i + 1] : END;
    f += `;[${last}][${3 + i}:v]overlay=0:0:enable='between(t,${s.toFixed(2)},${e.toFixed(2)})'[c${i}]`;
    last = `c${i}`;
  });
  args.push('-filter_complex', f, '-map', `[${last}]`, '-t', String(END), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', path.join(tmp, 'tour.mp4'));
  execFileSync('ffmpeg', args, { stdio: 'inherit' });

  // cartello iniziale (3 s) + giro + cartello finale (4 s), con dissolvenze brevi
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', '30', '-t', '3', '-i', path.join(tmp, 'start.png'),
    '-i', path.join(tmp, 'tour.mp4'),
    '-loop', '1', '-framerate', '30', '-t', '4', '-i', path.join(tmp, 'end.png'),
    '-filter_complex',
    `[0:v]format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5,fade=t=out:st=2.6:d=0.4[s];[1:v]format=yuv420p,setsar=1,fade=t=in:st=0:d=0.3[m];[2:v]format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5[e];[s][m][e]concat=n=3:v=1:a=0[o]`,
    '-map', '[o]', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'spesora_presentazione.mp4')], { stdio: 'inherit' });
  await sharp(path.join(tmp, 'start.png')).jpeg({ quality: 88 }).toFile(path.join(out, 'spesora_presentazione_copertina.jpg'));
  fs.rmSync(tmp, { recursive: true });
  console.log('Pronto:', path.join(out, 'spesora_presentazione.mp4'), `durata ~${(END + 7).toFixed(0)} s`);
})();
