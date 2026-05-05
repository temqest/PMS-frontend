"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FileText, HeartPulse, UserCircle2 } from "lucide-react";

import { Badge, SectionHeader, WorkspaceCard } from "../components/workspace-ui";
import { getMyAppointments, getMyHealthRecords, getMyPatient } from "../../lib/patient-api";
import { getSessionClaims } from "../../lib/session";

type Profile = Record<string, unknown>;
type Appointment = Record<string, unknown>;
type RecordItem = Record<string, unknown>;

const initialCards = [
  { href: "/portal/records", title: "My Records", description: "Review consultations, notes, and attachments.", icon: FileText },
  { href: "/portal/appointments", title: "My Appointments", description: "See upcoming visits and request changes.", icon: CalendarDays },
  { href: "/portal/profile", title: "My Profile", description: "Keep contact details up to date.", icon: UserCircle2 },
  { href: "/portal/stats", title: "Health Stats", description: "View simple trends from your record history.", icon: HeartPulse },
];

const toDateValue = (value?: string | null) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const fmtDate = (value?: string | null) => {
  const parsed = toDateValue(value);
  if (!parsed) return "N/A";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function PatientPortalHomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nowTs] = useState(() => Date.now());
  const claims = getSessionClaims();
  const isUnlinked = !claims?.patient_id;

  useEffect(() => {
    (async () => {
      if (isUnlinked) {
        setLoading(false);
        return;
      }

      try {
        const [patientResp, appointmentResp, recordResp] = await Promise.all([
          getMyPatient(),
          getMyAppointments({ limit: 6 }),
          getMyHealthRecords({ limit: 6 }),
        ]);
        setProfile(patientResp?.patient || null);
        setAppointments(Array.isArray(appointmentResp?.appointments) ? appointmentResp.appointments : []);
        setRecords(Array.isArray(recordResp?.records) ? recordResp.records : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your portal.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnlinked]);

  const upcoming = useMemo(
    () =>
      appointments
        .map((item) => ({
          item,
          when: toDateValue(String(item.scheduled_at || item.date || "")),
        }))
        .filter(({ when }) => when && when.getTime() >= nowTs)
        .sort((a, b) => (a.when?.getTime() || 0) - (b.when?.getTime() || 0))
        .slice(0, 3),
    [appointments, nowTs]
  );

  const recentRecords = useMemo(
    () =>
      [...records]
        .sort((a, b) => {
          const left = toDateValue(String(a.record_date || a.dateIso || a.date || ""))?.getTime() || 0;
          const right = toDateValue(String(b.record_date || b.dateIso || b.date || ""))?.getTime() || 0;
          return right - left;
        })
        .slice(0, 3),
    [records]
  );

  const patientName = String(profile?.first_name || profile?.name || "").trim()
    ? `${String(profile?.first_name || profile?.name || "")} ${String(profile?.last_name || "")}`.trim()
    : String(profile?.patient_name || profile?.fullName || "Patient");

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your portal…</WorkspaceCard>;
  }

  if (error) {
    return <WorkspaceCard className="p-6 text-sm text-red-600">{error}</WorkspaceCard>;
  }

  if (isUnlinked) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="Account created" subtitle="Your portal is ready, but the clinic has not linked your patient chart yet." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          We created your patient portal account. Once the clinic links your chart, your profile, records, appointments, and health stats will appear here automatically.
        </div>
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceCard className="overflow-hidden">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(107,144,128,0.08),rgba(122,156,198,0.08))] p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.36em] text-[var(--accent-sage)]">Patient Summary</p>
            <h3 className="text-3xl font-semibold tracking-tight text-slate-900">{patientName || "Your profile"}</h3>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              View your appointments, records, and summary health insights from one private, patient-only space.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="sage">{appointments.length} appointments</Badge>
              <Badge tone="blue">{records.length} records</Badge>
              <Badge tone="neutral">Private access</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Contact", String(profile?.contact_number || profile?.phone || "Not listed")],
              ["Emergency", String(profile?.emergency_contact_name || profile?.emergencyContact || "Not listed")],
              ["DOB", fmtDate(String(profile?.date_of_birth || profile?.dateOfBirth || ""))],
              ["Patient ID", String(profile?.patient_id || profile?.id || "N/A")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[18px] border border-white/70 bg-white/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{value as string}</p>
              </div>
            ))}
          </div>
        </div>
      </WorkspaceCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {initialCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-sage)]">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Upcoming appointments" subtitle="Your next scheduled visits." action={<Link className="text-sm text-[var(--accent-sage)] hover:underline" href="/portal/appointments">See all</Link>} />
          <div className="mt-6 space-y-3">
            {upcoming.length ? upcoming.map(({ item, when }) => (
              <div key={String(item.appointment_id || item.id || when?.toISOString())} className="rounded-[16px] border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{String(item.reason || "Appointment")}</p>
                    <p className="mt-1 text-sm text-slate-500">{when?.toLocaleString() || "TBA"}</p>
                  </div>
                  <Badge tone={String(item.status || "Pending") === "Confirmed" ? "green" : "amber"}>{String(item.status || "Pending")}</Badge>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No upcoming appointments yet.</p>}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Recent medical activity" subtitle="Most recent records from your chart." action={<Link className="text-sm text-[var(--accent-sage)] hover:underline" href="/portal/records">View records</Link>} />
          <div className="mt-6 space-y-3">
            {recentRecords.length ? recentRecords.map((record) => (
              <div key={String(record.record_id || record.id)} className="rounded-[16px] border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{String(record.title || record.record_type || "Record")}</p>
                    <p className="mt-1 text-sm text-slate-500">{String(record.summary || record.provider || "Clinical update")}</p>
                  </div>
                  <Badge tone="blue">{String(record.record_type || "Record")}</Badge>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No records are available yet.</p>}
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}