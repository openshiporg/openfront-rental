-- Add a dedicated storefront-settings permission without changing unrelated role capabilities.
ALTER TABLE "Role"
  ADD COLUMN "canManageSettings" BOOLEAN NOT NULL DEFAULT false;

-- Existing platform administrators/onboarding managers retain access to the
-- settings they previously managed through the generic singleton surface.
UPDATE "Role"
SET "canManageSettings" = true
WHERE "canManageRoles" = true OR "canManageOnboarding" = true;

-- Persist the homepage identity and bounded accent hue on the existing singleton.
ALTER TABLE "MarketplaceSettings"
  ADD COLUMN "homepageHeadline" TEXT NOT NULL DEFAULT 'Stay somewhere considered.',
  ADD COLUMN "accentHue" INTEGER NOT NULL DEFAULT 155;

ALTER TABLE "MarketplaceSettings"
  ADD CONSTRAINT "MarketplaceSettings_accentHue_range"
  CHECK ("accentHue" >= 0 AND "accentHue" <= 359);
