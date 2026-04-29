import { Bell, ShieldCheck, UserRound } from "lucide-react";

import { FilterPill, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-8">
      <WorkspaceCard className="p-6">
        <SectionHeader title="Settings" subtitle="Quiet defaults for account, security, and alerts." />
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <WorkspaceCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAFBFC] text-[var(--accent-sage)]"><UserRound className="h-5 w-5" strokeWidth={1.5} /></span>
            <div>
              <p className="font-medium text-slate-900">Account</p>
              <p className="text-sm text-slate-500">Profile, role, and clinic identity</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <FilterPill active>Dr. Amelia Doe</FilterPill>
            <FilterPill>Clinical Lead</FilterPill>
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAFBFC] text-[var(--accent-sage)]"><ShieldCheck className="h-5 w-5" strokeWidth={1.5} /></span>
            <div>
              <p className="font-medium text-slate-900">Security</p>
              <p className="text-sm text-slate-500">Password, sessions, and MFA</p>
            </div>
          </div>
          <div className="mt-5 rounded-[12px] border border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-600">Two-factor authentication is on for all admin accounts.</div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAFBFC] text-[var(--accent-sage)]"><Bell className="h-5 w-5" strokeWidth={1.5} /></span>
            <div>
              <p className="font-medium text-slate-900">Notifications</p>
              <p className="text-sm text-slate-500">Reminders, alerts, and digests</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>New appointments</span><span>On</span></div>
            <div className="flex items-center justify-between"><span>Lab results</span><span>On</span></div>
            <div className="flex items-center justify-between"><span>Marketing</span><span>Off</span></div>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
