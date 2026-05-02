"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type UserRole =
  | "ORBISY_ADMIN"
  | "ORBISY_SALES"
  | "HVAC_OWNER"
  | "HVAC_SALES"
  | "HOMEOWNER";

const companyLinkedRoles: UserRole[] = [
  "HVAC_OWNER",
  "HVAC_SALES",
  "HOMEOWNER",
];

const roleLabels: Record<UserRole, string> = {
  ORBISY_ADMIN: "ORBISY Admin",
  ORBISY_SALES: "ORBISY Sales",
  HVAC_OWNER: "HVAC Owner",
  HVAC_SALES: "HVAC Sales",
  HOMEOWNER: "Homeowner",
};

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  customerCompanyId: string | null;
  customerContactId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  customerCompany: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  customerContact: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
};

type CompanyOption = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  contacts: Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    isPrimary: boolean;
  }>;
};

type CreateFormState = {
  name: string;
  email: string;
  role: UserRole;
  customerCompanyId: string;
  customerContactId: string;
};

const emptyForm: CreateFormState = {
  name: "",
  email: "",
  role: "HOMEOWNER",
  customerCompanyId: "",
  customerContactId: "",
};

export default function UsersPageClient() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === form.customerCompanyId),
    [companies, form.customerCompanyId],
  );

  async function loadUsers() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
      setCompanies(data.companies || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof CreateFormState>(
    key: K,
    value: CreateFormState[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "role" && !companyLinkedRoles.includes(value as UserRole)) {
        next.customerCompanyId = "";
        next.customerContactId = "";
      }
      if (key === "customerCompanyId") {
        next.customerContactId = "";
      }
      return next;
    });
    setMessage(null);
  }

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        customerCompanyId: companyLinkedRoles.includes(form.role)
          ? form.customerCompanyId
          : undefined,
        customerContactId:
          companyLinkedRoles.includes(form.role) && form.customerContactId
            ? form.customerContactId
            : undefined,
      };

      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setForm(emptyForm);
      await loadUsers();
      setMessage({
        type: "success",
        text: `Invite sent to ${data.invite.email}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: ManagedUser) {
    const nextActive = !user.isActive;
    if (
      !nextActive &&
      !confirm(`Deactivate ${user.name}? They will be signed out immediately.`)
    ) {
      return;
    }

    setActionUserId(user.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? data.user : item)),
      );
      setMessage({
        type: "success",
        text: `${user.name} is now ${nextActive ? "active" : "inactive"}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">Users</h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Manage ORBISY, HVAC, and homeowner access.
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Invite User
        </h2>
        <form onSubmit={inviteUser} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
                disabled={saving}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
                disabled={saving}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => updateForm("role", e.target.value as UserRole)}
                disabled={saving}
                className={inputCls}
              >
                <option value="HOMEOWNER">Homeowner</option>
                <option value="HVAC_SALES">HVAC Sales</option>
                <option value="HVAC_OWNER">HVAC Owner</option>
                <option value="ORBISY_SALES">ORBISY Sales</option>
              </select>
            </Field>
          </div>

          <p className="text-xs text-[color:var(--muted)]">
            Invite-only flow: recipients receive a secure one-time link to set
            their password.
          </p>

          {companyLinkedRoles.includes(form.role) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Linked Company">
                <select
                  value={form.customerCompanyId}
                  onChange={(e) =>
                    updateForm("customerCompanyId", e.target.value)
                  }
                  required
                  disabled={saving}
                  className={inputCls}
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {formatCompany(company)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Linked Contact">
                <select
                  value={form.customerContactId}
                  onChange={(e) =>
                    updateForm("customerContactId", e.target.value)
                  }
                  disabled={saving || !selectedCompany}
                  className={inputCls}
                >
                  <option value="">No contact selected</option>
                  {selectedCompany?.contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {formatContact(contact)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2.5 font-semibold text-[#001] disabled:opacity-60"
          >
            {saving ? "Sending invite..." : "Send Invite"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">
            Existing Users
          </h2>
        </div>

        {loading ? (
          <p className="p-5 text-[color:var(--muted)]">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-[color:var(--muted)]">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Company</th>
                  <th className="px-5 py-3 font-semibold">Last Login</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {users.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-[color:var(--text)]">
                        {user.name}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-4 text-[color:var(--muted)]">
                      {user.customerCompany ? (
                        <>
                          <p className="text-[color:var(--text)]">
                            {user.customerCompany.name}
                          </p>
                          <p className="text-xs">
                            {user.customerContact
                              ? formatContact(user.customerContact)
                              : "No contact linked"}
                          </p>
                        </>
                      ) : (
                        <span>Internal user</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[color:var(--muted)]">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-white/10 text-[color:var(--muted)]"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={actionUserId === user.id}
                        className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:bg-white/5 disabled:opacity-60"
                      >
                        {actionUserId === user.id
                          ? "Updating..."
                          : user.isActive
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-[color:var(--text)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const cls =
    role === "ORBISY_ADMIN"
      ? "bg-sky-500/10 text-sky-300"
      : role === "ORBISY_SALES"
        ? "bg-violet-500/10 text-violet-300"
        : role === "HVAC_OWNER" || role === "HVAC_SALES"
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-amber-500/10 text-amber-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {roleLabels[role]}
    </span>
  );
}

function formatCompany(company: CompanyOption) {
  const location = [company.city, company.state].filter(Boolean).join(", ");
  return location ? `${company.name} - ${location}` : company.name;
}

function formatContact(contact: {
  fullName: string | null;
  email: string | null;
}) {
  if (contact.fullName && contact.email) {
    return `${contact.fullName} (${contact.email})`;
  }
  return contact.fullName || contact.email || "Unnamed contact";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
