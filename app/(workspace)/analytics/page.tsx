"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  Droplet,
  Heart,
  Hospital,
  Loader2,
  Pill,
  ScanLine,
  UserRound,
} from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import {
  Badge,
  WorkspaceCard,
  AvatarInitials,
} from "../../components/workspace-ui";
import {
  getPredictiveAlerts,
  getPredictiveDashboard,
  type AlertTypeCount,
  type CareAlertItem,
  type PredictiveDashboardPayload,
  type RiskBucketRow,
  type TopHighRiskPatient,
} from "../../../lib/api";

const RISK_ORDER = ["Low", "Moderate", "High", "Critical"] as const;
const GAP_ALERT_TYPES = new Set(["VACCINATION_GAP", "ADHERENCE_GAP", "LAB_TREND"]);

function bucketCount(rows: RiskBucketRow[] | undefined, levels: string[]): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => {
    const id = row._id ?? "";
    return levels.includes(id) ? sum + (Number(row.count) || 0) : sum;
  }, 0);
}

function gapAlertSum(alertCounts: AlertTypeCount[] | undefined): number {
  if (!alertCounts?.length) return 0;
  return alertCounts.reduce((sum, row) => {
    const id = row._id ?? "";
    return GAP_ALERT_TYPES.has(id) ? sum + (Number(row.count) || 0) : sum;
  }, 0);
}

function totalActiveAlerts(alertCounts: AlertTypeCount[] | undefined): number {
  if (!alertCounts?.length) return 0;
  return alertCounts.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
}

function totalProfiledPatients(rows: RiskBucketRow[] | undefined): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
}

function alertTypeLabel(t: string): string {
  return t
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function alertIcon(type: string) {
  switch (type) {
    case "LAB_TREND":
    case "CRITICAL_LAB":
      return Droplet;
    case "CHRONIC_RISK":
      return Heart;
    case "READMISSION_RISK":
      return Hospital;
    case "ADHERENCE_GAP":
      return Pill;
    case "VACCINATION_GAP":
      return ScanLine;
    case "NO_SHOW_RISK":
      return UserRound;
    default:
      return AlertTriangle;
  }
}

function severityToRiskStyle(severity: string): {
  risk: string;
  color: string;
  bg: string;
  tone: "red" | "amber" | "sage";
} {
  if (severity === "Critical")
    return { risk: "Critical", color: "#C45B5B", bg: "rgba(196, 91, 91, 0.06)", tone: "red" };
  if (severity === "Warning")
    return { risk: "Moderate", color: "#D4A373", bg: "rgba(212, 163, 115, 0.06)", tone: "amber" };
  return { risk: "Low", color: "#6B9080", bg: "rgba(107, 144, 128, 0.06)", tone: "sage" };
}

function levelToTone(level: string): "red" | "amber" | "sage" {
  if (level === "Critical" || level === "High") return "red";
  if (level === "Moderate") return "amber";
  return "sage";
}

function alertSeverityRank(severity?: string): number {
  if (severity === "Critical") return 3;
  if (severity === "Warning") return 2;
  if (severity === "Info") return 1;
  return 0;
}

function formatFetchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** First unresolved alert title per patient (stable order by array index from API). */
function firstAlertByPatient(
  alerts: CareAlertItem[] | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!alerts?.length) return map;
  for (const a of alerts) {
    const pid = a.patient_id;
    if (!pid || map.has(pid)) continue;
    map.set(pid, (a.title || a.alert_type || "Alert").toString());
  }
  return map;
}

export default function AnalyticsPage() {
  const { pushToast } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<PredictiveDashboardPayload | null>(
    null
  );
  const [alerts, setAlerts] = useState<CareAlertItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("pms_token") : null;
      if (!token) {
        pushToast({
          type: "error",
          title: "Not signed in",
          message: "Log in again to load predictive analytics.",
        });
        setDashboard(null);
        setAlerts([]);
        return;
      }

      const [dash, alertsRes] = await Promise.all([
        getPredictiveDashboard(),
        getPredictiveAlerts({
          is_resolved: false,
          limit: 60,
          page: 1,
        }),
      ]);
      setDashboard(dash ?? null);
      setAlerts(Array.isArray(alertsRes?.alerts) ? alertsRes.alerts : []);
      setFetchedAt(new Date().toISOString());
    } catch (err: unknown) {
      const status =
        err instanceof Error && "status" in err && typeof (err as Error & { status?: number }).status === "number"
          ? (err as Error & { status: number }).status
          : undefined;
      const msg = err instanceof Error ? err.message : "Unable to load analytics.";
      if (status === 403) {
        pushToast({
          type: "error",
          title: "Access denied",
          message: "Your role does not include predictive analytics access.",
        });
      } else if (status === 401) {
        pushToast({
          type: "error",
          title: "Session expired",
          message: "Log in again to continue.",
        });
      } else {
        pushToast({ type: "error", title: "Analytics failed", message: msg });
      }
      setDashboard(null);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleDownload = () => {
    pushToast({
      type: "info",
      title: "Export",
      message: "Export uses on-screen summaries for now.",
    });
  };

  const riskCards = useMemo(() => {
    const dist = dashboard?.riskDistribution;
    const ac = dashboard?.alertCounts;
    const high = bucketCount(dist, ["High"]);
    const critical = bucketCount(dist, ["Critical"]);
    const highCritical = high + critical;
    const moderate = bucketCount(dist, ["Moderate"]);
    const gaps = gapAlertSum(ac);
    const active = totalActiveAlerts(ac);
    const criticalAlerts = alerts.filter((alert) => alert.severity === "Critical").length;
    return [
      {
        title: "High / critical risk",
        count: String(highCritical),
        subtitle: `${critical} Critical / ${high} High`,
        tone: "red",
      },
      {
        title: "Active alerts",
        count: String(active),
        subtitle: `${criticalAlerts} critical unresolved`,
        tone: "red",
      },
      {
        title: "Care gap alerts",
        count: String(gaps),
        subtitle: "Vaccination, adherence, lab trend (active)",
        tone: "amber",
      },
      {
        title: "Moderate risk",
        count: String(moderate),
        subtitle: "Monitor within standard windows",
        tone: "neutral",
      },
    ];
  }, [dashboard, alerts]);

  const riskBars = useMemo(() => {
    const dist = dashboard?.riskDistribution ?? [];
    const map = new Map(dist.map((r) => [r._id ?? "", Number(r.count) || 0]));
    const total = totalProfiledPatients(dist);
    return RISK_ORDER.map((level) => ({
      level,
      count: map.get(level) ?? 0,
      pct: total > 0 ? ((map.get(level) ?? 0) / total) * 100 : 0,
    }));
  }, [dashboard]);

  const sortedAlertTypes = useMemo(() => {
    const ac = [...(dashboard?.alertCounts ?? [])];
    ac.sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));
    const max =
      ac.reduce((m, r) => Math.max(m, Number(r.count) || 0), 0) || 1;
    return ac.map((row) => ({
      type: row._id ?? "Unknown",
      count: Number(row.count) || 0,
      barPct: ((Number(row.count) || 0) / max) * 100,
    }));
  }, [dashboard]);

  const insightAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => {
          const severityDiff = alertSeverityRank(String(b.severity ?? "")) - alertSeverityRank(String(a.severity ?? ""));
          if (severityDiff !== 0) return severityDiff;
          return new Date(b.triggered_at ?? 0).getTime() - new Date(a.triggered_at ?? 0).getTime();
        })
        .slice(0, 5),
    [alerts]
  );

  const primaryAlertTitles = useMemo(
    () => firstAlertByPatient(alerts),
    [alerts]
  );

  const topPatients: TopHighRiskPatient[] = dashboard?.topHighRisk ?? [];
  const hasNoProfiles =
    !loading &&
    dashboard &&
    totalProfiledPatients(dashboard.riskDistribution) === 0 &&
    (!topPatients || topPatients.length === 0);

  return (
    <div className="grid grid-cols-1 gap-6 pb-8 xl:grid-cols-12">
      <WorkspaceCard className="p-6 xl:order-1 xl:col-span-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Patient Intelligence
            </h1>
            <Badge tone="blue">Decision support</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Population triage for proactive care: who needs attention, why they were flagged, and where the care team should open the patient chart next.
          </p>
          <p className="mt-3 inline-block rounded-full border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-1 text-xs text-slate-600">
            Population snapshot — date filters coming soon
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fetchedAt ? (
            <span className="text-xs text-slate-400">
              Updated {formatFetchTime(fetchedAt)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[#F3F4F6] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Activity className="h-4 w-4" strokeWidth={1.5} />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-[12px] border border-[#E5E7EB] bg-white p-2 text-slate-600 hover:bg-[#F3F4F6]"
            title="Export"
          >
            <Download className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      </WorkspaceCard>

      {hasNoProfiles ? (
        <WorkspaceCard className="border-amber-200 bg-amber-50/60 p-6 xl:order-2 xl:col-span-12">
          <p className="font-medium text-slate-900">
            No risk profiles computed yet
          </p>
          <p className="mt-2 text-sm text-slate-600">
            After clinical data exists, run{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">
              POST /api/v1/predictive-care/profiles/:patientId/compute
            </code>{" "}
            (or batch on the server) so this dashboard can populate.
          </p>
        </WorkspaceCard>
      ) : null}

      {/* Risk overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:order-3 xl:col-span-12 xl:grid-cols-4">
        {riskCards.map((card) => (
          <WorkspaceCard
            key={card.title}
            className={`relative p-5 ${
              card.tone === "red"
                ? "border-l-4 border-l-[#C45B5B]"
                : card.tone === "amber"
                  ? "border-l-4 border-l-[#D4A373]"
                  : "bg-[#FAFBFC]"
            }`}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-white/70">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-600">{card.title}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {card.count}
              </p>
              <p className="mt-2 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          </WorkspaceCard>
        ))}
      </div>

      {/* Active alerts */}
      <div className="xl:order-5 xl:col-span-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Active alerts requiring action
        </h2>
        <div className="grid gap-4">
          {loading && insightAlerts.length === 0 ? (
            [...Array.from({ length: 4 })].map((_, i) => (
              <WorkspaceCard key={i} className="flex h-36 items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </WorkspaceCard>
            ))
          ) : insightAlerts.length === 0 ? (
            <WorkspaceCard className="p-6">
              <p className="text-sm text-slate-600">
                No unresolved alerts. Profiles and compute jobs may not have run
                yet for your population.
              </p>
            </WorkspaceCard>
          ) : (
            insightAlerts.map((insight, idx) => {
              const Icon = alertIcon(String(insight.alert_type ?? ""));
              const sevStyle = severityToRiskStyle(String(insight.severity ?? "Info"));

              return (
                <WorkspaceCard key={insight._id ?? idx} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: sevStyle.bg }}
                      >
                        <Icon
                          className="h-5 w-5"
                          strokeWidth={1.5}
                          style={{ color: sevStyle.color }}
                        />
                      </span>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {insight.title || insight.alert_type}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {(insight.patient_name || insight.patient_id || "Patient") +
                            (insight.alert_type
                              ? ` · ${alertTypeLabel(String(insight.alert_type))}`
                              : "")}
                        </p>
                      </div>
                    </div>
                    <Badge tone={sevStyle.tone}>{insight.severity || "Info"}</Badge>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {insight.message ||
                      "No message. Open the patient profile for detail."}
                  </p>
                  {insight.patient_id ? (
                    <Link
                      href={`/patients/${insight.patient_id}?tab=predictive`}
                      className="text-sm font-medium text-[#6B9080] hover:underline"
                    >
                      Open patient intelligence
                    </Link>
                  ) : null}
                </WorkspaceCard>
              );
            })
          )}
        </div>
      </div>

      {/* High-risk patients */}
      <WorkspaceCard className="overflow-hidden xl:order-4 xl:col-span-7">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Highest-risk patients
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Worklist ranked by predictive risk profile with the first unresolved alert attached.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-[#E5E7EB] bg-[#FAFBFC]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk score
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary alert
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && topPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </td>
                </tr>
              ) : topPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No High / Critical profiles yet.
                  </td>
                </tr>
              ) : (
                topPatients.map((row, idx) => {
                  const name = row.patient_name ?? "Unknown";
                  const pid = row.patient_id ?? "";
                  const level = row.overall_risk_level ?? "—";
                  const score =
                    typeof row.overall_risk_score === "number"
                      ? row.overall_risk_score
                      : "—";
                  const impactTone =
                    level === "Critical"
                      ? "red"
                      : level === "High"
                        ? "red"
                        : level === "Moderate"
                          ? "amber"
                          : "neutral";
                  const primary = pid ? primaryAlertTitles.get(pid) : undefined;

                  return (
                    <tr
                      key={pid || idx}
                      className="border-t border-[#E5E7EB] hover:bg-[#FAFBFC]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarInitials initials={initialsFromName(name)} size={32} />
                          <div>
                            <p className="font-medium text-slate-900">{name}</p>
                            {pid ? (
                              <p className="text-xs text-slate-500">{pid}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {typeof score === "number" ? (
                          <Badge tone={impactTone}>{score}</Badge>
                        ) : (
                          <span className="text-slate-500">{score}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={levelToTone(String(level))}>{level}</Badge>
                      </td>
                      <td className="max-w-xs px-6 py-4 text-slate-600">
                        {primary ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        {pid ? (
                          <Link
                            href={`/patients/${pid}?tab=predictive`}
                            className="font-medium text-[#6B9080] hover:underline"
                          >
                            Open intelligence
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </WorkspaceCard>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 xl:order-6 xl:col-span-12 xl:grid-cols-12">
        <WorkspaceCard className="p-6 xl:col-span-7">
          <h3 className="text-lg font-semibold text-slate-900">
            Risk level distribution
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot across patients with computed profiles
          </p>
          <div className="mt-6 space-y-4">
            {riskBars.map((row) => {
              const colors: Record<string, string> = {
                Low: "#6B9080",
                Moderate: "#D4A373",
                High: "#C45B5B",
                Critical: "#7F1D1D",
              };
              const c = colors[row.level] ?? "#94a3b8";
              return (
                <div key={row.level}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{row.level}</span>
                    <span className="text-slate-500">{row.count}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${row.pct}%`,
                        backgroundColor: c,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!loading &&
            riskBars.every((r) => r.count === 0) ? (
              <p className="text-sm text-slate-500">No distribution data.</p>
            ) : null}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6 xl:col-span-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Active alerts by type
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Unresolved alert counts by engine
          </p>
          <div className="mt-6 space-y-4">
            {sortedAlertTypes.length === 0 && !loading ? (
              <p className="text-sm text-slate-500">
                No active alerts — or profiles have not been computed.
              </p>
            ) : (
              sortedAlertTypes.map((row) => (
                <div key={row.type}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{alertTypeLabel(row.type)}</span>
                    <span className="text-slate-500">{row.count}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full bg-[#6B9080] transition-all"
                      style={{ width: `${row.barPct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
