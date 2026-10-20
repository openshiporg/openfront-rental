import { enqueueOutboxEvent } from './outbox';
import { requestAttemptClosure } from './paymentAttemptClaim';

/**
 * Obligations that end when a stay is cancelled or marked a no-show: the guest can no
 * longer sign its agreement, a deposit that was only required (nothing collected) is no
 * longer owed, and open card attempts are marked for cancellation with their execution
 * claims revoked (the caller asks the provider after commit). Signed agreements, collected
 * deposits and any card payment that still succeeds keep their state for audit and follow-up.
 */
export async function closeStayObligations(tx: any, {
  reservation,
  now,
  operationKey,
}: {
  reservation: { id: string; hostOrganizationId: string; agreementId?: string | null; securityDepositId?: string | null };
  now: Date;
  operationKey: string;
}) {
  let agreementVoided = false;
  let depositReleased = false;
  if (reservation.agreementId) {
    const voided = await tx.stayAgreement.updateMany({
      where: { id: reservation.agreementId, status: { in: ['draft', 'sent'] } },
      data: { status: 'voided', signingTokenRevokedAt: now },
    });
    await tx.stayAgreement.updateMany({
      where: { id: reservation.agreementId, signingTokenRevokedAt: null },
      data: { signingTokenRevokedAt: now },
    });
    agreementVoided = voided.count > 0;
    if (agreementVoided) {
      await enqueueOutboxEvent(tx, {
        hostOrganizationId: reservation.hostOrganizationId,
        eventType: 'stay_agreement.voided',
        aggregateType: 'StayAgreement',
        aggregateId: reservation.agreementId,
        operationKey,
        payload: { agreementId: reservation.agreementId, reservationId: reservation.id, reason: 'stay_closed' },
      });
    }
  }
  if (reservation.securityDepositId) {
    const released = await tx.securityDeposit.updateMany({
      where: { id: reservation.securityDepositId, status: 'required' },
      data: { status: 'released', releasedAt: now },
    });
    depositReleased = released.count > 0;
    if (depositReleased) {
      await enqueueOutboxEvent(tx, {
        hostOrganizationId: reservation.hostOrganizationId,
        eventType: 'security_deposit.released',
        aggregateType: 'SecurityDeposit',
        aggregateId: reservation.securityDepositId,
        operationKey,
        payload: { depositId: reservation.securityDepositId, reservationId: reservation.id, reason: 'stay_closed' },
      });
    }
  }
  const paymentAttemptsClosing = await requestAttemptClosure(tx, reservation.id, 'stay_closed');
  return { agreementVoided, depositReleased, paymentAttemptsClosing };
}

/** YYYY-MM-DD in the property's timezone; falls back to UTC for an invalid zone. */
export function propertyLocalDate(timezone?: string | null, now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
