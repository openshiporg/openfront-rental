ALTER TABLE "Refund"
  ADD COLUMN "reservationAmendment" TEXT;

CREATE INDEX "Refund_reservationAmendment_idx" ON "Refund"("reservationAmendment");

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_reservationAmendment_fkey"
  FOREIGN KEY ("reservationAmendment") REFERENCES "ReservationAmendment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
