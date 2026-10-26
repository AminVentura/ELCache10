#!/usr/bin/env node
/**
 * Despliegue a Firebase SOLO a propósito (2026-10-25). Sin `--confirmar` no despliega nada: dice qué haría.
 *
 *   npm run deploy:web -- --confirmar
 *
 * Antes de desplegar comprueba: rama main, sin cambios ni archivos sin versionar (el despliegue desde
 * local sube TODA la carpeta, también lo que no está en git) y al día con origin/main.
 * No lee ni imprime secretos: los secretos viven en Secret Manager (ver apphosting.yaml).
 */
import { execFileSync, spawnSync } from 'node:child_process';

const PROYECTO = 'chatbot-citas-elcache10';
const FIREBASE_TOOLS = 'firebase-tools@15.34.0';
const DESTINOS = {
  web: { only: 'apphosting:elcache-web', descripcion: 'web elcache10.com (portada, guías, AdSense), panel admin y staff-photo' },
  'web-estatico': { only: 'hosting:web', permitirSucios: ['public/'], descripcion: 'PLAN B solo archivos (public/): sin /admin, sin /api/staff-photo y portada sin datos en vivo' },
};

const [destino, ...resto] = process.argv.slice(2);
const confirmar = resto.includes('--confirmar');
const d = DESTINOS[destino];
if (!d) {
  console.error(`Destino desconocido: ${destino || '(ninguno)'}. Usa uno de: ${Object.keys(DESTINOS).join(', ')}`);
  process.exit(2);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const problemas = [];
try {
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') problemas.push('no estás en la rama main');
  // public/ lo regenera build:static (algunos archivos siguen versionados): solo se admite en el plan B.
  const permitidos = d.permitirSucios || [];
  const sucios = git('status', '--porcelain')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((l) => !permitidos.some((pref) => l.slice(3).replace(/^"|"$/g, '').startsWith(pref)));
  if (sucios.length) problemas.push('hay cambios o archivos sin versionar (se subirían)');
  git('fetch', '--quiet', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) problemas.push('main no coincide con origin/main');
} catch (e) {
  problemas.push(`no se pudo revisar git: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
}

const comando = ['--yes', FIREBASE_TOOLS, 'deploy', '--only', d.only, '--project', PROYECTO];
console.log(`Destino: ${destino} → ${d.descripcion}`);
console.log(`Comando: npx ${comando.join(' ')}`);
if (problemas.length) {
  console.error(`No se despliega: ${problemas.join('; ')}.`);
  process.exit(1);
}
if (!confirmar) {
  console.log('Simulación: no se desplegó nada. Para desplegar de verdad añade -- --confirmar');
  process.exit(1);
}
const r = spawnSync('npx', comando, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
