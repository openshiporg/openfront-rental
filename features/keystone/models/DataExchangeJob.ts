import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const DataExchangeJob = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadChannels') },
  },
  ui: { listView: { initialColumns: ['direction', 'domain', 'format', 'status', 'channelConnection', 'processedCount', 'completedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.dataExchangeJobs' }),
    channelConnection: relationship({ ref: 'ChannelConnection.dataExchangeJobs' }),
    listing: relationship({ ref: 'Listing' }),
    direction: select({
      type: 'string',
      options: [
        { label: 'Import', value: 'import' },
        { label: 'Export', value: 'export' },
      ],
      defaultValue: 'import',
    }),
    domain: select({
      type: 'string',
      options: [
        { label: 'Availability', value: 'availability' },
        { label: 'Listings', value: 'listings' },
        { label: 'Reservations', value: 'reservations' },
        { label: 'Guests', value: 'guests' },
        { label: 'Owner accounting', value: 'owner_accounting' },
        { label: 'Host archive', value: 'host_archive' },
      ],
      defaultValue: 'availability',
    }),
    format: select({
      type: 'string',
      options: [
        { label: 'iCalendar', value: 'ical' },
        { label: 'JSON', value: 'json' },
        { label: 'CSV', value: 'csv' },
      ],
      defaultValue: 'json',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Partially succeeded', value: 'partially_succeeded' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'pending',
    }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    payloadSha256: text({ validation: { isRequired: true } }),
    sourceLabel: text(),
    processedCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    createdCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    updatedCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    skippedCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    conflictCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    resultSummary: json(),
    errorMessage: text({ ui: { displayMode: 'textarea' } }),
    startedAt: timestamp(),
    completedAt: timestamp(),
    ...trackingFields,
  },
});
