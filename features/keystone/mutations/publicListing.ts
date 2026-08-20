import { STAY_LISTING_SELECTION, toPublicListing } from '../utils/stayListing';

export async function publicListing(_root: unknown, args: { slug: string }, context: any) {
  const slug = args.slug?.trim();
  if (!slug) throw new Error('Listing slug is required.');

  const listings = await context.sudo().query.Listing.findMany({
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    take: 1,
    query: STAY_LISTING_SELECTION,
  });
  return listings[0] ? toPublicListing(listings[0]) : null;
}
