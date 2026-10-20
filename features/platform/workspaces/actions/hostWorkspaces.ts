'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { readBoundedPages } from '@/features/keystone/utils/readBoundedPages';
import { PAGE_SIZE } from '@/features/platform/operations/lib/listParams';
import { isMessageException } from '@/features/platform/operations/lib/operations';
import { allOf, contains, type Where } from '../lib/paging';
import { getListingReadinessIndex } from '../lib/readinessIndex';
import {
  EFFECTIVE_RATE_PLAN_SELECTION, listingSetupWhere, operationalMappingWhere,
  propertySetupCompleteWhere,
} from '../lib/sellability';

const unavailable = 'Workspace data is temporarily unavailable.';
const SCAN_PAGE = 500;
const SCAN_LIMIT = 5000;

type ListInput = { q?: string; view?: string; page?: string };
type CountSpec = Record<string, { list: string; input: string; where: Where }>;

function listInput(input: ListInput) {
  return { q: String(input.q || '').trim().slice(0, 120), view: String(input.view || 'all'), page: input.page };
}

/** One aliased count per entry, so tabs and tiles use exactly the list's filters. */
function countBlock(counts: CountSpec) {
  const entries = Object.entries(counts);
  return {
    params: entries.map(([key, count]) => `$${key}: ${count.input}!`).join(', '),
    fields: entries.map(([key, count]) => `${key}: ${count.list}Count(where: $${key})`).join('\n    '),
    variables: Object.fromEntries(entries.map(([key, count]) => [key, count.where])),
  };
}

/** Runs a paged list query; a page past the end is clamped to the last page. */
async function pagedWorkspace(query: string, variables: Record<string, unknown>, requested?: string) {
  let page = Math.max(1, Number.parseInt(requested || '', 10) || 1);
  let response = await keystoneClient<any>(query, { ...variables, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  if (!response.success) return { data: null, page, error: unavailable };
  const lastPage = Math.max(1, Math.ceil((response.data.matching || 0) / PAGE_SIZE));
  if (page > lastPage) {
    page = lastPage;
    response = await keystoneClient<any>(query, { ...variables, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
    if (!response.success) return { data: null, page, error: unavailable };
  }
  return { data: response.data, page, error: null };
}

async function scan<T>(label: string, query: string, maxItems = SCAN_LIMIT) {
  return readBoundedPages<T>(async (skip, take) => {
    const response = await keystoneClient<any>(query, { skip, take });
    if (!response.success) throw new Error(unavailable);
    return response.data.items || [];
  }, { pageSize: SCAN_PAGE, maxItems, label });
}

function scanError(error: unknown, tooMany: string) {
  return error instanceof Error && error.message.includes('is incomplete') ? tooMany : unavailable;
}

/**
 * Effective rate plans for the pricing workspace (pricing readers only): each listing's plan
 * under the quote rule, read completely or not at all.
 */
async function effectivePlanIndex() {
  try {
    const [listings, plans] = await Promise.all([
      scan<any>('Listing pricing', `query ListingPricingScan($skip: Int!, $take: Int!) {
        items: listings(orderBy: [{ id: asc }], skip: $skip, take: $take) { id currencyCode }
      }`),
      scan<any>('Rate plan pricing', `query RatePlanPricingScan($skip: Int!, $take: Int!) {
        items: ratePlans(where: { status: { equals: "active" } }, orderBy: [{ isDefault: desc }, { createdAt: asc }, { id: asc }], skip: $skip, take: $take) { id listing { id } }
      }`),
    ]);
    const effective = new Map<string, any>();
    for (const plan of plans) if (plan.listing?.id && !effective.has(plan.listing.id)) effective.set(plan.listing.id, plan);
    return {
      effectivePlanIds: [...effective.values()].map((plan: any) => plan.id as string),
      currencies: [...new Set<string>(listings.map((listing: any) => listing.currencyCode).filter(Boolean))].sort(),
      error: null,
    };
  } catch (error) {
    return { effectivePlanIds: [] as string[], currencies: [] as string[], error: scanError(error, `Pricing can’t be checked for more than ${SCAN_LIMIT.toLocaleString('en-US')} listings or active rate plans at once.`) };
  }
}

/* ───────────────────────── Properties ───────────────────────── */

export async function getPropertyReadinessWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  // Bookable comes from the server's quote rules, so readers without pricing access see it truly.
  const readiness = await getListingReadinessIndex();
  if (readiness.error) return { data: null, page: 1, error: readiness.error };
  const views: Record<string, Where> = {
    all: {},
    attention: { AND: [{ status: { not: { equals: 'archived' } } }, { NOT: [propertySetupCompleteWhere] }] },
    // The same server answer as the detail page's listing summary, not a preview of listings.
    ready: { status: { equals: 'active' }, id: { in: readiness.sellablePropertyIds } },
    archived: { status: { equals: 'archived' } },
  };
  const search: Where = q ? { OR: [
    { name: contains(q) }, { internalCode: contains(q) }, { address: { city: contains(q) } }, { address: { publicLocationLabel: contains(q) } },
    { propertyType: contains(q.toLowerCase().replace(/\s+/g, '_')) },
  ] } : {};
  const property = (where: Where) => ({ list: 'properties', input: 'PropertyWhereInput', where });
  const counts = countBlock({
    matching: property(allOf(search, views[view] || {})),
    tabAll: property(search), tabAttention: property(allOf(search, views.attention)), tabReady: property(allOf(search, views.ready)), tabArchived: property(allOf(search, views.archived)),
    total: property({}), active: property({ status: { equals: 'active' } }), ready: property(views.ready), attention: property(views.attention),
    liveListings: { list: 'listings', input: 'ListingWhereInput', where: { status: { equals: 'published' } } },
    openTasks: { list: 'propertyTasks', input: 'PropertyTaskWhereInput', where: { status: { notIn: ['completed', 'cancelled'] } } },
  });
  return pagedWorkspace(`query PropertyReadinessWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
    properties(where: $matching, orderBy: [{ name: asc }, { id: asc }], skip: $skip, take: $take) {
      id name internalCode propertyType status timezone registrationNumber checkInFrom checkOutBy
      address { publicLocationLabel city region countryCode }
      unitsCount
      listingSummary
      openTasksCount: tasksCount(where: { status: { notIn: ["completed", "cancelled"] } })
    }
    ${counts.fields}
  }`, counts.variables, page);
}

/* ───────────────────────── Listings ───────────────────────── */

export async function getListingReadinessWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const readiness = await getListingReadinessIndex();
  if (readiness.error) return { data: null, page: 1, error: readiness.error };
  const views: Record<string, Where> = {
    all: {},
    attention: { AND: [{ status: { equals: 'published' } }, { NOT: [listingSetupWhere(readiness.bookableIds)] }] },
    published: { status: { equals: 'published' } },
    unpublished: { status: { in: ['draft', 'paused'] } },
  };
  const search: Where = q ? { OR: [{ title: contains(q) }, { slug: contains(q) }, { property: { name: contains(q) } }, { accommodationUnit: { name: contains(q) } }] } : {};
  const listing = (where: Where) => ({ list: 'listings', input: 'ListingWhereInput', where });
  const mapping = (where: Where) => ({ list: 'channelListings', input: 'ChannelListingWhereInput', where });
  const counts = countBlock({
    matching: listing(allOf(search, views[view] || {})),
    tabAll: listing(search), tabAttention: listing(allOf(search, views.attention)), tabPublished: listing(allOf(search, views.published)), tabUnpublished: listing(allOf(search, views.unpublished)),
    total: listing({}), published: listing(views.published), attention: listing(views.attention), unpublished: listing(views.unpublished),
    mappings: mapping({}), mappingsNotOperational: mapping({ NOT: [operationalMappingWhere] }),
  });
  return pagedWorkspace(`query ListingReadinessWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
    listings(where: $matching, orderBy: [{ title: asc }, { id: asc }], skip: $skip, take: $take) {
      id title slug description status bookingMode instantBook currencyCode baseNightlyRateCents minimumStay
      property { id name status registrationNumber }
      accommodationUnit { id name status maxGuests }
      mediaCount
      amenitiesCount
      onlineReadiness
      ${EFFECTIVE_RATE_PLAN_SELECTION}
      channelListingsCount
      channelListings(take: 50) { id status channelConnection { id status } }
    }
    ${counts.fields}
  }`, counts.variables, page);
}

/* ───────────────────────── Guests ───────────────────────── */

const activeStayStatuses = ['pending', 'confirmed', 'in_stay'];

export async function getGuestWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const views: Record<string, Where> = {
    all: {},
    upcoming: { reservations: { some: { status: { in: activeStayStatuses } } } },
    verify: { verificationStatus: { not: { equals: 'verified' } }, reservations: { some: { status: { in: ['pending', 'confirmed'] } } } },
    verified: { verificationStatus: { equals: 'verified' } },
  };
  const search: Where = q ? { OR: [{ name: contains(q) }, { email: contains(q) }, { phone: contains(q) }, { reservations: { some: { confirmationCode: contains(q) } } }] } : {};
  const guest = (where: Where) => ({ list: 'guestProfiles', input: 'GuestProfileWhereInput', where });
  const counts = countBlock({
    matching: guest(allOf(search, views[view] || {})),
    tabAll: guest(search), tabUpcoming: guest(allOf(search, views.upcoming)), tabVerify: guest(allOf(search, views.verify)), tabVerified: guest(allOf(search, views.verified)),
    total: guest({}), verify: guest(views.verify),
    activeStays: { list: 'reservations', input: 'ReservationWhereInput', where: { status: { in: activeStayStatuses }, NOT: [{ guest: null }] } },
    openConversations: { list: 'conversations', input: 'ConversationWhereInput', where: { status: { equals: 'open' }, NOT: [{ guest: null }] } },
  });
  return pagedWorkspace(`query GuestWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
    guestProfiles(where: $matching, orderBy: [{ updatedAt: desc }, { id: desc }], skip: $skip, take: $take) {
      id name email phone preferredLanguage verificationStatus marketingConsent updatedAt
      staysCount: reservationsCount
      activeStaysCount: reservationsCount(where: { status: { in: ["pending", "confirmed", "in_stay"] } })
      upcomingStaysCount: reservationsCount(where: { status: { in: ["pending", "confirmed"] } })
      openThreadsCount: conversationsCount(where: { status: { equals: "open" } })
      latestStay: reservations(orderBy: [{ checkInDate: desc }, { id: desc }], take: 1) { id confirmationCode status checkInDate checkOutDate listing { title } }
    }
    ${counts.fields}
  }`, counts.variables, page);
}

/* ───────────────────────── Agreements ───────────────────────── */

export async function getAgreementWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const awaiting: Where = { status: { in: ['draft', 'sent'] } };
  const views: Record<string, Where> = {
    all: {},
    awaiting,
    expired: { ...awaiting, signingTokenExpiresAt: { lt: new Date().toISOString() } },
    review: { status: { equals: 'signed' }, reservation: { status: { in: ['cancelled', 'no_show'] } } },
    signed: { status: { equals: 'signed' } },
    voided: { status: { equals: 'voided' } },
  };
  const search: Where = q ? { OR: [
    { agreementNumber: contains(q) }, { title: contains(q) }, { signerEmail: contains(q) }, { guest: { name: contains(q) } },
    { reservation: { confirmationCode: contains(q) } }, { reservation: { listing: { title: contains(q) } } },
  ] } : {};
  const agreement = (where: Where) => ({ list: 'stayAgreements', input: 'StayAgreementWhereInput', where });
  const counts = countBlock({
    matching: agreement(allOf(search, views[view] || {})),
    ...Object.fromEntries(Object.entries(views).map(([id, where]) => [`tab${id[0].toUpperCase()}${id.slice(1)}`, agreement(allOf(search, where))])),
    total: agreement({}), awaiting: agreement(views.awaiting), expired: agreement(views.expired), review: agreement(views.review), signed: agreement(views.signed), voided: agreement(views.voided),
  });
  return pagedWorkspace(`query AgreementWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
    stayAgreements(where: $matching, orderBy: [{ createdAt: desc }, { id: desc }], skip: $skip, take: $take) {
      id agreementNumber title status signerEmail signedAt signingTokenExpiresAt signingTokenRevokedAt createdAt
      guest { id name verificationStatus }
      reservation { id confirmationCode status checkInDate checkOutDate listing { title } }
    }
    ${counts.fields}
  }`, counts.variables, page);
}

/* ───────────────────────── Pricing ───────────────────────── */

export async function getPricingWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const [pricing, readiness] = await Promise.all([effectivePlanIndex(), getListingReadinessIndex()]);
  if (pricing.error || readiness.error) return { data: null, page: 1, effectivePlanIds: [] as string[], error: pricing.error || readiness.error };
  // A plan priced in another currency than its listing can't sell; listing currencies come from the complete index.
  const currencyMismatch: Where[] = pricing.currencies.map((currency) => ({ listing: { currencyCode: { equals: currency } }, currencyCode: { not: { equals: currency } } }));
  const views: Record<string, Where> = {
    all: {},
    attention: { OR: [{ status: { not: { equals: 'active' } } }, { baseNightlyRateCents: { lte: 0 } }, { cancellationPolicy: null }, { listing: null }, ...currencyMismatch] },
    active: { status: { equals: 'active' } },
    inactive: { status: { not: { equals: 'active' } } },
  };
  const search: Where = q ? { OR: [{ name: contains(q) }, { listing: { title: contains(q) } }, { cancellationPolicy: { name: contains(q) } }] } : {};
  const plan = (where: Where) => ({ list: 'ratePlans', input: 'RatePlanWhereInput', where });
  const unpricedLive: Where = { status: { equals: 'published' }, id: { notIn: readiness.pricedIds } };
  const counts = countBlock({
    matching: plan(allOf(search, views[view] || {})),
    tabAll: plan(search), tabAttention: plan(allOf(search, views.attention)), tabActive: plan(allOf(search, views.active)), tabInactive: plan(allOf(search, views.inactive)),
    total: plan({}), active: plan(views.active), attention: plan(views.attention),
    liveListings: { list: 'listings', input: 'ListingWhereInput', where: { status: { equals: 'published' } } },
    unpricedLiveListings: { list: 'listings', input: 'ListingWhereInput', where: unpricedLive },
    activeSeasons: { list: 'seasonalRates', input: 'SeasonalRateWhereInput', where: { isActive: { equals: true } } },
  });
  const result = await pagedWorkspace(`query PricingWorkspace($skip: Int!, $take: Int!, $unpricedLive: ListingWhereInput!, ${counts.params}) {
    ratePlans(where: $matching, orderBy: [{ name: asc }, { id: asc }], skip: $skip, take: $take) {
      id name status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault
      listing { id title status currencyCode advanceNoticeHours bookingWindowDays }
      cancellationPolicy { id name }
      activeSeasonsCount: seasonalRatesCount(where: { isActive: { equals: true } })
      nextSeason: seasonalRates(where: { isActive: { equals: true } }, orderBy: [{ startDate: asc }, { id: asc }], take: 1) { id name startDate endDate }
    }
    unpricedListings: listings(where: $unpricedLive, orderBy: [{ title: asc }, { id: asc }], take: 10) { id title }
    ${counts.fields}
  }`, { ...counts.variables, unpricedLive }, page);
  return { ...result, effectivePlanIds: pricing.effectivePlanIds };
}

/* ───────────────────────── Inbox ───────────────────────── */

/** Open threads whose latest message is unanswered or failed, from a complete read of open threads. */
async function needsReplyConversationIds() {
  try {
    const open = await scan<any>('Open conversations', `query OpenConversationScan($skip: Int!, $take: Int!) {
      items: conversations(where: { status: { equals: "open" } }, orderBy: [{ id: asc }], skip: $skip, take: $take) {
        id latest: messages(orderBy: [{ createdAt: desc }, { id: desc }], take: 1) { direction status }
      }
    }`);
    return { ids: open.filter((conversation: any) => isMessageException(conversation.latest?.[0])).map((conversation: any) => conversation.id as string), error: null };
  } catch (error) {
    return { ids: [] as string[], error: scanError(error, `Replies can’t be checked for more than ${SCAN_LIMIT.toLocaleString('en-US')} open conversations at once.`) };
  }
}

export async function getInboxWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const needsReply = await needsReplyConversationIds();
  if (needsReply.error) return { data: null, page: 1, needsReplyIds: [] as string[], error: needsReply.error };
  const views: Record<string, Where> = {
    all: {},
    reply: { id: { in: needsReply.ids } },
    failed: { messages: { some: { status: { equals: 'failed' } } } },
    open: { status: { equals: 'open' } },
    snoozed: { status: { equals: 'snoozed' } },
    archived: { status: { equals: 'archived' } },
  };
  const search: Where = q ? { OR: [
    { guest: { name: contains(q) } }, { subject: contains(q) }, { listing: { title: contains(q) } },
    { reservation: { confirmationCode: contains(q) } }, { messages: { some: { body: contains(q) } } },
  ] } : {};
  const conversation = (where: Where) => ({ list: 'conversations', input: 'ConversationWhereInput', where });
  const counts = countBlock({
    matching: conversation(allOf(search, views[view] || {})),
    ...Object.fromEntries(Object.entries(views).map(([id, where]) => [`tab${id[0].toUpperCase()}${id.slice(1)}`, conversation(allOf(search, where))])),
    total: conversation({}), open: conversation(views.open), failed: conversation(views.failed),
    viaChannels: conversation({ NOT: [{ channelConnection: null }] }),
  });
  const result = await pagedWorkspace(`query InboxWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
    conversations(where: $matching, orderBy: [{ lastMessageAt: desc }, { id: desc }], skip: $skip, take: $take) {
      id subject status lastMessageAt externalThreadId
      guest { id name verificationStatus }
      listing { id title }
      reservation { id confirmationCode status checkInDate checkOutDate }
      channelConnection { id name provider status }
      failedMessagesCount: messagesCount(where: { status: { equals: "failed" } })
      latest: messages(orderBy: [{ createdAt: desc }, { id: desc }], take: 1) { id direction senderType body status sentAt receivedAt createdAt }
    }
    ${counts.fields}
  }`, counts.variables, page);
  return { ...result, needsReplyIds: needsReply.ids };
}

/* ───────────────────────── Payments ───────────────────────── */

const settledPaymentStatuses = ['succeeded', 'partially_refunded', 'refunded'];
const openRefundStatuses = ['pending', 'processing', 'failed'];

/**
 * Settled net and refunds owed, per currency, from complete reads; `null` when too many to
 * total here. Judged per payment, never per booking: test and setup-sample tender are not real
 * money and are left out; recorded real money counts on any stay.
 */
async function paymentTotals() {
  try {
    const [payments, refunds] = await Promise.all([
      scan<any>('Settled payments', `query SettledPaymentScan($skip: Int!, $take: Int!) {
        items: payments(where: { status: { in: ["succeeded", "partially_refunded", "refunded"] }, NOT: [{ provider: { equals: "pp_stripe_stripe" } }] }, orderBy: [{ id: asc }], skip: $skip, take: $take) { amountCents refundedAmountCents currencyCode tenderKind }
      }`, 20_000),
      scan<any>('Open refunds', `query OpenRefundScan($skip: Int!, $take: Int!) {
        items: refunds(where: { status: { in: ["pending", "processing", "failed"] }, NOT: [{ payment: { provider: { equals: "pp_stripe_stripe" } } }, { payment: null, reservation: { testMode: { equals: true } } }] }, orderBy: [{ id: asc }], skip: $skip, take: $take) { amountCents currencyCode payment { tenderKind } }
      }`),
    ]);
    const real = (kind?: string | null) => !kind || !['test', 'sample'].includes(kind);
    return {
      settledNet: payments.filter((payment: any) => real(payment.tenderKind)).map((payment: any) => ({ currencyCode: payment.currencyCode, cents: (payment.amountCents || 0) - (payment.refundedAmountCents || 0) })),
      refundsOwed: refunds.filter((refund: any) => real(refund.payment?.tenderKind)).map((refund: any) => ({ currencyCode: refund.currencyCode, cents: refund.amountCents || 0 })),
      error: null,
    };
  } catch (error) {
    return { settledNet: null, refundsOwed: null, error: scanError(error, 'Too many payments to total here.') };
  }
}

export async function getPaymentWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const views: Record<string, Where> = {
    all: {},
    exceptions: { OR: [
      { status: { in: ['failed', 'cancelled', 'partially_refunded', 'refunded'] } },
      { errorMessage: { not: { equals: '' } } },
      { refunds: { some: { status: { in: openRefundStatuses } } } },
    ] },
    processing: { status: { in: ['pending', 'processing'] } },
    succeeded: { status: { equals: 'succeeded' } },
  };
  const search: Where = q ? { OR: [
    { reservation: { confirmationCode: contains(q) } }, { reservation: { guest: { name: contains(q) } } }, { reservation: { listing: { title: contains(q) } } },
    { providerPaymentId: contains(q) }, { provider: contains(q) },
  ] } : {};
  const payment = (where: Where) => ({ list: 'payments', input: 'PaymentWhereInput', where });
  const counts = countBlock({
    matching: payment(allOf(search, views[view] || {})),
    tabAll: payment(search), tabExceptions: payment(allOf(search, views.exceptions)), tabProcessing: payment(allOf(search, views.processing)), tabSucceeded: payment(allOf(search, views.succeeded)),
    total: payment({}), exceptions: payment(views.exceptions), processing: payment(views.processing), settled: payment({ status: { in: settledPaymentStatuses } }),
    providersInstalled: { list: 'paymentProviders', input: 'PaymentProviderWhereInput', where: { isInstalled: { equals: true } } },
    providers: { list: 'paymentProviders', input: 'PaymentProviderWhereInput', where: {} },
  });
  const [result, totals] = await Promise.all([
    pagedWorkspace(`query PaymentWorkspace($skip: Int!, $take: Int!, ${counts.params}) {
      paymentProviders(orderBy: [{ name: asc }, { id: asc }], take: 50) { id name code isInstalled }
      payments(where: $matching, orderBy: [{ createdAt: desc }, { id: desc }], skip: $skip, take: $take) {
        id amountCents refundedAmountCents currencyCode status paymentMethod provider tenderKind providerPaymentId processedAt errorMessage createdAt
        paymentProvider { id name code isInstalled }
        reservation { id confirmationCode status testMode fixtureOrigin guest { name } listing { title } }
        openRefunds: refunds(where: { status: { in: ["pending", "processing", "failed"] } }, orderBy: [{ createdAt: desc }, { id: desc }], take: 50) { id amountCents currencyCode }
      }
      ${counts.fields}
    }`, counts.variables, page),
    paymentTotals(),
  ]);
  return { ...result, totals };
}

/* ───────────────────────── Reviews ───────────────────────── */

export async function getReviewWorkspace(input: ListInput = {}) {
  const { q, view, page } = listInput(input);
  const views: Record<string, Where> = {
    all: {},
    recovery: { direction: { equals: 'guest_to_host' }, overallRating: { lte: 3 }, status: { not: { equals: 'removed' } } },
    unpublished: { status: { in: ['draft', 'submitted'] } },
    published: { status: { equals: 'published' } },
  };
  const search: Where = q ? { OR: [{ listing: { title: contains(q) } }, { guest: { name: contains(q) } }, { reservation: { confirmationCode: contains(q) } }, { body: contains(q) }] } : {};
  const review = (where: Where) => ({ list: 'reviews', input: 'ReviewWhereInput', where });
  const rated: Where = { reviewCount: { gt: 0 } };
  const counts = countBlock({
    matching: review(allOf(search, views[view] || {})),
    tabAll: review(search), tabRecovery: review(allOf(search, views.recovery)), tabUnpublished: review(allOf(search, views.unpublished)), tabPublished: review(allOf(search, views.published)),
    total: review({}), recovery: review(views.recovery), unpublished: review(views.unpublished), submitted: review({ status: { equals: 'submitted' } }), published: review(views.published),
    ratedListings: { list: 'listings', input: 'ListingWhereInput', where: rated },
  });
  return pagedWorkspace(`query ReviewWorkspace($skip: Int!, $take: Int!, $rated: ListingWhereInput!, ${counts.params}) {
    reviews(where: $matching, orderBy: [{ createdAt: desc }, { id: desc }], skip: $skip, take: $take) {
      id direction status overallRating cleanlinessRating accuracyRating communicationRating locationRating valueRating body privateFeedback submittedAt publishAfter publishedAt createdAt
      guest { id name }
      listing { id title }
      reservation { id confirmationCode status checkOutDate }
    }
    lowestRated: listings(where: $rated, orderBy: [{ reviewAverageHundredths: asc }, { id: asc }], take: 25) { id title status reviewAverageHundredths reviewCount }
    ${counts.fields}
  }`, { ...counts.variables, rated }, page);
}

/* ───────────────────────── Add property ───────────────────────── */

/** Host organizations the operator belongs to (every host for platform administrators), excluding archived ones. */
export async function getPropertyCreateHosts() {
  const response = await keystoneClient<any>(`query PropertyCreateHosts {
    hostOrganizations(where: { status: { not: { equals: "archived" } } }, orderBy: [{ name: asc }, { id: asc }], take: 200) { id name }
    hostOrganizationsCount(where: { status: { not: { equals: "archived" } } })
  }`);
  if (!response.success) return { hosts: [] as Array<{ id: string; name: string }>, total: 0, error: 'Host organizations are temporarily unavailable.' };
  return { hosts: (response.data.hostOrganizations || []) as Array<{ id: string; name: string }>, total: response.data.hostOrganizationsCount || 0, error: null };
}
