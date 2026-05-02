import { redirect } from "next/navigation";
import { validateSession } from "@/lib/session";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage() {
  const session = await validateSession();

  if (!session) {
    redirect("/login");
  }

  if (session.userRole !== "ORBISY_ADMIN") {
    redirect("/console");
  }

  return <UsersPageClient />;
}
