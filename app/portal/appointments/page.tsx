"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Plus, X } from "lucide-react";

import { Badge, EmptyState, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import { cancelMyAppointmentRequest, createMyAppointmentRequest, getMyAppointments, updateMyAppointmentRequest } from "../../../lib/patient-api";
import { getSessionClaims } from "../../../lib/session";

type Appointment = Record<string, unknown>;

const statusOptions = ["All", "Pending", "Confirmed", "Cancelled", "Completed"] as const;

const formatWhen = (item: Appointment) => {
  const value = String(item.scheduled_at || item.date || "");
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<(typeof statusOptions)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date: "", time: "", appointment_type: "In-Person", reason: "", duration_minutes: 30 });
  const claims = getSessionClaims();
  const isUnlinked = !claims?.patient_id;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      (async () => {
        if (isUnlinked) {
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const resp = await getMyAppointments({ limit: 200 });
          setAppointments(Array.isArray(resp?.appointments) ? resp.appointments : []);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isUnlinked]);

  const load = async () => {
    const resp = await getMyAppointments({ limit: 200 });
    setAppointments(Array.isArray(resp?.appointments) ? resp.appointments : []);
  };

  const filtered = useMemo(() => {
    return appointments.filter((item) => filter === "All" || String(item.status || "Pending") === filter);
  }, [appointments, filter]);

  const selectedAppointmentId = selected ? String(selected.appointment_id || selected.id || "") : "";
  const canJoinTelehealth = Boolean(
    selected &&
      selectedAppointmentId &&
      String(selected.appointment_type || "") === "Telehealth" &&
      String(selected.status || "Pending") === "Confirmed"
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createMyAppointmentRequest({
        date: form.date,
        time: form.time,
        appointment_type: form.appointment_type,
        reason: form.reason,
        duration_minutes: Number(form.duration_minutes || 30),
      });
      setShowForm(false);
      setForm({ date: "", time: "", appointment_type: "In-Person", reason: "", duration_minutes: 30 });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCancel = async (appointment: Appointment) => {
    if (!appointment.appointment_id && !appointment.id) return;
    await cancelMyAppointmentRequest(String(appointment.appointment_id || appointment.id), "Patient requested cancellation");
    await load();
  };

  const handleRequestReschedule = async (appointment: Appointment) => {
    if (!appointment.appointment_id && !appointment.id) return;
    const when = formatWhen(appointment);
    const nextDate = when ? new Date(when.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date();
    const nextTime = when ? when.toTimeString().slice(0, 5) : "09:00";
    await updateMyAppointmentRequest(String(appointment.appointment_id || appointment.id), {
      date: nextDate.toISOString().slice(0, 10),
      time: nextTime,
      reason: String(appointment.reason || "") || "Reschedule request",
    });
    await load();
  };

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your appointments…</WorkspaceCard>;
  }

  if (isUnlinked) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="Appointments" subtitle="Your appointment chart will appear once the clinic links your patient record." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          New appointment requests are available after activation. For now, your account is signed in but not attached to a clinic chart.
        </div>
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceCard className="p-6">
        <SectionHeader title="Appointments" subtitle="Request new visits, reschedules, or cancellation requests." action={<button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" strokeWidth={1.75} />New request</button>} />

        {showForm ? (
          <form onSubmit={handleCreate} className="mt-6 grid gap-4 rounded-[20px] border border-[#E5E7EB] p-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] px-4 text-sm outline-none focus:border-[var(--accent-sage)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Time</label>
              <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] px-4 text-sm outline-none focus:border-[var(--accent-sage)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select value={form.appointment_type} onChange={(event) => setForm((current) => ({ ...current, appointment_type: event.target.value }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] px-4 text-sm outline-none focus:border-[var(--accent-sage)]">
                <option>In-Person</option>
                <option>Telehealth</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <select value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-[12px] border border-[#E5E7EB] px-4 text-sm outline-none focus:border-[var(--accent-sage)]">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
              <textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className="mt-2 w-full rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-[var(--accent-sage)]" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={submitting} className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? "Submitting…" : "Submit request"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-[12px] border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600">Cancel</button>
            </div>
          </form>
        ) : null}
      </WorkspaceCard>

      <WorkspaceCard className="p-6">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full border px-4 py-2 text-sm ${filter === option ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]" : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"}`}>
              {option}
            </button>
          ))}
        </div>
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkspaceCard className="p-6">
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((item) => {
                const when = formatWhen(item);
                return (
                  <button key={String(item.appointment_id || item.id)} type="button" onClick={() => setSelected(item)} className="flex w-full items-center justify-between rounded-[18px] border border-[#E5E7EB] p-4 text-left hover:bg-[#FAFBFC]">
                    <div className="flex items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"><CalendarDays className="h-5 w-5" strokeWidth={1.75} /></span>
                      <div>
                        <p className="font-medium text-slate-900">{String(item.reason || "Appointment")}</p>
                        <p className="mt-1 text-sm text-slate-500">{when?.toLocaleString() || "TBA"}</p>
                      </div>
                    </div>
                    <Badge tone={String(item.status || "Pending") === "Confirmed" ? "green" : String(item.status || "Pending") === "Cancelled" ? "red" : "amber"}>{String(item.status || "Pending")}</Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No appointments found" description="Try a different status filter or request a new visit." />
          )}
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Appointment detail</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{String(selected.reason || "Visit")}</h3>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6]"><X className="h-4 w-4" strokeWidth={1.75} /></button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[["Status", String(selected.status || "Pending")], ["Type", String(selected.appointment_type || "In-Person")], ["Duration", `${String(selected.duration_minutes || 30)} minutes`], ["When", formatWhen(selected)?.toLocaleString() || "TBA"]].map(([label, value]) => (
                  <div key={label} className="rounded-[16px] bg-[#FAFBFC] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{value as string}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {canJoinTelehealth ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/telehealth/${encodeURIComponent(selectedAppointmentId)}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white"
                  >
                    Join Telehealth
                  </button>
                ) : null}
                <button type="button" onClick={() => handleRequestReschedule(selected)} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white"><Clock3 className="h-4 w-4" strokeWidth={1.75} />Request reschedule</button>
                <button type="button" onClick={() => handleRequestCancel(selected)} className="rounded-[12px] border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600">Request cancellation</button>
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="Select an appointment" description="Choose a visit to review details or submit a request." />
          )}
        </WorkspaceCard>
      </div>
    </div>
  );
}
