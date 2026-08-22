const state = {
  ofertas: { version: 1, updated_at: '', ofertas: [] },
  servicios: { version: 1, updated_at: '', servicios: [] },
};

const $ = (selector) => document.querySelector(selector);

document.addEventListener('DOMContentLoaded', async () => {
  $('#addOfferBtn').addEventListener('click', addOffer);
  $('#saveOffersBtn').addEventListener('click', () => saveJson('ofertas', state.ofertas));
  $('#publishInstagramBtn').addEventListener('click', publishInstagramKit);
  $('#addServiceBtn').addEventListener('click', addService);
  $('#saveServicesBtn').addEventListener('click', () => saveJson('servicios', state.servicios));
  $('#deployBtn').addEventListener('click', triggerDeploy);

  await loadData();
  renderOffers();
  renderServices();
});

function writeStatus(message, data) {
  const box = $('#statusBox');
  box.hidden = false;
  box.textContent = data ? `${message}\n${JSON.stringify(data, null, 2)}` : message;
}

async function fetchJson(path) {
  if (path.startsWith('/data/')) {
    const rawUrl = `https://raw.githubusercontent.com/AminVentura/ELCache10/main${path}`;
    try {
      const rawResponse = await fetch(`${rawUrl}?v=${Date.now()}`, { cache: 'no-store' });
      if (rawResponse.ok) return rawResponse.json();
    } catch {
      // Local fallback keeps the admin usable before the first GitHub save.
    }
  }
  const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} devolvio ${response.status}`);
  return response.json();
}

async function loadData() {
  const [ofertas, servicios] = await Promise.all([
    fetchJson('/data/ofertas.json'),
    fetchJson('/data/servicios.json'),
  ]);
  state.ofertas = ofertas;
  state.servicios = servicios;
}

function makeId(prefix, text) {
  const slug = (text || prefix)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${prefix}-${slug || Date.now()}`;
}

function formatUsdAdminInput(cents) {
  if (cents === null || cents === undefined || cents === '') return '';
  if (!Number.isInteger(cents) || cents < 0) return '';
  return (cents / 100).toFixed(2);
}

function parseUsdInputToCents(value) {
  const normalized = String(value || '').trim().replace(/^\$\s*/, '').replace(/,/g, '');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Usa dólares con hasta 2 decimales. Ejemplo: 25.00');
  }
  const [dollars, cents = ''] = normalized.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

function addOffer() {
  state.ofertas.ofertas.push({
    id: `oferta-${Date.now()}`,
    titulo: 'Nueva oferta',
    descripcion: 'Descripción de la oferta',
    imagen_base64: '',
    fecha_inicio: todayRd(),
    fecha_fin: todayRd(7),
    publicada: true,
    orden: state.ofertas.ofertas.length + 1,
  });
  renderOffers();
}

function todayRd(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function renderOffers() {
  const container = $('#offersEditor');
  container.innerHTML = '';
  state.ofertas.ofertas
    .sort((a, b) => a.orden - b.orden)
    .forEach((offer, index) => {
      const row = document.createElement('article');
      row.className = 'editor-row offer-row';
      row.innerHTML = `
        <div>
          <img class="offer-preview" alt="Vista previa de oferta" src="${offer.imagen_base64 || '/images/logo.jpg'}">
          <input type="file" accept="image/*" data-field="image">
        </div>
        <div class="admin-grid">
          <label>Título <input data-field="titulo" value="${escapeAttr(offer.titulo)}"></label>
          <label>Descripción <textarea data-field="descripcion">${escapeHtml(offer.descripcion)}</textarea></label>
          <div class="inline-grid">
            <label>Inicio <input data-field="fecha_inicio" value="${escapeAttr(offer.fecha_inicio)}" placeholder="DD/MM/AAAA"></label>
            <label>Fin <input data-field="fecha_fin" value="${escapeAttr(offer.fecha_fin)}" placeholder="DD/MM/AAAA"></label>
            <label>Orden <input data-field="orden" type="number" value="${offer.orden}"></label>
          </div>
          <label><select data-field="publicada"><option value="true">Publicada</option><option value="false">Borrador</option></select></label>
          <div class="admin-button-row">
            <button type="button" class="secondary" data-action="caption">Copiar caption</button>
            <button type="button" class="secondary" data-action="social">Publicar redes</button>
            <button type="button" class="danger" data-action="delete">Eliminar</button>
          </div>
        </div>`;
      row.querySelector('[data-field="publicada"]').value = String(offer.publicada);
      row.addEventListener('input', (event) => updateOffer(index, event));
      row.querySelector('[data-field="image"]').addEventListener('change', (event) => updateOfferImage(index, event, row));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        state.ofertas.ofertas.splice(index, 1);
        renderOffers();
      });
      row.querySelector('[data-action="caption"]').addEventListener('click', () => copyText(buildCaption(offer)));
      row.querySelector('[data-action="social"]').addEventListener('click', () => publishOfferSocial(offer));
      container.appendChild(row);
    });
}

function updateOffer(index, event) {
  const field = event.target.dataset.field;
  if (!field || field === 'image') return;
  const value = event.target.value;
  const offer = state.ofertas.ofertas[index];
  if (field === 'publicada') offer[field] = value === 'true';
  else if (field === 'orden') offer[field] = Number.parseInt(value, 10) || 1;
  else {
    offer[field] = value;
    if (field === 'titulo') offer.id = makeId('oferta', value);
  }
}

async function updateOfferImage(index, event, row) {
  const file = event.target.files?.[0];
  if (!file) return;
  const base64 = await imageToWebpBase64(file);
  state.ofertas.ofertas[index].imagen_base64 = base64;
  row.querySelector('.offer-preview').src = base64;
}

function imageToWebpBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen invalida.'));
      img.onload = () => {
        const maxHeight = 900;
        const scale = Math.min(1, maxHeight / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function addService() {
  state.servicios.servicios.push({
    id: `servicio-${Date.now()}`,
    categoria: 'Barber Services',
    nombre: 'Nuevo servicio',
    precio_centavos: 0,
    etiqueta: '',
    disponible: true,
    orden: state.servicios.servicios.length + 1,
  });
  renderServices();
}

function renderServices() {
  const container = $('#servicesEditor');
  container.innerHTML = '';
  state.servicios.servicios
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.orden - b.orden)
    .forEach((service, index) => {
      const row = document.createElement('article');
      row.className = 'editor-row service-grid';
      row.innerHTML = `
        <label>Categoría <input data-field="categoria" value="${escapeAttr(service.categoria)}"></label>
        <label>Servicio <input data-field="nombre" value="${escapeAttr(service.nombre)}"></label>
        <label>Precio USD <input data-field="precio_usd" inputmode="decimal" value="${formatUsdAdminInput(service.precio_centavos)}" placeholder="25.00"></label>
        <label>Etiqueta <input data-field="etiqueta" value="${escapeAttr(service.etiqueta || '')}" placeholder="Ask for price"></label>
        <label>Orden <input data-field="orden" type="number" step="1" value="${service.orden}"></label>
        <div class="admin-button-row">
          <label>Visible <select data-field="disponible"><option value="true">Sí</option><option value="false">No</option></select></label>
          <button type="button" class="danger" data-action="delete">Eliminar</button>
        </div>`;
      row.querySelector('[data-field="disponible"]').value = String(service.disponible);
      row.addEventListener('input', (event) => updateService(index, event));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        state.servicios.servicios.splice(index, 1);
        renderServices();
      });
      container.appendChild(row);
    });
}

function updateService(index, event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const service = state.servicios.servicios[index];
  if (field === 'disponible') service[field] = event.target.value === 'true';
  else if (field === 'precio_usd') {
    try {
      service.precio_centavos = parseUsdInputToCents(event.target.value);
    } catch (error) {
      writeStatus(error.message);
    }
  }
  else if (field === 'orden') service[field] = Number.parseInt(event.target.value, 10) || 1;
  else {
    service[field] = event.target.value;
    if (field === 'nombre') service.id = makeId('servicio', event.target.value);
  }
}

async function saveJson(kind, payload) {
  try {
    const response = await fetch('/api/admin/save-json', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ kind, payload }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
    writeStatus(`${kind} guardado en GitHub.`, data);
  } catch (error) {
    writeStatus(error.message);
  }
}

async function triggerDeploy() {
  try {
    const response = await fetch('/api/admin/deploy', {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la web.');
    writeStatus('Deploy hook ejecutado.', data);
  } catch (error) {
    writeStatus(error.message);
  }
}

function buildCaption(offer) {
  return `El Caché 10 Barbershop\n\n${offer.titulo}\n${offer.descripcion}\nDisponible hasta ${offer.fecha_fin}\n\n📍 1942 Harrison Ave, Bronx NY 10453\n📲 (646) 334-9409\n#elcache10 #bronxbarber #dominicanbarber`;
}

function downloadOfferImage(offer) {
  if (!offer.imagen_base64) return false;
  const link = document.createElement('a');
  link.href = offer.imagen_base64;
  link.download = `${offer.id || 'oferta-elcache10'}.webp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

async function publishOfferSocial(offer) {
  await copyText(buildCaption(offer));
  const downloaded = downloadOfferImage(offer);
  window.open('https://www.instagram.com/elcache10/', '_blank', 'noopener,noreferrer');
  writeStatus(
    downloaded
      ? 'Kit social listo: caption copiado, imagen descargada e Instagram abierto.'
      : 'Caption copiado e Instagram abierto. Esta oferta no tiene imagen cargada.'
  );
}

function publishInstagramKit() {
  const activeOffer = state.ofertas.ofertas.find((offer) => offer.publicada) || state.ofertas.ofertas[0];
  if (activeOffer) {
    publishOfferSocial(activeOffer);
    return;
  }
  writeStatus('No hay ofertas disponibles para publicar.');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    writeStatus('Caption copiado al portapapeles.');
  } catch {
    window.prompt('Copia este caption:', text);
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
