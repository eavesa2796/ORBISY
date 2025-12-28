"use client";

import { useEffect, useState } from "react";

interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  repliedLeads: number;
  bookedLeads: number;
  activeCampaigns: number;
  totalEnrollments: number;
  messagesScheduled: number;
  messagesSentToday: number;
  repliesThisWeek: number;
}

export default function ConsolePage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch("/api/outreach/metrics/dashboard");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--muted)]">Loading...</div>
      </div>
    );
  }

  const stats = metrics || {
    totalLeads: 0,
    activeLeads: 0,
    repliedLeads: 0,
    bookedLeads: 0,
    activeCampaigns: 0,
    totalEnrollments: 0,
    messagesScheduled: 0,
    messagesSentToday: 0,
    repliesThisWeek: 0,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-[color:var(--text)] mb-8">
        Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Active Leads"
          value={stats.activeLeads}
          icon="✨"
          color="green"
        />
        <StatCard
          title="Replied Leads"
          value={stats.repliedLeads}
          icon="💬"
          color="purple"
        />
        <StatCard
          title="Booked Meetings"
          value={stats.bookedLeads}
          icon="📅"
          color="orange"
        />
        <StatCard
          title="Active Campaigns"
          value={stats.activeCampaigns}
          icon="📧"
          color="indigo"
        />
        <StatCard
          title="Active Enrollments"
          value={stats.totalEnrollments}
          icon="🎯"
          color="pink"
        />
        <StatCard
          title="Messages Scheduled"
          value={stats.messagesScheduled}
          icon="⏰"
          color="yellow"
        />
        <StatCard
          title="Sent Today"
          value={stats.messagesSentToday}
          icon="📨"
          color="teal"
        />
        <StatCard
          title="Replies This Week"
          value={stats.repliesThisWeek}
          icon="📥"
          color="cyan"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
        <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionButton href="/console/leads" icon="➕">
            Add Lead
          </QuickActionButton>
          <QuickActionButton href="/console/campaigns" icon="🚀">
            Create Campaign
          </QuickActionButton>
          <QuickActionButton href="/console/leads?import=true" icon="📥">
            Import CSV
          </QuickActionButton>
          <QuickActionButton href="/console/inbox" icon="📬">
            View Inbox
          </QuickActionButton>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-50 text-indigo-600",
    pink: "bg-pink-50 text-pink-600",
    yellow: "bg-yellow-50 text-yellow-600",
    teal: "bg-teal-50 text-teal-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };

  return (
    <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001]">
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-[color:var(--text)]">
          {value.toLocaleString()}
        </p>
        <p className="text-sm text-[color:var(--muted)] mt-1">{title}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-[color:var(--border)]"
    >
      <span className="text-xl mr-3">{icon}</span>
      <span className="text-sm font-medium text-[color:var(--text)]">
        {children}
      </span>
    </a>
  );
}
