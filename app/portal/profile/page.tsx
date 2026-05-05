"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Save, Shield } from "lucide-react";

import { Badge, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import { getMyAuthContext, getMyPatient, updateMyPatient } from "../../../lib/patient-api";

type Profile = Record<string, unknown>;
type AccountState = {
  is_active?: boolean;
  patient_id?: string | null;
};

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ contact_number: "", email_address: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [accountState, setAccountState] = useState<AccountState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const authResp = await getMyAuthContext();
        const currentAccount = (authResp?.user || null) as AccountState | null;
        setAccountState(currentAccount);

        if (!currentAccount?.is_active || !currentAccount?.patient_id) {
          setLoading(false);
          return;
        }

        const resp = await getMyPatient();
        const item = resp?.patient || null;
        setProfile(item);
        setForm({
          contact_number: String(item?.contact_number || ""),
          email_address: String(item?.email_address || ""),
          address: String(item?.address || ""),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await updateMyPatient(form);
      setProfile(response?.patient || profile);
      setMessage("Your contact details were updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your profile…</WorkspaceCard>;
  }

  if (!accountState?.is_active) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="My Profile" subtitle="This account is waiting for clinic activation." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          Your account still needs approval before the clinic can open the patient chart.
        </div>
      </WorkspaceCard>
    );
  }

  if (!accountState?.patient_id) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="My Profile" subtitle="Your account is active, but the clinic has not linked a patient chart yet." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          You can use the portal now. Once the clinic links your patient record, your details will appear here automatically.
        </div>
      </WorkspaceCard>
    );
  }

  const fullName = `${String(profile?.first_name || profile?.name || "")} ${String(profile?.last_name || "")}`.trim() || "Patient";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <WorkspaceCard className="p-6">
        <SectionHeader
          title="My Profile"
          subtitle="Sensitive information stays read-only. Only contact details can be updated here."
          action={<Badge tone="sage">Read focused</Badge>}
        />

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Full name</label>
              <input value={fullName} readOnly className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FAFBFC] px-4 text-sm text-slate-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Date of birth</label>
              <input value={String(profile?.date_of_birth ? new Date(String(profile?.date_of_birth)).toLocaleDateString() : "Not available")} readOnly className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FAFBFC] px-4 text-sm text-slate-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Contact number</label>
              <input value={form.contact_number} onChange={(event) => setForm((current) => ({ ...current, contact_number: event.target.value }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[var(--accent-sage)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <input type="email" value={form.email_address} onChange={(event) => setForm((current) => ({ ...current, email_address: event.target.value }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[var(--accent-sage)]" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Address</label>
            <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={4} className="mt-2 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--accent-sage)]" />
          </div>

          <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-[var(--accent-sage)]" />
              <p>Emergency contact, allergies, conditions, and blood type are read-only if present in your chart. If they are not listed, the clinic has not stored them here yet.</p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 text-sm font-medium text-white transition-colors hover:bg-[#5a7d6f] disabled:opacity-60">
            <Save className="h-4 w-4" strokeWidth={1.75} />
            {saving ? "Saving…" : "Save contact details"}
          </button>

          {message ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <AlertCircle className="h-4 w-4 text-[var(--accent-sage)]" />
              {message}
            </p>
          ) : null}
        </form>
      </WorkspaceCard>

      <WorkspaceCard className="p-6">
        <SectionHeader title="Profile snapshot" subtitle="What the clinic currently has on file." />
        <div className="mt-6 space-y-4">
          {[
            ["Patient ID", String(profile?.patient_id || "N/A")],
            ["Gender", String(profile?.gender || "N/A")],
            ["Blood type", String(profile?.blood_type || "Not available")],
            ["Allergies", Array.isArray(profile?.allergies) ? (profile?.allergies as string[]).join(", ") : String(profile?.allergies || "Not available")],
            ["Conditions", Array.isArray(profile?.conditions) ? (profile?.conditions as string[]).join(", ") : String(profile?.conditions || "Not available")],
            ["Emergency contact", String(profile?.emergency_contact_name || "Not available")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[16px] border border-[#E5E7EB] p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{label}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{value as string}</p>
            </div>
          ))}
        </div>
      </WorkspaceCard>
    </div>
  );
}