-- Length-of-stay discounts (weekly from 7 nights, monthly from 28) on rate plans.
-- Additive only: two defaulted columns; existing plans keep 0 and price exactly as before.
ALTER TABLE "RatePlan" ADD COLUMN "weeklyDiscountBasisPoints" INTEGER DEFAULT 0;
ALTER TABLE "RatePlan" ADD COLUMN "monthlyDiscountBasisPoints" INTEGER DEFAULT 0;
