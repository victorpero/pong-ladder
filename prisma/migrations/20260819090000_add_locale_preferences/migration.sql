-- Organizations open in their own default language; Swedish is the launch default.
ALTER TABLE "Organization" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'sv';

-- Signed-in members may store a language preference. NULL means "resolve from context".
ALTER TABLE "User" ADD COLUMN "locale" TEXT;

-- Only the supported BCP 47 language tags may be stored.
ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_defaultLocale_supported" CHECK ("defaultLocale" IN ('sv', 'en'));

ALTER TABLE "User"
  ADD CONSTRAINT "User_locale_supported" CHECK ("locale" IS NULL OR "locale" IN ('sv', 'en'));

-- Polisen played in Swedish before this feature existed, so it keeps Swedish explicitly.
UPDATE "Organization" SET "defaultLocale" = 'sv' WHERE "slug" = 'polisen';
