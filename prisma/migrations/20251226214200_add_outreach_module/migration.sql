-- CreateEnum
CREATE TYPE "OutreachLeadStage" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'BOOKED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'LINKEDIN', 'SMS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('RUNNING', 'PAUSED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'REPLIED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ReplySentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateTable
CREATE TABLE "OutreachLead" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "city" TEXT,
    "industry" TEXT,
    "stage" "OutreachLeadStage" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 50,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTouchAt" TIMESTAMP(3),
    "lastActivity" TEXT,
    "nextStep" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "OutreachLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "CampaignStatus" NOT NULL DEFAULT 'PAUSED',
    "dailyLimit" INTEGER NOT NULL DEFAULT 30,
    "fromMailbox" TEXT NOT NULL,
    "audienceIndustry" TEXT,
    "audienceGeoContains" TEXT,
    "audienceMinScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCampaignStep" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachCampaignStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachEnrollment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stoppedReason" TEXT,

    CONSTRAINT "OutreachEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SCHEDULED',
    "subjectRendered" TEXT NOT NULL,
    "bodyRendered" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachReply" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "messageId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentiment" "ReplySentiment" NOT NULL DEFAULT 'NEUTRAL',
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachUnsubscribe" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachUnsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutreachLead_email_key" ON "OutreachLead"("email");

-- CreateIndex
CREATE INDEX "OutreachLead_email_idx" ON "OutreachLead"("email");

-- CreateIndex
CREATE INDEX "OutreachLead_stage_idx" ON "OutreachLead"("stage");

-- CreateIndex
CREATE INDEX "OutreachLead_doNotContact_idx" ON "OutreachLead"("doNotContact");

-- CreateIndex
CREATE INDEX "OutreachCampaign_status_idx" ON "OutreachCampaign"("status");

-- CreateIndex
CREATE INDEX "OutreachCampaignStep_campaignId_idx" ON "OutreachCampaignStep"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachCampaignStep_campaignId_stepIndex_key" ON "OutreachCampaignStep"("campaignId", "stepIndex");

-- CreateIndex
CREATE INDEX "OutreachEnrollment_status_idx" ON "OutreachEnrollment"("status");

-- CreateIndex
CREATE INDEX "OutreachEnrollment_leadId_idx" ON "OutreachEnrollment"("leadId");

-- CreateIndex
CREATE INDEX "OutreachEnrollment_campaignId_idx" ON "OutreachEnrollment"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachEnrollment_leadId_campaignId_key" ON "OutreachEnrollment"("leadId", "campaignId");

-- CreateIndex
CREATE INDEX "OutreachMessage_scheduledFor_status_idx" ON "OutreachMessage"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "OutreachMessage_leadId_idx" ON "OutreachMessage"("leadId");

-- CreateIndex
CREATE INDEX "OutreachMessage_campaignId_idx" ON "OutreachMessage"("campaignId");

-- CreateIndex
CREATE INDEX "OutreachMessage_status_idx" ON "OutreachMessage"("status");

-- CreateIndex
CREATE INDEX "OutreachReply_leadId_idx" ON "OutreachReply"("leadId");

-- CreateIndex
CREATE INDEX "OutreachReply_campaignId_idx" ON "OutreachReply"("campaignId");

-- CreateIndex
CREATE INDEX "OutreachReply_receivedAt_idx" ON "OutreachReply"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachUnsubscribe_email_key" ON "OutreachUnsubscribe"("email");

-- CreateIndex
CREATE INDEX "OutreachUnsubscribe_email_idx" ON "OutreachUnsubscribe"("email");

-- AddForeignKey
ALTER TABLE "OutreachCampaignStep" ADD CONSTRAINT "OutreachCampaignStep_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachEnrollment" ADD CONSTRAINT "OutreachEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OutreachLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachEnrollment" ADD CONSTRAINT "OutreachEnrollment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OutreachLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OutreachCampaignStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachReply" ADD CONSTRAINT "OutreachReply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OutreachLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachReply" ADD CONSTRAINT "OutreachReply_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachReply" ADD CONSTRAINT "OutreachReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OutreachMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
