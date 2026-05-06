"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MoreVertical, Pencil, Plus } from "lucide-react";

import { useWorkspace } from "../../../components/workspace-shell";
import { AvatarInitials, Badge, QuickLine, SectionHeader, WorkspaceCard } from "../../../components/workspace-ui";
import AppointmentModal from "../../../components/modal/AppointmentModal";
import RecordModal from "../../../components/modal/RecordModal";
import PrescriptionModal from "../../../components/modal/PrescriptionModal";
import PredictiveCarePanel from "../../../components/predictive-care/patient-predictive-care-panel";
import api from "../../../../lib/api";
import type {
  PredictiveCareAdherenceRow,
  PredictiveCareLabForecast,
  PredictiveCareLabTrend,
  PredictiveCareProfile,
  PredictiveCareRadarPayload,
  PredictiveCareTimelineEvent,
  UiAppointment,
  UiHealthRecord,
  UiPrescription,
} from "../../../../lib/api";
import type { RecordForm } from "../../../components/modal/RecordModal";

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

const recordSummary = (record: RecordForm) => {
  if (record.recordType === "Visit") return record.visitAssessment || record.visitReason;
  if (record.recordType === "Lab Result") return record.labNotes;
  if (record.recordType === "Imaging") return record.imagingImpression || record.imagingFindings;
  if (record.recordType === "Prescription") return record.prescriptionDirections;
  if (record.recordType === "Vaccination") return record.vaccinationNotes;
  return record.noteContent;
};

const recordTitle = (record: RecordForm) => {
  if (record.recordType === "Visit") return record.visitType;
  if (record.recordType === "Lab Result") return record.labTestName;
  if (record.recordType === "Imaging") return record.imagingStudyType;
  if (record.recordType === "Prescription") return record.prescriptionMedicationName;
  if (record.recordType === "Vaccination") return record.vaccinationName;
  return record.noteType;
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { pushToast, requestConfirm } = useWorkspace();
  const [tab, setTab] = useState("Overview");
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [records, setRecords] = useState<UiHealthRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<UiPrescription[]>([]);
  const [predictiveProfile, setPredictiveProfile] = useState<PredictiveCareProfile | null>(null);
  const [labTrends, setLabTrends] = useState<PredictiveCareLabTrend[]>([]);
  const [labForecast, setLabForecast] = useState<PredictiveCareLabForecast | null>(null);
  const [predictiveLoading, setPredictiveLoading] = useState(false);
  const [predictiveRefreshing, setPredictiveRefreshing] = useState(false);
  const [predictiveError, setPredictiveError] = useState<string | null>(null);
  const [predictiveFetchedAt, setPredictiveFetchedAt] = useState<string | null>(null);
  const [predictiveDisclaimer, setPredictiveDisclaimer] = useState<string | null>(null);
  const [predictiveAdherence, setPredictiveAdherence] = useState<PredictiveCareAdherenceRow[]>([]);
  const [predictiveRadar, setPredictiveRadar] = useState<PredictiveCareRadarPayload | null>(null);
  const [predictiveTimeline, setPredictiveTimeline] = useState<PredictiveCareTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTs] = useState(() => Date.now());
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const extractRows = (resp: unknown, keys: string[]): Record<string, unknown>[] => {
    if (Array.isArray(resp)) return resp as Record<string, unknown>[];
    if (!resp || typeof resp !== "object") return [];
    const record = resp as Record<string, unknown>;
    const rawKey = keys.find((key) => key in record);
    const raw = rawKey ? record[rawKey] : record.data;
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  };

  // Modal states
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  const loadPredictiveCare = useCallback(
    async (forceCompute = false) => {
      setPredictiveLoading(true);
      setPredictiveRefreshing(forceCompute);
      setPredictiveError(null);

      try {
        let profileResp = null;
        let trendResp = null;
        let computeError: Error | null = null;

        if (forceCompute) {
          profileResp = await api.computePredictiveCareProfile(patientId).catch((err) => {
            computeError = err instanceof Error ? err : new Error("Unable to recompute predictive profile.");
            return null;
          });
        }

        // Try to fetch profile; if 404, attempt auto-compute
        try {
          profileResp = profileResp || await api.getPredictiveCareProfile(patientId);
        } catch (err) {
          const apiErr = err as { status?: number; message?: string };
          if (apiErr.status === 404) {
            // Profile doesn't exist yet, auto-compute on first load
            if (!forceCompute) {
              profileResp = await api.computePredictiveCareProfile(patientId).catch((computeErr) => {
                computeError =
                  computeErr instanceof Error
                    ? computeErr
                    : new Error("Unable to compute predictive profile.");
                return null;
              });
              // Retry fetch after compute
              profileResp = profileResp || await api.getPredictiveCareProfile(patientId).catch(() => null);
            }
          }
          if (!profileResp && apiErr.status && apiErr.status !== 404) {
            throw err;
          }
        }

        const [trendRespParallel, adherResp, radarResp, timelineResp] = await Promise.all([
          api.getPredictiveCareLabTrends(patientId).catch(() => null),
          api.getPredictiveCareAdherence(patientId).catch(() => null),
          api.getPredictiveCareRiskRadar(patientId).catch(() => null),
          api.getPredictiveCareAlertTimeline(patientId).catch(() => null),
        ]);
        trendResp = trendRespParallel;

        const profile = profileResp?.profile || null;
        const trends = Array.isArray(trendResp?.trends) ? trendResp.trends : [];

        if (!profile && computeError) {
          throw computeError;
        }

        setPredictiveProfile(profile);
        setLabTrends(trends);
        setPredictiveDisclaimer(profileResp?.predictive_care_disclaimer ?? null);
        setPredictiveAdherence(Array.isArray(adherResp?.adherence) ? adherResp.adherence : []);
        setPredictiveRadar(radarResp && typeof radarResp === "object" ? radarResp : null);
        setPredictiveTimeline(Array.isArray(timelineResp?.timeline) ? timelineResp.timeline : []);

        const primaryTrend = [...trends]
          .sort((a, b) => (b.chart_data?.length || 0) - (a.chart_data?.length || 0))
          .find((item) => Array.isArray(item.chart_data) && item.chart_data.length > 0) || null;

        if (primaryTrend?.test_name) {
          const lastValues = (primaryTrend.chart_data || [])
            .map((point) => Number(point.value))
            .filter((value) => Number.isFinite(value))
            .slice(-3);

          const forecastResp = await api.getPredictiveCareLabForecast(
            patientId,
            primaryTrend.test_name,
            lastValues
          ).catch(() => null);

          setLabForecast(forecastResp || null);
        } else {
          setLabForecast(null);
        }

        setPredictiveFetchedAt(new Date().toISOString());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load predictive care data.";
        setPredictiveError(message);
        setPredictiveProfile(null);
        setLabTrends([]);
        setLabForecast(null);
        setPredictiveDisclaimer(null);
        setPredictiveAdherence([]);
        setPredictiveRadar(null);
        setPredictiveTimeline([]);
      } finally {
        setPredictiveLoading(false);
        setPredictiveRefreshing(false);
      }
    },
    [patientId]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const id = patientId;
        const [patientResp, appointmentResp, recordResp, prescriptionResp] = await Promise.all([
          api.getPatient(id),
          api.getAppointments({ patient_id: id, limit: 200 }),
          api.getHealthRecords({ patient_id: id, limit: 200 }),
          api.getPrescriptions({ patient_id: id, limit: 200 }),
        ]);

        const patientRaw = patientResp as unknown;
        const patientPayload =
          patientRaw && typeof patientRaw === "object" && "patient" in (patientRaw as Record<string, unknown>)
            ? (patientRaw as { patient?: unknown }).patient
            : patientRaw;
        setPatient(patientPayload as PatientProfile);

        const apptRows = extractRows(appointmentResp as unknown, ["appointments", "results"]);
        setAppointments(apptRows.map(api.mapAppointmentToUi));

        const recordRows = extractRows(recordResp as unknown, ["records", "results"]);
        const mappedRecords = recordRows.map(api.mapHealthRecordToUi);
        setRecords(mappedRecords.filter((item) => item.recordType !== "Prescription"));

        const rxRows = extractRows(prescriptionResp as unknown, ["records", "results"]);
        setPrescriptions(rxRows.map(api.mapHealthRecordToUiPrescription));
      } catch {
        setPatient(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPredictiveCare(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPredictiveCare]);

  // Auto-refresh predictive care whenever user enters the tab.
  useEffect(() => {
    if (tab !== "Predictive Care") return;
    void loadPredictiveCare(false);
  }, [tab, loadPredictiveCare]);

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
            <button type="button" onClick={() => requestConfirm({ title: "Remove patient?", description: `This will archive ${fullName}'s record and hide it from the active roster.`, confirmLabel: "Archive" })} className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]"><MoreVertical className="h-4 w-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="px-6 pt-3">
        <div className="flex gap-6 border-b border-[#E5E7EB]">
          {(["Overview", "Predictive Care", "Health Records", "Appointments", "Prescriptions"] as const).map((item) => (
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
          <SectionHeader 
            title={tab}
            action={
              tab === "Appointments" ? (
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add Appointment
                </button>
              ) : tab === "Health Records" ? (
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add Health Record
                </button>
              ) : tab === "Predictive Care" ? null : tab === "Prescriptions" ? (
                <button
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add Prescription
                </button>
              ) : null
            }
          />
          {tab === "Predictive Care" ? (
            <div className="mt-5">
              <PredictiveCarePanel
                profile={predictiveProfile}
                labTrends={labTrends}
                labForecast={labForecast}
                adherence={predictiveAdherence}
                riskRadar={predictiveRadar}
                alertTimeline={predictiveTimeline}
                disclaimer={predictiveDisclaimer}
                loading={predictiveLoading}
                recomputing={predictiveRefreshing}
                fetchedAt={predictiveFetchedAt}
                error={predictiveError}
                onRefresh={() => void loadPredictiveCare(false)}
                onRecompute={() => void loadPredictiveCare(true)}
              />
            </div>
          ) : tab === "Appointments" ? (
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
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        preselectedPatient={{ id: patientId, name: fullName }}
        patientLocked
        onSubmit={async (appointment) => {
          try {
            const payload = {
              patient_id: patientId,
              patient_name: fullName,
              appointment_type: appointment.appointmentType || "In-Person",
              date: appointment.date || "",
              time: appointment.time || "",
              duration_minutes: appointment.duration || 30,
              reason: appointment.reason,
              priority: appointment.priority,
              send_email_reminder: appointment.sendEmailReminder,
              send_sms_reminder: appointment.sendSmsReminder,
              send_confirmation: appointment.sendConfirmation,
              internal_notes: appointment.internalNotes,
            };
            await api.createAppointment(payload);
            pushToast({ type: "success", title: "Appointment created", message: `Appointment scheduled for ${fullName}.` });
            setIsAppointmentModalOpen(false);
            // Refresh appointments
            const appointmentResp = await api.getAppointments({ patient_id: patientId, limit: 200 });
            const apptRows = extractRows(appointmentResp as unknown, ["appointments", "results"]);
            setAppointments(apptRows.map(api.mapAppointmentToUi));
          } catch {
            pushToast({ type: "error", title: "Failed to create appointment", message: "Please try again." });
          }
        }}
      />
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        preselectedPatient={{ id: patientId, name: fullName }}
        patientLocked
        onSubmit={async (record) => {
          try {
            const payload = {
              patient_id: patientId,
              patient_name: fullName,
              record_type: record.recordType,
              record_date: record.date,
              provider: record.provider,
              summary: recordSummary(record),
              details: {
                title: recordTitle(record),
                summary: recordSummary(record),
                ...record,
              },
            };
            await api.createHealthRecord(payload);
            pushToast({ type: "success", title: "Health record created", message: `Record added for ${fullName}.` });
            setIsRecordModalOpen(false);
            // Refresh records
            const recordResp = await api.getHealthRecords({ patient_id: patientId, limit: 200 });
            const recordRows = extractRows(recordResp as unknown, ["records", "results"]);
            const mappedRecords = recordRows.map(api.mapHealthRecordToUi);
            setRecords(mappedRecords.filter((item) => item.recordType !== "Prescription"));
          } catch {
            pushToast({ type: "error", title: "Failed to create health record", message: "Please try again." });
          }
        }}
      />
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        preselectedPatient={{ id: patientId, name: fullName }}
        patientLocked
        onSubmit={async (prescription) => {
          try {
            const payload = {
              patient_id: patientId,
              patient_name: fullName,
              provider: "Assigned Provider",
              record_date: prescription.startDate,
              medicines: prescription.medicines,
              directions_for_use: prescription.directionsForUse,
              start_date: prescription.startDate,
              end_date: prescription.endDate,
            };
            await api.createPrescription(payload);
            pushToast({ type: "success", title: "Prescription created", message: `Prescription added for ${fullName}.` });
            setIsPrescriptionModalOpen(false);
            // Refresh prescriptions
            const prescriptionResp = await api.getPrescriptions({ patient_id: patientId, limit: 200 });
            const rxRows = extractRows(prescriptionResp as unknown, ["records", "results"]);
            setPrescriptions(rxRows.map(api.mapHealthRecordToUiPrescription));
          } catch {
            pushToast({ type: "error", title: "Failed to create prescription", message: "Please try again." });
          }
        }}
      />
    </div>
  );
}
