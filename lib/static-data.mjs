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

function formatPublicPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length === 10) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return String(phone || '');
}

export function renderPublicTeamHtml(staff) {
  if (!Array.isArray(staff) || !staff.length) return '';
  return staff
    .map((person) => {
      const name = escapePublicHtml(person.name || '');
      const role = escapePublicHtml(person.role || '');
      const photo = escapePublicHtml(person.photoUrl || 'images/barbers-team.jpg');
      const phone = String(person.phoneE164 || '').replace(/\D/g, '');
      const tel = phone ? `+${phone}` : '+16463349409';
      const wa = phone || '16463349409';
      const pretty = formatPublicPhone(phone);
      return `<article class="team-card reveal is-visible">
                        <div class="team-card-img-wrap">
                            <img src="${photo}" alt="${name} — ${role} at El Caché 10 Bronx NY" loading="lazy" decoding="async" width="400" height="400">
                        </div>
                        <div class="team-card-body">
                            <h3 class="team-card-name">${name}</h3>
                            <p class="team-card-role">${role}</p>
                            <div class="team-card-contact-row">
                                <a href="tel:${tel}" class="btn btn-primary team-card-btn">Call ${escapePublicHtml(pretty)}</a>
                                <a href="https://wa.me/${wa}" class="btn btn-whatsapp team-card-btn" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                            </div>
                            <div class="barber-booking" data-barber-name="${name}">
                                <p class="barber-booking-label">Online</p>
                                <h4>Reservar Cita</h4>
                                <button type="button" class="btn btn-primary barber-booking-toggle">Reservar con ${name}</button>
                                <form class="barber-booking-form" hidden>
                                    <input type="hidden" name="barber" value="${name}">
                                    <button type="submit" class="btn btn-whatsapp btn-full">Enviar reserva por WhatsApp</button>
                                </form>
                            </div>
                        </div>
                    </article>`;
    })
    .join('\n');
}

export function renderPublicStaffOptionsHtml(staff) {
  const rows = Array.isArray(staff) ? staff : [];
  const options = ['<option value="">Any available</option>'];
  rows.forEach((person) => {
    const name = escapePublicHtml(String(person?.name || '').trim());
    if (!name) return;
    options.push(`<option value="${name}">${name}</option>`);
  });
  return options.join('\n                                ');
}

export function injectPublicStaffOptionsHtml(html, optionsHtml) {
  if (!optionsHtml) return html;
  return html.replace(
    /(<select id="booking-staff"[^>]*>)[\s\S]*?(<\/select>)/,
    `$1\n                                ${optionsHtml}\n                            $2`
  );
}

export function injectPublicTeamHtml(html, teamHtml) {
  if (!teamHtml) return html;
  const openTag = '<div id="team-grid" class="team-grid">';
  const start = html.indexOf(openTag);
  if (start === -1) return html;
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return `${html.slice(0, start)}${openTag}${teamHtml}</div>${html.slice(nextClose + 6)}`;
    }
    i = nextClose + 6;
  }
  return html;
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

function serviceById(payload, id) {
  const groups = normalizeServiceCatalog(payload);
  for (const group of groups) {
    const hit = group.servicios.find((service) => service.id === id);
    if (hit) return hit;
  }
  return null;
}

export function renderMenuSentence(payload) {
  const barberIds = [
    'barber-dominican-style',
    'barber-fade',
    'barber-caesar',
    'barber-kids-cut',
    'barber-hot-towel',
    'barber-blow-dry',
  ];
  const nailIds = ['nails-manicure', 'nails-pedicure', 'nails-acrylic'];
  const part = (id) => {
    const service = serviceById(payload, id);
    return service ? `${service.nombre} ${service.precio_formateado}` : '';
  };
  const barber = barberIds.map(part).filter(Boolean).join(', ');
  const nails = nailIds.map(part).filter(Boolean).join(', ');
  return `Nuestros precios son: ${barber}. Uñas: ${nails}. La Nacional: pregunta al (646) 334-9409. Los precios pueden variar; se confirman en la silla.`;
}

export function injectPublicFaqPrices(html, payload) {
  try {
    const sentence = escapePublicHtml(renderMenuSentence(payload));
    const jsonSentence = renderMenuSentence(payload).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let next = html.replace(
      /(<summary>\s*¿Cuánto cuesta un corte[\s\S]*?<div class="faq-answer">\s*<p>)[\s\S]*?(<\/p>)/i,
      `$1${sentence}$2`,
    );
    next = next.replace(
      /("name": "¿[^"]*cuesta un corte[^"]*", "acceptedAnswer": \{"@type": "Answer", "text": ")[^"]*/,
      `$1${jsonSentence}`,
    );
    const kids = serviceById(payload, 'barber-kids-cut');
    if (kids) {
      const price = escapePublicHtml(kids.precio_formateado);
      next = next.replace(
        /(¿Atienden a niños\?[\s\S]*?precio especial de )(?:<strong>)?\$\d+(?:\.\d{2})?(?:<\/strong>)?/,
        `$1<strong>${price}</strong>`,
      );
      next = next.replace(
        /("name": "¿[^"]*niños[^"]*", "acceptedAnswer": \{"@type": "Answer", "text": ")([^"]*precio especial de )\$\d+(?:\.\d{2})?/,
        `$1$2${kids.precio_formateado}`,
      );
    }
    return next;
  } catch {
    return html;
  }
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
