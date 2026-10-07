export type UnverifiedBookingContact = {
  hostOrganizationId: string;
  name: string;
  email: string;
  phone: string;
};

type GuestProfileCreateTransaction = {
  guestProfile: {
    create(args: {
      data: UnverifiedBookingContact & { verificationStatus: 'unverified' };
    }): Promise<{ id: string }>;
  };
};

export async function createIsolatedUnverifiedBookingGuest(
  tx: GuestProfileCreateTransaction,
  contact: UnverifiedBookingContact,
): Promise<{ id: string }> {
  return tx.guestProfile.create({
    data: { ...contact, verificationStatus: 'unverified' },
  });
}
