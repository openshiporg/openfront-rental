import { hashPublicOwnershipToken } from '../utils/publicTokenAccess';

const closedStayStatuses = ['cancelled', 'no_show'];

/**
 * Guest view of an agreement link. Expiry is checked first: an expired link reveals
 * nothing. A voided or revoked link only says why it can't be used, with no agreement
 * number or signer details. A live link for a cancelled stay shows its signing record
 * without terms. Signed records themselves are never changed.
 */
export async function publicStayAgreement(_root: unknown, args: { token: string }, context: any) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) return null;
  const records = await context.sudo().query.StayAgreement.findMany({
    where: { signingTokenHash: { equals: hashPublicOwnershipToken(args.token) } },
    take: 1,
    query: 'id agreementNumber status title signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot signatureEvidence reservation { status fixtureOrigin testMode }',
  });
  const raw = records[0];
  if (!raw) return null;
  // A setup sample's "signature" was recorded by setup, never by a guest: the original row is
  // kept, but no guest-facing view presents it as a person's signature or assent.
  const sample = Boolean(raw.reservation?.fixtureOrigin) || raw.signatureEvidence?.provenance === 'onboarding_sample';
  // Only a signature made through the signing link is a guest's; a sample's earlier one isn't.
  const signedBySetup = sample && raw.status === 'signed' && raw.signatureEvidence?.via !== 'signing_link';
  const { signatureEvidence: _evidence, ...rest } = raw;
  const agreement = {
    ...rest,
    sample,
    simulation: raw.reservation?.testMode === true,
    signedBySetup,
    ...(signedBySetup ? { signatureName: null, signedAt: null } : {}),
  };
  const stayClosed = closedStayStatuses.includes(agreement.reservation?.status);
  const revoked = Boolean(agreement.signingTokenRevokedAt) || agreement.status === 'voided';
  const expired = !agreement.signingTokenExpiresAt || new Date(agreement.signingTokenExpiresAt).getTime() <= Date.now();
  if (expired) return null;
  if (revoked) return { signable: false, unavailableReason: agreement.status === 'voided' ? 'voided' : 'replaced' };
  if (stayClosed) {
    return {
      id: agreement.id,
      agreementNumber: agreement.agreementNumber,
      title: agreement.title,
      status: agreement.status,
      signatureName: agreement.signatureName,
      signedAt: agreement.signedAt,
      sample: agreement.sample,
      signedBySetup: agreement.signedBySetup,
      signable: false,
      unavailableReason: 'stay_closed',
    };
  }
  const { signingTokenExpiresAt: _expires, signingTokenRevokedAt: _revoked, reservation: _reservation, ...publicAgreement } = agreement;
  return { ...publicAgreement, signable: agreement.status !== 'signed', unavailableReason: null };
}
