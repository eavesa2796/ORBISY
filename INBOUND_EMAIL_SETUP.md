# Inbound Email Setup Guide

## Current Situation

Your outreach system is **fully functional for sending emails** using Resend. However, **inbound reply capture requires additional setup** because Resend doesn't natively support receiving emails.

## Why Replies Don't Show Up

When someone replies to your outreach emails:

1. ✅ The reply goes to your email address (e.g., info@orbisy.com)
2. ❌ **But Resend doesn't forward that reply to your webhook**
3. ❌ So your application never receives it

## Testing Solution (Available Now)

### Use the Test Reply Feature

I've added a **"🧪 Test Reply" button** to your Inbox page that lets you manually create test replies:

1. Go to `/console/inbox`
2. Click **"🧪 Test Reply"** button
3. Enter:
   - **Lead Email**: Email of an existing lead (must exist in your database)
   - **Subject**: Reply subject (e.g., "Re: Your outreach")
   - **Body**: Message content
4. Click **"Create Test Reply"**

This will:

- ✅ Create the reply in your inbox
- ✅ Update the lead status to "REPLIED"
- ✅ Stop active campaign enrollments
- ✅ Cancel future scheduled messages
- ✅ Analyze sentiment (POSITIVE/NEUTRAL/NEGATIVE)

### Test API Endpoint

You can also test programmatically:

```bash
curl -X POST http://localhost:3000/api/outreach/webhooks/test-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lead@company.com",
    "subject": "Re: Your email",
    "body": "Yes, I'\''m interested! Let'\''s schedule a call."
  }'
```

## Production Solutions

To get **real inbound email capture**, you have 3 options:

### Option 1: Email Forwarding (Simplest)

Set up email forwarding from your inbox:

1. In your email provider (Gmail, Outlook, etc.), create a forwarding rule
2. Forward all emails to a service like:
   - **Zapier Email Parser** → triggers your webhook
   - **Make.com (Integromat)** → triggers your webhook
   - **Cloudflare Email Workers** → custom routing

**Pros**: Simple, works with any email provider
**Cons**: Adds latency, requires manual setup

### Option 2: Switch Email Provider (Recommended)

Use an email service that supports **both sending AND receiving**:

#### A. **SendGrid** (Most Popular)

- Supports inbound parse webhooks
- Good deliverability
- Similar pricing to Resend

Setup:

1. Sign up at sendgrid.com
2. Configure MX records for your domain
3. Set inbound parse webhook to: `https://yourdomain.com/api/outreach/webhooks/inbound-email`
4. Update your code to use SendGrid API instead of Resend

#### B. **Postmark**

- Excellent deliverability
- Built-in inbound email support
- Clean API

#### C. **Mailgun**

- Good for developers
- Inbound email routing
- Pay-as-you-go pricing

### Option 3: Cloudflare Email Routing + Workers

If you use Cloudflare for DNS:

1. Enable Cloudflare Email Routing (free)
2. Create a Cloudflare Worker to parse inbound emails
3. Worker forwards to your webhook

**Pros**: Free, powerful
**Cons**: Requires Cloudflare setup

## Webhook Security

Your webhook (`/api/outreach/webhooks/inbound-email`) already has security built in:

- Requires `x-webhook-secret` header
- Verifies against `INBOUND_WEBHOOK_SECRET` in your .env

Make sure to:

1. Keep `INBOUND_WEBHOOK_SECRET` private
2. Add it to your production environment variables (Vercel)
3. Configure your email provider to send this header

## Recommended Next Steps

### For Development/Testing:

✅ Use the **"🧪 Test Reply"** button in the Inbox page

### For Production:

1. **Evaluate email providers** based on your needs:

   - SendGrid: Best all-around option
   - Postmark: Premium deliverability
   - Keep Resend + add email forwarding: Quick fix

2. **Choose your approach**:

   - **Short-term**: Email forwarding via Zapier/Make
   - **Long-term**: Switch to SendGrid or Postmark

3. **Implementation priority**:
   - The test feature works perfectly for demos and testing
   - Real inbound capture can be added later without changing your database or logic

## Questions?

The inbound email webhook is **fully implemented and ready** - it just needs an email provider that can send webhooks. Your current setup works great for outbound emails, and the test feature lets you validate the entire reply workflow without any external dependencies.
