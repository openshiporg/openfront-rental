import crypto from 'node:crypto';

export type ICalendarEvent = {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
  status: 'confirmed' | 'cancelled';
};

const MAX_BYTES = 1_000_000;
const MAX_EVENTS = 500;

function dateOnly(value: string, field: string) {
  if (!/^\d{8}$/.test(value)) throw new Error(`${field} must be an iCalendar date-only value.`);
  const formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const parsed = new Date(`${formatted}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== formatted) throw new Error(`${field} is not a valid date.`);
  return formatted;
}

function unescapeText(value: string) {
  return value.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim().slice(0, 500);
}

export function parseICalendar(input: string): ICalendarEvent[] {
  if (typeof input !== 'string' || !input.trim()) throw new Error('iCalendar text is required.');
  if (Buffer.byteLength(input, 'utf8') > MAX_BYTES) throw new Error('iCalendar payload is too large.');
  const lines = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').reduce<string[]>((result, line) => {
    if (/^[ \t]/.test(line) && result.length) result[result.length - 1] += line.slice(1);
    else result.push(line);
    return result;
  }, []);
  if (!lines.includes('BEGIN:VCALENDAR') || !lines.includes('END:VCALENDAR')) throw new Error('Malformed iCalendar document.');
  const events: ICalendarEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      if (current) throw new Error('Nested iCalendar events are invalid.');
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (!current) throw new Error('Malformed iCalendar event.');
      const uid = current.UID?.trim();
      if (!uid || uid.length > 255) throw new Error('Every iCalendar event requires a bounded UID.');
      const startDate = dateOnly(current.DTSTART || '', 'DTSTART');
      const endDate = dateOnly(current.DTEND || '', 'DTEND');
      if (startDate >= endDate) throw new Error('iCalendar event end must be after its start.');
      events.push({ uid, startDate, endDate, summary: unescapeText(current.SUMMARY || 'External calendar hold'), status: current.STATUS?.toUpperCase() === 'CANCELLED' ? 'cancelled' : 'confirmed' });
      if (events.length > MAX_EVENTS) throw new Error('iCalendar event limit exceeded.');
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const name = line.slice(0, separator).split(';')[0].toUpperCase();
    if (['UID', 'DTSTART', 'DTEND', 'SUMMARY', 'STATUS'].includes(name)) current[name] = line.slice(separator + 1);
  }
  if (current) throw new Error('Unclosed iCalendar event.');
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event.uid)) throw new Error(`Duplicate iCalendar UID: ${event.uid}`);
    seen.add(event.uid);
  }
  return events.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.uid.localeCompare(b.uid));
}

function icalDate(value: string) {
  return value.replaceAll('-', '');
}

function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
}

export function exportICalendar(events: ICalendarEvent[], calendarName: string) {
  const body = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.uid.localeCompare(b.uid)).flatMap((event) => [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTART;VALUE=DATE:${icalDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${icalDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.status === 'cancelled' ? ['STATUS:CANCELLED'] : []),
    'END:VEVENT',
  ]);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Openfront Rental//Availability 1.0//EN', `X-WR-CALNAME:${escapeText(calendarName)}`, ...body, 'END:VCALENDAR', ''].join('\r\n');
}

export function iCalendarChecksum(input: string) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
