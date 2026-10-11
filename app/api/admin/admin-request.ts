import { assertAdminRequest as assertAdminHost } from '../../../lib/admin-request.mjs';
import { requireAdminApi } from '../../../lib/admin-auth';

// Defensa en profundidad: además del proxy, cada handler comprueba el host
// y que el correo primario verificado de la sesión esté en ADMIN_ALLOWED_EMAILS.
export async function assertAdminRequest(request: Request): Promise<Response | null> {
  const forbiddenHost = assertAdminHost(request);
  if (forbiddenHost) return forbiddenHost;
  return requireAdminApi(new URL(request.url).pathname);
}
