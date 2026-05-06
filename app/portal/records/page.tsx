"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleAlert,
  Eye,
  File as FileIcon,
  FileImage,
  FileText,
  Paperclip,
  Pill,
  ScanSearch,
  Search,
  ShieldAlert,
  Stethoscope,
  Syringe,
  TestTubeDiagonal,
} from "lucide-react";

import { Badge, EmptyState, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import { getMyHealthRecords } from "../../../lib/patient-api";
import { getSessionClaims } from "../../../lib/session";

type RecordItem = Record<string, unknown>;
type DetailItem = { label: string; value: string };
type DetailSection = { title: string; items: DetailItem[] };
type AttachmentItem = {
  id: string;
  name: string;
  size?: number;
  type?: string;
  url?: string;
  kind: "image" | "file";
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const typeLabels = ["All", "Visit", "Lab Result", "Imaging", "Prescription", "Vaccination", "Note"] as const;
const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"]);

const formatRecordDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatFileSize = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const toTitleCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, unknown> => (isRecordObject(value) ? value : {});

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
};

const getFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return "";
};

const getFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const resolveAssetUrl = (value: string) => {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (!API_BASE) return value;
  return value.startsWith("/") ? `${API_BASE}${value}` : `${API_BASE}/${value}`;
};

const getFileExtension = (value: string) => {
  const clean = value.split("?")[0]?.split("#")[0] || "";
  const ext = clean.includes(".") ? clean.split(".").pop() || "" : "";
  return ext.trim().toLowerCase();
};

const isImageAttachment = (type?: string, name?: string, url?: string) => {
  const mime = (type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const ext = getFileExtension(name || url || "");
  return imageExtensions.has(ext);
};

const hasAttachmentUrl = (attachment: AttachmentItem): attachment is AttachmentItem & { url: string } =>
  Boolean(attachment.url);


const addDetail = (items: DetailItem[], label: string, value: unknown) => {
  const text = toText(value);
  if (text) items.push({ label, value: text });
};

const addDateDetail = (items: DetailItem[], label: string, value: unknown) => {
  const text = toText(value);
  if (text) items.push({ label, value: formatRecordDate(text) });
};

const buildGenericDetails = (details: Record<string, unknown>) => {
  const hiddenKeys = new Set([
    "title",
    "summary",
    "imagingFiles",
    "attachments",
    "files",
    "medicines",
    "patient",
    "patient_id",
    "patient_name",
  ]);

  return Object.entries(details)
    .filter(([key, value]) => !hiddenKeys.has(key) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean"))
    .map(([key, value]) => ({ label: toTitleCase(key), value: toText(value) }))
    .filter((item) => item.value);
};

const getRecordSections = (record: RecordItem) => {
  const details = toRecord(record.details);
  const recordType = String(record.record_type || "");
  const sections: DetailSection[] = [];

  if (recordType === "Visit") {
    const visitSummary: DetailItem[] = [];
    addDetail(visitSummary, "Visit reason", details.visitReason);
    addDetail(visitSummary, "Visit type", details.visitType);
    addDetail(visitSummary, "Chief complaint", details.chiefComplaint);
    addDetail(visitSummary, "Assessment", details.visitAssessment);
    addDetail(visitSummary, "Disposition", details.visitDisposition);
    addDateDetail(visitSummary, "Follow-up due", details.followUpDueDate);
    if (visitSummary.length) sections.push({ title: "Visit summary", items: visitSummary });

    const vitals: DetailItem[] = [];
    addDetail(vitals, "Blood pressure", [toText(details.visitBpSystolic), toText(details.visitBpDiastolic)].filter(Boolean).join("/"));
    addDetail(vitals, "Heart rate", details.visitHeartRate ? `${toText(details.visitHeartRate)} bpm` : "");
    addDetail(vitals, "Respiratory rate", details.visitRespiratoryRate ? `${toText(details.visitRespiratoryRate)} breaths/min` : "");
    addDetail(vitals, "Temperature", details.visitTemperature ? `${toText(details.visitTemperature)} deg` : "");
    addDetail(vitals, "Weight", details.visitWeight);
    addDetail(vitals, "Height", details.visitHeight);
    if (vitals.length) sections.push({ title: "Vitals", items: vitals });
  } else if (recordType === "Lab Result") {
    const labItems: DetailItem[] = [];
    addDetail(labItems, "Test", details.labTestName);
    addDetail(
      labItems,
      "Result",
      [toText(details.labResultValue), toText(details.labUnit)].filter(Boolean).join(" ")
    );
    addDetail(labItems, "Status", details.labStatus);
    addDetail(labItems, "Reference range", details.labReferenceRange);
    addDetail(labItems, "Ordered by", details.labOrderingProvider);
    addDetail(labItems, "Notes", details.labNotes);
    if (labItems.length) sections.push({ title: "Lab details", items: labItems });
  } else if (recordType === "Imaging") {
    const imagingItems: DetailItem[] = [];
    addDetail(imagingItems, "Study type", details.imagingStudyType);
    addDetail(imagingItems, "Body part", details.imagingBodyPart);
    addDetail(imagingItems, "Findings", details.imagingFindings);
    addDetail(imagingItems, "Impression", details.imagingImpression);
    addDetail(imagingItems, "Radiologist", details.imagingRadiologist);
    if (imagingItems.length) sections.push({ title: "Imaging details", items: imagingItems });
  } else if (recordType === "Prescription") {
    const prescriptionItems: DetailItem[] = [];
    addDetail(prescriptionItems, "Medication", details.medicationName || details.prescriptionMedicationName);
    addDetail(prescriptionItems, "Dosage", details.dosage || details.prescriptionDosage);
    addDetail(prescriptionItems, "Directions", details.directionsForUse || details.prescriptionDirections);
    addDetail(prescriptionItems, "Quantity", details.quantity || details.prescriptionQuantity);
    addDateDetail(prescriptionItems, "Start date", details.startDate || details.prescriptionStartDate);
    addDateDetail(prescriptionItems, "End date", details.endDate || details.prescriptionEndDate);
    addDetail(prescriptionItems, "Pharmacy", details.pharmacy || details.prescriptionPharmacy);
    addDetail(prescriptionItems, "Notes", details.notes || details.prescriptionNotes);
    if (prescriptionItems.length) sections.push({ title: "Prescription details", items: prescriptionItems });
  } else if (recordType === "Vaccination") {
    const vaccinationItems: DetailItem[] = [];
    addDetail(vaccinationItems, "Vaccine", details.vaccinationName);
    addDetail(vaccinationItems, "Dose", details.vaccinationDoseNumber);
    addDetail(vaccinationItems, "Lot number", details.vaccinationLotNumber);
    addDateDetail(vaccinationItems, "Expiration date", details.vaccinationExpirationDate);
    addDetail(vaccinationItems, "Site", details.vaccinationSite);
    addDetail(vaccinationItems, "Route", details.vaccinationRoute);
    addDateDetail(vaccinationItems, "Next dose due", details.vaccinationNextDoseDue);
    addDetail(vaccinationItems, "Administered by", details.vaccinationAdministeredBy);
    addDetail(vaccinationItems, "Series complete", details.vaccinationSeriesComplete);
    addDetail(vaccinationItems, "Notes", details.vaccinationNotes);
    if (vaccinationItems.length) sections.push({ title: "Vaccination details", items: vaccinationItems });
  } else if (recordType === "Note") {
    const noteItems: DetailItem[] = [];
    addDetail(noteItems, "Note type", details.noteType);
    addDetail(noteItems, "Content", details.noteContent);
    addDetail(noteItems, "Addendum", details.noteIsAddendum);
    addDetail(noteItems, "Previous note", details.previousNote);
    if (noteItems.length) sections.push({ title: "Clinical note", items: noteItems });
  }

  const genericItems = buildGenericDetails(details).filter(
    (item) => !sections.some((section) => section.items.some((existing) => existing.label === item.label && existing.value === item.value))
  );
  if (genericItems.length) sections.push({ title: "Additional details", items: genericItems });

  return sections;
};

const getPrescriptionMedicines = (record: RecordItem) => {
  const details = toRecord(record.details);
  return toArray(details.medicines)
    .map((item, index) => {
      const file = toRecord(item);
      const name = getFirstText(file.medicineName, file.name);
      if (!name) return null;
      return {
        id: getFirstText(file.medicineId, file.id) || `${name}-${index}`,
        name,
        dosage: getFirstText(file.prescribedDosage, file.dosage),
        quantity: getFirstText(file.prescribedQuantity, file.quantity),
        status: getFirstText(file.status),
      };
    })
    .filter((item): item is { id: string; name: string; dosage: string; quantity: string; status: string } => Boolean(item));
};

const extractAttachments = (record: RecordItem): AttachmentItem[] => {
  const details = toRecord(record.details);
  const rawSources = [
    ...toArray(details.imagingFiles),
    ...toArray(details.attachments),
    ...toArray(details.files),
    ...toArray(record.attachments),
    ...toArray(record.files),
  ];

  const seen = new Set<string>();
  const items: AttachmentItem[] = [];

  rawSources.forEach((entry, index) => {
    const file = toRecord(entry);
    const name = getFirstText(file.name, file.fileName, file.originalName, file.filename, file.title) || `Attachment ${index + 1}`;
    const rawUrl = getFirstText(file.url, file.path, file.location, file.src, file.previewUrl, file.downloadUrl);
    const url = rawUrl ? resolveAssetUrl(rawUrl) : "";
    const type = getFirstText(file.type, file.mimeType, file.contentType);
    const size = getFirstNumber(file.size, file.fileSize, file.bytes);
    const kind = isImageAttachment(type, name, url) ? "image" : "file";
    const id = getFirstText(file.id, file.fileId) || `${name}-${url || size || index}`;
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ id, name, size, type, url: url || undefined, kind });
  });

  return items;
};

const recordTypeIcon = (recordType: string) => {
  switch (recordType) {
    case "Visit":
      return Stethoscope;
    case "Lab Result":
      return TestTubeDiagonal;
    case "Imaging":
      return ScanSearch;
    case "Prescription":
      return Pill;
    case "Vaccination":
      return Syringe;
    default:
      return FileText;
  }
};

function DetailSectionCard({ title, items }: DetailSection) {
  return (
    <section className="rounded-[18px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-sage)]" />
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={`${title}-${item.label}`} className="min-w-0 rounded-[14px] bg-[#FAFBFC] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PatientRecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedType, setSelectedType] = useState<(typeof typeLabels)[number]>("All");
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const claims = getSessionClaims();
  const isUnlinked = !claims?.patient_id;

  useEffect(() => {
    (async () => {
      if (isUnlinked) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        const resp = await getMyHealthRecords({ limit: 200 });
        const nextRecords = Array.isArray(resp?.records) ? resp.records : [];
        setRecords(nextRecords);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your records right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnlinked]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return records.filter((record) => {
      const typeMatch = selectedType === "All" || String(record.record_type || "") === selectedType;
      const searchMatch =
        !normalized ||
        `${record.title || ""} ${record.summary || ""} ${record.provider || ""}`.toLowerCase().includes(normalized);
      return typeMatch && searchMatch;
    });
  }, [records, search, selectedType]);

  const selectedRecord = useMemo(
    () => filtered.find((record) => String(record.record_id || record.id || "") === selectedRecordId) || filtered[0] || null,
    [filtered, selectedRecordId]
  );

  const selectedDetails = useMemo(() => (selectedRecord ? toRecord(selectedRecord.details) : {}), [selectedRecord]);
  const selectedSections = useMemo(() => (selectedRecord ? getRecordSections(selectedRecord) : []), [selectedRecord]);
  const selectedAttachments = useMemo(() => (selectedRecord ? extractAttachments(selectedRecord) : []), [selectedRecord]);
  const selectedMedicines = useMemo(() => (selectedRecord ? getPrescriptionMedicines(selectedRecord) : []), [selectedRecord]);
  const imageAttachments = useMemo(
    () => selectedAttachments.filter((attachment) => attachment.kind === "image"),
    [selectedAttachments]
  );
  const fileAttachments = useMemo(
    () => selectedAttachments.filter((attachment) => attachment.kind !== "image"),
    [selectedAttachments]
  );
  const summaryText = getFirstText(selectedRecord?.summary, selectedDetails.summary);

  if (loading) {
    return <WorkspaceCard className="p-6 text-sm text-slate-500">Loading your records...</WorkspaceCard>;
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
    <div className="space-y-6 overflow-x-hidden">
      <WorkspaceCard className="p-6">
        <SectionHeader title="My Records" subtitle="Past consultations, notes, prescriptions, and attachments." />
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by diagnosis, provider, or summary"
              className="h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-10 text-sm outline-none focus:border-[var(--accent-sage)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {typeLabels.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  selectedType === type
                    ? "border-[var(--accent-sage)] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]"
                    : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-[#F3F4F6]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </WorkspaceCard>

      {error ? (
        <WorkspaceCard className="p-6">
          <div className="flex items-start gap-3 rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.04)] p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="font-medium">We could not load your records.</p>
              <p className="mt-1 text-red-600">{error}</p>
            </div>
          </div>
        </WorkspaceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <WorkspaceCard className="min-w-0 p-4 sm:p-6">
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((record) => {
                const title = String(record.title || record.record_type || "Record");
                const active = String(selectedRecord?.record_id || selectedRecord?.id || "") === String(record.record_id || record.id || "");
                const Icon = recordTypeIcon(String(record.record_type || ""));
                return (
                  <button
                    key={String(record.record_id || record.id)}
                    type="button"
                    onClick={() => setSelectedRecordId(String(record.record_id || record.id || ""))}
                    className={`flex w-full min-w-0 items-start justify-between gap-4 rounded-[18px] border p-4 text-left transition-colors ${
                      active
                        ? "border-[rgba(107,144,128,0.35)] bg-[rgba(107,144,128,0.06)]"
                        : "border-[#E5E7EB] hover:bg-[#FAFBFC]"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{title}</p>
                        <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
                          {String(record.summary || record.provider || "Clinical entry")}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                            {formatRecordDate(String(record.record_date || record.dateIso || ""))}
                          </p>
                          {active ? <Badge tone="sage">Open</Badge> : null}
                        </div>
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

        <WorkspaceCard className="min-w-0 overflow-hidden p-4 sm:p-6">
          <SectionHeader title="Record details" subtitle="Open a record to review its full content and attachments." />
          {selectedRecord ? (
            <div className="mt-6 space-y-4">
              <section className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-[linear-gradient(135deg,rgba(107,144,128,0.08),rgba(122,156,198,0.08))] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      {String(selectedRecord.record_type || "Record")}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 [overflow-wrap:anywhere]">
                      {String(selectedRecord.title || selectedRecord.record_type || "Record")}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">
                      {summaryText || "No summary is available for this record yet."}
                    </p>
                  </div>
                  <Badge tone="blue">{String(selectedRecord.save_state || "final")}</Badge>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Date", value: formatRecordDate(String(selectedRecord.record_date || selectedRecord.dateIso || "")), icon: CalendarDays },
                    { label: "Provider", value: String(selectedRecord.provider || "N/A"), icon: Stethoscope },
                    { label: "Status", value: String(selectedRecord.save_state || "final"), icon: ShieldAlert },
                    {
                      label: "Patient",
                      value: String(selectedRecord.patient_name || toRecord(selectedRecord.patient).name || "You"),
                      icon: FileText,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="min-w-0 rounded-[16px] border border-white/70 bg-white/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                          <p className="text-[11px] uppercase tracking-[0.24em]">{item.label}</p>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {selectedMedicines.length ? (
                <section className="rounded-[18px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[var(--accent-sage)]" strokeWidth={1.75} />
                    <h4 className="text-sm font-semibold text-slate-900">Medications</h4>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedMedicines.map((medicine) => (
                      <div key={medicine.id} className="rounded-[14px] bg-[#FAFBFC] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{medicine.name}</p>
                            <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
                              {[medicine.dosage, medicine.quantity ? `Qty ${medicine.quantity}` : ""].filter(Boolean).join(" - ") || "Medication details available"}
                            </p>
                          </div>
                          {medicine.status ? <Badge tone="neutral">{medicine.status}</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selectedSections.length ? (
                selectedSections.map((section) => <DetailSectionCard key={section.title} {...section} />)
              ) : (
                <section className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm text-slate-500">
                  No additional details were added for this record.
                </section>
              )}

              <section className="rounded-[18px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-[var(--accent-sage)]" strokeWidth={1.75} />
                  <h4 className="text-sm font-semibold text-slate-900">Attachments</h4>
                </div>

                {selectedAttachments.length ? (
                  <div className="mt-4 space-y-4">
                    {imageAttachments.some((attachment) => attachment.url) ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {imageAttachments
                          .filter(hasAttachmentUrl)
                          .map((attachment) => (
                            <div key={attachment.id} className="min-w-0 overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-[#FAFBFC]">
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="h-44 w-full bg-white object-cover"
                              />
                              <div className="p-4">
                                <p className="text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{attachment.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {[attachment.type, formatFileSize(attachment.size)].filter(Boolean).join(" - ") || "Image preview"}
                                </p>
                                <Link
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-sage)] hover:underline"
                                >
                                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                                  View image
                                </Link>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {[...fileAttachments, ...imageAttachments.filter((attachment) => !attachment.url)].map((attachment) => (
                        <div key={`file-${attachment.id}`} className="flex min-w-0 flex-col gap-3 rounded-[16px] border border-[#E5E7EB] bg-[#FAFBFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--accent-sage)]">
                              {attachment.kind === "image" ? (
                                <FileImage className="h-5 w-5" strokeWidth={1.75} />
                              ) : (
                                <FileIcon className="h-5 w-5" strokeWidth={1.75} />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{attachment.name}</p>
                              <p className="mt-1 text-xs text-slate-500 [overflow-wrap:anywhere]">
                                {[attachment.type || (attachment.kind === "image" ? "Image" : "Attachment"), formatFileSize(attachment.size)].filter(Boolean).join(" - ")}
                              </p>
                            </div>
                          </div>
                          {attachment.url ? (
                            <Link
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[#D9E4DE] bg-white px-4 py-2 text-sm font-medium text-[var(--accent-sage)] transition-colors hover:bg-[#F6FAF8]"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.75} />
                              Open
                            </Link>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-2 rounded-[12px] border border-dashed border-[#E5E7EB] px-4 py-2 text-sm text-slate-400">
                              <CircleAlert className="h-4 w-4" strokeWidth={1.75} />
                              Preview unavailable
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-6 text-slate-500">
                    No files or images were attached to this record.
                  </div>
                )}
              </section>
            </div>
          ) : (
            <EmptyState icon={FileText} title="Select a record" description="Choose an item from the list to review the full details here." />
          )}
        </WorkspaceCard>
      </div>
    </div>
  );
}
