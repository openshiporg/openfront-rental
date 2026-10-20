'use client';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { useActionState } from 'react';

import {
  changeGuestPasswordAction,
  updateGuestProfileAction,
  registerGuestAction,
  requestGuestPasswordResetAction,
  resetGuestPasswordAction,
  signInGuestAction,
  type AccountFormState,
} from '../lib/data/account-actions';
import { LegalDocumentAnchor, type LegalDocumentLink } from './LegalLinks';
import { SubmitButton } from './SubmitButton';

const initial: AccountFormState = { error: '' };

function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="stay-alert stay-alert-danger" role="alert"><AlertTriangle size={16} aria-hidden="true" /><p>{error}</p></div>;
  if (success) return <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>{success}</p></div>;
  return null;
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInGuestAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="next" value={next} />
    <Notice error={state.error} />
    <label className="stay-input">Email address<input required name="email" type="email" maxLength={320} autoComplete="email" inputMode="email" defaultValue={state.email || ''} /></label>
    <label className="stay-input">Password<input required name="password" type="password" maxLength={200} autoComplete="current-password" /></label>
    <SubmitButton pendingLabel="Signing in…" block>Sign in<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}

export function RegisterForm({ next, termsOfUse = null, privacyPolicy = null }: { next: string; termsOfUse?: LegalDocumentLink | null; privacyPolicy?: LegalDocumentLink | null }) {
  const [state, action, pending] = useActionState(registerGuestAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="next" value={next} />
    {termsOfUse ? <input type="hidden" name="termsVersion" value={termsOfUse.version} /> : null}
    {privacyPolicy ? <input type="hidden" name="privacyNoticeVersion" value={privacyPolicy.version} /> : null}
    <Notice error={state.error} />
    <label className="stay-input">Full name<input required name="name" maxLength={200} autoComplete="name" defaultValue={state.name || ''} /></label>
    <label className="stay-input">Email address<input required name="email" type="email" maxLength={320} autoComplete="email" inputMode="email" defaultValue={state.email || ''} /></label>
    <div className="stay-form-grid">
      <label className="stay-input">Password<input required name="password" type="password" minLength={10} maxLength={200} autoComplete="new-password" /><span className="stay-input-hint">At least 10 characters.</span></label>
      <label className="stay-input">Confirm password<input required name="confirmPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" /></label>
    </div>
    {termsOfUse ? <label className="stay-check"><input type="checkbox" name="termsConsent" required /><span>I agree to the store’s <LegalDocumentAnchor document={termsOfUse} label={`Terms of use (version ${termsOfUse.version})`} />.</span></label> : null}
    {privacyPolicy ? <p className="stay-form-note">Your account details are handled as described in the store’s <LegalDocumentAnchor document={privacyPolicy} label={`Privacy policy (version ${privacyPolicy.version})`} />. This is a notice; creating an account doesn’t sign you up for marketing.</p> : null}
    <SubmitButton pendingLabel="Creating your account…" block>Create account<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
    <p className="stay-form-note">A guest account keeps your trips in one place. It doesn’t give access to the host workspace.</p>
  </form>;
}

export function ResetRequestForm({ next = '' }: { next?: string }) {
  const [state, action, pending] = useActionState(requestGuestPasswordResetAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="next" value={next} />
    <Notice error={state.error} success={state.success} />
    <label className="stay-input">Email address<input required name="email" type="email" maxLength={320} autoComplete="email" inputMode="email" defaultValue={state.email || ''} /></label>
    <SubmitButton pendingLabel="Requesting…" block>Email me a reset link<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetGuestPasswordAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="token" value={token} />
    <Notice error={state.error} />
    <label className="stay-input">Email address<input required name="email" type="email" maxLength={320} autoComplete="email" defaultValue={state.email || email} /></label>
    <div className="stay-form-grid">
      <label className="stay-input">New password<input required name="password" type="password" minLength={10} maxLength={200} autoComplete="new-password" /><span className="stay-input-hint">At least 10 characters.</span></label>
      <label className="stay-input">Confirm password<input required name="confirmPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" /></label>
    </div>
    <SubmitButton pendingLabel="Saving…" block>Set new password<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateGuestProfileAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <Notice error={state.error} success={state.success} />
    <label className="stay-input">Full name<input required name="name" maxLength={200} autoComplete="name" defaultValue={state.name ?? name} /></label>
    <label className="stay-input">Phone <span className="stay-optional">optional</span><input name="phone" type="tel" maxLength={64} autoComplete="tel" inputMode="tel" defaultValue={state.phone ?? phone} /></label>
    <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
  </form>;
}

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changeGuestPasswordAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <Notice error={state.error} success={state.success} />
    <label className="stay-input">Current password<input required name="currentPassword" type="password" maxLength={200} autoComplete="current-password" /></label>
    <div className="stay-form-grid">
      <label className="stay-input">New password<input required name="newPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" /><span className="stay-input-hint">At least 10 characters.</span></label>
      <label className="stay-input">Confirm new password<input required name="confirmPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" /></label>
    </div>
    <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
  </form>;
}
