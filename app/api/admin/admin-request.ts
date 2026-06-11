// Hosts que pueden llamar a los endpoints /api/admin/*
// Incluye el subdominio admin, el dominio raíz (Vercel reenvía host como elcache10.com
// aunque la petición provenga de admin.elcache10.com) y entornos locales.
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

// Dominio raíz permitido para la comprobación de origen cross-subdominio
const ROOT_DOMAIN = 'elcache10.com';

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

// Devuelve true si el host pertenece al dominio raíz o es un subdominio de él
function isSameSite(host: string): boolean {
  return host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`);
}

export function assertAdminRequest(request: Request) {
  // Vercel puede reenviar el host real en x-forwarded-host; usarlo si está presente
  const forwardedHost = (request.headers.get('x-forwarded-host') || '').toLowerCase().split(',')[0].trim();
  const rawHost = (request.headers.get('host') || '').toLowerCase();
  const host = forwardedHost || rawHost;

  const originHost = hostFromUrl(request.headers.get('origin'));
  const allowedHosts = configuredHosts();

  // El host debe estar en la lista permitida
  if (!allowedHosts.has(host)) {
    return Response.json(
      { error: 'Host admin no permitido.', host },
      { status: 403 },
    );
  }

  // El origin (si existe) debe pertenecer al mismo sitio (dominio raíz o subdominio)
  // Permite que admin.elcache10.com llame a rutas cuyo host sea elcache10.com y viceversa
  if (originHost && !isSameSite(originHost) && !allowedHosts.has(originHost)) {
    return Response.json(
      { error: 'Origen admin no permitido.', origin: originHost },
      { status: 403 },
    );
  }

  return null;
}
