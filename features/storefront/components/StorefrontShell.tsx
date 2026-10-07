import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { StorefrontNavigation } from './StorefrontNavigation';
import { phoneHref, resolveStorefrontBrand } from '../lib/brand';
import { getPublicMarketplaceSettings, type PublicMarketplaceSettingsState } from '../lib/data/marketplace';

type StorefrontStyle = CSSProperties & { '--stay-brand-hue': number };

const unavailableCopy = {
  unconfigured: {
    title: 'Storefront not configured',
    description: 'The host has not configured a public storefront identity yet.',
  },
  unpublished: {
    title: 'Storefront unavailable',
    description: 'This storefront is not currently published.',
  },
  error: {
    title: 'Storefront temporarily unavailable',
    description: 'Storefront settings could not be loaded. Please try again later.',
  },
} as const;

export function StorefrontUnavailable({ status }: { status: Exclude<PublicMarketplaceSettingsState['status'], 'published'> }) {
  const copy = unavailableCopy[status];
  return (
    <div className="stay-root stay-root-unavailable">
      <main id="stay-main" className="stay-shell stay-token-page" aria-labelledby="storefront-status-title">
        <p className="stay-overline">Independent accommodation marketplace</p>
        <h1 id="storefront-status-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </main>
    </div>
  );
}

export async function StorefrontShell({
  children,
  activeNav = 'none',
}: {
  children: ReactNode;
  activeNav?: 'home' | 'search' | 'collections' | 'trips' | 'help' | 'none';
}) {
  const settings = await getPublicMarketplaceSettings();
  const brand = resolveStorefrontBrand(settings);
  if (!brand) {
    const status = settings.status === 'published' ? 'error' : settings.status;
    return <StorefrontUnavailable status={status} />;
  }

  const contactPhone = phoneHref(brand.phone);
  const style: StorefrontStyle = { '--stay-brand-hue': brand.accentHue };
  return (
    <div className="stay-root" style={style}>
      <a className="stay-skip-link" href="#stay-main">Skip to content</a>
      <header className="stay-nav stay-shell">
        <Link href="/" className="stay-wordmark" aria-label={`${brand.name} home`}>{brand.name}</Link>
        <StorefrontNavigation active={activeNav} />
      </header>
      {children}
      <footer className="stay-footer">
        <div className="stay-shell stay-footer-inner">
          <div>
            <div className="stay-footer-wordmark">{brand.name}</div>
            {brand.tagline ? <p>{brand.tagline}</p> : null}
          </div>
          <div className="stay-footer-links">
            <Link href="/search">Browse homes</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/trips">Your trip</Link>
            <Link href="/help">Help & contact</Link>
            <Link href="/policies">Booking & policies</Link>
            {contactPhone ? <a href={contactPhone}>{brand.phone}</a> : null}
            {brand.email ? <a href={`mailto:${brand.email}`}>{brand.email}</a> : null}
          </div>
        </div>
        <div className="stay-shell stay-footer-meta">
          <span>Independent homes. A direct connection to your host.</span>
          <Link href="/dashboard/signin">Host workspace</Link>
          <span>© {new Date().getFullYear()} {brand.name}</span>
        </div>
      </footer>
    </div>
  );
}
