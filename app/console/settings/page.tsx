"use client";

import { useState } from "react";
import { Input } from "@/components/outreach/FormControls";
import { Button } from "@/components/outreach/Button";
import { useToast } from "@/components/outreach/Toast";

export default function SettingsPage() {
  const [cronSecret, setCronSecret] = useState(
    process.env.NEXT_PUBLIC_CRON_SECRET || ""
  );
  const { showToast } = useToast();

  function generateSecret() {
    const secret = Array.from(
      { length: 32 },
      () => Math.random().toString(36)[2]
    ).join("");
    setCronSecret(secret);
    showToast({ message: "Secret generated", type: "success" });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast({ message: "Copied to clipboard", type: "success" });
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-[color:var(--text)] mb-8">
        Settings
      </h1>

      <div className="space-y-8">
        {/* Environment Variables */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
            Environment Variables
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Add these to your .env.local file:
          </p>

          <div className="space-y-4">
            <EnvVar
              name="CRON_SECRET"
              description="Secret for authenticating cron jobs"
              value={cronSecret}
              onCopy={() => copyToClipboard(cronSecret)}
              onGenerate={generateSecret}
            />
            <EnvVar
              name="INBOUND_WEBHOOK_SECRET"
              description="Secret for webhook authentication"
              placeholder="your-webhook-secret-here"
            />
            <EnvVar
              name="UNSUBSCRIBE_SECRET"
              description="Secret for unsubscribe token generation"
              placeholder="your-unsubscribe-secret-here"
            />
            <EnvVar
              name="OUTREACH_SENDER_NAME"
              description="Name used in email templates"
              placeholder="Your Name"
            />
            <EnvVar
              name="OUTREACH_FROM_EMAIL"
              description="Default from email address"
              placeholder="outreach@yourdomain.com"
            />
            <EnvVar
              name="NEXT_PUBLIC_URL"
              description="Base URL for unsubscribe links"
              placeholder="https://yourdomain.com"
            />
          </div>
        </div>

        {/* Cron Setup */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
            Cron Job Setup
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Configure Vercel Cron to run the worker every 10 minutes:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm overflow-x-auto border border-[color:var(--border)]">
            <pre className="text-[color:var(--text)]">{`{
  "crons": [{
    "path": "/api/outreach/worker/send-due",
    "schedule": "*/10 * * * *"
  }]
}`}</pre>
          </div>

          <p className="text-sm text-[color:var(--muted)] mt-4">
            Or test locally by calling the endpoint with:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm mt-2 border border-[color:var(--border)]">
            <pre className="text-[color:var(--text)]">{`curl -X POST http://localhost:3000/api/outreach/worker/send-due \\
  -H "x-orbisy-cron-secret: ${cronSecret || "YOUR_SECRET"}"`}</pre>
          </div>
        </div>

        {/* Webhook Setup */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
            Inbound Email Webhook
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Configure your email provider to send inbound emails to:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm border border-[color:var(--border)] text-[color:var(--text)]">
            {process.env.NEXT_PUBLIC_URL || "https://yourdomain.com"}
            /api/outreach/webhooks/inbound-email
          </div>

          <p className="text-sm text-[color:var(--muted)] mt-4">
            Include the webhook secret in the header:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm mt-2 border border-[color:var(--border)] text-[color:var(--text)]">
            x-webhook-secret: YOUR_INBOUND_WEBHOOK_SECRET
          </div>
        </div>

        {/* Database Migration */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
            Database Migration
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Run the migration to create outreach tables:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm border border-[color:var(--border)] text-[color:var(--text)]">
            npx prisma migrate dev --name add_outreach_module
          </div>

          <p className="text-sm text-[color:var(--muted)] mt-4">
            Then generate the Prisma client:
          </p>

          <div className="bg-white/5 rounded p-4 font-mono text-sm mt-2 border border-[color:var(--border)] text-[color:var(--text)]">
            npx prisma generate
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvVar({
  name,
  description,
  value,
  placeholder,
  onCopy,
  onGenerate,
}: {
  name: string;
  description: string;
  value?: string;
  placeholder?: string;
  onCopy?: () => void;
  onGenerate?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-[color:var(--text)]">
          {name}
        </label>
        <div className="space-x-2">
          {onGenerate && (
            <Button size="sm" variant="secondary" onClick={onGenerate}>
              Generate
            </Button>
          )}
          {onCopy && (
            <Button size="sm" variant="secondary" onClick={onCopy}>
              Copy
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-[color:var(--muted)] mb-2">{description}</p>
      <Input
        value={value}
        placeholder={placeholder}
        readOnly={!!value}
        className="font-mono text-sm"
      />
    </div>
  );
}
