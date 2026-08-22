import test from 'node:test';
import assert from 'node:assert/strict';

import { getStaleJsonConflict } from '../lib/admin-save-guard.mjs';

test('stale JSON guard rejects older admin snapshots', () => {
  const conflict = getStaleJsonConflict(
    { updated_at: '2026-06-12T10:00:00.000Z' },
    { updated_at: '2026-06-12T11:00:00.000Z' },
  );

  assert.equal(conflict?.status, 409);
  assert.match(conflict?.error || '', /refresca/i);
});

test('stale JSON guard allows current admin snapshots', () => {
  const conflict = getStaleJsonConflict(
    { updated_at: '2026-06-12T11:00:00.000Z' },
    { updated_at: '2026-06-12T11:00:00.000Z' },
  );

  assert.equal(conflict, null);
});

test('stale JSON guard allows first remote create', () => {
  const conflict = getStaleJsonConflict(
    { updated_at: '2026-06-12T11:00:00.000Z' },
    null,
  );

  assert.equal(conflict, null);
});
