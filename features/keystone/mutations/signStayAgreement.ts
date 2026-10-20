import crypto from 'node:crypto';

import { hashPublicOwnershipToken, isPublicOwnershipTokenActive, resolvePublicTokenRecord } from '../utils/publicTokenAccess';

export async function signStayAgreement(
  _root: unknown,
  args: { token: string; signatureName: string; acceptTerms?: boolean | null },
  context: any,
) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) throw new Error('Agreement link is invalid.');
  if (args.acceptTerms !== true) throw new Error('Confirm that you have read and accept the stay terms before signing.');
  const signatureName = args.signatureName?.trim();
  if (!signatureName) throw new Error('Signature name is required.');
  if (signatureName.length > 200) throw new Error('Signature name is too long.');

  const agreement = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: 'Agreement link is invalid.',
    findRecordByHash: async (tokenHash) => {
      const agreements = await context.sudo().query.StayAgreement.findMany({
        where: { signingTokenHash: { equals: tokenHash } },
        take: 1,
        query: 'id agreementNumber status signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt',
      });
      const record = agreements[0];
      return record ? { ...record, tokenExpiresAt: record.signingTokenExpiresAt, tokenRevokedAt: record.signingTokenRevokedAt } : null;
    },
    isUnavailable: (record) => record.status === 'voided',
  });
  if (!agreement) throw new Error('Agreement link is invalid or expired.');

  return context.prisma.$transaction(async (tx: any) => {
    // Lock order matches cancellation and reissue: reservation, then agreement.
    const stay = await tx.reservation.findFirst({ where: { agreementId: agreement.id }, select: { id: true } });
    if (stay) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${stay.id}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', stay.id);
    }
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `agreement:${agreement.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayAgreement" WHERE "id" = $1 FOR UPDATE', agreement.id);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (
      !locked
      || locked.signingTokenHash !== hashPublicOwnershipToken(args.token)
      || !isPublicOwnershipTokenActive({
        tokenExpiresAt: locked.signingTokenExpiresAt,
        tokenRevokedAt: locked.signingTokenRevokedAt,
      })
      || locked.status === 'voided'
    ) {
      throw new Error('Agreement link is invalid or expired.');
    }
    if (locked.status === 'signed') return locked;
    const reservation = await tx.reservation.findFirst({ where: { agreementId: locked.id }, select: { status: true, testMode: true } });
    if (!reservation || ['cancelled', 'no_show'].includes(reservation.status || '')) {
      throw new Error('This stay is no longer active, so its agreement can’t be signed.');
    }
    const signedAt = new Date();
    return tx.stayAgreement.update({
      where: { id: locked.id },
      data: {
        status: 'signed',
        signatureName,
        signedAt,
        signatureEvidence: {
          acceptedAt: signedAt.toISOString(),
          statement: 'Read the captured terms and house rules and agreed to sign with the typed name.',
          termsSnapshotSha256: crypto.createHash('sha256').update(JSON.stringify(locked.termsSnapshot ?? null)).digest('hex'),
          via: 'signing_link',
          // A test booking's agreement is signed as part of a simulation, not a real stay.
          ...(reservation.testMode ? { simulation: true } : {}),
        },
      },
    });
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
