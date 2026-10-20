-- Round 1 guest operations. Forward-only: new columns plus one relaxed constraint (ListingMedia.imagePath may be blank); no existing row or value changes.

-- Public help: business support hours and office address (blank hides them).
ALTER TABLE "MarketplaceSettings"
  ADD COLUMN "supportHours" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "officeAddress" TEXT NOT NULL DEFAULT '';

-- Private arrival details shown only to guests holding a confirmed stay.
ALTER TABLE "Property"
  ADD COLUMN "arrivalInstructions" TEXT NOT NULL DEFAULT '';

-- Customer account that booked or claimed a reservation.
ALTER TABLE "Reservation" ADD COLUMN "bookedBy" TEXT;
CREATE INDEX "Reservation_bookedBy_idx" ON "Reservation"("bookedBy");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookedBy_fkey" FOREIGN KEY ("bookedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guest-held private link for inquiry threads that are not attached to a trip yet.
ALTER TABLE "Conversation"
  ADD COLUMN "guestAccessTokenHash" TEXT,
  ADD COLUMN "guestEmail" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "Conversation_guestAccessTokenHash_key" ON "Conversation"("guestAccessTokenHash");

-- Listing photos: an uploaded image needs no URL, so several photos may leave it blank.
ALTER TABLE "ListingMedia" ALTER COLUMN "imagePath" DROP NOT NULL,
  ALTER COLUMN "imagePath" DROP DEFAULT;
