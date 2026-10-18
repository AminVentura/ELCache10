// Comprobación del orden Consent Mode v2 vs AdSense en un HTML (la usan tests/consent-order.test.mjs
// y scripts/verificar-consent-vivo.mjs).
export const ADS = /<script\b[^>]*src=["'][^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*>/gi;
const GOOGLE_SRC = /<script\b[^>]*src=["'][^"']*(googlesyndication|googletagmanager|googletagservices|doubleclick|google-analytics)[^"']*["']/i;

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
