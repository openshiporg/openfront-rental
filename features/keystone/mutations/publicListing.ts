import { STAY_LISTING_SELECTION, toPublicListing } from '../utils/stayListing';
import { sellableListingWhere } from '../utils/stayEligibility';
import { GENUINE_REVIEW_FILTER, genuineReviewStats, withGenuineReputation } from '../utils/publicReputation';

const PUBLIC_REVIEW_PAGE = 12;

/** A `publishedAt|id` cursor: reviews strictly older than it in (publishedAt, id) order. */
function reviewCursor(value: unknown) {
  if (typeof value !== 'string' || value.length > 120) return null;
  const [at, id] = value.split('|');
  const date = new Date(at || '');
  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) && !Number.isNaN(date.getTime()) ? { publishedAt: date.toISOString(), id } : null;
}

export async function publicListing(_root: unknown, args: { slug: string; reviewsBefore?: string | null }, context: any) {
  const slug = args.slug?.trim();
  if (!slug) throw new Error('Listing slug is required.');

  const listings = await context.sudo().query.Listing.findMany({
    // A suspended or private host, or a paused or archived property, takes its homes off sale.
    where: { ...sellableListingWhere(), slug: { equals: slug } },
    take: 1,
    query: STAY_LISTING_SELECTION,
  });
  if (!listings[0]) return null;
  // Only published guest reviews, newest first, a page at a time with a stable (publishedAt, id)
  // cursor so older reviews stay reachable: public text, rating, date and the guest's first
  // name. Private feedback, emails and held or removed reviews never leave here.
  const before = reviewCursor(args.reviewsBefore);
  const published = { listing: { id: { equals: listings[0].id } }, ...GENUINE_REVIEW_FILTER };
  const reviews = await context.sudo().query.Review.findMany({
    where: before
      ? { AND: [published, { OR: [{ publishedAt: { lt: before.publishedAt } }, { AND: [{ publishedAt: { equals: before.publishedAt } }, { id: { lt: before.id } }] }] }] }
      : published,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: PUBLIC_REVIEW_PAGE + 1,
    query: 'id overallRating body publishedAt guest { name }',
  });
  const page = reviews.slice(0, PUBLIC_REVIEW_PAGE);
  const oldest = page[page.length - 1];
  const stats = await genuineReviewStats(context.prisma, [listings[0].id]);
  return {
    ...withGenuineReputation(toPublicListing(listings[0]), stats),
    reviewsBefore: before ? `${before.publishedAt}|${before.id}` : null,
    olderReviewsBefore: reviews.length > PUBLIC_REVIEW_PAGE && oldest ? `${new Date(oldest.publishedAt).toISOString()}|${oldest.id}` : null,
    publishedReviews: page.map((review: any) => ({
      id: review.id,
      overallRating: review.overallRating,
      body: review.body || '',
      publishedAt: review.publishedAt,
      author: String(review.guest?.name || '').trim().split(/\s+/)[0] || 'Guest',
    })),
  };
}
