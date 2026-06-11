'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type Offer = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_base64: string;
  fecha_inicio: string;
  fecha_fin: string;
  publicada: boolean;
  orden: number;
};

export type ServiceItem = {
  id: string;
  categoria: string;
  nombre: string;
  precio_centavos?: number | null;
  precio_min_centavos?: number | null;
  precio_max_centavos?: number | null;
  etiqueta?: string | null;
  disponible: boolean;
  orden: number;
};

export type JsonDoc<T> = {
  version: number;
  updated_at: string;
} & T;

type Props = {
  offersDoc: JsonDoc<{ ofertas: Offer[] }>;
  servicesDoc: JsonDoc<{ servicios: ServiceItem[] }>;
};

type WorkflowStatus = {
  ok: boolean;
  project: string;
  repo: string;
  branch: string;
  adminAccess: string;
  githubToken: string;
  deployHook: string;
  files: string[];
};

const blankOffer = {
  titulo: '',
  descripcion: '',
  fecha_inicio: todayRd(),
  fecha_fin: todayRd(7),
};

function todayRd(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
}

function parseRdDate(value: string, endOfDay = false) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error('Las fechas deben estar en formato DD/MM/AAAA.');
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Fecha invalida. Usa DD/MM/AAAA.');
  }
  return date;
}

function formatUsdAdminInput(value?: number | null) {
  if (value === null || value === undefined) return '';
  if (!Number.isInteger(value) || value < 0) return '';
  return (value / 100).toFixed(2);
}

function parseUsdInputToCents(value: string) {
  const normalized = value.trim().replace(/^\$\s*/, '').replace(/,/g, '');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Usa dolares con hasta 2 decimales. Ejemplo: 25.00');
  }
  const [dollars, cents = ''] = normalized.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

function buildCaption(offer: Offer) {
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
  ].join('\n');
}

function countVisibleByCategory(services: ServiceItem[], category: string) {
  return services.filter((service) => service.categoria === category && service.disponible).length;
}

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 900 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value?: number | null;
  onChange: (value: number | null) => void;
  ariaLabel: string;
}) {
  const isFocused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() => formatUsdAdminInput(value));

  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(formatUsdAdminInput(value));
    }
  }, [value]);

  return (
    <input
      aria-label={ariaLabel}
      inputMode="decimal"
      placeholder="25.00"
      type="text"
      value={displayValue}
      onFocus={() => {
        isFocused.current = true;
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDisplayValue(nextValue);
        try {
          onChange(parseUsdInputToCents(nextValue));
        } catch {
          // Keep the typed value visible until blur; the last valid cents value remains intact.
        }
      }}
      onBlur={() => {
        isFocused.current = false;
        try {
          const cents = parseUsdInputToCents(displayValue);
          onChange(cents);
          setDisplayValue(formatUsdAdminInput(cents));
        } catch {
          setDisplayValue(formatUsdAdminInput(value));
        }
      }}
    />
  );
}

export default function AdminDashboard({ offersDoc, servicesDoc }: Props) {
  const [offers, setOffers] = useState(offersDoc.ofertas);
  const [services, setServices] = useState(servicesDoc.servicios);
  const [offerForm, setOfferForm] = useState(blankOffer);
  const [offerImage, setOfferImage] = useState('');
  const [status, setStatus] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setWorkflowStatus(payload);
      })
      .catch(() => {
        if (!cancelled) setWorkflowStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOffers = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    return offers.filter((offer) => {
      if (!offer.publicada) return false;
      try {
        return parseRdDate(offer.fecha_inicio) <= today && today <= parseRdDate(offer.fecha_fin, true);
      } catch {
        return false;
      }
    });
  }, [offers]);

  async function saveJson(kind: 'ofertas' | 'servicios', payload: JsonDoc<{ ofertas: Offer[] }> | JsonDoc<{ servicios: ServiceItem[] }>) {
    setStatus(`Guardando ${kind} en GitHub...`);
    const response = await fetch('/api/admin/save-json', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, payload }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
    setStatus(`${kind} guardado. www.elcache10.com leera este JSON vivo desde GitHub.`);
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error inesperado.');
    }
  }

  async function addOffer() {
    const title = offerForm.titulo.trim();
    const description = offerForm.descripcion.trim();
    if (!title) throw new Error('El titulo de la oferta es obligatorio.');
    if (!description) throw new Error('La descripcion de la oferta es obligatoria.');
    parseRdDate(offerForm.fecha_inicio);
    parseRdDate(offerForm.fecha_fin, true);

    const nextOffer: Offer = {
      id: `${slugify(title) || 'oferta'}-${Date.now()}`,
      titulo: title,
      descripcion: description,
      imagen_base64: offerImage,
      fecha_inicio: offerForm.fecha_inicio.trim(),
      fecha_fin: offerForm.fecha_fin.trim(),
      publicada: true,
      orden: offers.length + 1,
    };
    const nextOffers = [...offers, nextOffer];
    await saveJson('ofertas', { ...offersDoc, ofertas: nextOffers });
    setOffers(nextOffers);
    setOfferForm(blankOffer);
    setOfferImage('');
  }

  async function saveOffers(nextOffers = offers) {
    await saveJson('ofertas', { ...offersDoc, ofertas: nextOffers });
    setOffers(nextOffers);
  }

  async function saveServices() {
    await saveJson('servicios', { ...servicesDoc, servicios: services });
  }

  async function deploySite() {
    setStatus('Solicitando actualizacion de la web...');
    const response = await fetch('/api/admin/deploy', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la web.');
    setStatus(data.message || 'Actualizacion solicitada.');
  }

  async function copyCaption(offer: Offer) {
    const caption = buildCaption(offer);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(caption);
      } else {
        window.prompt('Copia este caption:', caption);
      }
      setStatus('Caption copiado para Instagram.');
    } catch {
      window.prompt('Copia este caption:', caption);
      setStatus('El navegador bloqueo el portapapeles; se mostro el caption para copiar manualmente.');
    }
  }

  function openWhatsApp(offer: Offer) {
    const message = encodeURIComponent(`Hi El Cache 10! I want this offer: ${offer.titulo}\nhttps://elcache10.com/`);
    window.open(`https://wa.me/16463349409?text=${message}`, '_blank', 'noopener,noreferrer');
    setStatus('WhatsApp abierto para esta oferta.');
  }

  async function publishOffer(offer: Offer) {
    // 1. Copiar caption al portapapeles PRIMERO (antes de abrir la pestaña)
    await copyCaption(offer);

    // 2. Descargar imagen WebP comprimida si existe
    if (offer.imagen_base64) {
      const link = document.createElement('a');
      link.href = offer.imagen_base64;
      link.download = `${offer.id || 'oferta-elcache10'}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // 3. Abrir Instagram en nueva pestaña para publicación manual
    window.open('https://www.instagram.com/elcache10/', '_blank', 'noopener,noreferrer');
    setStatus('Caption copiado, imagen descargada. Pega en Instagram y publica.');
  }

  function updateService(id: string, patch: Partial<ServiceItem>) {
    setServices((current) => current.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  }

  function addService(category = 'Barber Services') {
    setServices((current) => [
      ...current,
      {
        id: `servicio-${Date.now()}`,
        categoria: category,
        nombre: 'Nuevo servicio',
        precio_centavos: null,
        precio_min_centavos: null,
        precio_max_centavos: null,
        etiqueta: '',
        disponible: true,
        orden: current.length + 1,
      },
    ]);
  }

  return (
    <>
      {status && <p className="status-line">{status}</p>}

      <section className="dashboard-grid" aria-label="Resumen administrativo">
        <article className="metric-card metric-card--dark">
          <span>Promos activas</span>
          <strong>{activeOffers.length}</strong>
          <p>{offers.length} ofertas guardadas para la web</p>
        </article>
        <article className="metric-card">
          <span>Barberia</span>
          <strong>{countVisibleByCategory(services, 'Barber Services')}</strong>
          <p>Cortes, fades, blow dry y afeitado</p>
        </article>
        <article className="metric-card">
          <span>Unas</span>
          <strong>{countVisibleByCategory(services, 'Nail Services')}</strong>
          <p>Servicios visibles de nails</p>
        </article>
        <article className="metric-card metric-card--gold">
          <span>Money Transfer</span>
          <strong>{countVisibleByCategory(services, 'Money Transfer')}</strong>
          <p>La Nacional y envios disponibles</p>
        </article>
      </section>

      <section className="quick-actions" aria-label="Accesos rapidos">
        <a className="quick-action" href="https://elcache10.com/" target="_blank" rel="noopener">Pagina publica</a>
        <a className="quick-action" href="https://elcache10.com/#services" target="_blank" rel="noopener">Servicios y precios</a>
        <a className="quick-action" href="https://wa.me/16463349409" target="_blank" rel="noopener">WhatsApp reservas</a>
        <a className="quick-action" href="https://www.instagram.com/elcache10/" target="_blank" rel="noopener">Instagram</a>
      </section>

      <section className="panel workflow-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow admin-eyebrow">Modo workflow</p>
            <h2>Salud del guardado automatico</h2>
          </div>
          <div className="button-row">
            <button className="primary-btn" type="button" onClick={() => run(deploySite)}>Actualizar web</button>
            <button className="secondary-btn" type="button" onClick={() => window.location.reload()}>Refrescar estado</button>
          </div>
        </div>
        {workflowStatus ? (
          <div className="workflow-grid">
            <article className={workflowStatus.githubToken === 'configurado' ? 'workflow-step is-ok' : 'workflow-step is-warning'}>
              <span>1</span>
              <strong>GitHub</strong>
              <p>{workflowStatus.repo} / {workflowStatus.branch}</p>
              <small>{workflowStatus.githubToken}</small>
            </article>
            <article className="workflow-step is-ok">
              <span>2</span>
              <strong>Ofertas</strong>
              <p>data/ofertas.json</p>
              <small>Se guarda y la web lo lee vivo</small>
            </article>
            <article className="workflow-step is-ok">
              <span>3</span>
              <strong>Servicios</strong>
              <p>data/servicios.json</p>
              <small>Precios en centavos enteros</small>
            </article>
            <article className="workflow-step is-ok">
              <span>4</span>
              <strong>Publicacion</strong>
              <p>{workflowStatus.deployHook}</p>
              <small>JSON raw activo para www</small>
            </article>
          </div>
        ) : (
          <p className="status-line">Cargando diagnostico del workflow...</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow admin-eyebrow">Promo barberia</p>
            <h2>Nueva oferta para www.elcache10.com</h2>
          </div>
          <span className="pill">Foto + WhatsApp + Instagram</span>
        </div>
        <div className="offer-form">
          <label>Titulo<input value={offerForm.titulo} onChange={(event) => setOfferForm({ ...offerForm, titulo: event.target.value })} placeholder="Fade de la semana" /></label>
          <label>Descripcion<textarea value={offerForm.descripcion} onChange={(event) => setOfferForm({ ...offerForm, descripcion: event.target.value })} placeholder="Especial editable para publicar en la pagina." /></label>
          <div className="upload-field">
            <p className="upload-label">Imagen de la oferta</p>
            <label className="upload-btn" htmlFor="ec10-offer-image-input">
              {offerImage ? '📷 Cambiar foto' : '📷 Subir foto de la oferta'}
            </label>
            <input
              id="ec10-offer-image-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) =>
                event.target.files?.[0] &&
                run(async () => setOfferImage(await compressImage(event.target.files![0])))
              }
            />
            <div className="preview-card">
              {offerImage ? (
                <img src={offerImage} alt="Vista previa" style={{ maxHeight: 220, borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <div className="image-preview-empty">Sin imagen — pulsa el botón de arriba para subir una foto</div>
              )}
            </div>
            {offerImage && (
              <button
                className="danger-btn"
                type="button"
                style={{ marginTop: 4 }}
                onClick={() => {
                  setOfferImage('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Quitar foto
              </button>
            )}
          </div>
          <div className="date-grid">
            <label>Desde DD/MM/AAAA<input value={offerForm.fecha_inicio} onChange={(event) => setOfferForm({ ...offerForm, fecha_inicio: event.target.value })} /></label>
            <label>Hasta DD/MM/AAAA<input value={offerForm.fecha_fin} onChange={(event) => setOfferForm({ ...offerForm, fecha_fin: event.target.value })} /></label>
          </div>
          <div className="split-actions">
            <button className="primary-btn" type="button" onClick={() => run(addOffer)}>1. Guardar oferta</button>
            <button className="secondary-btn" type="button" onClick={() => run(deploySite)}>2. Actualizar web</button>
          </div>
        </div>
      </section>

      <section className="panel offers-panel">
        <div className="panel-title-row">
          <h2>Ofertas publicadas</h2>
          <span className="pill">{offers.length} ofertas</span>
        </div>
        <div className="cards-grid">
          {offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              {offer.imagen_base64 ? <img src={offer.imagen_base64} alt={offer.titulo} /> : <div className="offer-placeholder">El Cache 10</div>}
              <div className="offer-card__body">
                <h3>{offer.titulo}</h3>
                <p>{offer.descripcion}</p>
                <p>{offer.fecha_inicio} - {offer.fecha_fin}</p>
                <div className="offer-actions">
                  <button className="secondary-btn" type="button" onClick={() => openWhatsApp(offer)}>WhatsApp</button>
                  <button className="secondary-btn" type="button" onClick={() => run(() => copyCaption(offer))}>Copiar caption</button>
                  <button className="secondary-btn" type="button" onClick={() => publishOffer(offer)}>Publicar redes</button>
                  <button className="danger-btn" type="button" onClick={() => run(() => saveOffers(offers.filter((entry) => entry.id !== offer.id)))}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow admin-eyebrow">Precios vivos</p>
            <h2>Servicios de barberia, unas y envios</h2>
          </div>
          <div className="button-row">
            <button className="secondary-btn" type="button" onClick={() => addService('Barber Services')}>Agregar barberia</button>
            <button className="secondary-btn" type="button" onClick={() => addService('Nail Services')}>Agregar unas</button>
            <button className="secondary-btn" type="button" onClick={() => addService('Money Transfer')}>Agregar envio</button>
            <button className="primary-btn" type="button" onClick={() => run(saveServices)}>Guardar precios</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Categoria</th>
                <th>$ Fijo</th>
                <th>$ Desde</th>
                <th>$ Hasta</th>
                <th>Etiqueta</th>
                <th>Orden</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td><input value={service.nombre} onChange={(event) => updateService(service.id, { nombre: event.target.value })} /></td>
                  <td><input value={service.categoria} onChange={(event) => updateService(service.id, { categoria: event.target.value })} /></td>
                  <td><MoneyInput ariaLabel={`Precio fijo de ${service.nombre}`} value={service.precio_centavos} onChange={(price) => updateService(service.id, { precio_centavos: price })} /></td>
                  <td><MoneyInput ariaLabel={`Precio minimo de ${service.nombre}`} value={service.precio_min_centavos} onChange={(price) => updateService(service.id, { precio_min_centavos: price })} /></td>
                  <td><MoneyInput ariaLabel={`Precio maximo de ${service.nombre}`} value={service.precio_max_centavos} onChange={(price) => updateService(service.id, { precio_max_centavos: price })} /></td>
                  <td><input value={service.etiqueta ?? ''} onChange={(event) => updateService(service.id, { etiqueta: event.target.value })} placeholder="Ask for price" /></td>
                  <td><input type="number" value={service.orden} onChange={(event) => updateService(service.id, { orden: Number.parseInt(event.target.value, 10) || 1 })} /></td>
                  <td><input type="checkbox" checked={service.disponible} onChange={(event) => updateService(service.id, { disponible: event.target.checked })} /></td>
                  <td><button className="danger-btn" type="button" onClick={() => setServices(services.filter((entry) => entry.id !== service.id))}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
