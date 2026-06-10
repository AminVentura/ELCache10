import { assertAdminRequest } from '../admin-request';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const forbidden = assertAdminRequest(request);
  if (forbidden) return forbidden;

  return Response.json({
    ok: true,
    project: 'el-cache10',
    repo: process.env.ADMIN_GITHUB_REPO || 'AminVentura/ELCache10',
    branch: process.env.ADMIN_GITHUB_BRANCH || 'main',
    adminAccess: 'editor directo en admin.elcache10.com',
    githubToken: process.env.ADMIN_GITHUB_TOKEN ? 'configurado' : 'pendiente',
    deployHook: process.env.ADMIN_VERCEL_DEPLOY_HOOK_URL ? 'configurado' : 'no configurado; JSON raw activo',
    files: ['data/ofertas.json', 'data/servicios.json'],
  });
}
