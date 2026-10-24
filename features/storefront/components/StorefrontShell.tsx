import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { StoreLogoMark } from '@/features/platform/store-settings/components/StoreLogoMark';

import { StorefrontLocaleProvider } from './StorefrontLocale';
import { StorefrontNavigation } from './StorefrontNavigation';
import { phoneHref, resolveStorefrontBrand } from '../lib/brand';
import { getPublicMarketplaceSettings, type PublicMarketplaceSettingsState } from '../lib/data/marketplace';
import { storefrontFontClass } from '../lib/fonts';
import { DEFAULT_STOREFRONT_LOCALE, validStorefrontLocale } from '../lib/locale';
import '../styles/booking.css';

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
    <div className={`stay-root stay-root-unavailable ${storefrontFontClass}`}>
      <main id="stay-main" className="stay-shell stay-state-page" aria-labelledby="storefront-status-title">
        <div className="stay-state-card">
          <p className="stay-overline">Independent accommodation</p>
          <h1 id="storefront-status-title">{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </main>
    </div>
  );
}

/**
 * Existing guests' private pages (trips, agreements, messages, account) stay usable while
 * the storefront's public identity is unpublished or can't load. Only the catalogue is
 * paused; this shell shows no merchant branding and no browsing links.
 */
function PrivateServiceShell({ children, activeNav }: { children: ReactNode; activeNav: string }) {
  const links = [
    { href: '/trips', label: 'Your trip', key: 'trips' },
    { href: '/account', label: 'Account', key: 'account' },
    { href: '/help', label: 'Help', key: 'help' },
  ];
  return (
    <div className={`stay-root ${storefrontFontClass}`}>
      <a className="stay-skip-link" href="#stay-main">Skip to content</a>
      <header className="stay-header">
        <div className="stay-shell stay-header-inner">
          <span className="stay-wordmark">Your stay</span>
          <nav aria-label="Your booking" className="stay-actions">
            {links.map((link) => <Link key={link.key} href={link.href} aria-current={activeNav === link.key ? 'page' : undefined}>{link.label}</Link>)}
          </nav>
        </div>
      </header>
      <div className="stay-shell"><p className="stay-form-note" role="note">Browsing and new bookings are paused. Your existing booking, account and messages are still available here.</p></div>
      {/* Unpublished: no store locale is public, so private service pages use the stated default. */}
      <StorefrontLocaleProvider locale={DEFAULT_STOREFRONT_LOCALE}>{children}</StorefrontLocaleProvider>
    </div>
  );
}

/** An email that wraps after the @ on narrow screens instead of mid-word. */
function EmailText({ email }: { email: string }) {
  const at = email.lastIndexOf('@');
  return at > 0 ? <span>{email.slice(0, at)}@<wbr />{email.slice(at + 1)}</span> : <span>{email}</span>;
}

export async function StorefrontShell({
  children,
  activeNav = 'none',
  servicing = false,
}: {
  children: ReactNode;
  activeNav?: 'home' | 'search' | 'collections' | 'trips' | 'help' | 'account' | 'none';
  /** Private guest servicing pages that must work even when the catalogue is unpublished. */
  servicing?: boolean;
}) {
  const settings = await getPublicMarketplaceSettings();
  const brand = resolveStorefrontBrand(settings);
  if (!brand) {
    if (servicing) return <PrivateServiceShell activeNav={activeNav}>{children}</PrivateServiceShell>;
    const status = settings.status === 'published' ? 'error' : settings.status;
    return <StorefrontUnavailable status={status} />;
  }

  const contactPhone = phoneHref(brand.phone);
  const style: StorefrontStyle = { '--stay-brand-hue': brand.accentHue };
  const mark = <StoreLogoMark logoIcon={brand.logoIcon} logoColor={brand.logoColor} className="stay-wordmark-mark" />;
  return (
    <div className={`stay-root ${storefrontFontClass}`} style={style}>
      <a className="stay-skip-link" href="#stay-main">Skip to content</a>
      <header className="stay-header">
        <div className="stay-shell stay-header-inner">
          <Link href="/" className="stay-wordmark" aria-label={`${brand.name} home`}>
            {mark}
            {brand.name}
          </Link>
          <StorefrontNavigation active={activeNav} brandName={brand.name} brandMark={mark} tagline={brand.tagline} />
        </div>
      </header>
      <StorefrontLocaleProvider locale={validStorefrontLocale(brand.locale)}>{children}</StorefrontLocaleProvider>
      <footer className="stay-footer">
        <div className="stay-shell">
          <div className="stay-footer-top">
            <div className="stay-footer-brand">
              <p className="stay-footer-wordmark">{mark}{brand.name}</p>
              {brand.tagline ? <p>{brand.tagline}</p> : null}
            </div>
            <nav className="stay-footer-col" aria-label="Stays">
              <p className="stay-footer-head">Stay</p>
              <Link href="/search">Browse homes</Link>
              <Link href="/collections">Collections</Link>
              <Link href="/compare">Compare homes</Link>
            </nav>
            <nav className="stay-footer-col" aria-label="Your booking">
              <p className="stay-footer-head">Your booking</p>
              <Link href="/trips">Open your trip</Link>
              <Link href="/account">Your account</Link>
              <Link href="/policies">Booking & policies</Link>
              <Link href="/help">Help & contact</Link>
            </nav>
            <div className="stay-footer-col">
              <p className="stay-footer-head">Talk to us</p>
              {contactPhone ? <a href={contactPhone}>{brand.phone}</a> : null}
              {brand.email ? <a href={`mailto:${brand.email}`}><EmailText email={brand.email} /></a> : null}
              <Link href="/help#message-host">Message the host</Link>
            </div>
          </div>
          <div className="stay-footer-meta">
            <span>© {new Date().getFullYear()} {brand.name} · Independent homes, booked directly with the host.</span>
            <Link href="/dashboard/signin">Host workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
