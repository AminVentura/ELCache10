import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sin acceso | El Cache 10 Admin',
  robots: { index: false, follow: false },
};

export default function SinAccesoPage() {
  // Igual que en app/layout.tsx: sin clave de Clerk no hay ClerkProvider.
  const hasClerk = /^pk_(test|live)_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '');

  return (
    <main className="app-main">
      <h1>Sin acceso al panel</h1>
      <p>Esta cuenta no está autorizada para administrar El Caché 10.</p>
      {hasClerk ? (
        <p>
          <SignOutButton redirectUrl="/sign-in">
            <button type="button">Cerrar sesión y entrar con otra cuenta</button>
          </SignOutButton>
        </p>
      ) : null}
      <p>
        <Link href="/">Volver al sitio público</Link>
      </p>
    </main>
  );
}
