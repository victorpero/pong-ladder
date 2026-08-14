CREATE TABLE "OrganizationInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "creatorMembershipId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxUses" INTEGER,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationInvitation_usage_check" CHECK ("maxUses" IS NULL OR "maxUses" > 0),
  CONSTRAINT "OrganizationInvitation_use_count_check" CHECK ("useCount" >= 0)
);

CREATE TABLE "InvitationRedemption" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvitationRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE INDEX "OrganizationInvitation_organizationId_createdAt_idx" ON "OrganizationInvitation"("organizationId", "createdAt");
CREATE INDEX "OrganizationInvitation_organizationId_revokedAt_expiresAt_idx" ON "OrganizationInvitation"("organizationId", "revokedAt", "expiresAt");
CREATE INDEX "OrganizationInvitation_creatorMembershipId_idx" ON "OrganizationInvitation"("creatorMembershipId");
CREATE UNIQUE INDEX "InvitationRedemption_invitationId_userId_key" ON "InvitationRedemption"("invitationId", "userId");
CREATE INDEX "InvitationRedemption_organizationId_redeemedAt_idx" ON "InvitationRedemption"("organizationId", "redeemedAt");
CREATE INDEX "InvitationRedemption_userId_redeemedAt_idx" ON "InvitationRedemption"("userId", "redeemedAt");

ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_creatorMembershipId_fkey"
  FOREIGN KEY ("creatorMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "OrganizationInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
