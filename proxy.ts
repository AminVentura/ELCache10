import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildAdminRedirectUrl } from './lib/admin-host.mjs';
import { getAdminAccessForUser } from './lib/admin-auth';

const isProtectedRoute = createRouteMatcher(['/admin', '/admin/(.*)', '/api/admin', '/api/admin/(.*)']);
const isAdminApiRoute = createRouteMatcher(['/api/admin', '/api/admin/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const adminRedirectUrl = buildAdminRedirectUrl(req.url);
  if (adminRedirectUrl) {
    return NextResponse.redirect(adminRedirectUrl);
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      if (isAdminApiRoute(req)) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
      }
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Una sesión de Clerk no basta: el correo primario verificado tiene que estar
    // en ADMIN_ALLOWED_EMAILS. Sin esa variable no entra nadie.
    const access = await getAdminAccessForUser(userId, `proxy ${req.nextUrl.pathname}`);
    if (!access.allowed) {
      if (isAdminApiRoute(req)) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/sin-acceso', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Exclude ads.txt / robots.txt / sitemap.xml so Googlebot does not hit Clerk handshake.
    // /api/staff-photo is machine-to-machine (citas → www) with x-staff-sync-key, not Clerk.
    '/((?!_next|api/staff-photo|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)',
    '/(api(?!/staff-photo)|trpc)(.*)',
  ],
};
