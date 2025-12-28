import { redirect } from "next/navigation";
import { validateSession } from "@/lib/session";
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

  return <ConsoleClientLayout>{children}</ConsoleClientLayout>;
}
