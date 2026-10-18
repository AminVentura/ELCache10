import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'El Cache 10 Barbershop Bronx NY',
  description: 'Dominican barbershop, nail services and La Nacional money transfers in the Bronx.',
};

// Mismo bloque que va inline en el <head> de los HTML estáticos (tests/consent-order.test.mjs lo comprueba).
const CONSENT_DEFAULT_JS =
  "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;" +
  "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});" +
  "gtag('set','ads_data_redaction',true);window.bsConsentDefault=true;";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const hasValidClerkKey = /^pk_(test|live)_/.test(publishableKey);

  return (
    <html lang="en">
      <head>
        {/* Consent Mode v2: denegado por defecto ANTES de cualquier script de Google (AdSense va en el head de la portada). */}
        <script id="bs-consent-default" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_JS }} />
      </head>
      <body>
        {hasValidClerkKey ? (
          <ClerkProvider signInUrl="/sign-in" signInFallbackRedirectUrl="/admin">
            {children}
          </ClerkProvider>
        ) : children}
      </body>
    </html>
  );
}
