import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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
  'ads.txt',
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

const generated = readdirSync(output).sort();
console.log(`✅ public/ generado con ${generated.length} entradas estáticas.`);
