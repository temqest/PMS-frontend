"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MoreVertical, Pencil, Plus, X, XCircle } from "lucide-react";

import { useWorkspace } from "../../../components/workspace-shell";
import { AvatarInitials, Badge, QuickLine, SectionHeader, WorkspaceCard } from "../../../components/workspace-ui";
import AppointmentModal from "../../../components/modal/AppointmentModal";
import RecordModal from "../../../components/modal/RecordModal";
import PrescriptionModal from "../../../components/modal/PrescriptionModal";
import { PatientPageSkeleton } from "../../../components/patient-detail-skeleton";
import PredictiveCarePanel from "../../../components/predictive-care/patient-predictive-care-panel";
import api from "../../../../lib/api";
import type {
  PredictiveCareAdherenceRow,
  PredictiveCareLabForecast,
  PredictiveCareLabTrend,
  PredictiveCareProfile,
  PredictiveCareRadarPayload,
  PredictiveCareTimelineEvent,
  PrescriptionInvoice,
  ProviderOption,
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
  lifestyle?: {
    smoking?: boolean;
    alcohol?: boolean;
    diet?: string;
    physical_activity?: string;
  };
  status?: string;
};

const tabPanelShellClassName = "tab-panel-enter min-w-0 overflow-x-hidden min-h-[44rem] lg:min-h-[54rem]";

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

const extractRows = (resp: unknown, keys: string[]): Record<string, unknown>[] => {
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  if (!resp || typeof resp !== "object") return [];
  const record = resp as Record<string, unknown>;
  const rawKey = keys.find((key) => key in record);
  const raw = rawKey ? record[rawKey] : record.data;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
};

const patientTabs = ["Overview", "Predictive Care", "Health Records", "Appointments", "Prescriptions"] as const;
type PatientTab = (typeof patientTabs)[number];
type DetailModalState =
  | { kind: "appointment"; item: UiAppointment }
  | { kind: "record"; item: UiHealthRecord }
  | { kind: "prescription"; item: UiPrescription };

const formatDetailLabel = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return `${value}`;
  if (typeof value === "string") return value.trim() || "-";
  if (Array.isArray(value)) {
    const rendered = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return Object.values(item as Record<string, unknown>)
            .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
            .filter(Boolean)
            .join(" • ");
        }
        return String(item || "");
      })
      .filter(Boolean)
      .join(", ");
    return rendered || "-";
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "-";
    }
  }
  return "-";
};

const getRecordDetailEntries = (details: Record<string, unknown>) =>
  Object.entries(details || {}).filter(([key, value]) => {
    if (["title", "summary", "patient", "provider", "providerId", "recordType", "date", "saveState"].includes(key)) {
      return false;
    }
    if (value === null || typeof value === "undefined") return false;
    if (typeof value === "string" && !value.trim()) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

const formatPrescriptionIssuedDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const paymentStatusMeta = (status: UiPrescription["paymentStatus"]) => {
  if (status === "paid") {
    return { label: "Paid", tone: "green" as const, icon: CheckCircle2 };
  }
  if (status === "cancelled") {
    return { label: "Cancelled", tone: "red" as const, icon: XCircle };
  }
  return { label: "Unpaid", tone: "amber" as const, icon: Clock3 };
};

const releaseStatusMeta = (status: UiPrescription["releaseStatus"]) => {
  if (status === "released") {
    return { label: "Released", tone: "green" as const, icon: CheckCircle2 };
  }
  return { label: "Pending Release", tone: "amber" as const, icon: Clock3 };
};

function StatusBadge({
  meta,
}: {
  meta: { label: string; tone: "neutral" | "sage" | "blue" | "amber" | "red" | "green"; icon: typeof Clock3 };
}) {
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <span className="inline-flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {meta.label}
      </span>
    </Badge>
  );
}

const mergePrescriptionStatuses = (
  prescriptions: UiPrescription[],
  invoices: PrescriptionInvoice[]
): UiPrescription[] => {
  const invoiceByRecordId = new Map<string, PrescriptionInvoice>();
  for (const invoice of invoices) {
    const healthRecordId = String(invoice.health_record_id || "").trim();
    if (healthRecordId) {
      invoiceByRecordId.set(healthRecordId, invoice);
    }
  }

  return prescriptions.map((rx) => {
    const invoice = invoiceByRecordId.get(rx.id);

    let paymentStatus: UiPrescription["paymentStatus"] = "unknown";
    if (invoice?.status === "paid" || invoice?.status === "pending" || invoice?.status === "cancelled") {
      paymentStatus = invoice.status;
    }

    let releaseStatus: UiPrescription["releaseStatus"] = "unknown";
    if (typeof invoice?.is_released === "boolean") {
      releaseStatus = invoice.is_released ? "released" : "pending_release";
    }

    return {
      ...rx,
      paymentStatus,
      releaseStatus,
      issuedDate: invoice?.invoice_date || rx.dateIso || "",
      invoiceId: invoice?.invoice_id || "",
    };
  });
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { pushToast, requestConfirm } = useWorkspace();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PatientTab>(() => (searchParams.get("tab") === "predictive" ? "Predictive Care" : "Overview"));
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [records, setRecords] = useState<UiHealthRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<UiPrescription[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");
  const [currentProviderName, setCurrentProviderName] = useState("");
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowTs] = useState(() => Date.now());
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  // Modal states
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadPatientData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setProvidersLoading(true);
      setProvidersError("");
      const id = patientId;
      const [patientResp, appointmentResp, recordResp, prescriptionResp, invoiceResp, providerResp] = await Promise.all([
        api.getPatient(id),
        api.getAppointments({ patient_id: id, limit: 200 }),
        api.getHealthRecords({ patient_id: id, limit: 200 }),
        api.getPrescriptions({ patient_id: id, limit: 200 }),
        api.getPrescriptionInvoices({ patient_id: id, limit: 200 }),
        api.getHealthRecordProviders(),
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
      const mappedPrescriptions = rxRows.map(api.mapHealthRecordToUiPrescription);
      setPrescriptions(mergePrescriptionStatuses(mappedPrescriptions, invoiceResp));
      setProviders(Array.isArray(providerResp.providers) ? providerResp.providers : []);
      setCurrentProviderName(providerResp.current_provider?.name || "");
      setProvidersError(providerResp.warning || "");
    } catch (error) {
      const apiError = error as { status?: number; message?: string };
      setPatient(null);
      setAppointments([]);
      setRecords([]);
      setPrescriptions([]);
      setProviders([]);
      setCurrentProviderName("");
      setLoadError(apiError.status === 404 ? null : apiError.message || "Unable to load patient profile.");
    } finally {
      setLoading(false);
      setProvidersLoading(false);
    }
  }, [patientId]);

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
    const timeout = window.setTimeout(() => {
      void loadPatientData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPatientData]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPredictiveCare(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPredictiveCare]);

  // Auto-refresh predictive care whenever user enters the tab.
  useEffect(() => {
    if (tab !== "Predictive Care") return;
    const timer = setTimeout(() => {
      void loadPredictiveCare(false);
    }, 0);
    return () => clearTimeout(timer);
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

  if (loading) return <PatientPageSkeleton activeTab={tab} />;
  if (loadError) {
    return (
      <div className="space-y-6 pb-8">
        <div className="text-sm text-slate-500">Dashboard &gt; Patients &gt; Patient Profile</div>
        <WorkspaceCard className="p-6">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unable to load patient profile</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-500">{loadError}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => void loadPatientData()}
                className="inline-flex items-center rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          </div>
        </WorkspaceCard>
      </div>
    );
  }
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

      <WorkspaceCard className="overflow-hidden px-6 pt-3">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-6 border-b border-[#E5E7EB]">
          {patientTabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative shrink-0 whitespace-nowrap px-1 py-4 text-sm font-medium transition-colors ${tab === item ? "text-[var(--accent-sage)]" : "text-slate-500"}`}
            >
              {item}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent-sage)] transition-opacity duration-150 ${tab === item ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </div>
        </div>
      </WorkspaceCard>

      {tab === "Overview" ? (
          <div className={`${tabPanelShellClassName} grid gap-6 lg:grid-cols-[2fr_1fr]`}>
          <div className="space-y-6">
          <WorkspaceCard className="self-start p-6">
              <SectionHeader title="Personal Info" action={<button className="text-sm text-[var(--accent-sage)] hover:underline">Edit</button>} />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <QuickLine label="Date of Birth" value={display.date_of_birth ? new Date(display.date_of_birth).toLocaleDateString() : "-"} />
                <QuickLine label="Phone" value={display.contact_number || "-"} />
                <QuickLine label="Email" value={display.email_address || "-"} />
                <QuickLine label="Address" value={display.address || "-"} />
                <QuickLine label="Emergency Contact" value={display.emergency_contact_name || display.emergency_contact_phone || "-"} />
                <QuickLine label="Age / Gender" value={`${display.age || "-"} / ${display.gender || "-"}`} />
                <QuickLine label="Smoking" value={display.lifestyle?.smoking ? "Yes" : "No"} />
                <QuickLine label="Alcohol" value={display.lifestyle?.alcohol ? "Yes" : "No"} />
                <QuickLine label="Diet" value={display.lifestyle?.diet || "-"} />
                <QuickLine label="Physical Activity" value={display.lifestyle?.physical_activity || "-"} />
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
                      <tr
                        key={visit.id}
                        className="cursor-pointer border-t border-[#F3F4F6] text-sm text-slate-600 transition-colors hover:bg-[#FAFBFC]"
                        onClick={() => setDetailModal({ kind: "record", item: visit })}
                      >
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
            <div className={tabPanelShellClassName}>
            <WorkspaceCard className="h-full min-w-0 p-6">
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
                    <tr
                      key={item.id}
                      className="cursor-pointer border-t border-[#F3F4F6] text-sm text-slate-600 transition-colors hover:bg-[#FAFBFC]"
                      onClick={() => setDetailModal({ kind: "appointment", item })}
                    >
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
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setDetailModal({ kind: "record", item: record })}
                  className="relative w-full rounded-[12px] border border-[#F3F4F6] p-4 text-left transition-colors hover:bg-[#FAFBFC] lg:pr-72"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{record.recordType}</Badge>
                    <Badge tone="neutral">{record.conditionCategory}</Badge>
                    <span className="text-xs text-slate-400">{record.date || "-"}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{record.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{record.summary || "-"}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {prescriptions.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-8 text-center text-slate-500">
                  No prescriptions found.
                </div>
              ) : prescriptions.map((rx) => (
                <button
                  key={rx.id}
                  type="button"
                  onClick={() => setDetailModal({ kind: "prescription", item: rx })}
                  className="w-full rounded-[12px] border border-[#F3F4F6] p-4 text-left transition-colors hover:bg-[#FAFBFC]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{rx.medicationName || "Prescription"}</p>
                    <Badge tone="neutral">{rx.form || "-"}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Issued: {formatPrescriptionIssuedDate(rx.issuedDate)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 sm:justify-end lg:float-right lg:ml-6 lg:max-w-[18rem]">
                    <StatusBadge meta={paymentStatusMeta(rx.paymentStatus)} />
                    <StatusBadge meta={releaseStatusMeta(rx.releaseStatus)} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{rx.dosage || "-"} • {rx.directionsForUse || "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Start: {rx.startDate || "-"} • End: {rx.endDate || "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Qty: {rx.quantity} • Refills: {rx.refills}</p>
                </button>
              ))}
            </div>
          )}
        </WorkspaceCard>
        </div>
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
        providers={providers}
        providersLoading={providersLoading}
        providersError={providersError}
        onSubmit={async (record) => {
          try {
            const payload = {
              patient_id: patientId,
              patient_name: fullName,
              record_type: record.recordType,
              record_date: record.date,
              provider: record.provider,
              provider_id: record.providerId || undefined,
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
              provider: currentProviderName || "Prescribing clinician",
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
            const [prescriptionResp, invoiceResp] = await Promise.all([
              api.getPrescriptions({ patient_id: patientId, limit: 200 }),
              api.getPrescriptionInvoices({ patient_id: patientId, limit: 200 }),
            ]);
            const rxRows = extractRows(prescriptionResp as unknown, ["records", "results"]);
            const mappedPrescriptions = rxRows.map(api.mapHealthRecordToUiPrescription);
            setPrescriptions(mergePrescriptionStatuses(mappedPrescriptions, invoiceResp));
          } catch {
            pushToast({ type: "error", title: "Failed to create prescription", message: "Please try again." });
          }
        }}
      />
      {detailModal && mounted ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={() => setDetailModal(null)}>
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[18px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-white px-6 py-5">
              <div>
                <p className="text-sm text-slate-500">
                  {detailModal.kind === "appointment"
                    ? "Appointment Details"
                    : detailModal.kind === "record"
                      ? "Health Record Details"
                      : "Prescription Details"}
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  {detailModal.kind === "appointment"
                    ? detailModal.item.reason || `${detailModal.item.type} appointment`
                    : detailModal.kind === "record"
                      ? detailModal.item.title || detailModal.item.recordType
                      : detailModal.item.medicationName || "Prescription"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-[10px] border border-[#E5E7EB] p-2 text-slate-500 hover:bg-[#F8FAFC]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              {detailModal.kind === "appointment" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <QuickLine label="Date" value={detailModal.item.date || "-"} />
                    <QuickLine label="Time" value={detailModal.item.time || "-"} />
                    <QuickLine label="Type" value={detailModal.item.type || "-"} />
                    <QuickLine label="Status" value={detailModal.item.status || "-"} />
                    <QuickLine label="Priority" value={detailModal.item.priority || "-"} />
                    <QuickLine label="Duration" value={detailModal.item.duration || "-"} />
                    <QuickLine label="Email Reminder" value={detailModal.item.sendEmailReminder ? "Enabled" : "Disabled"} />
                    <QuickLine label="SMS Reminder" value={detailModal.item.sendSmsReminder ? "Enabled" : "Disabled"} />
                  </div>
                  <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                    <p className="text-sm font-medium text-slate-900">Reason</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{detailModal.item.reason || "No reason provided."}</p>
                  </div>
                  {detailModal.item.internalNotes ? (
                    <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                      <p className="text-sm font-medium text-slate-900">Internal Notes</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{detailModal.item.internalNotes}</p>
                    </div>
                  ) : null}
                  {detailModal.item.cancelReason ? (
                    <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
                      <p className="text-sm font-medium text-[#92400E]">Cancellation Reason</p>
                      <p className="mt-2 text-sm leading-6 text-[#92400E]">{detailModal.item.cancelReason}</p>
                    </div>
                  ) : null}
                </>
              ) : null}

              {detailModal.kind === "record" ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{detailModal.item.recordType}</Badge>
                    <Badge tone="neutral">{detailModal.item.conditionCategory}</Badge>
                    <Badge tone={detailModal.item.saveState === "draft" ? "amber" : "green"}>
                      {detailModal.item.saveState === "draft" ? "Draft" : "Final"}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <QuickLine label="Date" value={detailModal.item.date || "-"} />
                    <QuickLine label="Provider" value={detailModal.item.provider || "-"} />
                  </div>
                  <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                    <p className="text-sm font-medium text-slate-900">Summary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{detailModal.item.summary || "No summary available."}</p>
                  </div>
                  {getRecordDetailEntries(detailModal.item.details).length > 0 ? (
                    <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                      <p className="text-sm font-medium text-slate-900">Structured Details</p>
                      <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
                        {getRecordDetailEntries(detailModal.item.details).map(([key, value]) => (
                          <div key={key} className="border-b border-[#F1F5F9] pb-3 last:border-b-0">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDetailLabel(key)}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{formatDetailValue(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {detailModal.kind === "prescription" ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge meta={paymentStatusMeta(detailModal.item.paymentStatus)} />
                    <StatusBadge meta={releaseStatusMeta(detailModal.item.releaseStatus)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <QuickLine label="Provider" value={detailModal.item.provider || "-"} />
                    <QuickLine label="Date Issued" value={formatPrescriptionIssuedDate(detailModal.item.issuedDate)} />
                    <QuickLine label="Dosage" value={detailModal.item.dosage || "-"} />
                    <QuickLine label="Start Date" value={detailModal.item.startDate || "-"} />
                    <QuickLine label="End Date" value={detailModal.item.endDate || "-"} />
                    <QuickLine label="Quantity" value={`${detailModal.item.quantity || 0}`} />
                    <QuickLine label="Refills" value={`${detailModal.item.refills || 0}`} />
                  </div>
                  <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                    <p className="text-sm font-medium text-slate-900">Directions for Use</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{detailModal.item.directionsForUse || "No directions provided."}</p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5E7EB] p-4">
                    <p className="text-sm font-medium text-slate-900">Medicines</p>
                    <div className="mt-3 space-y-3">
                      {detailModal.item.medicines.length === 0 ? (
                        <p className="text-sm text-slate-500">No medicines listed.</p>
                      ) : detailModal.item.medicines.map((medicine) => (
                        <div key={medicine.medicineId} className="rounded-[12px] bg-[#F8FAFC] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium text-slate-900">{medicine.medicineName}</p>
                            <Badge tone="neutral">{medicine.status || "Unknown"}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{medicine.prescribedDosage} • Qty {medicine.prescribedQuantity}</p>
                          <p className="mt-1 text-xs text-slate-500">Unit Price: {medicine.unitPrice} • Total: {medicine.totalPrice}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
