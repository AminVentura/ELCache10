import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, 'public');

const STATIC_ENTRIES = [
  'css',
  'data',
  'images',
  'js',
  'videos',
  'watch',
  'guias',
  'ads.txt',
  // PWA del panel /admin (2026-10-15): manifiesto, service worker y aviso sin conexión.
  'admin.webmanifest',
  'admin-sw.js',
  'admin-offline.html',
  'aviso-legal.html',
  'cookies.html',
  'favicon.ico',
  // Firebase Hosting (2026-10-26): página 404 propia y manifiesto (antes caían en la portada).
  '404.html',
  'site.webmanifest',
  'index.html',
  'privacidad.html',
  'robots.txt',
  'sitemap.xml',
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of STATIC_ENTRIES) {
  const source = path.join(root, entry);
  if (!existsSync(source)) continue;
  cpSync(source, path.join(output, entry), { recursive: true });
}

// Precios en un solo lugar (2026-11-04): la portada toma los de data/servicios.json (lo que guarda el panel de precios).
// Se escribe también en el index.html de la raíz para que el repo y la web publicada digan lo mismo.
const { aplicarPreciosPortada } = await import('../lib/static-data.mjs');
const servicios = JSON.parse(readFileSync(path.join(root, 'data', 'servicios.json'), 'utf8'));
for (const destino of [path.join(root, 'index.html'), path.join(output, 'index.html')]) {
  const antes = readFileSync(destino, 'utf8');
  const despues = aplicarPreciosPortada(antes, servicios);
  if (despues !== antes) writeFileSync(destino, despues);
}
console.log('✅ Precios de la portada tomados de data/servicios.json.');

const generated = readdirSync(output).sort();
console.log(`✅ public/ generado con ${generated.length} entradas estáticas.`);
