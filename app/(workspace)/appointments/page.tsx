"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  RefreshCcw,
  X,
} from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import {
  AvatarInitials,
  Badge,
  FilterPill,
  SectionHeader,
  WorkspaceCard,
} from "../../components/workspace-ui";
import AppointmentModal from "../../components/modal/AppointmentModal";
import type { AppointmentData } from "../../components/modal/AppointmentModal";
import {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getPatients,
  mapAppointmentToUi,
  type PatientOption,
  type UiAppointment,
  updateAppointment,
} from "../../../lib/api";

type CalendarMode = "month" | "week" | "day";
type AppointmentEntry = {
  item: UiAppointment;
  when: Date;
  dayKey: string;
};

const WEEK_STARTS_ON = 0 as const;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const STATUS_FILTERS = ["", "Confirmed", "Pending", "Completed", "Cancelled"] as const;

const extractAppointmentRows = (resp: unknown): Record<string, unknown>[] => {
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  if (!resp || typeof resp !== "object") return [];
  const record = resp as Record<string, unknown>;
  const raw = record.appointments ?? record.results ?? record.data ?? [];
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
};

const extractPatientRows = (resp: unknown): Record<string, unknown>[] => {
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  if (!resp || typeof resp !== "object") return [];
  const record = resp as Record<string, unknown>;
  const raw = record.patients ?? record.results ?? record.data ?? [];
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
};

const toAppointmentDate = (item: UiAppointment) => {
  const parsed = item.scheduledAtIso ? parseISO(item.scheduledAtIso) : new Date(`${item.date}T${item.time}:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date(`${item.date}T${item.time}:00`);
};

const getStatusTone = (status: UiAppointment["status"]) => {
  if (status === "Confirmed") return "green" as const;
  if (status === "Pending") return "amber" as const;
  if (status === "Cancelled") return "red" as const;
  return "neutral" as const;
};

const getStatusAccent = (item: UiAppointment) => {
  if (item.priority === "Urgent") return "border-l-[#C2410C] bg-[rgba(249,115,22,0.10)] text-[#9A3412]";
  if (item.status === "Confirmed") return "border-l-[#15803D] bg-[rgba(34,197,94,0.10)] text-[#166534]";
  if (item.status === "Cancelled") return "border-l-[#B91C1C] bg-[rgba(239,68,68,0.10)] text-[#991B1B]";
  if (item.status === "Completed") return "border-l-[#475569] bg-[rgba(148,163,184,0.12)] text-[#334155]";
  return "border-l-[#D97706] bg-[rgba(245,158,11,0.12)] text-[#92400E]";
};

const formatCalendarHeading = (mode: CalendarMode, value: Date) => {
  if (mode === "week") {
    const weekStart = startOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
    const weekEnd = endOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }
  if (mode === "day") {
    return format(value, "EEEE, MMM d, yyyy");
  }
  return format(value, "MMMM yyyy");
};

const formatLoadedRange = (start: Date, end: Date) =>
  `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;

const formatAppointmentDateTime = (item: UiAppointment) =>
  format(toAppointmentDate(item), "EEE, MMM d, yyyy 'at' h:mm a");

const formatTimestamp = (value: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export default function AppointmentsPage() {
  const { pushToast, requestConfirm } = useWorkspace();
  const router = useRouter();
  const [view, setView] = useState<"List" | "Calendar" | "Timeline">("Calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selected, setSelected] = useState<UiAppointment | null>(null);
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAppt, setShowAppt] = useState(false);
  const [apptInitial, setApptInitial] = useState<AppointmentData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalKey, setModalKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("");
  const [patients, setPatients] = useState<PatientOption[]>([]);

  const fetchRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarDate), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(calendarDate), { weekStartsOn: WEEK_STARTS_ON });
    return {
      start,
      end,
      startKey: format(start, "yyyy-MM-dd"),
      endKey: format(end, "yyyy-MM-dd"),
    };
  }, [calendarDate]);

  const calendarHeading = useMemo(
    () => formatCalendarHeading(calendarMode, calendarMode === "day" ? selectedDate : calendarDate),
    [calendarDate, calendarMode, selectedDate]
  );

  const loadAppointments = useCallback(
    async (options?: { selectionId?: string | null; background?: boolean }) => {
      if (options?.background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const resp = (await getAppointments({
          start_date: fetchRange.startKey,
          end_date: fetchRange.endKey,
          limit: 1000,
        })) as unknown;
        const rows = extractAppointmentRows(resp);
        const nextAppointments = rows.map(mapAppointmentToUi);
        setAppointments(nextAppointments);
        if (options?.selectionId) {
          setSelected(nextAppointments.find((item) => item.id === options.selectionId) || null);
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message || "Unable to load appointments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchRange.endKey, fetchRange.startKey]
  );

  const loadLookupData = useCallback(async () => {
    try {
      const patientResp = (await getPatients("?limit=200")) as unknown;
      const patientRows = extractPatientRows(patientResp);
      const patientOptions: PatientOption[] = patientRows
        .map((item) => ({
          id: String(item.patient_id || ""),
          name: `${String(item.first_name || "")} ${String(item.last_name || "")}`.trim(),
        }))
        .filter((item) => item.id && item.name);
      setPatients(patientOptions);
    } catch {
      setPatients([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAppointments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAppointments]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLookupData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLookupData]);

  const appointmentEntries = useMemo(() => {
    const mapped = appointments
      .map((item) => {
        const when = toAppointmentDate(item);
        return {
          item,
          when,
          dayKey: format(when, "yyyy-MM-dd"),
        };
      })
      .filter((entry) => !Number.isNaN(entry.when.getTime()));

    mapped.sort((a, b) => a.when.getTime() - b.when.getTime());
    return mapped;
  }, [appointments]);

  const filteredEntries = useMemo(
    () => (statusFilter ? appointmentEntries.filter((entry) => entry.item.status === statusFilter) : appointmentEntries),
    [appointmentEntries, statusFilter]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentEntry[]>();
    filteredEntries.forEach((entry) => {
      const list = map.get(entry.dayKey);
      if (list) {
        list.push(entry);
      } else {
        map.set(entry.dayKey, [entry]);
      }
    });
    return map;
  }, [filteredEntries]);

  const selectedDayEntries = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");
    return appointmentsByDay.get(key) || [];
  }, [appointmentsByDay, selectedDate]);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: fetchRange.start, end: fetchRange.end }),
    [fetchRange.end, fetchRange.start]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(calendarDate, { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end: endOfWeek(calendarDate, { weekStartsOn: WEEK_STARTS_ON }) });
  }, [calendarDate]);

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, { date: Date; entries: AppointmentEntry[] }>();
    filteredEntries.forEach((entry) => {
      const existing = groups.get(entry.dayKey);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.set(entry.dayKey, { date: entry.when, entries: [entry] });
      }
    });
    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredEntries]);

  const summary = useMemo(
    () => ({
      total: filteredEntries.length,
      pending: filteredEntries.filter((entry) => entry.item.status === "Pending").length,
      completed: filteredEntries.filter((entry) => entry.item.status === "Completed").length,
      urgent: filteredEntries.filter((entry) => entry.item.priority === "Urgent").length,
    }),
    [filteredEntries]
  );

  const toModalInitial = (item: UiAppointment): AppointmentData => ({
    patient: { id: item.patientId, name: item.name },
    appointmentType: item.type === "Telehealth" ? "Telehealth" : "In-Person",
    date: item.date,
    time: item.time,
    duration: item.durationMinutes,
    reason: item.reason,
    priority: item.priority,
    sendEmailReminder: item.sendEmailReminder,
    sendSmsReminder: item.sendSmsReminder,
    sendConfirmation: item.sendConfirmation,
    internalNotes: item.internalNotes,
    status: item.status,
  });

  const handleSelectDate = (value: Date) => {
    setSelectedDate(value);
    setCalendarDate(value);
    if (calendarMode === "day") {
      setSelected(null);
    }
  };

  const handleShiftCalendar = (direction: -1 | 1) => {
    if (calendarMode === "week") {
      const nextDate = direction > 0 ? addWeeks(calendarDate, 1) : subWeeks(calendarDate, 1);
      setCalendarDate(nextDate);
      setSelectedDate(nextDate);
      return;
    }
    if (calendarMode === "day") {
      const nextDate = direction > 0 ? addDays(selectedDate, 1) : subDays(selectedDate, 1);
      setCalendarDate(nextDate);
      setSelectedDate(nextDate);
      return;
    }
    const nextDate = direction > 0 ? addMonths(calendarDate, 1) : subMonths(calendarDate, 1);
    setCalendarDate(nextDate);
    setSelectedDate(nextDate);
  };

  const handleModalSubmit = async (data: AppointmentData) => {
    const payload = {
      patient_id: data.patient?.id || "",
      patient_name: data.patient?.name || "",
      appointment_type: data.appointmentType || "In-Person",
      date: data.date || "",
      time: data.time || "",
      duration_minutes: Number(data.duration || 30),
      reason: data.reason || "",
      priority: data.priority || "Routine",
      send_email_reminder: !!data.sendEmailReminder,
      send_sms_reminder: !!data.sendSmsReminder,
      send_confirmation: data.sendConfirmation !== false,
      internal_notes: data.internalNotes || "",
      status: data.status || "Pending",
    };

    const nextDate = data.date ? new Date(`${data.date}T12:00:00`) : null;
    const monthWillChange =
      !!nextDate &&
      (nextDate.getFullYear() !== calendarDate.getFullYear() ||
        nextDate.getMonth() !== calendarDate.getMonth());

    if (modalMode === "edit" && selected?.id) {
      await updateAppointment(selected.id, payload);
      pushToast({
        type: "success",
        title: "Appointment updated",
        message: `${data.patient?.name || "Appointment"} moved to ${payload.date} ${payload.time}.`,
      });
    } else {
      await createAppointment(payload);
      pushToast({
        type: "success",
        title: "Appointment booked",
        message: `${data.patient?.name || "Patient"} scheduled for ${payload.date} ${payload.time}.`,
      });
    }

    if (nextDate) {
      setSelectedDate(nextDate);
      setCalendarDate(nextDate);
    }

    setShowAppt(false);
    setApptInitial(null);
    setModalMode("create");
    if (!monthWillChange) {
      await loadAppointments({ selectionId: selected?.id || null, background: true });
    }
  };

  const handleCancel = async () => {
    if (!selected?.id) return;
    await cancelAppointment(selected.id, "Cancelled from appointments detail");
    pushToast({
      type: "success",
      title: "Appointment cancelled",
      message: `${selected.name}'s appointment has been cancelled.`,
    });
    await loadAppointments({ selectionId: selected.id, background: true });
  };

  const confirmCancel = () => {
    if (!selected?.id) return;
    requestConfirm({
      title: "Cancel appointment?",
      description: `This will cancel ${selected.name}'s appointment on ${formatAppointmentDateTime(selected)}. This action can be reviewed and adjusted later.`,
      confirmLabel: "Cancel appointment",
      tone: "destructive",
      onConfirm: () => {
        void handleCancel();
      },
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            title="Appointments"
            subtitle="List, calendar, and timeline views connected to live clinic scheduling data."
          />
          <div className="flex flex-wrap gap-2">
            {(["List", "Calendar", "Timeline"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  view === item
                    ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                    : "border-[#E5E7EB] text-slate-600 hover:bg-[#F3F4F6]"
                }`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setModalMode("create");
                setApptInitial(null);
                setModalKey((key) => key + 1);
                setShowAppt(true);
              }}
              className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="mr-2 inline h-4 w-4" strokeWidth={1.5} />
              New Appointment
            </button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <FilterPill
                key={item || "all"}
                active={statusFilter === item}
                onClick={() => setStatusFilter(item)}
              >
                {item || "All"}
              </FilterPill>
            ))}
            <button
              type="button"
              onClick={() => void loadAppointments({ selectionId: selected?.id, background: true })}
              className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600 hover:bg-[#F3F4F6]"
            >
              <RefreshCcw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.5} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-[14px] bg-[#FAFBFC] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total</p>
              <p className="mt-1 font-semibold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-[14px] bg-[#FAFBFC] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pending</p>
              <p className="mt-1 font-semibold text-slate-900">{summary.pending}</p>
            </div>
            <div className="rounded-[14px] bg-[#FAFBFC] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Completed</p>
              <p className="mt-1 font-semibold text-slate-900">{summary.completed}</p>
            </div>
            <div className="rounded-[14px] bg-[#FAFBFC] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Urgent</p>
              <p className="mt-1 font-semibold text-slate-900">{summary.urgent}</p>
            </div>
          </div>
        </div>
      </WorkspaceCard>

      {error ? (
        <WorkspaceCard className="p-6">
          <p className="text-sm text-red-600">{error}</p>
        </WorkspaceCard>
      ) : null}

      {view === "List" ? (
        <WorkspaceCard className="overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-6 py-5">
            <SectionHeader
              title="Appointment List"
              subtitle={`Loaded ${formatLoadedRange(fetchRange.start, fetchRange.end)}`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white uppercase tracking-[0.16em] text-[#9CA3AF]">
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Time</th>
                  <th className="px-4 py-4">Patient</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Reason</th>
                  <th className="px-4 py-4">Priority</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Duration</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={9}>
                      Loading appointments...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={9}>
                      No appointments found for this range and filter.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(({ item }) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="cursor-pointer border-b border-[#F3F4F6] hover:bg-[#FAFBFC]"
                    >
                      <td className="px-4 py-4 text-slate-600">{format(toAppointmentDate(item), "MMM d, yyyy")}</td>
                      <td className="px-4 py-4 text-slate-600">{format(toAppointmentDate(item), "h:mm a")}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarInitials
                            initials={item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                            size={34}
                          />
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={item.type === "Telehealth" ? "blue" : "neutral"}>{item.type}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.reason || "General consultation"}</td>
                      <td className="px-4 py-4">
                        <Badge tone={item.priority === "Urgent" ? "amber" : "neutral"}>{item.priority}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.duration}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(item);
                          }}
                          className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6] hover:text-slate-700"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </WorkspaceCard>
      ) : view === "Calendar" ? (
        <WorkspaceCard className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SectionHeader
              title="Calendar"
              subtitle={`${calendarHeading} · Loaded ${formatLoadedRange(fetchRange.start, fetchRange.end)}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-[#E5E7EB] p-1">
                {(["month", "week", "day"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setCalendarMode(mode);
                      if (mode === "day") {
                        setCalendarDate(selectedDate);
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                      calendarMode === mode
                        ? "bg-[rgba(107,144,128,0.10)] text-[var(--accent-sage)]"
                        : "text-slate-500 hover:bg-[#F3F4F6]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCalendarDate(today);
                  setSelectedDate(today);
                }}
                className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm text-slate-600 hover:bg-[#F3F4F6]"
              >
                Today
              </button>
              <div className="flex rounded-full border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => handleShiftCalendar(-1)}
                  className="rounded-l-full px-3 py-2 text-slate-600 hover:bg-[#F3F4F6]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftCalendar(1)}
                  className="rounded-r-full px-3 py-2 text-slate-600 hover:bg-[#F3F4F6]"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="min-w-0">
              {calendarMode === "month" ? (
                <div>
                  <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-slate-400">
                    {WEEKDAY_LABELS.map((label) => (
                      <div key={label} className="px-2 py-2">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                    {monthDays.map((day) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayEntries = appointmentsByDay.get(dayKey) || [];
                      const isSelected = isSameDay(day, selectedDate);
                      return (
                        <div
                          key={dayKey}
                          className={`min-h-40 rounded-[16px] border p-3 transition-colors ${
                            isSelected
                              ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.06)]"
                              : "border-[#F3F4F6] bg-white"
                          } ${!isSameMonth(day, calendarDate) ? "opacity-55" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectDate(day)}
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                                isToday(day)
                                  ? "bg-[var(--accent-sage)] text-white"
                                  : isSelected
                                    ? "bg-[rgba(107,144,128,0.12)] text-[var(--accent-sage)]"
                                    : "text-slate-700"
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                            {dayEntries.length > 0 ? (
                              <span className="rounded-full bg-[#FAFBFC] px-2 py-1 text-[11px] text-slate-500">
                                {dayEntries.length}
                              </span>
                            ) : null}
                          </button>
                          <div className="mt-3 space-y-1.5">
                            {dayEntries.slice(0, 3).map(({ item }) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelected(item)}
                                className={`w-full rounded-[12px] border-l-4 px-3 py-2 text-left text-xs transition-transform hover:-translate-y-0.5 ${getStatusAccent(item)}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-medium">{item.time}</span>
                                  {item.priority === "Urgent" ? <span className="text-[10px] uppercase">Urgent</span> : null}
                                </div>
                                <p className="mt-1 truncate text-[11px]">{item.name}</p>
                              </button>
                            ))}
                            {dayEntries.length > 3 ? (
                              <button
                                type="button"
                                onClick={() => handleSelectDate(day)}
                                className="text-xs font-medium text-[var(--accent-sage)] hover:underline"
                              >
                                +{dayEntries.length - 3} more appointments
                              </button>
                            ) : null}
                            {dayEntries.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleSelectDate(day)}
                                className="rounded-[12px] border border-dashed border-[#E5E7EB] px-3 py-5 text-left text-xs text-slate-400 hover:bg-[#FAFBFC]"
                              >
                                No appointments
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : calendarMode === "week" ? (
                <div className="grid gap-3 xl:grid-cols-7">
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayEntries = appointmentsByDay.get(dayKey) || [];
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <div
                        key={dayKey}
                        className={`overflow-hidden rounded-[16px] border p-4 ${
                          isSelected
                            ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.06)]"
                            : "border-[#F3F4F6] bg-white"
                        }`}
                      >
                        <button type="button" onClick={() => handleSelectDate(day)} className="w-full text-left">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{format(day, "EEE")}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-lg font-semibold text-slate-900">{format(day, "d")}</p>
                            <span className="text-xs text-slate-400">{dayEntries.length} appt</span>
                          </div>
                        </button>
                        <div className="mt-4 space-y-2">
                          {dayEntries.length === 0 ? (
                            <div className="rounded-[12px] border border-dashed border-[#E5E7EB] px-3 py-4 text-xs text-slate-400">
                              Open schedule
                            </div>
                          ) : (
                            dayEntries.map(({ item }) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelected(item)}
                                className={`w-full overflow-hidden rounded-[12px] border-l-4 px-3 py-2 text-left text-xs ${getStatusAccent(item)}`}
                              >
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  <span className="font-medium">{item.time}</span>
                                </div>
                                <p className="mt-1 truncate">{item.name}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[16px] border border-[#F3F4F6] bg-white p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Selected Day</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{format(selectedDate, "EEEE, MMM d")}</p>
                    </div>
                    <Badge tone="neutral">{selectedDayEntries.length} appointments</Badge>
                  </div>
                  <div className="mt-5 space-y-3">
                    {selectedDayEntries.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-8 text-center text-sm text-slate-500">
                        No appointments scheduled for this day.
                      </div>
                    ) : (
                      selectedDayEntries.map(({ item }) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelected(item)}
                          className="flex w-full items-start justify-between gap-4 rounded-[14px] border border-[#E5E7EB] px-4 py-4 text-left transition-colors hover:bg-[#FAFBFC]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                              {item.priority === "Urgent" ? <Badge tone="amber">Urgent</Badge> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{item.reason || item.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{format(toAppointmentDate(item), "h:mm a")}</p>
                            <p className="text-xs text-slate-400">{item.duration}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[18px] border border-[#F3F4F6] bg-[#FCFCFB] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Day Detail</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{format(selectedDate, "EEEE, MMM d, yyyy")}</h3>
                </div>
                <Badge tone="neutral">{selectedDayEntries.length} scheduled</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {selectedDayEntries.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-white p-6 text-sm text-slate-500">
                    No appointments on this date. Choose another day or create a new visit.
                  </div>
                ) : (
                  selectedDayEntries.map(({ item }) => (
                    <button
                      key={`${item.id}-sidebar`}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="w-full overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white p-4 text-left transition-colors hover:bg-[#FAFBFC]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="truncate font-medium text-slate-900">{item.name}</p>
                            <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.reason || item.type}</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="font-medium text-slate-900">{format(toAppointmentDate(item), "h:mm a")}</p>
                          <p className="text-xs text-slate-400">{item.duration}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{item.type}</span>
                        <span>{item.priority}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </WorkspaceCard>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <WorkspaceCard className="p-6 text-sm text-slate-500">Loading appointments...</WorkspaceCard>
          ) : timelineGroups.length === 0 ? (
            <WorkspaceCard className="p-6 text-sm text-slate-500">
              No appointments found for this range and filter.
            </WorkspaceCard>
          ) : (
            timelineGroups.map((group) => (
              <WorkspaceCard key={group.date.toISOString()} className="p-6">
                <SectionHeader
                  title={format(group.date, "EEEE")}
                  subtitle={`${format(group.date, "MMMM d, yyyy")} · ${group.entries.length} appointments`}
                />
                <div className="mt-5 space-y-3">
                  {group.entries.map(({ item }) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex w-full items-center justify-between rounded-[14px] border border-[#E5E7EB] px-4 py-4 text-left transition-colors hover:bg-[#FAFBFC]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="w-20 text-sm font-medium text-slate-900">{format(toAppointmentDate(item), "h:mm a")}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-slate-900">{item.name}</p>
                            <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                            {item.priority === "Urgent" ? <Badge tone="amber">Urgent</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.reason || item.type}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{item.type}</p>
                        <p className="text-xs text-slate-400">{item.duration}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </WorkspaceCard>
            ))
          )}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[680px] rounded-[18px] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Appointment Detail</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{selected.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={getStatusTone(selected.status)}>{selected.status}</Badge>
                  <Badge tone={selected.type === "Telehealth" ? "blue" : "neutral"}>{selected.type}</Badge>
                  {selected.priority === "Urgent" ? <Badge tone="amber">Urgent</Badge> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Date/Time", formatAppointmentDateTime(selected)],
                ["Duration", selected.duration],
                ["Reason", selected.reason || "General consultation"],
                ["Priority", selected.priority],
                ["Reminders", selected.sendEmailReminder || selected.sendSmsReminder ? "Enabled" : "Not enabled"],
                ["Internal Notes", selected.internalNotes || "No internal notes"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] bg-[#FAFBFC] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[12px] border border-[#E5E7EB] p-4">
              <p className="text-sm font-medium text-slate-900">Appointment Activity</p>
              <div className="mt-3 space-y-2 text-sm text-slate-500">
                <p>Created · {formatTimestamp(selected.createdAt)}</p>
                <p>Last updated · {formatTimestamp(selected.updatedAt)}</p>
                {selected.cancelledAt ? <p>Cancelled · {formatTimestamp(selected.cancelledAt)}</p> : null}
                {selected.cancelReason ? <p>Cancellation note · {selected.cancelReason}</p> : null}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setApptInitial(toModalInitial(selected));
                  setModalMode("edit");
                  setModalKey((key) => key + 1);
                  setShowAppt(true);
                }}
                className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm hover:bg-[#F3F4F6]"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={selected.status === "Cancelled"}
                className="rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              {selected.type === "Telehealth" ? (
                <button
                  type="button"
                  onClick={() => router.push(`/telehealth/${encodeURIComponent(selected.id)}`)}
                  className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white"
                >
                  Start Telehealth
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <AppointmentModal
        key={modalKey}
        isOpen={showAppt}
        onClose={() => setShowAppt(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        initialData={apptInitial}
        patients={patients}
      />
    </div>
  );
}
