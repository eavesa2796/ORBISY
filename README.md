# ORBISY Local Setup

## Environment

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to your local PostgreSQL database.
3. Keep `.env.local` and `.env` uncommitted. `.gitignore` already excludes both.

For local development, the app runtime, Prisma CLI, and `scripts/create-admin.mjs` all load `.env.local`. `.env` remains supported as a fallback for non-Next workflows.

## Database bootstrap

Run the local auth/database setup in this order:

```bash
npm run db:migrate
npm run db:generate
npm run db:create-admin
```

The admin script creates an active `ORBISY_ADMIN` user using the same Prisma Postgres adapter path as the app.

## Development

Start the app with:

```bash
npm run dev
```

Open `http://localhost:3000/login` and sign in with the seeded admin account. In development only, failed logins now include a short diagnostic message for missing migrations, missing tables, or database connectivity issues.
