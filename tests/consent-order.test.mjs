// Consent Mode v2: en toda página publicada con AdSense, el default denegado tiene que ejecutarse
// ANTES de cualquier script de Google (https://developers.google.com/tag-platform/security/guides/consent).
// Falla si alguna página carga adsbygoogle.js antes del bloque inline bs-consent-default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKIP = new Set(['node_modules', '.next', '.git', '.vercel', '_ARCHIVO', 'public', '.cursor', '.claude']);
const ADS = /<script\b[^>]*src=["'][^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*>/gi;
const GOOGLE_SRC = /<script\b[^>]*src=["'][^"']*(googlesyndication|googletagmanager|googletagservices|doubleclick|google-analytics)[^"']*["']/i;

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Devuelve null si está bien, o el motivo del fallo.
export function checkConsentOrder(html) {
  const ads = html.match(ADS) || [];
  if (ads.length === 0) return null;
  if (ads.length > 1) return `adsbygoogle.js aparece ${ads.length} veces`;
  const metas = html.match(/<meta[^>]+name=["']google-adsense-account["']/gi) || [];
  if (metas.length > 1) return `metaetiqueta google-adsense-account duplicada (${metas.length})`;
  const headEnd = html.search(/<\/head>/i);
  const adsAt = html.search(ADS);
  const def = html.match(/<script id="bs-consent-default">([\s\S]*?)<\/script>/i);
  if (!def) return 'falta el bloque inline bs-consent-default';
  const defAt = html.indexOf(def[0]);
  for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']) {
    if (!new RegExp(`${key}:'denied'`).test(def[1])) return `el default no deniega ${key}`;
  }
  if (!/gtag\('consent','default'/.test(def[1])) return "el bloque no llama gtag('consent','default')";
  if (headEnd !== -1 && defAt > headEnd) return 'el default no está en el <head>';
  if (defAt > adsAt) return 'adsbygoogle.js se carga ANTES del consent default';
  const firstScript = html.search(/<script\b/i);
  const beforeDefault = html.slice(firstScript, defAt);
  if (GOOGLE_SRC.test(beforeDefault)) return 'hay un script de Google antes del consent default';
  return null;
}

test('páginas estáticas con AdSense: consent default inline antes del script', () => {
  const files = htmlFiles(root);
  let withAds = 0;
  const errores = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    if (ADS.test(html)) withAds++;
    ADS.lastIndex = 0;
    const err = checkConsentOrder(html);
    if (err) errores.push(`${path.relative(root, f)}: ${err}`);
  }
  assert.ok(withAds > 0, 'no se encontró ninguna página con AdSense (¿cambió la ruta?)');
  assert.deepEqual(errores, []);
});

test('portada (Next): el layout pone el default inline en <head> y la página no duplica AdSense', () => {
  const layout = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');
  const head = layout.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(head, 'app/layout.tsx no tiene <head>');
  assert.match(head[1], /id="bs-consent-default"/);
  assert.match(layout, /ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'/);
  assert.doesNotMatch(layout, /beforeInteractive/, 'beforeInteractive en <body> se ejecuta tarde (self.__next_s)');
  const page = readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.equal((page.match(/adsbygoogle\.js/g) || []).length, 1, 'app/page.tsx debe tener un solo script de AdSense');
});

test('consent.js no inserta un segundo adsbygoogle si ya está en el HTML ni repite el default', () => {
  const js = readFileSync(path.join(root, 'js/consent.js'), 'utf8');
  const load = js.slice(js.indexOf('function loadAdSense'), js.indexOf('function loadMaps'));
  assert.match(load, /querySelector\('script\[src\*="pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js"\]'\)\) return/);
  assert.ok(load.indexOf('querySelector') < load.indexOf('createElement'), 'la comprobación debe ir antes de crear el script');
  assert.match(js, /if \(!window\.bsConsentDefault\)/);
});

test('el verificador detecta el orden malo', () => {
  const malo = '<html><head><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=x"></script>' +
    "<script id=\"bs-consent-default\">gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'})</script></head></html>";
  assert.equal(checkConsentOrder(malo), 'adsbygoogle.js se carga ANTES del consent default');
  assert.equal(checkConsentOrder('<html><head><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script></head></html>'), 'falta el bloque inline bs-consent-default');
});
