const RD_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseRdDate(value, endOfDay = false) {
  const match = typeof value === 'string' ? value.match(RD_DATE_RE) : null;
  if (!match) {
    throw new Error(`Fecha RD invalida: ${value}. Use DD/MM/AAAA.`);
  }
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Fecha RD invalida: ${value}.`);
  }
  return date;
}

export function formatPriceFromCents(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  if (!Number.isInteger(value)) {
    throw new Error('El precio debe estar en centavos enteros.');
  }
  const dollars = Math.trunc(value / 100);
  const cents = Math.abs(value % 100);
  return cents === 0 ? `$${dollars}` : `$${dollars}.${String(cents).padStart(2, '0')}`;
}

export function parseUsdInputToCents(value) {
  const normalized = String(value || '').trim().replace(/^\$\s*/, '').replace(/,/g, '');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Usa dolares con hasta 2 decimales. Ejemplo: 25.00');
  }
  const [dollars, cents = ''] = normalized.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

export function formatUsdAdminInput(value) {
  if (value === null || value === undefined || value === '') return '';
  if (!Number.isInteger(value) || value < 0) return '';
  return (value / 100).toFixed(2);
}

export function buildBarberOfferCaption(offer) {
  return [
    'El Cache 10 Barbershop',
    '',
    offer.titulo,
    offer.descripcion,
    `Disponible hasta ${offer.fecha_fin}`,
    '',
    '1942 Harrison Ave, Bronx NY 10453',
    '(646) 334-9409',
    'https://elcache10.com/',
    '',
    '#elcache10 #bronxbarber #dominicanbarber #barbershop',
  ]
    .filter((line) => line !== undefined && line !== null)
    .join('\n');
}

export function buildBarberAdminMetrics(offersPayload, servicesPayload, now = new Date()) {
  const activeOffers = getActiveOffers(offersPayload, now).length;
  const visibleServices = validateServicePayload(servicesPayload).servicios.filter((service) => service.disponible);

  return {
    activeOffers,
    totalOffers: validateOfferPayload(offersPayload).ofertas.length,
    barberServices: visibleServices.filter((service) => service.categoria === 'Barber Services').length,
    nailServices: visibleServices.filter((service) => service.categoria === 'Nail Services').length,
    moneyTransfer: visibleServices.filter((service) => service.categoria === 'Money Transfer').length,
  };
}

function escapePublicHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function renderPublicOffersHtml(payload, now = new Date()) {
  const activeOffers = dedupeCampaignOffers(getActiveOffers(payload, now));
  return activeOffers
    .map((offer) => {
      const image = offer.imagen_base64 || 'images/logo.jpg';
      const message = encodeURIComponent(`Hi El Cache 10! I want this offer: ${offer.titulo}`);
      return `
        <article class="offer-card reveal is-visible">
          <div class="offer-media">
            <img src="${image}" alt="${escapePublicHtml(offer.titulo)}" loading="lazy" decoding="async">
          </div>
          <div class="offer-body">
            <p class="offer-badge">Oferta activa</p>
            <h3>${escapePublicHtml(offer.titulo)}</h3>
            <p>${escapePublicHtml(offer.descripcion)}</p>
            <p class="offer-date">Disponible hasta ${escapePublicHtml(offer.fecha_fin)}</p>
            <a class="btn btn-primary" href="https://wa.me/16463349409?text=${message}" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp</a>
          </div>
        </article>`;
    })
    .join('');
}

function campaignKey(offer) {
  return [
    offer.descripcion,
    offer.fecha_inicio,
    offer.fecha_fin,
  ]
    .map((value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('|');
}

function normalizeOfferText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bdemana\b/g, 'semana')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeKeys(offer) {
  return [`title:${normalizeOfferText(offer.titulo)}`, `details:${campaignKey(offer)}`].filter((key) => !key.endsWith(':'));
}

function preferOffer(candidate, current) {
  if ((candidate.orden || 0) !== (current.orden || 0)) return (candidate.orden || 0) > (current.orden || 0);
  return parseRdDate(candidate.fecha_fin, true) >= parseRdDate(current.fecha_fin, true);
}

export function dedupeCampaignOffers(offers) {
  const selected = [];
  offers.forEach((offer) => {
    const keys = dedupeKeys(offer);
    const existingIndex = selected.findIndex((entry) => keys.some((key) => entry.keys.includes(key)));

    if (existingIndex === -1) {
      selected.push({ offer, keys });
      return;
    }

    const existing = selected[existingIndex];
    const mergedKeys = Array.from(new Set([...existing.keys, ...keys]));
    if (preferOffer(offer, existing.offer)) {
      selected[existingIndex] = { offer, keys: mergedKeys };
    } else {
      existing.keys = mergedKeys;
    }
  });
  return selected.map((entry) => entry.offer).sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}

export function injectPublicOffersHtml(html, offersHtml) {
  if (!offersHtml) return html;
  return html
    .replace('<section id="offers" class="offers section" hidden>', '<section id="offers" class="offers section">')
    .replace('<div id="offers-grid" class="offers-grid"></div>', `<div id="offers-grid" class="offers-grid">${offersHtml}</div>`);
}

const PUBLIC_SERVICE_TARGETS = {
  'Barber Services': 'barber',
  'Nail Services': 'nails',
  'Money Transfer': 'money',
};

export function renderPublicServiceListHtml(payload, category) {
  const group = normalizeServiceCatalog(payload).find((item) => item.categoria === category);
  if (!group) return '';

  return group.servicios
    .map((service) => {
      const price = service.precio_formateado || '';
      const priceClass = price ? 'spl-price' : 'spl-price spl-ask';
      return `                            <li><span>${escapePublicHtml(service.nombre)}</span><span class="${priceClass}">${escapePublicHtml(price)}</span></li>`;
    })
    .join('\n');
}

export function injectPublicServicesHtml(html, payload) {
  let nextHtml = html;

  Object.entries(PUBLIC_SERVICE_TARGETS).forEach(([category, target]) => {
    const rendered = renderPublicServiceListHtml(payload, category);
    if (!rendered) return;

    const pattern = new RegExp(`(<ul class="[^"]*" data-service-list="${target}">)[\\s\\S]*?(</ul>)`);
    nextHtml = nextHtml.replace(pattern, (_match, open, close) => `${open}\n${rendered}\n                        ${close}`);
  });

  return nextHtml;
}

export function validateOfferPayload(payload) {
  if (!payload || !Array.isArray(payload.ofertas)) {
    throw new Error('El payload de ofertas debe incluir un arreglo ofertas.');
  }
  payload.ofertas.forEach((offer, index) => {
    if (!offer.id) throw new Error(`Oferta #${index + 1}: id requerido.`);
    if (!offer.titulo) throw new Error(`Oferta #${index + 1}: titulo requerido.`);
    if (!offer.descripcion) throw new Error(`Oferta #${index + 1}: descripcion requerida.`);
    parseRdDate(offer.fecha_inicio);
    parseRdDate(offer.fecha_fin, true);
    if (typeof offer.publicada !== 'boolean') throw new Error(`Oferta #${index + 1}: publicada debe ser boolean.`);
    if (!Number.isInteger(offer.orden)) throw new Error(`Oferta #${index + 1}: orden debe ser entero.`);
  });
  return payload;
}

export function validateServicePayload(payload) {
  if (!payload || !Array.isArray(payload.servicios)) {
    throw new Error('El payload de servicios debe incluir un arreglo servicios.');
  }
  payload.servicios.forEach((service, index) => {
    if (!service.id) throw new Error(`Servicio #${index + 1}: id requerido.`);
    if (!service.categoria) throw new Error(`Servicio #${index + 1}: categoria requerida.`);
    if (!service.nombre) throw new Error(`Servicio #${index + 1}: nombre requerido.`);
    if (service.precio_centavos !== null && service.precio_centavos !== undefined && !Number.isInteger(service.precio_centavos)) {
      throw new Error(`Servicio #${index + 1}: precio_centavos debe usar centavos enteros.`);
    }
    if (typeof service.disponible !== 'boolean') throw new Error(`Servicio #${index + 1}: disponible debe ser boolean.`);
    if (!Number.isInteger(service.orden)) throw new Error(`Servicio #${index + 1}: orden debe ser entero.`);
  });
  return payload;
}

export function getActiveOffers(payload, now = new Date()) {
  validateOfferPayload(payload);
  return payload.ofertas
    .filter((offer) => {
      if (!offer.publicada) return false;
      const start = parseRdDate(offer.fecha_inicio);
      const end = parseRdDate(offer.fecha_fin, true);
      return now >= start && now <= end;
    })
    .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}

export function normalizeServiceCatalog(payload) {
  validateServicePayload(payload);
  const byCategory = new Map();
  payload.servicios
    .filter((service) => service.disponible)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    .forEach((service) => {
      if (!byCategory.has(service.categoria)) {
        byCategory.set(service.categoria, []);
      }
      byCategory.get(service.categoria).push({
        ...service,
        precio_formateado: service.etiqueta || formatPriceFromCents(service.precio_centavos, ''),
      });
    });

  return Array.from(byCategory, ([categoria, servicios]) => ({ categoria, servicios }));
}
