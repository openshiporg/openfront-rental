import { keystoneContext } from '@/features/keystone/context';
import { calendarFeedKeyMatches } from '@/features/keystone/lib/calendarFeed';
import { listingAvailabilityCalendar } from '@/features/keystone/mutations/calendarExchange';

export const dynamic = 'force-dynamic';

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/** Subscription URL other channels poll: busy/free nights for one listing, keyed by its feed secret. */
export async function GET(_request: Request, { params }: { params: Promise<{ listingId: string; feed: string }> }) {
  const { listingId, feed } = await params;
  const key = feed.endsWith('.ics') ? feed.slice(0, -4) : feed;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(listingId) || !calendarFeedKeyMatches(listingId, key)) return notFound();
  const prisma = (keystoneContext as any).sudo().prisma;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, title: true, status: true, hostOrganizationId: true } });
  if (!listing?.hostOrganizationId || listing.status === 'archived') return notFound();
  try {
    const calendarText = await listingAvailabilityCalendar(prisma, { id: listing.id, title: listing.title, hostOrganizationId: listing.hostOrganizationId });
    return new Response(calendarText.calendarText, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${listing.id}.ics"`,
        // Channels poll every few hours; a short cache absorbs bursts without hiding new bookings for long.
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return new Response('Calendar temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' } });
  }
}
