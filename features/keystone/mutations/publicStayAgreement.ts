import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';

export async function publicStayAgreement(_root: unknown, args: { token: string }, context: any) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) return null;
  const agreement = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: 'Agreement link is invalid.',
    findRecordByHash: async (tokenHash) => {
      const records = await context.sudo().query.StayAgreement.findMany({
        where: { signingTokenHash: { equals: tokenHash } },
        take: 1,
        query: 'id agreementNumber status title signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot',
      });
      const record = records[0];
      return record ? { ...record, tokenExpiresAt: record.signingTokenExpiresAt, tokenRevokedAt: record.signingTokenRevokedAt } : null;
    },
    isUnavailable: (record) => record.status === 'voided',
  });
  if (!agreement) return null;
  const { signingTokenExpiresAt: _expires, signingTokenRevokedAt: _revoked, tokenExpiresAt: _tokenExpires, tokenRevokedAt: _tokenRevoked, ...publicAgreement } = agreement;
  return publicAgreement;
}
