/**
 * generate-sitemap.js — elcache10.com
 * Uso: node generate-sitemap.js
 * Escanea todos los .html públicos (incluyendo /watch/) y genera sitemap.xml
 * Propiedad de Businessskore — Licencia Propietaria (NO GPL).
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const BASE_URL = 'https://elcache10.com';
const SITE_DIR = __dirname;
const OUTPUT   = path.join(SITE_DIR, 'sitemap.xml');
const TODAY    = new Date().toISOString().split('T')[0];

// Páginas privadas, técnicas o legales de bajo valor SEO a EXCLUIR del sitemap.
// Las páginas legales siguen accesibles desde el footer, pero no se promocionan para indexación.
const EXCLUDED = new Set([
  'admin/index.html',
  'aviso-legal.html',
  'cookies.html',
  'privacidad.html',
]);

// Prioridades y frecuencias por página (relativas a BASE_URL)
const PAGE_CONFIG = {
  'index.html':                { priority: '1.0', changefreq: 'weekly' },
  'guias/index.html':          { priority: '0.8', changefreq: 'weekly' },
};

const DEFAULT_CONFIG = { priority: '0.5', changefreq: 'monthly' };
const GUIAS_CONFIG = { priority: '0.8', changefreq: 'weekly' };
const WATCH_CONFIG = { priority: '0.4', changefreq: 'monthly' };
// ──────────────────────────────────────────────────────────────────────────────

function getLastMod(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return TODAY;
  }
}

function scanHtmlFiles(dir, baseDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', '.next', 'images', 'videos', 'css', 'js', 'assets', 'admin', 'api', 'app', 'data', 'lib', 'tests', 'scripts', 'public'].includes(entry.name)) {
      results.push(...scanHtmlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (!EXCLUDED.has(rel) && !EXCLUDED.has(entry.name)) {
        results.push({ fullPath, rel });
      }
    }
  }
  return results;
}

function locFor(rel) {
  if (rel === 'index.html') return `${BASE_URL}/`;
  if (rel === 'guias/index.html') return `${BASE_URL}/guias/`;
  return `${BASE_URL}/${rel}`;
}

function configFor(rel) {
  if (PAGE_CONFIG[rel]) return PAGE_CONFIG[rel];
  if (rel.startsWith('guias/')) return GUIAS_CONFIG;
  if (rel.startsWith('watch/')) return WATCH_CONFIG;
  return DEFAULT_CONFIG;
}

function buildUrl({ fullPath, rel }) {
  const loc     = locFor(rel);
  const config  = configFor(rel);
  const lastmod = getLastMod(fullPath);
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${config.changefreq}</changefreq>\n    <priority>${config.priority}</priority>\n  </url>`;
}

function generateSitemap() {
  try {
    const files = scanHtmlFiles(SITE_DIR, SITE_DIR).sort((a, b) => {
      if (a.rel === 'index.html') return -1;
      if (b.rel === 'index.html') return 1;
      const pA = parseFloat(configFor(a.rel).priority);
      const pB = parseFloat(configFor(b.rel).priority);
      return pB - pA;
    });

    const urlEntries = files.map(buildUrl).join('\n\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urlEntries}

</urlset>
`;

    fs.writeFileSync(OUTPUT, xml, 'utf8');
    console.log(`✅ sitemap.xml generado con ${files.length} URLs`);
    console.log(`📄 Guardado en: ${OUTPUT}`);
    console.log('\n🔗 URLs incluidas:');
    files.forEach(({ rel }) => {
      const loc = locFor(rel);
      console.log(`   ${loc}`);
    });
    console.log('\n📋 Próximo paso: Enviar en Google Search Console');
    console.log(`   URL: ${BASE_URL}/sitemap.xml`);
  } catch (err) {
    console.error('❌ Error generando sitemap:', err.message);
    process.exit(1);
  }
}

generateSitemap();
