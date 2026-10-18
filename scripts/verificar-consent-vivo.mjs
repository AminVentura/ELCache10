// Verifica en un sitio publicado que ninguna página carga adsbygoogle.js antes del consent default.
// Uso: node scripts/verificar-consent-vivo.mjs https://elcache10.com
// Lee la portada y todas las URL del sitemap.xml; sale con código 1 si alguna falla.
import { checkConsentOrder } from '../lib/consent-order.mjs';

const base = (process.argv[2] || 'https://elcache10.com').replace(/\/$/, '');
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = new Set([`${base}/`, ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())]);
let fallos = 0;
for (const url of urls) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 verificar-consent' } });
  const html = await res.text();
  const err = res.ok ? checkConsentOrder(html) : `HTTP ${res.status}`;
  const tieneAds = /adsbygoogle\.js/.test(html);
  console.log(`${err ? 'FALLA' : 'ok   '} ${tieneAds ? 'ads ' : '    '} ${url}${err ? ` — ${err}` : ''}`);
  if (err) fallos++;
}
console.log(`${urls.size} páginas, ${fallos} con fallo`);
process.exit(fallos ? 1 : 0);
