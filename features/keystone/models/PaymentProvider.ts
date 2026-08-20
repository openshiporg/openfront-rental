import { list } from '@keystone-6/core';
import { checkbox, json, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const PaymentProvider = list({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, '\n\n  @@unique([hostOrganizationId, code])\n}');
    },
  },
  access: hostScopedListAccess('canReadPayments', 'canManagePayments'),
  hooks: hostScopedHooks('canManagePayments'),
  ui: { listView: { initialColumns: ['name', 'code', 'hostOrganization', 'isInstalled'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.paymentProviders' }),
    name: text({ validation: { isRequired: true } }),
    code: text({
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
    payments: relationship({ ref: 'Payment.paymentProvider', many: true }),
    webhookEvents: relationship({ ref: 'PaymentWebhookEvent.paymentProvider', many: true }),
    ...trackingFields,
  },
});
