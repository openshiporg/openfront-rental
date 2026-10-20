/**
 * Connection setups backed by an installed adapter. Any other provider/type pair is a
 * configuration record only and never exchanges data.
 */
export const supportedChannelConnections = [
  { provider: 'ical', connectionType: 'ical', label: 'iCalendar', syncTypes: ['syncAvailability'] },
] as const;

export const unsupportedChannelIntegrations = ['Airbnb API', 'Vrbo API', 'Booking.com API', 'PMS', 'Webhooks'] as const;

export type ChannelSyncType = 'syncAvailability' | 'syncRates' | 'syncReservations' | 'syncMessages';

type ConnectionState = { provider?: unknown; connectionType?: unknown; status?: unknown; syncAvailability?: unknown };

export const calendarImportMappingStatuses = ['mapped', 'published'] as const;

function statusLabel(status: unknown) {
  return typeof status === 'string' && status ? status.replaceAll('_', ' ') : 'not set';
}

export function installedChannelConnection(connection: ConnectionState | null | undefined) {
  return supportedChannelConnections.find((setup) => setup.provider === connection?.provider && setup.connectionType === connection?.connectionType) || null;
}

export function channelSyncTypeSupported(connection: ConnectionState | null | undefined, syncType: ChannelSyncType) {
  const installed = installedChannelConnection(connection);
  return Boolean(installed && (installed.syncTypes as readonly string[]).includes(syncType));
}

/** Why this connection can't import availability right now, or null when it can. */
export function calendarImportConnectionBlocker(connection: ConnectionState | null | undefined): string | null {
  if (!connection) return 'connection unavailable';
  if (connection.provider !== 'ical' || connection.connectionType !== 'ical') return 'adapter not installed';
  if (connection.status !== 'active') return `connection ${statusLabel(connection.status)}`;
  if (connection.syncAvailability !== true) return 'availability sync off';
  return null;
}

export function calendarImportMappingBlocker(mapping: { status?: unknown } | null | undefined): string | null {
  if (!mapping) return 'listing not mapped';
  return (calendarImportMappingStatuses as readonly unknown[]).includes(mapping.status) ? null : `mapping ${statusLabel(mapping.status)}`;
}

const operatorMessage = /^(Calendar |iCalendar |Malformed iCalendar |Nested iCalendar |Every iCalendar |Unclosed iCalendar |Duplicate iCalendar UID|DTSTART |DTEND )/;

/** Calendar validation messages are written for operators; access and database errors stay generic. */
export function calendarImportOperatorMessage(message: unknown): string | null {
  if (typeof message !== 'string' || message.length > 300 || /[\r\n]/.test(message)) return null;
  return operatorMessage.test(message) ? message : null;
}
