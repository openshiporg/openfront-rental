/**
 * The local attempt a provider object must belong to. Adapters check the provider's own record
 * against all of it BEFORE any cancel or refund, so a mismatched object is never changed.
 */
export type PaymentAttemptIdentity = {
  rentalPaymentId: string;
  reservationId: string | null;
  idempotencyKey: string | null;
  amountCents: number;
  currencyCode: string;
};

/** The provider definitely refused this exact request: nothing happened, a new attempt may follow. */
export class ProviderDefiniteRejection extends Error {
  readonly definite = true;
  constructor(message: string) { super(message); this.name = 'ProviderDefiniteRejection'; }
}

/** The original request's outcome can't be established: keep it open for reconciliation; never retry blindly. */
export class ProviderOutcomeUnknown extends Error {
  readonly unknownOutcome = true;
  constructor(message: string) { super(message); this.name = 'ProviderOutcomeUnknown'; }
}
