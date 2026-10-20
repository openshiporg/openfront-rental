// Ported from Openfront Restaurant `features/lib/currency-units.ts`: stored money is integer minor
// units at each currency's ISO 4217 scale (JPY 0 digits, USD 2, KWD 3), never a fixed 100.

/** ISO 4217 minor-unit digits supplied by the runtime's internationalization data. */
export function currencyMinorUnitDigits(currencyCode = 'USD'): number {
  const code = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error(`Invalid currency code: ${currencyCode}`);
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }
}

export function currencyMinorUnitScale(currencyCode = 'USD'): number {
  return 10 ** currencyMinorUnitDigits(currencyCode);
}

/** Digits for a stored code, or null when the code isn't a usable ISO currency. */
export function safeMinorUnitDigits(currencyCode?: string | null): number | null {
  try {
    return currencyMinorUnitDigits(currencyCode || '');
  } catch {
    return null;
  }
}

export function majorToMinorUnits(value: number | string, currencyCode = 'USD'): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * currencyMinorUnitScale(currencyCode));
}

export function minorToMajorUnits(value: number | string, currencyCode = 'USD'): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return parsed / currencyMinorUnitScale(currencyCode);
}

/**
 * Exact decimal text → minor units without floating-point rounding ("10.25" USD → 1025,
 * "1000" JPY → 1000). Null when the text has more decimals than the currency allows.
 */
export function decimalTextToMinorUnits(text: string, digits: number): number | null {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text.trim());
  if (!match) return null;
  const fraction = match[2] || '';
  if (fraction.length > digits) return null;
  const minor = Number(`${match[1]}${fraction.padEnd(digits, '0')}`);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units → plain decimal text at the currency's scale (1025 USD → "10.25"). */
export function minorUnitsToDecimalText(minor: number, digits: number): string {
  const sign = minor < 0 ? '-' : '';
  const text = String(Math.abs(Math.trunc(minor))).padStart(digits + 1, '0');
  return digits ? `${sign}${text.slice(0, -digits)}.${text.slice(-digits)}` : `${sign}${text}`;
}
