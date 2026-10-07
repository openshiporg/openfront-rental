'use server';

import { revalidatePath } from 'next/cache';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export async function getOwnerWorkspace() {
  const response = await keystoneClient<any>(`
    query OwnerWorkspace {
      propertyOwners(orderBy: [{ displayName: asc }], take: 100) {
        id ownerNumber displayName companyName email status payoutSchedule defaultManagerCommissionBasisPoints
        assignments(where: { status: { equals: "active" } }, take: 100) { id ownershipBasisPoints managerCommissionBasisPoints property { id name } }
      }
      ownerStatements(orderBy: [{ periodEnd: desc }], take: 100) {
        id statementNumber status periodStart periodEnd currencyCode grossRevenueCents refundAmountCents managerCommissionCents ownerEarningsCents paidOutCents balanceDueCents approvedAt sentAt paidAt paidReference
        owner { id displayName }
        lines(orderBy: [{ serviceDate: asc }], take: 250) { id lineType description serviceDate amountCents }
      }
      payouts(orderBy: [{ scheduledAt: desc }], take: 200) {
        id payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt
        propertyOwner { id displayName }
        ownerStatement { id statementNumber status }
        reservation { id confirmationCode listing { title } }
      }
    }
  `);
  if (!response.success) return { owners: [], statements: [], payouts: [], error: 'Owner finance data is temporarily unavailable.' };
  return { owners: response.data.propertyOwners || [], statements: response.data.ownerStatements || [], payouts: response.data.payouts || [], error: null };
}

export async function generateOwnerStatementAction(formData: FormData): Promise<void> {
  const response = await keystoneClient<any>(`
    mutation GenerateOwnerStatement($ownerId: ID!, $periodStart: String!, $periodEnd: String!, $currencyCode: String) {
      generateOwnerStatement(ownerId: $ownerId, periodStart: $periodStart, periodEnd: $periodEnd, currencyCode: $currencyCode)
    }
  `, { ownerId: String(formData.get('ownerId') || ''), periodStart: String(formData.get('periodStart') || ''), periodEnd: String(formData.get('periodEnd') || ''), currencyCode: String(formData.get('currencyCode') || 'USD') });
  if (!response.success) throw new Error(response.error);
  revalidatePath('/dashboard/platform/payouts');
}

export async function transitionOwnerStatementAction(formData: FormData): Promise<void> {
  const response = await keystoneClient<any>(`
    mutation TransitionOwnerStatement($statementId: ID!, $transition: String!, $reference: String) {
      transitionOwnerStatement(statementId: $statementId, transition: $transition, reference: $reference)
    }
  `, { statementId: String(formData.get('statementId') || ''), transition: String(formData.get('transition') || ''), reference: String(formData.get('reference') || '') || null });
  if (!response.success) throw new Error(response.error);
  revalidatePath('/dashboard/platform/payouts');
}
