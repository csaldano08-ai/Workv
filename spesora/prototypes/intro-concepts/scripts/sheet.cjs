// Contact sheet dei fotogrammi di controllo: node sheet.cjs <concetto> <out.png>
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
(async () => {
  const [c, out] = process.argv.slice(2);
  const dir = path.resolve(__dirname, '../out/frames');
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(c + '_')).sort((a, b) => parseFloat(a.slice(2)) - parseFloat(b.slice(2)));
  const w = 270, h = 480, cols = 6;
  const rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map(async (f, i) => ({
    input: await sharp(path.join(dir, f)).resize(w, h).composite([{ input: Buffer.from(`<svg width="${w}" height="30"><rect width="${w}" height="30" fill="#000" opacity="0.55"/><text x="8" y="21" font-size="18" fill="#fff" font-family="sans-serif">${f.slice(2, -4)} s</text></svg>`), top: 0, left: 0 }]).png().toBuffer(),
    left: (i % cols) * w, top: Math.floor(i / cols) * h,
  })));
  await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: '#222' } }).composite(tiles).png().toFile(out);
})();
