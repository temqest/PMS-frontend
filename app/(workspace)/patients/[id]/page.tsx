"use client";

import Link from "next/link";
import { useMemo, useState, use } from "react";
import { useEffect } from "react";
import { CalendarDays, MoreVertical, Pencil, Plus } from "lucide-react";

import { useWorkspace } from "../../../components/workspace-shell";
import { AvatarInitials, Badge, QuickLine, SectionHeader, WorkspaceCard } from "../../../components/workspace-ui";
import api from "../../../../lib/api";
import type { UiAppointment, UiHealthRecord, UiPrescription } from "../../../../lib/api";

type PatientProfile = {
  first_name?: string;
  last_name?: string;
  patient_id?: string;
  initials?: string;
  age?: number;
  gender?: string;
  date_of_birth?: string;
  contact_number?: string;
  email_address?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  allergies?: string[];
  medications?: string[] | string;
  status?: string;
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { pushToast, requestConfirm } = useWorkspace();
  const [tab, setTab] = useState("Overview");
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [records, setRecords] = useState<UiHealthRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<UiPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTs] = useState(() => Date.now());
  const resolvedParams = use(params);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const id = resolvedParams.id;
        const [patientResp, appointmentResp, recordResp, prescriptionResp] = await Promise.all([
          api.getPatient(id),
          api.getAppointments({ patient_id: id, limit: 200 }),
          api.getHealthRecords({ patient_id: id, limit: 200 }),
          api.getPrescriptions({ patient_id: id, limit: 200 }),
        ]);

        const patientPayload = patientResp.patient || patientResp;
        setPatient(patientPayload as PatientProfile);

        const apptRows = appointmentResp?.appointments || [];
        setAppointments(Array.isArray(apptRows) ? apptRows.map(api.mapAppointmentToUi) : []);

        const recordRows = recordResp?.records || [];
        const mappedRecords = Array.isArray(recordRows) ? recordRows.map(api.mapHealthRecordToUi) : [];
        setRecords(mappedRecords.filter((item) => item.recordType !== "Prescription"));

        const rxRows = prescriptionResp?.records || [];
        setPrescriptions(Array.isArray(rxRows) ? rxRows.map(api.mapHealthRecordToUiPrescription) : []);
      } catch {
        setPatient(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedParams.id]);

  const display = patient;
  const fullName = `${display?.first_name || ""} ${display?.last_name || ""}`.trim();
  const displayStatus = (display?.status || "active").toLowerCase() === "active" ? "Active" : "Inactive";
  const statusTone = displayStatus === "Active" ? "green" : "neutral";
  const overviewRecords = useMemo(() => records.slice(0, 5), [records]);
  const upcomingAppointment = useMemo(() => {
    const future = appointments
      .filter((appt) => {
        const dt = new Date(`${appt.date}T${appt.time}:00`);
        return !Number.isNaN(dt.getTime()) && dt.getTime() >= nowTs;
      })
      .sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
    return future[0] || null;
  }, [appointments, nowTs]);

  if (loading) return <div className="p-6">Loading patient profile...</div>;
  if (!display) return <div className="p-6">Patient not found.</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="text-sm text-slate-500">Dashboard &gt; Patients &gt; {fullName}</div>

      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <AvatarInitials initials={display.initials || `${(display.first_name || "").slice(0, 1)}${(display.last_name || "").slice(0, 1)}`} size={80} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{fullName}</h1>
                <Badge tone={statusTone}>{displayStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{display.patient_id} • {display.age || ''} years • {display.gender || ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => pushToast({ type: "info", title: "Edit patient", message: "Open the patient profile editor." })} className="inline-flex items-center gap-2 rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]">
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
              Edit
            </button>
            <button type="button" onClick={() => pushToast({ type: "success", title: "New appointment", message: `Start booking for ${fullName}.` })} className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              New Appointment
            </button>
            <button type="button" onClick={() => requestConfirm({ title: "Remove patient?", description: `This will archive ${fullName}'s record and hide it from the active roster.`, confirmLabel: "Archive" })} className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]"><MoreVertical className="h-4 w-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="px-6 pt-3">
        <div className="flex gap-6 border-b border-[#E5E7EB]">
          {(["Overview", "Health Records", "Appointments", "Prescriptions"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative px-1 py-4 text-sm font-medium transition-colors ${tab === item ? "text-[var(--accent-sage)]" : "text-slate-500"}`}
            >
              {item}
              {tab === item ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent-sage)]" /> : null}
            </button>
          ))}
        </div>
      </WorkspaceCard>

      {tab === "Overview" ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <WorkspaceCard className="p-6">
              <SectionHeader title="Personal Info" action={<button className="text-sm text-[var(--accent-sage)] hover:underline">Edit</button>} />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <QuickLine label="Date of Birth" value={display.date_of_birth ? new Date(display.date_of_birth).toLocaleDateString() : "-"} />
                <QuickLine label="Phone" value={display.contact_number || "-"} />
                <QuickLine label="Email" value={display.email_address || "-"} />
                <QuickLine label="Address" value={display.address || "-"} />
                <QuickLine label="Emergency Contact" value={display.emergency_contact_name || display.emergency_contact_phone || "-"} />
                <QuickLine label="Age / Gender" value={`${display.age || "-"} / ${display.gender || "-"}`} />
              </div>
            </WorkspaceCard>

            <WorkspaceCard className="p-6">
              <SectionHeader title="Recent Visits" action={<Link href="#" className="text-sm text-[var(--accent-sage)] hover:underline">View All</Link>} />
              <div className="mt-5 overflow-hidden rounded-[12px] border border-[#F3F4F6]">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFBFC] text-[12px] uppercase tracking-[0.16em] text-[#9CA3AF]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Provider</th>
                      <th className="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewRecords.length === 0 ? (
                      <tr className="border-t border-[#F3F4F6] text-sm text-slate-600">
                        <td className="px-4 py-4" colSpan={4}>No recent records.</td>
                      </tr>
                    ) : overviewRecords.map((visit) => (
                      <tr key={visit.id} className="border-t border-[#F3F4F6] text-sm text-slate-600">
                        <td className="px-4 py-4">{visit.date || "-"}</td>
                        <td className="px-4 py-4"><Badge tone="blue">{visit.recordType}</Badge></td>
                        <td className="px-4 py-4">{visit.provider || "-"}</td>
                        <td className="px-4 py-4">{visit.summary || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WorkspaceCard>
          </div>

          <div className="space-y-6">
            <WorkspaceCard className="p-6">
              <SectionHeader title="Quick Stats" />
              <div className="mt-4 space-y-4">
                <QuickLine label="Blood Type" value={display.blood_type || "-"} />
                <div>
                  <p className="text-sm text-slate-500">Allergies</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.isArray(display.allergies) && display.allergies.length > 0
                      ? display.allergies.map((item: string) => <Badge key={item} tone="amber">{item}</Badge>)
                      : <span className="text-sm text-slate-400">None recorded</span>}
                  </div>
                </div>
                <QuickLine label="Current Medications" value={Array.isArray(display.medications) ? display.medications.join(", ") : display.medications || "None"} />
              </div>
            </WorkspaceCard>

            <WorkspaceCard className="p-6">
              <SectionHeader title="Upcoming Appointment" />
              <div className="mt-4 rounded-[12px] bg-[#FAFBFC] p-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[var(--accent-sage)]" strokeWidth={1.5} />
                  <div>
                    {upcomingAppointment ? (
                      <>
                        <p className="font-medium text-slate-900">{upcomingAppointment.date} • {upcomingAppointment.time}</p>
                        <p className="text-sm text-slate-500">{upcomingAppointment.reason || upcomingAppointment.type}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No upcoming appointment.</p>
                    )}
                  </div>
                </div>
              </div>
            </WorkspaceCard>

            <WorkspaceCard className="p-6">
              <SectionHeader title="Notes" />
              <div className="mt-4 min-h-28 rounded-[12px] border border-[#E5E7EB] bg-white p-4 text-sm leading-6 text-slate-500">
                {overviewRecords[0]?.summary || "No notes available."}
              </div>
            </WorkspaceCard>
          </div>
        </div>
      ) : (
        <WorkspaceCard className="p-6">
          <SectionHeader title={tab} />
          {tab === "Appointments" ? (
            <div className="mt-5 overflow-hidden rounded-[12px] border border-[#F3F4F6]">
              <table className="w-full text-left">
                <thead className="bg-[#FAFBFC] text-[12px] uppercase tracking-[0.16em] text-[#9CA3AF]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr className="border-t border-[#F3F4F6] text-sm text-slate-600">
                      <td className="px-4 py-4" colSpan={5}>No appointments found.</td>
                    </tr>
                  ) : appointments.map((item) => (
                    <tr key={item.id} className="border-t border-[#F3F4F6] text-sm text-slate-600">
                      <td className="px-4 py-4">{item.date}</td>
                      <td className="px-4 py-4">{item.time}</td>
                      <td className="px-4 py-4">{item.type}</td>
                      <td className="px-4 py-4">{item.status}</td>
                      <td className="px-4 py-4">{item.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === "Health Records" ? (
            <div className="mt-5 space-y-3">
              {records.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-8 text-center text-slate-500">
                  No health records found.
                </div>
              ) : records.map((record) => (
                <div key={record.id} className="rounded-[12px] border border-[#F3F4F6] p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{record.recordType}</Badge>
                    <span className="text-xs text-slate-400">{record.date || "-"}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{record.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{record.summary || "-"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {prescriptions.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-8 text-center text-slate-500">
                  No prescriptions found.
                </div>
              ) : prescriptions.map((rx) => (
                <div key={rx.id} className="rounded-[12px] border border-[#F3F4F6] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{rx.medicationName || "Prescription"}</p>
                    <Badge tone="neutral">{rx.form || "-"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{rx.dosage || "-"} • {rx.directionsForUse || "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Start: {rx.startDate || "-"} • End: {rx.endDate || "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Qty: {rx.quantity} • Refills: {rx.refills}</p>
                </div>
              ))}
            </div>
          )}
        </WorkspaceCard>
      )}
    </div>
  );
}
