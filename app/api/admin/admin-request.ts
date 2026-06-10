const DEFAULT_ADMIN_HOSTS = new Set([
  'admin.elcache10.com',
  'localhost',
  'localhost:3000',
  'localhost:3005',
  '127.0.0.1',
  '127.0.0.1:3000',
  '127.0.0.1:3005',
]);

function configuredHosts() {
  const extra = (process.env.ADMIN_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ADMIN_HOSTS, ...extra]);
}

function hostFromUrl(value: string | null) {
  if (!value) return '';
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return '';
  }
}

export function assertAdminRequest(request: Request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const originHost = hostFromUrl(request.headers.get('origin'));
  const allowedHosts = configuredHosts();

  if (!allowedHosts.has(host)) {
    return Response.json({ error: 'Host admin no permitido.' }, { status: 403 });
  }

  if (originHost && originHost !== host) {
    return Response.json({ error: 'Origen admin no permitido.' }, { status: 403 });
  }

  return null;
}
