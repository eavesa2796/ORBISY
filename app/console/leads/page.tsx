"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/outreach/DataTable";
import { Button } from "@/components/outreach/Button";
import { Modal } from "@/components/outreach/Modal";
import { Input, Select, Textarea } from "@/components/outreach/FormControls";
import { Badge } from "@/components/outreach/Badge";
import { useToast } from "@/components/outreach/Toast";

interface Lead {
  id: string;
  company: string;
  contactName: string;
  email?: string;
  stage: string;
  city?: string;
  industry?: string;
  score: number;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch("/api/outreach/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/outreach/leads/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "leads.csv";
        a.click();
        showToast({ message: "Leads exported successfully", type: "success" });
      }
    } catch (error) {
      showToast({ message: "Failed to export leads", type: "error" });
    }
  }

  const columns = [
    { key: "company", label: "Company" },
    { key: "contactName", label: "Contact" },
    {
      key: "email",
      label: "Email",
      render: (lead: Lead) => lead.email || "-",
    },
    {
      key: "stage",
      label: "Stage",
      render: (lead: Lead) => {
        const stageColors: Record<string, any> = {
          NEW: "default",
          CONTACTED: "info",
          REPLIED: "warning",
          BOOKED: "success",
          WON: "success",
          LOST: "danger",
        };
        return <Badge variant={stageColors[lead.stage]}>{lead.stage}</Badge>;
      },
    },
    {
      key: "city",
      label: "Location",
      render: (lead: Lead) => lead.city || "-",
    },
    {
      key: "industry",
      label: "Industry",
      render: (lead: Lead) => lead.industry || "-",
    },
    {
      key: "score",
      label: "Score",
      render: (lead: Lead) => <span>{lead.score}</span>,
    },
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <div className="space-x-3">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            Import CSV
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Add Lead</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          data={leads}
          columns={columns}
          onRowClick={(lead) => setSelectedLead(lead)}
          emptyMessage="No leads yet. Add your first lead to get started."
        />
      </div>

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchLeads();
            setShowAddModal(false);
            showToast({ message: "Lead added successfully", type: "success" });
          }}
        />
      )}

      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchLeads();
            setShowImportModal(false);
            showToast({
              message: "Leads imported successfully",
              type: "success",
            });
          }}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={() => {
            fetchLeads();
            setSelectedLead(null);
            showToast({
              message: "Lead updated successfully",
              type: "success",
            });
          }}
        />
      )}
    </div>
  );
}

function AddLeadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    company: "",
    contactName: "",
    email: "",
    role: "",
    phone: "",
    website: "",
    city: "",
    industry: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/outreach/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to add lead");
      }
    } catch (error) {
      alert("Error adding lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Company *"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            required
          />
          <Input
            label="Contact Name *"
            value={formData.contactName}
            onChange={(e) =>
              setFormData({ ...formData, contactName: e.target.value })
            }
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
          <Input
            label="Website"
            value={formData.website}
            onChange={(e) =>
              setFormData({ ...formData, website: e.target.value })
            }
          />
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="Industry"
            value={formData.industry}
            onChange={(e) =>
              setFormData({ ...formData, industry: e.target.value })
            }
          />
        </div>
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ImportCsvModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    if (!csv.trim()) {
      alert("Please paste CSV data");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/outreach/leads/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(
          `Imported ${data.imported} leads. Skipped ${data.skipped} duplicates.`
        );
        onSuccess();
      } else {
        alert(data.error || "Import failed");
      }
    } catch (error) {
      alert("Error importing CSV");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Import Leads from CSV"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Expected columns: company, contactName, role, email, phone, website,
            city, industry, score, tags, notes
          </p>
          <Textarea
            placeholder="Paste CSV data here..."
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState({
    stage: lead.stage,
    score: lead.score,
  });
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);

    try {
      const res = await fetch(`/api/outreach/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onUpdate();
      } else {
        alert("Failed to update lead");
      }
    } catch (error) {
      alert("Error updating lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Lead Details" size="md">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{lead.company}</h3>
          <p className="text-gray-600">{lead.contactName}</p>
          {lead.email && <p className="text-sm text-gray-500">{lead.email}</p>}
        </div>

        <Select
          label="Stage"
          value={formData.stage}
          onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
          options={[
            { value: "NEW", label: "New" },
            { value: "CONTACTED", label: "Contacted" },
            { value: "REPLIED", label: "Replied" },
            { value: "BOOKED", label: "Booked" },
            { value: "WON", label: "Won" },
            { value: "LOST", label: "Lost" },
          ]}
        />

        <Input
          label="Score"
          type="number"
          value={formData.score}
          onChange={(e) =>
            setFormData({ ...formData, score: parseInt(e.target.value) })
          }
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
