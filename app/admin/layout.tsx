import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin El Cache 10',
  description: 'Panel administrativo privado de El Cache 10.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link className="app-brand" href="/admin">
          El Cache 10 Admin
        </Link>
        <nav className="app-nav" aria-label="Admin account">
          <Link href="/">Public site</Link>
          <Show when="signed-out">
            <SignInButton forceRedirectUrl="/admin" />
            <SignUpButton forceRedirectUrl="/admin" />
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
