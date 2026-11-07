/** Formularios de reserva (olas 2–5, 2026-11-04): etiqueta unida al campo, 56 px / 16 / radio 16 y aviso de privacidad. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (r) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const html = leer('index.html');
const formularios = [...html.matchAll(/<form class="(?:barber-booking-form|booking-form)"[\s\S]*?<\/form>/g)].map((m) => m[0]);

test('hay 7 formularios por barbero y #booking-form, todos con el aviso corto y enlace a Privacidad', () => {
  assert.equal(formularios.length, 8);
  for (const f of formularios) assert.match(f, /booking-privacy-note[^>]*>[\s\S]*?esta web no guarda tus datos[\s\S]*?href="privacidad\.html"/i);
});

test('cada campo tiene su etiqueta unida (for/id) y la etiqueta flota', () => {
  for (const f of formularios) {
    const ids = [...f.matchAll(/<(?:input|select|textarea)[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    const controles = [...f.matchAll(/<(?:input(?![^>]*type="hidden")|select|textarea)\b/g)].length;
    assert.equal(ids.length, controles, 'todos los campos con id');
    for (const id of ids) assert.match(f, new RegExp(`<label for="${id}" class="cf__label">`));
    assert.doesNotMatch(f, /<label>/, 'ninguna etiqueta suelta');
  }
});

test('teclado adecuado: teléfono con inputmode tel y nombre con autocomplete name', () => {
  assert.match(html, /id="booking-phone"[^>]*|inputmode="tel"[^>]*id="booking-phone"/);
  assert.match(html.match(/<input[^>]*id="booking-phone"[^>]*>/)[0], /inputmode="tel"/);
  assert.match(html.match(/<input[^>]*id="booking-name"[^>]*>/)[0], /autocomplete="name"/);
});

test('estilo: campo 56 px, letra 16, radio 16 y botón fijo en #booking-form', () => {
  const css = leer('css/style.css');
  assert.match(css, /\.booking-form \.cf \.cf__input,[\s\S]*?height: 56px;[\s\S]*?border-radius: 16px;[\s\S]*?font-size: 16px;/);
  assert.match(css, /\.booking-form \.pie-fijo \{[\s\S]*?position: sticky;/);
  assert.match(formularios.find((f) => f.includes('id="booking-form"')), /<div class="pie-fijo">/);
});

test('los formularios de reserva solo abren WhatsApp: no envían datos a ningún servidor', () => {
  const js = leer('js/main.js');
  const reservas = js.slice(js.indexOf('function initBooking'), js.indexOf('function initYear'));
  assert.doesNotMatch(reservas, /fetch\(|XMLHttpRequest|sendBeacon|localStorage/);
  assert.match(reservas, /wa\.me/);
});

test('el equipo en vivo pinta el formulario con campos (antes salía vacío)', async () => {
  const { renderPublicTeamHtml } = await import('../lib/static-data.mjs');
  const out = renderPublicTeamHtml([{ name: 'José Núñez', role: 'Barber', phoneE164: '+16465550000' }]);
  for (const n of ['service', 'date', 'time', 'plate', 'vehicle']) assert.match(out, new RegExp(`name="${n}"`));
  assert.match(out, /id="bb-jose-nunez-plate"/);
  assert.match(out, /esta web no guarda tus datos/i);
  assert.match(leer('js/main.js'), /\$\{barberBookingFieldsHtml\(person\.name \|\| ''\)\}/);
});
