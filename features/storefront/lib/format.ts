import { currencyMinorUnitDigits, minorToMajorUnits } from '@/features/platform/operations/lib/currency-units';

// Amounts are stored in each currency's minor units (cents, yen, fils), not always hundredths.
function moneyParts(amount: number | null | undefined, currency: string) {
  const minor = amount || 0;
  const digits = currencyMinorUnitDigits(currency);
  const whole = minor % 10 ** digits === 0;
  return { value: minorToMajorUnits(minor, currency), minimumFractionDigits: whole ? 0 : digits, maximumFractionDigits: digits };
}

export function formatMoney(locale: string, amount?: number | null, currency = 'USD') {
  const { value, minimumFractionDigits, maximumFractionDigits } = moneyParts(amount, currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits, maximumFractionDigits }).format(value);
}

export function formatMoneyExact(locale: string, amount?: number | null, currency = 'USD') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minorToMajorUnits(amount || 0, currency));
}

/** Headline price split into its currency symbol and amount: { symbol: '$', amount: '325' }. */
export function formatMoneyParts(locale: string, amount?: number | null, currency = 'USD') {
  const { value, minimumFractionDigits, maximumFractionDigits } = moneyParts(amount, currency);
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits, maximumFractionDigits }).formatToParts(value);
  return {
    symbol: parts.filter(part => part.type === 'currency').map(part => part.value).join(''),
    amount: parts.filter(part => part.type !== 'currency' && part.type !== 'literal').map(part => part.value).join(''),
  };
}

/** Calendar cells: "$325", "$1.2K". */
export function formatMoneyCompact(locale: string, amount?: number | null, currency = 'USD') {
  const value = minorToMajorUnits(amount || 0, currency);
  return new Intl.NumberFormat(locale, value >= 1000
    ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }
    : { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function formatRating(hundredths?: number | null) {
  return typeof hundredths === 'number' && hundredths > 0 ? (hundredths / 100).toFixed(2) : null;
}

export function formatGuestParty({ adults = 0, children = 0, infants = 0, pets = 0 }: { adults?: number; children?: number; infants?: number; pets?: number }) {
  const parts = [`${adults} ${adults === 1 ? 'adult' : 'adults'}`];
  if (children) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`);
  if (infants) parts.push(`${infants} ${infants === 1 ? 'infant' : 'infants'}`);
  if (pets) parts.push(`${pets} ${pets === 1 ? 'pet' : 'pets'}`);
  return parts.join(' · ');
}

export function formatBaths(halfUnits?: number | null) {
  if (halfUnits == null) return null;
  const baths = halfUnits / 2;
  return `${baths} ${baths === 1 ? 'bath' : 'baths'}`;
}

export function formatType(value?: string | null) {
  const label = (value || 'stay').replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatHomeCount(count: number) {
  return `${count} ${count === 1 ? 'home' : 'homes'}`;
}

export function formatStayDate(locale: string, value?: string | null) {
  if (!value) return 'To be confirmed';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
}
