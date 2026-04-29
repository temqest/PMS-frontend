import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export function WorkspaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  positive = true,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  trend: string;
  positive?: boolean;
}) {
  return (
    <WorkspaceCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#FAFBFC] text-[#6B9080]">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <span className={`text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {trend}
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </WorkspaceCard>
  );
}

export function AvatarInitials({
  initials,
  size = 40,
}: {
  initials: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#FAFBFC] font-medium text-slate-700"
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.35) }}
    >
      {initials}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "sage" | "blue" | "amber" | "red" | "green";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "border-[#E5E7EB] text-slate-600 bg-white",
    sage: "border-[rgba(107,144,128,0.18)] text-[#6B9080] bg-[rgba(107,144,128,0.06)]",
    blue: "border-[rgba(122,156,198,0.22)] text-[#5F83B0] bg-[rgba(122,156,198,0.08)]",
    amber: "border-[rgba(217,119,6,0.2)] text-[#B45309] bg-[rgba(217,119,6,0.08)]",
    red: "border-[rgba(239,68,68,0.2)] text-[#B91C1C] bg-[rgba(239,68,68,0.08)]",
    green: "border-[rgba(34,197,94,0.2)] text-[#15803D] bg-[rgba(34,197,94,0.08)]",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function FilterPill({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: ComponentPropsWithoutRef<"button">["onClick"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition-all duration-150 ${
        active
          ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
          : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"
      }`}
    >
      {children}
    </button>
  );
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-5 text-center text-sm text-slate-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#FAFBFC]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAFBFC] text-[#6B9080]">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFBFC] text-[#9CA3AF]">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function TableActionLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-[var(--accent-sage)] hover:underline">
      {children}
      <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
    </Link>
  );
}

export function QuickLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
