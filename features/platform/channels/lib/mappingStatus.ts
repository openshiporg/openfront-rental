/**
 * Channel mapping health. A mapping (ChannelListing) is healthy when mapped or published;
 * `active` is a connection status, not a mapping status. Connection health is separate.
 */
export type MappingHealth = 'healthy' | 'pending' | 'unhealthy';

export function mappingHealth(status: unknown): MappingHealth {
  if (status === 'mapped' || status === 'published') return 'healthy';
  if (status === 'pending') return 'pending';
  return 'unhealthy';
}

export function connectionHealthy(status: unknown) {
  return status === 'active';
}

/** A mapping that can actually exchange availability: healthy mapping on an active connection. */
export function mappingOperational(mapping: { status?: unknown; channelConnection?: { status?: unknown } | null }) {
  return mappingHealth(mapping.status) === 'healthy' && connectionHealthy(mapping.channelConnection?.status);
}
