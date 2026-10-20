// Guest-visible conversation records. Hosts see every message in the Inbox;
// guests see their own messages and host replies that were actually sent.
export const GUEST_MESSAGE_MAX_LENGTH = 4000;

export const GUEST_THREAD_MESSAGE_QUERY = 'id direction senderType body status sentAt receivedAt createdAt';

const VISIBLE_HOST_STATUSES = new Set(['sent', 'delivered']);

/** Messages per page on a guest thread; older pages are reached with `messagesBefore`. */
export const GUEST_THREAD_PAGE_SIZE = 100;

/** Position of the oldest message already shown: messages are ordered by (createdAt, id). */
export type GuestThreadCursor = { createdAt: string; id: string };

/**
 * Keystone `where` for messages a guest may see, optionally only those before a cursor.
 * Visibility is filtered in the query (not after a `take`), so drafts and internal notes can
 * never crowd visible messages off a page; the cursor compares the full (createdAt, id)
 * tuple, so messages sharing a timestamp are never skipped at a page boundary.
 */
export function guestVisibleMessageWhere(before?: GuestThreadCursor | null) {
  const visible = '{ OR: [{ AND: [{ direction: { equals: "inbound" } }, { senderType: { equals: "guest" } }] }, { AND: [{ direction: { equals: "outbound" } }, { status: { in: ["sent", "delivered"] } }] }] }';
  if (!before) return visible;
  const at = JSON.stringify(before.createdAt);
  const earlier = `{ OR: [{ createdAt: { lt: ${at} } }, { AND: [{ createdAt: { equals: ${at} } }, { id: { lt: ${JSON.stringify(before.id)} } }] }] }`;
  return `{ AND: [${visible}, ${earlier}] }`;
}

/** The same rule for Prisma reads. */
export function guestVisibleMessagePrismaWhere(before?: GuestThreadCursor | null) {
  const visible = {
    OR: [
      { direction: 'inbound', senderType: 'guest' },
      { direction: 'outbound', status: { in: ['sent', 'delivered'] } },
    ],
  };
  if (!before) return visible;
  const at = new Date(before.createdAt);
  return { AND: [visible, { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: before.id } }] }] };
}

/** A valid `createdAt|id` cursor, or null. */
export function guestThreadCursor(value: unknown): GuestThreadCursor | null {
  if (typeof value !== 'string' || value.length > 120) return null;
  const [at, id] = value.split('|');
  if (!at || !id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : { createdAt: date.toISOString(), id };
}

/** Newest page of guest-visible messages (queried newest first), returned oldest first. */
export function guestThreadPage(messagesNewestFirst: unknown) {
  const rows = Array.isArray(messagesNewestFirst) ? messagesNewestFirst : [];
  const page = rows.slice(0, GUEST_THREAD_PAGE_SIZE).reverse();
  const oldest = page[0];
  return {
    messages: guestVisibleMessages(page),
    earlierMessagesBefore: rows.length > GUEST_THREAD_PAGE_SIZE && oldest?.createdAt && oldest?.id
      ? `${new Date(oldest.createdAt).toISOString()}|${oldest.id}` : null,
  };
}

export function cleanGuestMessage(value: unknown, label = 'Message') {
  const text = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > GUEST_MESSAGE_MAX_LENGTH) throw new Error(`${label} must be ${GUEST_MESSAGE_MAX_LENGTH} characters or fewer.`);
  return text;
}

export function guestVisibleMessages(messages: unknown) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message: any) => message && (
      (message.direction === 'inbound' && message.senderType === 'guest')
      || (message.direction === 'outbound' && VISIBLE_HOST_STATUSES.has(message.status))
    ))
    .map((message: any) => ({
      id: String(message.id),
      from: message.direction === 'inbound' ? 'guest' : 'host',
      body: String(message.body || ''),
      at: message.sentAt || message.receivedAt || message.createdAt || null,
    }));
}

/** Records an inbound guest message and reopens the host Inbox thread. */
export async function appendGuestMessage(tx: any, { conversationId, hostOrganizationId, body, now = new Date() }: {
  conversationId: string;
  hostOrganizationId: string;
  body: string;
  now?: Date;
}) {
  const message = await tx.message.create({
    data: {
      hostOrganizationId,
      conversationId,
      direction: 'inbound',
      senderType: 'guest',
      body,
      status: 'received',
      receivedAt: now,
    },
  });
  await tx.conversation.update({ where: { id: conversationId }, data: { status: 'open', lastMessageAt: now } });
  return message;
}
