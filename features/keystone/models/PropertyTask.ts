import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { propertyTaskPriorityOptions, propertyTaskTypeOptions } from '../utils/propertyTaskLifecycle';
import { trackingFields } from './trackingFields';

export const PropertyTask = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadProperties') },
  },
  hooks: hostScopedHooks('canManageProperties'),
  ui: { listView: { initialColumns: ['title', 'taskType', 'property', 'reservation', 'assignee', 'status', 'dueAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.tasks' }),
    property: relationship({ ref: 'Property.tasks' }),
    listing: relationship({ ref: 'Listing.tasks' }),
    reservation: relationship({ ref: 'Reservation.tasks' }),
    taskRule: relationship({ ref: 'TaskRule.tasks' }),
    assignee: relationship({ ref: 'User.assignedPropertyTasks' }),
    idempotencyKey: text({ isIndexed: 'unique' }),
    source: select({
      type: 'string',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Task rule', value: 'task_rule' },
        { label: 'System', value: 'system' },
        { label: 'Channel', value: 'channel' },
      ],
      defaultValue: 'manual',
    }),
    title: text({ validation: { isRequired: true } }),
    taskType: select({
      type: 'string',
      options: propertyTaskTypeOptions,
      defaultValue: 'turnover_cleaning',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Assigned', value: 'assigned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'queued',
    }),
    priority: select({
      type: 'string',
      options: propertyTaskPriorityOptions,
      defaultValue: 'normal',
    }),
    dueAt: timestamp(),
    claimedAt: timestamp(),
    startedAt: timestamp(),
    completedAt: timestamp(),
    cancelledAt: timestamp(),
    checklist: json(),
    completionEvidence: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    completionNotes: text({ ui: { displayMode: 'textarea' } }),
    notes: text({ ui: { displayMode: 'textarea' } }),
    ...trackingFields,
  },
});
