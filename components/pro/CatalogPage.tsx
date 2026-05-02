"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EquipmentType =
  | "CONDENSER"
  | "AIR_HANDLER"
  | "FURNACE"
  | "HEAT_PUMP"
  | "COIL"
  | "PACKAGE_UNIT"
  | "THERMOSTAT"
  | "IAQ"
  | "OTHER";

type PricingMode = "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";

type CatalogItem = {
  id: string;
  equipmentType: EquipmentType;
  brand: string;
  modelNumber: string;
  sizeTonnage: string | null;
  efficiencyRating: string | null;
  cost: number;
  pricingMode: PricingMode;
  sellPrice: number | null;
  marginPercent: number | null;
  description: string | null;
  imageUrl: string | null;
  brochureUrl: string | null;
  isActive: boolean;
};

type CatalogForm = {
  equipmentType: EquipmentType;
  brand: string;
  modelNumber: string;
  sizeTonnage: string;
  efficiencyRating: string;
  cost: string;
  pricingMode: PricingMode;
  sellPrice: string;
  marginPercent: string;
  description: string;
  imageUrl: string;
  brochureUrl: string;
  isActive: boolean;
};

type CatalogImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

type CatalogImportRowError = {
  rowNumber: number;
  message: string;
};

const equipmentTypes: EquipmentType[] = [
  "CONDENSER",
  "AIR_HANDLER",
  "FURNACE",
  "HEAT_PUMP",
  "COIL",
  "PACKAGE_UNIT",
  "THERMOSTAT",
  "IAQ",
  "OTHER",
];

const emptyForm: CatalogForm = {
  equipmentType: "HEAT_PUMP",
  brand: "",
  modelNumber: "",
  sizeTonnage: "",
  efficiencyRating: "",
  cost: "",
  pricingMode: "COST_PLUS_MARGIN",
  sellPrice: "",
  marginPercent: "35",
  description: "",
  imageUrl: "",
  brochureUrl: "",
  isActive: true,
};

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<CatalogImportSummary | null>(null);
  const [importErrors, setImportErrors] = useState<CatalogImportRowError[]>([]);

  useEffect(() => {
    loadCatalog();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeFilter === "active" && !item.isActive) return false;
      if (activeFilter === "inactive" && item.isActive) return false;
      if (typeFilter && item.equipmentType !== typeFilter) return false;
      if (!q) return true;
      return [
        item.equipmentType,
        item.brand,
        item.modelNumber,
        item.sizeTonnage,
        item.efficiencyRating,
        item.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeFilter, items, search, typeFilter]);

  const activeCount = items.filter((item) => item.isActive).length;
  const inactiveCount = items.length - activeCount;

  async function loadCatalog() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sales-machine/catalog?activeOnly=false&limit=500");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load catalog");
      setItems(data.items || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof CatalogForm>(key: K, value: CatalogForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      equipmentType: item.equipmentType,
      brand: item.brand,
      modelNumber: item.modelNumber,
      sizeTonnage: item.sizeTonnage || "",
      efficiencyRating: item.efficiencyRating || "",
      cost: String(item.cost),
      pricingMode: item.pricingMode,
      sellPrice: item.sellPrice === null ? "" : String(item.sellPrice),
      marginPercent: item.marginPercent === null ? "" : String(item.marginPercent),
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      brochureUrl: item.brochureUrl || "",
      isActive: item.isActive,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const cost = parseRequiredMoney(form.cost, "Cost");
      const sellPrice = parseOptionalMoney(form.sellPrice, "Sell price");
      const marginPercent = parseOptionalMoney(form.marginPercent, "Margin percent");

      if (!form.brand.trim() || !form.modelNumber.trim()) {
        throw new Error("Brand and model number are required");
      }
      if (form.pricingMode === "FIXED_SELL_PRICE" && sellPrice === null) {
        throw new Error("Sell price is required for fixed-price catalog items");
      }

      const payload = {
        equipmentType: form.equipmentType,
        brand: form.brand.trim(),
        modelNumber: form.modelNumber.trim(),
        sizeTonnage: cleanOptional(form.sizeTonnage),
        efficiencyRating: cleanOptional(form.efficiencyRating),
        cost,
        pricingMode: form.pricingMode,
        sellPrice,
        marginPercent,
        description: cleanOptional(form.description),
        imageUrl: cleanOptional(form.imageUrl),
        brochureUrl: cleanOptional(form.brochureUrl),
        isActive: form.isActive,
      };

      const res = await fetch(
        editingId ? `/api/sales-machine/catalog/${editingId}` : "/api/sales-machine/catalog",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save catalog item");

      resetForm();
      await loadCatalog();
      setMessage({
        type: "success",
        text: editingId ? "Catalog item updated." : "Catalog item created.",
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

  async function toggleActive(item: CatalogItem) {
    setMessage(null);
    try {
      const res = await fetch(`/api/sales-machine/catalog/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update catalog item");
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? data.item : entry)));
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    }
  }

  async function runCatalogImport() {
    if (!csvFile) return;

    setImporting(true);
    setImportSummary(null);
    setImportErrors([]);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch("/api/sales-machine/catalog/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import catalog CSV");
      setImportSummary(data.summary || null);
      setImportErrors(data.rowErrors || []);
      setCsvFile(null);
      await loadCatalog();
      setMessage({ type: "success", text: "Catalog import completed." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setImporting(false);
    }
  }

  function exportCatalog(activeOnly: boolean) {
    window.location.href = `/api/sales-machine/catalog/export-csv${activeOnly ? "?activeOnly=true" : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">
            Catalog
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Manage the equipment and accessories used in Good / Better / Best proposals.
          </p>
        </div>
        <Link
          href="/pro/proposals"
          className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
        >
          Open Proposal Builder
        </Link>
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">
              {editingId ? "Edit Catalog Item" : "Add Catalog Item"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Fixed-price items use a set sell price. Margin items calculate from cost in the proposal builder.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={saveItem} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Type">
              <select
                value={form.equipmentType}
                onChange={(e) => updateForm("equipmentType", e.target.value as EquipmentType)}
                className={inputCls}
                disabled={saving}
              >
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatEnum(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand">
              <input
                value={form.brand}
                onChange={(e) => updateForm("brand", e.target.value)}
                className={inputCls}
                disabled={saving}
                required
              />
            </Field>
            <Field label="Model Number">
              <input
                value={form.modelNumber}
                onChange={(e) => updateForm("modelNumber", e.target.value)}
                className={inputCls}
                disabled={saving}
                required
              />
            </Field>
            <Field label="Cost">
              <input
                type="number"
                min={0}
                step="any"
                value={form.cost}
                onChange={(e) => updateForm("cost", e.target.value)}
                className={inputCls}
                disabled={saving}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Pricing Mode">
              <select
                value={form.pricingMode}
                onChange={(e) => updateForm("pricingMode", e.target.value as PricingMode)}
                className={inputCls}
                disabled={saving}
              >
                <option value="COST_PLUS_MARGIN">Cost plus margin</option>
                <option value="FIXED_SELL_PRICE">Fixed sell price</option>
              </select>
            </Field>
            <Field label="Sell Price">
              <input
                type="number"
                min={0}
                step="any"
                value={form.sellPrice}
                onChange={(e) => updateForm("sellPrice", e.target.value)}
                className={inputCls}
                disabled={saving}
                placeholder={form.pricingMode === "FIXED_SELL_PRICE" ? "Required" : "Optional"}
              />
            </Field>
            <Field label="Margin Percent">
              <input
                type="number"
                min={0}
                step="any"
                value={form.marginPercent}
                onChange={(e) => updateForm("marginPercent", e.target.value)}
                className={inputCls}
                disabled={saving}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) => updateForm("isActive", e.target.value === "active")}
                className={inputCls}
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Size / Tonnage">
              <input
                value={form.sizeTonnage}
                onChange={(e) => updateForm("sizeTonnage", e.target.value)}
                className={inputCls}
                disabled={saving}
                placeholder="e.g. 3-ton"
              />
            </Field>
            <Field label="Efficiency Rating">
              <input
                value={form.efficiencyRating}
                onChange={(e) => updateForm("efficiencyRating", e.target.value)}
                className={inputCls}
                disabled={saving}
                placeholder="e.g. SEER2 17"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              className={inputCls}
              disabled={saving}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Image URL">
              <input
                value={form.imageUrl}
                onChange={(e) => updateForm("imageUrl", e.target.value)}
                className={inputCls}
                disabled={saving}
              />
            </Field>
            <Field label="Brochure URL">
              <input
                value={form.brochureUrl}
                onChange={(e) => updateForm("brochureUrl", e.target.value)}
                className={inputCls}
                disabled={saving}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2.5 font-semibold text-[#001] disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Item"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          CSV Import / Export
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2 text-sm text-[color:var(--text)]"
          />
          <button
            onClick={runCatalogImport}
            disabled={!csvFile || importing}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5 disabled:opacity-60"
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={() => exportCatalog(false)}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
          >
            Export All
          </button>
          <a
            href="/samples/hvac-catalog-template.csv"
            download
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
          >
            Download Template
          </a>
        </div>
        {importSummary && (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Import summary: created {importSummary.created}, updated {importSummary.updated}, skipped {importSummary.skipped}, errors {importSummary.errors}
          </p>
        )}
        {importErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <p className="font-semibold">Row errors</p>
            {importErrors.slice(0, 12).map((entry) => (
              <p key={`${entry.rowNumber}-${entry.message}`}>
                Row {entry.rowNumber}: {entry.message}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
        <div className="border-b border-[color:var(--border)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text)]">
                Equipment List
              </h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {activeCount} active, {inactiveCount} inactive
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog"
                className={inputCls}
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">All types</option>
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatEnum(type)}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
                className={inputCls}
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All items</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="p-5 text-[color:var(--muted)]">Loading catalog...</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-5 text-[color:var(--muted)]">No catalog items match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Equipment</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Cost</th>
                  <th className="px-5 py-3 font-semibold">Pricing</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-[color:var(--text)]">
                        {item.brand} {item.modelNumber}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {[item.sizeTonnage, item.efficiencyRating].filter(Boolean).join(" / ") || "No specs set"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-[color:var(--muted)]">
                      {formatEnum(item.equipmentType)}
                    </td>
                    <td className="px-5 py-4 text-[color:var(--text)]">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-5 py-4 text-[color:var(--muted)]">
                      {item.pricingMode === "FIXED_SELL_PRICE"
                        ? `Fixed ${formatCurrency(item.sellPrice || 0)}`
                        : `${item.marginPercent ?? 0}% margin`}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-white/10 text-[color:var(--muted)]"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(item)}
                          className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:bg-white/5"
                        >
                          {item.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
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

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseRequiredMoney(value: string, label: string) {
  const parsed = Number(value);
  if (!value.trim() || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return parsed;
}

function parseOptionalMoney(value: string, label: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return parsed;
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
