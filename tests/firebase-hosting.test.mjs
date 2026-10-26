/** Firebase Hosting de elcache10.com (2026-10-26): lo que hacía Vercel no se pierde. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fb = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
const rc = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8'));
const hosting = fb.hosting[0];
const wf = readFileSync(new URL('../.github/workflows/firebase-hosting.yml', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build-static.mjs', import.meta.url), 'utf8');

test('target elcache10 -> sitio elcache10-app, sirve public/', () => {
  assert.equal(hosting.target, 'elcache10');
  assert.equal(hosting.public, 'public');
  assert.deepEqual(rc.targets['elcache10-app'].hosting.elcache10, ['elcache10-app']);
});

test('sin comodín a la portada: lo que no existe da 404 (no soft 404) y hay 404.html', () => {
  assert.equal(hosting.rewrites, undefined);
  assert.match(build, /'404\.html'/);
  assert.match(build, /'site\.webmanifest'/);
  const page = readFileSync(new URL('../404.html', import.meta.url), 'utf8');
  assert.match(page, /noindex/);
});

test('URLs .html como en Vercel: canonical y sitemap no apuntan a una redirección', () => {
  assert.equal(hosting.cleanUrls, false);
  const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  assert.match(sitemap, /https:\/\/elcache10\.com\/guias\/[a-z-]+\.html/);
});

test('/admin y el inicio de sesión van a admin.elcache10.com (Vercel)', () => {
  const r = Object.fromEntries(hosting.redirects.map((x) => [x.source, x.destination]));
  assert.equal(r['/admin'], 'https://admin.elcache10.com/admin');
  assert.equal(r['/admin/**'], 'https://admin.elcache10.com/admin');
  assert.equal(r['/sign-in'], 'https://admin.elcache10.com/sign-in');
});

test('cabeceras de Vercel: seguridad, CSP con citas, ads.txt, /data y /api sin indexar', () => {
  const by = Object.fromEntries(hosting.headers.map((x) => [x.source, Object.fromEntries(x.headers.map((h) => [h.key, h.value]))]));
  assert.match(by['**']['Content-Security-Policy'], /connect-src [^;]*https:\/\/citas\.elcache10\.com/);
  assert.match(by['**']['Content-Security-Policy'], /img-src 'self' data: blob: https:/);
  assert.equal(by['**']['X-Content-Type-Options'], 'nosniff');
  assert.match(by['/ads.txt']['Content-Type'], /text\/plain/);
  assert.match(by['/data/**']['X-Robots-Tag'], /noindex/);
  assert.match(by['/api/**']['X-Robots-Tag'], /noindex/);
});

test('workflow: push a main + workflow_dispatch, apagado sin FIREBASE_DEPLOY_ENABLED y sin clave en el repo', () => {
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /branches: \[main\]/);
  assert.match(wf, /if: vars\.FIREBASE_DEPLOY_ENABLED != 'true'/);
  assert.match(wf, /if: vars\.FIREBASE_DEPLOY_ENABLED == 'true'/);
  assert.match(wf, /^  publicar:/m);
  assert.match(wf, /google-github-actions\/auth@v3/);
  assert.match(wf, /id-token: write/);
  assert.match(wf, /--only hosting:elcache10 --project elcache10-app/);
  assert.match(wf, /node scripts\/build-static\.mjs/);
  assert.equal(/"type":\s*"service_account"/.test(wf), false);
});
