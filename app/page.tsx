import fs from 'node:fs/promises';
import path from 'node:path';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import type { Metadata } from 'next';
import { injectPublicOffersHtml, injectPublicServicesHtml, injectPublicTeamHtml, renderPublicOffersHtml, renderPublicTeamHtml } from '../lib/static-data.mjs';

const ADSENSE_ACCOUNT = 'ca-pub-8721021745606812';

export const metadata: Metadata = {
  title: 'El Cache 10 Barbershop Bronx NY | Dominican Barber Shop & Nail Services',
  description:
    'Dominican barbershop in the Bronx offering haircuts, fades, nail services and La Nacional money transfers.',
  alternates: {
    canonical: 'https://elcache10.com/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  other: {
    'google-adsense-account': ADSENSE_ACCOUNT,
  },
};

function extractBody(html: string) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match?.[1] || html).replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

function extractJsonLd(html: string) {
  const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  return match?.[1]?.trim() || '';
}

async function readLiveJson(filename: string) {
  const rawUrl = `https://raw.githubusercontent.com/AminVentura/ELCache10/main/data/${filename}`;
  try {
    const response = await fetch(`${rawUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) return response.json();
  } catch {
    // Fallback below keeps the public page visible if GitHub raw is temporarily unavailable.
  }

  const fallback = await fs.readFile(path.join(process.cwd(), 'data', filename), 'utf8');
  return JSON.parse(fallback);
}

export default async function Page() {
  const headersList = await headers();
  const host = headersList.get('host')?.split(':')[0];
  if (host === 'admin.elcache10.com') {
    redirect('/admin');
  }

  const html = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf8');
  const [offersDoc, servicesDoc] = await Promise.all([
    readLiveJson('ofertas.json'),
    readLiveJson('servicios.json'),
  ]);
  let teamHtml = '';
  try {
    const roster = await fetch(`https://citas.elcache10.com/api/staff?v=${Date.now()}`, { cache: 'no-store' });
    if (roster.ok) {
      const rosterJson = (await roster.json()) as { staff?: unknown[] };
      teamHtml = renderPublicTeamHtml(rosterJson.staff);
    }
  } catch {
    teamHtml = '';
  }
  const offersHtml = renderPublicOffersHtml(offersDoc);
  const body = injectPublicTeamHtml(
    injectPublicServicesHtml(injectPublicOffersHtml(extractBody(html), offersHtml), servicesDoc),
    teamHtml
  );
  const jsonLd = extractJsonLd(html);

  return (
    <>
      <link rel="stylesheet" href="/css/style.css" />
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ACCOUNT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script src="/js/main.js" strategy="afterInteractive" />
      <Script src="/js/cachebot-widget.js" strategy="afterInteractive" />
    </>
  );
}
