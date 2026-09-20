import { auth } from '@clerk/nextjs/server';
import { assertAdminRequest } from '../../../lib/admin-request.mjs';
import {
  allowStaffPhotoWrite,
  decodeStaffPhotoInput,
  githubStaffPhotoPath,
  publicStaffPhotoUrl,
  staffPhotoFilename,
} from '../../../lib/staff-photo.mjs';

export const runtime = 'nodejs';

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function syncKeyOk(request: Request) {
  const expected = (process.env.STAFF_ROSTER_SYNC_KEY || '').trim();
  const got = (request.headers.get('x-staff-sync-key') || '').trim();
  return expected.length >= 16 && got === expected;
}

async function githubJson(method: string, url: string, token: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: 'GitHub no devolvió JSON.' };
  }
  return { response, data };
}

export async function GET() {
  return Response.json({
    ok: true,
    escribe: 'POST',
    mensaje: 'Cámara de silla: POST jpeg/png/webp con x-staff-sync-key o sesión admin.',
  });
}

export async function POST(request: Request) {
  if (!syncKeyOk(request)) {
    const forbidden = assertAdminRequest(request);
    if (forbidden) return forbidden;
  }

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    userId = null;
  }
  if (!userId && !syncKeyOk(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!allowStaffPhotoWrite(clientIp(request))) {
    return Response.json({ error: 'Demasiadas fotos. Espera un minuto.' }, { status: 429 });
  }

  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      {
        error: 'Falta ADMIN_GITHUB_TOKEN. La foto no se puede guardar aún en elcache10.com.',
        falta: ['Poner ADMIN_GITHUB_TOKEN en Vercel de ElCache10'],
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { image?: string; hint?: string };
    const decoded = decodeStaffPhotoInput(body.image);
    const filename = staffPhotoFilename(body.hint, decoded.ext);
    const filePath = githubStaffPhotoPath(filename);
    const repo = process.env.ADMIN_GITHUB_REPO || 'AminVentura/ELCache10';
    const branch = process.env.ADMIN_GITHUB_BRANCH || 'main';
    const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const existing = await githubJson('GET', `${apiBase}?ref=${encodeURIComponent(branch)}`, token);
    if (!existing.response.ok && existing.response.status !== 404) {
      return Response.json({ error: 'GitHub no pudo preparar la carpeta de fotos.' }, { status: existing.response.status });
    }

    const update = await githubJson('PUT', apiBase, token, {
      message: `Foto de silla ${filename}`,
      content: decoded.bytes.toString('base64'),
      branch,
      sha: existing.response.ok ? existing.data?.sha : undefined,
    });
    if (!update.response.ok) {
      return Response.json(
        { error: 'GitHub no pudo guardar la foto.', details: update.data?.message },
        { status: update.response.status },
      );
    }

    const photoUrl = publicStaffPhotoUrl(filename);
    return Response.json({
      ok: true,
      photoUrl,
      mensaje: 'Foto lista. Sale en www.elcache10.com/images/staff/ para Google y el calendario.',
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la foto.' }, { status: 400 });
  }
}
