"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, MoreVertical, Plus, X } from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import { AvatarInitials, Badge, FilterPill, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import AppointmentModal from "../../components/modal/AppointmentModal";
import type { AppointmentData } from "../../components/modal/AppointmentModal";
import {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getPatients,
  mapAppointmentToUi,
  type PatientOption,
  type UiAppointment,
  updateAppointment,
} from "../../../lib/api";

export default function AppointmentsPage() {
  const { pushToast } = useWorkspace();
  const [view, setView] = useState("List");
  const [selected, setSelected] = useState<UiAppointment | null>(null);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAppt, setShowAppt] = useState(false);
  const [apptInitial, setApptInitial] = useState<AppointmentData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalKey, setModalKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | "Confirmed" | "Pending" | "Cancelled">("");
  const [patients, setPatients] = useState<PatientOption[]>([]);

  const monthCells = useMemo(() => Array.from({ length: 35 }, (_, index) => index + 1), []);
  const filteredAppointments = useMemo(
    () => (statusFilter ? appointments.filter((item) => item.status === statusFilter) : appointments),
    [appointments, statusFilter]
  );

  const extractAppointmentRows = (resp: unknown): Record<string, unknown>[] => {
    if (Array.isArray(resp)) return resp as Record<string, unknown>[];
    if (!resp || typeof resp !== "object") return [];
    const record = resp as Record<string, unknown>;
    const raw = record.appointments ?? record.results ?? record.data ?? [];
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  };

  const extractPatientRows = (resp: unknown): Record<string, unknown>[] => {
    if (Array.isArray(resp)) return resp as Record<string, unknown>[];
    if (!resp || typeof resp !== "object") return [];
    const record = resp as Record<string, unknown>;
    const raw = record.patients ?? record.results ?? record.data ?? [];
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  };

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = (await getAppointments()) as unknown;
      const rows = extractAppointmentRows(resp);
      const list = rows.map(mapAppointmentToUi);
      setAppointments(list);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  const loadLookupData = async () => {
    try {
      const patientResp = (await getPatients("?limit=200")) as unknown;
      const patientRows = extractPatientRows(patientResp);

      const patientOptions: PatientOption[] = Array.isArray(patientRows)
        ? patientRows
            .map((item: Record<string, unknown>) => ({
              id: String(item.patient_id || ""),
              name: `${String(item.first_name || "")} ${String(item.last_name || "")}`.trim(),
            }))
            .filter((item: PatientOption) => item.id && item.name)
        : [];

      setPatients(patientOptions);
    } catch {
      // Keep modal usable even if lookup APIs fail.
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAppointments();
      void loadLookupData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toModalInitial = (item: UiAppointment): AppointmentData => ({
    patient: { id: item.patientId, name: item.name },
    appointmentType: item.type === "Telehealth" ? "Telehealth" : "In-Person",
    date: item.date,
    time: item.time,
    duration: item.durationMinutes,
    reason: item.reason,
    priority: item.priority,
    sendEmailReminder: item.sendEmailReminder,
    sendSmsReminder: item.sendSmsReminder,
    sendConfirmation: item.sendConfirmation,
    internalNotes: item.internalNotes,
    status: item.status,
  });

  const handleModalSubmit = async (data: AppointmentData) => {
    const payload = {
      patient_id: data.patient?.id || "",
      patient_name: data.patient?.name || "",
      appointment_type: data.appointmentType || "In-Person",
      date: data.date || "",
      time: data.time || "",
      duration_minutes: Number(data.duration || 30),
      reason: data.reason || "",
      priority: data.priority || "Routine",
      send_email_reminder: !!data.sendEmailReminder,
      send_sms_reminder: !!data.sendSmsReminder,
      send_confirmation: data.sendConfirmation !== false,
      internal_notes: data.internalNotes || "",
      status: data.status || "Pending",
    };

    if (modalMode === "edit" && selected?.id) {
      await updateAppointment(selected.id, payload);
      pushToast({ type: "success", title: "Updated", message: `Appointment moved to ${payload.date} ${payload.time}` });
      setSelected(null);
    } else {
      await createAppointment(payload);
      pushToast({ type: "success", title: "Booked", message: `Appointment ${payload.date} ${payload.time}` });
    }

    setShowAppt(false);
    setApptInitial(null);
    setModalMode("create");
    await loadAppointments();
  };

  const handleCancel = async () => {
    if (!selected?.id) return;
    await cancelAppointment(selected.id, "Cancelled from appointments detail");
    pushToast({ type: "success", title: "Cancelled", message: `Appointment for ${selected.name} cancelled.` });
    setSelected(null);
    await loadAppointments();
  };

  return (
    <div className="space-y-6 pb-8">
      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader title="Appointments" subtitle="List, calendar, and timeline views for the clinic day." />
          <div className="flex gap-2">
            {(["List", "Calendar", "Timeline"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setView(item)} className={`rounded-full border px-4 py-2 text-sm ${view === item ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]" : "border-[#E5E7EB] text-slate-600 hover:bg-[#F3F4F6]"}`}>{item}</button>
            ))}
            <button
              type="button"
              onClick={() => {
                setModalMode("create");
                setApptInitial(null);
                setModalKey((key) => key + 1);
                setShowAppt(true);
              }}
              className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white"
            ><Plus className="mr-2 inline h-4 w-4" strokeWidth={1.5} />New Appointment</button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="p-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill active={statusFilter === ""} onClick={() => setStatusFilter("")}>All</FilterPill>
          <FilterPill active={statusFilter === "Confirmed"} onClick={() => setStatusFilter("Confirmed")}>Confirmed</FilterPill>
          <FilterPill active={statusFilter === "Pending"} onClick={() => setStatusFilter("Pending")}>Pending</FilterPill>
          <FilterPill active={statusFilter === "Cancelled"} onClick={() => setStatusFilter("Cancelled")}>Cancelled</FilterPill>
          <button className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600 hover:bg-[#F3F4F6]"><Filter className="mr-2 inline h-4 w-4" strokeWidth={1.5} />More Filters</button>
        </div>
      </WorkspaceCard>

      {error ? (
        <WorkspaceCard className="p-6">
          <p className="text-sm text-red-600">{error}</p>
        </WorkspaceCard>
      ) : null}

      {view === "List" ? (
        <WorkspaceCard className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white uppercase tracking-[0.16em] text-[#9CA3AF]"><tr className="border-b border-[#F3F4F6]"><th className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-[#D1D5DB] accent-[var(--accent-sage)]" /></th><th className="px-4 py-4">Time</th><th className="px-4 py-4">Patient</th><th className="px-4 py-4">Type</th><th className="px-4 py-4">Reason</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Duration</th><th className="px-4 py-4">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>Loading appointments...</td></tr>
              ) : filteredAppointments.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>No appointments found.</td></tr>
              ) : filteredAppointments.map((item) => (
                <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-b border-[#F3F4F6] hover:bg-[#FAFBFC]"><td className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-[#D1D5DB] accent-[var(--accent-sage)]" /></td><td className="px-4 py-4 text-slate-600">{item.time}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><AvatarInitials initials={item.name.split(" ").map((part) => part[0]).join("")} size={34} /><span className="font-medium text-slate-900">{item.name}</span></div></td><td className="px-4 py-4"><Badge tone={item.type === "Telehealth" ? "blue" : "neutral"}>{item.type}</Badge></td><td className="px-4 py-4 text-slate-600">{item.reason}</td><td className="px-4 py-4"><Badge tone={item.status === "Confirmed" ? "green" : item.status === "Pending" ? "amber" : item.status === "Cancelled" ? "red" : "neutral"}>{item.status}</Badge></td><td className="px-4 py-4 text-slate-600">{item.duration}</td><td className="px-4 py-4"><button type="button" className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6] hover:text-slate-700"><MoreVertical className="h-4 w-4" strokeWidth={1.5} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </WorkspaceCard>
      ) : view === "Calendar" ? (
        <WorkspaceCard className="p-6">
          <SectionHeader title="Month View" subtitle="Appointment dots stay subtle and readable." />
          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
            {monthCells.map((cell) => (
              <div key={cell} className="min-h-24 rounded-[12px] border border-[#F3F4F6] p-2 text-left">
                <div className="text-xs text-slate-400">{cell}</div>
                {cell % 6 === 0 ? <div className="mt-3 h-2 w-2 rounded-full bg-[var(--accent-sage)]" /> : null}
                {cell % 9 === 0 ? <div className="mt-2 h-2 w-2 rounded-full bg-[#7A9CC6]" /> : null}
                {cell % 12 === 0 ? <div className="mt-2 text-[11px] text-[var(--accent-sage)]">+2 more</div> : null}
              </div>
            ))}
          </div>
        </WorkspaceCard>
      ) : (
        <div className="space-y-4">
          {[
            ["Today", filteredAppointments.slice(0, 2)],
            ["Tomorrow", filteredAppointments.slice(2, 3)],
            ["This Week", filteredAppointments.slice(3)],
          ].map(([section, list]) => (
            <WorkspaceCard key={section as string} className="p-6">
              <SectionHeader title={section as string} />
              <div className="mt-5 space-y-3">
                {(list as UiAppointment[]).map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex w-full items-center justify-between rounded-[12px] border border-[#E5E7EB] px-4 py-4 text-left hover:bg-[#FAFBFC]"><div><p className="font-medium text-slate-900">{item.name}</p><p className="text-sm text-slate-500">{item.reason}</p></div><div className="text-right"><p className="text-sm font-medium text-slate-900">{item.time}</p><p className="text-xs text-slate-400">{item.duration}</p></div></button>
                ))}
              </div>
            </WorkspaceCard>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[600px] rounded-[16px] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Appointment Detail</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{selected.name}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6]"><X className="h-4 w-4" strokeWidth={1.5} /></button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[["Date/Time", `${selected.time} • Apr 29, 2026`], ["Duration", selected.duration], ["Type", selected.type], ["Reason", selected.reason], ["Location/Link", selected.type === "Telehealth" ? "Secure video visit" : "Clinic Room 4"]].map(([label, value]) => <div key={label as string} className="rounded-[12px] bg-[#FAFBFC] p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label as string}</p><p className="mt-2 text-sm font-medium text-slate-900">{value as string}</p></div>)}
            </div>
            <div className="mt-6 rounded-[12px] border border-[#E5E7EB] p-4">
              <p className="text-sm font-medium text-slate-900">Activity log</p>
              <div className="mt-3 space-y-2 text-sm text-slate-500">
                <p>Created • 9:12 AM</p>
                <p>Confirmed • 9:18 AM</p>
                <p>Reminder sent • 1 day ago</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setApptInitial(toModalInitial(selected));
                  setModalMode("edit");
                  setModalKey((key) => key + 1);
                  setShowAppt(true);
                }}
                className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]"
              >Reschedule</button>
              <button type="button" onClick={handleCancel} className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]">Cancel</button>
              <button type="button" className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white">Start Telehealth</button>
            </div>
          </div>
        </div>
      ) : null}
      <AppointmentModal
        key={modalKey}
        isOpen={showAppt}
        onClose={() => setShowAppt(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        initialData={apptInitial}
        patients={patients}
      />
    </div>
  );
}
