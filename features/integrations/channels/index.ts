import * as direct from './direct';
import * as ical from './ical';

export const channelAdapters = {
  direct,
  ical,
} as const;

export type InstalledChannelAdapterCode = keyof typeof channelAdapters;

export function getChannelAdapter<K extends InstalledChannelAdapterCode>(code: K): (typeof channelAdapters)[K];
export function getChannelAdapter(code: string): (typeof channelAdapters)[InstalledChannelAdapterCode];
export function getChannelAdapter(code: string) {
  if (!Object.prototype.hasOwnProperty.call(channelAdapters, code)) {
    throw new Error(`Channel adapter ${code} is not installed.`);
  }
  return channelAdapters[code as InstalledChannelAdapterCode];
}
