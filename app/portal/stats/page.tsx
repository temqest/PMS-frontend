"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, CartesianGrid, BarChart, Bar } from "recharts";
import { Activity, TrendingUp } from "lucide-react";

import { Badge, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import { getMyAppointments, getMyHealthRecords } from "../../../lib/patient-api";
import { getSessionClaims } from "../../../lib/session";

type Appointment = Record<string, unknown>;
type RecordItem = Record<string, unknown>;

const colors = ["#6B9080", "#7A9CC6", "#D4A373", "#C45B5B", "#9CA3AF"];

const monthKey = (value?: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export default function PatientStatsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const claims = getSessionClaims();
  const isUnlinked = !claims?.patient_id;

  useEffect(() => {
    (async () => {
      if (isUnlinked) {
        setLoading(false);
        return;
      }

      try {
        const [appointmentResp, recordResp] = await Promise.all([getMyAppointments({ limit: 200 }), getMyHealthRecords({ limit: 200 })]);
        setAppointments(Array.isArray(appointmentResp?.appointments) ? appointmentResp.appointments : []);
        setRecords(Array.isArray(recordResp?.records) ? recordResp.records : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnlinked]);

  const visitsOverTime = useMemo(() => {
    const buckets = new Map<string, number>();
    records.forEach((record) => {
      const key = monthKey(String(record.record_date || record.dateIso || ""));
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return Array.from(buckets.entries()).map(([month, visits]) => ({ month, visits })).slice(-6);
  }, [records]);

  const recordCategoryData = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      const label = String(record.record_type || "Other");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [records]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    appointments.forEach((appointment) => {
      const label = String(appointment.status || "Pending");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const medicationOverview = useMemo(() => {
    const meds = new Map<string, number>();
    records.forEach((record) => {
      if (String(record.record_type || "") !== "Prescription") return;
      const details = (record.details as Record<string, unknown>) || {};
      const medication = String(details.medicationName || details.prescriptionMedicationName || details.title || "Medication");
      meds.set(medication, (meds.get(medication) || 0) + 1);
    });
    return Array.from(meds.entries()).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [records]);

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your health summary…</WorkspaceCard>;
  }

  if (isUnlinked) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="Health stats" subtitle="Aggregated insights will appear after your chart is linked." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          The account is active, but there is no patient chart linked yet, so there is nothing to aggregate.
        </div>
      </WorkspaceCard>
    );
  }

  const totalVisits = records.length;
  const appointmentRequests = appointments.filter((item) => String(item.status || "Pending") === "Pending").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total records", String(totalVisits)],
          ["Appointment requests", String(appointmentRequests)],
          ["Record categories", String(recordCategoryData.length)],
          ["Current focus", records.length ? String(records[0]?.record_type || "Review") : "Review"],
        ].map(([label, value]) => (
          <WorkspaceCard key={label} className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          </WorkspaceCard>
        ))}
      </div>

      <WorkspaceCard className="p-6">
        <SectionHeader title="Health stats" subtitle="Simple summaries generated from your own chart data." action={<Badge tone="sage">Patient only</Badge>} />
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Visits over time" subtitle="Record volume by month." />
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitsOverTime}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#6B9080" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Record categories" subtitle="The types of records in your chart." />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recordCategoryData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={102} paddingAngle={3}>
                    {recordCategoryData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {recordCategoryData.length ? recordCategoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                    <span className="text-sm font-medium text-slate-900">{item.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{item.value}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No record categories available yet.</p>}
            </div>
          </div>
        </WorkspaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceCard className="p-6">
          <SectionHeader title="Appointment status" subtitle="Current request and visit states." />
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#7A9CC6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Medication history" subtitle="Prescription entries seen in your records." />
          <div className="mt-6 space-y-3">
            {medicationOverview.length ? medicationOverview.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] p-4">
                <span className="text-sm font-medium text-slate-900">{item.name}</span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-500"><Activity className="h-4 w-4 text-[var(--accent-sage)]" strokeWidth={1.75} />{item.value} record{item.value > 1 ? "s" : ""}</span>
              </div>
            )) : <p className="text-sm text-slate-500">No prescription history has been recorded yet.</p>}
          </div>

          <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <TrendingUp className="h-4 w-4 text-[var(--accent-sage)]" strokeWidth={1.75} />
              Summary insight
            </div>
            <p className="mt-2 leading-6">Your portal is showing aggregated counts only. If richer analytics become available later, this page can expand without changing your access model.</p>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}