import { redirect } from "next/navigation";
import { validateSession } from "@/lib/session";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string; role?: string }>;
}) {
  const session = await validateSession();
  const params = searchParams ? await searchParams : {};

  if (!session) {
    redirect("/login");
  }

  if (session.userRole !== "ORBISY_ADMIN") {
    redirect("/console");
  }

  return (
    <UsersPageClient
      defaultCompanyId={params.companyId || ""}
      defaultRole={params.role || ""}
    />
  );
}
