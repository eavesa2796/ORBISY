/**
 * GET /api/outreach/unsubscribe - Unsubscribe from emails
 * POST /api/outreach/unsubscribe - Unsubscribe API endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/outreach/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Invalid Unsubscribe Link</h1>
          <p>The unsubscribe link is invalid or has expired.</p>
        </body>
        </html>
      `,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Verify token
    if (!verifyUnsubscribeToken(email, token)) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Token</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Invalid Token</h1>
          <p>The unsubscribe token is invalid.</p>
        </body>
        </html>
      `,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Add to unsubscribe list
    await prisma.outreachUnsubscribe.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: {},
    });

    // Update lead
    const lead = await prisma.outreachLead.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (lead) {
      await prisma.outreachLead.update({
        where: { id: lead.id },
        data: {
          doNotContact: true,
          unsubscribedAt: new Date(),
        },
      });

      // Stop active enrollments
      await prisma.outreachEnrollment.updateMany({
        where: {
          leadId: lead.id,
          status: "ACTIVE",
        },
        data: {
          status: "STOPPED",
          stoppedReason: "Lead unsubscribed",
        },
      });

      // Cancel scheduled messages
      await prisma.outreachMessage.updateMany({
        where: {
          leadId: lead.id,
          status: "SCHEDULED",
        },
        data: {
          status: "CANCELED",
          error: "Canceled due to unsubscribe",
        },
      });
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <h1 style="color: #10b981;">✓ Successfully Unsubscribed</h1>
        <p>You have been unsubscribed from all future emails.</p>
        <p style="color: #6b7280; margin-top: 40px;">If you unsubscribed by mistake, please contact us.</p>
      </body>
      </html>
    `,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>Error</h1>
        <p>An error occurred while processing your unsubscribe request.</p>
      </body>
      </html>
    `,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Add to unsubscribe list
    await prisma.outreachUnsubscribe.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: {},
    });

    // Update lead
    const lead = await prisma.outreachLead.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (lead) {
      await prisma.outreachLead.update({
        where: { id: lead.id },
        data: {
          doNotContact: true,
          unsubscribedAt: new Date(),
        },
      });

      // Stop active enrollments
      await prisma.outreachEnrollment.updateMany({
        where: {
          leadId: lead.id,
          status: "ACTIVE",
        },
        data: {
          status: "STOPPED",
          stoppedReason: "Lead unsubscribed",
        },
      });

      // Cancel scheduled messages
      await prisma.outreachMessage.updateMany({
        where: {
          leadId: lead.id,
          status: "SCHEDULED",
        },
        data: {
          status: "CANCELED",
          error: "Canceled due to unsubscribe",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
