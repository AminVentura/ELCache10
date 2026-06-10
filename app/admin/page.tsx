import fs from 'node:fs/promises';
import path from 'node:path';
import AdminDashboard from './AdminDashboard';
import type { JsonDoc, Offer, ServiceItem } from './AdminDashboard';

async function readDataJson<T>(filename: string): Promise<T> {
  const raw = await fs.readFile(path.join(process.cwd(), 'data', filename), 'utf8');
  return JSON.parse(raw) as T;
}

export default async function AdminPage() {
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
        <AdminDashboard offersDoc={offersDoc} servicesDoc={servicesDoc} />
      </main>
    </>
  );
}
