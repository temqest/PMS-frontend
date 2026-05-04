"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge, SectionHeader, WorkspaceCard } from "../workspace-ui";
import type { PredictiveCareLabForecast, PredictiveCareLabTrend, PredictiveCareProfile } from "../../../lib/api";

type PredictiveCarePanelProps = {
  profile: PredictiveCareProfile | null;
  labTrends: PredictiveCareLabTrend[];
  labForecast: PredictiveCareLabForecast | null;
  loading: boolean;
  onRefresh: () => void;
  onRecompute: () => void;
  recomputing?: boolean;
  fetchedAt?: string | null;
  error?: string | null;
};

type FeatureRow = {
  feature: string;
  importance: number;
  currentValue: string;
  severity: "high" | "medium" | "low";
};

type Recommendation = {
  trigger: string;
  action: string;
  urgency: "Urgent" | "Routine" | "Preventive";
  impact: number;
};

type TimelineEvent = {
  label: string;
  source: string;
  dateText: string;
  tone: "red" | "amber" | "sage" | "blue";
};

type ExtendedProfile = PredictiveCareProfile & {
  risk_delta_7d?: number;
  readmission_risk_30d?: number;
  readmission_risk_90d?: number;
  readmission_benchmark_30d?: number;
  readmission_benchmark_90d?: number;
  ml_confidence?: number;
  anomaly_trigger?: string;
  anomaly_series?: string;
  anomaly_details?: string;
  last_hospitalization_date?: string;
  last_medication_change?: string;
  hba1c_current?: number;
};

type TrendRow = {
  label: string;
  dateKey: string;
  primary?: number;
  comparison?: number;
  forecastLow?: number;
  forecastMid?: number;
  forecastHigh?: number;
  annotation?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pending = (source: string) => `Pending data from ${source}`;

const formatDate = (value?: string | null) => {
  if (!value) return pending("the profile timestamp");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return pending("the profile timestamp");
  return parsed.toLocaleString();
};

const riskLevelFromScore = (score?: number) => {
  if (typeof score !== "number") return "Pending";
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Low";
};

const riskTone = (level?: string) => {
  if (level === "Critical" || level === "High") return "red";
  if (level === "Moderate") return "amber";
  if (level === "Low") return "sage";
  return "blue";
};

const toneToColor = (tone: "red" | "amber" | "sage" | "blue") => {
  if (tone === "red") return "#C45B5B";
  if (tone === "amber") return "#D4A373";
  if (tone === "sage") return "#6B9080";
  return "#7A9CC6";
};

const readableFeature = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const featureSeverity = (weight: number): "high" | "medium" | "low" => {
  if (weight >= 0.7) return "high";
  if (weight >= 0.4) return "medium";
  return "low";
};

const featureCurrentValue = (feature: string, primaryTrend?: PredictiveCareLabTrend | null) => {
  const normalized = feature.toLowerCase();
  if (normalized.includes("hba1c") || normalized.includes("a1c") || normalized.includes("glucose")) {
    const latest = primaryTrend?.chart_data?.filter((point) => typeof point.value === "number").at(-1)?.value;
    return typeof latest === "number" ? `${latest.toFixed(1)} from latest lab draw` : pending("lab result history");
  }
  if (normalized.includes("miss") || normalized.includes("show") || normalized.includes("appointment")) {
    return pending("appointment history");
  }
  if (normalized.includes("adherence") || normalized.includes("refill") || normalized.includes("medication")) {
    return pending("adherence records");
  }
  if (normalized.includes("hospital") || normalized.includes("admit") || normalized.includes("readmission")) {
    return pending("encounter history");
  }
  if (normalized.includes("anomaly") || normalized.includes("outlier")) {
    return pending("vitals and lab series");
  }
  return pending("the feature store");
};

const explainRisk = (level: string, factors: FeatureRow[]) => {
  const names = factors.slice(0, 3).map((factor) => factor.feature.toLowerCase());
  const readable = names.length
    ? names
        .map((name) => {
          if (name.includes("hba1c") || name.includes("glucose")) return "glycemic control is drifting";
          if (name.includes("appointment") || name.includes("miss")) return "missed-visit risk is elevated";
          if (name.includes("adherence") || name.includes("medication") || name.includes("refill")) return "medication adherence is weak";
          if (name.includes("hospital") || name.includes("readmission")) return "recent utilization suggests higher relapse risk";
          return readableFeature(name);
        })
        .join(", ")
    : "the ML service has not returned feature importances yet";

  if (level === "Critical") return `Critical because ${readable}.`;
  if (level === "High") return `High because ${readable}.`;
  if (level === "Moderate") return `Moderate because ${readable}.`;
  return `Low because the strongest available signals are currently stable.`;
};

function InfoBadge({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE5E1] bg-white text-slate-500 shadow-sm"
      aria-label={text}
    >
      <Info className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

function MiniSparkline({ points, stroke = "#6B9080" }: { points: number[]; stroke?: string }) {
  const width = 160;
  const height = 44;
  const padding = 4;

  if (!points.length) {
    return <div className="flex h-11 items-center text-xs text-slate-400">{pending("series history")}</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = padding + ((width - padding * 2) * index) / Math.max(points.length - 1, 1);
      const y = height - padding - ((point - min) / spread) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiskGaugeBar({ score }: { score: number }) {
  const level = riskLevelFromScore(score);
  const segments = [
    { label: "Low", from: 0, to: 25, color: "#6B9080" },
    { label: "Moderate", from: 25, to: 50, color: "#D4A373" },
    { label: "High", from: 50, to: 75, color: "#ED7D6B" },
    { label: "Critical", from: 75, to: 100, color: "#C45B5B" },
  ];

  return (
    <div>
      <div className="relative mt-3 h-5 overflow-hidden rounded-full border border-[#E5E7EB] bg-[#EEF2F1]">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="absolute top-0 h-full"
            style={{
              left: `${segment.from}%`,
              width: `${segment.to - segment.from}%`,
              background: segment.color,
              opacity: 0.92,
            }}
            title={segment.label}
          />
        ))}
        <div
          className="absolute top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-slate-900 shadow-sm"
          style={{ left: `calc(${clamp(score, 0, 100)}% - 2px)` }}
          title={`${score}`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-400">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Critical</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={riskTone(level)}>{level}</Badge>
        <span className="text-sm text-slate-600">{score}/100</span>
      </div>
    </div>
  );
}

function HorizonGauge({ score, level }: { score: number; level: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamp(score, 0, 100) / 100) * circumference;
  const color = toneToColor(riskTone(level));

  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-[#E5E7EB] bg-white p-4">
      <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold">
          {Math.round(score)}%
        </text>
        <text x="60" y="76" textAnchor="middle" className="fill-slate-500 text-[10px] uppercase tracking-[0.28em]">
          {level}
        </text>
      </svg>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">Readmission risk</p>
        <p className="text-sm text-slate-500">Higher values suggest a closer follow-up window and tighter discharge planning.</p>
      </div>
    </div>
  );
}

function TrendExplorerChart({ rows, overlayEnabled }: { rows: TrendRow[]; overlayEnabled: boolean }) {
  const values = rows.flatMap((row) => [row.primary, row.comparison, row.forecastLow, row.forecastHigh]).filter((value): value is number => typeof value === "number");
  if (!rows.length || !values.length) {
    return <div className="flex h-[340px] items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] text-sm text-slate-500">{pending("lab history and forecast data")}</div>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const bandOne = min + spread * 0.33;
  const bandTwo = min + spread * 0.66;

  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={rows} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="forecast-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(212,163,115,0.28)" />
            <stop offset="100%" stopColor="rgba(212,163,115,0.06)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E6ECE9" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} domain={[min - spread * 0.12, max + spread * 0.12]} />
        <Tooltip />
        <ReferenceArea y1={min - spread * 0.12} y2={bandOne} fill="rgba(107,144,128,0.08)" strokeOpacity={0} />
        <ReferenceArea y1={bandOne} y2={bandTwo} fill="rgba(212,163,115,0.12)" strokeOpacity={0} />
        <ReferenceArea y1={bandTwo} y2={max + spread * 0.12} fill="rgba(196,91,91,0.08)" strokeOpacity={0} />
        <Area type="monotone" dataKey="forecastLow" stackId="forecast" stroke="transparent" fill="transparent" isAnimationActive={false} />
        <Area type="monotone" dataKey="forecastHigh" stackId="forecast" stroke="transparent" fill="url(#forecast-band)" isAnimationActive={false} />
        <Line type="monotone" dataKey="primary" stroke="#6B9080" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        {overlayEnabled ? <Line type="monotone" dataKey="comparison" stroke="#7A9CC6" strokeWidth={2.5} strokeDasharray="7 5" dot={false} /> : null}
        <Line type="monotone" dataKey="forecastMid" stroke="#D4A373" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 3 }} />
        {rows
          .filter((row) => row.annotation)
          .map((row) =>
            typeof row.primary === "number" ? (
              <ReferenceDot
                key={`${row.label}-${row.annotation}`}
                x={row.label}
                y={row.primary}
                r={4}
                fill="#C45B5B"
                stroke="white"
                strokeWidth={1}
                label={{ value: row.annotation, position: "top", fill: "#64748B", fontSize: 11 }}
              />
            ) : null
          )}
        <Legend verticalAlign="bottom" height={28} formatter={(value) => <span className="text-slate-500">{String(value)}</span>} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutLegendItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-slate-700">{label}</span>
      </div>
      <span className="font-medium text-slate-900">{value} pts</span>
    </div>
  );
}

export default function PredictiveCarePanel({
  profile,
  labTrends,
  labForecast,
  loading,
  onRefresh,
  onRecompute,
  recomputing = false,
  fetchedAt,
  error,
}: PredictiveCarePanelProps) {
  const extendedProfile = profile as ExtendedProfile | null;
  const [readmissionHorizon, setReadmissionHorizon] = useState<30 | 90>(90);
  const [primaryTrendName, setPrimaryTrendName] = useState<string | null>(null);
  const [comparisonTrendName, setComparisonTrendName] = useState<string | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  const topFactors = useMemo<FeatureRow[]>(() => {
    const raw = (profile?.ml_top_risk_factors || [])
      .filter((item) => typeof item.importance === "number" && typeof item.feature === "string")
      .sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0))
      .slice(0, 7);

    return raw.map((item) => {
      const weight = clamp(Number(item.importance) || 0, 0, 1);
      const feature = readableFeature(String(item.feature || "Feature"));
      return {
        feature,
        importance: weight,
        currentValue: featureCurrentValue(feature, null),
        severity: featureSeverity(weight),
      };
    });
  }, [profile]);

  const trendOptions = useMemo(
    () =>
      [...labTrends]
        .filter((item) => typeof item.test_name === "string" && item.test_name.trim())
        .sort((a, b) => (b.chart_data?.length || 0) - (a.chart_data?.length || 0))
        .slice(0, 6),
    [labTrends]
  );

  const primaryTrend = useMemo(() => {
    if (primaryTrendName) {
      const matched = trendOptions.find((trend) => trend.test_name === primaryTrendName);
      if (matched) return matched;
    }
    return trendOptions[0] || null;
  }, [primaryTrendName, trendOptions]);

  const comparisonTrend = useMemo(() => {
    const options = trendOptions.filter((trend) => trend.test_name !== primaryTrend?.test_name);
    if (comparisonTrendName) {
      const matched = options.find((trend) => trend.test_name === comparisonTrendName);
      if (matched) return matched;
    }
    return options[0] || null;
  }, [comparisonTrendName, primaryTrend?.test_name, trendOptions]);

  const trendSeries = (() => {
    const map = new Map<string, TrendRow>();
    const addPoint = (trend: PredictiveCareLabTrend | null | undefined, field: "primary" | "comparison") => {
      if (!trend?.chart_data?.length) return;
      trend.chart_data.forEach((point, index) => {
        if (typeof point.value !== "number") return;
        const dateKey = point.date ? new Date(point.date).toISOString().slice(0, 10) : `${field}-${index}`;
        const existing = map.get(dateKey) || {
          label: point.date ? new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : `${index + 1}`,
          dateKey,
        };
        existing[field] = Number(point.value);
        if (field === "primary" && point.status && point.status !== "Normal") {
          existing.annotation = point.status;
        }
        map.set(dateKey, existing);
      });
    };

    addPoint(primaryTrend, "primary");
    if (overlayEnabled) addPoint(comparisonTrend, "comparison");

    const rows = [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const forecastValue = typeof labForecast?.predicted_value === "number" ? Number(labForecast.predicted_value) : null;
    if (forecastValue != null && rows.length > 0) {
      const trendDirection = (labForecast?.trend || primaryTrend?.trend_direction || "Stable").toLowerCase();
      const directionSign = trendDirection.includes("rise") || trendDirection.includes("worsen") ? 1 : trendDirection.includes("fall") || trendDirection.includes("improv") ? -1 : 0;
      const baseSpread = Math.max(forecastValue * 0.08, 1);
      rows.push(
        {
          label: "Forecast +7d",
          dateKey: `forecast-${rows.length + 1}`,
          forecastMid: forecastValue,
          forecastLow: Math.max(0, forecastValue - baseSpread * 1.2),
          forecastHigh: forecastValue + baseSpread * 1.2,
        },
        {
          label: "Forecast +14d",
          dateKey: `forecast-${rows.length + 2}`,
          forecastMid: clamp(forecastValue + directionSign * baseSpread, 0, 9999),
          forecastLow: Math.max(0, forecastValue + directionSign * baseSpread - baseSpread * 1.4),
          forecastHigh: forecastValue + directionSign * baseSpread + baseSpread * 1.4,
        }
      );
    }

    return rows;
  })();

  const readmission90 = clamp(extendedProfile?.readmission_risk_90d ?? (typeof profile?.ml_readmission_prob === "number" ? profile.ml_readmission_prob * 100 : 0), 0, 100);
  const readmission30 = clamp(extendedProfile?.readmission_risk_30d ?? Math.round(readmission90 * 0.68), 0, 100);
  const readmissionScore = readmissionHorizon === 30 ? readmission30 : readmission90;
  const readmissionBenchmark = readmissionHorizon === 30 ? extendedProfile?.readmission_benchmark_30d : extendedProfile?.readmission_benchmark_90d;

  const confidencePct =
    typeof extendedProfile?.ml_confidence === "number"
      ? clamp(extendedProfile.ml_confidence, 0, 100)
      : profile?.ml_chronic_confidence != null
        ? clamp(profile.ml_chronic_confidence * 100, 0, 100)
        : null;

  const anomalySeries =
    extendedProfile?.anomaly_trigger ||
    extendedProfile?.anomaly_series ||
    primaryTrend?.test_name ||
    pending("anomaly model inputs");

  const riskScore = clamp(profile?.overall_risk_score ?? 0, 0, 100);
  const riskLevel = profile?.overall_risk_level || riskLevelFromScore(riskScore);
  const riskDelta = typeof extendedProfile?.risk_delta_7d === "number" ? extendedProfile.risk_delta_7d : null;
  const riskFactorsSentence = explainRisk(riskLevel, topFactors);

  const riskBreakdown = [
    { name: "Chronic", value: clamp(profile?.chronic_disease_risk ?? 0, 0, 100), color: "#6B9080" },
    { name: "Readmission", value: clamp(readmissionScore, 0, 100), color: "#7A9CC6" },
    { name: "No-show", value: clamp(profile?.no_show_risk ?? 0, 0, 100), color: "#D4A373" },
    { name: "Adherence", value: clamp(profile?.adherence_risk ?? 0, 0, 100), color: "#C45B5B" },
  ];
  const dominantRisk = [...riskBreakdown].sort((a, b) => b.value - a.value)[0];
  const radarReference = riskBreakdown.map((item) => ({ name: item.name, value: Math.min(100, Math.round(item.value * 0.62 + 18)), fullMark: 100 }));

  const recommendations: Recommendation[] = (() => {
    const items: Recommendation[] = [];
    const topFeatureText = topFactors.map((factor) => factor.feature.toLowerCase()).join(" ");

    if (readmissionScore >= 60 || topFeatureText.includes("readmission") || topFeatureText.includes("hospital")) {
      items.push({
        trigger: `${readmissionHorizon}-day readmission risk is elevated`,
        action: "Schedule a follow-up visit within 7-14 days and review the discharge plan",
        urgency: "Urgent",
        impact: Math.round(readmissionScore * 0.12),
      });
    }

    if (topFeatureText.includes("hba1c") || topFeatureText.includes("glucose") || riskLevel === "High" || riskLevel === "Critical") {
      items.push({
        trigger: "Glycemic or chronic-risk features are contributing to the score",
        action: "Order HbA1c or lab follow-up within 14 days and verify medication escalation",
        urgency: "Urgent",
        impact: Math.round(Math.max(6, riskScore * 0.08)),
      });
    }

    if (topFeatureText.includes("adherence") || topFeatureText.includes("refill") || topFeatureText.includes("medication")) {
      items.push({
        trigger: "Medication adherence signals are weak",
        action: "Call the patient, reconcile medication list, and confirm refill access",
        urgency: "Routine",
        impact: 6,
      });
    }

    if (topFeatureText.includes("appointment") || (profile?.no_show_risk != null && profile.no_show_risk >= 35)) {
      items.push({
        trigger: "Missed-visit risk is present",
        action: "Send reminder outreach and check transportation or scheduling barriers",
        urgency: "Preventive",
        impact: 4,
      });
    }

    if (profile?.ml_is_anomaly) {
      items.unshift({
        trigger: anomalySeries,
        action: "Repeat the most recent abnormal lab or vital-sign series and review for charting artifacts",
        urgency: "Urgent",
        impact: 5,
      });
    }
    return items.slice(0, 4);
  })();

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const recentLabs = (primaryTrend?.chart_data || [])
      .filter((point) => point.date)
      .slice(-3)
      .map((point) => ({
        label: `${primaryTrend?.test_name || "Lab"} draw`,
        source: primaryTrend?.test_name || "Lab result",
        dateText: formatDate(point.date),
        tone: point.status === "Critical" ? "red" : point.status && point.status !== "Normal" ? "amber" : "sage",
      } as TimelineEvent));

    const pendingLabEvent: TimelineEvent = {
      label: pending("lab result history"),
      source: "Lab records",
      dateText: pending("lab result history"),
      tone: "blue",
    };

    const events: TimelineEvent[] = [
      ...(recentLabs.length ? recentLabs : [pendingLabEvent]),
      {
        label: "Predictive profile computed",
        source: "ML profile",
        dateText: formatDate(extendedProfile?.ml_computed_at),
        tone: "blue",
      },
      {
        label: profile?.ml_is_anomaly ? "Anomaly signal flagged" : "Anomaly signal reviewed",
        source: "Anomaly model",
        dateText: anomalySeries,
        tone: profile?.ml_is_anomaly ? "red" : "sage",
      },
      {
        label: pending("hospital encounter history"),
        source: "Encounters",
        dateText: pending("encounter history"),
        tone: "amber",
      },
      {
        label: pending("medication change history"),
        source: "Prescription records",
        dateText: pending("medication records"),
        tone: "amber",
      },
      {
        label: pending("no-show appointment history"),
        source: "Appointments",
        dateText: pending("appointment history"),
        tone: "amber",
      },
    ];

    return events.slice(0, 6);
  }, [anomalySeries, extendedProfile?.ml_computed_at, primaryTrend?.chart_data, primaryTrend?.test_name, profile?.ml_is_anomaly]);

  const isInitialLoading = loading && !profile;
  const hasError = Boolean(error && !profile);

  return (
    <div className="space-y-6">
      <WorkspaceCard className="overflow-hidden border-[#DCE5E1]">
        <div className="bg-[linear-gradient(135deg,rgba(107,144,128,0.12),rgba(122,156,198,0.08))] px-6 py-5">
          <SectionHeader
            title="Predictive care"
            subtitle={profile?.patient_name ? `Clinically oriented ML signals for ${profile.patient_name}` : "Patient-level ML signals, forecast points, and action cues"}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <InfoBadge text="What affects this score? The overall risk blends chronic disease, readmission, no-show, and adherence signals." />
                {fetchedAt ? <span className="text-xs text-slate-500">Data refreshed {new Date(fetchedAt).toLocaleString()}</span> : <span className="text-xs text-slate-500">{pending("dashboard refresh")}</span>}
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-[#FAFBFC] disabled:opacity-50"
                >
                  <Activity className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onRecompute}
                  disabled={recomputing || isInitialLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-sage)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${recomputing ? "animate-spin" : ""}`} strokeWidth={1.5} />
                  Recompute ML
                </button>
              </div>
            }
          />
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            This view explains the score in plain language, ties it back to the patient&apos;s lab and behavior signals, and highlights the next best action.
          </p>
        </div>

        {isInitialLoading ? (
          <div className="border-t border-[#E5E7EB] bg-blue-50/60 px-6 py-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-blue-900">Computing predictive profile...</p>
                <p className="mt-1 text-sm text-blue-700">This may take a few moments on first load. The system will auto-compute the latest ML signals for this patient.</p>
              </div>
            </div>
          </div>
        ) : hasError ? (
          <div className="border-t border-[#E5E7EB] bg-rose-50/60 px-6 py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-rose-900">Unable to load predictive profile</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
                <p className="mt-2 text-sm text-rose-600">Try recomputing the profile after confirming the patient has recent labs or visit history.</p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="border-t border-[#E5E7EB] bg-amber-50/60 px-6 py-4">
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        ) : null}

        {!isInitialLoading && !hasError ? (
          <div className="grid gap-5 border-t border-[#E5E7EB] p-6 xl:grid-cols-[1.2fr_0.8fr]">
            <WorkspaceCard className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-600">Overall risk</p>
                    <InfoBadge text="This combines the rule-based score with ML signals and is meant to guide urgency, not replace clinical judgment." />
                  </div>
                  <p className="text-4xl font-semibold tracking-tight text-slate-900">{riskScore}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={riskTone(riskLevel)}>{riskLevel}</Badge>
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Last computed {formatDate(extendedProfile?.ml_computed_at)}</span>
                  </div>
                </div>
                <div className="min-w-[280px] flex-1">
                  <RiskGaugeBar score={riskScore} />
                </div>
              </div>

              <div className="mt-5 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-700 shadow-sm">
                    {riskDelta != null ? (
                      <>
                        {riskDelta >= 0 ? <ArrowUpRight className="h-4 w-4 text-[#C45B5B]" /> : <ArrowDownRight className="h-4 w-4 text-[#6B9080]" />}
                        {riskDelta >= 0 ? "+" : ""}{riskDelta} since last week
                      </>
                    ) : (
                      <span className="text-slate-500">{pending("last week&apos;s profile snapshot")}</span>
                    )}
                  </span>
                  <span className="text-slate-500">What affects this score? chronic disease risk, readmission likelihood, no-show patterns, and adherence.</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{riskFactorsSentence}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {topFactors.slice(0, 3).map((factor) => (
                    <span key={factor.feature} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                      {factor.feature}
                    </span>
                  ))}
                </div>
              </div>
            </WorkspaceCard>

            <div className="grid gap-5">
              <WorkspaceCard className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-600">Readmission probability</p>
                      <InfoBadge text="Select 30-day or 90-day horizon. The benchmark line is shown when cohort data is available; otherwise it is marked as pending." />
                    </div>
                    <p className="text-sm text-slate-500">Short-horizon risk for proactive follow-up planning.</p>
                  </div>
                  <div className="flex overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-1 text-xs">
                    <button type="button" onClick={() => setReadmissionHorizon(30)} className={`rounded-full px-3 py-1.5 ${readmissionHorizon === 30 ? "bg-[var(--accent-sage)] text-white" : "text-slate-500"}`}>
                      30-day
                    </button>
                    <button type="button" onClick={() => setReadmissionHorizon(90)} className={`rounded-full px-3 py-1.5 ${readmissionHorizon === 90 ? "bg-[var(--accent-sage)] text-white" : "text-slate-500"}`}>
                      90-day
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <HorizonGauge score={readmissionScore} level={riskLevelFromScore(readmissionScore)} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Benchmark comparison</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {typeof readmissionBenchmark === "number" ? `${readmissionBenchmark}% for similar patients` : pending("peer cohort analytics")}
                    </p>
                  </div>
                  <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Trend</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                      {readmissionHorizon === 30 && readmission30 < readmission90 ? <TrendingDown className="h-4 w-4 text-[#6B9080]" /> : readmission30 > readmission90 ? <TrendingUp className="h-4 w-4 text-[#C45B5B]" /> : <Minus className="h-4 w-4 text-slate-500" />}
                      {readmissionHorizon === 30 && readmission30 < readmission90 ? "Improving" : readmission30 > readmission90 ? "Worsening" : "Stable"}
                    </p>
                  </div>
                </div>
              </WorkspaceCard>

              <WorkspaceCard className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-600">ML confidence & anomaly</p>
                      <InfoBadge text="Confidence shows how stable the model output is. Anomaly highlights the series most likely driving outlier behavior." />
                    </div>
                    <p className="text-sm text-slate-500">Confidence and outlier signals tied to the latest patient data.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-3.5 w-3.5 rounded-full ${confidencePct != null && confidencePct >= 70 ? "bg-[#6B9080]" : confidencePct != null && confidencePct >= 40 ? "bg-[#D4A373]" : "bg-[#C45B5B]"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Confidence</p>
                        <p className="text-sm text-slate-500">
                          {confidencePct != null ? `${confidencePct.toFixed(0)}% confidence: ${confidencePct >= 70 ? "High" : confidencePct >= 40 ? "Moderate" : "Low"}` : pending("model calibration output")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3"><MiniSparkline points={(primaryTrend?.chart_data || []).filter((point) => typeof point.value === "number").map((point) => Number(point.value))} stroke="#7A9CC6" /></div>
                  </div>
                  <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-3.5 w-3.5 rounded-full ${profile?.ml_is_anomaly ? "bg-[#C45B5B]" : "bg-[#6B9080]"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Anomaly signal</p>
                        <p className="text-sm text-slate-500">
                          {profile?.ml_is_anomaly
                            ? `Triggered by ${anomalySeries}`
                            : `No active anomaly. Pending data from ${anomalySeries}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3"><MiniSparkline points={(primaryTrend?.chart_data || []).filter((point) => typeof point.value === "number").map((point) => Number(point.value))} stroke="#C45B5B" /></div>
                  </div>
                </div>
              </WorkspaceCard>
            </div>
          </div>
        ) : null}
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader
            title="Top risk factors"
            subtitle="Ranked model features and the current patient context behind them"
            action={<InfoBadge text="What affects this score? These features carry the greatest relative weight in the ML model for this patient." />}
          />
          <p className="mt-2 text-sm text-slate-600">High-impact items are red, medium items are amber, and lower-impact items are teal.</p>
          <div className="mt-5 space-y-4">
            {topFactors.length ? (
              topFactors.map((factor) => (
                <div key={factor.feature} className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{factor.feature}</p>
                      <p className="text-sm text-slate-500">Current value: {factor.currentValue}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Badge tone={factor.severity === "high" ? "red" : factor.severity === "medium" ? "amber" : "sage"}>{Math.round(factor.importance * 100)}% weight</Badge>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#EEF2F1]">
                    <div
                      className={`h-2 rounded-full ${factor.severity === "high" ? "bg-[#C45B5B]" : factor.severity === "medium" ? "bg-[#D4A373]" : "bg-[#6B9080]"}`}
                      style={{ width: `${Math.max(10, factor.importance * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-500">
                {pending("feature importance values from the ML service")}
              </div>
            )}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader
            title="Prescription & intervention recommendations"
            subtitle="Next actions the care team can consider based on the current signals"
            action={<InfoBadge text="What affects this score? Recommendations are generated from the most important risk drivers and anomaly signals." />}
          />
          <div className="mt-5 space-y-3">
            {recommendations.length ? (
              recommendations.map((item) => (
                <div key={`${item.trigger}-${item.action}`} className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={item.urgency === "Urgent" ? "red" : item.urgency === "Routine" ? "amber" : "sage"}>{item.urgency}</Badge>
                    <span className="text-sm text-slate-500">May reduce overall score by ~{item.impact} pts</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Trigger: {item.trigger}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.action}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-500">
                {pending("action rules from the ML service")}
              </div>
            )}
          </div>
        </WorkspaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader
            title="Patient trend explorer"
            subtitle="Line chart with contextual banding, forecast cone, annotations, and optional overlay comparison"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <InfoBadge text="What affects this score? The chart shows the observed test series, a forecast cone, and notable events when available." />
                <button
                  type="button"
                  onClick={() => setOverlayEnabled((current) => !current)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${overlayEnabled ? "bg-[var(--accent-sage)] text-white" : "border border-[#E5E7EB] bg-white text-slate-600"}`}
                >
                  {overlayEnabled ? "Overlay on" : "Overlay off"}
                </button>
              </div>
            }
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {trendOptions.map((trend) => (
              <button
                key={trend.test_name}
                type="button"
                onClick={() => setPrimaryTrendName(trend.test_name || null)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${primaryTrend?.test_name === trend.test_name ? "bg-[var(--accent-sage)] text-white" : "border border-[#E5E7EB] bg-white text-slate-600"}`}
              >
                {trend.test_name}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {trendOptions
              .filter((trend) => trend.test_name !== primaryTrend?.test_name)
              .slice(0, 4)
              .map((trend) => (
                <button
                  key={trend.test_name}
                  type="button"
                  onClick={() => setComparisonTrendName(trend.test_name || null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${comparisonTrend?.test_name === trend.test_name ? "bg-[#7A9CC6] text-white" : "border border-[#E5E7EB] bg-white text-slate-600"}`}
                >
                  Compare {trend.test_name}
                </button>
              ))}
          </div>

          <div className="mt-5">
            <TrendExplorerChart rows={trendSeries} overlayEnabled={overlayEnabled} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Selected series</p>
              <p className="mt-1 font-medium text-slate-900">{primaryTrend?.test_name || pending("lab result history")}</p>
            </div>
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Forecast</p>
              <p className="mt-1 font-medium text-slate-900">
                {typeof labForecast?.predicted_value === "number"
                  ? `${labForecast.predicted_value.toFixed(2)} (${labForecast.trend || "Stable"})`
                  : pending("forecast model output")}
              </p>
            </div>
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Reference bands</p>
              <p className="mt-1 font-medium text-slate-900">Contextual bands from the observed series</p>
            </div>
          </div>
        </WorkspaceCard>

        <div className="grid gap-6">
          <WorkspaceCard className="p-6">
            <SectionHeader
              title="Risk composition donut"
              subtitle="Shows how the overall score is distributed across chronic, readmission, no-show, and adherence drivers"
              action={<InfoBadge text="What affects this score? Hover to see the point contribution for each risk category." />}
            />
            <div className="relative mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskBreakdown} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={3}>
                    {riskBreakdown.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} pts`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Dominant category</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{dominantRisk.name}</p>
                  <p className="text-sm text-slate-500">{dominantRisk.value} pts</p>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {riskBreakdown.map((item) => (
                <DonutLegendItem key={item.name} label={`${item.name}: ${item.value} pts`} value={item.value} color={item.color} />
              ))}
            </div>
          </WorkspaceCard>

          <WorkspaceCard className="p-6">
            <SectionHeader
              title="Risk balance radar"
              subtitle="Compares the patient against a reference profile across core risk dimensions"
              action={<InfoBadge text="What affects this score? The teal polygon is the patient, and the dotted trace is the reference profile." />}
            />
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={riskBreakdown.map((item, index) => ({ name: item.name, patient: item.value, reference: radarReference[index]?.value ?? 0, fullMark: 100 }))}>
                  <PolarGrid gridType="polygon" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <Radar name="Patient" dataKey="patient" stroke="#6B9080" fill="#6B9080" fillOpacity={0.28} />
                  <Radar name="Reference" dataKey="reference" stroke="#7A9CC6" fill="transparent" strokeDasharray="6 6" />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </WorkspaceCard>
        </div>
      </div>

      <WorkspaceCard className="p-6">
        <SectionHeader
          title="Timeline / history strip"
          subtitle="Six-month context for the latest model signals and the key events around them"
          action={<InfoBadge text="What affects this score? The strip combines recent labs, model computation time, and pending encounter or medication sources." />}
        />
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {timelineEvents.map((event, index) => (
            <div key={`${event.label}-${index}`} className="min-w-[220px] rounded-[18px] border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toneToColor(event.tone) }} />
                <p className="text-sm font-medium text-slate-900">{event.label}</p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{event.source}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{event.dateText}</p>
            </div>
          ))}
        </div>
      </WorkspaceCard>
    </div>
  );
}
