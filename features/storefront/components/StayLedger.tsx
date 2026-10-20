'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { weekday } from '../lib/dates';
import { formatMoney } from '../lib/format';
import { useStorefrontLocale } from './StorefrontLocale';

export type LedgerQuote = {
  currencyCode: string;
  numberOfNights?: number;
  nights?: { date: string; amountCents: number; source?: string }[];
  lodgingSubtotalCents: number;
  fees?: { name: string; amountCents: number }[];
  taxes?: { name: string; amountCents: number }[];
  totalAmountCents: number;
  securityDepositCents?: number;
};

type Night = { date: string; amountCents: number; source?: string };

const STRIP_LIMIT = 10;

/** "10/16 Fri" */
function chipDate(locale: string, iso: string) {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} ${weekday(locale, iso)}`;
}

/** One chip per night, up to five across (Oil UI stay `.night-strip`). */
export function NightStrip({ nights, currencyCode }: { nights: Night[]; currencyCode: string }) {
  const locale = useStorefrontLocale();
  const [expanded, setExpanded] = useState(false);
  const overflow = nights.length > STRIP_LIMIT && !expanded;
  const shown = overflow ? nights.slice(0, STRIP_LIMIT - 1) : nights;
  const style = { '--stay-strip-cols': Math.min(nights.length, 5) } as CSSProperties;
  return (
    <ol className="stay-night-strip" aria-label="Nightly rates" style={style}>
      {shown.map(night => {
        const seasonal = night.source && night.source !== 'Base rate';
        return (
          <li key={night.date} className={`stay-night-chip ${seasonal ? 'is-seasonal' : ''}`}>
            <span>{chipDate(locale, night.date)}</span>
            <b>{formatMoney(locale, night.amountCents, currencyCode)}</b>
            {seasonal ? <span className="stay-visually-hidden">{night.source}</span> : null}
          </li>
        );
      })}
      {overflow ? (
        <li className="stay-night-chip stay-night-more">
          <button type="button" onClick={() => setExpanded(true)}>+{nights.length - shown.length}<span>more nights</span></button>
        </li>
      ) : null}
    </ol>
  );
}

/**
 * Itemized stay price (Oil UI stay `.bill`): nights, fees, taxes and a total
 * from one quote shape. With no quote it keeps its place on the page and says
 * what to choose next, so the price never appears out of nowhere.
 */
export function StayLedger({ quote, provisional = false, totalLabel = 'Total', totalNote, strip = true, emptyHeading = 'Choose dates to see each night’s rate' }: {
  quote: LedgerQuote | null;
  provisional?: boolean;
  totalLabel?: string;
  totalNote?: ReactNode;
  strip?: boolean;
  emptyHeading?: string;
}) {
  const locale = useStorefrontLocale();
  if (!quote) {
    return (
      <div className="stay-ledger is-empty">
        <div className="stay-ledger-head"><span>{emptyHeading}</span></div>
        <div className="stay-ledger-total">
          <div><b>{totalLabel}</b>{totalNote ? <small>{totalNote}</small> : null}</div>
          <strong><span aria-hidden="true">—</span><span className="stay-visually-hidden">Not priced yet</span></strong>
        </div>
      </div>
    );
  }
  const nights = quote.numberOfNights ?? quote.nights?.length ?? 0;
  return (
    <div className="stay-ledger">
      <div className="stay-ledger-head">
        <span>{provisional ? 'Est. · ' : ''}{nights} {nights === 1 ? 'night' : 'nights'}</span>
        <b>{formatMoney(locale, quote.lodgingSubtotalCents, quote.currencyCode)}</b>
      </div>
      {strip && quote.nights?.length ? <NightStrip nights={quote.nights} currencyCode={quote.currencyCode} /> : null}
      {(quote.fees || []).map((fee, index) => (
        <div className="stay-ledger-row" key={`fee-${index}`}><span>{fee.name}</span><span>{formatMoney(locale, fee.amountCents, quote.currencyCode)}</span></div>
      ))}
      {(quote.taxes || []).map((tax, index) => (
        <div className="stay-ledger-row" key={`tax-${index}`}><span>{tax.name}</span><span>{formatMoney(locale, tax.amountCents, quote.currencyCode)}</span></div>
      ))}
      <div className="stay-ledger-total">
        <div><b>{totalLabel}</b>{totalNote ? <small>{totalNote}</small> : null}</div>
        <strong key={quote.totalAmountCents} className="stay-amount-arrive">{formatMoney(locale, quote.totalAmountCents, quote.currencyCode)}</strong>
      </div>
    </div>
  );
}
