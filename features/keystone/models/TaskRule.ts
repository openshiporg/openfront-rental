import { list } from '@keystone-6/core';
import { checkbox, integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const TaskRule = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties'),
  ui: { listView: { initialColumns: ['name', 'trigger', 'property', 'taskType', 'priority', 'isActive'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.taskRules' }),
    property: relationship({ ref: 'Property.taskRules' }),
    listing: relationship({ ref: 'Listing' }),
    defaultAssignee: relationship({ ref: 'User' }),
    code: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    name: text({ validation: { isRequired: true } }),
    trigger: select({
      type: 'string',
      options: [
        { label: 'Reservation confirmed', value: 'reservation_confirmed' },
        { label: 'Before check-in', value: 'before_check_in' },
        { label: 'After check-out', value: 'after_check_out' },
        { label: 'Reservation cancelled', value: 'reservation_cancelled' },
        { label: 'Calendar schedule', value: 'calendar_schedule' },
      ],
      defaultValue: 'after_check_out',
    }),
    offsetMinutes: integer({ defaultValue: 0 }),
    taskType: select({
      type: 'string',
      options: [
        { label: 'Turnover Cleaning', value: 'turnover_cleaning' },
        { label: 'Readiness Inspection', value: 'readiness_inspection' },
        { label: 'Property Maintenance', value: 'property_maintenance' },
        { label: 'Guest Request', value: 'guest_request' },
        { label: 'Restocking', value: 'restocking' },
        { label: 'Check-in Support', value: 'check_in_support' },
      ],
      defaultValue: 'turnover_cleaning',
    }),
    titleTemplate: text({ validation: { isRequired: true } }),
    priority: select({
      type: 'string',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
      defaultValue: 'normal',
    }),
    checklistTemplate: json({ defaultValue: [] }),
    isActive: checkbox({ defaultValue: true }),
    tasks: relationship({ ref: 'PropertyTask.taskRule', many: true }),
    ...trackingFields,
  },
});
