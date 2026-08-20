import { mergeSchemas } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';

import { captureStayPayment } from './captureStayPayment';
import { exportListingCalendar, importListingCalendar } from './calendarExchange';
import { createStayReservation } from './createStayReservation';
import { initiateStayPayment } from './initiateStayPayment';
import { exportHostArchive, hostOperationsReport } from './hostReporting';
import { generateOwnerStatement, transitionOwnerStatement } from './ownerStatements';
import { createPropertyTask, transitionPropertyTask } from './propertyTasks';
import { publicListing } from './publicListing';
import { publicMarketplaceSettings } from './publicMarketplaceSettings';
import { publicStayAgreement } from './publicStayAgreement';
import { publicStayQuote } from './publicStayQuote';
import { publicTrip } from './publicTrip';
import redirectToInit from './redirectToInit';
import { requestStayCancellation } from './requestStayCancellation';
import { searchStays } from './searchStays';
import { signStayAgreement } from './signStayAgreement';
import { createDamageClaim, refundStayPayment, transitionDamageClaim, transitionSecurityDeposit } from './stayFinancialOperations';
import { quoteStay } from './quoteStay';
import { transitionStayReservation } from './transitionStayReservation';
import { updateOnboardingStatus } from './updateOnboardingStatus';

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      type PublicMarketplaceSettingsResult {
        status: String!
        id: ID
        name: String
        tagline: String
        homepageHeadline: String
        publicDescription: String
        supportEmail: String
        supportPhone: String
        currencyCode: String
        locale: String
        timezone: String
        defaultMapLatitude: Float
        defaultMapLongitude: Float
        accentHue: Int
      }

      type SearchStaysResult {
        totalCount: Int!
        offset: Int!
        limit: Int!
        results: [JSON!]!
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
        agreementToken: String!
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
          offset: Int
          limit: Int
        ): SearchStaysResult!
        publicListing(slug: String!): JSON
        publicStayAgreement(token: String!): JSON
        publicStayQuote(token: String!): JSON
        publicTrip(token: String!): JSON
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
        ): CreateStayReservationResult!

        requestStayCancellation(tripToken: String!, reason: String): StayCancellationResult!
        signStayAgreement(token: String!, signatureName: String!): StayAgreementMutationResult!

        transitionStayReservation(
          reservationId: ID!
          transition: String!
          note: String
        ): StayReservationMutationResult!

        initiateStayPayment(
          reservationId: ID!
          paymentProviderCode: String
          amountCents: Int
        ): StayPaymentResult!

        captureStayPayment(paymentId: ID!): StayPaymentResult!

        generateOwnerStatement(ownerId: ID!, periodStart: String!, periodEnd: String!, currencyCode: String): JSON!
        transitionOwnerStatement(statementId: ID!, transition: String!, reference: String): JSON!
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
        refundStayPayment(paymentId: ID!, amountCents: Int!, reason: String): JSON!
        transitionSecurityDeposit(depositId: ID!, transition: String!, amountCents: Int, reference: String): JSON!
        createStayDamageClaim(reservationId: ID!, description: String!, claimedAmountCents: Int!, evidence: JSON): JSON!
        transitionDamageClaim(claimId: ID!, transition: String!, approvedAmountCents: Int): JSON!

        updateOnboardingStatus(status: String!): OnboardingStatusResult!
      }
    `,
    resolvers: {
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
        requestStayCancellation,
        signStayAgreement,
        transitionStayReservation,
        initiateStayPayment,
        captureStayPayment,
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
      },
    },
  });
}
