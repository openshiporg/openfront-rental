import { formatMoney } from '@/features/platform/operations/lib/operations';

export type CurrencyTotal = { currencyCode: string; cents: number };

/** Money summed per currency; amounts in different currencies are never added together. */
export function moneyByCurrency(rows: Array<{ currencyCode?: string | null; cents: number }>): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.cents) continue;
    const currency = (row.currencyCode || '').toUpperCase();
    totals.set(currency, (totals.get(currency) || 0) + row.cents);
  }
  return [...totals.entries()].filter(([, cents]) => cents !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([currencyCode, cents]) => ({ currencyCode, cents }));
}

/** One amount per currency, e.g. "$120 · €80"; `empty` when every total is zero. */
export function formatCurrencyTotals(totals: CurrencyTotal[], empty: string) {
  return totals.length ? totals.map((total) => formatMoney(total.cents, total.currencyCode)).join(' · ') : empty;
}
