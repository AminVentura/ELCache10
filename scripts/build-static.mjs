import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { datosBuild, ponerVersionSitio, textoVersion } from '../lib/version-sitio.mjs';

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

// Pie con versión y fecha del build (lib/version-sitio.mjs) en cada .html copiado.
const { version, fecha } = datosBuild({ raiz: root });
const textoPie = textoVersion(version, fecha);
function ponerPie(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) ponerPie(ruta);
    else if (entrada.name.endsWith('.html')) {
      const html = readFileSync(ruta, 'utf8');
      const nuevo = ponerVersionSitio(html, textoPie);
      if (nuevo !== html) writeFileSync(ruta, nuevo);
    }
  }
}
ponerPie(output);
console.log(`✅ Pie: ${textoPie}`);

const generated = readdirSync(output).sort();
console.log(`✅ public/ generado con ${generated.length} entradas estáticas.`);
