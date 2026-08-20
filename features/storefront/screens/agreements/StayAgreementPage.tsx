import Link from 'next/link';

import { StorefrontShell } from '../../components/StorefrontShell';
import { signStayAgreementAction } from '../../lib/data/stay-actions';
import { getPublicStayAgreement } from '../../lib/data/stays';

export async function StayAgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ trip?: string; error?: string; signed?: string }>;
}) {
  const { token } = await params;
  const query = (await searchParams) || {};
  const { agreement, error } = await getPublicStayAgreement(token);
  if (!agreement) return <StorefrontShell><main className="stay-shell stay-token-page"><h1>This agreement link is unavailable.</h1><p>{error || 'The link may be expired or revoked.'}</p></main></StorefrontShell>;
  const terms = agreement.termsSnapshot || {};
  return (
    <StorefrontShell>
      <main className="stay-shell stay-agreement-page">
        <header className="stay-page-head"><p className="stay-overline">{agreement.agreementNumber}</p><h1>{agreement.title}</h1><p>Read the captured house rules and cancellation terms before signing.</p></header>
        {query.error ? <div className="stay-form-error" role="alert">{query.error}</div> : null}
        {query.signed || agreement.status === 'signed' ? <div className="stay-success">Signed{agreement.signatureName ? ` by ${agreement.signatureName}` : ''}.</div> : null}
        <article className="stay-terms">
          <h2>Stay terms</h2>
          <p>{terms.cancellationPolicy?.summary || 'Cancellation terms were captured with this agreement.'}</p>
          <h2>House rules</h2>
          <ul className="stay-simple-list">{(terms.houseRules || []).map((rule: any, index: number) => <li key={rule.id || index}><strong>{rule.title}</strong>{rule.description ? ` — ${rule.description}` : ''}</li>)}</ul>
          <p>Check in {terms.checkInDate}; check out {terms.checkOutDate}.</p>
        </article>
        {agreement.status !== 'signed' ? <form action={signStayAgreementAction} className="stay-sign-form"><input type="hidden" name="agreementToken" value={token} /><input type="hidden" name="tripToken" value={query.trip || ''} /><label>Type your full name<input required name="signatureName" autoComplete="name" /></label><button type="submit">Sign stay agreement</button></form> : null}
        {query.trip ? <Link className="stay-action-link" href={`/trips/${query.trip}`}>Return to trip</Link> : null}
      </main>
    </StorefrontShell>
  );
}

export default StayAgreementPage;
