ALTER TABLE "SalesCompany"
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "brandColor" TEXT;

ALTER TABLE "SalesProposalSettings"
ADD COLUMN "companyId" TEXT;

ALTER TABLE "SalesProposalSettings"
ADD CONSTRAINT "SalesProposalSettings_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "SalesCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SalesProposalSettings_companyId_key" ON "SalesProposalSettings"("companyId");
CREATE INDEX "SalesProposalSettings_companyId_idx" ON "SalesProposalSettings"("companyId");
