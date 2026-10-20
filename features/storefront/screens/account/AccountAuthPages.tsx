import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RegisterForm, ResetPasswordForm, ResetRequestForm, SignInForm } from '../../components/AccountForms';
import { StorefrontShell } from '../../components/StorefrontShell';
import { safeAccountNext } from '../../lib/account-navigation';
import { LegalLinks, legalDocuments } from '../../components/LegalLinks';
import { getGuestAccount, getPasswordResetAvailable } from '../../lib/data/guest';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { single, type SearchParams } from '../../lib/navigation';

function AuthLayout({ overline, title, children, aside }: { overline: string; title: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return <StorefrontShell servicing activeNav="account"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head"><p className="stay-overline">{overline}</p><h1>{title}</h1></header>
    <div className="stay-entry-layout">
      <section className="stay-entry-card">{children}</section>
      {aside ? <section className="stay-entry-notes">{aside}</section> : null}
    </div>
  </main></StorefrontShell>;
}

export async function SignInPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const query = (await searchParams) || {};
  const next = safeAccountNext(single(query.next));
  const { account } = await getGuestAccount();
  if (account) redirect(next);
  return <AuthLayout overline="Your account" title={<>Sign <em>in</em></>} aside={<>
    <div><div><h3>New here?</h3><p>Create an account to keep your trips together.</p><Link className="stay-text-link" href={`/account/register?next=${encodeURIComponent(next)}`}>Create an account</Link></div></div>
    <div><div><h3>Forgot your password?</h3><Link className="stay-text-link" href={`/account/reset?next=${encodeURIComponent(next)}`}>Reset it</Link></div></div>
    <div><div><h3>Booked as a guest?</h3><p>Find your trip with its confirmation code and booking email.</p><Link className="stay-text-link" href="/trips#find-trip">Find my trip</Link></div></div>
  </>}>
    {query.created ? <div className="stay-alert stay-alert-ok" role="status"><p>Your account is ready. Sign in to continue.</p></div> : null}
    {query.reset ? <div className="stay-alert stay-alert-ok" role="status"><p>Your password is updated. Sign in with the new password.</p></div> : null}
    <SignInForm next={next} />
  </AuthLayout>;
}

export async function RegisterPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const query = (await searchParams) || {};
  const next = safeAccountNext(single(query.next));
  const { account } = await getGuestAccount();
  if (account) redirect(next);
  const settings = await getPublicMarketplaceSettings();
  const documents = legalDocuments(settings.status === 'published' ? settings : null);
  return <AuthLayout overline="Your account" title={<>Create your <em>account</em></>} aside={<>
    <div><div><h3>Already have an account?</h3><Link className="stay-text-link" href={`/account/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link></div></div>
    <div><div><h3>Booked before?</h3><p>After you join, add earlier trips from your account with their confirmation code and booking email.</p></div></div>
  </>}>
    <RegisterForm next={next} {...documents} />
    <LegalLinks context="account" {...documents} />
  </AuthLayout>;
}

export async function ResetPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const query = (await searchParams) || {};
  const token = single(query.token).slice(0, 200);
  const next = safeAccountNext(single(query.next), '');
  if (token) {
    return <AuthLayout overline="Your account" title={<>Choose a new <em>password</em></>} aside={<>
      <div><div><h3>Link expired?</h3><p>Reset links work for a short time.</p><Link className="stay-text-link" href="/account/reset">Request a new link</Link></div></div>
      <div><div><h3>Remembered it?</h3><Link className="stay-text-link" href="/account/sign-in">Sign in</Link></div></div>
    </>}>
      <ResetPasswordForm token={token} email={single(query.email).slice(0, 320)} />
    </AuthLayout>;
  }
  const available = await getPasswordResetAvailable();
  return <AuthLayout overline="Your account" title={<>Reset your <em>password</em></>} aside={<>
    <div><div><h3>Need your trip now?</h3><p>Your confirmation code and booking email open it without signing in.</p><Link className="stay-text-link" href="/trips#find-trip">Find my trip</Link></div></div>
  </>}>
    {available
      ? <ResetRequestForm next={next} />
      : <div className="stay-alert stay-alert-warn" role="status"><p>Password reset by email isn’t available for this store yet. Use Find my trip with your confirmation code and booking email, or <Link href="/help#message-host">message the host</Link>.</p></div>}
  </AuthLayout>;
}
