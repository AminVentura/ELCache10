import type { NextConfig } from 'next';
import { datosBuild } from './lib/version-sitio.mjs';

// Pie con versión y fecha (lib/version-sitio.mjs): una sola fuente para la portada y las páginas .html.
const build = datosBuild();

const isDev = process.env.NODE_ENV !== 'production';

// Orígenes de Clerk: instancia de desarrollo (*.clerk.accounts.dev) y la de
// producción cuando se cree (clerk.elcache10.com / accounts.elcache10.com).
const CLERK = 'https://*.clerk.accounts.dev https://clerk.elcache10.com https://accounts.elcache10.com';
// AdSense: solo se carga tras el consentimiento (js/consent.js).
const ADS =
  'https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://www.googletagservices.com https://fundingchoicesmessages.google.com https://www.google.com';

function contentSecurityPolicy() {
  const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : '', CLERK, 'https://challenges.cloudflare.com', ADS]
    .filter(Boolean)
    .join(' ');
  const connectSrc = [
    "'self'",
    'https://citas.elcache10.com',
    'https://raw.githubusercontent.com',
    CLERK,
    'https://clerk-telemetry.com',
    ADS,
    'https://*.google.com',
    isDev ? 'http://localhost:4488 ws://localhost:* ws://127.0.0.1:*' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Los anuncios traen imágenes de muchos hosts de Google: se permite https en general.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    `connect-src ${connectSrc}`,
    // Mapa de Google (tras consentimiento), marcos de anuncios y el reto anti-bots de Clerk.
    "frame-src 'self' https://maps.google.com https://www.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    isDev ? '' : 'upgrade-insecure-requests',
  ];
  return directives.filter(Boolean).join('; ');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: build.version,
    NEXT_PUBLIC_BUILD_DATE: build.fecha,
  },
  async redirects() {
    // Sin registro abierto: /sign-up ya no existe y manda al inicio de sesión.
    return [
      { source: '/sign-up', destination: '/sign-in', permanent: false },
      { source: '/sign-up/:path*', destination: '/sign-in', permanent: false },
      // www → dominio principal. En Vercel también lo hace vercel.json; aquí para que valga en Firebase App Hosting.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.elcache10.com' }],
        destination: 'https://elcache10.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
