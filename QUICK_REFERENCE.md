# 🚀 ORBISY Outreach - Quick Reference

## 📋 Setup Checklist

```bash
# 1. Run migration
npx prisma migrate dev --name add_outreach_module
npx prisma generate

# 2. Generate secrets (run 3 times)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 3. Add to .env.local
CRON_SECRET="your-secret-1"
INBOUND_WEBHOOK_SECRET="your-secret-2"
UNSUBSCRIBE_SECRET="your-secret-3"

# 4. Start server
npm run dev

# 5. Open console
# http://localhost:3000/console
```

## 🎯 Core Concepts

### Lead Stages

```
NEW → CONTACTED → REPLIED → BOOKED → WON/LOST
```

### Campaign Flow

```
Create Campaign → Add Steps → Enroll Leads → Auto-Send → Capture Replies
```

### Message Status

```
SCHEDULED → SENT → DELIVERED → REPLIED/FAILED/CANCELED
```

## 📧 Template Variables

```
{{company}}      - Lead company name
{{contact}}      - Lead contact name
{{contactName}}  - Same as contact
{{city}}         - Lead city
{{industry}}     - Lead industry
{{website}}      - Lead website
{{role}}         - Lead role/title
{{phone}}        - Lead phone
{{sender}}       - Your sender name
{{senderName}}   - Same as sender
```

## 🔌 API Endpoints

### Leads

```bash
GET    /api/outreach/leads                # List
POST   /api/outreach/leads                # Create
PATCH  /api/outreach/leads/[id]           # Update
DELETE /api/outreach/leads/[id]           # Delete
POST   /api/outreach/leads/import-csv     # Import
GET    /api/outreach/leads/export         # Export
```

### Campaigns

```bash
GET    /api/outreach/campaigns            # List
POST   /api/outreach/campaigns            # Create
PATCH  /api/outreach/campaigns/[id]       # Update
DELETE /api/outreach/campaigns/[id]       # Delete
POST   /api/outreach/campaigns/[id]/enroll # Enroll
```

### System

```bash
POST   /api/outreach/worker/send-due      # Cron worker
POST   /api/outreach/webhooks/inbound-email # Webhook
GET    /api/outreach/inbox                # Replies
GET    /api/outreach/metrics/dashboard    # Metrics
POST   /api/outreach/unsubscribe          # Unsubscribe
```

## 🧪 Test Commands

### Test Worker Locally

```bash
curl -X POST http://localhost:3000/api/outreach/worker/send-due \
  -H "x-orbisy-cron-secret: YOUR_CRON_SECRET"
```

### Test Webhook Locally

```bash
curl -X POST http://localhost:3000/api/outreach/webhooks/inbound-email \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Re: Your email",
    "body": "Yes, interested!"
  }'
```

### Open Prisma Studio

```bash
npx prisma studio
```

## 📁 File Locations

### Backend

```
lib/outreach/
  ├── templating.ts      # {{var}} rendering
  ├── csv.ts             # CSV parser
  ├── metrics.ts         # Analytics
  ├── security.ts        # Auth & tokens
  └── email.ts           # Resend wrapper

app/api/outreach/
  ├── leads/             # CRUD routes
  ├── campaigns/         # Campaign routes
  ├── worker/            # Cron worker
  ├── webhooks/          # Inbound webhook
  ├── unsubscribe/       # Unsubscribe
  └── metrics/           # Analytics
```

### Frontend

```
app/console/
  ├── layout.tsx         # Sidebar
  ├── page.tsx           # Dashboard
  ├── leads/             # Lead management
  ├── campaigns/         # Campaign builder
  ├── inbox/             # Reply inbox
  └── settings/          # Config

components/outreach/
  ├── Button.tsx         # Buttons
  ├── Modal.tsx          # Modals
  ├── DataTable.tsx      # Tables
  ├── FormControls.tsx   # Inputs
  ├── Badge.tsx          # Badges
  └── Toast.tsx          # Toasts
```

## 🗄️ Database Models

```
OutreachLead
  - company, contactName, email, phone
  - stage, score, tags, notes
  - doNotContact, unsubscribedAt

OutreachCampaign
  - name, status, dailyLimit
  - fromMailbox, audienceRules

OutreachCampaignStep
  - stepIndex, dayOffset
  - subjectTemplate, bodyTemplate

OutreachEnrollment
  - leadId, campaignId, status

OutreachMessage
  - scheduledFor, sentAt, status
  - subjectRendered, bodyRendered

OutreachReply
  - fromEmail, subject, body, sentiment

OutreachUnsubscribe
  - email
```

## ⚙️ Environment Variables

### Required

```env
DATABASE_URL="postgresql://..."
RESEND_API_KEY="re_..."
CRON_SECRET="random-32-char"
INBOUND_WEBHOOK_SECRET="random-32-char"
UNSUBSCRIBE_SECRET="random-32-char"
```

### Optional

```env
OUTREACH_SENDER_NAME="Your Name"
OUTREACH_FROM_EMAIL="outreach@yourdomain.com"
NEXT_PUBLIC_URL="https://yourdomain.com"
```

## 🎨 UI Routes

```
/console              # Dashboard
/console/leads        # Lead management
/console/campaigns    # Campaign builder
/console/inbox        # Reply inbox
/console/settings     # Settings & setup
```

## 🔄 Workflow Example

### 1. Add Leads

```typescript
// Manual or CSV import
POST /api/outreach/leads
{
  "company": "Acme Corp",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "industry": "Technology"
}
```

### 2. Create Campaign

```typescript
POST /api/outreach/campaigns
{
  "name": "Q1 Outreach",
  "fromMailbox": "outreach@yourdomain.com",
  "dailyLimit": 30,
  "steps": [
    {
      "stepIndex": 0,
      "dayOffset": 0,
      "subjectTemplate": "Quick question about {{company}}",
      "bodyTemplate": "Hi {{contact}}, ..."
    },
    {
      "stepIndex": 1,
      "dayOffset": 3,
      "subjectTemplate": "Following up - {{company}}",
      "bodyTemplate": "Hi {{contact}}, just checking in..."
    }
  ]
}
```

### 3. Enroll Leads

```typescript
POST /api/outreach/campaigns/[id]/enroll
{
  "leadIds": ["lead-1", "lead-2"]
}
// Or omit leadIds to enroll all matching audience
```

### 4. Messages Auto-Send

```
Cron runs every 10 minutes:
→ Finds scheduled messages
→ Renders templates
→ Sends via Resend
→ Schedules next step
→ Tracks status
```

### 5. Capture Replies

```
Webhook receives reply:
→ Matches to lead
→ Analyzes sentiment
→ Updates lead stage
→ Stops sequence
→ Cancels future messages
```

## 🛡️ Safety Features

✅ **DNC List** - OutreachUnsubscribe table  
✅ **Stop on Reply** - Auto-stops enrollment  
✅ **Unsubscribe Links** - In every email  
✅ **Daily Limits** - Per campaign throttling  
✅ **Rate Limiting** - Max 100 messages/run  
✅ **Email Validation** - Before sending  
✅ **Cron Auth** - Secret header required  
✅ **Webhook Auth** - Signature verification

## 📊 Key Metrics

```typescript
Dashboard:
- Total Leads
- Active Leads
- Replied Leads
- Booked Meetings
- Active Campaigns
- Active Enrollments
- Messages Scheduled
- Sent Today
- Replies This Week

Campaign:
- Delivery Rate
- Reply Rate
- Positive Rate
- Booking Rate
```

## 🐛 Troubleshooting

### Messages Not Sending

```
□ Check campaign status = RUNNING
□ Verify leads have email
□ Check leads not on DNC
□ Test worker with curl
□ Check Resend API key
□ Review daily limits
```

### Replies Not Captured

```
□ Configure Resend webhook
□ Verify webhook secret
□ Check endpoint is public
□ Test with curl
□ Review webhook logs
```

### TypeScript Errors

```bash
npx prisma generate
# Restart TS server in VSCode
```

## 🚀 Production Deploy

```bash
# 1. Deploy to Vercel
vercel

# 2. Set env vars in Vercel dashboard
CRON_SECRET=...
INBOUND_WEBHOOK_SECRET=...
UNSUBSCRIBE_SECRET=...
OUTREACH_SENDER_NAME=...
OUTREACH_FROM_EMAIL=...
NEXT_PUBLIC_URL=https://yourdomain.vercel.app

# 3. Cron is automatic (vercel.json)

# 4. Configure Resend webhook
URL: https://yourdomain.vercel.app/api/outreach/webhooks/inbound-email
Header: x-webhook-secret: YOUR_SECRET
Events: email.received
```

## 📚 Documentation

- **SETUP_GUIDE.md** - Quick start (5 min)
- **OUTREACH_README.md** - Full docs (comprehensive)
- **IMPLEMENTATION_SUMMARY.md** - Technical details

## 🎯 Common Tasks

### Generate Secret

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Import CSV

```csv
company,contactName,email,role,city,industry
Acme Corp,John Doe,john@acme.com,CEO,SF,Tech
```

### Check Scheduled Messages

```bash
npx prisma studio
# Open OutreachMessage table
# Filter: status = SCHEDULED
```

### Force Send Now

```sql
-- In Prisma Studio or SQL
UPDATE "OutreachMessage"
SET "scheduledFor" = NOW()
WHERE status = 'SCHEDULED'
```

---

**Quick Start**: Run `setup-outreach.bat` → Visit `/console/settings` → Follow guide

**Need Help?** Check `OUTREACH_README.md` for detailed docs
