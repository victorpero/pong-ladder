CREATE TYPE "OrganizationJoinPolicy" AS ENUM (
  'OPEN',
  'ADMIN_APPROVAL',
  'INVITE_ONLY',
  'EMAIL_DOMAIN',
  'ACCESS_CODE'
);

CREATE TYPE "MembershipJoinMethod" AS ENUM (
  'LEGACY',
  'ADMIN_CREATED',
  'OPEN_JOIN',
  'ADMIN_REQUEST',
  'INVITATION',
  'EMAIL_DOMAIN',
  'ACCESS_CODE'
);

ALTER TABLE "Organization"
  ADD COLUMN "joinPolicy" "OrganizationJoinPolicy" NOT NULL DEFAULT 'ADMIN_APPROVAL',
  ADD COLUMN "allowedEmailDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "accessCodeHash" TEXT,
  ADD COLUMN "accessCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accessCodeUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Membership"
  ADD COLUMN "joinMethod" "MembershipJoinMethod" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

UPDATE "Organization"
SET "joinPolicy" = 'ACCESS_CODE'
WHERE "slug" = 'polisen';

UPDATE "Membership"
SET "activatedAt" = "createdAt"
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "Organization_accessCodeHash_key" ON "Organization"("accessCodeHash");
CREATE INDEX "Membership_organizationId_joinMethod_idx" ON "Membership"("organizationId", "joinMethod");
