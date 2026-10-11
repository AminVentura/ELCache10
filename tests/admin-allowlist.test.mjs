import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { evaluateAdminAccess, parseAllowedEmails, primaryVerifiedEmail } from '../lib/admin-allowlist.mjs';

function clerkUser({ email = 'francis@example.com', status = 'verified', primaryId = 'idn_1', extra = [] } = {}) {
  return {
    primaryEmailAddressId: primaryId,
    emailAddresses: [{ id: 'idn_1', emailAddress: email, verification: { status } }, ...extra],
  };
}

const ENV = { ADMIN_ALLOWED_EMAILS: ' Francis@Example.com , otra@example.com ' };

test('sin ADMIN_ALLOWED_EMAILS no entra nadie (fail-closed)', () => {
  for (const env of [{}, { ADMIN_ALLOWED_EMAILS: '' }, { ADMIN_ALLOWED_EMAILS: ' , ' }, { ADMIN_ALLOWED_EMAILS: 'no-es-correo' }]) {
    const access = evaluateAdminAccess({ userId: 'user_1', user: clerkUser(), env });
    assert.equal(access.allowed, false);
    assert.equal(access.reason, 'lista_sin_configurar');
  }
});

test('la lista se compara en minúsculas y sin espacios', () => {
  assert.deepEqual([...parseAllowedEmails(ENV)], ['francis@example.com', 'otra@example.com']);
  const access = evaluateAdminAccess({ userId: 'user_1', user: clerkUser({ email: 'FRANCIS@example.COM' }), env: ENV });
  assert.equal(access.allowed, true);
});

test('una sesión de Clerk con otro correo queda fuera', () => {
  const access = evaluateAdminAccess({ userId: 'user_2', user: clerkUser({ email: 'intruso@example.com' }), env: ENV });
  assert.deepEqual(access, { allowed: false, reason: 'correo_no_autorizado' });
});

test('el correo primario sin verificar no cuenta', () => {
  const access = evaluateAdminAccess({ userId: 'user_1', user: clerkUser({ status: 'unverified' }), env: ENV });
  assert.deepEqual(access, { allowed: false, reason: 'correo_no_verificado' });
});

test('solo vale el correo primario: uno secundario de la lista no da acceso', () => {
  const user = clerkUser({
    email: 'intruso@example.com',
    extra: [{ id: 'idn_2', emailAddress: 'francis@example.com', verification: { status: 'verified' } }],
  });
  assert.equal(primaryVerifiedEmail(user), 'intruso@example.com');
  assert.equal(evaluateAdminAccess({ userId: 'user_2', user, env: ENV }).allowed, false);
});

test('sin sesión o sin usuario no hay acceso', () => {
  assert.equal(evaluateAdminAccess({ userId: null, user: clerkUser(), env: ENV }).reason, 'sin_sesion');
  assert.equal(evaluateAdminAccess({ userId: 'user_1', user: null, env: ENV }).allowed, false);
  assert.equal(primaryVerifiedEmail({ primaryEmailAddressId: 'idn_9', emailAddresses: [] }), '');
});

test('cada handler de /api/admin comprueba la lista blanca y no hay registro abierto', () => {
  for (const route of ['deploy', 'save-json', 'staff', 'status']) {
    const source = fs.readFileSync(new URL(`../app/api/admin/${route}/route.ts`, import.meta.url), 'utf8');
    const handlers = source.match(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g) || [];
    const guards = source.match(/await assertAdminRequest\(request\)/g) || [];
    assert.ok(handlers.length > 0, `${route} sin handlers`);
    assert.equal(guards.length, handlers.length, `${route}: handler sin guardia`);
  }
  const shared = fs.readFileSync(new URL('../app/api/admin/admin-request.ts', import.meta.url), 'utf8');
  assert.match(shared, /requireAdminApi/);
  const proxy = fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
  assert.match(proxy, /getAdminAccessForUser/);
  const page = fs.readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /getAdminAccess\(/);
  assert.equal(fs.existsSync(new URL('../app/sign-up', import.meta.url)), false);
  const layout = fs.readFileSync(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /SignUp/);
});
