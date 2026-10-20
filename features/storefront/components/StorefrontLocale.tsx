'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { DEFAULT_STOREFRONT_LOCALE, validStorefrontLocale } from '../lib/locale';

const StorefrontLocaleContext = createContext(DEFAULT_STOREFRONT_LOCALE);

/** Gives client components the locale the server rendered with, for identical hydration. */
export function StorefrontLocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <StorefrontLocaleContext.Provider value={validStorefrontLocale(locale)}>{children}</StorefrontLocaleContext.Provider>;
}

export function useStorefrontLocale() {
  return useContext(StorefrontLocaleContext);
}
