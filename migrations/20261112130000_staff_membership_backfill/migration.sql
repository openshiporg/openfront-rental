-- Staff users with a dashboard role but no host membership saw every list and platform page empty.
-- Give each active dashboard user who has none an active membership in the host organization(s) that exist.
-- Only when exactly one host organization exists, so no staff user is attached to the wrong store.
INSERT INTO "HostMembership" ("id", "hostOrganization", "user", "membershipRole", "status", "createdAt", "updatedAt")
SELECT 'membership_' || h."id" || '_' || u."id", h."id", u."id",
  CASE WHEN r."canManageRoles" OR r."canManagePeople" THEN 'admin' ELSE 'manager' END,
  'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
JOIN "Role" r ON r."id" = u."role"
CROSS JOIN "HostOrganization" h
WHERE r."canAccessDashboard" = true
  AND u."isActive" = true
  AND (SELECT COUNT(*) FROM "HostOrganization") = 1
  AND NOT EXISTS (SELECT 1 FROM "HostMembership" m WHERE m."user" = u."id" AND m."hostOrganization" = h."id");
