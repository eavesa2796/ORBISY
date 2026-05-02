ALTER TYPE "SalesProposalEventType" ADD VALUE IF NOT EXISTS 'OPTION_VIEWED';

ALTER TABLE "SalesProposal"
ADD COLUMN "followUpSentAt" TIMESTAMP(3);

CREATE INDEX "SalesProposal_followUpSentAt_idx" ON "SalesProposal"("followUpSentAt");
