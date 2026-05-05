"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChartColumnBig,
  FolderOpen,
  Home,
  LogOut,
  UserCircle2,
} from "lucide-react";

import { getPortalPathForRole, getSessionClaims } from "../../lib/session";

const navItems = [
  { href: "/portal", label: "Dashboard", icon: Home },
  { href: "/portal/profile", label: "My Profile", icon: UserCircle2 },
  { href: "/portal/records", label: "My Records", icon: FolderOpen },
  { href: "/portal/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/portal/stats", label: "Health Stats", icon: ChartColumnBig },
];

const isActiveNavItem = (pathname: string, href: string) => {
  if (href === "/portal") {
    return pathname === href || pathname === `${href}/`;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function PatientPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("Patient");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const claims = getSessionClaims();
      if (!claims) {
        router.replace("/login");
        return;
      }

      if (claims.role !== "patient") {
        router.replace(getPortalPathForRole(claims.role));
        return;
      }

      setDisplayName(claims.fullName || "Patient");
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  const activeLabel = useMemo(() => {
    const current = navItems.find((item) => isActiveNavItem(pathname, item.href));
    return current?.label || "Dashboard";
  }, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("pms_token");
    } catch {
      // ignore
    }
    router.replace("/login");
  };

  if (!ready) {
    return <div className="min-h-screen bg-[#F7F8FA]" />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7F8FA_0%,#FFFFFF_42%,#FAFBFC_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 flex-col rounded-[24px] border border-[#E5E7EB] bg-white/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur lg:flex">
          <div className="rounded-[20px] border border-[#E5E7EB] bg-[linear-gradient(180deg,rgba(107,144,128,0.08),rgba(255,255,255,0.96))] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-[var(--accent-sage)]">Patient Portal</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Aurelia Health</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Private access for appointments, records, and health updates.</p>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveNavItem(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[16px] px-4 py-3 text-sm transition-colors ${
                    active
                      ? "bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                      : "text-slate-600 hover:bg-[#FAFBFC] hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[20px] border border-[#E5E7EB] bg-[#FAFBFC] p-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Signed in as</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{displayName}</p>
            <p className="mt-1 text-sm text-slate-500">{activeLabel}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-[#F3F4F6]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-[24px] border border-[#E5E7EB] bg-white/90 px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.36em] text-slate-400">{activeLabel}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Welcome back, {displayName}</h2>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-[#F3F4F6] lg:hidden"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </button>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => {
                const active = isActiveNavItem(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                      active
                        ? "border-[rgba(107,144,128,0.2)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                        : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 pb-6">{children}</main>
        </div>
      </div>
    </div>
  );
}