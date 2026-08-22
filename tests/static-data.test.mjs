import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBarberAdminMetrics,
  buildBarberOfferCaption,
  formatPriceFromCents,
  getActiveOffers,
  injectPublicOffersHtml,
  injectPublicServicesHtml,
  normalizeServiceCatalog,
  parseUsdInputToCents,
  renderPublicOffersHtml,
  renderPublicServiceListHtml,
  validateOfferPayload,
  validateServicePayload,
} from '../lib/static-data.mjs';

test('formatPriceFromCents renders integer cents without raw float math', () => {
  assert.equal(formatPriceFromCents(2000), '$20');
  assert.equal(formatPriceFromCents(2550), '$25.50');
  assert.equal(formatPriceFromCents(null, 'Ask for price'), 'Ask for price');
});

test('parseUsdInputToCents accepts admin-friendly USD values', () => {
  assert.equal(parseUsdInputToCents('25'), 2500);
  assert.equal(parseUsdInputToCents('$25.50'), 2550);
  assert.equal(parseUsdInputToCents(''), null);
  assert.throws(() => parseUsdInputToCents('25.999'), /hasta 2 decimales/);
});

test('buildBarberAdminMetrics counts active promos and service categories', () => {
  const offers = {
    version: 1,
    updated_at: '2026-06-08T00:00:00.000Z',
    ofertas: [
      {
        id: 'active',
        titulo: 'Fade Week',
        descripcion: 'Promo vigente',
        imagen_base64: '',
        fecha_inicio: '01/06/2026',
        fecha_fin: '30/06/2026',
        publicada: true,
        orden: 1,
      },
      {
        id: 'draft',
        titulo: 'Draft',
        descripcion: 'No publicada',
        imagen_base64: '',
        fecha_inicio: '01/06/2026',
        fecha_fin: '30/06/2026',
        publicada: false,
        orden: 2,
      },
    ],
  };
  const services = {
    version: 1,
    updated_at: '2026-06-08T00:00:00.000Z',
    servicios: [
      { id: 'fade', categoria: 'Barber Services', nombre: 'Fade', precio_centavos: 2500, disponible: true, orden: 1 },
      { id: 'nails', categoria: 'Nail Services', nombre: 'Manicure', precio_centavos: 3000, disponible: true, orden: 1 },
      { id: 'money', categoria: 'Money Transfer', nombre: 'La Nacional', precio_centavos: null, etiqueta: 'Ask', disponible: true, orden: 1 },
      { id: 'hidden', categoria: 'Barber Services', nombre: 'Hidden', precio_centavos: 1000, disponible: false, orden: 2 },
    ],
  };

  assert.deepEqual(buildBarberAdminMetrics(offers, services, new Date('2026-06-08T12:00:00-04:00')), {
    activeOffers: 1,
    totalOffers: 2,
    barberServices: 1,
    nailServices: 1,
    moneyTransfer: 1,
  });
});

test('buildBarberOfferCaption creates copy-ready social text', () => {
  const caption = buildBarberOfferCaption({
    titulo: 'Father Day Fade',
    descripcion: 'Fresh cut special',
    fecha_fin: '30/06/2026',
  });

  assert.match(caption, /Father Day Fade/);
  assert.match(caption, /Fresh cut special/);
  assert.match(caption, /Disponible hasta 30\/06\/2026/);
  assert.match(caption, /1942 Harrison Ave/);
  assert.match(caption, /#elcache10/);
});

test('renderPublicOffersHtml and injectPublicOffersHtml expose active offers in initial HTML', () => {
  const offers = {
    version: 1,
    updated_at: '2026-06-08T00:00:00.000Z',
    ofertas: [
      {
        id: 'summer',
        titulo: 'Oferta de Verano',
        descripcion: 'Promo visible',
        imagen_base64: '',
        fecha_inicio: '01/06/2026',
        fecha_fin: '30/06/2026',
        publicada: true,
        orden: 1,
      },
    ],
  };
  const html = '<section id="offers" class="offers section" hidden><div id="offers-grid" class="offers-grid"></div></section>';
  const rendered = renderPublicOffersHtml(offers, new Date('2026-06-08T12:00:00-04:00'));
  const injected = injectPublicOffersHtml(html, rendered);

  assert.match(rendered, /Oferta de Verano/);
  assert.match(rendered, /Pedir por WhatsApp/);
  assert.doesNotMatch(injected, /<section id="offers" class="offers section" hidden>/);
  assert.match(injected, /<div id="offers-grid" class="offers-grid">[\s\S]*Oferta de Verano/);
});

test('renderPublicOffersHtml avoids duplicate active offers with same campaign details', () => {
  const offers = {
    version: 1,
    updated_at: '2026-06-11T00:00:00.000Z',
    ofertas: [
      {
        id: 'typo',
        titulo: 'Fade de la Demana',
        descripcion: 'Especial de Fade con Barba + toalla caliente',
        imagen_base64: 'data:image/png;base64,one',
        fecha_inicio: '11/06/2026',
        fecha_fin: '30/06/2026',
        publicada: true,
        orden: 1,
      },
      {
        id: 'correct',
        titulo: 'Fade de la Semana',
        descripcion: 'Oferta de Fade y la Barba con Toalla caliente a $35',
        imagen_base64: 'data:image/png;base64,two',
        fecha_inicio: '11/06/2026',
        fecha_fin: '18/06/2026',
        publicada: true,
        orden: 2,
      },
    ],
  };
  const rendered = renderPublicOffersHtml(offers, new Date('2026-06-12T12:00:00-04:00'));

  assert.equal((rendered.match(/offer-card/g) || []).length, 1);
  assert.match(rendered, /Fade de la Semana/);
  assert.doesNotMatch(rendered, /Fade de la Demana/);
});

test('injectPublicServicesHtml replaces public prices from servicios payload', () => {
  const services = {
    version: 1,
    updated_at: '2026-06-11T00:00:00.000Z',
    servicios: [
      { id: 'cut', categoria: 'Barber Services', nombre: 'Dominican Style Haircuts', precio_centavos: 2000, disponible: true, orden: 1 },
      { id: 'fade', categoria: 'Barber Services', nombre: 'Fade', precio_centavos: 3500, disponible: true, orden: 2 },
      { id: 'money', categoria: 'Money Transfer', nombre: 'La Nacional Money Transfers', precio_centavos: null, etiqueta: 'Ask for price', disponible: true, orden: 1 },
    ],
  };
  const html = `
    <ul class="service-price-list" data-service-list="barber">
      <li><span>Fade</span><span class="spl-price">$25</span></li>
    </ul>
    <ul class="service-price-list" data-service-list="money">
      <li><span>Old</span><span class="spl-price"></span></li>
    </ul>`;
  const injected = injectPublicServicesHtml(html, services);

  assert.match(renderPublicServiceListHtml(services, 'Barber Services'), /Fade<\/span><span class="spl-price">\$35/);
  assert.match(injected, /Dominican Style Haircuts<\/span><span class="spl-price">\$20/);
  assert.match(injected, /Fade<\/span><span class="spl-price">\$35/);
  assert.doesNotMatch(injected, /\$25/);
  assert.match(injected, /La Nacional Money Transfers<\/span><span class="spl-price">Ask for price/);
});

test('getActiveOffers filters unpublished and expired offers using RD dates', () => {
  const offers = {
    version: 1,
    updated_at: '2026-06-08T00:00:00.000Z',
    ofertas: [
      {
        id: 'active',
        titulo: 'Father Day Fade',
        descripcion: 'Promo vigente',
        imagen_base64: '',
        fecha_inicio: '01/06/2026',
        fecha_fin: '30/06/2026',
        publicada: true,
        orden: 2,
      },
      {
        id: 'expired',
        titulo: 'Expired',
        descripcion: 'Promo vencida',
        imagen_base64: '',
        fecha_inicio: '01/05/2026',
        fecha_fin: '31/05/2026',
        publicada: true,
        orden: 1,
      },
      {
        id: 'draft',
        titulo: 'Draft',
        descripcion: 'No publicada',
        imagen_base64: '',
        fecha_inicio: '01/06/2026',
        fecha_fin: '30/06/2026',
        publicada: false,
        orden: 3,
      },
    ],
  };

  assert.deepEqual(
    getActiveOffers(offers, new Date('2026-06-08T12:00:00-04:00')).map((offer) => offer.id),
    ['active']
  );
});

test('normalizeServiceCatalog groups visible services by category and order', () => {
  const services = {
    version: 1,
    updated_at: '2026-06-08T00:00:00.000Z',
    servicios: [
      { id: 'fade', categoria: 'Barber Services', nombre: 'Fade', precio_centavos: 2500, disponible: true, orden: 2 },
      { id: 'cut', categoria: 'Barber Services', nombre: 'Dominican Style Haircuts', precio_centavos: 2000, disponible: true, orden: 1 },
      { id: 'hidden', categoria: 'Nail Services', nombre: 'Hidden', precio_centavos: 1000, disponible: false, orden: 1 },
    ],
  };

  const grouped = normalizeServiceCatalog(services);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].categoria, 'Barber Services');
  assert.deepEqual(grouped[0].servicios.map((service) => service.id), ['cut', 'fade']);
});

test('validators reject malformed offer and service payloads', () => {
  assert.throws(
    () => validateOfferPayload({ version: 1, ofertas: [{ id: 'x', titulo: '', fecha_inicio: '2026-06-08' }] }),
    /titulo/
  );
  assert.throws(
    () =>
      validateServicePayload({
        version: 1,
        servicios: [
          { id: 'x', categoria: 'Barber Services', nombre: 'Cut', precio_centavos: 20.5, disponible: true, orden: 1 },
        ],
      }),
    /centavos/
  );
});
