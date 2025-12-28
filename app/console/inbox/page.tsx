"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/outreach/DataTable";
import { Badge } from "@/components/outreach/Badge";
import { Modal } from "@/components/outreach/Modal";
import { Button } from "@/components/outreach/Button";

interface Reply {
  id: string;
  fromEmail: string;
  subject: string;
  body: string;
  sentiment: string;
  receivedAt: string;
  lead: {
    company: string;
    contactName: string;
  };
  campaign: {
    name: string;
  } | null;
}

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchReplies();
  }, [filter]);

  async function fetchReplies() {
    try {
      const url =
        filter === "all"
          ? "/api/outreach/inbox"
          : `/api/outreach/inbox?sentiment=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      key: "fromEmail",
      label: "From",
      render: (reply: Reply) => (
        <div>
          <p className="font-medium text-[color:var(--text)]">
            {reply.lead.company}
          </p>
          <p className="text-sm text-[color:var(--muted)]">{reply.fromEmail}</p>
        </div>
      ),
    },
    { key: "subject", label: "Subject" },
    {
      key: "campaign",
      label: "Campaign",
      render: (reply: Reply) => reply.campaign?.name || "-",
    },
    {
      key: "sentiment",
      label: "Sentiment",
      render: (reply: Reply) => {
        const sentimentColors: Record<string, any> = {
          POSITIVE: "success",
          NEUTRAL: "info",
          NEGATIVE: "danger",
        };
        return (
          <Badge variant={sentimentColors[reply.sentiment]}>
            {reply.sentiment}
          </Badge>
        );
      },
    },
    {
      key: "receivedAt",
      label: "Received",
      render: (reply: Reply) => new Date(reply.receivedAt).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-12 text-[color:var(--muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">Inbox</h1>
        <div className="flex space-x-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === "POSITIVE"}
            onClick={() => setFilter("POSITIVE")}
          >
            Positive
          </FilterButton>
          <FilterButton
            active={filter === "NEUTRAL"}
            onClick={() => setFilter("NEUTRAL")}
          >
            Neutral
          </FilterButton>
          <FilterButton
            active={filter === "NEGATIVE"}
            onClick={() => setFilter("NEGATIVE")}
          >
            Negative
          </FilterButton>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          data={replies}
          columns={columns}
          onRowClick={(reply) => setSelectedReply(reply)}
          emptyMessage="No replies yet. Replies will appear here when leads respond to your campaigns."
        />
      </div>

      {selectedReply && (
        <ReplyDetailModal
          reply={selectedReply}
          onClose={() => setSelectedReply(null)}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function ReplyDetailModal({
  reply,
  onClose,
}: {
  reply: Reply;
  onClose: () => void;
}) {
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Reply Details" size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">From</p>
          <p className="font-medium">{reply.lead.company}</p>
          <p className="text-sm text-gray-500">{reply.fromEmail}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Sentiment</p>
          <Badge
            variant={
              reply.sentiment === "POSITIVE"
                ? "success"
                : reply.sentiment === "NEGATIVE"
                ? "danger"
                : "info"
            }
          >
            {reply.sentiment}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Subject</p>
          <p className="font-medium">{reply.subject}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Message</p>
          <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {reply.body}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Quick Reply Templates</p>
          <div className="space-y-2">
            <QuickReplyButton
              onClick={() =>
                copyToClipboard(
                  `Hi ${reply.lead.contactName},\n\nThank you for your interest! I'd love to schedule a quick call to discuss how we can help ${reply.lead.company}.\n\nWould next week work for you?`
                )
              }
            >
              Schedule Call
            </QuickReplyButton>
            <QuickReplyButton
              onClick={() =>
                copyToClipboard(
                  `Hi ${reply.lead.contactName},\n\nThanks for reaching out! I'll send over our pricing and case studies shortly.\n\nLooking forward to connecting!`
                )
              }
            >
              Send Pricing
            </QuickReplyButton>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function QuickReplyButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
    >
      {children}
    </button>
  );
}
