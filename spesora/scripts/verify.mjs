// `npm run verify`: typecheck, lint, test (motore, catalogo, stringhe, sorgenti), configurazione.
import { spawnSync } from 'node:child_process';

const steps = [
  ['Typecheck', 'npx', ['tsc', '--noEmit']],
  ['Lint', 'npx', ['eslint', '.', '--max-warnings=0']],
  ['Test (motore, catalogo, persistenza, notifiche, stringhe, sorgenti)', 'npx', ['vitest', 'run']],
  ['Immagini (manifest, file, mappe statiche)', 'npx', ['tsx', 'scripts/images/check.ts']],
  ['Configurazione e dipendenze', 'node', ['scripts/check-config.mjs']],
];

let failed = 0;
for (const [label, cmd, args] of steps) {
  console.warn(`\n▶ ${label}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    failed++;
    console.error(`✖ ${label} non superato`);
  } else console.warn(`✔ ${label}`);
}
console.warn(failed === 0 ? '\nTutti i controlli superati.' : `\n${failed} controlli non superati.`);
process.exit(failed === 0 ? 0 : 1);
