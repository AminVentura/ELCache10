# SEO_STRATEGY.md — elcache10.com
> Propiedad de Businessskore | Última actualización: 2026-05-09

---

## 1. ESTADO ACTUAL DEL SITIO

| Ítem | Estado |
|------|--------|
| Dominio | `elcache10.com` |
| AdSense | ⚠️ **En revisión / rechazado** — reforzar propiedad, contenido y superficies indexables |
| robots.txt | ✅ Actualizado — excluye `/admin/`, `/api/`, `/data/` y `/public/` |
| sitemap.xml | ✅ Actualizado — solo URLs públicas con contenido principal |
| HTTPS | ✅ Verificar redirección `http://` → `https://` |
| Hosting | Vercel |

---

## 2. CHECKLIST GOOGLE SEARCH CONSOLE

### Paso 1 — Verificar propiedad
- [ ] Ingresar a [search.google.com/search-console](https://search.google.com/search-console)
- [ ] Agregar propiedad: `https://elcache10.com`
- [ ] Método recomendado para Vercel: **DNS TXT record** (más estable)
- [ ] Si Google exige meta tag, pegar el valor exacto entregado por Google en `index.html`, junto al comentario `Google Search Console / AdSense ownership`. No inventar ni usar placeholder.
- [ ] Si Google exige archivo HTML de verificación, guardar el archivo exacto en la raíz del proyecto para que publique como `https://elcache10.com/googleXXXXXXXXXXXX.html`.

### Paso 2 — Enviar Sitemap
- [ ] Search Console → Sitemaps → Agregar sitemap
- [ ] URL: `https://elcache10.com/sitemap.xml`

### Paso 3 — Indexación de páginas clave
- [ ] Inspeccionar URL: `https://elcache10.com/`
- [ ] Solicitar indexación de cada página `/watch/`

---

## 3. VERIFICACIÓN DE REDIRECCIONES HTTPS

| Origen | Destino esperado | Estado |
|--------|-----------------|--------|
| `http://elcache10.com` | `https://elcache10.com/` | ⬜ Verificar |
| `http://www.elcache10.com` | `https://elcache10.com/` | ⬜ Verificar |
| `https://www.elcache10.com` | `https://elcache10.com/` | ⬜ Verificar |

**En Vercel** (`vercel.json`):
```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "www.elcache10.com" }],
      "destination": "https://elcache10.com/$1",
      "permanent": true
    }
  ]
}
```

---

## 4. ESTRUCTURA DE PÁGINAS Y PRIORIDADES SEO

| Página | URL | Prioridad | Frecuencia |
|--------|-----|-----------|------------|
| Inicio | `/` | 1.0 | Semanal |
| Francis (video) | `/watch/francis.html` | 0.7 | Mensual |
| Shop Tour 1 | `/watch/shop-tour-1.html` | 0.7 | Mensual |
| Shop Tour 2 | `/watch/shop-tour-2.html` | 0.7 | Mensual |
| Shop Tour 3 | `/watch/shop-tour-3.html` | 0.7 | Mensual |
| Anuncio Sillas | `/watch/anuncio-sillas.html` | 0.6 | Mensual |
| Privacidad | `/privacidad.html` | Footer only | Noindex, follow |
| Cookies | `/cookies.html` | Footer only | Noindex, follow |
| Aviso Legal | `/aviso-legal.html` | Footer only | Noindex, follow |

---

## 5. ESTRATEGIA ADSENSE — REVISIÓN DE POLÍTICAS

El sitio está en revisión por AdSense. Para reducir rechazo por “pantallas sin contenido de publicadores” y “contenido de bajo valor”:

- [ ] Mantener el cargador AdSense solo en `index.html` mientras Google reevalúa, porque es la página con contenido editorial amplio.
- [ ] No cargar AdSense en `/admin/`, `/api/`, `/data/`, páginas legales ni páginas de video finas.
- [ ] **`ads.txt` en la raíz** — Verificar: `https://elcache10.com/ads.txt`
- [ ] Contenido de `ads.txt`:
  ```
  google.com, pub-8721021745606812, DIRECT, f08c47fec0942fa0
  ```
- [ ] No usar más de 3 unidades de anuncio por página (política AdSense)
- [ ] Mantener páginas `/watch/` con texto original suficiente antes de volver a activar anuncios en ellas.

---

## 6. KEYWORDS TARGET (Barbería RD)

### Primarias
- `el cache 10 barbería`
- `barbería dominicana`
- `cortes de cabello República Dominicana`

### Long-tail (menor competencia)
- `mejor barbería Santo Domingo`
- `fade haircut dominicana`
- `barber shop RD precios`

---

## 7. SCRIPT DE GENERACIÓN DE SITEMAP

```bash
cd "ElCache10"
node generate-sitemap.js
```
Ejecutar cada vez que se agregan nuevas páginas `/watch/` o contenido.

---

## 8. META TAGS RECOMENDADOS (index.html + páginas /watch/)

```html
<!-- SEO Básico -->
<meta name="description" content="El Cache 10 — Barbería premium en República Dominicana. Cortes, fades y estilos únicos.">
<meta name="keywords" content="barbería RD, el cache 10, cortes dominicana, fade haircut, barber shop">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://elcache10.com/">

<!-- Open Graph -->
<meta property="og:title" content="El Cache 10 — Barbería Premium RD">
<meta property="og:description" content="Barbería premium en República Dominicana. Cortes, fades y estilos únicos.">
<meta property="og:url" content="https://elcache10.com/">
<meta property="og:type" content="website">
```

---

*Generado por Javi/Claude — Businessskore © 2026*
