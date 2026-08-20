import { list } from '@keystone-6/core';
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Review = list({
  access: hostScopedListAccess('canReadReviews', 'canManageReviews'),
  hooks: hostScopedHooks('canManageReviews'),
  ui: { listView: { initialColumns: ['reservation', 'listing', 'direction', 'overallRating', 'status', 'publishedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.reviews' }),
    reservation: relationship({ ref: 'Reservation.reviews' }),
    listing: relationship({ ref: 'Listing.reviews' }),
    guest: relationship({ ref: 'GuestProfile.reviews' }),
    authorUser: relationship({ ref: 'User.authoredReviews' }),
    direction: select({
      type: 'string',
      options: [
        { label: 'Guest to Host/Listing', value: 'guest_to_host' },
        { label: 'Host to Guest', value: 'host_to_guest' },
      ],
      defaultValue: 'guest_to_host',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted / Held', value: 'submitted' },
        { label: 'Published', value: 'published' },
        { label: 'Removed', value: 'removed' },
      ],
      defaultValue: 'draft',
    }),
    overallRating: integer({ validation: { min: 1, max: 5 } }),
    cleanlinessRating: integer({ validation: { min: 1, max: 5 } }),
    accuracyRating: integer({ validation: { min: 1, max: 5 } }),
    communicationRating: integer({ validation: { min: 1, max: 5 } }),
    locationRating: integer({ validation: { min: 1, max: 5 } }),
    valueRating: integer({ validation: { min: 1, max: 5 } }),
    body: text({ ui: { displayMode: 'textarea' } }),
    privateFeedback: text({ ui: { displayMode: 'textarea' } }),
    submittedAt: timestamp(),
    publishAfter: timestamp({ ui: { description: 'Publish when both sides submit or the review window closes.' } }),
    publishedAt: timestamp(),
    ...trackingFields,
  },
});
