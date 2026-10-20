import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type GuestAccount = {
  name: string;
  email: string;
  phone: string;
  hasHostAccess: boolean;
  /** Also a host, staff or owner sign-in: its password is changed by a people manager. */
  staffCredential?: boolean;
  tripsOffset: number;
  tripsPageSize: number;
  tripsTotal: number;
  trips: Array<{
    confirmationCode: string;
    status: string;
    paymentStatus: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmountCents: number;
    amountPaidCents: number;
    currencyCode: string;
    testMode: boolean;
    /** Whether the home's local checkout (time, or the whole day when unknown) has passed. */
    checkoutPassed?: boolean;
    checkoutTimeKnown?: boolean;
    timeZone?: string | null;
    checkOutBy?: string | null;
    /** Title and photo as booked; `bookAgainSlug` only while the home is still listed. */
    listing: { title: string; thumbnail: string | null; bookAgainSlug: string | null } | null;
  }>;
};

export type GuestThread = {
  subject: string;
  status: string;
  startedAt: string;
  hostName: string | null;
  listing: { title: string; slug: string } | null;
  messages: Array<{ id: string; from: 'guest' | 'host'; body: string; at: string | null }>;
  earlierMessagesBefore?: string | null;
};

/** Returns null when nobody is signed in; `error` when the account could not be read. */
export async function getGuestAccount(tripsOffset = 0): Promise<{ account: GuestAccount | null; error: string | null }> {
  const response = await keystoneClient<{ myGuestAccount: GuestAccount | null }>(`query MyGuestAccount($tripsOffset: Int) { myGuestAccount(tripsOffset: $tripsOffset) }`, { tripsOffset });
  if (!response.success) return { account: null, error: 'Your account couldn’t be loaded. Refresh to try again.' };
  return { account: response.data.myGuestAccount || null, error: null };
}

export async function getGuestThread(token: string, messagesBefore?: string | null): Promise<{ thread: GuestThread | null; error: string | null }> {
  const response = await keystoneClient<{ publicGuestThread: GuestThread | null }>(`query PublicGuestThread($token: String!, $messagesBefore: String) { publicGuestThread(token: $token, messagesBefore: $messagesBefore) }`, { token, messagesBefore: messagesBefore || null });
  if (!response.success) return { thread: null, error: 'This conversation couldn’t be loaded. Check the full link and try again.' };
  return { thread: response.data.publicGuestThread || null, error: null };
}

export async function getPasswordResetAvailable() {
  const response = await keystoneClient<{ guestPasswordResetAvailable: boolean }>(`query GuestPasswordResetAvailable { guestPasswordResetAvailable }`);
  return response.success && response.data.guestPasswordResetAvailable === true;
}
