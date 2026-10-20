import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, json, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { isSupportedPaymentProviderCode } from '../../integrations/payment';
import { trackingFields } from './trackingFields';

const providerHostHooks = hostScopedHooks('canManagePayments');
const providerAccess = hostScopedListAccess('canReadPayments', 'canManagePayments');

export const PaymentProvider = list({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, '\n\n  @@unique([hostOrganizationId, code])\n}');
    },
  },
  // A provider is turned off, never deleted: its id and code are the lineage its payments,
  // refunds and late events are matched against.
  access: { ...providerAccess, operation: { ...providerAccess.operation, delete: () => false } },
  hooks: {
    ...providerHostHooks,
    validate: async (args: any) => {
      await providerHostHooks.validate(args);
      const { operation, resolvedData, item, context, addValidationError } = args;
      // Only registered adapters can be installed; an unknown historical record stays readable.
      const code = resolvedData?.code ?? item?.code;
      const installing = (resolvedData?.isInstalled ?? item?.isInstalled) === true;
      if ((operation === 'create' || resolvedData?.code !== undefined || resolvedData?.isInstalled === true) && installing && !isSupportedPaymentProviderCode(code)) {
        addValidationError('This payment provider isn’t supported by the store. Use the manual or card provider.');
      }
      // A provider with payment history keeps its identity: disable it instead of renaming or deleting it.
      if ((operation === 'delete' || (operation === 'update' && resolvedData?.code !== undefined && resolvedData.code !== item?.code)) && item?.id) {
        const [payment, event] = await Promise.all([
          context.prisma.payment.findFirst({ where: { paymentProviderId: item.id }, select: { id: true } }),
          context.prisma.paymentWebhookEvent.findFirst({ where: { paymentProviderId: item.id }, select: { id: true } }),
        ]);
        if (payment || event) addValidationError('This provider has payment history. Turn it off instead; its payments and refunds still need it.');
      }
    },
  },
  ui: { listView: { initialColumns: ['name', 'code', 'hostOrganization', 'isInstalled'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.paymentProviders' }),
    name: text({ validation: { isRequired: true } }),
    // Fixed once created, so an in-flight attempt's provider can't be renamed under it.
    code: text({
      access: { update: () => false },
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-zA-Z0-9-_]+$/,
          explanation: 'Payment provider code must start with pp_.',
        },
      },
      isIndexed: true,
    }),
    isInstalled: checkbox({ defaultValue: false }),
    metadata: json({
      defaultValue: {},
      ui: { description: 'Non-secret provider configuration only. Provider secrets are read from server environment variables.' },
    }),
    payments: relationship({
      ref: 'Payment.paymentProvider',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    webhookEvents: relationship({
      ref: 'PaymentWebhookEvent.paymentProvider',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
