// Pie con versión y fecha automática (2026-10-25): una sola fuente (package.json + fecha del build).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { datosBuild, fechaCorta, ponerVersionSitio, textoVersion } from '../lib/version-sitio.mjs';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('fecha corta en español, hora de Nueva York', () => {
  assert.equal(fechaCorta(new Date('2026-10-25T15:00:00Z')), '25 oct 2026');
  assert.equal(fechaCorta(new Date('2027-01-01T03:00:00Z')), '31 dic 2026');
});

test('versión de package.json y fecha fijable a mano', () => {
  const { version } = JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf8'));
  assert.ok(version, 'package.json tiene versión');
  const d = datosBuild({ env: { NEXT_PUBLIC_BUILD_DATE: '1 ene 2027' }, raiz });
  assert.deepEqual(d, { version, fecha: '1 ene 2027' });
  assert.equal(textoVersion(version, '25 oct 2026'), `v${version} · Última actualización: 25 oct 2026`);
});

test('el texto va entre las marcas, también si ya había otro', () => {
  const html = '<p class="footer-update">© <!--version-sitio-->viejo<!--/version-sitio--></p>';
  assert.equal(ponerVersionSitio(html, 'v1 · Última actualización: 25 oct 2026'), '<p class="footer-update">© <!--version-sitio-->v1 · Última actualización: 25 oct 2026<!--/version-sitio--></p>');
  assert.equal(ponerVersionSitio('<p>sin marca</p>', 'x'), '<p>sin marca</p>');
});

test('portada, páginas legales y guías tienen la marca del pie; no queda una fecha a mano en el pie', () => {
  const paginas = ['index.html', 'aviso-legal.html', 'cookies.html', 'privacidad.html', ...readdirSync(path.join(raiz, 'guias')).filter((f) => f.endsWith('.html')).map((f) => `guias/${f}`)];
  for (const p of paginas) {
    const html = readFileSync(path.join(raiz, p), 'utf8');
    assert.match(html, /<!--version-sitio-->[\s\S]*?<!--\/version-sitio-->/, p);
    assert.doesNotMatch(html, /class="footer-update">[^<]*(Última|&Uacute;ltima) actualizaci/, `${p}: fecha escrita a mano en el pie`);
  }
});
