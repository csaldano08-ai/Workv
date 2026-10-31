// Controllo configurazione: in sviluppo segnala, con --release blocca.
import { readFileSync } from 'node:fs';
import { checkConfig } from './checks.mjs';

const release = process.argv.includes('--release');
const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { errors, warnings } = checkConfig(appJson, pkg, { release });
for (const w of warnings) console.warn(`  avviso: ${w}`);
for (const e of errors) console.error(`  ERRORE: ${e}`);
console.warn(`Configurazione (${release ? 'produzione' : 'sviluppo'}): ${errors.length} errori, ${warnings.length} avvisi`);
process.exit(errors.length > 0 ? 1 : 0);
