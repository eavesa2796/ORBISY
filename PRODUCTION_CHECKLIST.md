# ORBISY Production Checklist

Use this before deploying or handing the app back to Copilot. Do not commit real
secrets to the repo. Store production secrets in Vercel project environment
variables and rotate any secrets that were pasted into chat or local files.

## 1. GitHub

- Confirm `main` has the latest pushed commits.
- Confirm the working tree only contains intentional changes.
- Run the verification commands:
  - `npm run lint`
  - `npm test`
  - `npm run build`

## 2. Database

- Use the production Neon/Postgres pooled connection string for
  `DATABASE_URL`.
- Never edit already-applied migration SQL files.
- Apply migrations before or during deployment:
  - `npm run db:migrate`
  - `npm run db:generate`
- Confirm these core tables exist after deploy:
  - `User`
  - `Session`
  - `InviteToken`
  - `SalesCompany`
  - `SalesContact`
  - `SalesProposal`
  - `SalesProposalOption`
  - `SalesProposalEvent`
  - `SalesProposalSettings`
- Confirm `SalesProposalSettings` has the singleton default row, or open the
  pro settings page and save defaults once.
- Enable Neon backups or branching before running large imports or schema
  migrations.

## 3. Vercel Environment Variables

Required:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `CONTACT_FROM`
- `NEXT_PUBLIC_URL`
- `NEXT_PUBLIC_CALENDLY_URL`
- `CRON_SECRET`
- `INBOUND_WEBHOOK_SECRET`
- `UNSUBSCRIBE_SECRET`
- `GOOGLE_PLACES_API_KEY`

Recommended:

- `INVITE_FROM_EMAIL`
- `PROPOSAL_ACCEPTED_FROM_EMAIL`
- `PROPOSAL_ACCEPTED_NOTIFY_TO`
- `OUTREACH_SENDER_NAME`
- `OUTREACH_FROM_EMAIL`
- `PROPOSAL_FOLLOW_UP_DAYS`
- `PROPOSAL_MAX_FOLLOW_UPS`
- `PROPOSAL_FOLLOW_UP_BATCH_LIMIT`

Production values:

- Set `NEXT_PUBLIC_URL` to the final HTTPS app URL with no trailing slash.
- Use a verified sending domain in Resend for `CONTACT_FROM`,
  `INVITE_FROM_EMAIL`, `OUTREACH_FROM_EMAIL`, and
  `PROPOSAL_ACCEPTED_FROM_EMAIL`.
- Generate long random values for `CRON_SECRET`, `INBOUND_WEBHOOK_SECRET`, and
  `UNSUBSCRIBE_SECRET`.

## 4. Email

- Verify the sending domain in Resend.
- Test the public contact form.
- Test admin user invite email.
- Test pro homeowner invite email.
- Test proposal send/follow-up email.
- Test accepted proposal notification email to the HVAC team.

## 5. Accounts And Roles

- Create the first `ORBISY_ADMIN` with `node scripts/create-admin.mjs`.
- Use `/console/users` to invite:
  - `ORBISY_SALES` for internal ORBISY sales users.
  - `HVAC_OWNER` and `HVAC_SALES` for pro customer workspaces.
  - `HOMEOWNER` only when manually needed.
- Prefer the pro proposal history "Invite Homeowner" action for homeowner
  portal setup, because it links the homeowner to the correct proposal contact
  and HVAC company.

## 6. Cron And Workers

- Configure Vercel Cron for the outreach worker endpoint if campaign sending is
  enabled.
- Configure proposal follow-up automation with:
  - `PROPOSAL_FOLLOW_UP_DAYS`
  - `PROPOSAL_MAX_FOLLOW_UPS`
  - `PROPOSAL_FOLLOW_UP_BATCH_LIMIT`
- Protect worker routes with `CRON_SECRET`.
- Check Vercel function logs after the first scheduled run.

## 7. Smoke Test

After deployment, test these flows in production:

- Login as `ORBISY_ADMIN` and open `/console`.
- Invite an `HVAC_OWNER`, complete setup, and confirm they land on `/pro`.
- Login as the HVAC user and create or open a proposal.
- Send a proposal email and open the public proposal link.
- View/focus proposal options and confirm engagement appears in `/pro`.
- Invite the homeowner from proposal history.
- Complete homeowner setup and confirm they land on `/portal`.
- Accept a proposal and confirm:
  - proposal status changes to `ACCEPTED`
  - selected option is stored
  - accepted handoff works in `/pro`
  - accepted proposal notification email sends

## 8. Pre-Launch Security Items

- Replace SHA-256 password hashing with bcrypt or Argon2 before paid
  production usage.
- Confirm cookies are secure in production.
- Confirm rate limiting or abuse protection exists for public forms and webhooks.
- Rotate any database, Resend, or webhook secrets shared outside Vercel.
- Review public proposal pages for information that should not be exposed
  without authentication.
