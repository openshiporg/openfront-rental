/**
 * The storefront's formatting locale. It is passed explicitly to every formatter: server
 * components read it for their request (`getStorefrontLocale`), and client components get the
 * same validated value from the shell's provider (`useStorefrontLocale`), so the server HTML
 * and the first client render always agree. Nothing here is module state.
 */
export const DEFAULT_STOREFRONT_LOCALE = 'en-US';

/** A supported, canonical locale from a saved setting; the default when unset or unsupported. */
export function validStorefrontLocale(value: unknown) {
  if (typeof value !== 'string' || !value) return DEFAULT_STOREFRONT_LOCALE;
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    return canonical && Intl.NumberFormat.supportedLocalesOf(canonical).length && Intl.DateTimeFormat.supportedLocalesOf(canonical).length
      ? canonical : DEFAULT_STOREFRONT_LOCALE;
  } catch {
    return DEFAULT_STOREFRONT_LOCALE;
  }
}
