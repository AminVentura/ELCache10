import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
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
        {hasValidClerkKey ? (
          <ClerkProvider signInUrl="/sign-in" signInFallbackRedirectUrl="/admin">
            {children}
          </ClerkProvider>
        ) : children}
      </body>
    </html>
  );
}
