import { redirect } from "next/navigation";
import { isHvacRole, isOrbisyRole, validateSession } from "@/lib/session";
import ConsoleClientLayout from "./ConsoleClientLayout";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validate session on the server
  const session = await validateSession();

  // If no valid session, redirect to login
  if (!session) {
    redirect("/login");
  }

  if (!isOrbisyRole(session.userRole)) {
    if (isHvacRole(session.userRole)) {
      redirect("/pro");
    }
    redirect("/portal");
  }

  return (
    <ConsoleClientLayout currentUserRole={session.userRole}>
      {children}
    </ConsoleClientLayout>
  );
}
