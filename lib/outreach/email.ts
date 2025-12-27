/**
 * Email sending utilities using Resend (existing provider)
 */

import { Resend } from "resend";
import { addUnsubscribeFooter } from "./security";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendOutreachEmailParams {
  to: string;
  from: string;
  subject: string;
  body: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an outreach email using Resend
 */
export async function sendOutreachEmail(
  params: SendOutreachEmailParams
): Promise<SendEmailResult> {
  try {
    // Add unsubscribe footer
    const bodyWithFooter = addUnsubscribeFooter(params.body, params.to);

    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      replyTo: params.replyTo || params.from,
      subject: params.subject,
      text: bodyWithFooter,
    });

    if (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error.message || String(error),
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    console.error("Email send exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get sender name from environment or default
 */
export function getSenderName(): string {
  return process.env.OUTREACH_SENDER_NAME || "Team";
}

/**
 * Get from email address
 */
export function getFromEmail(mailbox?: string): string {
  return mailbox || process.env.OUTREACH_FROM_EMAIL || "outreach@example.com";
}
