/**
 * Versión y fecha del pie (2026-10-25). Una sola fuente para todo el sitio:
 * - versión: package.json
 * - fecha: el momento del build (o NEXT_PUBLIC_BUILD_DATE si se fija a mano), en hora de Nueva York.
 * La usan scripts/build-static.mjs (páginas .html copiadas a public/), next.config.ts
 * (NEXT_PUBLIC_APP_VERSION y NEXT_PUBLIC_BUILD_DATE) y app/page.tsx (portada).
 * En el HTML, el texto va entre <!--version-sitio--> y <!--/version-sitio-->.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MARCA = /<!--version-sitio-->[\s\S]*?<!--\/version-sitio-->/g;

/** «25 oct 2026». */
export function fechaCorta(fecha = new Date(), zona = 'America/New_York') {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: zona, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const n = (t) => Number(partes.find((p) => p.type === t)?.value);
  return `${n('day')} ${MESES[n('month') - 1]} ${n('year')}`;
}

export function versionPaquete(raiz = process.cwd()) {
  try {
    return String(JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf8')).version || '');
  } catch {
    return '';
  }
}

export function datosBuild({ env = process.env, ahora = new Date(), raiz = process.cwd() } = {}) {
  return { version: versionPaquete(raiz), fecha: (env.NEXT_PUBLIC_BUILD_DATE || '').trim() || fechaCorta(ahora) };
}

export function textoVersion(version, fecha) {
  const v = String(version || '').trim();
  const f = String(fecha || '').trim();
  return [v ? `v${v}` : '', f ? `Última actualización: ${f}` : ''].filter(Boolean).join(' · ');
}

function escaparHtml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pone el texto entre las marcas del pie (todas las que haya). */
export function ponerVersionSitio(html, texto) {
  return String(html).replace(MARCA, `<!--version-sitio-->${escaparHtml(texto)}<!--/version-sitio-->`);
}
