import { list } from '@keystone-6/core';
import { checkbox, integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { propertyTaskPriorityOptions, propertyTaskTypeOptions, taskRuleTriggerOptions, unsupportedTaskRuleTriggers } from '../utils/propertyTaskLifecycle';
import { trackingFields } from './trackingFields';

const scopedHooks = hostScopedHooks('canManageProperties');

export const TaskRule = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: {
    ...scopedHooks,
    validate: async (args: any) => {
      await scopedHooks.validate(args);
      const { operation, resolvedData, item, context, addValidationError } = args;
      if (operation === 'delete') return;
      // Existing rules with an unsupported trigger are kept as records; they can't be added, switched to, or switched back on.
      const trigger = resolvedData?.trigger ?? item?.trigger;
      const admitted = operation === 'create'
        || (resolvedData?.trigger !== undefined && resolvedData.trigger !== item?.trigger)
        || (resolvedData?.isActive === true && item?.isActive !== true);
      if (admitted && unsupportedTaskRuleTriggers.includes(trigger)) {
        addValidationError('This trigger isn’t supported yet and would never create tasks. Choose another trigger.');
      }
      const defaultAssigneeId = resolvedData?.defaultAssignee?.connect?.id;
      if (defaultAssigneeId) {
        const user = await context.prisma.user.findUnique({ where: { id: defaultAssigneeId }, select: { isActive: true } });
        if (user?.isActive !== true) addValidationError('The default assignee’s account is inactive.');
      }
    },
  },
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
      options: taskRuleTriggerOptions,
      defaultValue: 'after_check_out',
    }),
    offsetMinutes: integer({ defaultValue: 0 }),
    taskType: select({
      type: 'string',
      options: propertyTaskTypeOptions,
      defaultValue: 'turnover_cleaning',
    }),
    titleTemplate: text({ validation: { isRequired: true } }),
    priority: select({
      type: 'string',
      options: propertyTaskPriorityOptions,
      defaultValue: 'normal',
    }),
    checklistTemplate: json({ defaultValue: [] }),
    isActive: checkbox({ defaultValue: true }),
    tasks: relationship({ ref: 'PropertyTask.taskRule', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
