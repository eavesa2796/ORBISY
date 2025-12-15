import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Payload = {
  businessName?: string;
  email?: string;
  message?: string;
  website?: string; // honeypot
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    console.log("📥 Received form submission:", body);

    // Honeypot (spam trap)
    if (body.website && body.website.trim().length > 0) {
      console.log("🚫 Honeypot triggered - spam blocked");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const businessName = (body.businessName ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();

    // ✅ Validation (keep this before DB/email)
    if (!email || !message) {
      console.log("❌ Validation failed - missing email or message");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing email or message." }),
        { status: 400 }
      );
    }

    // ✅ RIGHT HERE: Save to DB (before sending email)
    console.log("💾 Attempting to save to database...");
    const lead = await prisma.lead.create({
      data: {
        businessName: businessName || null,
        email,
        message,
      },
    });
    console.log("✅ Lead saved to database:", lead);

    // Then send email
    const resend = new Resend(process.env.RESEND_API_KEY);

    const from = process.env.CONTACT_FROM ?? "onboarding@resend.dev";
    const to = (process.env.CONTACT_TO ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (to.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "CONTACT_TO is not configured." }),
        { status: 500 }
      );
    }

    const subject = `New website lead${
      businessName ? ` — ${businessName}` : ""
    }`;

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject,
      text: `Business: ${
        businessName || "(not provided)"
      }\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("💥 Error in contact API:", err);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
    });
  }
}
