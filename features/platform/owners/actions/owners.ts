'use server';

import { revalidatePath } from 'next/cache';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PAGE_SIZE, pageWindow, requestedPage } from '@/features/platform/operations/lib/listParams';
import type { FinanceFormState } from '../lib/financeForm';

const PAYOUTS = '/dashboard/platform/payouts';
const STATEMENT_LINE_PAGE = 100;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type OwnerWorkspaceView = 'all' | 'statements' | 'owners';

const contains = (q: string) => ({ contains: q, mode: 'insensitive' });
const ownerSearch = (q: string) => (q ? { OR: [{ displayName: contains(q) }, { companyName: contains(q) }, { email: contains(q) }, { ownerNumber: contains(q) }, { assignments: { some: { property: { name: contains(q) } } } }] } : {});
const statementSearch = (q: string) => (q ? { OR: [{ statementNumber: contains(q) }, { owner: { displayName: contains(q) } }] } : {});
const payoutSearch = (q: string) => (q ? { OR: [{ payoutNumber: contains(q) }, { propertyOwner: { displayName: contains(q) } }, { ownerStatement: { statementNumber: contains(q) } }, { reservation: { confirmationCode: contains(q) } }, { reservation: { listing: { title: contains(q) } } }] } : {});
// Failed or reversed, or marked paid with neither a provider reference nor a statement.
const payoutExceptionWhere = { OR: [{ status: { in: ['failed', 'reversed'] } }, { status: { equals: 'paid' }, ownerStatement: null, OR: [{ providerPayoutId: { equals: null } }, { providerPayoutId: { equals: '' } }] }] };
const statementDueWhere = { balanceDueCents: { gt: 0 }, status: { in: ['approved', 'sent'] } };
const OPTION_LIMIT = 200;

/**
 * One page of the active view, searched and counted on the server (every record is reachable),
 * plus full counts for each tab, the exceptions and balances due, and owner choices for the
 * forms (searchable with the same query, so an owner past the first page can be chosen).
 */
export async function getOwnerWorkspace(input: { view: OwnerWorkspaceView; q: string; page?: string } = { view: 'all', q: '' }) {
  const q = String(input.q || '').trim().slice(0, 120);
  const view = input.view;
  const where = { payouts: payoutSearch(q), statements: statementSearch(q), owners: ownerSearch(q) };
  const read = (skip: number) => keystoneClient<any>(`
    query OwnerWorkspace($skip: Int!, $take: Int!, $payoutWhere: PayoutWhereInput!, $statementWhere: OwnerStatementWhereInput!, $ownerWhere: PropertyOwnerWhereInput!, $exceptionWhere: PayoutWhereInput!, $dueWhere: OwnerStatementWhereInput!, $optionLimit: Int!) {
      ${view === 'owners' ? `propertyOwners(where: $ownerWhere, orderBy: [{ displayName: asc }, { id: asc }], skip: $skip, take: $take) {
        id ownerNumber displayName companyName email status payoutSchedule defaultManagerCommissionBasisPoints
        hostOrganization { id }
        assignmentsCount
        assignments(orderBy: [{ effectiveFrom: desc }, { id: desc }], take: 50) { id status ownershipBasisPoints managerCommissionBasisPoints effectiveFrom effectiveTo property { id name } }
      }` : ''}
      ${view === 'statements' ? `ownerStatements(where: $statementWhere, orderBy: [{ periodEnd: desc }, { id: desc }], skip: $skip, take: $take) {
        id statementNumber status periodStart periodEnd currencyCode grossRevenueCents refundAmountCents managerCommissionCents ownerEarningsCents paidOutCents balanceDueCents approvedAt sentAt paidAt paidReference
        owner { id displayName }
      }` : ''}
      ${view === 'all' ? `payouts(where: $payoutWhere, orderBy: [{ scheduledAt: desc }, { id: desc }], skip: $skip, take: $take) {
        id payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt data
        propertyOwner { id displayName }
        ownerStatement { id statementNumber status }
        reservation { id confirmationCode listing { title } }
      }` : ''}
      payoutsMatching: payoutsCount(where: $payoutWhere)
      statementsMatching: ownerStatementsCount(where: $statementWhere)
      ownersMatching: propertyOwnersCount(where: $ownerWhere)
      propertyOwnersCount
      activeOwnersCount: propertyOwnersCount(where: { status: { equals: "active" } })
      ownerStatementsCount
      payoutsCount
      exceptions: payouts(where: $exceptionWhere, orderBy: [{ scheduledAt: desc }, { id: desc }], take: 20) {
        id payoutNumber status currencyCode netAmountCents propertyOwner { displayName }
      }
      exceptionsCount: payoutsCount(where: $exceptionWhere)
      statementsDue: ownerStatements(where: $dueWhere, orderBy: [{ periodEnd: asc }, { id: asc }], take: 20) {
        id statementNumber balanceDueCents currencyCode owner { displayName }
      }
      statementsDueCount: ownerStatementsCount(where: $dueWhere)
      ownerOptions: propertyOwners(where: $ownerWhere, orderBy: [{ displayName: asc }, { id: asc }], take: $optionLimit) { id ownerNumber displayName hostOrganization { id } defaultManagerCommissionBasisPoints }
      ownerFinanceSummary
    }
  `, { skip, take: PAGE_SIZE, payoutWhere: where.payouts, statementWhere: where.statements, ownerWhere: where.owners, exceptionWhere: payoutExceptionWhere, dueWhere: statementDueWhere, optionLimit: OPTION_LIMIT });
  const unavailable = { rows: [] as any[], pagination: pageWindow(0, 1), counts: null, summary: null, exceptions: [] as any[], exceptionsCount: 0, statementsDue: [] as any[], statementsDueCount: 0, ownerOptions: [] as any[], ownerOptionsTotal: 0, error: 'Owner finance data is temporarily unavailable.' };
  const requested = Math.min(requestedPage(input.page), 100_000);
  let response = await read((requested - 1) * PAGE_SIZE);
  if (!response.success) return unavailable;
  let data = response.data;
  const matching = view === 'owners' ? data.ownersMatching : view === 'statements' ? data.statementsMatching : data.payoutsMatching;
  const pagination = pageWindow(Number(matching || 0), requested);
  if (pagination.page !== requested) {
    response = await read(pagination.skip);
    if (!response.success) return unavailable;
    data = response.data;
  }
  return {
    rows: (view === 'owners' ? data.propertyOwners : view === 'statements' ? data.ownerStatements : data.payouts) || [],
    pagination,
    counts: {
      owners: Number(data.propertyOwnersCount || 0), activeOwners: Number(data.activeOwnersCount || 0), statements: Number(data.ownerStatementsCount || 0), payouts: Number(data.payoutsCount || 0),
      tabs: { all: Number(data.payoutsMatching || 0), statements: Number(data.statementsMatching || 0), owners: Number(data.ownersMatching || 0) },
    },
    summary: data.ownerFinanceSummary || null,
    exceptions: data.exceptions || [],
    exceptionsCount: Number(data.exceptionsCount || 0),
    statementsDue: data.statementsDue || [],
    statementsDueCount: Number(data.statementsDueCount || 0),
    ownerOptions: data.ownerOptions || [],
    ownerOptionsTotal: Number(data.ownersMatching || 0),
    error: null,
  };
}

/** Hosts the operator can add owners to, and the properties they can assign. */
export async function getOwnerSetupContext(propertySearch = '', includePropertyId = '') {
  const q = propertySearch.trim().slice(0, 120);
  // Property choices are searchable, and a property named in the link is always included.
  const response = await keystoneClient<any>(`
    query OwnerSetupContext($where: PropertyWhereInput!, $include: PropertyWhereInput!) {
      permittedHostOrganizations(permission: "canManagePayouts")
      properties(where: $where, orderBy: [{ name: asc }, { id: asc }], take: 200) { id name hostOrganization { id } }
      propertiesCount(where: $where)
      included: properties(where: $include, take: 1) { id name hostOrganization { id } }
    }
  `, { where: q ? { name: { contains: q, mode: 'insensitive' } } : {}, include: { id: { equals: includePropertyId || '' } } });
  if (!response.success) return { hosts: [], properties: [], propertiesTotal: 0, error: 'Owner setup options couldn’t load.' };
  const properties = response.data.properties || [];
  const included = (response.data.included || []).filter((property: any) => !properties.some((item: any) => item.id === property.id));
  return { hosts: response.data.permittedHostOrganizations?.hosts || [], properties: [...included, ...properties], propertiesTotal: Number(response.data.propertiesCount || 0), error: null };
}

export async function getOwnerStatementDetail(id: string, page = 1) {
  const skip = (Math.max(1, page) - 1) * STATEMENT_LINE_PAGE;
  const response = await keystoneClient<any>(`
    query OwnerStatementDetail($id: ID!, $skip: Int!, $take: Int!) {
      ownerStatement(where: { id: $id }) {
        id statementNumber status periodStart periodEnd currencyCode
        grossRevenueCents taxAmountCents refundAmountCents expenseAmountCents adjustmentAmountCents managerCommissionCents ownerEarningsCents paidOutCents balanceDueCents
        statementSnapshot generatedAt approvedAt sentAt paidAt paidReference
        owner { id displayName ownerNumber }
        linesCount
        lines(orderBy: [{ serviceDate: asc }, { id: asc }], skip: $skip, take: $take) {
          id lineType description serviceDate amountCents metadata
          reservation { id confirmationCode }
          refund { id refundNumber }
          payout { id payoutNumber }
        }
        payouts(orderBy: [{ paidAt: desc }], take: 20) { id payoutNumber status currencyCode netAmountCents providerPayoutId paidAt data }
      }
    }
  `, { id, skip, take: STATEMENT_LINE_PAGE });
  const none = { revisions: [] as any[], revisionsCount: 0, latestRevision: null as any, laterRevisionsCount: 0 };
  if (!response.success) return { statement: null, ...none, pageSize: STATEMENT_LINE_PAGE, error: 'The statement couldn’t load.' };
  const statement = response.data.ownerStatement;
  if (!statement?.owner?.id) return { statement, ...none, pageSize: STATEMENT_LINE_PAGE, error: null };
  // The current (latest) revision and how many came after this one are read directly, not
  // inferred from the bounded list, so a revision beyond the list is never missed.
  const revisions = await keystoneClient<any>(`
    query OwnerStatementRevisions($same: OwnerStatementWhereInput!, $later: OwnerStatementWhereInput!) {
      ownerStatements(where: $same, orderBy: [{ generatedAt: desc }, { id: desc }], take: 20) { id statementNumber status generatedAt }
      revisionsCount: ownerStatementsCount(where: $same)
      latest: ownerStatements(where: $same, orderBy: [{ generatedAt: desc }, { id: desc }], take: 1) { id statementNumber status generatedAt }
      laterCount: ownerStatementsCount(where: $later)
    }
  `, {
    same: { owner: { id: { equals: statement.owner.id } }, periodStart: { equals: statement.periodStart }, periodEnd: { equals: statement.periodEnd }, currencyCode: { equals: statement.currencyCode } },
    later: { owner: { id: { equals: statement.owner.id } }, periodStart: { equals: statement.periodStart }, periodEnd: { equals: statement.periodEnd }, currencyCode: { equals: statement.currencyCode }, ...(statement.generatedAt ? { generatedAt: { gt: statement.generatedAt } } : { id: { equals: '' } }) },
  });
  if (!revisions.success) return { statement, ...none, revisionsUnavailable: true, pageSize: STATEMENT_LINE_PAGE, error: null };
  return {
    statement,
    revisions: revisions.data.ownerStatements || [],
    revisionsCount: Number(revisions.data.revisionsCount || 0),
    latestRevision: revisions.data.latest?.[0] || null,
    laterRevisionsCount: Number(revisions.data.laterCount || 0),
    pageSize: STATEMENT_LINE_PAGE,
    error: null,
  };
}

const financeStatuses: Record<string, FinanceFormState['status']> = {
  BAD_USER_INPUT: 'invalid',
  CONFLICT: 'conflict',
  NOT_FOUND: 'conflict',
  FORBIDDEN: 'forbidden',
};

/** Owner-finance commands return reviewed messages under these codes; anything else stays generic. */
function commandFailure(response: { errors?: any[] }, values: Record<string, string>): FinanceFormState {
  const first = Array.isArray(response.errors) ? response.errors[0] : null;
  const status = financeStatuses[String(first?.extensions?.code || '')];
  if (status && typeof first?.message === 'string' && first.message.length <= 400) return { status, message: first.message, values };
  return { status: 'error', message: 'That didn’t go through. Check the statement list before trying again.', values };
}

/** Record writes fail with Keystone validation or access errors; only their reviewed rule messages are shown. */
function recordFailure(response: { errors?: any[]; success?: boolean }, values: Record<string, string>, duplicateMessage: string): FinanceFormState {
  const first = Array.isArray(response.errors) ? response.errors[0] : null;
  const code = String(first?.extensions?.code || '');
  const message = typeof first?.message === 'string' ? first.message : '';
  if (code === 'KS_ACCESS_DENIED') return { status: 'forbidden', message: 'You don’t have permission to change owners for this host.', values };
  if (code === 'KS_VALIDATION_FAILURE') {
    const reasons = message.split('\n').filter((line: string) => line.trim().startsWith('- ')).map((line: string) => line.trim().slice(2).replace(/^[A-Za-z]+\.[A-Za-z]+:\s*/, '')).filter((line: string) => line.length <= 300);
    return { status: 'invalid', message: reasons.join(' ') || 'Some details are invalid. Review them and try again.', values };
  }
  if (/unique constraint/i.test(message)) return { status: 'conflict', message: duplicateMessage, values };
  return { status: 'error', message: 'That didn’t go through. Refresh the owner list before trying again.', values };
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

export async function generateOwnerStatementAction(_state: FinanceFormState, formData: FormData): Promise<FinanceFormState> {
  const values = { ownerId: field(formData, 'ownerId'), periodStart: field(formData, 'periodStart'), periodEnd: field(formData, 'periodEnd'), currencyCode: field(formData, 'currencyCode').toUpperCase() || 'USD' };
  if (!values.ownerId) return { status: 'invalid', message: 'Choose an owner.', values };
  if (!DATE_ONLY.test(values.periodStart) || !DATE_ONLY.test(values.periodEnd)) return { status: 'invalid', message: 'Choose a period start and end date.', values };
  if (values.periodEnd <= values.periodStart) return { status: 'invalid', message: 'Period end must be after the period start.', values };
  if (!/^[A-Z]{3}$/.test(values.currencyCode)) return { status: 'invalid', message: 'Use a three-letter currency code such as USD.', values };
  const response = await keystoneClient<any>(`
    mutation GenerateOwnerStatement($ownerId: ID!, $periodStart: String!, $periodEnd: String!, $currencyCode: String) {
      generateOwnerStatement(ownerId: $ownerId, periodStart: $periodStart, periodEnd: $periodEnd, currencyCode: $currencyCode)
    }
  `, values);
  if (!response.success) return commandFailure(response, values);
  revalidatePath(PAYOUTS);
  const statement = response.data.generateOwnerStatement;
  return { status: 'success', message: statement?.statementNumber ? `Draft ${statement.statementNumber} is ready to review.` : 'Draft statement generated.', values: {}, statementId: statement?.id || undefined };
}

export async function transitionOwnerStatementAction(_state: FinanceFormState, formData: FormData): Promise<FinanceFormState> {
  const values = {
    statementId: field(formData, 'statementId'),
    transition: field(formData, 'transition'),
    reference: field(formData, 'reference'),
    amount: field(formData, 'amountCents'),
    currencyCode: field(formData, 'currencyCode').toUpperCase(),
    paidOn: field(formData, 'paidOn'),
    payee: field(formData, 'payee'),
    method: field(formData, 'method'),
    custody: field(formData, 'custody'),
    operationKey: field(formData, 'operationKey'),
  };
  if (!values.statementId || !values.transition) return { status: 'invalid', message: 'Choose a statement action.', values };
  // Paying records the operator's structured evidence of a transfer made outside the app.
  const transfer = values.transition === 'pay' && values.amount ? {
    amountCents: Number(values.amount),
    currencyCode: values.currencyCode,
    paidOn: values.paidOn,
    payee: values.payee,
    method: values.method,
    reference: values.reference,
    custody: values.custody,
    attested: field(formData, 'attested') === 'on',
  } : null;
  const response = await keystoneClient<any>(`
    mutation TransitionOwnerStatement($statementId: ID!, $transition: String!, $reference: String, $transfer: JSON, $operationKey: String) {
      transitionOwnerStatement(statementId: $statementId, transition: $transition, reference: $reference, transfer: $transfer, operationKey: $operationKey)
    }
  `, { statementId: values.statementId, transition: values.transition, reference: values.reference || null, transfer, operationKey: values.operationKey || null });
  if (!response.success) return commandFailure(response, values);
  revalidatePath(PAYOUTS);
  revalidatePath(`${PAYOUTS}/statements/${encodeURIComponent(values.statementId)}`);
  return { status: 'success', message: 'Statement updated.', values: {} };
}

const payoutSchedules = ['monthly', 'quarterly', 'manual'];

export async function createPropertyOwnerAction(_state: FinanceFormState, formData: FormData): Promise<FinanceFormState> {
  const values = {
    hostOrganizationId: field(formData, 'hostOrganizationId'),
    displayName: field(formData, 'displayName'),
    companyName: field(formData, 'companyName'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    ownerNumber: field(formData, 'ownerNumber').toUpperCase(),
    payoutSchedule: field(formData, 'payoutSchedule') || 'monthly',
    commissionPercent: field(formData, 'commissionPercent'),
  };
  const commission = Math.round(Number(values.commissionPercent) * 100);
  if (!values.hostOrganizationId) return { status: 'invalid', message: 'Choose a host.', values };
  if (values.displayName.length < 2 || values.displayName.length > 120) return { status: 'invalid', message: 'Owner name must be 2 to 120 characters.', values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 320) return { status: 'invalid', message: 'Enter a valid owner email.', values };
  if (!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(values.ownerNumber)) return { status: 'invalid', message: 'Owner number must be 2 to 40 letters, numbers or dashes.', values };
  if (!payoutSchedules.includes(values.payoutSchedule)) return { status: 'invalid', message: 'Choose a payout schedule.', values };
  if (values.commissionPercent === '' || !Number.isInteger(commission) || commission < 0 || commission > 10_000) return { status: 'invalid', message: 'Default commission must be between 0% and 100%.', values };
  const response = await keystoneClient<any>(`
    mutation CreatePropertyOwner($data: PropertyOwnerCreateInput!) { createPropertyOwner(data: $data) { id } }
  `, {
    data: {
      hostOrganization: { connect: { id: values.hostOrganizationId } },
      displayName: values.displayName,
      companyName: values.companyName,
      email: values.email,
      phone: values.phone,
      ownerNumber: values.ownerNumber,
      status: 'active',
      payoutSchedule: values.payoutSchedule,
      payoutMethod: 'manual',
      defaultManagerCommissionBasisPoints: commission,
    },
  });
  if (!response.success || !response.data.createPropertyOwner?.id) return recordFailure(response, values, 'That owner number is already in use.');
  revalidatePath(PAYOUTS);
  return { status: 'success', message: `${values.displayName} added. Assign their properties next.`, values: {} };
}

export async function createOwnerAssignmentAction(_state: FinanceFormState, formData: FormData): Promise<FinanceFormState> {
  const values = {
    ownerId: field(formData, 'ownerId'),
    propertyId: field(formData, 'propertyId'),
    ownershipPercent: field(formData, 'ownershipPercent'),
    commissionPercent: field(formData, 'commissionPercent'),
    effectiveFrom: field(formData, 'effectiveFrom'),
    effectiveTo: field(formData, 'effectiveTo'),
  };
  const ownership = Math.round(Number(values.ownershipPercent) * 100);
  const commission = Math.round(Number(values.commissionPercent) * 100);
  if (!values.ownerId || !values.propertyId) return { status: 'invalid', message: 'Choose an owner and a property.', values };
  if (values.ownershipPercent === '' || !Number.isInteger(ownership) || ownership < 1 || ownership > 10_000) return { status: 'invalid', message: 'Ownership must be more than 0% and at most 100%.', values };
  if (values.commissionPercent === '' || !Number.isInteger(commission) || commission < 0 || commission > 10_000) return { status: 'invalid', message: 'Commission must be between 0% and 100%.', values };
  if (!DATE_ONLY.test(values.effectiveFrom)) return { status: 'invalid', message: 'Choose the date the assignment starts.', values };
  if (values.effectiveTo && (!DATE_ONLY.test(values.effectiveTo) || values.effectiveTo <= values.effectiveFrom)) return { status: 'invalid', message: 'The end date must be after the start date.', values };

  // Overlapping terms for the same owner and property would split one stay twice; the host is inherited from the owner and property.
  const existing = await keystoneClient<any>(`
    query OwnerAssignmentsForProperty($ownerId: ID!, $propertyId: ID!) {
      propertyOwnerAssignments(where: { owner: { id: { equals: $ownerId } }, property: { id: { equals: $propertyId } } }, take: 200) { id effectiveFrom effectiveTo }
    }
  `, { ownerId: values.ownerId, propertyId: values.propertyId });
  if (!existing.success) return { status: 'error', message: 'Existing assignments couldn’t be checked. Try again.', values };
  const overlaps = (existing.data.propertyOwnerAssignments || []).some((assignment: any) => (!values.effectiveTo || !assignment.effectiveFrom || assignment.effectiveFrom < values.effectiveTo)
    && (!assignment.effectiveTo || values.effectiveFrom < assignment.effectiveTo));
  if (overlaps) return { status: 'conflict', message: 'This owner already has an assignment for that property during those dates. End it first.', values };

  const response = await keystoneClient<any>(`
    mutation CreateOwnerAssignment($data: PropertyOwnerAssignmentCreateInput!) { createPropertyOwnerAssignment(data: $data) { id } }
  `, {
    data: {
      owner: { connect: { id: values.ownerId } },
      property: { connect: { id: values.propertyId } },
      status: 'active',
      ownershipBasisPoints: ownership,
      managerCommissionBasisPoints: commission,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo,
    },
  });
  if (!response.success || !response.data.createPropertyOwnerAssignment?.id) return recordFailure(response, values, 'This owner already has an assignment for that property starting on that date.');
  revalidatePath(PAYOUTS);
  return { status: 'success', message: 'Assignment added.', values: {} };
}
