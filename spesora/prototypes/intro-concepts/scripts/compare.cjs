/*
 * Video comparativo: per ogni concept un cartello di 1,2 s (lettera, nome, idea) seguito dall'intro
 * con un'etichetta fissa in alto. Genera anche le anteprime (un fotogramma rappresentativo per concept).
 *   node scripts/compare.cjs
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.resolve(__dirname, '../out');
const TMP = path.join(OUT, 'tmp');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(OUT, 'previews'), { recursive: true });

const LIST = [
  { id: 'A', file: 'spesora_intro_A_mina', name: 'Mina prende vita', idea: 'Il ricettario diventa Mina e presenta il logo.', poster: 3.05 },
  { id: 'B', file: 'spesora_intro_B_splash', name: 'Splash elastico', idea: 'Una goccia verde sboccia e diventa il marchio.', poster: 1.3 },
  { id: 'C', file: 'spesora_intro_C_ingredients', name: 'Ingredienti che danzano', idea: 'Gli ingredienti girano e costruiscono il logo.', poster: 1.85 },
  { id: 'D', file: 'spesora_intro_D_calendar', name: 'Il calendario magico', idea: 'La settimana si organizza e si chiude in un libro.', poster: 2.95 },
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

(async () => {
  for (const c of LIST) {
    const title = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
      <rect width="1080" height="1920" fill="#F6F3EA"/>
      <circle cx="540" cy="760" r="170" fill="#386E55" stroke="#24332C" stroke-width="8"/>
      <text x="540" y="822" text-anchor="middle" font-family="Inter" font-weight="700" font-size="180" fill="#F6F3EA">${c.id}</text>
      <text x="540" y="1070" text-anchor="middle" font-family="Inter" font-weight="700" font-size="76" fill="#24332C">${esc(c.name)}</text>
      <text x="540" y="1150" text-anchor="middle" font-family="Inter" font-size="36" fill="#56645D">${esc(c.idea)}</text>
      <text x="540" y="1780" text-anchor="middle" font-family="Inter" font-weight="600" font-size="34" fill="#386E55" letter-spacing="4">SPESORA · CONCEPT INTRO</text>
    </svg>`;
    await sharp(Buffer.from(title)).png().toFile(path.join(TMP, `title_${c.id}.png`));
    const w = 120 + c.name.length * 25;
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="140">
      <rect x="36" y="40" rx="34" ry="34" width="${w}" height="68" fill="#24332C" opacity="0.82"/>
      <text x="${36 + w / 2}" y="86" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#F6F3EA">${c.id} · ${esc(c.name)}</text>
    </svg>`;
    await sharp(Buffer.from(label)).png().toFile(path.join(TMP, `label_${c.id}.png`));
    // anteprima: fotogramma rappresentativo estratto dal video
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(c.poster), '-i', path.join(OUT, `${c.file}.mp4`), '-frames:v', '1', '-q:v', '2', path.join(OUT, 'previews', `${c.file}.jpg`)]);
  }
  // concatenazione: [cartello A][intro A][cartello B][intro B]...
  const args = ['-y', '-loglevel', 'error'];
  LIST.forEach((c) => {
    args.push('-loop', '1', '-framerate', '60', '-t', '1.2', '-i', path.join(TMP, `title_${c.id}.png`));
    args.push('-i', path.join(OUT, `${c.file}.mp4`));
    args.push('-i', path.join(TMP, `label_${c.id}.png`));
  });
  const parts = [];
  LIST.forEach((c, i) => {
    const b = i * 3;
    parts.push(`[${b}:v]format=yuv420p,setsar=1[t${i}]`);
    parts.push(`[${b + 1}:v][${b + 2}:v]overlay=0:0,format=yuv420p,setsar=1[v${i}]`);
  });
  const chain = LIST.map((_, i) => `[t${i}][v${i}]`).join('');
  const filter = `${parts.join(';')};${chain}concat=n=${LIST.length * 2}:v=1:a=0[out]`;
  args.push('-filter_complex', filter, '-map', '[out]', '-r', '60', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'spesora_intro_confronto.mp4'));
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  // tavola con le quattro anteprime affiancate
  const tiles = await Promise.all(LIST.map(async (c, i) => ({ input: await sharp(path.join(OUT, 'previews', `${c.file}.jpg`)).resize(540, 960).toBuffer(), left: i * 540, top: 0 })));
  await sharp({ create: { width: 2160, height: 960, channels: 3, background: '#F6F3EA' } }).composite(tiles).jpeg({ quality: 88 }).toFile(path.join(OUT, 'previews', 'spesora_intro_anteprime.jpg'));
  fs.rmSync(TMP, { recursive: true });
  console.log('Confronto e anteprime pronti in', OUT);
})();
