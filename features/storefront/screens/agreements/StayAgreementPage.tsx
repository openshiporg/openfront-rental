import Link from 'next/link';
import { StorefrontShell } from '../../components/StorefrontShell';
import { UnavailableStay } from '../../components/Journey';
import { AgreementForm } from '../../components/GuestForms';
import { PolicyDetails } from '../../components/QuoteSummary';
import { getPublicStayAgreement } from '../../lib/data/stays';
import { formatStayDate, formatType } from '../../lib/format';
import { privateToken, tripPath, type SearchParams } from '../../lib/navigation';

export async function StayAgreementPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<SearchParams> }) {
  const { token } = await params;
  const query = (await searchParams) || {};
  const { agreement, error } = await getPublicStayAgreement(token);
  const tripToken = privateToken(query.trip);
  if (!agreement) return <StorefrontShell activeNav="trips"><UnavailableStay title="This agreement link is unavailable.">{error || 'The link may be expired or revoked.'} Link renewal is not available online. Contact support with your booking reference.</UnavailableStay></StorefrontShell>;
  const terms = agreement.termsSnapshot || {};
  const signed = agreement.status === 'signed';
  return <StorefrontShell activeNav="trips"><main id="stay-main" className="stay-shell stay-agreement-page"><header className="stay-page-head"><p className="stay-overline">Stay agreement · {agreement.agreementNumber}</p><h1>{agreement.title}</h1><p>Read the terms captured for your booking. Your signature is recorded against this version.</p></header>
    <div className="stay-agreement-layout"><article className="stay-terms"><h2>Your stay</h2><dl className="stay-trip-facts"><div><dt>Check in</dt><dd>{formatStayDate(terms.checkInDate)}</dd></div><div><dt>Check out</dt><dd>{formatStayDate(terms.checkOutDate)}</dd></div><div><dt>Status</dt><dd>{formatType(agreement.status)}</dd></div></dl><h2>Cancellation terms</h2><PolicyDetails policy={terms.cancellationPolicy} /><h2>House rules</h2>{terms.houseRules?.length ? <ul className="stay-simple-list">{terms.houseRules.map((rule: any, index: number) => <li key={rule.id || index}><strong>{rule.title}</strong>{rule.description ? ` — ${rule.description}` : ''}</li>)}</ul> : <p>No house rules were captured in this agreement. Ask the host about anything unclear before signing.</p>}<h2>Questions about the terms?</h2><p>Contact your host before signing if the dates, rules, or policy need clarification. Signing does not collect a payment or issue entry instructions.</p><Link className="stay-text-link" href="/help">Contact & help ↗</Link></article>
    <aside className="stay-agreement-signature"><h2>{signed ? 'Signature on record.' : 'Ready to sign?'}</h2>{signed ? <div className="stay-success" role="status"><p>Signed{agreement.signatureName ? ` by ${agreement.signatureName}` : ''}.</p>{agreement.signedAt ? <p>{new Date(agreement.signedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p> : null}</div> : <AgreementForm token={token} tripToken={tripToken} />}{tripToken ? <Link className="stay-text-link" href={tripPath(tripToken, token)}>← Return to your trip</Link> : <><p className="stay-form-note">This link did not include a trip return link. Open your original private trip link to see your reservation.</p><Link href="/trips">Open a private trip</Link></>}</aside></div>
  </main></StorefrontShell>;
}
export default StayAgreementPage;
