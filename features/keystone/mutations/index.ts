import { mergeSchemas } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';

import { captureStayPayment } from './captureStayPayment';
import { amendConfirmedStay } from './amendConfirmedStay';
import { exportListingCalendar, importListingCalendar } from './calendarExchange';
import { createStayReservation, recoverStayCheckout } from './createStayReservation';
import { cancelStayQuote } from './cancelStayQuote';
import { initiateStayPayment } from './initiateStayPayment';
import { startGuestStayPayment, completeGuestStayPayment } from './guestStayPayment';
import { exportHostArchive, hostOperationsReport, hostReportingResolvers, hostReportingTypeDefs } from './hostReporting';
import { generateOwnerStatement, ownerFinanceResolvers, ownerFinanceTypeDefs, transitionOwnerStatement } from './ownerStatements';
import { createPropertyTask, propertyTaskRuleResolvers, propertyTaskRuleTypeDefs, transitionPropertyTask } from './propertyTasks';
import { publicListing } from './publicListing';
import { publicMarketplaceSettings } from './publicMarketplaceSettings';
import { publicStayAgreement } from './publicStayAgreement';
import { publicStayQuote } from './publicStayQuote';
import { publicTrip } from './publicTrip';
import redirectToInit from './redirectToInit';
import { requestStayCancellation } from './requestStayCancellation';
import { reassignStayReservation } from './reassignStayReservation';
import { searchStays } from './searchStays';
import { signStayAgreement } from './signStayAgreement';
import { createDamageClaim, refundStayPayment, transitionDamageClaim, transitionSecurityDeposit } from './stayFinancialOperations';
import { quoteStay } from './quoteStay';
import { transitionStayReservation } from './transitionStayReservation';
import { guestJourneyResolvers, guestJourneyTypeDefs } from './guestJourneys';
import { hostLifecycleResolvers, hostLifecycleTypeDefs } from './hostLifecycle';
import { bookingRuleResolvers, bookingRuleTypeDefs } from './bookingRules';
import { listingReadinessResolvers, listingReadinessTypeDefs } from './listingReadinessIndex';
import { updateOnboardingStatus } from './updateOnboardingStatus';
import { rentalOnboarding } from '../onboarding/rentalOnboarding';
import { installCalendarBlockGraphqlBoundary } from '../utils/calendarBlockGraphqlBoundary';
import { outboxDeliveryResolvers, outboxDeliveryTypeDefs } from '../workers/outboxDelivery';

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  installCalendarBlockGraphqlBoundary(baseSchema);
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: [graphql`
      type PublicMarketplaceSettingsResult {
        status: String!
        id: ID
        name: String
        tagline: String
        homepageHeadline: String
        publicDescription: String
        supportEmail: String
        supportPhone: String
        supportHours: String
        officeAddress: String
        privacyPolicyUrl: String
        privacyPolicyVersion: String
        termsUrl: String
        termsVersion: String
        testBookingsAvailable: Boolean
        currencyCode: String
        locale: String
        timezone: String
        defaultMapLatitude: Float
        defaultMapLongitude: Float
        accentHue: Int
        logoIcon: String
        logoColor: String
      }

      type SearchStaysResult {
        totalCount: Int!
        offset: Int!
        limit: Int!
        results: [JSON!]!
        collections: JSON
      }

      type QuoteStayResult {
        id: ID!
        quoteNumber: String!
        token: String!
        checkInDate: String!
        checkOutDate: String!
        currencyCode: String!
        lodgingSubtotalCents: Int!
        feeTotalCents: Int!
        taxTotalCents: Int!
        securityDepositCents: Int!
        totalAmountCents: Int!
        expiresAt: String!
        listing: JSON
        breakdown: JSON!
      }

      type CreateStayReservationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        paymentStatus: String!
        checkInDate: String!
        checkOutDate: String!
        currencyCode: String!
        totalAmountCents: Int!
        listing: JSON
        tripToken: String!
        "Null when a recovered receipt's agreement link was reissued, revoked or expired since booking."
        agreementToken: String
        recovered: Boolean
        testMode: Boolean
      }

      type CancelStayQuoteResult {
        id: ID!
        quoteNumber: String!
        status: String!
      }

      type StayReservationMutationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        paymentStatus: String
        checkInDate: String
        checkOutDate: String
        totalAmountCents: Int
        amountPaidCents: Int
      }

      type StayCancellationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        refundPendingCents: Int!
        "Refunds opened for the host's review (not owed until assessed)."
        refundReviewCents: Int
        refundAssessment: String
      }

      type StayAgreementMutationResult {
        id: ID!
        agreementNumber: String!
        status: String!
        signatureName: String
        signedAt: String
      }

      type StayPaymentResult {
        id: ID!
        amountCents: Int!
        status: String!
        provider: String
        providerPaymentId: String
        idempotencyKey: String
        currencyCode: String!
        processedAt: String
        data: JSON
      }

      type OnboardingStatusResult {
        id: ID!
        onboardingStatus: String
      }

      type Query {
        redirectToInit: Boolean
        publicMarketplaceSettings: PublicMarketplaceSettingsResult!
        searchStays(
          destination: String
          checkIn: String
          checkOut: String
          adults: Int
          children: Int
          infants: Int
          pets: Int
          propertyTypes: [String!]
          amenitySlugs: [String!]
          bedrooms: Int
          beds: Int
          bathroomsHalfUnits: Int
          minTotalCents: Int
          maxTotalCents: Int
          instantBook: Boolean
          listingIds: [ID!]
          collectionSlug: String
          offset: Int
          limit: Int
        ): SearchStaysResult!
        publicListing(slug: String!, reviewsBefore: String): JSON
        publicStayAgreement(token: String!): JSON
        publicStayQuote(token: String!): JSON
        publicTrip(token: String!, messagesBefore: String): JSON
        hostOperationsReport(hostOrganizationId: ID!, startDate: String!, endDate: String!): JSON!
      }

      type Mutation {
        quoteStay(
          listingId: ID!
          checkIn: String!
          checkOut: String!
          adults: Int!
          children: Int
          infants: Int
          pets: Int
        ): QuoteStayResult!

        createStayReservation(
          quoteToken: String!
          guestName: String!
          guestEmail: String!
          guestPhone: String
          invitedGuests: JSON
          guestNotes: String
          acceptedTermsVersion: String
          acceptedStoreTermsVersion: String
          privacyNoticeVersion: String
          simulation: Boolean
          receiptKey: String
        ): CreateStayReservationResult!
        "Returns the receipt of a checkout this same browser already completed (24 hours, same key and session)."
        recoverStayCheckout(quoteToken: String!, receiptKey: String!): CreateStayReservationResult
        cancelStayQuote(quoteId: ID!): CancelStayQuoteResult!

        requestStayCancellation(tripToken: String!, reason: String, confirmCancellation: Boolean, expectedRefundCents: Int, expectedAssessmentId: String): StayCancellationResult!
        signStayAgreement(token: String!, signatureName: String!, acceptTerms: Boolean): StayAgreementMutationResult!

        transitionStayReservation(
          reservationId: ID!
          transition: String!
          note: String
        ): StayReservationMutationResult!

        reassignStayReservation(
          reservationId: ID!
          targetAccommodationUnitId: ID!
          reason: String!
        ): JSON!

        amendConfirmedStay(
          reservationId: ID!
          expectedCheckInDate: String!
          expectedCheckOutDate: String!
          checkInDate: String!
          checkOutDate: String!
          reason: String!
          idempotencyKey: String!
        ): JSON!

        """Opens one manual receipt. \`operationKey\` identifies this submission: the same key returns the same receipt."""
        initiateStayPayment(
          reservationId: ID!
          paymentProviderCode: String
          amountCents: Int
          operationKey: String!
        ): StayPaymentResult!

        captureStayPayment(paymentId: ID!): StayPaymentResult!
        startGuestStayPayment(tripToken: String!): JSON!
        completeGuestStayPayment(tripToken: String!, paymentId: ID!): JSON!

        generateOwnerStatement(ownerId: ID!, periodStart: String!, periodEnd: String!, currencyCode: String): JSON!
        "Approve, send, pay or void an owner statement. Paying needs structured transfer evidence (amount, currency, date, payee, method, reference, custody, attestation)."
        transitionOwnerStatement(statementId: ID!, transition: String!, reference: String, transfer: JSON, operationKey: String): JSON!
        createOperationsTask(
          propertyId: ID!
          listingId: ID
          reservationId: ID
          assigneeId: ID
          title: String!
          taskType: String!
          priority: String
          dueAt: String
          notes: String
        ): JSON!
        transitionPropertyTask(
          taskId: ID!
          action: String!
          assigneeId: ID
          completionNotes: String
          completionEvidence: JSON
        ): JSON!
        importListingCalendar(channelConnectionId: ID!, listingId: ID!, calendarText: String!, sourceLabel: String): JSON!
        exportListingCalendar(listingId: ID!): JSON!
        exportHostArchive(hostOrganizationId: ID!): JSON!
        refundStayPayment(paymentId: ID!, refundId: ID, operationKey: String!, amountCents: Int!, reason: String, confirmFundsReturned: Boolean!, manualEvidenceReference: String!): JSON!
        transitionSecurityDeposit(depositId: ID!, transition: String!, amountCents: Int, reference: String, confirmEvidence: Boolean, operationKey: String): JSON!
        createStayDamageClaim(reservationId: ID!, description: String!, claimedAmountCents: Int!, evidence: JSON): JSON!
        transitionDamageClaim(claimId: ID!, transition: String!, approvedAmountCents: Int, settlementMethod: String, settlementReference: String, confirmSettlement: Boolean, receivedOn: String, custody: String): JSON!

        updateOnboardingStatus(status: String!): OnboardingStatusResult!
        rentalOnboarding(input: JSON!, operationId: String, mode: String!): JSON!
      }
    `, guestJourneyTypeDefs, hostLifecycleTypeDefs, bookingRuleTypeDefs, outboxDeliveryTypeDefs, propertyTaskRuleTypeDefs, hostReportingTypeDefs, ownerFinanceTypeDefs, listingReadinessTypeDefs],
    resolvers: [{
      Query: {
        redirectToInit,
        publicMarketplaceSettings,
        searchStays,
        publicListing,
        publicStayAgreement,
        publicStayQuote,
        publicTrip,
        hostOperationsReport,
      },
      Mutation: {
        quoteStay,
        createStayReservation,
        recoverStayCheckout,
        cancelStayQuote,
        requestStayCancellation,
        signStayAgreement,
        transitionStayReservation,
        reassignStayReservation,
        amendConfirmedStay,
        initiateStayPayment,
        captureStayPayment,
        startGuestStayPayment,
        completeGuestStayPayment,
        generateOwnerStatement,
        transitionOwnerStatement,
        createOperationsTask: createPropertyTask,
        transitionPropertyTask,
        importListingCalendar,
        exportListingCalendar,
        exportHostArchive,
        refundStayPayment,
        transitionSecurityDeposit,
        createStayDamageClaim: createDamageClaim,
        transitionDamageClaim,
        updateOnboardingStatus,
        rentalOnboarding,
      },
    }, guestJourneyResolvers, hostLifecycleResolvers, bookingRuleResolvers, outboxDeliveryResolvers, propertyTaskRuleResolvers, hostReportingResolvers, ownerFinanceResolvers, listingReadinessResolvers],
  });
}
