/**
 * Analytics and metrics calculations for outreach campaigns
 */

import { prisma } from "@/lib/prisma";

export interface CampaignMetrics {
  totalLeads: number;
  totalEnrolled: number;
  totalSent: number;
  totalDelivered: number;
  totalReplied: number;
  totalPositive: number;
  totalNeutral: number;
  totalNegative: number;
  totalBooked: number;
  deliveryRate: number;
  replyRate: number;
  positiveRate: number;
  bookingRate: number;
}

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  repliedLeads: number;
  bookedLeads: number;
  activeCampaigns: number;
  totalEnrollments: number;
  messagesScheduled: number;
  messagesSentToday: number;
  repliesThisWeek: number;
  avgResponseTime: number | null;
}

export async function getCampaignMetrics(
  campaignId: string
): Promise<CampaignMetrics> {
  const enrollments = await prisma.outreachEnrollment.count({
    where: { campaignId },
  });

  const messages = await prisma.outreachMessage.findMany({
    where: { campaignId },
    select: { status: true },
  });

  const replies = await prisma.outreachReply.findMany({
    where: { campaignId },
    select: { sentiment: true },
  });

  const leads = await prisma.outreachLead.findMany({
    where: {
      enrollments: {
        some: { campaignId },
      },
    },
    select: { stage: true },
  });

  const totalSent = messages.filter((m) =>
    ["SENT", "DELIVERED", "REPLIED"].includes(m.status)
  ).length;
  const totalDelivered = messages.filter((m) =>
    ["DELIVERED", "REPLIED"].includes(m.status)
  ).length;
  const totalReplied = replies.length;
  const totalPositive = replies.filter(
    (r) => r.sentiment === "POSITIVE"
  ).length;
  const totalNeutral = replies.filter((r) => r.sentiment === "NEUTRAL").length;
  const totalNegative = replies.filter(
    (r) => r.sentiment === "NEGATIVE"
  ).length;
  const totalBooked = leads.filter((l) => l.stage === "BOOKED").length;

  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
  const positiveRate =
    totalReplied > 0 ? (totalPositive / totalReplied) * 100 : 0;
  const bookingRate = totalSent > 0 ? (totalBooked / totalSent) * 100 : 0;

  return {
    totalLeads: leads.length,
    totalEnrolled: enrollments,
    totalSent,
    totalDelivered,
    totalReplied,
    totalPositive,
    totalNeutral,
    totalNegative,
    totalBooked,
    deliveryRate,
    replyRate,
    positiveRate,
    bookingRate,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    activeLeads,
    repliedLeads,
    bookedLeads,
    activeCampaigns,
    totalEnrollments,
    messagesScheduled,
    messagesSentToday,
    repliesThisWeek,
  ] = await Promise.all([
    prisma.outreachLead.count(),
    prisma.outreachLead.count({
      where: {
        stage: { in: ["NEW", "CONTACTED"] },
        doNotContact: false,
      },
    }),
    prisma.outreachLead.count({
      where: { stage: "REPLIED" },
    }),
    prisma.outreachLead.count({
      where: { stage: "BOOKED" },
    }),
    prisma.outreachCampaign.count({
      where: { status: "RUNNING" },
    }),
    prisma.outreachEnrollment.count({
      where: { status: "ACTIVE" },
    }),
    prisma.outreachMessage.count({
      where: { status: "SCHEDULED" },
    }),
    prisma.outreachMessage.count({
      where: {
        status: "SENT",
        sentAt: { gte: todayStart },
      },
    }),
    prisma.outreachReply.count({
      where: {
        receivedAt: { gte: weekAgo },
      },
    }),
  ]);

  // Calculate average response time (simplified)
  const avgResponseTime = null; // Would require more complex query

  return {
    totalLeads,
    activeLeads,
    repliedLeads,
    bookedLeads,
    activeCampaigns,
    totalEnrollments,
    messagesScheduled,
    messagesSentToday,
    repliesThisWeek,
    avgResponseTime,
  };
}

export async function getLeadStageDistribution(): Promise<
  Record<string, number>
> {
  const leads = await prisma.outreachLead.groupBy({
    by: ["stage"],
    _count: true,
  });

  const distribution: Record<string, number> = {};
  for (const item of leads) {
    distribution[item.stage] = item._count;
  }

  return distribution;
}
