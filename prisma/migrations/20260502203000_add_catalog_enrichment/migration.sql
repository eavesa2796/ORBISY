CREATE TYPE "SalesCatalogSourceProvider" AS ENUM ('MANUAL', 'CSV', 'ENERGY_STAR', 'NEEP', 'AHRI', 'SUPPLIER', 'MANUFACTURER');

CREATE TYPE "SalesCatalogImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

ALTER TABLE "SalesHvacCatalogItem"
ADD COLUMN "companyId" TEXT,
ADD COLUMN "sourceProvider" "SalesCatalogSourceProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceProductId" TEXT,
ADD COLUMN "sourceDatasetId" TEXT,
ADD COLUMN "sourceSyncedAt" TIMESTAMP(3),
ADD COLUMN "sourceMetadata" JSONB,
ADD COLUMN "energyStarCertified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ahriReferenceNumber" TEXT,
ADD COLUMN "productType" TEXT,
ADD COLUMN "coldClimate" BOOLEAN,
ADD COLUMN "taxCreditEligible" BOOLEAN,
ADD COLUMN "seer2" DOUBLE PRECISION,
ADD COLUMN "eer2" DOUBLE PRECISION,
ADD COLUMN "hspf2" DOUBLE PRECISION,
ADD COLUMN "afue" DOUBLE PRECISION,
ADD COLUMN "coolingCapacityBtu" INTEGER,
ADD COLUMN "heatingCapacityBtu47" INTEGER,
ADD COLUMN "heatingCapacityBtu17" INTEGER,
ADD COLUMN "heatingCapacityBtu5" INTEGER,
ADD COLUMN "copAt5" DOUBLE PRECISION,
ADD COLUMN "refrigerantType" TEXT;

DROP INDEX IF EXISTS "SalesHvacCatalogItem_brand_modelNumber_key";

CREATE TABLE "SalesCatalogImportJob" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "sourceProvider" "SalesCatalogSourceProvider" NOT NULL,
  "status" "SalesCatalogImportStatus" NOT NULL DEFAULT 'COMPLETED',
  "searchQuery" TEXT,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "SalesCatalogImportJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SalesHvacCatalogItem"
ADD CONSTRAINT "SalesHvacCatalogItem_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "SalesCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesCatalogImportJob"
ADD CONSTRAINT "SalesCatalogImportJob_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "SalesCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SalesHvacCatalogItem_companyId_idx" ON "SalesHvacCatalogItem"("companyId");
CREATE INDEX "SalesHvacCatalogItem_brand_modelNumber_idx" ON "SalesHvacCatalogItem"("brand", "modelNumber");
CREATE INDEX "SalesHvacCatalogItem_sourceProvider_idx" ON "SalesHvacCatalogItem"("sourceProvider");
CREATE INDEX "SalesHvacCatalogItem_sourceProvider_sourceProductId_idx" ON "SalesHvacCatalogItem"("sourceProvider", "sourceProductId");

CREATE INDEX "SalesCatalogImportJob_companyId_idx" ON "SalesCatalogImportJob"("companyId");
CREATE INDEX "SalesCatalogImportJob_sourceProvider_idx" ON "SalesCatalogImportJob"("sourceProvider");
CREATE INDEX "SalesCatalogImportJob_createdAt_idx" ON "SalesCatalogImportJob"("createdAt");
