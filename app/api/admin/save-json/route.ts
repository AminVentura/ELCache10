import { assertAdminRequest } from '../admin-request';
import { decodeGithubJsonContent, getStaleJsonConflict } from '../../../../lib/admin-save-guard.mjs';

export const runtime = 'nodejs';

const ALLOWED_FILES = new Map([
  ['ofertas', 'data/ofertas.json'],
  ['servicios', 'data/servicios.json'],
]);

type SaveBody = {
  kind?: string;
  payload?: Record<string, unknown>;
};

function assertSafePayload(kind: string, payload: Record<string, unknown>) {
  if (kind === 'ofertas') {
    const ofertas = payload.ofertas;
    if (!Array.isArray(ofertas)) throw new Error('Payload de ofertas invalido.');
    ofertas.forEach((offer) => {
      if (!offer || typeof offer !== 'object') throw new Error('Cada oferta debe ser un objeto.');
      const item = offer as Record<string, unknown>;
      if (!item.id || !item.titulo || !item.descripcion) throw new Error('Cada oferta requiere id, titulo y descripcion.');
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(item.fecha_inicio || ''))) throw new Error('fecha_inicio debe ser DD/MM/AAAA.');
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(item.fecha_fin || ''))) throw new Error('fecha_fin debe ser DD/MM/AAAA.');
      if (typeof item.publicada !== 'boolean') throw new Error('publicada debe ser boolean.');
      if (!Number.isInteger(item.orden)) throw new Error('orden debe ser entero.');
    });
  }

  if (kind === 'servicios') {
    const servicios = payload.servicios;
    if (!Array.isArray(servicios)) throw new Error('Payload de servicios invalido.');
    servicios.forEach((service) => {
      if (!service || typeof service !== 'object') throw new Error('Cada servicio debe ser un objeto.');
      const item = service as Record<string, unknown>;
      if (!item.id || !item.categoria || !item.nombre) throw new Error('Cada servicio requiere id, categoria y nombre.');
      // Validate all price fields as integers (null/undefined allowed — service may use range or label instead)
      for (const priceField of ['precio_centavos', 'precio_min_centavos', 'precio_max_centavos'] as const) {
        const v = item[priceField];
        if (v !== null && v !== undefined && !Number.isInteger(v)) {
          throw new Error(`${priceField} debe ser un entero en centavos (ej: 2500 = $25.00).`);
        }
      }
      if (typeof item.disponible !== 'boolean') throw new Error('disponible debe ser boolean.');
      if (!Number.isInteger(item.orden)) throw new Error('orden debe ser entero.');
    });
  }
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
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

export async function POST(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;

  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) {
    return Response.json({ error: 'ADMIN_GITHUB_TOKEN no esta configurado en Vercel.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as SaveBody;
    const kind = body.kind;
    const filePath = kind ? ALLOWED_FILES.get(kind) : null;
    if (!kind || !filePath) return Response.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 });
    if (!body.payload) return Response.json({ error: 'Payload requerido.' }, { status: 400 });

    const repo = process.env.ADMIN_GITHUB_REPO || 'AminVentura/ELCache10';
    const branch = process.env.ADMIN_GITHUB_BRANCH || 'main';
    const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const existing = await githubJson('GET', `${apiBase}?ref=${encodeURIComponent(branch)}`, token);
    if (!existing.response.ok && existing.response.status !== 404) {
      return Response.json({ error: `GitHub no pudo leer ${filePath}.` }, { status: existing.response.status });
    }

    const currentDoc = existing.response.ok ? decodeGithubJsonContent(existing.data) : null;
    const staleConflict = getStaleJsonConflict(body.payload, currentDoc);
    if (staleConflict) {
      return Response.json(staleConflict, { status: staleConflict.status });
    }

    const payload = {
      ...body.payload,
      updated_at: new Date().toISOString(),
    };
    assertSafePayload(kind, payload);

    const content = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8').toString('base64');
    const update = await githubJson('PUT', apiBase, token, {
      message: `Actualizar ${filePath} desde admin ElCache10`,
      content,
      branch,
      sha: existing.response.ok ? existing.data?.sha : undefined,
    });

    if (!update.response.ok) {
      return Response.json(
        { error: `GitHub no pudo guardar ${filePath}.`, details: update.data?.message },
        { status: update.response.status },
      );
    }

    return Response.json({ ok: true, filePath, commit: update.data?.commit?.sha || null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error desconocido.' }, { status: 400 });
  }
}
