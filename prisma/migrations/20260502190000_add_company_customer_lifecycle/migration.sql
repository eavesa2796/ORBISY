CREATE TYPE "SalesCompanyAccountStatus" AS ENUM ('PROSPECT', 'QUALIFIED', 'PRO_CUSTOMER', 'CHURNED');

ALTER TABLE "SalesCompany"
ADD COLUMN "accountStatus" "SalesCompanyAccountStatus" NOT NULL DEFAULT 'PROSPECT',
ADD COLUMN "convertedToCustomerAt" TIMESTAMP(3);

UPDATE "SalesCompany"
SET "accountStatus" = 'QUALIFIED'
WHERE "isQualified" = true;

CREATE INDEX "SalesCompany_accountStatus_idx" ON "SalesCompany"("accountStatus");
