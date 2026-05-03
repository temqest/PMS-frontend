"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  FileText,
  MessageSquare,
  NotebookText,
  Pill,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import AppointmentModal from "../../components/modal/AppointmentModal";
import PatientModal from "../../components/modal/PatientModal";
import PrescriptionModal from "../../components/modal/PrescriptionModal";
import {
  createAppointment,
  createPrescription,
  getAppointments,
  getHealthRecords,
  getPatients,
  mapAppointmentToUi,
  mapHealthRecordToUi,
  type PatientOption,
  type UiAppointment,
  type UiHealthRecord,
} from "../../../lib/api";

import { useWorkspace } from "../../components/workspace-shell";
import {
  ActionButton,
  AvatarInitials,
  Badge,
  SectionHeader,
  StatCard,
  TableActionLink,
  WorkspaceCard,
} from "../../components/workspace-ui";

const formatLongDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const getTone = (status: UiAppointment["status"]) => {
  if (status === "Confirmed") return "green" as const;
  if (status === "Pending") return "amber" as const;
  if (status === "Cancelled") return "red" as const;
  return "neutral" as const;
};

const isSameDay = (value: Date, target: Date) =>
  value.getFullYear() === target.getFullYear() &&
  value.getMonth() === target.getMonth() &&
  value.getDate() === target.getDate();

const minutesFromNow = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (1000 * 60));
};

export default function DashboardPage() {
  const { pushToast } = useWorkspace();
  const [showAppt, setShowAppt] = useState(false);
  const [showPatient, setShowPatient] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [records, setRecords] = useState<UiHealthRecord[]>([]);
  const [nowTs] = useState(() => Date.now());

  const extractRows = (resp: unknown, keys: string[]): Record<string, unknown>[] => {
    if (Array.isArray(resp)) return resp as Record<string, unknown>[];
    if (!resp || typeof resp !== "object") return [];
    const record = resp as Record<string, unknown>;
    const rawKey = keys.find((key) => key in record);
    const raw = rawKey ? record[rawKey] : record.data;
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  };

  useEffect(() => {
    (async () => {
      try {
        const [patientResp, appointmentResp, recordResp] = await Promise.all([
          getPatients("?limit=200"),
          getAppointments({ limit: 200 }),
          getHealthRecords({ limit: 200 }),
        ]);

        const patientRows = extractRows(patientResp as unknown, ["patients", "results"]);
        const patientOptions: PatientOption[] = Array.isArray(patientRows)
          ? patientRows
              .map((item: Record<string, unknown>) => ({
                id: String(item.patient_id || ""),
                name: `${String(item.first_name || "")} ${String(item.last_name || "")}`.trim(),
              }))
              .filter((item: PatientOption) => item.id && item.name)
          : [];
        setPatients(patientOptions);

        const appointmentRows = extractRows(appointmentResp as unknown, ["appointments", "results"]);
        setAppointments(
          Array.isArray(appointmentRows) ? appointmentRows.map(mapAppointmentToUi) : []
        );

        const recordRows = extractRows(recordResp as unknown, ["records", "results"]);
        setRecords(Array.isArray(recordRows) ? recordRows.map(mapHealthRecordToUi) : []);
      } catch {
        setPatients([]);
        setAppointments([]);
        setRecords([]);
      }
    })();
  }, []);

  const today = new Date();
  const todayAppointments = appointments
    .filter((item) => isSameDay(new Date(`${item.date}T${item.time}:00`), today))
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}:00`).getTime() -
        new Date(`${b.date}T${b.time}:00`).getTime()
    );
  const pendingRecords = records.filter((item) => item.saveState === "draft").length;
  const upcoming = appointments
    .filter((item) => new Date(`${item.date}T${item.time}:00`).getTime() >= nowTs)
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}:00`).getTime() -
        new Date(`${b.date}T${b.time}:00`).getTime()
    );
  const avgWaitMinutes =
    upcoming.length > 0
      ? Math.max(
          0,
          Math.round(
            upcoming
              .slice(0, Math.min(5, upcoming.length))
              .reduce(
                (sum, item) =>
                  sum + minutesFromNow(`${item.date}T${item.time}:00`),
                0
              ) / Math.min(5, upcoming.length)
          )
        )
      : 0;

  const stats = [
    { icon: Users, value: `${patients.length}`, label: "Total Patients", trend: "Live", positive: true },
    {
      icon: CalendarDays,
      value: `${todayAppointments.length}`,
      label: "Today's Appointments",
      trend: "Live",
      positive: true,
    },
    {
      icon: FileText,
      value: `${pendingRecords}`,
      label: "Pending Records",
      trend: "Live",
      positive: pendingRecords === 0,
    },
    {
      icon: NotebookText,
      value: `${avgWaitMinutes}m`,
      label: "Average Wait Time",
      trend: "Live",
      positive: true,
    },
  ];

  const recentPatients = patients.slice(0, 5).map((patient) => ({
    initials: patient.name
      .split(" ")
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    name: patient.name,
    lastVisit: "View profile",
    href: `/patients/${encodeURIComponent(patient.id)}`,
  }));

  const alerts = [
    `${appointments.filter((item) => item.status === "Pending").length} appointments pending confirmation`,
    `${records.filter((item) => item.recordType === "Lab Result").length} lab result records in system`,
    `${records.filter((item) => item.recordType === "Prescription").length} prescription records available`,
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Quick Actions" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ActionButton icon={Plus} label="New Appointment" onClick={() => setShowAppt(true)} />
            <ActionButton icon={Users} label="Add Patient" onClick={() => setShowPatient(true)} />
            <ActionButton icon={Pill} label="Write Prescription" onClick={() => setShowPrescription(true)} />
            <ActionButton icon={MessageSquare} label="Send Message" onClick={() => pushToast({ type: "success", title: "Message composer", message: "Open secure messaging for the selected patient." })} />
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader
            title="Today's Schedule"
            subtitle={formatLongDate(today)}
            action={<TableActionLink href="/appointments">View All</TableActionLink>}
          />
          <div className="mt-6 space-y-5 border-l border-[#E5E7EB] pl-5">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments scheduled for today.</p>
            ) : todayAppointments.map((item) => (
              <button
                key={`${item.id}-${item.time}-${item.name}`}
                type="button"
                className="group flex w-full items-center gap-5 rounded-[12px] px-2 py-3 text-left transition-colors hover:bg-[#FAFBFC]"
                onClick={() => pushToast({ type: "info", title: "Appointment opened", message: `${item.name} at ${item.time}` })}
              >
                <div className="w-16 text-sm text-slate-500">{item.time}</div>
                <div className="h-2.5 w-2.5 rounded-full bg-[#6B9080]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <Badge tone={getTone(item.status)}>{item.type}</Badge>
                    <Badge tone={item.status === "Confirmed" ? "green" : item.status === "Pending" ? "amber" : "red"}>{item.status}</Badge>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </WorkspaceCard>
      </div>
      <AppointmentModal
        isOpen={showAppt}
        onClose={() => setShowAppt(false)}
        patients={patients}
        onSubmit={async (data) => {
          await createAppointment({
            patient_id: data.patient?.id || "",
            patient_name: data.patient?.name || "",
            appointment_type: data.appointmentType || "In-Person",
            date: data.date || "",
            time: data.time || "",
            duration_minutes: Number(data.duration || 30),
            reason: data.reason || "",
            priority: data.priority || "Routine",
            status: data.status || "Pending",
            send_email_reminder: !!data.sendEmailReminder,
            send_sms_reminder: !!data.sendSmsReminder,
            send_confirmation: data.sendConfirmation !== false,
            internal_notes: data.internalNotes || "",
          });
          pushToast({type:'success', title: 'Booked', message: `Appointment ${data.date} ${data.time}`});
        }}
        mode="create"
      />
      <PatientModal isOpen={showPatient} onClose={() => setShowPatient(false)} onSubmit={(data)=>{ pushToast({type:'success', title: 'Patient added', message: `${data.firstName} ${data.lastName} created.`}); }} mode="create" />
      <PrescriptionModal
        isOpen={showPrescription}
        onClose={() => setShowPrescription(false)}
        patients={patients}
        onSubmit={async (data) => {
          await createPrescription({
            patient_id: data.patient?.id || "",
            patient_name: data.patient?.name || "",
            provider: "Assigned Provider",
            record_date: data.startDate || new Date().toISOString().slice(0, 10),
            medicines: data.medicines,
            directions_for_use: data.directionsForUse || "",
            start_date: data.startDate || new Date().toISOString().slice(0, 10),
            end_date: data.endDate || "",
          });
          pushToast({
            type: "success",
            title: "Prescription sent",
            message: `${data.medicines.length} medicine(s) added.`,
          });
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Recent Patients" action={<TableActionLink href="/patients">View All</TableActionLink>} />
          <div className="mt-6 space-y-2">
            {recentPatients.map((patient) => (
              <Link
                key={patient.name}
                href={patient.href}
                className="flex items-center gap-4 rounded-[12px] px-3 py-3 transition-colors hover:bg-[#FAFBFC]"
              >
                <AvatarInitials initials={patient.initials} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{patient.name}</p>
                  <p className="text-sm text-slate-500">Last visit {patient.lastVisit}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="border-l-4 border-l-[rgba(217,119,6,0.45)] p-6">
          <SectionHeader title="Alerts & Reminders" />
          <div className="mt-5 space-y-3">
            {alerts.map((alert) => (
              <div key={alert} className="flex items-center justify-between gap-4 rounded-[12px] bg-[#FAFBFC] px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(217,119,6,0.08)] text-[#B45309]">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <p className="text-sm text-slate-700">{alert}</p>
                </div>
                <button type="button" className="text-sm font-medium text-[var(--accent-sage)] hover:underline">
                  Review
                </button>
              </div>
            ))}
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
