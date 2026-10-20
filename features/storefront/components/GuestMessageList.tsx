import Link from 'next/link';
import type { ReactNode } from 'react';

type GuestMessage = { id: string; from: 'guest' | 'host'; body: string; at: string | null };

// Hosts can send a fresh private agreement link; only that exact in-store path becomes a link.
const AGREEMENT_PATH = /\/agreements\/[a-f0-9]{48}\b/g;

function messageBody(body: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of body.matchAll(AGREEMENT_PATH)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(body.slice(last, index));
    parts.push(<Link key={index} href={match[0]} style={{ textDecoration: 'underline' }}>Review and sign the agreement</Link>);
    last = index + match[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

function sentAt(locale: string, value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)} UTC`;
}

export function GuestMessageList({ messages, empty = 'No messages yet.', locale }: { messages: GuestMessage[]; empty?: string; locale: string }) {
  if (!messages.length) return <p className="stay-empty-line">{empty}</p>;
  return <ol className="stay-records" aria-label="Conversation">
    {messages.map(message => <li key={message.id}>
      <strong>{message.from === 'guest' ? 'You' : 'Host'}</strong>
      <span className="stay-muted">{sentAt(locale, message.at)}</span>
      <p style={{ color: 'var(--stay-ink)', fontSize: '.93rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.from === 'host' ? messageBody(message.body) : message.body}</p>
    </li>)}
  </ol>;
}
