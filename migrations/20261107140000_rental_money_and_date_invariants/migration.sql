-- Database backstops for invariants the locked writers already keep. Stay dates are text
-- YYYY-MM-DD ranges [start, end); openfront_stay_date (from the calendar exclusion migration)
-- parses them. Fails closed on existing violations; nothing is rewritten.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Payment" WHERE "amountCents" < 0 OR coalesce("refundedAmountCents", 0) < 0 OR coalesce("refundedAmountCents", 0) > "amountCents") THEN RAISE EXCEPTION 'Payments refunded beyond their amount require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "Refund" WHERE "amountCents" <= 0) THEN RAISE EXCEPTION 'Refunds without a positive amount require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "SecurityDeposit" WHERE coalesce("amountCents", 0) < 0 OR coalesce("capturedAmountCents", 0) < 0 OR coalesce("capturedAmountCents", 0) > coalesce("amountCents", 0)) THEN RAISE EXCEPTION 'Deposits captured beyond their amount require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "Reservation" WHERE coalesce("totalAmountCents", 0) < 0 OR coalesce("amountPaidCents", 0) < 0 OR coalesce("lodgingSubtotalCents", 0) < 0 OR coalesce("securityDepositCents", 0) < 0) THEN RAISE EXCEPTION 'Negative reservation amounts require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "Reservation" WHERE "checkInDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "checkOutDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "checkOutDate" <= "checkInDate") THEN RAISE EXCEPTION 'Reservations with malformed or backwards dates require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "StayQuote" WHERE "checkInDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "checkOutDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "checkOutDate" <= "checkInDate") THEN RAISE EXCEPTION 'Quotes with malformed or backwards dates require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "CalendarBlock" WHERE "startDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "endDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "endDate" <= "startDate") THEN RAISE EXCEPTION 'Calendar blocks with malformed or backwards dates require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "SeasonalRate" WHERE "startDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "endDate" !~ '^\d{4}-\d{2}-\d{2}$' OR "endDate" <= "startDate" OR coalesce("nightlyRateCents", 0) < 0) THEN RAISE EXCEPTION 'Seasons with malformed or backwards dates require manual remediation'; END IF;
END $$;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refund_range_check" CHECK ("amountCents" >= 0 AND coalesce("refundedAmountCents", 0) BETWEEN 0 AND "amountCents");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_capture_range_check" CHECK (coalesce("amountCents", 0) >= 0 AND coalesce("capturedAmountCents", 0) BETWEEN 0 AND coalesce("amountCents", 0));
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_amounts_nonnegative_check" CHECK (coalesce("totalAmountCents", 0) >= 0 AND coalesce("amountPaidCents", 0) >= 0 AND coalesce("lodgingSubtotalCents", 0) >= 0 AND coalesce("securityDepositCents", 0) >= 0);
-- ISO dates compare correctly as text, and openfront_stay_date rejects impossible dates.
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_stay_dates_check" CHECK ("checkInDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "checkOutDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "openfront_stay_date"("checkOutDate") > "openfront_stay_date"("checkInDate"));
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_stay_dates_check" CHECK ("checkInDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "checkOutDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "openfront_stay_date"("checkOutDate") > "openfront_stay_date"("checkInDate"));
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_dates_check" CHECK ("startDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "endDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "openfront_stay_date"("endDate") > "openfront_stay_date"("startDate"));
ALTER TABLE "SeasonalRate" ADD CONSTRAINT "SeasonalRate_dates_check" CHECK ("startDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "endDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "openfront_stay_date"("endDate") > "openfront_stay_date"("startDate") AND coalesce("nightlyRateCents", 0) >= 0);
