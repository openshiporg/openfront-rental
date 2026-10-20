'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { removeAuthToken } from '@/features/dashboard/lib/cookies';
import { createDashboardSessionCookieOptions } from '@/features/keystone/sessionPolicy';
import { safeAccountNext } from '../account-navigation';

export type AccountFormState = { error: string; success?: string; email?: string; name?: string; phone?: string };

// Where to go after a password reset finishes, kept server-side for the browser that asked.
const RESET_NEXT_COOKIE = 'stay-reset-next';

const SIGN_IN_FAILED = 'The email or password is incorrect.';
const UNAVAILABLE = 'We couldn’t complete that right now. Try again in a moment.';

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === 'string' ? entry.trim() : '';
}

function secret(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === 'string' ? entry : '';
}

// Same Keystone session token → httpOnly cookie handoff as the dashboard sign-in
// (features/dashboard/actions/auth.ts) and E-commerce storefront login.
async function startSession(email: string, password: string): Promise<'ok' | 'invalid' | 'inactive' | 'error'> {
  const attempt = async (identity: string) => keystoneClient<any>(`
    mutation SignInGuest($email: String!, $password: String!) {
      authenticateUserWithPassword(email: $email, password: $password) {
        ... on UserAuthenticationWithPasswordSuccess { sessionToken item { id isActive } }
        ... on UserAuthenticationWithPasswordFailure { message }
      }
    }
  `, { email: identity, password });
  const identities = [...new Set([email.toLowerCase(), email])];
  for (const identity of identities) {
    const response = await attempt(identity);
    if (!response.success) return 'error';
    const token = response.data?.authenticateUserWithPassword?.sessionToken;
    // A deactivated account gets no session cookie, so it can't loop between sign-in and account.
    if (token && response.data?.authenticateUserWithPassword?.item?.isActive !== true) return 'inactive';
    if (token) {
      const store = await cookies();
      store.set('keystonejs-session', token, createDashboardSessionCookieOptions(process.env.NODE_ENV === 'production'));
      return 'ok';
    }
  }
  return 'invalid';
}

export async function signInGuestAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = value(formData, 'email');
  const password = secret(formData, 'password');
  const next = safeAccountNext(value(formData, 'next'));
  if (!email || !password) return { error: SIGN_IN_FAILED, email };
  const result = await startSession(email, password);
  if (result === 'invalid') return { error: SIGN_IN_FAILED, email };
  if (result === 'inactive') return { error: 'This account isn’t active. Contact the store if you need it turned back on.', email };
  if (result === 'error') return { error: UNAVAILABLE, email };
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function registerGuestAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const name = value(formData, 'name');
  const email = value(formData, 'email').toLowerCase();
  const password = secret(formData, 'password');
  const confirm = secret(formData, 'confirmPassword');
  const next = safeAccountNext(value(formData, 'next'));
  const keep = { name, email };
  if (!name || name.length > 200) return { ...keep, error: 'Enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return { ...keep, error: 'Enter a valid email address.' };
  if (password.length < 10 || password.length > 200) return { ...keep, error: 'Use a password of at least 10 characters.' };
  if (password !== confirm) return { ...keep, error: 'The passwords don’t match.' };
  const termsVersion = value(formData, 'termsVersion');
  if (termsVersion && value(formData, 'termsConsent') !== 'on') return { ...keep, error: 'Accept the store’s terms of use to create an account.' };
  const response = await keystoneClient<any>(`
    mutation RegisterGuestAccount($name: String!, $email: String!, $password: String!, $acceptedTermsOfUseVersion: String, $privacyNoticeVersion: String) {
      registerGuestAccount(name: $name, email: $email, password: $password, acceptedTermsOfUseVersion: $acceptedTermsOfUseVersion, privacyNoticeVersion: $privacyNoticeVersion)
    }
  `, { name, email, password, acceptedTermsOfUseVersion: termsVersion || null, privacyNoticeVersion: value(formData, 'privacyNoticeVersion') || null });
  if (!response.success) return { ...keep, error: UNAVAILABLE };
  if (response.data.registerGuestAccount?.reason === 'terms_changed') {
    return { ...keep, error: 'The store’s terms or privacy policy changed. Reload this page to review the current version.' };
  }
  if (response.data.registerGuestAccount?.reason === 'exists') {
    return { ...keep, error: 'An account may already use this email. Sign in, or reset your password.' };
  }
  const session = await startSession(email, password);
  if (session !== 'ok') redirect(`/account/sign-in?created=1&next=${encodeURIComponent(next)}`);
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOutGuestAction() {
  await keystoneClient(`mutation EndGuestSession { endSession }`);
  await removeAuthToken();
  revalidatePath('/', 'layout');
  redirect('/account?signedOut=1');
}

export async function requestGuestPasswordResetAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = value(formData, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { email, error: 'Enter the email address on your account.' };
  const available = await keystoneClient<any>(`query GuestPasswordResetAvailable { guestPasswordResetAvailable }`);
  if (!available.success || available.data.guestPasswordResetAvailable !== true) {
    return { email, error: 'Password reset by email isn’t available for this store yet. Use Find my trip with your confirmation code and booking email, or message the host.' };
  }
  const response = await keystoneClient<any>(`mutation SendGuestPasswordReset($email: String!) { sendUserPasswordResetLink(email: $email) }`, { email });
  if (!response.success) return { email, error: UNAVAILABLE };
  const next = safeAccountNext(value(formData, 'next'), '');
  if (next) (await cookies()).set(RESET_NEXT_COOKIE, next, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/account', maxAge: 60 * 60 });
  return { email, error: '', success: 'If an account uses that email, a reset link is on its way. It expires after a short time.' };
}

export async function resetGuestPasswordAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = value(formData, 'email').toLowerCase();
  const token = value(formData, 'token');
  const password = secret(formData, 'password');
  const confirm = secret(formData, 'confirmPassword');
  if (!email || !token) return { email, error: 'This reset link is incomplete. Request a new one.' };
  if (password.length < 10 || password.length > 200) return { email, error: 'Use a password of at least 10 characters.' };
  if (password !== confirm) return { email, error: 'The passwords don’t match.' };
  const response = await keystoneClient<any>(`
    mutation RedeemGuestPasswordReset($email: String!, $token: String!, $password: String!) {
      redeemUserPasswordResetToken(email: $email, token: $token, password: $password) { code message }
    }
  `, { email, token, password });
  if (!response.success) return { email, error: UNAVAILABLE };
  if (response.data.redeemUserPasswordResetToken?.code) return { email, error: 'This reset link is invalid or has expired. Request a new one below.' };
  const store = await cookies();
  const next = safeAccountNext(store.get(RESET_NEXT_COOKIE)?.value, '');
  store.delete({ name: RESET_NEXT_COOKIE, path: '/account' });
  redirect(`/account/sign-in?reset=1${next ? `&next=${encodeURIComponent(next)}` : ''}`);
}

function profileResult(response: any, key: string) {
  return response.success ? response.data?.[key] : null;
}

export async function updateGuestProfileAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const name = value(formData, 'name');
  const phone = value(formData, 'phone');
  if (!name || name.length > 200) return { name, phone, error: 'Enter your name.' };
  if (phone.length > 64) return { name, phone, error: 'Use a phone number of up to 64 characters.' };
  const response = await keystoneClient<any>(`mutation UpdateMyGuestProfile($name: String!, $phone: String) { updateMyGuestProfile(name: $name, phone: $phone) }`, { name, phone: phone || null });
  if (profileResult(response, 'updateMyGuestProfile')?.ok !== true) return { name, phone, error: UNAVAILABLE };
  revalidatePath('/account');
  return { name, phone, error: '', success: 'Your details are saved. Contact details on past bookings stay as booked.' };
}

export async function changeGuestPasswordAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const currentPassword = secret(formData, 'currentPassword');
  const newPassword = secret(formData, 'newPassword');
  const confirmPassword = secret(formData, 'confirmPassword');
  if (!currentPassword) return { error: 'Enter your current password.' };
  if (newPassword.length < 10 || newPassword.length > 200) return { error: 'Use a new password of at least 10 characters.' };
  if (newPassword !== confirmPassword) return { error: 'The new passwords don’t match.' };
  const response = await keystoneClient<any>(`
    mutation ChangeGuestPassword($currentPassword: String!, $newPassword: String!, $confirmPassword: String!) {
      changeGuestPassword(currentPassword: $currentPassword, newPassword: $newPassword, confirmPassword: $confirmPassword)
    }
  `, { currentPassword, newPassword, confirmPassword });
  const result = profileResult(response, 'changeGuestPassword');
  if (result?.reason === 'wrong_password') return { error: 'Your current password is incorrect.' };
  if (result?.reason === 'staff_account') return { error: 'This sign-in is also a host or owner account. Ask a people manager in the host workspace to change its password.' };
  if (result?.ok !== true) return { error: UNAVAILABLE };
  return { error: '', success: 'Your password is changed.' };
}
