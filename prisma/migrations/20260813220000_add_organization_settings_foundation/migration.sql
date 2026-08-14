CREATE TYPE "OrganizationVisibility" AS ENUM ('PRIVATE', 'DISCOVERABLE');
CREATE TYPE "OrganizationAuditAction" AS ENUM (
  'ORGANIZATION_CREATED',
  'SETTINGS_UPDATED',
  'ACCESS_CODE_GENERATED',
  'ACCESS_CODE_ROTATED',
  'ACCESS_CODE_DISABLED'
);

ALTER TABLE "Organization"
  ADD COLUMN "visibility" "OrganizationVisibility" NOT NULL DEFAULT 'PRIVATE';

CREATE TABLE "OrganizationAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorMembershipId" TEXT,
  "action" "OrganizationAuditAction" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationAuditEvent_organizationId_createdAt_idx" ON "OrganizationAuditEvent"("organizationId", "createdAt");
CREATE INDEX "OrganizationAuditEvent_actorMembershipId_idx" ON "OrganizationAuditEvent"("actorMembershipId");
CREATE INDEX "Organization_visibility_idx" ON "Organization"("visibility");

ALTER TABLE "OrganizationAuditEvent" ADD CONSTRAINT "OrganizationAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAuditEvent" ADD CONSTRAINT "OrganizationAuditEvent_actorMembershipId_fkey"
  FOREIGN KEY ("actorMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
