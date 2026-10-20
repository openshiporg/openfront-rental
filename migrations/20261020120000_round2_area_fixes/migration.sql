-- Round 2 (area audits A–D). Forward-only and additive: new nullable/defaulted columns,
-- provenance markers and credential rotation. No row is deleted and no historical amount,
-- signature, status or snapshot is rewritten.

-- Explicit test bookings: a guest chooses one at checkout, only where the store allows it
-- and card checkout runs in Stripe test mode. Every existing stay keeps its recorded state:
-- none is relabelled, because a past Stripe attempt doesn't prove a stay was simulated.
-- Payment-level provenance (provider, settlement evidence) is left exactly as recorded.
ALTER TABLE "Reservation" ADD COLUMN "testMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketplaceSettings" ADD COLUMN "allowTestBookings" BOOLEAN NOT NULL DEFAULT false;

-- Delivery state of an emailed trip link (recovery) and of a reissued conversation link:
-- identity, status and time, so retries are deduplicated and a failed or unknown send
-- stays recoverable. No link or token is stored.
ALTER TABLE "Reservation" ADD COLUMN "tripLinkDelivery" JSONB;

-- What a guest accepted when signing (time, statement, terms fingerprint).
ALTER TABLE "StayAgreement" ADD COLUMN "signatureEvidence" JSONB;

-- Guest conversation links now expire and can be revoked. Existing links stay valid for
-- 30 days from their last message.
ALTER TABLE "Conversation"
  ADD COLUMN "guestAccessTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "guestAccessTokenRevokedAt" TIMESTAMP(3),
  ADD COLUMN "guestLinkDelivery" JSONB;
UPDATE "Conversation"
SET "guestAccessTokenExpiresAt" = COALESCE("lastMessageAt", "createdAt", CURRENT_TIMESTAMP) + INTERVAL '30 days'
WHERE "guestAccessTokenHash" IS NOT NULL;

-- One setup run per host: its start date anchors sample dates; its fingerprint pins the configuration.
ALTER TABLE "HostOrganization"
  ADD COLUMN "onboardingAnchorDate" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onboardingFingerprint" TEXT NOT NULL DEFAULT '';

-- How an approved damage claim was actually settled (method, reference, amount, actor, time).
ALTER TABLE "DamageClaim" ADD COLUMN "settlementEvidence" JSONB;

-- The store's own published legal documents (blank: not published). A document counts as
-- published only with both its link and its version label.
ALTER TABLE "MarketplaceSettings"
  ADD COLUMN "privacyPolicyUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "privacyPolicyVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "termsUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '';

-- What a guest account was shown and accepted at registration (document versions, time).
ALTER TABLE "User" ADD COLUMN "registrationEvidence" JSONB;

-- Onboarding sample stays and holds, identified only by exact setup lineage (its fixed
-- record IDs, its fixed sample links, its own payment marker), never by names or notes. The
-- classification is additive: every original row, amount, signature and status is kept; the
-- application then keeps samples out of real capacity, money, earnings, work and guest-facing
-- assent or reputation. Records with no such lineage stay exactly as recorded.
ALTER TABLE "Reservation" ADD COLUMN "fixtureOrigin" TEXT, ADD COLUMN "fixtureEvidence" JSONB;
ALTER TABLE "CalendarBlock" ADD COLUMN "fixtureOrigin" TEXT;
UPDATE "Reservation"
SET "fixtureOrigin" = 'onboarding_sample', "fixtureEvidence" = '{"identifiedBy": "setup_record_id", "classifiedBy": "migration 20261020120000_round2_area_fixes"}'::jsonb
WHERE "id" IN ('reservation_pineglass_future', 'reservation_foundry_current', 'reservation_tidehouse_completed', 'reservation_juniper_channel');
UPDATE "Reservation"
SET "fixtureOrigin" = 'onboarding_sample', "fixtureEvidence" = '{"identifiedBy": "setup_fixed_trip_link", "classifiedBy": "migration 20261020120000_round2_area_fixes"}'::jsonb
WHERE "fixtureOrigin" IS NULL AND "tripTokenHash" IN (
  '6c09d9dd5b2a1afb9b3650e0b87127edd05ef8f3f69113ad9e9f887b82ec222e',
  'df03b8c4f01cf8a8ee5c29584d5cbefd06d20544a216bc2087855c561bedb895',
  'a09976f6839782f4700ae635f127f80947e0ba2a6e4e790fbd5c954b98982c37',
  '55d0a6d86f2a6ec6a63296535f13e3580151219ead6fe1d90bc26085989b6bad'
);
UPDATE "Reservation"
SET "fixtureOrigin" = 'onboarding_sample', "fixtureEvidence" = '{"identifiedBy": "setup_fixed_agreement_link", "classifiedBy": "migration 20261020120000_round2_area_fixes"}'::jsonb
WHERE "fixtureOrigin" IS NULL AND "agreement" IN (SELECT "id" FROM "StayAgreement" WHERE "signingTokenHash" IN (
  'ad8446b8623fb80b89d70763dd542cbb0a79717e4c1b1d2149ac28782cfca0fa',
  '4794599f2673296b0772487b3f57639d44324deacee2164c5a247d60e2f15a16',
  'd45b2057e0a41d8960806dcb29117f0c28a850d91a50169382956cca87ad4ba3',
  'a4b911640dad5f747be7527b9fa03683035508b0bb64a862beebff67cb8c5daf'
));
UPDATE "Reservation"
SET "fixtureOrigin" = 'onboarding_sample', "fixtureEvidence" = '{"identifiedBy": "setup_payment_marker", "classifiedBy": "migration 20261020120000_round2_area_fixes"}'::jsonb
WHERE "fixtureOrigin" IS NULL AND "id" IN (SELECT "reservation" FROM "Payment" WHERE "data"->>'kind' = 'seeded_manual_capture' AND "reservation" IS NOT NULL);
UPDATE "CalendarBlock" SET "fixtureOrigin" = 'onboarding_sample'
WHERE "id" IN ('block_alder_owner', 'block_pineglass_preparation')
   OR "reservation" IN (SELECT "id" FROM "Reservation" WHERE "fixtureOrigin" IS NOT NULL);

-- Setup used fixed public sample links. Any installed record still opened by one of those
-- public values gets a new unguessable link hash; the host can reissue links as usual.
UPDATE "Reservation"
SET "tripTokenHash" = encode(sha256(convert_to(random()::text || clock_timestamp()::text || "id", 'UTF8')), 'hex')
WHERE "tripTokenHash" IN (
  '6c09d9dd5b2a1afb9b3650e0b87127edd05ef8f3f69113ad9e9f887b82ec222e',
  'df03b8c4f01cf8a8ee5c29584d5cbefd06d20544a216bc2087855c561bedb895',
  'a09976f6839782f4700ae635f127f80947e0ba2a6e4e790fbd5c954b98982c37',
  '55d0a6d86f2a6ec6a63296535f13e3580151219ead6fe1d90bc26085989b6bad'
);
UPDATE "StayAgreement"
SET "signingTokenHash" = encode(sha256(convert_to(random()::text || clock_timestamp()::text || "id", 'UTF8')), 'hex')
WHERE "signingTokenHash" IN (
  'ad8446b8623fb80b89d70763dd542cbb0a79717e4c1b1d2149ac28782cfca0fa',
  '4794599f2673296b0772487b3f57639d44324deacee2164c5a247d60e2f15a16',
  'd45b2057e0a41d8960806dcb29117f0c28a850d91a50169382956cca87ad4ba3',
  'a4b911640dad5f747be7527b9fa03683035508b0bb64a862beebff67cb8c5daf'
);

-- Provenance for records earlier setup runs created as samples. Identified only by the
-- marker setup itself wrote on payments and by sample-stay lineage; values are unchanged.
UPDATE "Payment"
SET "data" = COALESCE("data", '{}'::jsonb) || '{"provenance": "onboarding_sample", "attestation": "none: created by setup, no money was received"}'::jsonb
WHERE "data"->>'kind' = 'seeded_manual_capture';
UPDATE "StayAgreement"
SET "signatureEvidence" = '{"provenance": "onboarding_sample", "note": "Signature recorded by setup, not by a guest.", "identifiedBy": "sample stay lineage"}'::jsonb
WHERE "status" = 'signed' AND "signatureEvidence" IS NULL
  AND "id" IN (SELECT "agreement" FROM "Reservation" WHERE "fixtureOrigin" IS NOT NULL AND "agreement" IS NOT NULL);

-- An attested owner payout recorded when a statement is paid has no provider transfer id:
-- the reference is optional (unique when present). Empty references become NULL so several
-- attested payouts don't collide on the unique index; no reference value is lost.
ALTER TABLE "Payout" ALTER COLUMN "providerPayoutId" DROP NOT NULL;
ALTER TABLE "Payout" ALTER COLUMN "providerPayoutId" DROP DEFAULT;
UPDATE "Payout" SET "providerPayoutId" = NULL WHERE "providerPayoutId" = '';

-- Archived properties and listings are history. The app refuses ordinary edits with a readable
-- message and moves status only through a locked command; this guard also refuses a raw edit
-- that raced an archive. Review aggregates of past stays stay current; nothing else changes.
CREATE OR REPLACE FUNCTION "rental_archived_catalog_guard"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'archived' AND (to_jsonb(NEW) - TG_ARGV) IS DISTINCT FROM (to_jsonb(OLD) - TG_ARGV) THEN
    RAISE EXCEPTION 'Archived % records are read-only.', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Listing_archived_guard" BEFORE UPDATE ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION "rental_archived_catalog_guard"('updatedAt', 'reviewAverageHundredths', 'reviewCount');
CREATE TRIGGER "Property_archived_guard" BEFORE UPDATE ON "Property"
  FOR EACH ROW EXECUTE FUNCTION "rental_archived_catalog_guard"('updatedAt');

-- Outbox delivery: each claim has its own lease identity, the moment its dispatch started, and an
-- append-only record of attempt outcomes. Existing rows keep their state; nothing is reclassified.
ALTER TABLE "OutboxEvent" ADD COLUMN "leaseToken" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "dispatchStartedAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN "deliveryEvidence" JSONB;

-- Each channel mapping keeps its own unresolved import issue; connection health is derived from them.
ALTER TABLE "ChannelListing" ADD COLUMN "lastImportIssue" JSONB;
