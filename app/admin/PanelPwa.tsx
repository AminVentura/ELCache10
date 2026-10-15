'use client';

import { useEffect, useState } from 'react';

/**
 * PWA del panel (2026-10-15): registra /admin-sw.js con alcance /admin (la web pública no queda bajo él)
 * y, si se cae la red con el panel YA abierto, tapa el panel con el aviso «Sin conexión» para no
 * enseñar datos viejos. No borra lo que se esté escribiendo: al volver la red, el panel reaparece igual.
 * El service worker no guarda /api, la página /admin ni nada de Clerk: ver admin-sw.js.
 */
export default function PanelPwa() {
  const [sinRed, setSinRed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => undefined);
    }
    const actualizar = () => setSinRed(!navigator.onLine);
    actualizar();
    window.addEventListener('offline', actualizar);
    window.addEventListener('online', actualizar);
    return () => {
      window.removeEventListener('offline', actualizar);
      window.removeEventListener('online', actualizar);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('panel-sin-red', sinRed);
    return () => document.body.classList.remove('panel-sin-red');
  }, [sinRed]);

  if (!sinRed) return null;
  return (
    <div className="panel-sin-red__aviso" role="alert" data-testid="aviso-sin-conexion">
      <h1>Sin conexión</h1>
      <p>El panel de administración necesita internet para mostrar y guardar precios, ofertas y equipo.</p>
      <p>No se muestran datos mientras no haya conexión. Cuando vuelva, el panel reaparece.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  );
}
