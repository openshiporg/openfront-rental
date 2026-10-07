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
import { OutboxEvent } from './OutboxEvent';
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

export const models = {
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
  OutboxEvent,
};

export default models;
