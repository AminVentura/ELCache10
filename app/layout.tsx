import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'El Cache 10 Barbershop Bronx NY',
  description: 'Dominican barbershop, nail services and La Nacional money transfers in the Bronx.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const hasValidClerkKey = /^pk_(test|live)_/.test(publishableKey);

  return (
    <html lang="en">
      <body>
        <Script id="bs-consent-default" strategy="beforeInteractive">{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=window.gtag||gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
gtag('set','ads_data_redaction',true);
`}</Script>
        {hasValidClerkKey ? (
          <ClerkProvider signInUrl="/sign-in" signInFallbackRedirectUrl="/admin">
            {children}
          </ClerkProvider>
        ) : children}
      </body>
    </html>
  );
}
