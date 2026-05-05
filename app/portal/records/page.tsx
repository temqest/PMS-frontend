"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Paperclip, Search } from "lucide-react";

import { Badge, EmptyState, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import { getMyHealthRecords } from "../../../lib/patient-api";
import { getSessionClaims } from "../../../lib/session";

type RecordItem = Record<string, unknown>;

const typeLabels = ["All", "Visit", "Lab Result", "Imaging", "Prescription", "Vaccination", "Note"] as const;

const formatRecordDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function PatientRecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedType, setSelectedType] = useState<(typeof typeLabels)[number]>("All");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
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
        const resp = await getMyHealthRecords({ limit: 200 });
        setRecords(Array.isArray(resp?.records) ? resp.records : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnlinked]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return records.filter((record) => {
      const typeMatch = selectedType === "All" || String(record.record_type || "") === selectedType;
      const searchMatch = !normalized || `${record.title || ""} ${record.summary || ""} ${record.provider || ""}`.toLowerCase().includes(normalized);
      return typeMatch && searchMatch;
    });
  }, [records, search, selectedType]);

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your records…</WorkspaceCard>;
  }

  if (isUnlinked) {
    return (
      <WorkspaceCard className="p-6">
        <SectionHeader title="My Records" subtitle="Your chart has not been linked yet." />
        <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-slate-600">
          Once the clinic links your patient record, consultations, prescriptions, and attachments will show up here.
        </div>
      </WorkspaceCard>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceCard className="p-6">
        <SectionHeader title="My Records" subtitle="Past consultations, notes, prescriptions, and attachments." />
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by diagnosis, provider, or summary" className="h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-10 text-sm outline-none focus:border-[var(--accent-sage)]" />
          </label>
          <div className="flex flex-wrap gap-2">
            {typeLabels.map((type) => (
              <button key={type} type="button" onClick={() => setSelectedType(type)} className={`rounded-full border px-4 py-2 text-sm ${selectedType === type ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]" : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"}`}>
                {type}
              </button>
            ))}
          </div>
        </div>
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <WorkspaceCard className="p-6">
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((record) => {
                const title = String(record.title || record.record_type || "Record");
                return (
                  <button key={String(record.record_id || record.id)} type="button" onClick={() => setSelectedRecord(record)} className="flex w-full items-start justify-between gap-4 rounded-[18px] border border-[#E5E7EB] p-4 text-left transition-colors hover:bg-[#FAFBFC]">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]">
                        <FileText className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{title}</p>
                        <p className="mt-1 text-sm text-slate-500">{String(record.summary || record.provider || "Clinical entry")}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{formatRecordDate(String(record.record_date || record.dateIso || ""))}</p>
                      </div>
                    </div>
                    <Badge tone="blue">{String(record.record_type || "Record")}</Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No records match your filters"
              description="Try a different search term or choose a broader record type."
            />
          )}
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SectionHeader title="Record details" subtitle="Open a record to review its full content and attachments." />
          {selectedRecord ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-[18px] border border-[#E5E7EB] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{String(selectedRecord.record_type || "Record")}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{String(selectedRecord.title || selectedRecord.record_type || "Record")}</h3>
                <p className="mt-2 text-sm text-slate-500">{String(selectedRecord.summary || "No summary available.")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[["Date", formatRecordDate(String(selectedRecord.record_date || selectedRecord.dateIso || ""))], ["Provider", String(selectedRecord.provider || "N/A")], ["Status", String(selectedRecord.save_state || "final")], ["Patient", String(selectedRecord.patient_name || (selectedRecord.patient as any)?.name || "You")]].map(([label, value]) => (
                  <div key={label} className="rounded-[16px] bg-[#FAFBFC] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{value as string}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[18px] border border-[#E5E7EB] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Full details</p>
                <pre className="mt-3 overflow-auto rounded-[14px] bg-[#FAFBFC] p-4 text-xs leading-6 text-slate-600">{JSON.stringify(selectedRecord.details || {}, null, 2)}</pre>
              </div>

              {Array.isArray((selectedRecord.details as Record<string, unknown> | undefined)?.imagingFiles) && (selectedRecord.details as { imagingFiles?: Array<{ name?: string }> }).imagingFiles?.length ? (
                <div className="rounded-[18px] border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attachments</p>
                  <div className="mt-3 space-y-2">
                    {(selectedRecord.details as { imagingFiles?: Array<{ name?: string }> }).imagingFiles?.map((file) => (
                      <div key={String(file.name || "attachment")} className="flex items-center gap-3 rounded-[12px] bg-[#FAFBFC] px-3 py-2 text-sm text-slate-600">
                        <Paperclip className="h-4 w-4 text-[var(--accent-sage)]" />
                        {String(file.name || "Attachment")}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState icon={FileText} title="Select a record" description="Choose an item from the list to review the full details here." />
          )}
        </WorkspaceCard>
      </div>
    </div>
  );
}