/*
 * Service worker de la PWA del panel de administración (/admin), 2026-10-15.
 * Patrón de AntojosReserva (public/sw.js), ya en producción.
 *
 * Regla: SOLO se guarda el cascarón estático (iconos, manifiesto, aviso sin conexión y los archivos
 * con hash de /_next/static/). NUNCA se guarda /api/*, la página /admin (lleva precios, ofertas y equipo),
 * datos de React Server Components, /sign-in ni nada de Clerk (otro dominio: no se toca).
 * Sin red, una navegación al panel muestra /admin-offline.html (un aviso), nunca datos viejos.
 * Su alcance es /admin: la web pública no queda bajo este service worker.
 */
const CACHE = 'cache10-admin-cascaron-v1';
const CASCARON = [
  '/admin-offline.html',
  '/admin.webmanifest',
  '/images/admin-pwa/icon-192.png',
  '/images/admin-pwa/icon-512.png',
  '/images/admin-pwa/maskable-192.png',
  '/images/admin-pwa/maskable-512.png',
  '/images/admin-pwa/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CASCARON.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('cache10-admin-') && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function esPanel(url) {
  return url.pathname === '/admin' || url.pathname.startsWith('/admin/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // guardar precios, subir fotos: red, sin tocar
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Clerk, GitHub, fuentes: red
  if (url.pathname.startsWith('/api/')) return; // NUNCA: datos del panel ni sesión

  if (req.mode === 'navigate') {
    if (!esPanel(url)) return; // /sign-in y cualquier otra página: como siempre
    // Network-only: la página del panel no se guarda. Sin red: aviso, sin datos.
    event.respondWith(
      fetch(req).catch(() => caches.match('/admin-offline.html').then((r) => r || Response.error()))
    );
    return;
  }

  const estatico = url.pathname.startsWith('/_next/static/') || CASCARON.includes(url.pathname);
  if (!estatico || url.search.includes('_rsc')) return; // datos de React Server Components y demás: red

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copia));
          }
          return res;
        })
    )
  );
});
