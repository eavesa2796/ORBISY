import { Resend } from "resend";

type InviteRole = "ORBISY_SALES" | "HVAC_OWNER" | "HVAC_SALES" | "HOMEOWNER";

export interface SendInviteEmailParams {
  to: string;
  inviteeName: string;
  inviterName: string;
  role: InviteRole;
  setupUrl: string;
  companyName?: string;
}

export interface SendInviteEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const roleLabels: Record<InviteRole, string> = {
  ORBISY_SALES: "ORBISY Sales",
  HVAC_OWNER: "HVAC Owner",
  HVAC_SALES: "HVAC Sales",
  HOMEOWNER: "Homeowner",
};

function getInviteFromEmail() {
  return (
    process.env.INVITE_FROM_EMAIL ||
    process.env.CONTACT_FROM ||
    process.env.OUTREACH_FROM_EMAIL ||
    "onboarding@resend.dev"
  );
}

export async function sendUserInviteEmail(
  params: SendInviteEmailParams,
): Promise<SendInviteEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const roleLabel = roleLabels[params.role];
  const scopeLine = params.companyName
    ? `This invite is linked to ${params.companyName}.`
    : "";

  const text = [
    `Hi ${params.inviteeName},`,
    "",
    `${params.inviterName} invited you to ORBISY as ${roleLabel}.`,
    scopeLine,
    "",
    "Use this secure one-time link to set your password:",
    params.setupUrl,
    "",
    "This link expires in 7 days.",
    "If you were not expecting this invite, you can ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data, error } = await resend.emails.send({
      from: getInviteFromEmail(),
      to: params.to,
      subject: "You are invited to ORBISY",
      text,
    });

    if (error) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
