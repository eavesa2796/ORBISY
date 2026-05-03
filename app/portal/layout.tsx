import { redirect } from "next/navigation";
import { isHvacRole, validateSession } from "@/lib/session";
import PortalClientLayout from "./PortalClientLayout";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateSession();

  if (!session) {
    redirect("/login?callbackUrl=/portal");
  }

  if (session.userRole !== "HOMEOWNER") {
    if (isHvacRole(session.userRole)) {
      redirect("/pro");
    }
    redirect("/console");
  }

  return <PortalClientLayout>{children}</PortalClientLayout>;
}
