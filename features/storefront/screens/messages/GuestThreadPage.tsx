import { Check, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ThreadReplyForm } from '../../components/GuestJourneyForms';
import { SaveTripLink } from '../../components/PrivateTripTools';
import { StorefrontShell } from '../../components/StorefrontShell';
import { GuestMessageList } from '../../components/GuestMessageList';
import { getGuestThread } from '../../lib/data/guest';
import { privateToken, type SearchParams } from '../../lib/navigation';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function GuestThreadPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const { token: rawToken } = await params;
  const token = privateToken(rawToken);
  const query = (await searchParams) || {};
  const messagesBefore = typeof query.messagesBefore === 'string' ? query.messagesBefore : null;
  const { thread } = token ? await getGuestThread(token, messagesBefore) : { thread: null };
  // An unknown, expired or switched-off conversation link is a real 404.
  if (!thread) notFound();

  return <StorefrontShell servicing activeNav="help"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head">
      <p className="stay-overline">Your conversation{thread.hostName ? ` with ${thread.hostName}` : ''}</p>
      <h1>{thread.subject || 'Message to the host'}</h1>
      {thread.listing ? <p>About <Link href={`/stays/${encodeURIComponent(thread.listing.slug)}`}>{thread.listing.title}</Link></p> : null}
    </header>
    {query.sent ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>Message delivered to the host’s inbox. Their reply will appear on this page.{query.emailed ? ' We also emailed you this page’s link.' : ''}</p></div> : null}
    <SaveTripLink path={`/messages/${token}`} label="conversation" />
    <section id="messages" className="stay-panel" aria-labelledby="thread-title">
      <h2 id="thread-title"><MessageSquare size={18} aria-hidden="true" /> Messages</h2>
      {messagesBefore ? <p className="stay-form-note">Showing earlier messages. <Link href={`/messages/${token}#messages`}>Back to the latest</Link></p> : null}
      {thread.earlierMessagesBefore ? <p className="stay-form-note"><Link href={`/messages/${token}?messagesBefore=${encodeURIComponent(thread.earlierMessagesBefore)}#messages`}>Show earlier messages</Link></p> : null}
      <GuestMessageList locale={locale} messages={thread.messages} />
      <ThreadReplyForm token={token} />
      <p className="stay-form-note">Host replies appear on this page. Keep this private link to come back.</p>
    </section>
  </main></StorefrontShell>;
}
export default GuestThreadPage;
