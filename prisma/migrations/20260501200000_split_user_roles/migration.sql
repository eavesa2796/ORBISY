-- Split the original three roles into ORBISY, HVAC professional, and homeowner roles.
-- Existing ADMIN users become ORBISY_ADMIN.
-- Existing SALES users become ORBISY_SALES.
-- Existing CUSTOMER users become HOMEOWNER.

CREATE TYPE "UserRole_new" AS ENUM (
  'ORBISY_ADMIN',
  'ORBISY_SALES',
  'HVAC_OWNER',
  'HVAC_SALES',
  'HOMEOWNER'
);

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole_new"
USING (
  CASE
    WHEN "role"::text = 'ADMIN' THEN 'ORBISY_ADMIN'
    WHEN "role"::text = 'SALES' THEN 'ORBISY_SALES'
    WHEN "role"::text = 'CUSTOMER' THEN 'HOMEOWNER'
    ELSE 'ORBISY_SALES'
  END::"UserRole_new"
);

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ORBISY_SALES';
