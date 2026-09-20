import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  decodeStaffPhotoInput,
  publicStaffPhotoUrl,
  sniffStaffPhoto,
  staffPhotoFilename,
} from '../lib/staff-photo.mjs';

test('acepta jpeg/png/webp y rechaza HTML o SVG', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(40, 1)]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Buffer.alloc(40, 1)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32, 1)]);
  assert.equal(sniffStaffPhoto(jpeg)?.ext, 'jpg');
  assert.equal(sniffStaffPhoto(png)?.ext, 'png');
  assert.equal(sniffStaffPhoto(webp)?.ext, 'webp');
  assert.equal(sniffStaffPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(sniffStaffPhoto(Buffer.from('<html><body>no</body></html>')), null);
});

test('data URL de cámara se decodifica; URL suelta no entra al almacén', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(40, 2)]);
  const decoded = decodeStaffPhotoInput(`data:image/jpeg;base64,${jpeg.toString('base64')}`);
  assert.equal(decoded.ext, 'jpg');
  assert.throws(() => decodeStaffPhotoInput('https://www.elcache10.com/images/staff/x.webp'));
  assert.throws(() => decodeStaffPhotoInput('data:image/svg+xml;base64,PHN2Zz4='));
});

test('URL pública queda en elcache10.com/images/staff', () => {
  const name = staffPhotoFilename('Francis Ventura', 'webp');
  assert.match(name, /^francis-ventura-[a-z0-9]+\.webp$/);
  assert.equal(publicStaffPhotoUrl(name), `https://www.elcache10.com/images/staff/${name}`);
  assert.throws(() => publicStaffPhotoUrl('../secret.webp'));
});

test('admin y sillas usan cámara; ads.txt sigue sin login', () => {
  const equipo = readFileSync(new URL('../app/admin/EquipoPanel.tsx', import.meta.url), 'utf8');
  const photoApi = readFileSync(new URL('../app/api/staff-photo/route.ts', import.meta.url), 'utf8');
  const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
  const robots = readFileSync(new URL('../robots.txt', import.meta.url), 'utf8');
  assert.match(equipo, /capture="environment"/);
  assert.match(equipo, /\/api\/staff-photo/);
  assert.match(equipo, /480_000/);
  assert.equal(equipo.includes('localStorage'), false);
  assert.match(photoApi, /ADMIN_GITHUB_TOKEN/);
  assert.match(photoApi, /x-staff-sync-key/);
  assert.match(photoApi, /if \(!syncKeyOk\(request\)\)/);
  assert.match(photoApi, /export async function GET/);
  assert.match(proxy, /api\/staff-photo/);
  assert.match(proxy, /api\(\?!\/staff-photo\)/);
  assert.match(robots, /AdsBot-Google/);
  assert.match(robots, /Allow: \/images\//);
  assert.match(robots, /Allow: \/ads\.txt/);
});
