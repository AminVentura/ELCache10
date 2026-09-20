import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assertStaffPhotoFilename,
  githubRawStaffPhotoUrl,
  sniffStaffPhoto,
} from '../../../../lib/staff-photo.mjs';

export const runtime = 'nodejs';

async function readLocal(filename: string) {
  const names = [
    path.join(process.cwd(), 'images', 'staff', filename),
    path.join(process.cwd(), 'public', 'images', 'staff', filename),
  ];
  for (const filePath of names) {
    try {
      return await readFile(filePath);
    } catch {
      // Prueba la siguiente ruta local.
    }
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  let filename = '';
  try {
    filename = assertStaffPhotoFilename((await context.params).file);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  let bytes = await readLocal(filename);
  if (!bytes) {
    const repo = process.env.ADMIN_GITHUB_REPO || 'AminVentura/ELCache10';
    const branch = process.env.ADMIN_GITHUB_BRANCH || 'main';
    const remote = await fetch(githubRawStaffPhotoUrl(filename, repo, branch), {
      headers: { accept: 'image/*,application/octet-stream', 'user-agent': 'elcache10-staff-photo' },
      cache: 'no-store',
    });
    if (!remote.ok) return new Response('Not found', { status: 404 });
    bytes = Buffer.from(await remote.arrayBuffer());
  }

  const sniff = sniffStaffPhoto(bytes);
  if (!sniff) return new Response('Not found', { status: 404 });

  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': sniff.mime,
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
    },
  });
}
