// Lista blanca de administradores del panel.
// ADMIN_ALLOWED_EMAILS: correos separados por comas. Sin la variable, nadie entra.

export const ADMIN_ALLOWLIST_ENV = 'ADMIN_ALLOWED_EMAILS';

const EMAIL_SHAPE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function parseAllowedEmails(env = process.env) {
  const raw = String(env?.[ADMIN_ALLOWLIST_ENV] ?? '');
  const emails = raw
    .split(',')
    .map(normalizeEmail)
    .filter((email) => EMAIL_SHAPE.test(email));
  return new Set(emails);
}

// Devuelve el correo primario solo si Clerk lo marca como verificado.
// Acepta el objeto User del backend de Clerk (emailAddresses + primaryEmailAddressId).
/** @param {any} user */
export function primaryVerifiedEmail(user) {
  if (!user || typeof user !== 'object') return '';
  const primaryId = user.primaryEmailAddressId;
  if (!primaryId || !Array.isArray(user.emailAddresses)) return '';
  const primary = user.emailAddresses.find((entry) => entry && entry.id === primaryId);
  if (!primary) return '';
  if (primary.verification?.status !== 'verified') return '';
  return normalizeEmail(primary.emailAddress);
}

/**
 * Decisión pura: no toca la red ni Clerk.
 * @param {{ userId?: string | null, user?: unknown, env?: Record<string, string | undefined> }} input
 * @returns {{ allowed: boolean, reason: string | null }}
 */
export function evaluateAdminAccess({ userId, user, env = process.env } = {}) {
  if (!userId) return { allowed: false, reason: 'sin_sesion' };
  const allowed = parseAllowedEmails(env);
  if (allowed.size === 0) return { allowed: false, reason: 'lista_sin_configurar' };
  const email = primaryVerifiedEmail(user);
  if (!email) return { allowed: false, reason: 'correo_no_verificado' };
  if (!allowed.has(email)) return { allowed: false, reason: 'correo_no_autorizado' };
  return { allowed: true, reason: null };
}
