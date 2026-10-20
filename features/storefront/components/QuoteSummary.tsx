import { ShieldCheck } from 'lucide-react';

import { formatMoney } from '../lib/format';
import { StayLedger } from './StayLedger';

export function PolicyDetails({ policy }: { policy: any }) {
  return (
    <div className="stay-policy">
      {policy?.name ? <p className="stay-policy-name">{policy.name}</p> : null}
      <p>{policy?.summary || 'A detailed cancellation policy is not available here. Contact support before making a commitment.'}</p>
      {policy?.fullTerms ? <details className="stay-disclosure"><summary>Full cancellation terms</summary><p className="stay-long-copy">{policy.fullTerms}</p></details> : null}
    </div>
  );
}

export function QuoteSummary({ quote, locale }: { quote: any; locale: string }) {
  const breakdown = quote.breakdown || {};
  return (
    <>
      <StayLedger
        quote={{
          currencyCode: quote.currencyCode,
          numberOfNights: breakdown.numberOfNights,
          nights: breakdown.nights || [],
          lodgingSubtotalCents: quote.lodgingSubtotalCents,
          fees: breakdown.fees || [],
          taxes: breakdown.taxes || [],
          totalAmountCents: quote.totalAmountCents,
        }}
        totalLabel="Stay total"
        totalNote={`${quote.currencyCode} · fees & taxes included`}
      />
      <div className="stay-deposit-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>
          <strong>Security deposit · separate</strong>
          {quote.securityDepositCents > 0
            ? `${formatMoney(locale, quote.securityDepositCents, quote.currencyCode)} is required in addition to the stay total. Collection, any deductions, and return are arranged with the host.`
            : 'No separate security deposit is included in this quote.'}
        </p>
      </div>
    </>
  );
}
