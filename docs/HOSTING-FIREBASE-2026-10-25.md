# Paso de Vercel a Firebase — ElCache10 (elcache10.com) (2026-10-25)

Preparado en la rama `chore/firebase-hosting-2026-10-25`. **No se creó ningún sitio ni backend, no se conectó ningún dominio y no se desplegó nada.** Vercel (proyecto `el-cache10`, conectado a GitHub) sigue sirviendo `elcache10.com`, `www` y `admin`.

## 1. Qué opción y por qué

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Sirve el plan gratis (Spark)? | Solo para archivos: Hosting en Spark sirve estáticos (10 GB, 360 MB/día). Cloud Functions y App Hosting no existen en Spark. | [Precios de Firebase](https://firebase.google.com/pricing) |
| ¿Qué hace falta para la parte con servidor? | **Firebase App Hosting**, que exige el plan **Blaze**. | [Costos de App Hosting](https://firebase.google.com/docs/app-hosting/costs) |
| ¿El proyecto está en Blaze? | `chatbot-citas-elcache10` **ya tiene la facturación activada** (comprobado hoy, solo lectura). | `gcloud billing projects describe` |

**¿Puede ir como archivos estáticos?** En parte:

| Parte | ¿Estática? | Por qué |
|---|---|---|
| Guías (`/guias/*.html`), aviso legal, privacidad, cookies, `ads.txt`, `robots.txt`, `sitemap.xml`, CSS, JS, imágenes, videos | **Sí** | Son archivos; `scripts/build-static.mjs` los copia a `public/` |
| Portada `/` (`app/page.tsx`) | No del todo | Mete en el HTML el equipo (de `citas.elcache10.com/api/staff`), las ofertas y los precios en vivo. Servida como archivo, sale la plantilla sin esos datos |
| Panel `/admin` y `admin.elcache10.com` (Clerk, `/api/admin/*`) | No | Sesión de Clerk, lista blanca y guardado en GitHub con token |
| `/api/staff-photo` y `/images/staff/*` | No | Lo llama `citas.elcache10.com` con la clave `STAFF_ROSTER_SYNC_KEY` para guardar las fotos de las sillas |

**Recomendación: App Hosting**, un backend `elcache-web` en `chatbot-citas-elcache10`, **conectado a GitHub con la rama `main`**. Es como funciona hoy en Vercel: cada guardado del panel (un commit en GitHub) y cada fusión a `main` publican solos ([App Hosting despliega en cada git push](https://firebase.google.com/docs/app-hosting/multiple-environments)). Con eso ya no hace falta `ADMIN_VERCEL_DEPLOY_HOOK_URL`.

**Plan B (solo archivos, `npm run deploy:web-estatico`):** quedó preparado en `firebase.json` (destino `web`, carpeta `public/`) por si se quiere servir solo lo estático. **No se recomienda:** sin `/admin`, sin `/api/staff-photo` (las fotos de las sillas dejan de guardarse) y la portada sin equipo ni precios en vivo.

## 2. Coste esperado (escala a cero, nada siempre encendido)

`apphosting.yaml`: `minInstances: 0` (valor por defecto) y `maxInstances: 2`. Sin visitas no corre nada; la primera visita tras un rato tarda unos segundos.

Cuota gratis al mes ([Costos de App Hosting](https://firebase.google.com/docs/app-hosting/costs)): 10 GiB de salida, 180 000 vCPU-segundos, 360 000 GiB-segundos, 2 millones de peticiones, 2 500 minutos de build, 0.5 GB de imágenes, 6 versiones de secretos. Después: US$0.15 por GiB en caché / US$0.20 sin caché, US$0.40 por millón de peticiones, US$0.006 por minuto de build, US$0.06 por versión de secreto.

**Ojo con el tráfico:** esta web tiene videos (`/videos`) y AdSense trae visitas. Los 10 GiB gratis de salida se van rápido si los videos se ven mucho; cada GiB extra cuesta US$0.15–0.20. Si pasa, mover los videos a YouTube o bajarles el peso.
**Builds:** conectado a GitHub, cada guardado del panel hace un build (unos minutos); 2 500 minutos al mes alcanzan para cientos de guardados.
**Secretos:** 5 aquí; si la misma cuenta de facturación paga también citas (18) y Antojos (6), unos US$0.06 por cada uno por encima de 6.

Total esperado con el tráfico de hoy: **US$0–3 al mes**, según los videos. Alerta de presupuesto de US$5 (avisa, no corta).

## 3. Qué quedó listo en el código

| Archivo | Qué hace |
|---|---|
| `apphosting.yaml` | Escala a cero, `maxInstances: 2`, secretos de Clerk, GitHub y la clave de las fotos **solo por nombre**. |
| `firebase.json` | Backend `elcache-web` y el destino `web` del plan B (carpeta `public/`). |
| `.firebaserc` | Proyecto `chatbot-citas-elcache10`; destino `web` → sitio `elcache10-web` (no creado). |
| `scripts/deploy-firebase.mjs` + `npm run deploy:web`, `npm run deploy:web-estatico` | Solo con `-- --confirmar`, desde `main` limpio y al día. Normalmente no hacen falta (GitHub publica solo). |
| `next.config.ts` | Redirección `www.elcache10.com` → `elcache10.com` (en Vercel lo hacía `vercel.json`, que Firebase no lee). `admin.elcache10.com` ya lo resuelven `proxy.ts` y `app/page.tsx`. |
| Pie | Versión de `package.json` (se añadió `"version": "0.1.0"`) y fecha del build en la portada, las páginas legales y las 14 guías (`lib/version-sitio.mjs`). La fecha de cada documento legal («Última actualización» dentro del texto) **no** se tocó: es la fecha del documento. |

## 4. Pasos para Amin

1. **Alerta de presupuesto** de US$5 (Google Cloud → Facturación).
2. **Secretos** (piden el valor sin mostrarlo; copiarlos de Vercel):
   ```
   npx firebase-tools@15.34.0 apphosting:secrets:set clerk-publishable-key --project chatbot-citas-elcache10
   npx firebase-tools@15.34.0 apphosting:secrets:set clerk-secret-key --project chatbot-citas-elcache10
   npx firebase-tools@15.34.0 apphosting:secrets:set admin-allowed-emails --project chatbot-citas-elcache10
   npx firebase-tools@15.34.0 apphosting:secrets:set admin-github-token --project chatbot-citas-elcache10
   npx firebase-tools@15.34.0 apphosting:secrets:set staff-roster-sync-key --project chatbot-citas-elcache10
   ```
   `staff-roster-sync-key` debe ser la misma que use citas.
3. **Clerk:** en el panel de Clerk, añadir los dominios nuevos solo si cambian (siguen siendo `elcache10.com` y `admin.elcache10.com`). En la URL `*.hosted.app` el login del panel puede no funcionar; probar allí la parte pública.
4. **Crear el backend** `elcache-web` (Firebase → App Hosting → Crear backend), conectado al repo `AminVentura/ELCache10`, rama `main`, carpeta raíz `/`, región `us-east4` si la ofrece. **Antes**, fusionar esta rama a `main` (si no, el primer build sale sin el pie ni la redirección de `www`).
5. **Probar en `elcache-web--chatbot-citas-elcache10.<región>.hosted.app`:** portada (equipo y precios en vivo), una guía, `/ads.txt`, `/robots.txt`, `/sitemap.xml`, el aviso de cookies y que AdSense **no** cargue antes de aceptar, y el widget de CacheBot.
6. **Dominios** (§5), uno por uno. **`admin` primero**, luego `www`, y la raíz `elcache10.com` al final.
7. **Limpieza de imágenes** en Artifact Registry (conservar las 3 más recientes).
8. **Apagar Vercel al final:** quitar los dominios del proyecto `el-cache10` y desconectarlo de GitHub (si no, cada push publica en los dos). Pausarlo, no borrarlo.

## 5. DNS (Cloudflare) — registros por dominio

Los DNS de `elcache10.com` están en **Cloudflare** (`courtney`/`simon.ns.cloudflare.com`, comprobado hoy). Hoy: raíz **A** `216.198.79.1`; `www` y `admin` **CNAME** `ad9f4d79e67b3b15.vercel-dns-017.com` (Vercel).

App Hosting pide estos tipos; **los valores exactos (UUID, destino del CNAME e IP) los da el asistente** «Agregar dominio personalizado» → **«Migrar un dominio»** (camino sin corte para dominios con tráfico). Fuente: [Dominio personalizado en App Hosting](https://firebase.google.com/docs/app-hosting/custom-domain).

| Dominio | Paso 1 «Preparar dominio» (Vercel sigue sirviendo) | Paso 2 «Dirigir a App Hosting» (aquí cambia el tráfico) |
|---|---|---|
| `admin.elcache10.com` | **TXT** en `admin`: `fah-claim=<UUID>` · **CNAME** `_acme-challenge_<…>.admin` → destino del asistente (certificado; **no borrarlo nunca**) | Borrar el CNAME a Vercel; **A** `admin` → IP del asistente (o CNAME al destino `_custom-domain…` si lo ofrece) |
| `www.elcache10.com` | Igual, host `www` | Igual, host `www`. La app redirige `www` → `elcache10.com` |
| `elcache10.com` (raíz) | **TXT** en `@`: `fah-claim=<UUID>` · **CNAME** de `_acme-challenge` que dé el asistente | Borrar el **A** `216.198.79.1` (Vercel); **A** `@` → IP del asistente. En la raíz no se usa CNAME. |

Si algún día se usa el plan B (Hosting clásico), los registros son otros: **TXT** `hosting-site=<id del sitio>` y **A** a la IP que muestre el asistente (la documentación pone de ejemplo `199.36.158.100`) ([Dominio personalizado en Hosting](https://firebase.google.com/docs/hosting/custom-domain)).

- Registros de Firebase en Cloudflare con **«Solo DNS» (nube gris)**.
- **No borrar** el TXT `google-site-verification=…` de la raíz (Search Console) ni los registros de correo.
- App Hosting no usa AAAA; CAA solo si lo pide (permitir `letsencrypt.org` y `pki.goog`). Hasta 24 h.

## 6. AdSense: que siga funcionando

- `ads.txt` tiene que seguir en la **raíz**: `https://elcache10.com/ads.txt`. Lo copia `scripts/build-static.mjs` a `public/` y App Hosting lo sirve igual que Vercel. Comprobarlo en la URL `*.hosted.app` antes de mover el DNS y otra vez en `elcache10.com` después: mismo contenido, código 200, sin redirecciones.
- El dominio no cambia, así que el sitio aprobado en AdSense es el mismo. No hace falta volver a pedir revisión.
- El consentimiento (Consent Mode, `js/consent.js`) y la CSP de `next.config.ts` viajan con el código.
- Mover la raíz en horas de poco tráfico; durante la propagación algunos visitantes verán Vercel y otros Firebase, y los dos sirven el mismo `ads.txt`.

## 7. Orden seguro

1. Vercel sigue vivo y publicando mientras tanto.
2. Firebase funcionando y probado en `*.hosted.app` (paso 5).
3. DNS al final, uno por uno: `admin` → `www` → raíz. Después de cada uno: abrir el dominio, `ads.txt`, una guía, el panel. Si algo falla, volver a poner el registro de Vercel en ese nombre (Vercel conserva los dominios hasta que se quiten).
4. `citas.elcache10.com` llama a `www.elcache10.com/api/staff-photo`: después de mover `www`, guardar una foto de prueba de una silla solo si Francis/Amin lo deciden, o revisar los registros en la próxima foto real.
5. Vercel se desconecta de GitHub y se pausa solo al final.
