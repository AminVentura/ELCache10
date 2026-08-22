import { isAdminSurfaceHost } from './admin-host.mjs';

const DEFAULT_ADMIN_HOSTS = new Set([
  'admin.elcache10.com',
  'elcache10.com',
  'www.elcache10.com',
  'localhost',
  'localhost:3000',
  'localhost:3005',
  '127.0.0.1',
  '127.0.0.1:3000',
  '127.0.0.1:3005',
]);

function configuredHosts(env = process.env) {
  const extra = (env.ADMIN_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ADMIN_HOSTS, ...extra]);
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

function splitHosts(value) {
  return String(value || '')
    .toLowerCase()
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
}

function hostFromUrl(value) {
  if (!value) return '';
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return '';
  }
}

export function getAdminRequestAccess(headers, env = process.env) {
  const forwardedHosts = splitHosts(headerValue(headers, 'x-forwarded-host'));
  const rawHost = String(headerValue(headers, 'host') || '').toLowerCase().trim();
  const hostCandidates = Array.from(new Set([...forwardedHosts, rawHost].filter(Boolean)));
  const originHost = hostFromUrl(headerValue(headers, 'origin'));
  const refererHost = hostFromUrl(headerValue(headers, 'referer'));
  const allowedHosts = configuredHosts(env);

  if (originHost && !allowedHosts.has(originHost)) {
    return { allowed: false, reason: 'origin', hostCandidates, originHost, refererHost };
  }

  const hasAdminContext =
    hostCandidates.some((host) => allowedHosts.has(host) || isAdminSurfaceHost(host)) ||
    (originHost && (allowedHosts.has(originHost) || isAdminSurfaceHost(originHost))) ||
    (refererHost && (allowedHosts.has(refererHost) || isAdminSurfaceHost(refererHost)));

  return {
    allowed: Boolean(hasAdminContext),
    reason: hasAdminContext ? null : 'host',
    hostCandidates,
    originHost,
    refererHost,
  };
}

export function assertAdminRequest(request) {
  const access = getAdminRequestAccess(request.headers);
  if (access.allowed) return null;

  return Response.json(
    {
      error: access.reason === 'origin' ? 'Origen admin no permitido.' : 'Host admin no permitido.',
      host: access.hostCandidates[0] || '',
      hosts: access.hostCandidates,
      origin: access.originHost,
      referer: access.refererHost,
    },
    { status: 403 },
  );
}
