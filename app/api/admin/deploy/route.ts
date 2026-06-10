import { assertAdminRequest } from '../admin-request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;

  const hook = process.env.ADMIN_VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return Response.json({
      ok: true,
      mode: 'live-json',
      message: 'No hay Deploy Hook configurado. Los precios y ofertas ya se leen desde GitHub raw; para cambios de codigo usa deploy CLI.',
    });
  }

  try {
    const response = await fetch(hook, { method: 'POST' });
    return Response.json({ ok: response.ok, status: response.status }, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error disparando deploy.' }, { status: 500 });
  }
}
