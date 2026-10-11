import { auth, clerkClient } from '@clerk/nextjs/server';
import { ADMIN_ALLOWLIST_ENV, evaluateAdminAccess } from './admin-allowlist.mjs';

export type AdminAccess = {
  allowed: boolean;
  reason: 'sin_sesion' | 'lista_sin_configurar' | 'correo_no_verificado' | 'correo_no_autorizado' | 'clerk_no_disponible' | null;
  userId: string | null;
};

// El usuario de Clerk se guarda 30 s para no pedirlo dos veces por petición
// (proxy + handler). La lista blanca se evalúa siempre, sin caché.
const USER_TTL_MS = 30_000;
const userCache = new Map<string, { at: number; user: unknown }>();

async function loadUser(userId: string) {
  const hit = userCache.get(userId);
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.user;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (userCache.size > 200) userCache.clear();
  userCache.set(userId, { at: Date.now(), user });
  return user;
}

function logDenied(reason: AdminAccess['reason'], userId: string | null, where: string) {
  if (reason === 'lista_sin_configurar') {
    console.error(`[admin] ${ADMIN_ALLOWLIST_ENV} no está configurada: el panel queda cerrado para todos (${where}).`);
    return;
  }
  if (reason === 'sin_sesion') return;
  console.warn(`[admin] acceso denegado (${reason}) usuario=${userId || '-'} en ${where}.`);
}

export async function getAdminAccessForUser(userId: string | null | undefined, where = 'admin'): Promise<AdminAccess> {
  if (!userId) return { allowed: false, reason: 'sin_sesion', userId: null };

  const early = evaluateAdminAccess({ userId, user: null });
  if (early.reason === 'lista_sin_configurar') {
    logDenied('lista_sin_configurar', userId, where);
    return { allowed: false, reason: 'lista_sin_configurar', userId };
  }

  let user: unknown;
  try {
    user = await loadUser(userId);
  } catch {
    console.error(`[admin] no se pudo leer el usuario en Clerk: acceso denegado (${where}).`);
    return { allowed: false, reason: 'clerk_no_disponible', userId };
  }

  const result = evaluateAdminAccess({ userId, user });
  if (!result.allowed) logDenied(result.reason as AdminAccess['reason'], userId, where);
  return { allowed: result.allowed, reason: result.reason as AdminAccess['reason'], userId };
}

export async function getAdminAccess(where = 'admin'): Promise<AdminAccess> {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    return { allowed: false, reason: 'sin_sesion', userId: null };
  }
  return getAdminAccessForUser(userId, where);
}

// Para los handlers de /api/admin/*: null si puede pasar, Response 401/403 si no.
export async function requireAdminApi(where: string): Promise<Response | null> {
  const access = await getAdminAccess(where);
  if (access.allowed) return null;
  if (access.reason === 'sin_sesion') {
    return Response.json({ error: 'No autenticado.' }, { status: 401 });
  }
  return Response.json({ error: 'No autorizado.' }, { status: 403 });
}
