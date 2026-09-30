/*
 * Consentimiento de cookies + Google Consent Mode v2 — elcache10.com (2026-09-29)
 *
 * - Cargar lo antes posible: en index.html va síncrono en <head>; en app/page.tsx con next/script.
 *   Ningún otro código carga etiquetas de Google, así que el orden es seguro en ambos casos.
 * - Por defecto todo denegado (ad_storage, ad_user_data, ad_personalization, analytics_storage).
 * - AdSense no está en el HTML: loadAdSense() lo inyecta solo si el usuario acepta publicidad.
 * - Google Maps: [data-map-embed] muestra un placeholder; el iframe se crea al pulsar
 *   "Cargar mapa" (solo esa visita) o si el usuario aceptó "Mapas" en el banner.
 * - Banner con Aceptar / Rechazar del mismo peso y Configurar. [data-cookie-prefs] lo reabre.
 *
 * NOTA: para tráfico del EEE / Reino Unido / Suiza Google exige una CMP certificada (TCF). Este banner no lo es.
 */
(function () {
  'use strict';
  if (window.bsConsent) return; // ya cargado (index.html + page.tsx)

  var ADSENSE_CLIENT = 'ca-pub-8721021745606812';
  var STORAGE_KEY = 'elcache10CookiePrefs';
  var PREFS_VERSION = 1;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('set', 'ads_data_redaction', true);

  function readPrefs() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== PREFS_VERSION) return null;
      return { ads: !!p.ads, personalization: !!(p.ads && p.personalization), maps: !!p.maps };
    } catch (e) { return null; }
  }

  function writePrefs(p) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: PREFS_VERSION, ads: p.ads, personalization: p.personalization, maps: p.maps, date: new Date().toISOString()
      }));
    } catch (e) { /* sin almacenamiento: vale solo para esta visita */ }
  }

  function applyConsent(p) {
    gtag('consent', 'update', {
      ad_storage: p.ads ? 'granted' : 'denied',
      ad_user_data: p.personalization ? 'granted' : 'denied',
      ad_personalization: p.personalization ? 'granted' : 'denied',
      analytics_storage: 'denied' // el sitio no usa analítica
    });
  }

  var current = readPrefs();
  if (current) applyConsent(current);

  var adsenseRequested = false;
  function loadAdSense() {
    if (adsenseRequested || !current || !current.ads) return;
    adsenseRequested = true;
    window.adsbygoogle = window.adsbygoogle || [];
    if (!current.personalization) window.adsbygoogle.requestNonPersonalizedAds = 1;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    document.head.appendChild(s);
  }

  function loadMaps() {
    var holders = document.querySelectorAll('[data-map-embed]');
    for (var i = 0; i < holders.length; i++) {
      var h = holders[i];
      if (h.getAttribute('data-map-loaded')) continue;
      var f = document.createElement('iframe');
      f.src = h.getAttribute('data-map-embed');
      f.title = h.getAttribute('data-map-title') || 'Google Maps';
      f.className = 'map-iframe';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      h.setAttribute('data-map-loaded', '1');
      h.parentNode.replaceChild(f, h);
    }
  }

  // ---------- Banner ----------
  var banner, panel, chkAds, chkPers, chkMaps;

  function buildBanner() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cookie-banner-title');
    banner.setAttribute('aria-describedby', 'cookie-banner-desc');
    banner.setAttribute('lang', 'es');
    banner.innerHTML =
      '<div class="cookie-content">' +
        '<div class="cookie-text">' +
          '<h2 id="cookie-banner-title" class="cookie-title">Cookies · Cookie choices</h2>' +
          '<p id="cookie-banner-desc">Con tu permiso, Google AdSense usa cookies para mostrar anuncios y Google Maps carga el mapa. Sin permiso, el sitio funciona igual. <span lang="en">With your permission, Google uses cookies for ads and the map.</span> <a href="/cookies.html">Política de Cookies</a> · <a href="/privacidad.html">Privacidad</a></p>' +
        '</div>' +
        '<div class="cookie-buttons">' +
          '<button type="button" class="cookie-btn" data-consent="reject">Rechazar</button>' +
          '<button type="button" class="cookie-btn" data-consent="accept">Aceptar</button>' +
          '<button type="button" class="cookie-btn cookie-btn--ghost" data-consent="configure" aria-expanded="false" aria-controls="cookie-settings">Configurar</button>' +
        '</div>' +
      '</div>' +
      '<div id="cookie-settings" class="cookie-settings" hidden>' +
        '<fieldset>' +
          '<legend>Elige qué permites</legend>' +
          '<label><input type="checkbox" checked disabled> Necesarias (tu elección de cookies y el chat, guardados en tu navegador)</label>' +
          '<label><input type="checkbox" id="cookie-chk-ads"> Publicidad (Google AdSense)</label>' +
          '<label><input type="checkbox" id="cookie-chk-pers"> Anuncios personalizados según tus intereses</label>' +
          '<label><input type="checkbox" id="cookie-chk-maps"> Mapa de Google Maps</label>' +
        '</fieldset>' +
        '<button type="button" class="cookie-btn" data-consent="save">Guardar selección</button>' +
      '</div>';
    document.body.appendChild(banner);

    panel = banner.querySelector('#cookie-settings');
    chkAds = banner.querySelector('#cookie-chk-ads');
    chkPers = banner.querySelector('#cookie-chk-pers');
    chkMaps = banner.querySelector('#cookie-chk-maps');
    chkAds.addEventListener('change', function () {
      chkPers.disabled = !chkAds.checked;
      if (!chkAds.checked) chkPers.checked = false;
    });

    banner.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-consent]');
      if (!btn) return;
      var action = btn.getAttribute('data-consent');
      if (action === 'accept') decide({ ads: true, personalization: true, maps: true });
      else if (action === 'reject') decide({ ads: false, personalization: false, maps: false });
      else if (action === 'save') decide({ ads: chkAds.checked, personalization: chkAds.checked && chkPers.checked, maps: chkMaps.checked });
      else if (action === 'configure') {
        var open = panel.hasAttribute('hidden');
        if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) chkAds.focus();
      }
    });
    banner.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && current) banner.classList.remove('show');
    });
    return banner;
  }

  function showBanner(focus) {
    buildBanner();
    var p = current || { ads: false, personalization: false, maps: false };
    chkAds.checked = p.ads;
    chkPers.checked = p.personalization;
    chkPers.disabled = !p.ads;
    chkMaps.checked = p.maps;
    banner.classList.add('show');
    if (focus) {
      var first = banner.querySelector('[data-consent="reject"]');
      if (first) first.focus();
    }
  }

  function decide(p) {
    var hadAds = adsenseRequested;
    var hadMaps = !!document.querySelector('[data-map-loaded]') || !!(current && current.maps);
    current = p;
    writePrefs(p);
    applyConsent(p);
    if (banner) banner.classList.remove('show');
    if (p.ads) loadAdSense();
    if (p.maps) loadMaps();
    if ((hadAds && !p.ads) || (hadMaps && !p.maps && document.querySelector('iframe.map-iframe'))) {
      window.location.reload(); // retirar un permiso con el tercero ya cargado
    }
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-cookie-prefs]')) { ev.preventDefault(); showBanner(true); return; }
    if (t.closest('[data-map-load]')) { ev.preventDefault(); loadMaps(); }
  });

  window.bsConsent = {
    get: function () { return current; },
    open: function () { showBanner(true); }
  };

  function init() {
    if (!current) showBanner(false);
    else {
      if (current.ads) loadAdSense();
      if (current.maps) loadMaps();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
