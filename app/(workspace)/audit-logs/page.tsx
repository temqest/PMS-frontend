"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Eye, FileSearch, Search, ShieldCheck, X } from "lucide-react";

import api, { type AuditLogItem } from "../../../lib/api";
import {
  Badge,
  EmptyState,
  SectionHeader,
  WorkspaceCard,
} from "../../components/workspace-ui";
import { useWorkspace } from "../../components/workspace-shell";

const actionOptions = [
  "",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "CREATE_PATIENT",
  "UPDATE_PATIENT",
  "DELETE_PATIENT",
  "VIEW_PATIENT",
  "CREATE_HEALTH_RECORD",
  "UPDATE_HEALTH_RECORD",
  "DELETE_HEALTH_RECORD",
  "VIEW_HEALTH_RECORD",
  "CREATE_APPOINTMENT",
  "UPDATE_APPOINTMENT",
  "CANCEL_APPOINTMENT",
  "CREATE_PRESCRIPTION",
  "UPDATE_PRESCRIPTION",
  "DELETE_PRESCRIPTION",
  "CREATE_PRESCRIPTION_INVOICE",
  "UPDATE_PRESCRIPTION_INVOICE_STATUS",
  "START_TELEHEALTH_CALL",
  "END_TELEHEALTH_CALL",
  "CREATE_API_KEY",
  "UPDATE_API_KEY",
  "REVOKE_API_KEY",
  "ROTATE_API_KEY",
  "DELETE_API_KEY",
];

const entityOptions = ["", "Auth", "User", "Patient", "Appointment", "Health Record", "Prescription", "Prescription Invoice", "API Key"];

type Filters = {
  search: string;
  action_type: string;
  subsystem: string;
  user_id: string;
  start_date: string;
  end_date: string;
};

const initialFilters: Filters = {
  search: "",
  action_type: "",
  subsystem: "",
  user_id: "",
  start_date: "",
  end_date: "",
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const prettify = (value = "") => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const actionTone = (action: string): "neutral" | "sage" | "blue" | "amber" | "red" | "green" => {
  if (action.includes("DELETE") || action.includes("CANCEL") || action.includes("FAILED") || action.includes("REVOKE")) return "red";
  if (action.includes("CREATE") || action === "LOGIN" || action.includes("START")) return "green";
  if (action.includes("UPDATE") || action.includes("ROTATE")) return "amber";
  if (action.includes("VIEW")) return "blue";
  return "sage";
};

const entityTone = (entityType: string): "neutral" | "sage" | "blue" | "amber" | "red" | "green" => {
  const normalized = entityType.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "patient") return "sage";
  if (normalized === "health_record" || normalized === "prescription") return "blue";
  if (normalized === "api_key") return "amber";
  if (normalized === "appointment") return "green";
  return "neutral";
};

export default function AuditLogsPage() {
  const { pushToast } = useWorkspace();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });

  const queryParams = useMemo(() => ({
    page,
    limit: 25,
    search: appliedFilters.search || undefined,
    action_type: appliedFilters.action_type || undefined,
    subsystem: appliedFilters.subsystem || undefined,
    user_id: appliedFilters.user_id || undefined,
    start_date: appliedFilters.start_date || undefined,
    end_date: appliedFilters.end_date || undefined,
  }), [appliedFilters, page]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      try {
        setLoading(true);
        const response = await api.getAuditLogs(queryParams);
        if (cancelled) return;
        setLogs(response.data?.audit_logs || []);
        setPagination({
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1,
          limit: response.pagination?.limit || 25,
        });
      } catch (error) {
        if (!cancelled) {
          pushToast({
            type: "error",
            title: "Audit logs unavailable",
            message: error instanceof Error ? error.message : "Unable to load audit logs.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAuditLogs();
    return () => {
      cancelled = true;
    };
  }, [pushToast, queryParams]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const openDetails = async (item: AuditLogItem) => {
    try {
      setDetailLoading(true);
      setSelectedLog(item);
      const response = await api.getAuditLog(item._id);
      setSelectedLog(response.audit_log || item);
    } catch (error) {
      pushToast({
        type: "error",
        title: "Unable to load details",
        message: error instanceof Error ? error.message : "The audit log details could not be loaded.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionHeader
            title="Audit Logs"
            subtitle="Review security, clinical, and system activity across the main application."
          />
          <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-2 text-sm text-slate-600">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-sage)]" strokeWidth={1.5} />
            Admin-only, read-only trail
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Search actor, entity, action..."
              className="h-11 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-10 text-sm text-slate-900 outline-none focus:border-[var(--accent-sage)] focus:ring-2 focus:ring-[rgba(107,144,128,0.16)]"
            />
          </label>

          <select value={filters.action_type} onChange={(event) => setFilters((current) => ({ ...current, action_type: event.target.value }))} className="h-11 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--accent-sage)]">
            {actionOptions.map((action) => <option key={action || "all-actions"} value={action}>{action ? prettify(action) : "All actions"}</option>)}
          </select>

          <select value={filters.subsystem} onChange={(event) => setFilters((current) => ({ ...current, subsystem: event.target.value }))} className="h-11 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--accent-sage)]">
            {entityOptions.map((entity) => <option key={entity || "all-entities"} value={entity}>{entity ? prettify(entity) : "All entities"}</option>)}
          </select>

          <input value={filters.user_id} onChange={(event) => setFilters((current) => ({ ...current, user_id: event.target.value }))} placeholder="Filter by user ID" className="h-11 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--accent-sage)]" />
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-3">
              <CalendarDays className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              <input type="date" value={filters.start_date} onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))} className="h-10 bg-transparent text-sm text-slate-700 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-3">
              <CalendarDays className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              <input type="date" value={filters.end_date} onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))} className="h-10 bg-transparent text-sm text-slate-700 outline-none" />
            </label>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={resetFilters} className="rounded-[8px] border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600 hover:bg-[#F3F4F6]">Reset</button>
            <button type="button" onClick={applyFilters} className="rounded-[8px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a7d6f]">Apply filters</button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[var(--accent-sage)]" />
            Loading audit activity...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FileSearch} title="No audit logs found" description="Try changing filters or perform an auditable action such as viewing a patient profile." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-white text-[12px] uppercase tracking-[0.16em] text-[#9CA3AF]">
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-4 py-4 font-semibold">Time</th>
                  <th className="px-4 py-4 font-semibold">Actor</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                  <th className="px-4 py-4 font-semibold">Entity</th>
                  <th className="px-4 py-4 font-semibold">Description</th>
                  <th className="px-4 py-4 font-semibold">Source</th>
                  <th className="px-4 py-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item._id} className="border-b border-[#F3F4F6] transition-colors hover:bg-[#FAFBFC]">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-900">{item.user_id || "System"}</p>
                    </td>
                    <td className="px-4 py-4"><Badge tone={actionTone(item.action_type)}>{prettify(item.action_type)}</Badge></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <Badge tone={entityTone(item.subsystem)}>{prettify(item.subsystem)}</Badge>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-4 py-4 text-sm text-slate-600">{item.details || "-"}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{item.ip_addr || "-"}</td>
                    <td className="px-4 py-4">
                      <button type="button" onClick={() => void openDetails(item)} className="inline-flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] px-3 py-2 text-sm text-slate-600 hover:bg-[#F3F4F6]">
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WorkspaceCard>

      <div className="flex flex-col gap-3 rounded-[12px] border border-[#E5E7EB] bg-white p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{pagination.total} total audit events</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-[8px] border border-[#E5E7EB] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <span>Page {page} of {pagination.pages}</span>
          <button type="button" disabled={page >= pagination.pages || loading} onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))} className="rounded-[8px] border border-[#E5E7EB] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[16px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Activity className="h-5 w-5 text-[var(--accent-sage)]" strokeWidth={1.5} />
                  <h2 className="text-lg font-semibold text-slate-900">{prettify(selectedLog.action_type)}</h2>
                  {detailLoading ? <span className="text-xs text-slate-400">Loading details...</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(selectedLog.created_at)} · {selectedLog.user_id || "System"}</p>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6] hover:text-slate-700" aria-label="Close audit details">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <WorkspaceCard className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Actor</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{selectedLog.user_id || "System"}</p>
                  <p className="mt-1 text-sm text-slate-500">user_id</p>
                </WorkspaceCard>
                <WorkspaceCard className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Entity</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{prettify(selectedLog.subsystem)}</p>
                  <p className="mt-1 text-sm text-slate-500">subsystem</p>
                </WorkspaceCard>
              </div>

              <WorkspaceCard className="mt-4 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Description</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLog.details || "No details provided."}</p>
                <p className="mt-3 text-xs text-slate-400">IP: {selectedLog.ip_addr || "-"}</p>
              </WorkspaceCard>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
