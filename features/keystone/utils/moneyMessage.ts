import { minorToMajorUnits } from '../../platform/operations/lib/currency-units';

/** Plain money text for server messages (guest-facing copy formats with the store locale). */
export function formatCentsForMessage(minorUnits: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode || 'USD' }).format(minorToMajorUnits(minorUnits, currencyCode || 'USD'));
  } catch {
    return `${minorUnits} ${currencyCode} (minor units)`;
  }
}
