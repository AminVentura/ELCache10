/**
 * Iconos de la PWA del panel de administración (/admin), 2026-10-15, a partir del logo actual
 * images/logo.jpg sin rediseñarlo: solo se recorta el escudo a un cuadrado y se pone sobre blanco.
 * Usa `sharp`, que ya viene con Next (no se instala nada nuevo).
 * Uso: node scripts/generar-iconos-admin-pwa.mjs  → images/admin-pwa/*.png
 *
 * - icon-192.png / icon-512.png: el escudo recortado, purpose "any".
 * - maskable-192.png / maskable-512.png: el escudo al 66 % sobre blanco, dentro de la zona segura (80 %).
 * - apple-touch-icon.png (180): opaco sobre blanco (iOS redondea por su cuenta).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'images', 'admin-pwa');
fs.mkdirSync(out, { recursive: true });

// Cuadrado de 960 px centrado en el escudo de logo.jpg (1600x1076); deja fuera la franja oscura de abajo.
const escudo = await sharp(path.join(root, 'images', 'logo.jpg'))
  .extract({ left: 320, top: 60, width: 960, height: 960 })
  .png()
  .toBuffer();

const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 };

async function conMargen(size, escala) {
  const interior = Math.round(size * escala);
  const logo = await sharp(escudo).resize(interior, interior).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BLANCO } })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: BLANCO })
    .png()
    .toBuffer();
}

const trabajos = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['maskable-192.png', 192, 0.66],
  ['maskable-512.png', 512, 0.66],
  ['apple-touch-icon.png', 180, 0.92],
];

for (const [nombre, size, escala] of trabajos) {
  fs.writeFileSync(path.join(out, nombre), await conMargen(size, escala));
  console.log(`${nombre} ${size}x${size}`);
}
