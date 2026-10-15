import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import PanelPwa from './PanelPwa';

export const metadata: Metadata = {
  title: 'Admin El Cache 10',
  description: 'Panel administrativo privado de El Cache 10.',
  robots: {
    index: false,
    follow: false,
  },
  // PWA solo del panel (2026-10-15): la web pública no enlaza este manifiesto.
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Caché Admin', statusBarStyle: 'black' },
  icons: { apple: '/images/admin-pwa/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#070707' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PanelPwa />
      <header className="app-header">
        <Link className="app-brand" href="/admin">
          El Cache 10 Admin
        </Link>
        <nav className="app-nav" aria-label="Admin account">
          <Link href="/">Public site</Link>
          <Show when="signed-out">
            <SignInButton forceRedirectUrl="/admin" />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </header>
      {children}
    </>
  );
}
