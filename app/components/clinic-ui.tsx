"use client";

import Link from "next/link";
import { useState, type ComponentPropsWithoutRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";

const brandName = "Aurelia Health";

function mergeClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function BrandMark({
  href = "/",
  align = "left",
}: {
  href?: string;
  align?: "left" | "center";
}) {
  return (
    <Link
      href={href}
      className={mergeClasses(
        "group inline-flex items-center gap-3 text-left transition-opacity hover:opacity-90",
        align === "center" && "mx-auto justify-center text-center",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border-soft)] bg-white text-[10px] font-semibold tracking-[0.38em] text-[var(--accent-sage)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        AH
      </span>
      <span className={mergeClasses("flex flex-col", align === "center" && "items-center")}>
        <span className="text-sm font-semibold tracking-[0.32em] text-slate-900">
          {brandName}
        </span>
        <span className="text-[10px] uppercase tracking-[0.42em] text-slate-400">
          Clinic Platform
        </span>
      </span>
    </Link>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={mergeClasses("space-y-4", centered && "mx-auto max-w-3xl text-center")}>
      <p className="text-xs font-medium uppercase tracking-[0.42em] text-[var(--accent-sage)]">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-8 text-slate-500 sm:text-lg">{description}</p>
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="group rounded-[16px] border border-[var(--border-soft)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)]">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent-blue)] transition-colors group-hover:text-[var(--accent-sage)]">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </article>
  );
}

export function StatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent-sage)]">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-base font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-5 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-sm font-semibold text-[var(--accent-sage)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {number}
      </span>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  error,
  valid,
  id,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  label: string;
  error?: string;
  valid?: boolean;
}) {
  const showStatus = Boolean(valid || error);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={mergeClasses(
            "peer h-12 w-full border-0 border-b border-[var(--border-soft)] bg-transparent px-0 pr-10 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            className,
          )}
          {...props}
        />
        {showStatus ? (
          <span
            className={mergeClasses(
              "pointer-events-none absolute right-0 top-1/2 -translate-y-1/2",
              error ? "text-[#EF4444]" : "text-[var(--accent-sage)]",
            )}
          >
            {error ? (
              <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
            )}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-[#EF4444]">{error}</p> : null}
    </label>
  );
}

export function AuthPasswordField({
  label,
  error,
  valid,
  id,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  label: string;
  error?: string;
  valid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const showStatus = Boolean(valid || error);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          type={visible ? "text" : "password"}
          className={mergeClasses(
            "peer h-12 w-full border-0 border-b border-[var(--border-soft)] bg-transparent px-0 pr-20 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            className,
          )}
          {...props}
        />

        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {showStatus ? (
            <span
              aria-hidden="true"
              className={mergeClasses(
                "pointer-events-none",
                error ? "text-[#EF4444]" : "text-[var(--accent-sage)]",
              )}
            >
              {error ? (
                <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
              )}
            </span>
          ) : null}

          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setVisible((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[var(--surface-soft)] hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {visible ? <EyeOff className="h-5 w-5" strokeWidth={1.5} /> : <Eye className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-[#EF4444]">{error}</p> : null}
    </label>
  );
}

export function PasswordStrength({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Password strength</span>
        <span>{label}</span>
      </div>
      <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent-sage)] to-[var(--accent-blue)] transition-all duration-200"
          style={{ width: `${Math.max(0, Math.min(score, 4)) * 25}%` }}
        />
      </div>
    </div>
  );
}

export function AuthButton({
  children,
  secondary = false,
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  secondary?: boolean;
}) {
  return (
    <button
      className={mergeClasses(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        secondary
          ? "border border-[var(--accent-sage)] bg-white text-[var(--accent-sage)] shadow-none hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
          : "bg-[var(--accent-sage)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-[#5f8273] hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)]",
        className,
      )}
      {...props}
    >
      {children}
      {!secondary ? <ArrowRight className="h-4 w-4" strokeWidth={1.5} /> : null}
    </button>
  );
}
