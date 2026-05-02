import ProSettingsPage from "@/components/pro/ProSettingsPage";
import {
  getProposalFollowUpDays,
  getProposalMaxFollowUps,
} from "@/lib/sales/proposals/internal-list";

export default function ProSettingsRoute() {
  return (
    <ProSettingsPage
      followUpDays={getProposalFollowUpDays()}
      maxFollowUps={getProposalMaxFollowUps()}
    />
  );
}
