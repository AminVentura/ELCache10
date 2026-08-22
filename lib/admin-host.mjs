const PUBLIC_HOSTS = new Set(['elcache10.com', 'www.elcache10.com']);
const ADMIN_HOST = 'admin.elcache10.com';
const ADMIN_SURFACE_HOSTS = new Set([ADMIN_HOST, ...PUBLIC_HOSTS]);

export function isPublicProductionHost(hostname) {
  return PUBLIC_HOSTS.has(String(hostname || '').toLowerCase());
}

export function isAdminSurfaceHost(hostname) {
  return ADMIN_SURFACE_HOSTS.has(String(hostname || '').toLowerCase());
}

export function buildAdminRedirectUrl(currentUrl) {
  new URL(currentUrl);
  return null;
}
