UPDATE "Membership" AS membership
SET
  "status" = 'REMOVED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Organization" AS organization
WHERE membership."organizationId" = organization."id"
  AND organization."slug" = 'polisen'
  AND membership."status" = 'PENDING'
  AND membership."joinMethod" = 'LEGACY';
