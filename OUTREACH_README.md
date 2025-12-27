# ORBISY Outreach Module

A fully automated outreach system built into ORBISY with lead management, email campaigns, automated sequences, reply capture, and inbox triage.

## 🚀 Features

- **Lead Management**: CRM with stages, scores, tags, and custom fields
- **Campaign Builder**: Multi-step email sequences with template variables
- **Automated Sending**: Scheduled worker sends emails respecting daily limits
- **Reply Capture**: Webhook captures inbound replies and stops sequences
- **Inbox Triage**: Sentiment analysis (Positive/Neutral/Negative)
- **CSV Import/Export**: Bulk lead management
- **Unsubscribe Handling**: Automatic DNC list and link generation
- **Analytics Dashboard**: Track deliverability, reply rates, bookings

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- PostgreSQL database (Neon, Supabase, or local)
- Resend account for email sending (already configured)
- Vercel account (for cron jobs in production)

## 🛠️ Installation

### 1. Database Migration

Run the Prisma migration to create the outreach tables:

```bash
npx prisma migrate dev --name add_outreach_module
npx prisma generate
```

This creates the following models:

- OutreachLead
- OutreachCampaign
- OutreachCampaignStep
- OutreachEnrollment
- OutreachMessage
- OutreachReply
- OutreachUnsubscribe

### 2. Environment Variables

Add these to your `.env.local`:

```env
# Existing variables (already configured)
DATABASE_URL="your-postgres-url"
RESEND_API_KEY="re_..."

# New outreach module variables
CRON_SECRET="generate-random-32-char-string"
INBOUND_WEBHOOK_SECRET="generate-random-32-char-string"
UNSUBSCRIBE_SECRET="generate-random-32-char-string"
OUTREACH_SENDER_NAME="Your Name"
OUTREACH_FROM_EMAIL="outreach@yourdomain.com"
NEXT_PUBLIC_URL="http://localhost:3000"
```

**Generate secrets** using:

```bash
openssl rand -hex 16
```

Or visit `/console/settings` after starting the app to generate them.

### 3. Start Development Server

```bash
npm run dev
```

Access the console at: **http://localhost:3000/console**

## 📧 Email Setup

The outreach module uses your existing **Resend** integration. No additional email provider setup needed!

### Unsubscribe Links

Every outreach email automatically includes an unsubscribe link at the bottom:

```
If you'd like to stop receiving these emails, click here: [unsubscribe link]
```

The link goes to `/api/outreach/unsubscribe?email=...&token=...`

## 🔄 Cron Job (Automated Sending)

### Development

Test the worker manually:

```bash
curl -X POST http://localhost:3000/api/outreach/worker/send-due \
  -H "x-orbisy-cron-secret: YOUR_CRON_SECRET"
```

### Production (Vercel)

The included `vercel.json` configures a cron job to run every 10 minutes:

```json
{
  "crons": [
    {
      "path": "/api/outreach/worker/send-due",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Vercel automatically adds the `x-orbisy-cron-secret` header from your environment variables.

**Important**: Set `CRON_SECRET` in your Vercel project settings (not just `.env.local`).

## 📥 Inbound Email Webhook

To capture replies, configure your email provider to forward inbound emails to:

```
https://yourdomain.com/api/outreach/webhooks/inbound-email
```

### Resend Webhook Setup

1. Go to Resend Dashboard → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/outreach/webhooks/inbound-email`
3. Add header: `x-webhook-secret: YOUR_INBOUND_WEBHOOK_SECRET`
4. Enable events: `email.received`

When a lead replies:

- Reply is saved to `OutreachReply`
- Lead stage → `REPLIED`
- Active enrollments → `STOPPED`
- Future messages → `CANCELED`
- Sentiment analyzed automatically

## 🎯 Usage Guide

### 1. Add Leads

**Manual**:

- Go to `/console/leads`
- Click "Add Lead"
- Fill in company, contact name, email, etc.

**CSV Import**:

- Click "Import CSV"
- Paste CSV with columns: `company,contactName,email,role,phone,website,city,industry,score,tags,notes`
- Duplicates are automatically skipped

**Export**:

- Click "Export CSV" to download all leads

### 2. Create Campaign

- Go to `/console/campaigns`
- Click "Create Campaign"
- Set campaign name and from email
- Add sequence steps:
  - Step 1: Initial email (Day 0)
  - Step 2: Follow-up (Day 3)
  - Step 3: Final touch (Day 7)
- Use template variables: `{{company}}`, `{{contact}}`, `{{city}}`, `{{industry}}`, `{{sender}}`, `{{website}}`, `{{role}}`, `{{phone}}`

Example:

```
Subject: Quick question about {{company}}

Hi {{contact}},

I noticed {{company}} is in the {{industry}} space in {{city}}.

We help companies like yours...

Best,
{{sender}}
```

### 3. Enroll Leads

- Open campaign details
- Click "Enroll Matching Leads"
- Leads matching audience criteria are enrolled
- First step is scheduled immediately
- Subsequent steps scheduled based on `dayOffset`

### 4. Campaign Management

- **Start/Pause**: Toggle campaign status
- **Daily Limit**: Controls max sends per day per campaign
- **Audience Rules**: Filter by industry, location, score

### 5. Monitor Inbox

- Go to `/console/inbox`
- View all replies
- Filter by sentiment: Positive / Neutral / Negative
- Use quick reply templates

### 6. Analytics

Dashboard shows:

- Total leads and stages
- Active campaigns
- Messages sent today
- Replies this week
- Booking rates

## 🔒 Security Features

### Do Not Contact (DNC)

- Leads with `doNotContact = true` are skipped
- Unsubscribes automatically set DNC
- Manual DNC toggle in lead editor

### Stop on Reply

When a lead replies:

- All active enrollments stopped
- Future scheduled messages canceled
- Prevents over-communication

### Throttling

- Worker processes max 100 messages per run
- Campaign daily limits respected
- Prevents sending spikes

### Unsubscribe Compliance

- Every email includes unsubscribe link
- Unsubscribes immediately processed
- Adds to `OutreachUnsubscribe` table
- Updates lead `doNotContact` flag

## 🏗️ Architecture

```
/app
  /console                 # Console pages
    layout.tsx            # Sidebar navigation
    page.tsx              # Dashboard
    /leads                # Lead management
    /campaigns            # Campaign builder
    /inbox                # Reply inbox
    /settings             # Configuration
  /api/outreach
    /leads                # CRUD + CSV import/export
    /campaigns            # Campaign management + enrollment
    /worker/send-due      # Automated sending worker
    /webhooks/inbound-email  # Reply capture
    /unsubscribe          # Unsubscribe handler
    /metrics              # Analytics

/lib/outreach
  templating.ts           # {{variable}} rendering
  csv.ts                  # CSV parsing/export
  metrics.ts              # Analytics calculations
  security.ts             # Auth, tokens, rate limiting
  email.ts                # Email sending via Resend

/components/outreach
  Button.tsx              # UI components
  Modal.tsx
  DataTable.tsx
  FormControls.tsx
  Badge.tsx
  Toast.tsx

/prisma
  schema.prisma           # Database models
```

## 📊 Database Schema

### Core Models

- **OutreachLead**: Contact information, stage, score, tags
- **OutreachCampaign**: Campaign config, audience rules, status
- **OutreachCampaignStep**: Sequence steps with templates
- **OutreachEnrollment**: Lead ↔ Campaign relationship
- **OutreachMessage**: Individual emails (scheduled/sent)
- **OutreachReply**: Inbound replies with sentiment
- **OutreachUnsubscribe**: DNC list

### Relationships

```
Lead → Enrollments → Campaign → Steps → Messages
Lead → Replies → Campaign
```

## 🐛 Troubleshooting

### Messages not sending

1. Check cron job is configured (Vercel or manual testing)
2. Verify `CRON_SECRET` matches in env and request header
3. Check campaign status is `RUNNING`
4. Verify leads have valid email addresses
5. Check Resend API key and limits

### Replies not captured

1. Configure webhook in Resend dashboard
2. Verify `INBOUND_WEBHOOK_SECRET` matches
3. Check webhook endpoint is publicly accessible
4. Test with Resend webhook test feature

### Unsubscribe links not working

1. Set `UNSUBSCRIBE_SECRET` in environment
2. Verify `NEXT_PUBLIC_URL` is correct
3. Check token generation in email body

## 🔧 Customization

### Custom Template Variables

Edit `lib/outreach/templating.ts` to add variables:

```typescript
export function getAvailableVariables(): string[] {
  return [
    "company",
    "contact",
    "customField", // Add yours here
  ];
}
```

### Sentiment Analysis

Enhance `webhooks/inbound-email/route.ts` function `classifySentiment()`:

```typescript
// Integrate with GPT, Claude, or sentiment API
const sentiment = await analyzeSentiment(body);
```

### Email Provider

To use a different provider, update `lib/outreach/email.ts`:

```typescript
export async function sendOutreachEmail(params) {
  // Replace Resend with SendGrid, Mailgun, etc.
}
```

## 📝 API Reference

### Public Endpoints

- `POST /api/outreach/unsubscribe` - Unsubscribe from emails
- `GET /api/outreach/unsubscribe?email=...&token=...` - Unsubscribe page

### Protected Endpoints (require auth)

- `GET /api/outreach/leads` - List leads
- `POST /api/outreach/leads` - Create lead
- `POST /api/outreach/leads/import-csv` - Import CSV
- `GET /api/outreach/leads/export` - Export CSV
- `GET /api/outreach/campaigns` - List campaigns
- `POST /api/outreach/campaigns` - Create campaign
- `POST /api/outreach/campaigns/[id]/enroll` - Enroll leads
- `GET /api/outreach/inbox` - Get replies
- `GET /api/outreach/metrics/dashboard` - Dashboard metrics

### System Endpoints

- `POST /api/outreach/worker/send-due` - Cron worker (requires `CRON_SECRET`)
- `POST /api/outreach/webhooks/inbound-email` - Email webhook (requires `INBOUND_WEBHOOK_SECRET`)

## 🚦 Next Steps

1. **Run migration**: `npx prisma migrate dev`
2. **Set environment variables** in `.env.local`
3. **Start dev server**: `npm run dev`
4. **Access console**: http://localhost:3000/console
5. **Import sample leads** via CSV
6. **Create first campaign**
7. **Test worker**: Run manual curl command
8. **Deploy to Vercel**
9. **Configure webhook** in Resend

## 📄 License

Part of the ORBISY project.

---

Built with Next.js 15, TypeScript, Prisma, PostgreSQL, and Resend.
