import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';

export async function signStayAgreement(
  _root: unknown,
  args: { token: string; signatureName: string },
  context: any,
) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) throw new Error('Agreement link is invalid.');
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
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `agreement:${agreement.id}`);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked || locked.status === 'voided') throw new Error('Agreement link is invalid or expired.');
    if (locked.status === 'signed') return locked;
    return tx.stayAgreement.update({
      where: { id: locked.id },
      data: { status: 'signed', signatureName, signedAt: new Date() },
    });
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
