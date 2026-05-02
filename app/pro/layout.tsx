import { redirect } from "next/navigation";
import { isHvacRole, validateSession } from "@/lib/session";
import ProClientLayout from "./ProClientLayout";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateSession();

  if (!session) {
    redirect("/login?callbackUrl=/pro");
  }

  if (!isHvacRole(session.userRole)) {
    if (session.userRole === "HOMEOWNER") {
      redirect("/portal");
    }
    redirect("/console");
  }

  return <ProClientLayout>{children}</ProClientLayout>;
}
