import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { AgreementForm } from '../../components/GuestForms';
import { UnavailableStay } from '../../components/Journey';
import { PolicyDetails } from '../../components/QuoteSummary';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getPublicStayAgreement } from '../../lib/data/stays';
import { formatStayDate, formatType } from '../../lib/format';
import { privateToken, tripPath, type SearchParams } from '../../lib/navigation';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function StayAgreementPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const { token } = await params;
  const query = (await searchParams) || {};
  const { agreement, error } = await getPublicStayAgreement(token);
  const tripToken = privateToken(query.trip);
  if (!agreement) return <StorefrontShell servicing activeNav="trips"><UnavailableStay title="This agreement link is unavailable.">{error || 'The link may have expired.'} Open your trip to see your stay’s status, or ask your host to send a new link.</UnavailableStay></StorefrontShell>;
  if (agreement.unavailableReason) {
    const reason = agreement.unavailableReason === 'stay_closed'
      ? 'This stay was cancelled, so its agreement can no longer be signed.'
      : agreement.unavailableReason === 'voided'
        ? 'Your host withdrew this agreement, so it can no longer be signed.'
        : 'Your host issued a new signing link for this agreement. Use the newest link you received.';
    return <StorefrontShell servicing activeNav="trips"><UnavailableStay title={agreement.agreementNumber ? `Agreement ${agreement.agreementNumber} can’t be signed` : 'This agreement link can’t be used'}>
      {reason}{agreement.signedBySetup ? ' Its signature was recorded by setup for a sample stay, not by a guest.' : ''}{agreement.status === 'signed' && agreement.signatureName ? ` It was signed by ${agreement.signatureName}${agreement.signedAt ? ` on ${new Date(agreement.signedAt).toLocaleDateString(locale, { timeZone: 'UTC' })}` : ''}, and that record is kept.` : ''}
      {tripToken ? <> <Link className="stay-text-link" href={tripPath(tripToken, token)}>Return to your trip</Link></> : null}
    </UnavailableStay></StorefrontShell>;
  }
  const terms = agreement.termsSnapshot || {};
  const signed = agreement.status === 'signed' || agreement.signable === false;
  return <StorefrontShell servicing activeNav="trips"><main id="stay-main" className="stay-shell">
    {tripToken ? <nav className="stay-breadcrumb" aria-label="Breadcrumb"><Link href={tripPath(tripToken, token)}><ArrowLeft size={13} aria-hidden="true" /> Back to your trip</Link></nav> : null}
    <header className="stay-page-head">
      <p className="stay-overline">Stay agreement · {agreement.agreementNumber}</p>
      <h1>{agreement.title}</h1>
      <p>Read the terms captured for your booking. Your signature is recorded against this exact version.</p>
    </header>
    {agreement.sample ? <div className="stay-alert stay-alert-warn" role="note"><p>This agreement belongs to a sample stay created by the store’s setup. It isn’t a real booking{agreement.signedBySetup ? ', and the signature on it was recorded by setup, not by a guest' : ''}.</p></div> : null}
    {agreement.simulation ? <div className="stay-alert stay-alert-warn" role="note"><p>Test booking: these terms belong to a simulated stay and aren’t binding.</p></div> : null}
    <div className="stay-agreement-layout">
      <article className="stay-document">
        <h2>Your stay</h2>
        <dl className="stay-facts-list">
          <div><dt>Check-in</dt><dd>{formatStayDate(locale, terms.checkInDate)}</dd></div>
          <div><dt>Checkout</dt><dd>{formatStayDate(locale, terms.checkOutDate)}</dd></div>
          <div><dt>Status</dt><dd>{formatType(agreement.status)}</dd></div>
        </dl>
        <h2>Cancellation terms</h2>
        <PolicyDetails policy={terms.cancellationPolicy} />
        <h2>House rules</h2>
        {terms.houseRules?.length
          ? <ul className="stay-simple-list">{terms.houseRules.map((rule: any, index: number) => <li key={rule.id || index}><strong>{rule.title}</strong>{rule.description ? ` — ${rule.description}` : ''}</li>)}</ul>
          : <p className="stay-muted">No house rules were captured in this agreement. Ask the host about anything unclear before signing.</p>}
        <h2>Questions about the terms?</h2>
        <p className="stay-muted">Contact your host before signing if the dates, rules, or policy need clarification. Signing doesn’t collect a payment or issue entry instructions.</p>
        <Link className="stay-text-link" href="/help">Contact & help</Link>
      </article>
      <aside className="stay-panel stay-signature-card" aria-labelledby="signature-title">
        <h2 id="signature-title">{signed ? 'Signature on record' : 'Ready to sign?'}</h2>
        {signed
          ? agreement.signedBySetup
            ? <div className="stay-signed" role="status"><span>Recorded by setup for a sample stay. No guest signed it.</span></div>
            : <div className="stay-signed" role="status">{agreement.signatureName ? <span className="stay-signature-name">{agreement.signatureName}</span> : <span>Signed.</span>}{agreement.signedAt ? <span>{new Date(agreement.signedAt).toLocaleString(locale, { timeZone: 'UTC' })} UTC</span> : null}</div>
          : <AgreementForm token={token} tripToken={tripToken} />}
        {tripToken
          ? <Link className="stay-text-link" href={tripPath(tripToken, token)}>Return to your trip</Link>
          : <><p className="stay-form-note">This link didn’t include a trip return link. Open your original private trip link to see your reservation.</p><Link className="stay-text-link" href="/trips">Open a private trip</Link></>}
      </aside>
    </div>
  </main></StorefrontShell>;
}
export default StayAgreementPage;
