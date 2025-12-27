/**
 * Security utilities for outreach module
 * - Cron job authentication
 * - Webhook signature verification
 * - Unsubscribe token generation
 */

import { createHmac } from "crypto";

/**
 * Verify cron job request is authorized
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = request.headers.get("x-orbisy-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET not configured");
    return false;
  }

  return secret === expectedSecret;
}

/**
 * Verify webhook signature from email provider
 */
export function verifyWebhookSignature(
  request: Request,
  body: string
): boolean {
  const signature = request.headers.get("x-webhook-signature");
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET;

  // Option 1: Simple shared secret
  if (secret && expectedSecret) {
    return secret === expectedSecret;
  }

  // Option 2: HMAC signature verification
  if (signature && expectedSecret) {
    const expectedSignature = createHmac("sha256", expectedSecret)
      .update(body)
      .digest("hex");

    return signature === expectedSignature;
  }

  // If neither method configured, log warning but allow (dev mode)
  if (!expectedSecret) {
    console.warn(
      "INBOUND_WEBHOOK_SECRET not configured - webhook authentication disabled"
    );
    return true;
  }

  return false;
}

/**
 * Generate unsubscribe token for email links
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || "default-secret-change-me";
  const token = createHmac("sha256", secret)
    .update(email.toLowerCase())
    .digest("hex")
    .substring(0, 16);

  return token;
}

/**
 * Verify unsubscribe token
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * Generate unsubscribe link
 */
export function generateUnsubscribeLink(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const token = generateUnsubscribeToken(email);
  return `${baseUrl}/api/outreach/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

/**
 * Add unsubscribe footer to email body
 */
export function addUnsubscribeFooter(body: string, email: string): string {
  const link = generateUnsubscribeLink(email);
  const footer = `\n\n---\n\nIf you'd like to stop receiving these emails, click here: ${link}`;
  return body + footer;
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
