import { Resend } from "resend";

export const runtime = "nodejs"; // keep this on Node runtime for email libs

type Payload = {
  businessName?: string;
  email?: string;
  message?: string;
  website?: string; // honeypot (spam trap)
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    // Basic anti-spam honeypot: real users won't fill this
    if (body.website && body.website.trim().length > 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const businessName = (body.businessName ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!email || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing email or message." }),
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // IMPORTANT:
    // - For production, use a verified domain and set `from` to something like: "Your Name <hello@yourdomain.com>"
    // - For quick testing, you can use Resend's onboarding/sandbox options depending on your account setup.
    const from = process.env.CONTACT_FROM ?? "anthonyeaves33@gmail.com";
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
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
    });
  }
}
