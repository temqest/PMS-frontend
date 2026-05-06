"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Pill,
  ShieldCheck,
  Video,
} from "lucide-react";

import {
  BrandMark,
  FeatureCard,
  ProcessStep,
  SectionIntro,
  StatItem,
} from "./components/clinic-ui";

const trustStats = [
  { icon: ShieldCheck, value: "10,000+", label: "secure patient journeys" },
  { icon: CalendarDays, value: "Same-day", label: "online appointments" },
  { icon: FolderOpen, value: "Encrypted", label: "medical records" },
  { icon: Video, value: "24/7", label: "telehealth access" },
];

const features = [
  {
    icon: CalendarDays,
    title: "Online appointments",
    description:
      "Schedule visits quickly with a calm flow that keeps the next step obvious at every turn.",
  },
  {
    icon: FolderOpen,
    title: "Secure records",
    description:
      "Keep patient histories, notes, and results organized in a private environment with clear access control.",
  },
  {
    icon: Video,
    title: "Telehealth visits",
    description:
      "Start remote consultations with the same clarity and structure patients expect in person.",
  },
  {
    icon: Pill,
    title: "Prescription management",
    description:
      "Track prescriptions, refills, and follow-up instructions without adding noise to the workflow.",
  },
  {
    icon: ShieldCheck,
    title: "Security-first design",
    description:
      "Patient data stays protected with subtle, transparent cues that build trust without friction.",
  },
  {
    icon: LayoutDashboard,
    title: "Focused dashboard",
    description:
      "See the essentials first so clinicians and staff can move through the day with less stress.",
  },
];

export default function Home() {
  return (
    <main className="page-enter bg-white text-slate-900">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <BrandMark />
        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm text-slate-500 md:flex">
          <Link href="#overview" className="transition-colors duration-200 hover:text-slate-900">
            Overview
          </Link>
          <Link href="#features" className="transition-colors duration-200 hover:text-slate-900">
            Features
          </Link>
          <Link href="#process" className="transition-colors duration-200 hover:text-slate-900">
            Process
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[var(--accent-sage)] px-5 text-sm font-medium text-[var(--accent-sage)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section id="overview" className="mx-auto w-full max-w-7xl px-6 pb-24 pt-8 lg:px-10 lg:pb-32 lg:pt-14">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="max-w-3xl space-y-10">
            <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-medium uppercase tracking-[0.42em] text-[var(--accent-sage)]">
              Digital care, refined
            </span>
            <div className="space-y-6">
              <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Healthcare, simplified for calmer care.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-500 sm:text-xl">
                A premium clinic platform that brings appointments, records, telehealth, and prescriptions into one quiet, secure experience.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-5 text-sm font-medium text-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5f8273] hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)]"
              >
                Create account
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-[12px] border border-[var(--accent-sage)] px-5 text-sm font-medium text-[var(--accent-sage)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
              >
                Log in
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 hidden h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(122,156,198,0.14),rgba(255,255,255,0))] blur-2xl lg:block" />
            <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="rounded-[20px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Today</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">Care dashboard</p>
                  </div>
                  <div className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-slate-500">
                    Live
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Appointment</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">14:30</p>
                    <p className="mt-2 text-sm text-slate-500">Follow-up consultation</p>
                  </div>
                  <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Security</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">Encrypted</p>
                    <p className="mt-2 text-sm text-slate-500">Access logs verified</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[20px] border border-[var(--border-soft)] bg-white p-5">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Patient flow</span>
                    <span>Quiet mode</span>
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-3">
                    <div className="h-10 flex-1 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(122,156,198,0.35),rgba(122,156,198,0.12))]" />
                    <div className="h-16 flex-1 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(107,144,128,0.38),rgba(107,144,128,0.12))]" />
                    <div className="h-20 flex-1 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(122,156,198,0.42),rgba(122,156,198,0.14))]" />
                    <div className="h-14 flex-1 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(107,144,128,0.3),rgba(107,144,128,0.1))]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="h-px w-full bg-[var(--border-soft)]" />
      </div>

      <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-4 lg:grid-cols-4">
          {trustStats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionIntro
          eyebrow="Features"
          title="Built to reduce friction for patients and staff."
          description="Every screen is structured to feel calm, readable, and dependable so the platform supports care instead of competing with it."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section id="process" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionIntro
          eyebrow="How it works"
          title="A simple flow that stays clear from the first visit."
          description="Three focused steps guide patients from discovery to care without visual noise or unnecessary decisions."
          centered
        />

        <div className="mt-16 flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-0">
          <ProcessStep
            number="01"
            title="Request an appointment"
            description="Choose a time quickly with a lightweight booking flow that never feels crowded."
          />
          <div className="hidden h-px flex-1 bg-[var(--border-soft)] md:block md:mt-7" />
          <ProcessStep
            number="02"
            title="Review records securely"
            description="Patient notes, history, and results stay organized in one private workspace."
          />
          <div className="hidden h-px flex-1 bg-[var(--border-soft)] md:block md:mt-7" />
          <ProcessStep
            number="03"
            title="Continue care remotely"
            description="Follow-ups, prescriptions, and telehealth access are ready when the patient needs them."
          />
        </div>
      </section>

      <footer className="border-t border-[var(--border-soft)] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-10">
          <div className="space-y-5">
            <BrandMark />
            <p className="max-w-md text-sm leading-7 text-slate-500">
              Aurelia Health is designed to make clinic interactions feel clearer, safer, and less stressful for every patient and care team.
            </p>
          </div>
          <div className="space-y-4 text-sm text-slate-500">
            <p className="text-xs uppercase tracking-[0.38em] text-slate-400">Resources</p>
            <ul className="space-y-3">
              <li>
                <Link className="transition-colors hover:text-slate-900" href="/signup">
                  Sign up
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-slate-900" href="/login">
                  Log in
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-slate-900" href="#features">
                  Features
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4 text-sm text-slate-500">
            <p className="text-xs uppercase tracking-[0.38em] text-slate-400">Support</p>
            <ul className="space-y-3">
              <li>
                <Link className="transition-colors hover:text-slate-900" href="/">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-slate-900" href="/">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-slate-900" href="/">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
