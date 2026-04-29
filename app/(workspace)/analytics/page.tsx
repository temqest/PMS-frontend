"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Droplet,
  Heart,
  Scan,
  Hospital,
  Pill,
  Brain,
  MoreVertical,
} from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import {
  Badge,
  WorkspaceCard,
  AvatarInitials,
} from "../../components/workspace-ui";

// Mock data for risk overview
const riskCards = [
  {
    title: "High Risk",
    count: "24",
    trend: "+3",
    trendPositive: false,
    subtitle: "Need immediate intervention",
  },
  {
    title: "Moderate Risk",
    count: "67",
    trend: "-2",
    trendPositive: true,
    subtitle: "Follow-up within 14 days",
  },
  {
    title: "Care Gaps",
    count: "41",
    trend: "+5",
    trendPositive: false,
    subtitle: "Overdue screenings or labs",
  },
  {
    title: "Interventions Completed",
    count: "156",
    trend: "+12",
    trendPositive: true,
    subtitle: "Preventive actions this period",
  },
];

// Predictive insights with mock data
const predictiveInsights = [
  {
    id: "diabetes",
    icon: Droplet,
    title: "Diabetes Risk",
    risk: "High",
    prediction:
      "3.2x more likely to develop Type 2 Diabetes within 24 months based on BMI trajectory and HbA1c trends.",
    sparkline: [12, 15, 18, 20, 22, 25, 28, 30],
  },
  {
    id: "cardio",
    icon: Heart,
    title: "Cardiovascular Risk",
    risk: "Moderate",
    prediction:
      "Elevated blood pressure patterns combined with high cholesterol suggest increased cardiovascular event risk within 36 months.",
    sparkline: [8, 10, 12, 11, 13, 15, 14, 16],
  },
  {
    id: "cancer",
    icon: Scan,
    title: "Cancer Screening Gap",
    risk: "High",
    prediction:
      "Overdue mammogram screening. Age-risk profile suggests routine screening is critical for early detection.",
    sparkline: [5, 6, 8, 7, 9, 8, 10, 11],
  },
  {
    id: "readmission",
    icon: Hospital,
    title: "Readmission Risk",
    risk: "Moderate",
    prediction:
      "Recent hospitalization combined with medication non-compliance increases 30-day readmission probability to 22%.",
    sparkline: [20, 22, 25, 24, 26, 28, 27, 29],
  },
  {
    id: "adherence",
    icon: Pill,
    title: "Medication Adherence",
    risk: "Moderate",
    prediction:
      "Refill patterns suggest 35% non-compliance with prescribed regimen. Consider compliance coaching.",
    sparkline: [40, 38, 35, 32, 30, 28, 25, 24],
  },
  {
    id: "mental",
    icon: Brain,
    title: "Mental Health Flag",
    risk: "Moderate",
    prediction:
      "Screening scores and appointment gaps suggest possible depression. Recommend psychiatric referral.",
    sparkline: [6, 8, 10, 12, 15, 18, 20, 22],
  },
];

// Mock care gaps data
const careGapsData = [
  {
    initials: "JD",
    name: "John Davis",
    age: 58,
    riskScore: 8.2,
    riskLevel: "High",
    gap: "Overdue HbA1c (6 months)",
    outcome: "Likely uncontrolled diabetes within 12mo",
    action: "Order HbA1c + lipid panel",
    impact: "High",
  },
  {
    initials: "SM",
    name: "Sarah Miller",
    age: 45,
    riskScore: 6.1,
    riskLevel: "Moderate",
    gap: "Mammogram overdue (2 years)",
    outcome: "Missed early cancer detection window",
    action: "Schedule mammogram screening",
    impact: "Medium",
  },
  {
    initials: "RK",
    name: "Robert Kim",
    age: 72,
    riskScore: 7.9,
    riskLevel: "High",
    gap: "Medication compliance review needed",
    outcome: "30-day readmission probability 22%",
    action: "Compliance coaching call",
    impact: "High",
  },
  {
    initials: "MJ",
    name: "Michelle Johnson",
    age: 53,
    riskScore: 5.4,
    riskLevel: "Moderate",
    gap: "Lipid panel (18 months)",
    outcome: "Unmonitored cardiovascular risk",
    action: "Order lipid panel + lifestyle consult",
    impact: "Medium",
  },
];

export default function AnalyticsPage() {
  const { pushToast } = useWorkspace();
  const [dateRange, setDateRange] = useState("30 Days");

  const handleDownload = () => {
    pushToast({
      type: "info",
      title: "Export started",
      message: "Patient Intelligence report is being prepared for download.",
    });
  };

  // Sparkline helper - converts data to SVG polyline points
  const sparklinePoints = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  };

  // Helper to get risk color
  const getRiskColor = (risk: string) =>
    risk === "High" ? "#C45B5B" : risk === "Moderate" ? "#D4A373" : "#6B9080";

  // Helper to get risk background
  const getRiskBg = (risk: string) =>
    risk === "High"
      ? "rgba(196, 91, 91, 0.06)"
      : risk === "Moderate"
        ? "rgba(212, 163, 115, 0.06)"
        : "rgba(107, 144, 128, 0.06)";

  // Helper to get badge tone
  const getBadgeTone = (risk: string) =>
    risk === "High" ? "red" : risk === "Moderate" ? "amber" : "sage";

  return (
    <div className="space-y-6 pb-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Patient Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Predictive insights to guide proactive care
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["30 Days", "90 Days", "YTD"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDateRange(range)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                dateRange === range
                  ? "border-[#6B9080] bg-[rgba(107,144,128,0.08)] text-[#6B9080]"
                  : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"
              }`}
            >
              {range}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDownload}
            className="ml-2 rounded-[12px] border border-[#E5E7EB] bg-white p-2 text-slate-600 hover:bg-[#F3F4F6]"
            title="Download report"
          >
            <Download className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Risk Overview Cards - 4 Column Row */}
      <div className="grid gap-4 lg:grid-cols-4">
        {riskCards.map((card) => (
          <WorkspaceCard key={card.title} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-600">
                  {card.title}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${
                  card.trendPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {card.trendPositive ? "↓" : "↑"} {card.trend}
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {card.count}
            </p>
            <p className="mt-2 text-xs text-slate-500">{card.subtitle}</p>
          </WorkspaceCard>
        ))}
      </div>

      {/* Predictive Insights Grid - 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {predictiveInsights.map((insight) => {
          const Icon = insight.icon;
          const riskColor = getRiskColor(insight.risk);
          const riskBg = getRiskBg(insight.risk);
          const badgeTone = getBadgeTone(insight.risk);

          return (
            <WorkspaceCard key={insight.id} className="flex flex-col gap-6 p-6">
              {/* Header: Icon + Title + Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: riskBg }}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.5}
                      style={{ color: riskColor }}
                    />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {insight.title}
                    </h3>
                  </div>
                </div>
                <Badge tone={badgeTone}>{insight.risk}</Badge>
              </div>

              {/* Body: Clinical Prediction */}
              <p className="text-sm leading-6 text-slate-600">
                {insight.prediction}
              </p>

              {/* Mini Sparkline */}
              <div className="h-12 w-full">
                <svg viewBox="0 0 100 40" className="h-full w-full">
                  <polyline
                    points={sparklinePoints(insight.sparkline)}
                    fill="none"
                    stroke={riskColor}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>

              {/* Footer: View Patient Link */}
              <button
                type="button"
                className="text-sm font-medium text-[#6B9080] hover:underline"
              >
                View Patient
              </button>
            </WorkspaceCard>
          );
        })}
      </div>

      {/* Care Gaps Table - Full Width */}
      <WorkspaceCard className="overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Care Gaps by Impact
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Actionable gaps ranked by clinical priority
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
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary Gap
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Predicted Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recommended Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Impact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {careGapsData.map((row, idx) => {
                const borderColor =
                  row.impact === "High"
                    ? "#C45B5B"
                    : row.impact === "Medium"
                      ? "#D4A373"
                      : "transparent";
                const impactTone = getBadgeTone(row.impact as string);

                return (
                  <tr
                    key={idx}
                    className="border-t border-[#E5E7EB] hover:bg-[#FAFBFC]"
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: borderColor,
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AvatarInitials initials={row.initials} size={32} />
                        <div>
                          <p className="font-medium text-slate-900">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500">{row.age}y</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={getBadgeTone(row.riskLevel)}>
                        {row.riskScore}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.gap}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {row.outcome}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.action}</td>
                    <td className="px-6 py-4">
                      <Badge tone={impactTone}>{row.impact}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical
                          className="h-5 w-5"
                          strokeWidth={1.5}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WorkspaceCard>

      {/* Bottom Charts Row - 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Distribution Over Time */}
        <WorkspaceCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Risk Distribution Over Time
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Patient population stratification over 12 months
          </p>
          <div className="mt-6 h-64 rounded-[12px] bg-[#FAFBFC] p-4">
            <svg viewBox="0 0 640 240" className="h-full w-full">
              {/* Stacked area chart - Low (sage) / Moderate (amber) / High (rose) */}
              <path
                d="M 20 180 L 100 165 L 180 155 L 260 145 L 340 140 L 420 135 L 500 130 L 580 125 L 620 120"
                fill="rgba(107, 144, 128, 0.3)"
                stroke="#6B9080"
                strokeWidth="1.5"
              />
              <path
                d="M 20 210 L 100 200 L 180 195 L 260 190 L 340 185 L 420 180 L 500 175 L 580 170 L 620 165"
                fill="rgba(212, 163, 115, 0.3)"
                stroke="#D4A373"
                strokeWidth="1.5"
              />
              <path
                d="M 20 230 L 100 225 L 180 220 L 260 215 L 340 210 L 420 205 L 500 200 L 580 195 L 620 190"
                fill="rgba(196, 91, 91, 0.3)"
                stroke="#C45B5B"
                strokeWidth="1.5"
              />
              {/* X-axis labels */}
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((month, idx) => (
                <text
                  key={month}
                  x={20 + (idx * 560) / 11}
                  y="235"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9CA3AF"
                >
                  {month}
                </text>
              ))}
            </svg>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-4 rounded"
                style={{ backgroundColor: "#6B9080" }}
              />
              <span className="text-slate-600">Low Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-4 rounded"
                style={{ backgroundColor: "#D4A373" }}
              />
              <span className="text-slate-600">Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-4 rounded"
                style={{ backgroundColor: "#C45B5B" }}
              />
              <span className="text-slate-600">High Risk</span>
            </div>
          </div>
        </WorkspaceCard>

        {/* Intervention Outcomes */}
        <WorkspaceCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Intervention Outcomes
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Risk score trajectory: intervened vs. control group
          </p>
          <div className="mt-6 h-64 rounded-[12px] bg-[#FAFBFC] p-4">
            <svg viewBox="0 0 640 240" className="h-full w-full">
              {/* Intervened group (sage line) - downward trend */}
              <polyline
                points="20,60 100,65 180,70 260,68 340,60 420,55 500,48 580,42 620,38"
                fill="none"
                stroke="#6B9080"
                strokeWidth="2"
              />
              {/* Control group (gray line) - upward trend */}
              <polyline
                points="20,100 100,110 180,125 260,140 340,155 420,165 500,175 580,185 620,195"
                fill="none"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              {/* X-axis labels - months */}
              {["M1", "M2", "M3", "M4", "M5", "M6"].map((month, idx) => (
                <text
                  key={month}
                  x={20 + (idx * 560) / 5}
                  y="235"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9CA3AF"
                >
                  {month}
                </text>
              ))}
              {/* Y-axis labels */}
              <text
                x="10"
                y="40"
                fontSize="10"
                fill="#9CA3AF"
                textAnchor="end"
              >
                Low
              </text>
              <text
                x="10"
                y="210"
                fontSize="10"
                fill="#9CA3AF"
                textAnchor="end"
              >
                High
              </text>
            </svg>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-4 rounded"
                style={{ backgroundColor: "#6B9080" }}
              />
              <span className="text-slate-600">With intervention</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-4 rounded"
                style={{ backgroundColor: "#D1D5DB" }}
              />
              <span className="text-slate-600">Control group</span>
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}
