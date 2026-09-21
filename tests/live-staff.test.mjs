import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('formulario y Visit Us van debajo de Para Profesionales; nombres salen del roster vivo', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  const chair = html.indexOf('Para Profesionales');
  const booking = html.indexOf('id="booking"');
  const visit = html.indexOf('Visit Us');
  const intro = html.indexOf('<!-- About / Intro -->');
  assert.ok(chair > -1 && booking > chair && visit > booking && intro > visit);

  assert.match(js, /refreshBookingStaffSelect/);
  assert.match(js, /applyLiveTeam\(json\.staff\)/);
  assert.match(js, /citas\.elcache10\.com\/api\/staff/);
  assert.equal(js.includes('localStorage'), false);

  assert.match(page, /injectPublicStaffOptionsHtml/);
  assert.match(page, /renderPublicStaffOptionsHtml/);
});
