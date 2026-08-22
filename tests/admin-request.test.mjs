import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminRedirectUrl } from '../lib/admin-host.mjs';
import { getAdminRequestAccess } from '../lib/admin-request.mjs';

test('admin API allows admin host even when Vercel forwards the public root host', () => {
  const access = getAdminRequestAccess({
    host: 'admin.elcache10.com',
    'x-forwarded-host': 'elcache10.com',
  });

  assert.equal(access.allowed, true);
});

test('admin API allows public admin path host because Clerk protects admin routes', () => {
  const access = getAdminRequestAccess({
    host: 'elcache10.com',
    'x-forwarded-host': 'elcache10.com',
  });

  assert.equal(access.allowed, true);
});

test('public domain admin path stays on the same host for delivery workflow', () => {
  const redirectUrl = buildAdminRedirectUrl('https://elcache10.com/admin?x=1');

  assert.equal(redirectUrl, null);
});

test('admin subdomain admin path does not redirect again', () => {
  const redirectUrl = buildAdminRedirectUrl('https://admin.elcache10.com/admin');

  assert.equal(redirectUrl, null);
});
