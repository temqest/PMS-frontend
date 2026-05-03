"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, RefreshCw, Sparkles, TrendingUp } from "lucide-react";

import { Badge, SectionHeader, WorkspaceCard } from "../workspace-ui";
import type {
  PredictiveCareLabForecast,
  PredictiveCareLabTrend,
  PredictiveCareProfile,
} from "../../../lib/api";

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

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatNumber = (value?: number, digits = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
};

const toneForLevel = (level?: string): "neutral" | "sage" | "amber" | "red" => {
  if (level === "Critical" || level === "High") return "red";
  if (level === "Moderate") return "amber";
  if (level === "Low") return "sage";
  return "neutral";
};

const readableFeature = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const toPercent = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clamp(value <= 1 ? value * 100 : value, 0, 100);
};

function RiskGauge({ score, label, tone }: { score: number; label: string; tone: "neutral" | "sage" | "amber" | "red" }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamp(score, 0, 100) / 100) * circumference;
  const toneColor = tone === "red" ? "#C45B5B" : tone === "amber" ? "#D4A373" : tone === "sage" ? "#6B9080" : "#64748B";

  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-[#E5E7EB] bg-white p-4">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={toneColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold">
          {Math.round(score)}
        </text>
        <text x="60" y="76" textAnchor="middle" className="fill-slate-500 text-[10px] uppercase tracking-[0.28em]">
          {label}
        </text>
      </svg>
      <div>
        <p className="text-sm font-medium text-slate-600">Readmission probability</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {score >= 70
            ? "Immediate follow-up is warranted."
            : score >= 40
              ? "Monitor closely and review discharge plans."
              : "Current ML signal is relatively stable."}
        </p>
      </div>
    </div>
  );
}

function SparklineChart({ points }: { points: ChartPoint[] }) {
  const width = 560;
  const height = 220;
  const padding = 24;

  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] text-sm text-slate-500">
        No lab series available yet.
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue || 1;

  const coords = points.map((point, index) => ({
    ...point,
    x: padding + ((width - padding * 2) * index) / Math.max(points.length - 1, 1),
    y: height - padding - ((point.value - minValue) / spread) * (height - padding * 2),
  }));

  const hasForecast = coords[coords.length - 1]?.label === "Forecast";
  const actual = hasForecast ? coords.slice(0, -1) : coords;
  const forecast = hasForecast ? coords.slice(-2) : [];
  const actualLine = actual.map((point) => `${point.x},${point.y}`).join(" ");
  const forecastLine = forecast.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        <defs>
          <linearGradient id="lab-series-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(107,144,128,0.18)" />
            <stop offset="100%" stopColor="rgba(107,144,128,0.02)" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E7EB" />
        {actualLine ? (
          <polyline
            points={actualLine}
            fill="none"
            stroke="#6B9080"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {forecastLine && forecast.length > 1 ? (
          <polyline
            points={forecastLine}
            fill="none"
            stroke="#D4A373"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
          />
        ) : null}
        {coords.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 6 : 4}
            fill={index === coords.length - 1 ? "#D4A373" : "#6B9080"}
          />
        ))}
        {coords.length > 0 ? (
          <text x={coords[0].x} y={height - 6} textAnchor="start" className="fill-slate-400 text-[10px]">
            {coords[0].label}
          </text>
        ) : null}
        {coords.length > 1 ? (
          <text x={coords[coords.length - 1].x} y={height - 6} textAnchor="end" className="fill-slate-400 text-[10px]">
            {coords[coords.length - 1].label}
          </text>
        ) : null}
      </svg>
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
  const topFactors = useMemo(() => {
    const factors = profile?.ml_top_risk_factors || [];
    return [...factors]
      .filter((item) => typeof item.importance === "number" && typeof item.feature === "string")
      .sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0))
      .slice(0, 5);
  }, [profile]);

  const selectedTrend = useMemo(() => {
    const ranked = [...labTrends].sort((a, b) => {
      const aPoints = a.chart_data?.length || 0;
      const bPoints = b.chart_data?.length || 0;
      return bPoints - aPoints;
    });
    return ranked[0] ?? null;
  }, [labTrends]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const actual = (selectedTrend?.chart_data || [])
      .filter((point) => typeof point.value === "number")
      .map((point, index) => ({
        x: index,
        y: 0,
        value: Number(point.value),
        label: point.date ? new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : `${index + 1}`,
      }));

    if (!actual.length) return [];

    const forecastPoint =
      labForecast && typeof labForecast.predicted_value === "number"
        ? {
            x: actual.length,
            y: 0,
            value: Number(labForecast.predicted_value),
            label: "Forecast",
          }
        : null;

    return forecastPoint ? [...actual, forecastPoint] : actual;
  }, [labForecast, selectedTrend]);

  const readmissionScore = Math.round(toPercent(profile?.ml_readmission_prob));
  const anomalyTone = profile?.ml_is_anomaly ? "red" : "sage";
  const factorMax = topFactors.reduce((max, item) => Math.max(max, Number(item.importance) || 0), 0) || 1;
  const mlComputedAt = profile?.ml_computed_at;

  // Determine if we're in a loading or error state
  const isInitialLoading = loading && !profile;
  const hasError = error && !profile;

  return (
    <div className="space-y-6">
      <WorkspaceCard className="overflow-hidden border-[#DCE5E1]">
        <div className="bg-[linear-gradient(135deg,rgba(107,144,128,0.1),rgba(122,156,198,0.08))] px-6 py-5">
          <SectionHeader
            title="Predictive care"
            subtitle={profile?.patient_name ? `ML signals for ${profile.patient_name}` : "Patient-level ML signals and forecast points"}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {fetchedAt ? <span className="text-xs text-slate-500">Updated {new Date(fetchedAt).toLocaleString()}</span> : null}
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
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Use this view as the single source of truth for patient-level ML signals. It works in local development through the frontend API base URL and in deployment through the configured backend origin.
          </p>
        </div>

        {isInitialLoading ? (
          <div className="border-t border-[#E5E7EB] bg-blue-50/60 px-6 py-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-blue-900">Computing predictive profile...</p>
                <p className="mt-1 text-sm text-blue-700">This may take a few moments on first load. The system will auto-compute ML predictions for this patient.</p>
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
                <p className="mt-2 text-sm text-rose-600">Try clicking "Recompute ML" to trigger a fresh computation.</p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="border-t border-[#E5E7EB] bg-amber-50/60 px-6 py-4">
            <p className="text-sm text-amber-700">⚠ {error}</p>
          </div>
        ) : null}

        {!isInitialLoading && !hasError ? (
          <div className="grid gap-4 border-t border-[#E5E7EB] p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <WorkspaceCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Overall risk</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatNumber(profile?.overall_risk_score)}</p>
                  </div>
                  <Badge tone={toneForLevel(profile?.overall_risk_level)}>{profile?.overall_risk_level || "Unknown"}</Badge>
                </div>
                <p className="mt-4 text-sm text-slate-500">Rule-based risk score merged with ML predictions.</p>
              </WorkspaceCard>

              <WorkspaceCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Anomaly signal</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatNumber(profile?.ml_anomaly_score)}</p>
                  </div>
                  <Badge tone={anomalyTone}>{profile?.ml_is_anomaly ? "Anomaly" : "Normal"}</Badge>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  {profile?.ml_is_anomaly
                    ? "Observed values drift from the learned population pattern."
                    : "Observed values remain within the expected range."}
                </p>
              </WorkspaceCard>

              <RiskGauge score={readmissionScore} label="ML" tone={toneForLevel(profile?.ml_readmission_level)} />

              <WorkspaceCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">ML confidence</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{profile?.ml_chronic_confidence != null ? formatNumber(profile.ml_chronic_confidence * 100) : "-"}</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-[var(--accent-sage)]" />
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Chronic risk level: <span className="font-medium text-slate-900">{profile?.ml_chronic_level || "Unknown"}</span>
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Readmission level: <span className="font-medium text-slate-900">{profile?.ml_readmission_level || "Unknown"}</span>
                </p>
              </WorkspaceCard>
            </div>

            <WorkspaceCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">Top risk factors</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Model feature importance</p>
                </div>
                <TrendingUp className="h-5 w-5 text-[var(--accent-sage)]" />
              </div>
              <div className="mt-4 space-y-3">
                {topFactors.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-500">
                    No feature importance data returned yet.
                  </div>
                ) : topFactors.map((factor) => {
                  const value = (Number(factor.importance) || 0) / factorMax;
                  return (
                    <div key={factor.feature || readableFeature(String(factor.feature || ""))}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{readableFeature(String(factor.feature || ""))}</span>
                        <span className="text-slate-500">{Math.round((Number(factor.importance) || 0) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#EFF3F1]">
                        <div className="h-2 rounded-full bg-[var(--accent-sage)]" style={{ width: `${Math.max(8, value * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </WorkspaceCard>
          </div>
        ) : null}
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WorkspaceCard className="p-6">
          <SectionHeader
            title="Lab forecast"
            subtitle={selectedTrend ? `${readableFeature(selectedTrend.test_name || "Lab result")} trend with forecast point` : "Choose a patient with lab history to see a forecast"}
            action={selectedTrend ? <Badge tone={selectedTrend.trend_severity === "Severe" || selectedTrend.trend_direction === "Worsening" ? "red" : selectedTrend.trend_severity === "Moderate" ? "amber" : "sage"}>{selectedTrend.trend_direction || "Stable"}</Badge> : null}
          />
          <div className="mt-4">
            <SparklineChart points={chartPoints} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Selected test</p>
              <p className="mt-1 font-medium text-slate-900">{selectedTrend?.test_name || "None"}</p>
            </div>
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Forecast value</p>
              <p className="mt-1 font-medium text-slate-900">{formatNumber(labForecast?.predicted_value, 2)}</p>
            </div>
            <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FAFBFC] p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Trend</p>
              <p className="mt-1 font-medium text-slate-900">{labForecast?.trend || selectedTrend?.trend_direction || "Stable"}</p>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Signals" subtitle="Quick scan of the ML payload" />
          <div className="mt-4 space-y-4">
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-[var(--accent-sage)]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-slate-900">Service usage</p>
                  <p className="text-sm text-slate-500">{profile?.ml_service_used ? "ML service was used for this profile." : "Rule-based profile only."}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[#D4A373]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-slate-900">Readmission level</p>
                  <p className="text-sm text-slate-500">{profile?.ml_readmission_level || "Unknown"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#6B9080]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-slate-900">ML computed at</p>
                  <p className="text-sm text-slate-500">{mlComputedAt ? new Date(mlComputedAt).toLocaleString() : "Not yet computed"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-500">
              {loading ? "Refreshing predictive care data..." : "Use Recompute ML after updating the patient record or recent lab data."}
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
