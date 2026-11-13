import { AccommodationUnit } from './AccommodationUnit';
import { Amenity } from './Amenity';
import { Bed } from './Bed';
import { Bedroom } from './Bedroom';
import { CalendarBlock } from './CalendarBlock';
import { CancellationPolicy } from './CancellationPolicy';
import { ChannelConnection } from './ChannelConnection';
import { ChannelListing } from './ChannelListing';
import { ChannelReservation } from './ChannelReservation';
import { ChannelSyncEvent } from './ChannelSyncEvent';
import { Conversation } from './Conversation';
import { DamageClaim } from './DamageClaim';
import { DataExchangeJob } from './DataExchangeJob';
import { FeeDefinition } from './FeeDefinition';
import { GuestParty } from './GuestParty';
import { GuestProfile } from './GuestProfile';
import { HostMembership } from './HostMembership';
import { HostOrganization } from './HostOrganization';
import { HouseRule } from './HouseRule';
import { Listing } from './Listing';
import { ListingMedia } from './ListingMedia';
import { MarketplaceSettings } from './MarketplaceSettings';
import { Message } from './Message';
import { Payment } from './Payment';
import { PaymentProvider } from './PaymentProvider';
import { PaymentWebhookEvent } from './PaymentWebhookEvent';
import { Payout } from './Payout';
import { OwnerStatement } from './OwnerStatement';
import { OwnerStatementLine } from './OwnerStatementLine';
import { Property } from './Property';
import { PropertyAddress } from './PropertyAddress';
import { PropertyOwner } from './PropertyOwner';
import { PropertyOwnerAssignment } from './PropertyOwnerAssignment';
import { PropertyTask } from './PropertyTask';
import { RatePlan } from './RatePlan';
import { Refund } from './Refund';
import { Reservation } from './Reservation';
import { ReservationAmendment } from './ReservationAmendment';
import { ReservationLineItem } from './ReservationLineItem';
import { Review } from './Review';
import { Role } from './Role';
import { SeasonalRate } from './SeasonalRate';
import { SecurityDeposit } from './SecurityDeposit';
import { StayAgreement } from './StayAgreement';
import { StayCollection } from './StayCollection';
import { StayQuote } from './StayQuote';
import { TaskRule } from './TaskRule';
import { TaxRule } from './TaxRule';
import { User } from './User';

const rawModels = {
  User,
  Role,
  MarketplaceSettings,
  HostOrganization,
  HostMembership,
  Property,
  PropertyAddress,
  PropertyOwner,
  PropertyOwnerAssignment,
  AccommodationUnit,
  Bedroom,
  Bed,
  Amenity,
  Listing,
  ListingMedia,
  StayCollection,
  HouseRule,
  CalendarBlock,
  RatePlan,
  SeasonalRate,
  FeeDefinition,
  TaxRule,
  CancellationPolicy,
  StayQuote,
  GuestProfile,
  GuestParty,
  Reservation,
  ReservationAmendment,
  ReservationLineItem,
  StayAgreement,
  SecurityDeposit,
  DamageClaim,
  Payment,
  PaymentProvider,
  PaymentWebhookEvent,
  Refund,
  Payout,
  OwnerStatement,
  OwnerStatementLine,
  Conversation,
  Message,
  Review,
  TaskRule,
  PropertyTask,
  ChannelConnection,
  ChannelListing,
  ChannelReservation,
  ChannelSyncEvent,
  DataExchangeJob,
};

// Keystone applies neither a field's read access nor the target list's access to where/orderBy, so a role could
// count or sort through a relation (or a read-gated field) into data it cannot read. Every field is therefore
// filterable/orderable only for a session that can read it: a relation needs read access to the target list (the
// User list only when unrestricted), a read-gated field needs its own read access, and token hashes never.
// context.sudo() ignores these settings, so server code is unaffected.
const NEVER_FILTERABLE = /TokenHash$|^tokenHash$/;
const canQueryList = (listKey: string, args: any): boolean => {
  const list: any = (rawModels as any)[listKey];
  const op = list?.access?.operation?.query;
  if (typeof op === 'function' ? !op(args) : op === false) return false;
  const filter = list?.access?.filter?.query;
  if (typeof filter !== 'function') return true;
  const scope = filter(args);
  return scope === true || (scope !== false && !!scope && listKey !== 'User');
};
function filterGuarded(fields: Record<string, any>) {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    if (key.startsWith('__group') || typeof field !== 'function') return [key, field];
    return [key, (data: any) => {
      const f = field(data);
      if (NEVER_FILTERABLE.test(key)) return { ...f, isFilterable: false, isOrderable: false };
      const target: string | undefined = f.dbField?.kind === 'relation' ? f.dbField.list : undefined;
      const read = typeof f.access === 'function' ? f.access : f.access?.read;
      if (!target && typeof read !== 'function') return f;
      const allowed = (own: any) => (args: any) => {
        if (own === false || (typeof own === 'function' && !own(args))) return false;
        if (typeof read === 'function' && !read({ session: args.session, context: args.context, listKey: args.listKey, fieldKey: args.fieldKey, operation: 'read' })) return false;
        return target ? canQueryList(target, args) : true;
      };
      return { ...f, isFilterable: allowed(f.isFilterable), isOrderable: allowed(f.isOrderable) };
    }];
  }));
}
const guardedModels = Object.fromEntries(Object.entries(rawModels).map(([key, config]: [string, any]) => [key, { ...config, fields: filterGuarded(config.fields) }])) as typeof rawModels;

// Sidebar visibility follows the role: a list whose query access denies the session is hidden from navigation
// (Keystone evaluates ui.isHidden per session in admin meta). Explicit isHidden settings are kept.
export const models = Object.fromEntries(Object.entries(guardedModels).map(([key, config]: [string, any]) => {
  const operationQuery = config?.access?.operation?.query;
  const filterQuery = config?.access?.filter?.query;
  if (typeof operationQuery !== 'function' && typeof filterQuery !== 'function') return [key, config];
  const existing = config?.ui?.isHidden;
  const isHidden = (args: any) => {
    if (existing === true || (typeof existing === 'function' && existing(args))) return true;
    if (typeof operationQuery === 'function' && !operationQuery(args)) return true;
    return typeof filterQuery === 'function' && filterQuery(args) === false;
  };
  return [key, { ...config, ui: { ...(config.ui ?? {}), isHidden } }];
})) as typeof rawModels;

export default models;
