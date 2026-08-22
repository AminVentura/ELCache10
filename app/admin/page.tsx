import fs from 'node:fs/promises';
import path from 'node:path';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import type { JsonDoc, Offer, ServiceItem } from './AdminDashboard';
import { buildAdminRedirectUrl } from '../../lib/admin-host.mjs';

async function readDataJson<T>(filename: string): Promise<T> {
  const rawUrl = `https://raw.githubusercontent.com/AminVentura/ELCache10/main/data/${filename}`;
  try {
    const response = await fetch(`${rawUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) return (await response.json()) as T;
  } catch {
    // Local fallback keeps the admin usable if GitHub raw is temporarily unavailable.
  }

  const raw = await fs.readFile(path.join(process.cwd(), 'data', filename), 'utf8');
  return JSON.parse(raw) as T;
}

function formatBronxDate(daysToAdd = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const year = parts.find((part) => part.type === 'year')?.value || String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function buildInitialOfferForm() {
  return {
    titulo: '',
    descripcion: '',
    fecha_inicio: formatBronxDate(),
    fecha_fin: formatBronxDate(7),
  };
}

export default async function AdminPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const adminRedirectUrl = buildAdminRedirectUrl(`${protocol}://${host}/admin`);
  if (adminRedirectUrl) {
    redirect(String(adminRedirectUrl));
  }

  const [offersDoc, servicesDoc] = await Promise.all([
    readDataJson<JsonDoc<{ ofertas: Offer[] }>>('ofertas.json'),
    readDataJson<JsonDoc<{ servicios: ServiceItem[] }>>('servicios.json'),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/css/admin-static.css" />
      <main className="admin-shell">
        <header className="admin-hero">
          <div>
            <p className="eyebrow">Administracion El Cache 10</p>
            <h1>Control Room Barberia</h1>
            <p>
              Cambia precios, sube ofertas con foto y prepara Instagram. Los cambios se guardan
              en GitHub y los lee la pagina publica de El Cache 10.
            </p>
          </div>
          <div className="admin-actions">
            <a className="ghost-link" href="https://elcache10.com/" target="_blank" rel="noopener">Ver pagina publica</a>
            <a className="ghost-link" href="https://www.instagram.com/elcache10/" target="_blank" rel="noopener">Instagram</a>
          </div>
        </header>
        <AdminDashboard offersDoc={offersDoc} servicesDoc={servicesDoc} initialOfferForm={buildInitialOfferForm()} />
      </main>
    </>
  );
}
