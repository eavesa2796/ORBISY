# 🚀 ORBISY Outreach Module - Quick Setup Guide

## ⚡ Quick Start (5 minutes)

### 1. Run Database Migration

**Windows:**

```cmd
setup-outreach.bat
```

**Mac/Linux:**

```bash
npx prisma migrate dev --name add_outreach_module
npx prisma generate
```

### 2. Update Environment Variables

The `.env.local` file has been updated with placeholder secrets. Generate real secrets:

```bash
# Generate 3 random secrets (32 characters each)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Replace these in `.env.local`:

- `CRON_SECRET`
- `INBOUND_WEBHOOK_SECRET`
- `UNSUBSCRIBE_SECRET`

Or visit `/console/settings` after starting the server to generate them in the UI.

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Console

Open: **http://localhost:3000/console**

You should see the dashboard with navigation for:

- 📊 Dashboard
- 👥 Leads
- 📧 Campaigns
- 📥 Inbox
- ⚙️ Settings

## 📝 What Was Added

### Database Models (7 new tables)

✅ OutreachLead - CRM with stages, scores, tags  
✅ OutreachCampaign - Email campaigns configuration  
✅ OutreachCampaignStep - Multi-step sequences  
✅ OutreachEnrollment - Lead → Campaign relationships  
✅ OutreachMessage - Individual scheduled/sent emails  
✅ OutreachReply - Inbound replies with sentiment  
✅ OutreachUnsubscribe - Do-not-contact list

### API Routes (15 endpoints)

✅ `/api/outreach/leads` - CRUD operations  
✅ `/api/outreach/leads/import-csv` - Bulk import  
✅ `/api/outreach/leads/export` - CSV download  
✅ `/api/outreach/campaigns` - Campaign management  
✅ `/api/outreach/campaigns/[id]/enroll` - Enroll leads  
✅ `/api/outreach/worker/send-due` - Automated sending  
✅ `/api/outreach/webhooks/inbound-email` - Reply capture  
✅ `/api/outreach/unsubscribe` - Unsubscribe handling  
✅ `/api/outreach/inbox` - Reply inbox  
✅ `/api/outreach/metrics/dashboard` - Analytics

### Console Pages (5 pages)

✅ `/console` - Dashboard with metrics  
✅ `/console/leads` - Lead management + CSV import/export  
✅ `/console/campaigns` - Campaign builder + enrollment  
✅ `/console/inbox` - Reply triage with sentiment  
✅ `/console/settings` - Configuration guide

### Utilities & Components

✅ Template rendering (`{{company}}`, `{{contact}}`, etc.)  
✅ CSV parsing and export  
✅ Email sending via Resend  
✅ Security (cron auth, webhooks, unsubscribe tokens)  
✅ UI components (Button, Modal, DataTable, etc.)

## 🎯 Test It Out

### 1. Add a Test Lead

1. Go to `/console/leads`
2. Click "Add Lead"
3. Enter:
   - Company: "Test Corp"
   - Contact Name: "John Doe"
   - Email: your-test-email@example.com
   - Industry: "Technology"
   - City: "San Francisco"

### 2. Create a Campaign

1. Go to `/console/campaigns`
2. Click "Create Campaign"
3. Enter:
   - Name: "Test Campaign"
   - From Email: "outreach@resend.dev"
   - Daily Limit: 10
4. Add Step 1:
   - Subject: `Quick question about {{company}}`
   - Body:

     ```
     Hi {{contact}},

     I noticed {{company}} is in {{city}}.

     Would love to connect!

     Best,
     {{sender}}
     ```
5. Add Step 2 (Follow-up after 3 days):
   - Day Offset: 3
   - Subject: `Following up - {{company}}`
   - Body:

     ```
     Hi {{contact}},

     Just wanted to follow up on my previous email.

     Let me know if you're interested!

     {{sender}}
     ```

### 3. Enroll Leads

1. Open the campaign you created
2. Click "Enroll Matching Leads"
3. Leads will be enrolled and first step scheduled

### 4. Test the Worker (Manual)

The worker normally runs via cron every 10 minutes. Test it manually:

```bash
curl -X POST http://localhost:3000/api/outreach/worker/send-due \
  -H "x-orbisy-cron-secret: YOUR_CRON_SECRET"
```

Check the response - it should show emails sent!

### 5. View Scheduled Messages

Check your database:

```bash
npx prisma studio
```

Look at the `OutreachMessage` table to see scheduled emails.

## 🔧 Production Deployment (Vercel)

### 1. Deploy to Vercel

```bash
vercel
```

### 2. Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables

Add:

```
CRON_SECRET=your-random-secret
INBOUND_WEBHOOK_SECRET=your-random-secret
UNSUBSCRIBE_SECRET=your-random-secret
OUTREACH_SENDER_NAME=Your Name
OUTREACH_FROM_EMAIL=outreach@yourdomain.com
NEXT_PUBLIC_URL=https://yourdomain.vercel.app
```

### 3. Cron Job is Automatic

The `vercel.json` file configures the cron job automatically. Vercel will call `/api/outreach/worker/send-due` every 10 minutes.

### 4. Configure Resend Webhook

1. Go to Resend Dashboard → Webhooks
2. Add webhook:
   - URL: `https://yourdomain.vercel.app/api/outreach/webhooks/inbound-email`
   - Header: `x-webhook-secret: YOUR_INBOUND_WEBHOOK_SECRET`
   - Events: `email.received`

Now replies will be captured automatically!

## 📊 Features Overview

### Lead Management

- ✅ Add/edit/delete leads
- ✅ CSV import with deduplication
- ✅ CSV export
- ✅ Lead stages (NEW, CONTACTED, REPLIED, BOOKED, WON, LOST)
- ✅ Lead scoring (0-100)
- ✅ Tags and notes
- ✅ Do-not-contact toggle

### Campaign Builder

- ✅ Multi-step email sequences
- ✅ Template variables ({{company}}, {{contact}}, etc.)
- ✅ Day offset scheduling (Day 0, Day 3, Day 7, etc.)
- ✅ Audience targeting (industry, location, score)
- ✅ Start/pause campaigns
- ✅ Daily send limits

### Automated Sending

- ✅ Cron-based worker (every 10 minutes)
- ✅ Respects daily limits
- ✅ Skips DNC leads
- ✅ Automatically schedules next steps
- ✅ Tracks sent/delivered/failed status
- ✅ Stops on reply

### Reply Management

- ✅ Automatic reply capture via webhook
- ✅ Sentiment analysis (Positive/Neutral/Negative)
- ✅ Auto-stop sequences when replied
- ✅ Lead stage updated to REPLIED
- ✅ Quick reply templates

### Safety & Compliance

- ✅ Unsubscribe links in every email
- ✅ Do-not-contact list
- ✅ Stop-on-reply
- ✅ Unsubscribe webhook
- ✅ Rate limiting
- ✅ Daily send limits

### Analytics

- ✅ Dashboard with key metrics
- ✅ Leads by stage
- ✅ Campaign performance
- ✅ Reply rates
- ✅ Booking rates

## 🎨 Customization

### Add Custom Template Variables

Edit `lib/outreach/templating.ts`:

```typescript
export function getAvailableVariables(): string[] {
  return [
    "company",
    "contact",
    "city",
    "industry",
    "customField", // Add your custom field
  ];
}
```

### Enhance Sentiment Analysis

Edit `app/api/outreach/webhooks/inbound-email/route.ts`:

```typescript
// Replace simple keyword matching with AI
const sentiment = await analyzeSentimentWithGPT(body);
```

### Add Authentication

Currently, the console is open. To add auth:

1. Install NextAuth or Clerk
2. Wrap `/console` routes with auth middleware
3. Add user context to API routes

Example with middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/console")) {
    // Check authentication
    const token = request.cookies.get("auth-token");
    if (!token) {
      return NextResponse.redirect("/login");
    }
  }
}
```

## 📚 Full Documentation

See `OUTREACH_README.md` for complete documentation including:

- Detailed API reference
- Advanced configuration
- Troubleshooting guide
- Architecture overview
- Database schema details

## ✅ Verification Checklist

- [ ] Migration ran successfully
- [ ] Environment variables set
- [ ] Dev server starts without errors
- [ ] Console loads at `/console`
- [ ] Can add a lead manually
- [ ] Can import leads from CSV
- [ ] Can create a campaign
- [ ] Can enroll leads in campaign
- [ ] Worker endpoint responds to curl test
- [ ] TypeScript compiles without errors

## 🆘 Need Help?

### Common Issues

**"Cron job not running"**

- In development, run manually with curl
- In production, check Vercel logs and verify CRON_SECRET is set

**"Emails not sending"**

- Check Resend API key is valid
- Verify campaign status is RUNNING
- Check leads have valid email addresses

**"Replies not captured"**

- Configure Resend webhook
- Verify INBOUND_WEBHOOK_SECRET matches
- Test with Resend webhook test feature

**"TypeScript errors"**

- Run `npx prisma generate` after any schema changes
- Restart TypeScript server in VSCode

### Files Created/Modified

**Modified:**

- `prisma/schema.prisma` - Added 7 outreach models
- `.env.local` - Added outreach environment variables

**Created:**

- `lib/outreach/*` - 5 utility files
- `app/api/outreach/*` - 15 API routes
- `app/console/*` - 5 console pages
- `components/outreach/*` - 6 UI components
- `vercel.json` - Cron configuration
- `OUTREACH_README.md` - Full documentation
- `setup-outreach.bat` - Windows setup script
- `SETUP_GUIDE.md` - This file

## 🎉 You're All Set!

The outreach module is now fully integrated into ORBISY. Start adding leads, creating campaigns, and automating your outreach!

**Next Steps:**

1. Run the migration
2. Generate secrets
3. Add test leads
4. Create first campaign
5. Deploy to production

Happy outreaching! 🚀
