# Refrescar web de elcache10.com en Firebase (2026-10-26)

Rama `fix/refrescar-web-2026-10-26`. Va junto con la misma rama en CitaElCache10 (botón y fotos).

## Qué pasaba

Desde el 26-oct `elcache10.com` y `www` salen de **Firebase Hosting** (proyecto `elcache10-app`,
sitio `elcache10-app`). Firebase solo sirve archivos: no tiene `/api`.

Camino de una foto nueva de silla:

1. Francis toma la foto en `citas.elcache10.com/dashboard/sillas`.
2. Citas la manda (servidor a servidor, con `STAFF_ROSTER_SYNC_KEY`) a `…/api/staff-photo`.
3. Esa API (Vercel, este repo) hace un **commit a GitHub**: `images/staff/<nombre>-<fecha>.jpg` en `main`.
   No usa Blob ni guarda nada en Vercel.
4. La portada pide el equipo a `citas.elcache10.com/api/staff` y pinta `photoUrl`
   (`https://www.elcache10.com/images/staff/…`).

Lo que se rompió:

- **La subida falla hoy.** Citas apunta a `https://www.elcache10.com/api/staff-photo`. Ese POST
  ahora llega a Firebase, que contesta 200 con la portada en HTML (comprobado con curl). Citas lo
  detecta y muestra "no tiene /api/staff-photo". La API sigue viva en `admin.elcache10.com`
  (POST sin clave → 401 JSON).
- **Aunque se subiera, no se vería.** El commit llega a GitHub, pero Firebase solo cambia cuando
  alguien publica. Antes Vercel volvía a construir con cada push.
- `firebase.json` (sin versionar en la carpeta principal) tenía `"** -> /index.html"`: cualquier URL
  inexistente, también una foto que falta, daba 200 con la portada (soft 404). Y `cleanUrls: true`
  mandaba `/privacidad.html` con 301 a `/privacidad`, mientras canonical y sitemap usan `.html`.
- Lo publicado en Firebase salió de la carpeta local, que está **10 commits por detrás** de
  `origin/main`: falta Open Graph (`og-portada.jpg`), el aviso legal de arbitraje y el CI.

## Solución

1. **Las fotos se ven al momento, sin publicar** (CitaElCache10): `/api/staff` devuelve las fotos por
   `https://citas.elcache10.com/media/elcache10/images/…?v=<huella>`, y `/media` las lee **primero de
   GitHub** (`raw.githubusercontent.com`, el repo es público) y, si no está, de la web en Firebase.
   El nombre de archivo es único por foto y además lleva `?v=`: no hay caché vieja.
   La portada que ya está publicada usa `photoUrl` tal cual, así que esto funciona sin tocar Firebase.
2. **La subida va a la API que existe:** `ELCACHE_API_URL` (por defecto `https://admin.elcache10.com`).
   Si alguien deja `www` o la raíz ahí, se ignora porque son estáticos.
3. **Publicación automática** (`.github/workflows/firebase-hosting.yml`): cada push a `main`
   (incluidos los commits de la cámara y del panel) y `workflow_dispatch`. Pasa las pruebas, genera
   `public/` con `scripts/build-static.mjs` y publica `hosting:elcache10` con firebase-tools (MIT).
   Acceso a Google con Workload Identity Federation (sin clave) o, si no, un secreto.
   **Apagado** mientras la variable `FIREBASE_DEPLOY_ENABLED` no valga `true`: el job `aviso` deja una
   nota en verde, no falla en rojo.
4. **Botón «Refrescar web»** en `citas.elcache10.com/dashboard/sillas` (solo Francis): lanza ese
   workflow por la API de GitHub y muestra En cola → Publicando → Listo. Una vez cada 2 min.
5. **firebase.json corregido** (ahora versionado): sin comodín a la portada, `404.html` propia,
   `cleanUrls: false` como en Vercel, `/admin` y `/sign-in` → `admin.elcache10.com`, cabeceras de
   Vercel (`/data` y `/api` sin indexar, caché de `/data` 60 s), `site.webmanifest` copiado a `public/`
   (antes devolvía la portada) y `/favicon.ico` → `/images/favicon-32.png`.

Lo que Firebase no puede hacer desde `firebase.json`: **www → raíz**. Vercel lo hacía con un 301;
hoy `www.elcache10.com` responde 200 (el canonical apunta a la raíz, así que no es grave). Se arregla
en la consola (paso 6).

CacheBot: `citas.elcache10.com/api/chat` responde al preflight CORS de `https://elcache10.com` y
`https://www.elcache10.com` (204 con su origen) y la CSP de Firebase deja `connect-src` a citas. Sin cambios.

## Pasos para Amin

Nada de esto está publicado. En este orden:

1. **Workload Identity Federation** (gratis, sin clave). En Cloud Shell o con gcloud:

   ```bash
   PROJECT=elcache10-app
   NUM=12581462180
   SA=github-hosting@$PROJECT.iam.gserviceaccount.com
   gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $PROJECT
   gcloud iam service-accounts create github-hosting --project $PROJECT --display-name "GitHub publica Hosting"
   gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role roles/firebasehosting.admin
   gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role roles/serviceusage.serviceUsageConsumer
   gcloud iam workload-identity-pools create github --project $PROJECT --location global --display-name "GitHub"
   gcloud iam workload-identity-pools providers create-oidc elcache10 --project $PROJECT --location global \
     --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
     --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
     --attribute-condition "assertion.repository=='AminVentura/ELCache10' && assertion.ref=='refs/heads/main'"
   gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT --role roles/iam.workloadIdentityUser \
     --member "principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/AminVentura/ELCache10"
   ```

   Si no se puede: crear una clave JSON de esa cuenta y ponerla como **secreto** de repositorio
   `FIREBASE_SERVICE_ACCOUNT_ELCACHE10_APP` (GitHub → Settings → Secrets → Actions). Nadie más la ve.

2. **Variables del repo** `AminVentura/ELCache10` (no son secretos):

   ```bash
   gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo AminVentura/ELCache10 \
     --body "projects/12581462180/locations/global/workloadIdentityPools/github/providers/elcache10"
   gh variable set GCP_SERVICE_ACCOUNT --repo AminVentura/ELCache10 --body "github-hosting@elcache10-app.iam.gserviceaccount.com"
   ```

3. **Fusionar** `fix/refrescar-web-2026-10-26` a `main` (este repo). Con el workflow aún apagado.
4. **Encender**: `gh variable set FIREBASE_DEPLOY_ENABLED --repo AminVentura/ELCache10 --body true` y
   lanzar una vez a mano: `gh workflow run firebase-hosting.yml --repo AminVentura/ELCache10 --ref main`.
   Esa primera publicación sube los 10 commits que faltan (Open Graph, aviso legal).
   Comprobar: `curl -sI https://elcache10.com/no-existe` → 404; `curl -sI https://elcache10.com/admin` → 302.
5. **Token del botón** (solo nombre aquí): GitHub → Settings → Developer settings → Fine-grained tokens →
   repositorio **solo** `AminVentura/ELCache10`, permiso **Actions: Read and write**, caducidad corta.
   En Vercel, proyecto de CitaElCache10, Production: `WEB_REFRESH_GITHUB_TOKEN`. Opcionales (ya tienen
   valor por defecto): `ELCACHE_API_URL`, `WEB_REFRESH_REPO`, `WEB_REFRESH_WORKFLOW`, `WEB_REFRESH_MIN_SECONDS`.
   Si en Vercel de citas existe `ELCACHE_SITE_URL=https://www.elcache10.com`, puede quedarse: ya no se usa para la API.
6. **www → raíz** en Firebase: consola → Hosting → `elcache10-app` → dominio `www.elcache10.com` →
   Editar → "Redirigir a" `elcache10.com`.
7. Publicar CitaElCache10 (ver su `docs/REFRESCAR-WEB-2026-10-26.md`) y que Francis pruebe:
   foto nueva → se ve en la portada al recargar; botón «Refrescar web» → Listo.

## Pruebas

- `npm test`: 52 pruebas, 0 fallos (6 nuevas en `tests/firebase-hosting.test.mjs`).
- `npm run check` exit 0; `npm run build` exit 0.
- El emulador de Hosting de este PC no aplica `redirects` ni `headers` (tampoco con el `firebase.json`
  de Antojos, que en producción sí redirige). La sintaxis es la misma que ya funciona en antojosbarlounge.com.
