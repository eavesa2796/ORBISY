"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/outreach/DataTable";
import { Button } from "@/components/outreach/Button";
import { Modal } from "@/components/outreach/Modal";
import { Input, Select, Textarea } from "@/components/outreach/FormControls";
import { Badge } from "@/components/outreach/Badge";
import { useToast } from "@/components/outreach/Toast";

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  dailyLimit: number;
  fromMailbox: string;
  steps: CampaignStep[];
  _count: {
    enrollments: number;
    messages: number;
    replies: number;
  };
}

interface CampaignStep {
  id?: string;
  stepIndex: number;
  dayOffset: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/outreach/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCampaignStatus(campaign: Campaign) {
    try {
      const newStatus = campaign.status === "RUNNING" ? "PAUSED" : "RUNNING";
      const res = await fetch(`/api/outreach/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchCampaigns();
        showToast({
          message: `Campaign ${newStatus.toLowerCase()}`,
          type: "success",
        });
      }
    } catch (error) {
      showToast({ message: "Failed to update campaign", type: "error" });
    }
  }

  const columns = [
    { key: "name", label: "Campaign Name" },
    {
      key: "status",
      label: "Status",
      render: (campaign: Campaign) => (
        <Badge variant={campaign.status === "RUNNING" ? "success" : "default"}>
          {campaign.status}
        </Badge>
      ),
    },
    {
      key: "steps",
      label: "Steps",
      render: (campaign: Campaign) => campaign.steps.length,
    },
    {
      key: "enrollments",
      label: "Enrolled",
      render: (campaign: Campaign) => campaign._count.enrollments,
    },
    {
      key: "messages",
      label: "Messages",
      render: (campaign: Campaign) => campaign._count.messages,
    },
    {
      key: "replies",
      label: "Replies",
      render: (campaign: Campaign) => campaign._count.replies,
    },
    {
      key: "actions",
      label: "Actions",
      render: (campaign: Campaign) => (
        <Button
          size="sm"
          variant={campaign.status === "RUNNING" ? "secondary" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            toggleCampaignStatus(campaign);
          }}
        >
          {campaign.status === "RUNNING" ? "Pause" : "Start"}
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
        <Button onClick={() => setShowAddModal(true)}>Create Campaign</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          data={campaigns}
          columns={columns}
          onRowClick={(campaign) => setSelectedCampaign(campaign)}
          emptyMessage="No campaigns yet. Create your first campaign to start outreach."
        />
      </div>

      {showAddModal && (
        <CreateCampaignModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchCampaigns();
            setShowAddModal(false);
            showToast({
              message: "Campaign created successfully",
              type: "success",
            });
          }}
        />
      )}

      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onUpdate={() => {
            fetchCampaigns();
            setSelectedCampaign(null);
            showToast({
              message: "Campaign updated successfully",
              type: "success",
            });
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    fromMailbox: "",
    dailyLimit: 30,
  });
  const [steps, setSteps] = useState<CampaignStep[]>([
    {
      stepIndex: 0,
      dayOffset: 0,
      subjectTemplate: "",
      bodyTemplate: "",
    },
  ]);
  const [loading, setLoading] = useState(false);

  function addStep() {
    setSteps([
      ...steps,
      {
        stepIndex: steps.length,
        dayOffset: steps.length * 3,
        subjectTemplate: "",
        bodyTemplate: "",
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, steps }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create campaign");
      }
    } catch (error) {
      alert("Error creating campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New Campaign"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Campaign Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="From Email *"
            type="email"
            value={formData.fromMailbox}
            onChange={(e) =>
              setFormData({ ...formData, fromMailbox: e.target.value })
            }
            required
          />
          <Input
            label="Daily Limit"
            type="number"
            value={formData.dailyLimit}
            onChange={(e) =>
              setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Email Sequence</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addStep}>
              + Add Step
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">
                  Step {index + 1}
                  {index > 0 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Day {step.dayOffset})
                    </span>
                  )}
                </h4>
                <div className="space-y-3">
                  {index > 0 && (
                    <Input
                      label="Days After Previous Step"
                      type="number"
                      value={step.dayOffset}
                      onChange={(e) => {
                        const newSteps = [...steps];
                        newSteps[index].dayOffset = parseInt(e.target.value);
                        setSteps(newSteps);
                      }}
                    />
                  )}
                  <Input
                    label="Subject"
                    placeholder="Use {{company}}, {{contact}}, etc."
                    value={step.subjectTemplate}
                    onChange={(e) => {
                      const newSteps = [...steps];
                      newSteps[index].subjectTemplate = e.target.value;
                      setSteps(newSteps);
                    }}
                    required
                  />
                  <Textarea
                    label="Body"
                    placeholder="Use {{company}}, {{contact}}, {{city}}, {{industry}}, etc."
                    value={step.bodyTemplate}
                    onChange={(e) => {
                      const newSteps = [...steps];
                      newSteps[index].bodyTemplate = e.target.value;
                      setSteps(newSteps);
                    }}
                    rows={5}
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CampaignDetailModal({
  campaign,
  onClose,
  onUpdate,
}: {
  campaign: Campaign;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleEnroll() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/outreach/campaigns/${campaign.id}/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast({
          message: `Enrolled ${data.enrolled} leads`,
          type: "success",
        });
        onUpdate();
      } else {
        alert("Failed to enroll leads");
      }
    } catch (error) {
      alert("Error enrolling leads");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Campaign Details" size="lg">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{campaign.name}</h3>
          <p className="text-sm text-gray-600">
            Status: <Badge variant={campaign.status === "RUNNING" ? "success" : "default"}>{campaign.status}</Badge>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            From: {campaign.fromMailbox}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Enrolled</p>
            <p className="text-2xl font-bold">{campaign._count.enrollments}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Messages</p>
            <p className="text-2xl font-bold">{campaign._count.messages}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Replies</p>
            <p className="text-2xl font-bold">{campaign._count.replies}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Sequence Steps ({campaign.steps.length})</h4>
          <div className="space-y-2">
            {campaign.steps.map((step, index) => (
              <div key={index} className="border rounded p-3 text-sm">
                <p className="font-medium">
                  Step {index + 1}
                  {index > 0 && (
                    <span className="text-gray-500 ml-2">
                      (Day {step.dayOffset})
                    </span>
                  )}
                </p>
                <p className="text-gray-600 mt-1">{step.subjectTemplate}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleEnroll} disabled={loading}>
            {loading ? "Enrolling..." : "Enroll Matching Leads"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
