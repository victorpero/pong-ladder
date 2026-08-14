ALTER TYPE "MembershipStatus" ADD VALUE 'REMOVED';

CREATE TYPE "MembershipAuditAction" AS ENUM (
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'REACTIVATED',
  'REMOVED',
  'MEMBER_ADDED',
  'ROLE_CHANGED',
  'OWNERSHIP_TRANSFERRED'
);

CREATE TABLE "MembershipAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "membershipId" TEXT,
  "subjectUserId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" "MembershipAuditAction" NOT NULL,
  "fromStatus" "MembershipStatus",
  "toStatus" "MembershipStatus",
  "fromRole" "MembershipRole",
  "toRole" "MembershipRole",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipAuditEvent_organizationId_createdAt_idx" ON "MembershipAuditEvent"("organizationId", "createdAt");
CREATE INDEX "MembershipAuditEvent_membershipId_idx" ON "MembershipAuditEvent"("membershipId");
CREATE INDEX "MembershipAuditEvent_subjectUserId_idx" ON "MembershipAuditEvent"("subjectUserId");
CREATE INDEX "MembershipAuditEvent_actorUserId_idx" ON "MembershipAuditEvent"("actorUserId");

ALTER TABLE "MembershipAuditEvent" ADD CONSTRAINT "MembershipAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipAuditEvent" ADD CONSTRAINT "MembershipAuditEvent_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MembershipAuditEvent" ADD CONSTRAINT "MembershipAuditEvent_subjectUserId_fkey"
  FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipAuditEvent" ADD CONSTRAINT "MembershipAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
