/**
 * Public reputation comes only from genuine guest reviews: published, guest-to-host, tied to a
 * real stay (not a setup sample or a test booking). Stored listing counters, including any
 * written by earlier setup runs, are kept as recorded but are not what guests are shown.
 */
export const GENUINE_REVIEW = {
  status: 'published',
  direction: 'guest_to_host',
  publishedAt: { not: null },
  reservation: { fixtureOrigin: null, testMode: false },
} as const;

/** Keystone GraphQL filter for the same reviews. */
export const GENUINE_REVIEW_FILTER = {
  status: { equals: 'published' },
  direction: { equals: 'guest_to_host' },
  publishedAt: { not: null },
  reservation: { fixtureOrigin: { equals: null }, testMode: { equals: false } },
} as const;

/** Count and average (hundredths) of genuine published reviews per listing. */
export async function genuineReviewStats(prisma: any, listingIds: string[]) {
  const stats = new Map<string, { reviewCount: number; reviewAverageHundredths: number }>();
  if (!listingIds.length) return stats;
  const groups = await prisma.review.groupBy({
    by: ['listingId'],
    where: { ...GENUINE_REVIEW, listingId: { in: listingIds } },
    _avg: { overallRating: true },
    _count: { _all: true },
  });
  for (const group of groups) {
    const average = Number(group._avg?.overallRating || 0);
    stats.set(group.listingId, { reviewCount: group._count?._all || 0, reviewAverageHundredths: Math.min(500, Math.max(0, Math.round(average * 100))) });
  }
  return stats;
}

/** Replaces a public listing's stored counters with its genuine review figures. */
export function withGenuineReputation<T extends { id: string }>(listing: T, stats: Map<string, { reviewCount: number; reviewAverageHundredths: number }>) {
  const genuine = stats.get(listing.id) || { reviewCount: 0, reviewAverageHundredths: 0 };
  return { ...listing, reviewCount: genuine.reviewCount, reviewAverageHundredths: genuine.reviewAverageHundredths };
}
