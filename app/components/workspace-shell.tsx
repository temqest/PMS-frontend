"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ChartLine,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { clearStoredSession, getSessionClaims } from "../../lib/session";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "neutral" | "destructive";
  onConfirm?: () => void;
};

type WorkspaceContextValue = {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  requestConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceShell");
  }

  return context;
}

const baseNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/records", label: "Health Records", icon: FolderOpen },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
];

const utilityNavigation = [
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItem = { href: "/admin", label: "Account Management", icon: ShieldCheck };

const shortcuts = [
  { label: "Open patients", href: "/patients", hint: "Patient list" },
  { label: "Today's schedule", href: "/appointments", hint: "Daily appointments" },
  { label: "Health records", href: "/records", hint: "Timeline and notes" },
  { label: "Analytics overview", href: "/analytics", hint: "Visit trends" },
  { label: "New appointment", href: "/appointments", hint: "Create a visit" },
];

const notifications = [
  {
    title: "3 follow-ups are overdue",
    time: "12m ago",
    unread: true,
  },
  {
    title: "Lab results ready for review",
    time: "41m ago",
    unread: true,
  },
  {
    title: "Prescription refill approved",
    time: "2h ago",
    unread: false,
  },
];

const routeMeta: Record<string, { title: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/appointments": { title: "Appointments" },
  "/patients": { title: "Patients" },
  "/records": { title: "Health Records" },
  "/analytics": { title: "Analytics" },
  "/settings": { title: "Settings" },
  "/admin": { title: "Account Management" },
};

let toastId = 1;

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [query, setQuery] = useState("");
  const [activeResult, setActiveResult] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isStaff = useMemo(() => {
    const claims = getSessionClaims();
    const staffRoles = ["system_admin", "front_desk"];
    return Boolean(claims && staffRoles.includes(claims.role || ""));
  }, []);

  const activeMeta = pathname.startsWith("/patients/")
    ? { title: "Patient Detail" }
    : routeMeta[pathname] ?? { title: "Clinic Workspace" };

  const filteredShortcuts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return shortcuts;
    }

    return shortcuts.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(normalized));
  }, [query]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = toastId += 1;
      setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const openSearch = useCallback(() => {
    setQuery("");
    setActiveResult(0);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
    setActiveResult(0);
  }, []);

  const requestConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        closeSearch();
        setNotificationsOpen(false);
        setConfirm(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch, openSearch]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const contextValue = useMemo(
    () => ({ pushToast, requestConfirm, closeConfirm }),
    [pushToast, requestConfirm, closeConfirm],
  );

  const handleLogout = useCallback(() => {
    clearStoredSession();
    router.push("/");
  }, [router]);

  const navigation = baseNavigation;
  const sidebarUtilities = isStaff ? [...utilityNavigation, adminNavItem] : utilityNavigation;

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div
        style={{
          ["--sidebar-width" as never]: `${collapsed ? 72 : 240}px`,
        }}
        className="min-h-screen bg-white text-slate-900"
      >
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[var(--sidebar-width)] flex-col border-r border-[#E5E7EB] bg-[#FAFBFC] lg:flex">
          <div className="flex h-16 items-center justify-between gap-3 border-b border-[#E5E7EB] px-4">
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white text-xs font-semibold tracking-[0.3em] text-[#1F2937]">
                AH
              </span>
              {!collapsed ? (
                <span className="flex flex-col">
                  <span className="text-sm font-semibold tracking-[0.28em] text-[#1F2937] uppercase">
                    Aurelia Health
                  </span>
                  <span className="text-[10px] tracking-[0.34em] text-slate-400 uppercase">
                    Clinic OS
                  </span>
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((current) => !current)}
              className="rounded-full border border-[#E5E7EB] bg-white p-2 text-slate-500 transition-colors hover:bg-[#F3F4F6]"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "border-l-[3px] border-l-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                      : "border-l-[3px] border-l-transparent text-slate-600 hover:bg-[#F3F4F6] hover:text-slate-900"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}

            <div className="mt-6 border-t border-[#E5E7EB] pt-4">
              {sidebarUtilities.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-all duration-150 ${
                      active
                        ? "border-l-[3px] border-l-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                        : "border-l-[3px] border-l-transparent text-slate-600 hover:bg-[#F3F4F6] hover:text-slate-900"
                    } ${collapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-[#E5E7EB] p-3">
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(107,144,128,0.08)] text-sm font-medium text-[var(--accent-sage)]">
                  AD
                </span>
                {!collapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">Dr. Amelia Doe</p>
                    <p className="truncate text-xs text-slate-500">Clinical Lead</p>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-[#F3F4F6] hover:text-slate-900"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </aside>

        <header className="fixed left-0 top-0 z-30 flex h-16 w-full items-center border-b border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:left-[var(--sidebar-width)] lg:w-[calc(100%-var(--sidebar-width))]">
          <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                type="button"
                aria-label="Open navigation"
                className="rounded-full border border-[#E5E7EB] p-2 text-slate-600 lg:hidden"
              >
                <Menu className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{activeMeta.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="rounded-full border border-[#E5E7EB] p-2 text-slate-600 transition-colors hover:bg-[#F3F4F6]"
              >
                <Search className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                aria-label="Notifications"
                className="relative rounded-full border border-[#E5E7EB] p-2 text-slate-600 transition-colors hover:bg-[#F3F4F6]"
              >
                <Bell className="h-4 w-4" strokeWidth={1.5} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-sage)]" />
              </button>
              <button
                type="button"
                aria-label="Help"
                className="rounded-full border border-[#E5E7EB] p-2 text-slate-600 transition-colors hover:bg-[#F3F4F6]"
              >
                <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-screen bg-white px-4 pb-24 pt-20 lg:px-8 lg:pl-[calc(var(--sidebar-width)+2rem)] lg:pb-8">
          <div key={pathname} className="workspace-content-enter mx-auto max-w-[1440px]">
            {children}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)] lg:hidden">
          <div className="grid grid-cols-5 gap-1 overflow-x-auto px-2 py-2 text-[11px] text-slate-500">
            {navigation.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-[72px] flex-col items-center gap-1 rounded-[8px] px-2 py-2 ${
                    active ? "text-[var(--accent-sage)]" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="truncate">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {searchOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-24 backdrop-blur-sm">
            <div className="w-full max-w-[560px] rounded-[16px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-4">
                <Search className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveResult(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveResult((current) => Math.min(current + 1, filteredShortcuts.length - 1));
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveResult((current) => Math.max(current - 1, 0));
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const selected = filteredShortcuts[activeResult];
                      if (selected) {
                        setSearchOpen(false);
                        router.push(selected.href);
                      }
                    }
                  }}
                  placeholder="Search patients, records, appointments..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                  <X className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                </button>
              </div>
              <div className="max-h-[400px] overflow-auto p-2">
                {filteredShortcuts.length ? (
                  filteredShortcuts.map((item, index) => (
                    <button
                      key={item.href + item.label}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(item.href);
                      }}
                      className={`flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left transition-colors ${
                        index === activeResult ? "bg-[#FAFBFC]" : "hover:bg-[#FAFBFC]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-sm text-slate-500">No matching quick actions found.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {notificationsOpen ? (
          <div className="fixed right-4 top-16 z-40 w-[360px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <button type="button" className="text-sm text-[var(--accent-sage)] hover:underline">
                Mark all as read
              </button>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {notifications.map((item) => (
                <div
                  key={item.title}
                  className={`flex gap-3 px-4 py-3 ${item.unread ? "border-l-2 border-[var(--accent-sage)] bg-[rgba(107,144,128,0.04)]" : ""}`}
                >
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#FAFBFC] text-[var(--accent-sage)]">
                    <Bell className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E5E7EB] px-4 py-3">
              <Link href="/dashboard" className="text-sm text-[var(--accent-sage)] hover:underline">
                View all notifications
              </Link>
            </div>
          </div>
        ) : null}

        {confirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
            <div className="w-full max-w-[400px] rounded-[16px] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-center">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ${confirm.tone === "destructive" ? "bg-[rgba(239,68,68,0.10)] text-[#DC2626]" : "bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"}`}>
                  <CircleHelp className="h-6 w-6" strokeWidth={1.5} />
                </span>
              </div>
              <h3 className="mt-4 text-center text-lg font-semibold text-slate-900">{confirm.title}</h3>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">{confirm.description}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="flex-1 rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirm.onConfirm?.();
                    closeConfirm();
                  }}
                  className={`flex-1 rounded-[12px] px-4 py-3 text-sm font-medium text-white transition-colors ${
                    confirm.tone === "destructive"
                      ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                      : "bg-[#6B9080] hover:bg-[#5f8273]"
                  }`}
                >
                  {confirm.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="fixed right-4 top-20 z-40 space-y-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} />
          ))}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}

function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const styles: Record<ToastType, string> = {
    success: "border-l-[#22C55E]",
    error: "border-l-[#EF4444]",
    info: "border-l-[#7A9CC6]",
  };

  const colors: Record<ToastType, LucideIcon> = {
    success: Bell,
    error: X,
    info: CircleHelp,
  };

  const Icon = colors[toast.type];

  return (
    <div className={`w-[320px] rounded-[12px] border border-[#E5E7EB] border-l-4 bg-white p-4 shadow-[0_20px_40px_rgba(0,0,0,0.08)] ${styles[toast.type]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-slate-500">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{toast.title}</p>
          <p className="mt-1 text-sm text-slate-500">{toast.message}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close toast" className="text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full w-full animate-[toast-shrink_4s_linear_forwards] bg-[#E5E7EB]" />
      </div>
    </div>
  );
}
