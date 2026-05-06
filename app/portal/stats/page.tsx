"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  HeartPulse,
  Pill,
  Sparkles,
  TestTubeDiagonal,
  TrendingUp,
  Weight,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge, EmptyState, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import {
  getMyAppointments,
  getMyHealthRecords,
  getMyPredictiveAdherence,
  getMyPredictiveAlertTimeline,
  getMyPredictiveLabForecast,
  getMyPredictiveLabTrends,
  getMyPredictiveProfile,
  getMyPredictiveRiskRadar,
  type PatientAdherenceRow,
  type PatientAlertTimelineEvent,
  type PatientLabForecast,
  type PatientLabTrend,
  type PatientPredictiveProfile,
  type PatientRiskRadar,
} from "../../../lib/patient-api";
import { getSessionClaims } from "../../../lib/session";

type Appointment = Record<string, unknown>;
type RecordItem = Record<string, unknown>;
type Tone = "neutral" | "sage" | "blue" | "amber" | "red" | "green";

type SeriesPoint = {
  dateKey: string;
  label: string;
  systolic?: number;
  diastolic?: number;
  weight?: number;
  bmi?: number;
  value?: number;
  status?: string;
};

type MedicationInsight = {
  id: string;
  name: string;
  dosage: string;
  directions: string;
  startDate: string;
  endDate: string;
  active: boolean;
  daysUntilEnd: number | null;
  adherence?: PatientAdherenceRow;
};

type PredictionState = {
  profile: PatientPredictiveProfile | null;
  labTrends: PatientLabTrend[];
  labForecast: PatientLabForecast | null;
  adherence: PatientAdherenceRow[];
  radar: PatientRiskRadar | null;
  timeline: PatientAlertTimelineEvent[];
  disclaimer: string;
  loaded: boolean;
};

const initialPredictions: PredictionState = {
  profile: null,
  labTrends: [],
  labForecast: null,
  adherence: [],
  radar: null,
  timeline: [],
  disclaimer: "",
  loaded: false,
};

const chartStroke = "#6B9080";
const chartBlue = "#7A9CC6";
const chartAmber = "#D4A373";

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const toText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
};

const getFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return "";
};

const getFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const parseDate = (value?: string | null) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const formatDate = (value?: string | null) => {
  const parsed = parseDate(value);
  if (!parsed) return "Not listed";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatChartDate = (value?: string | null, fallback = "") => {
  const parsed = parseDate(value);
  if (!parsed) return fallback || "N/A";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dateKey = (value?: string | null, fallbackIndex = 0) => {
  const parsed = parseDate(value);
  if (!parsed) return `unknown-${fallbackIndex}`;
  return parsed.toISOString().slice(0, 10);
};

const daysUntil = (value?: string | null) => {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000);
};

const riskTone = (level?: string): Tone => {
  if (level === "Critical" || level === "High") return "red";
  if (level === "Moderate") return "amber";
  if (level === "Low") return "sage";
  return "blue";
};

const friendlyRiskLabel = (level?: string) => {
  if (level === "Critical" || level === "High") return "Follow-up recommended";
  if (level === "Moderate") return "Worth monitoring";
  if (level === "Low") return "Looks stable";
  return "No prediction yet";
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const recordDateValue = (record: RecordItem) =>
  String(record.record_date || record.dateIso || record.date || "");

const recordSortAsc = (left: RecordItem, right: RecordItem) =>
  (parseDate(recordDateValue(left))?.getTime() || 0) - (parseDate(recordDateValue(right))?.getTime() || 0);

const recordSortDesc = (left: RecordItem, right: RecordItem) => recordSortAsc(right, left);

const bpAssessment = (systolic?: number, diastolic?: number) => {
  if (typeof systolic !== "number" || typeof diastolic !== "number") return { label: "No reading", tone: "neutral" as Tone };
  if (systolic >= 140 || diastolic >= 90) return { label: "Needs attention", tone: "red" as Tone };
  if (systolic >= 130 || diastolic >= 80) return { label: "Monitor", tone: "amber" as Tone };
  return { label: "In a calmer range", tone: "sage" as Tone };
};

const bmiFrom = (weightRaw?: number, heightRaw?: number) => {
  if (!weightRaw || !heightRaw) return undefined;
  const weightKg = weightRaw > 180 ? weightRaw * 0.453592 : weightRaw;
  const heightMeters = heightRaw > 100 ? heightRaw / 100 : heightRaw > 3 ? heightRaw * 0.0254 : heightRaw;
  if (heightMeters <= 0 || weightKg <= 0) return undefined;
  const bmi = weightKg / (heightMeters * heightMeters);
  return bmi >= 10 && bmi <= 80 ? Number(bmi.toFixed(1)) : undefined;
};

const shortTrendText = (points: SeriesPoint[], key: "value" | "weight" | "bmi" | "systolic") => {
  const values = points.map((point) => point[key]).filter((value): value is number => typeof value === "number");
  if (values.length < 2) return "More readings needed";
  const diff = values[values.length - 1] - values[0];
  if (Math.abs(diff) < 1) return "Mostly steady";
  return diff > 0 ? "Trending upward" : "Trending downward";
};

function SimpleLineChart({
  data,
  lines,
  empty,
}: {
  data: SeriesPoint[];
  lines: { key: keyof SeriesPoint; name: string; color: string }[];
  empty: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-6 text-center text-sm leading-6 text-slate-500">
        {empty}
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 18, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <Tooltip />
          {lines.map((line) => (
            <Line
              key={String(line.key)}
              type="monotone"
              dataKey={line.key as string}
              name={line.name}
              stroke={line.color}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 1, fill: "#FFFFFF" }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: typeof HeartPulse;
  label: string;
  value: string;
  helper: string;
  tone?: Tone;
}) {
  return (
    <WorkspaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </WorkspaceCard>
  );
}

function ActionRow({
  title,
  description,
  href,
  tone = "sage",
}: {
  title: string;
  description: string;
  href?: string;
  tone?: Tone;
}) {
  const content = (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-white p-4 transition-colors hover:bg-[#FAFBFC]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{tone === "red" ? "Soon" : tone === "amber" ? "Monitor" : "Recommended"}</Badge>
          <p className="font-medium text-slate-900">{title}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {href ? <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} /> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function MedicationCard({ item }: { item: MedicationInsight }) {
  const adherenceTone: Tone =
    item.adherence?.status === "Non-adherent" ? "red" : item.adherence?.status === "Partial" ? "amber" : item.adherence ? "sage" : "neutral";
  const endTone: Tone = item.daysUntilEnd != null && item.daysUntilEnd <= 7 ? "red" : item.daysUntilEnd != null && item.daysUntilEnd <= 30 ? "amber" : "sage";

  return (
    <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{item.name}</p>
          <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
            {[item.dosage, item.directions].filter(Boolean).join(" - ") || "Prescription details available in your records."}
          </p>
        </div>
        <Badge tone={item.active ? "sage" : "neutral"}>{item.active ? "Active" : "Past"}</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[14px] bg-[#FAFBFC] p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Medication window</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {item.endDate ? `Until ${formatDate(item.endDate)}` : "No end date listed"}
          </p>
          {item.daysUntilEnd != null && item.active ? (
            <div className="mt-2">
              <Badge tone={endTone}>{item.daysUntilEnd <= 0 ? "Ends today" : `${item.daysUntilEnd} day${item.daysUntilEnd === 1 ? "" : "s"} left`}</Badge>
            </div>
          ) : null}
        </div>
        <div className="rounded-[14px] bg-[#FAFBFC] p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Medication routine</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {item.adherence?.status || "No adherence signal yet"}
          </p>
          {typeof item.adherence?.score === "number" ? (
            <div className="mt-2">
              <Badge tone={adherenceTone}>{Math.round(item.adherence.score)}% routine score</Badge>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PatientStatsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [predictions, setPredictions] = useState<PredictionState>(initialPredictions);
  const [nowTs] = useState(() => Date.now());
  const claims = getSessionClaims();
  const patientId = String(claims?.patient_id || "");
  const isUnlinked = !patientId;

  useEffect(() => {
    (async () => {
      if (isUnlinked) {
        setLoading(false);
        setPredictions((current) => ({ ...current, loaded: true }));
        return;
      }

      try {
        setError("");
        const [appointmentResp, recordResp] = await Promise.all([
          getMyAppointments({ limit: 200 }),
          getMyHealthRecords({ limit: 250 }),
        ]);
        setAppointments(Array.isArray(appointmentResp?.appointments) ? appointmentResp.appointments : []);
        setRecords(Array.isArray(recordResp?.records) ? recordResp.records : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your health insights right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnlinked]);

  useEffect(() => {
    (async () => {
      if (!patientId) return;

      const [profileResp, trendsResp, adherenceResp, radarResp, timelineResp] = await Promise.allSettled([
        getMyPredictiveProfile(patientId),
        getMyPredictiveLabTrends(patientId),
        getMyPredictiveAdherence(patientId),
        getMyPredictiveRiskRadar(patientId),
        getMyPredictiveAlertTimeline(patientId),
      ]);

      const labTrends = trendsResp.status === "fulfilled" && Array.isArray(trendsResp.value?.trends) ? trendsResp.value.trends : [];
      const forecastSource = labTrends.find((trend) => {
        const numeric = (trend.chart_data || []).filter((point) => typeof point.value === "number");
        return trend.test_name && numeric.length >= 3;
      });

      let labForecast: PatientLabForecast | null = null;
      if (forecastSource?.test_name) {
        const lastValues = (forecastSource.chart_data || [])
          .map((point) => point.value)
          .filter((value): value is number => typeof value === "number")
          .slice(-5);
        labForecast = await getMyPredictiveLabForecast(patientId, forecastSource.test_name, lastValues).catch(() => null);
      }

      setPredictions({
        profile: profileResp.status === "fulfilled" ? profileResp.value?.profile || null : null,
        disclaimer: profileResp.status === "fulfilled" ? profileResp.value?.predictive_care_disclaimer || "" : "",
        labTrends,
        labForecast,
        adherence: adherenceResp.status === "fulfilled" && Array.isArray(adherenceResp.value?.adherence) ? adherenceResp.value.adherence : [],
        radar: radarResp.status === "fulfilled" ? radarResp.value || null : null,
        timeline: timelineResp.status === "fulfilled" && Array.isArray(timelineResp.value?.timeline) ? timelineResp.value.timeline : [],
        loaded: true,
      });
    })();
  }, [patientId]);

  const sortedRecords = useMemo(() => [...records].sort(recordSortDesc), [records]);
  const visitRecords = useMemo(() => records.filter((record) => String(record.record_type || "") === "Visit").sort(recordSortAsc), [records]);
  const labRecords = useMemo(() => records.filter((record) => String(record.record_type || "") === "Lab Result").sort(recordSortAsc), [records]);
  const prescriptionRecords = useMemo(() => records.filter((record) => String(record.record_type || "") === "Prescription").sort(recordSortDesc), [records]);

  const bpSeries = useMemo<SeriesPoint[]>(() =>
    visitRecords
      .flatMap((record, index) => {
        const details = toRecord(record.details);
        const systolic = getFirstNumber(details.visitBpSystolic);
        const diastolic = getFirstNumber(details.visitBpDiastolic);
        if (typeof systolic !== "number" || typeof diastolic !== "number") return [];
        const date = recordDateValue(record);
        return [{ dateKey: dateKey(date, index), label: formatChartDate(date, `${index + 1}`), systolic, diastolic }];
      })
      .slice(-8),
  [visitRecords]);

  const weightSeries = useMemo<SeriesPoint[]>(() =>
    visitRecords
      .flatMap((record, index) => {
        const details = toRecord(record.details);
        const weight = getFirstNumber(details.visitWeight);
        if (typeof weight !== "number") return [];
        const bmi = bmiFrom(weight, getFirstNumber(details.visitHeight));
        const date = recordDateValue(record);
        return [{ dateKey: dateKey(date, index), label: formatChartDate(date, `${index + 1}`), weight, bmi }];
      })
      .slice(-8),
  [visitRecords]);

  const labTrend = useMemo(() => {
    const groups = new Map<string, SeriesPoint[]>();
    labRecords.forEach((record, index) => {
      const details = toRecord(record.details);
      const name = getFirstText(details.labTestName, record.title, "Lab result");
      const value = getFirstNumber(details.labResultNumeric, details.labResultValue);
      if (typeof value !== "number") return;
      const date = recordDateValue(record);
      const points = groups.get(name) || [];
      points.push({
        dateKey: dateKey(date, index),
        label: formatChartDate(date, `${points.length + 1}`),
        value,
        status: getFirstText(details.labStatus),
      });
      groups.set(name, points);
    });

    if (!groups.size) {
      const predictive = predictions.labTrends
        .filter((trend) => trend.test_name && trend.chart_data?.some((point) => typeof point.value === "number"))
        .sort((a, b) => (b.chart_data?.length || 0) - (a.chart_data?.length || 0))[0];
      return {
        name: predictive?.test_name || "",
        unit: "",
        points: (predictive?.chart_data || []).map((point, index) => ({
          dateKey: dateKey(point.date, index),
          label: formatChartDate(point.date, `${index + 1}`),
          value: point.value,
          status: point.status,
        })).filter((point) => typeof point.value === "number").slice(-8),
      };
    }

    const entries = [...groups.entries()].sort((left, right) => {
      const leftAbnormal = left[1].some((point) => point.status && point.status !== "Normal") ? 1 : 0;
      const rightAbnormal = right[1].some((point) => point.status && point.status !== "Normal") ? 1 : 0;
      const leftGlucose = left[0].toLowerCase().includes("glucose") ? 1 : 0;
      const rightGlucose = right[0].toLowerCase().includes("glucose") ? 1 : 0;
      return rightGlucose - leftGlucose || rightAbnormal - leftAbnormal || right[1].length - left[1].length;
    });

    const [name, points] = entries[0];
    const matchingRecord = labRecords.find((record) => getFirstText(toRecord(record.details).labTestName) === name);
    return {
      name,
      unit: getFirstText(toRecord(matchingRecord?.details).labUnit),
      points: points.slice(-8),
    };
  }, [labRecords, predictions.labTrends]);

  const latestBp = bpSeries.at(-1);
  const bpState = bpAssessment(latestBp?.systolic, latestBp?.diastolic);
  const latestWeight = weightSeries.at(-1);

  const abnormalLabs = useMemo(() =>
    [...labRecords]
      .reverse()
      .map((record) => {
        const details = toRecord(record.details);
        const status = getFirstText(details.labStatus);
        if (!status || status === "Normal") return null;
        return {
          id: String(record.record_id || record.id || `${recordDateValue(record)}-${details.labTestName}`),
          name: getFirstText(details.labTestName, record.title, "Lab result"),
          value: [getFirstText(details.labResultValue), getFirstText(details.labUnit)].filter(Boolean).join(" "),
          status,
          date: recordDateValue(record),
        };
      })
      .filter((item): item is { id: string; name: string; value: string; status: string; date: string } => Boolean(item))
      .slice(0, 5),
  [labRecords]);

  const adherenceByMedicine = useMemo(() => {
    const map = new Map<string, PatientAdherenceRow>();
    predictions.adherence.forEach((row) => {
      if (row.medicine) map.set(normalizeName(row.medicine), row);
    });
    return map;
  }, [predictions.adherence]);

  const medications = useMemo<MedicationInsight[]>(() => {
    const rows: MedicationInsight[] = [];
    prescriptionRecords.forEach((record, recordIndex) => {
      const details = toRecord(record.details);
      const medicines = toArray(details.medicines);
      const startDate = getFirstText(details.startDate, details.prescriptionStartDate, recordDateValue(record));
      const endDate = getFirstText(details.endDate, details.prescriptionEndDate);
      const directions = getFirstText(details.directionsForUse, details.prescriptionDirections, record.summary);

      if (medicines.length) {
        medicines.forEach((entry, index) => {
          const item = toRecord(entry);
          const name = getFirstText(item.medicineName, item.name);
          if (!name) return;
          const end = getFirstText(item.endDate, endDate);
          const remaining = daysUntil(end);
          rows.push({
            id: `${String(record.record_id || record.id || recordIndex)}-${index}`,
            name,
            dosage: getFirstText(item.prescribedDosage, item.dosage, details.dosage),
            directions,
            startDate,
            endDate: end,
            active: remaining == null || remaining >= 0,
            daysUntilEnd: remaining,
            adherence: adherenceByMedicine.get(normalizeName(name)),
          });
        });
        return;
      }

      const name = getFirstText(details.medicationName, details.prescriptionMedicationName, details.title);
      if (!name) return;
      const remaining = daysUntil(endDate);
      rows.push({
        id: String(record.record_id || record.id || `${name}-${recordIndex}`),
        name,
        dosage: getFirstText(details.dosage, details.prescriptionDosage),
        directions,
        startDate,
        endDate,
        active: remaining == null || remaining >= 0,
        daysUntilEnd: remaining,
        adherence: adherenceByMedicine.get(normalizeName(name)),
      });
    });

    return rows.sort((left, right) => Number(right.active) - Number(left.active) || (left.daysUntilEnd || 9999) - (right.daysUntilEnd || 9999)).slice(0, 6);
  }, [prescriptionRecords, adherenceByMedicine]);

  const upcomingAppointment = useMemo(() => {
    return appointments
      .map((item) => ({ item, when: parseDate(String(item.scheduled_at || item.date || "")) }))
      .filter(({ when, item }) => when && when.getTime() >= nowTs && String(item.status || "") !== "Cancelled")
      .sort((a, b) => (a.when?.getTime() || 0) - (b.when?.getTime() || 0))[0] || null;
  }, [appointments, nowTs]);

  const recurringConcerns = useMemo(() => {
    const counts = new Map<string, number>();
    visitRecords.forEach((record) => {
      const details = toRecord(record.details);
      const text = getFirstText(details.visitAssessment, details.chiefComplaint, record.summary);
      const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
      if (normalized.length < 4) return;
      counts.set(text, (counts.get(text) || 0) + 1);
    });
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));
  }, [visitRecords]);

  const conditionFocus = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      const category = String(record.condition_category || "");
      if (!category || category === "uncategorized") return;
      const label = category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => ({ label, count }));
  }, [records]);

  const riskLevel = predictions.profile?.overall_risk_level || predictions.radar?.overall_risk_level;
  const predictionAvailable = Boolean(predictions.profile || predictions.labTrends.length || predictions.adherence.length || predictions.timeline.length || predictions.radar);
  const criticalLabCount = abnormalLabs.filter((lab) => lab.status === "Critical").length;
  const activeMedicationCount = medications.filter((item) => item.active).length;

  const hero = useMemo(() => {
    if (!records.length) {
      return {
        title: "Your health insights will build over time",
        body: "Once your clinic adds visits, labs, or prescriptions, this page will turn them into simple trends and next steps.",
        tone: "blue" as Tone,
        badge: "Waiting for records",
      };
    }
    if (criticalLabCount || riskLevel === "Critical" || riskLevel === "High") {
      return {
        title: "A few items may need follow-up",
        body: "Some recent signals suggest it would be helpful to check in with your care team and review the items below.",
        tone: "red" as Tone,
        badge: "Follow-up suggested",
      };
    }
    if (abnormalLabs.length || riskLevel === "Moderate" || bpState.tone === "amber") {
      return {
        title: "You have a few things to monitor",
        body: "Your chart has useful signals to keep an eye on. The recommendations below focus on practical next steps.",
        tone: "amber" as Tone,
        badge: "Monitor",
      };
    }
    return {
      title: "Your recent chart looks steady",
      body: "Based on available records, there are no urgent insight flags on this dashboard right now.",
      tone: "sage" as Tone,
      badge: "Stable",
    };
  }, [records.length, criticalLabCount, riskLevel, abnormalLabs.length, bpState.tone]);

  const recommendedActions = useMemo(() => {
    const actions: { title: string; description: string; href?: string; tone?: Tone }[] = [];

    if (criticalLabCount) {
      actions.push({
        title: "Ask the clinic about your critical lab result",
        description: "A critical lab status should be reviewed with your care team so you know what it means for you.",
        href: "/portal/records",
        tone: "red",
      });
    }

    if (bpState.tone === "red" || bpState.tone === "amber") {
      actions.push({
        title: "Keep monitoring your blood pressure",
        description: "Bring recent readings to your next appointment, especially if readings stay above your usual range.",
        href: "/portal/appointments",
        tone: bpState.tone,
      });
    }

    const endingMedication = medications.find((item) => item.active && item.daysUntilEnd != null && item.daysUntilEnd <= 14);
    if (endingMedication) {
      actions.push({
        title: `Review ${endingMedication.name} before it ends`,
        description: "If you were told to continue this medication, check with the clinic before your supply or prescription window runs out.",
        href: "/portal/records",
        tone: endingMedication.daysUntilEnd != null && endingMedication.daysUntilEnd <= 7 ? "red" : "amber",
      });
    }

    if (!upcomingAppointment && (riskLevel === "High" || riskLevel === "Critical" || abnormalLabs.length > 0)) {
      actions.push({
        title: "Schedule a follow-up",
        description: "A follow-up can help turn these insights into a care plan you understand.",
        href: "/portal/appointments",
        tone: riskTone(riskLevel),
      });
    }

    if (predictions.adherence.some((item) => item.status === "Partial" || item.status === "Non-adherent")) {
      actions.push({
        title: "Review your medication routine",
        description: "The portal found a possible gap in your medication coverage. Ask the clinic if you need a refill or clearer instructions.",
        href: "/portal/records",
        tone: "amber",
      });
    }

    if (!actions.length) {
      actions.push({
        title: "Keep your routine care going",
        description: "Continue regular checkups and use this page to notice changes as new records are added.",
        href: "/portal/appointments",
        tone: "sage",
      });
    }

    return actions.slice(0, 5);
  }, [abnormalLabs.length, bpState.tone, criticalLabCount, medications, predictions.adherence, riskLevel, upcomingAppointment]);

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your health insights...</WorkspaceCard>;
  }

  if (isUnlinked) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="Health Insights" subtitle="Your chart has not been linked yet." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          Once the clinic links your patient chart, your health trends, medications, and prediction insights will appear here.
        </div>
      </WorkspaceCard>
    );
  }

  if (error) {
    return (
      <WorkspaceCard className="p-6">
        <div className="flex items-start gap-3 rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.04)] p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-medium">We could not load your health insights.</p>
            <p className="mt-1 text-red-600">{error}</p>
          </div>
        </div>
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <WorkspaceCard className="overflow-hidden">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(107,144,128,0.18),transparent_34%),linear-gradient(135deg,rgba(250,251,252,1),rgba(122,156,198,0.12))] p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={hero.tone}>{hero.badge}</Badge>
              <Badge tone="neutral">Patient-only view</Badge>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.36em] text-[var(--accent-sage)]">Your Health Snapshot</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">{hero.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{hero.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/portal/appointments" className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5">
                Book or review appointment
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              <Link href="/portal/records" className="inline-flex items-center gap-2 rounded-full border border-[#D9E4DE] bg-white px-4 py-2 text-sm font-medium text-[var(--accent-sage)] transition-colors hover:bg-[#F6FAF8]">
                Open records
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[18px] border border-white/70 bg-white/85 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Next appointment</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {upcomingAppointment?.when ? upcomingAppointment.when.toLocaleString() : "No upcoming appointment"}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/70 bg-white/85 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Latest record</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {sortedRecords[0] ? `${String(sortedRecords[0].record_type || "Record")} - ${formatDate(recordDateValue(sortedRecords[0]))}` : "No records yet"}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/70 bg-white/85 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Prediction status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {predictionAvailable ? friendlyRiskLabel(riskLevel) : predictions.loaded ? "No prediction insights yet" : "Checking prediction data"}
              </p>
            </div>
          </div>
        </div>
      </WorkspaceCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon={HeartPulse}
          label={bpState.label}
          tone={bpState.tone}
          value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "No BP yet"}
          helper={latestBp ? `Latest blood pressure from ${latestBp.label}. ${shortTrendText(bpSeries, "systolic")}.` : "Blood pressure trends appear after visit vitals are recorded."}
        />
        <InsightCard
          icon={Weight}
          label={latestWeight?.bmi ? "BMI available" : "Weight"}
          tone={latestWeight ? "sage" : "neutral"}
          value={latestWeight ? `${latestWeight.weight}${latestWeight.bmi ? ` / BMI ${latestWeight.bmi}` : ""}` : "No weight yet"}
          helper={latestWeight ? `Latest weight from ${latestWeight.label}. ${shortTrendText(weightSeries, "weight")}.` : "Weight and BMI trends appear when visit vitals include weight and height."}
        />
        <InsightCard
          icon={TestTubeDiagonal}
          label={criticalLabCount ? "Critical lab" : abnormalLabs.length ? "Needs review" : "Labs"}
          tone={criticalLabCount ? "red" : abnormalLabs.length ? "amber" : labRecords.length ? "sage" : "neutral"}
          value={abnormalLabs.length ? `${abnormalLabs.length} abnormal` : labRecords.length ? "No abnormal labs" : "No labs yet"}
          helper={abnormalLabs[0] ? `${abnormalLabs[0].name} was marked ${abnormalLabs[0].status}.` : "Lab insights appear when the clinic adds lab results."}
        />
        <InsightCard
          icon={Pill}
          label={activeMedicationCount ? "Active" : "Medications"}
          tone={activeMedicationCount ? "sage" : medications.length ? "neutral" : "blue"}
          value={activeMedicationCount ? `${activeMedicationCount} active` : medications.length ? `${medications.length} past` : "No prescriptions"}
          helper={activeMedicationCount ? "Review active prescriptions and timing below." : "Prescription insights appear when medication records are added."}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Vitals & Lab Trends" subtitle="Simple trends from your own visit vitals and lab records." />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Blood pressure</p>
                  <p className="text-sm text-slate-500">Systolic and diastolic readings over time.</p>
                </div>
                <Badge tone={bpState.tone}>{shortTrendText(bpSeries, "systolic")}</Badge>
              </div>
              <SimpleLineChart
                data={bpSeries}
                empty="No blood pressure readings are available yet."
                lines={[
                  { key: "systolic", name: "Systolic", color: chartStroke },
                  { key: "diastolic", name: "Diastolic", color: chartBlue },
                ]}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Weight and BMI</p>
                  <p className="text-sm text-slate-500">Weight trend with BMI when height is recorded.</p>
                </div>
                <Badge tone={latestWeight ? "sage" : "neutral"}>{shortTrendText(weightSeries, "weight")}</Badge>
              </div>
              <SimpleLineChart
                data={weightSeries}
                empty="No weight readings are available yet."
                lines={[
                  { key: "weight", name: "Weight", color: chartAmber },
                  { key: "bmi", name: "BMI", color: chartBlue },
                ]}
              />
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{labTrend.name ? `${labTrend.name} trend` : "Lab trend"}</p>
                <p className="text-sm text-slate-500">
                  {labTrend.unit ? `Values shown in ${labTrend.unit}.` : "A focused view of the most useful available lab series."}
                </p>
              </div>
              <Badge tone={labTrend.points.some((point) => point.status && point.status !== "Normal") ? "amber" : labTrend.points.length ? "sage" : "neutral"}>
                {shortTrendText(labTrend.points, "value")}
              </Badge>
            </div>
            <SimpleLineChart
              data={labTrend.points}
              empty="No numeric lab trend is available yet."
              lines={[{ key: "value", name: labTrend.name || "Lab value", color: chartStroke }]}
            />
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Areas To Watch" subtitle="Plain-language flags from recent records and available predictions." />
          <div className="mt-6 space-y-4">
            <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--accent-sage)]">
                  <Sparkles className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">Overall health signal</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {predictionAvailable
                      ? `${friendlyRiskLabel(riskLevel)} based on available prediction signals and recent records.`
                      : "No prediction signal has been computed yet, so this page is using your records only."}
                  </p>
                </div>
              </div>
            </div>

            {abnormalLabs.length ? (
              <div className="space-y-3">
                {abnormalLabs.map((lab) => (
                  <div key={lab.id} className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{lab.name}</p>
                      <Badge tone={lab.status === "Critical" ? "red" : "amber"}>{lab.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {[lab.value, formatDate(lab.date)].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-4 text-sm leading-6 text-slate-500">
                No abnormal lab history is shown in the records currently available to this portal.
              </div>
            )}

            {recurringConcerns.length || conditionFocus.length ? (
              <div className="grid gap-3">
                {[...recurringConcerns.map((item) => ({ label: item.label, helper: `${item.count} similar visit notes` })), ...conditionFocus.map((item) => ({ label: item.label, helper: `${item.count} related record${item.count === 1 ? "" : "s"}` }))].slice(0, 4).map((item) => (
                  <div key={`${item.label}-${item.helper}`} className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                    <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </WorkspaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Medication Insights" subtitle="Active prescriptions, timing, and medication-routine signals when available." />
          <div className="mt-6 space-y-4">
            {medications.length ? (
              medications.map((item) => <MedicationCard key={item.id} item={item} />)
            ) : (
              <EmptyState
                icon={Pill}
                title="No prescription insights yet"
                description="When prescriptions are added to your records, active medications and refill timing will appear here."
              />
            )}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Prediction Insights" subtitle="Shown only when prediction records exist for your chart." />
          <div className="mt-6 space-y-4">
            {predictionAvailable ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Follow-up priority",
                      value: friendlyRiskLabel(riskLevel),
                      tone: riskTone(riskLevel),
                      helper: typeof predictions.profile?.overall_risk_score === "number" ? `${Math.round(predictions.profile.overall_risk_score)}/100 signal` : "Based on available risk signals",
                    },
                    {
                      label: "Medication routine",
                      value: predictions.profile?.has_adherence_gaps ? "Possible gap" : predictions.adherence.length ? "No major gap" : "No signal yet",
                      tone: predictions.profile?.has_adherence_gaps ? "amber" as Tone : predictions.adherence.length ? "sage" as Tone : "neutral" as Tone,
                      helper: predictions.adherence[0]?.medicine ? `Latest: ${predictions.adherence[0].medicine}` : "Uses prescription and refill history",
                    },
                    {
                      label: "Missed-visit risk",
                      value: typeof predictions.profile?.no_show_risk === "number" ? `${Math.round(predictions.profile.no_show_risk)}%` : "No signal yet",
                      tone: typeof predictions.profile?.no_show_risk === "number" && predictions.profile.no_show_risk >= 50 ? "amber" as Tone : "sage" as Tone,
                      helper: "Helps decide if reminders may help",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                      <Badge tone={item.tone}>{item.label}</Badge>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{item.value}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.helper}</p>
                    </div>
                  ))}
                </div>

                {predictions.labForecast && typeof predictions.labForecast.predicted_value === "number" ? (
                  <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-sage)]" strokeWidth={1.75} />
                      <div>
                        <p className="font-medium text-slate-900">Forecast for {predictions.labForecast.test_name || "selected lab"}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          The next estimated value is {predictions.labForecast.predicted_value.toFixed(2)}
                          {predictions.labForecast.trend ? ` and the trend is ${predictions.labForecast.trend.toLowerCase()}` : ""}.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {predictions.timeline.length ? (
                  <div className="space-y-3">
                    {predictions.timeline.slice(0, 3).map((event, index) => (
                      <div key={`${event.title}-${event.date}-${index}`} className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{event.title || "Care signal"}</p>
                          <Badge tone={event.severity === "Critical" ? "red" : event.severity === "Warning" ? "amber" : "blue"}>{event.severity || "Info"}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(event.date)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[16px] border border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm leading-6 text-slate-500">
                  Predictions support care planning and are not a diagnosis. Ask your care team what any insight means for you.
                </div>
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No prediction insights available yet"
                description="When your care team computes prediction data, simplified follow-up, medication, and trend insights will appear here."
              />
            )}
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard className="p-6">
        <SectionHeader title="Recommended Actions" subtitle="Practical next steps based on your records and available prediction signals." />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {recommendedActions.map((action) => (
            <ActionRow key={action.title} {...action} />
          ))}
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="p-5">
        <div className="flex flex-col gap-3 text-sm leading-6 text-slate-500 sm:flex-row sm:items-start">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-sage)]" strokeWidth={1.75} />
          <p>
            This dashboard is written for patients. It summarizes your own records in plain language and avoids staff-only operational analytics.
            Always contact your clinic for medical advice, urgent symptoms, or questions about a result.
          </p>
        </div>
      </WorkspaceCard>
    </div>
  );
}
