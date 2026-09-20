import { assertAdminRequest } from '../admin-request';

export const runtime = 'nodejs';

const CITAS = (process.env.CITAS_STAFF_API_URL || 'https://citas.elcache10.com').replace(/\/$/, '');

function syncHeaders() {
  const key = (process.env.STAFF_ROSTER_SYNC_KEY || '').trim();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (key) headers['x-staff-sync-key'] = key;
  return { headers, keySet: Boolean(key) };
}

async function citas(path: string, init?: RequestInit) {
  const { headers, keySet } = syncHeaders();
  if (!keySet) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'Falta STAFF_ROSTER_SYNC_KEY en ElCache10 y CitaElCache10.',
        falta: [
          'Poner la misma STAFF_ROSTER_SYNC_KEY (16+ chars) en Vercel de ambos proyectos',
          'Mientras tanto Francis puede usar https://citas.elcache10.com/dashboard/sillas',
        ],
      },
    };
  }
  const response = await fetch(`${CITAS}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: 'citas no devolvió JSON' };
  }
  return { ok: response.ok, status: response.status, body };
}

export async function GET(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;
  const result = await citas('/api/staff-admin');
  return Response.json(result.body, { status: result.ok ? 200 : result.status });
}

export async function POST(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;
  const payload = await request.json().catch(() => ({}));
  const result = await citas('/api/staff-admin', { method: 'POST', body: JSON.stringify(payload) });
  return Response.json(result.body, { status: result.ok ? 200 : result.status });
}

export async function PATCH(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;
  const payload = await request.json().catch(() => ({}));
  const result = await citas('/api/staff-admin', { method: 'PATCH', body: JSON.stringify(payload) });
  return Response.json(result.body, { status: result.ok ? 200 : result.status });
}

export async function DELETE(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;
  const id = new URL(request.url).searchParams.get('id') || '';
  const result = await citas(`/api/staff-admin?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  return Response.json(result.body, { status: result.ok ? 200 : result.status });
}
