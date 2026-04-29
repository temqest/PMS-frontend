"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, FlaskConical, Image as ImageIcon, Pill, ArrowRight, Search } from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import { AvatarInitials, Badge, FilterPill, SectionHeader, WorkspaceCard } from "../../components/workspace-ui";
import RecordModal, { type PatientSummary, type RecordForm, type RecordType } from "../../components/modal/RecordModal";
import {
  createHealthRecord,
  deleteHealthRecord,
  getHealthRecords,
  getPatients,
  mapHealthRecordToUi,
  updateHealthRecord,
  type HealthRecordPayload,
  type UiHealthRecord,
} from "../../../lib/api";

const categories = ["Visits", "Lab Results", "Imaging", "Prescriptions", "Vaccinations", "Notes"];

const CATEGORY_TO_TYPE: Record<string, RecordType | "ALL"> = {
  Visits: "Visit",
  "Lab Results": "Lab Result",
  Imaging: "Imaging",
  Prescriptions: "Prescription",
  Vaccinations: "Vaccination",
  Notes: "Note",
};

const toDetails = (data: RecordForm): Record<string, unknown> => ({
  title:
    data.recordType === "Visit"
      ? data.visitType
      : data.recordType === "Lab Result"
      ? data.labTestName
      : data.recordType === "Imaging"
      ? data.imagingStudyType
      : data.recordType === "Prescription"
      ? data.prescriptionMedicationName
      : data.recordType === "Vaccination"
      ? data.vaccinationName
      : data.noteType,
  summary:
    data.recordType === "Visit"
      ? data.visitAssessment || data.visitReason
      : data.recordType === "Lab Result"
      ? data.labNotes || `${data.labResultValue} ${data.labUnit}`.trim()
      : data.recordType === "Imaging"
      ? data.imagingImpression || data.imagingFindings
      : data.recordType === "Prescription"
      ? data.prescriptionDirections
      : data.recordType === "Vaccination"
      ? data.vaccinationNotes
      : data.noteContent,
  ...data,
});

const toPayload = (data: RecordForm & { saveState: "draft" | "final" }): HealthRecordPayload => ({
  patient_id: data.patient?.id || "",
  patient_name: data.patient?.name || "",
  record_type: data.recordType,
  record_date: data.date,
  provider: data.provider,
  save_state: data.saveState,
  summary:
    data.recordType === "Visit"
      ? data.visitAssessment || data.visitReason
      : data.recordType === "Lab Result"
      ? data.labNotes
      : data.recordType === "Imaging"
      ? data.imagingImpression || data.imagingFindings
      : data.recordType === "Prescription"
      ? data.prescriptionDirections
      : data.recordType === "Vaccination"
      ? data.vaccinationNotes
      : data.noteContent,
  details: toDetails(data),
});

const iconForType = (type: RecordType) => {
  if (type === "Lab Result") return FlaskConical;
  if (type === "Imaging") return ImageIcon;
  if (type === "Prescription") return Pill;
  return FileText;
};

const tagsForRecord = (record: UiHealthRecord): string[] => {
  const tags: string[] = [record.recordType];
  if (record.saveState === "draft") tags.push("Draft");
  return tags;
};

export default function RecordsPage() {
  const router = useRouter();
  const { pushToast } = useWorkspace();
  const [category, setCategory] = useState("Visits");
  const [records, setRecords] = useState<UiHealthRecord[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRecord, setSelectedRecord] = useState<UiHealthRecord | null>(null);
  const [modalInitialData, setModalInitialData] = useState<Partial<RecordForm> | undefined>(undefined);

  const selectedType = CATEGORY_TO_TYPE[category] || "ALL";
  const patientScopedRecords = useMemo(
    () => (selectedPatient ? records.filter((record) => record.patient.id === selectedPatient.id) : []),
    [records, selectedPatient]
  );
  const filteredRecords = useMemo(
    () => (selectedType === "ALL" ? patientScopedRecords : patientScopedRecords.filter((record) => record.recordType === selectedType)),
    [patientScopedRecords, selectedType]
  );
  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => patient.name.toLowerCase().includes(query) || patient.id.toLowerCase().includes(query));
  }, [patients, patientSearch]);

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await getHealthRecords({ limit: 200 });
      const rows = resp?.records || [];
      const list = Array.isArray(rows) ? rows.map(mapHealthRecordToUi) : [];
      setRecords(list);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Unable to load health records.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordsForPatient = async (patientId: string) => {
    setLoading(true);
    setError("");
    try {
      const resp = await getHealthRecords({ patient_id: patientId, limit: 200 });
      const rows = resp?.records || [];
      const list = Array.isArray(rows) ? rows.map(mapHealthRecordToUi) : [];
      setRecords(list);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Unable to load health records.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadLookupData = async () => {
    try {
      const patientResp = await getPatients("?limit=200");
      const patientRows = patientResp?.patients || [];
      const patientOptions: PatientSummary[] = Array.isArray(patientRows)
        ? patientRows
            .map((item: Record<string, unknown>) => ({
              id: String(item.patient_id || ""),
              name: `${String(item.first_name || "")} ${String(item.last_name || "")}`.trim(),
            }))
            .filter((item: PatientSummary) => item.id && item.name)
        : [];
      setPatients(patientOptions);
      setProviders(
        patientOptions.length
          ? [{ id: "assigned-provider", name: "Assigned Provider" }, { id: "lab-services", name: "Lab Services" }]
          : [{ id: "assigned-provider", name: "Assigned Provider" }]
      );
    } catch {
      setPatients([]);
      setProviders([{ id: "assigned-provider", name: "Assigned Provider" }]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRecords();
      void loadLookupData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const buildInitialDataFromRecord = (record: UiHealthRecord): Partial<RecordForm> => {
    const details = record.details || {};
    return {
      ...(details as Partial<RecordForm>),
      patient: { id: record.patient.id, name: record.patient.name },
      recordType: record.recordType,
      date: (() => {
        const parsed = new Date(record.dateIso || record.date);
        if (Number.isNaN(parsed.getTime())) return "";
        return parsed.toISOString().slice(0, 10);
      })(),
      provider: record.provider,
    };
  };

  const handleCreate = () => {
    if (!selectedPatient) return;
    setModalMode("create");
    setSelectedRecord(null);
    setModalInitialData({
      patient: selectedPatient,
    });
    setShowRecordModal(true);
  };

  const handleEdit = (record: UiHealthRecord) => {
    setModalMode("edit");
    setSelectedRecord(record);
    setModalInitialData(buildInitialDataFromRecord(record));
    setShowRecordModal(true);
  };

  const handleModalSubmit = async (data: RecordForm & { saveState: "draft" | "final" }) => {
    const payload = toPayload(data);
    if (modalMode === "edit" && selectedRecord?.id) {
      await updateHealthRecord(selectedRecord.id, payload);
      pushToast({ type: "success", title: "Record updated", message: `${payload.record_type} updated.` });
    } else {
      await createHealthRecord(payload);
      pushToast({ type: "success", title: "Record saved", message: `${payload.record_type} created.` });
    }
    setShowRecordModal(false);
    setSelectedRecord(null);
    setModalInitialData(undefined);
    if (selectedPatient?.id) {
      await loadRecordsForPatient(selectedPatient.id);
    } else {
      await loadRecords();
    }
  };

  const handleModalDelete = async () => {
    if (!selectedRecord?.id) return;
    await deleteHealthRecord(selectedRecord.id);
    pushToast({ type: "success", title: "Record archived", message: "Health record archived successfully." });
    setShowRecordModal(false);
    setSelectedRecord(null);
    setModalInitialData(undefined);
    if (selectedPatient?.id) {
      await loadRecordsForPatient(selectedPatient.id);
    } else {
      await loadRecords();
    }
  };

  const selectPatient = async (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setCategory("Visits");
    await loadRecordsForPatient(patient.id);
  };

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    setRecords([]);
    setError("");
    setLoading(false);
  };

  return (
    <>
    {!selectedPatient ? (
      <div className="space-y-6">
        <WorkspaceCard className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader title="Health Records" subtitle="Select a patient to open their records timeline." />
            <button
              type="button"
              onClick={() => {
                if (!filteredPatients.length) return;
                void selectPatient(filteredPatients[0]);
                setShowRecordModal(true);
                setModalMode("create");
              }}
              className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white"
            >
              Add Record
            </button>
          </div>
          <div className="mt-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
              <input
                type="text"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search patient by name or ID"
                className="w-full rounded-[12px] border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[var(--accent-sage)]"
              />
            </div>
          </div>
        </WorkspaceCard>
        <WorkspaceCard className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white uppercase tracking-[0.16em] text-[#9CA3AF]">
              <tr className="border-b border-[#F3F4F6]">
                <th className="px-4 py-4">Patient</th>
                <th className="px-4 py-4">Patient ID</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>No patients available.</td>
                </tr>
              ) : filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="cursor-pointer border-b border-[#F3F4F6] hover:bg-[#FAFBFC]"
                  onClick={() => {
                    router.push(`/patients/${encodeURIComponent(patient.id)}`);
                  }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AvatarInitials initials={patient.name.split(" ").map((part) => part[0]).join("")} size={34} />
                      <span className="font-medium text-slate-900">{patient.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{patient.id}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void selectPatient(patient);
                      }}
                      className="rounded-[10px] border border-[#E5E7EB] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#F3F4F6]"
                    >
                      View Records
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </WorkspaceCard>
      </div>
    ) : (
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <WorkspaceCard className="p-6">
          <div className="flex items-center gap-4">
            <AvatarInitials initials={selectedPatient.name.split(" ").map((part) => part[0]).join("")} size={56} />
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedPatient.name}</p>
              <p className="text-sm text-slate-500">{selectedPatient.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedPatient}
            className="mt-4 rounded-[10px] border border-[#E5E7EB] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#F3F4F6]"
          >
            Back to Patients
          </button>
          <div className="mt-6 space-y-2">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-sm ${category === item ? "bg-[rgba(107,144,128,0.08)] text-[var(--accent-sage)]" : "text-slate-600 hover:bg-[#FAFBFC]"}`}>
                <span>{item}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </WorkspaceCard>

        <div className="space-y-6">
        <WorkspaceCard className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader title="Health Records" subtitle="Timeline, filters, and structured clinical history." />
            <button type="button" onClick={handleCreate} className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white">New Record</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <FilterPill active>Last 30 Days</FilterPill>
            <FilterPill>Visits</FilterPill>
            <FilterPill>Lab Results</FilterPill>
            <FilterPill>Imaging</FilterPill>
          </div>
        </WorkspaceCard>

        {error ? (
          <WorkspaceCard className="p-6">
            <p className="text-sm text-red-600">{error}</p>
          </WorkspaceCard>
        ) : null}

        <div className="space-y-5">
          {loading ? (
            <WorkspaceCard className="p-6">
              <p className="text-sm text-slate-500">Loading health records...</p>
            </WorkspaceCard>
          ) : filteredRecords.length === 0 ? (
            <WorkspaceCard className="p-6">
              <p className="text-sm text-slate-500">No records found for this category.</p>
            </WorkspaceCard>
          ) : filteredRecords.map((record) => {
            const Icon = iconForType(record.recordType);
            return (
              <div key={record.id} className="flex justify-start">
                <WorkspaceCard className="w-full max-w-none p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#FAFBFC] text-[var(--accent-sage)]">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900">{record.title}</h3>
                        <Badge tone="neutral">{record.date || "No date"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{record.provider}</p>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{record.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {tagsForRecord(record).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                      </div>
                      <Link
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          handleEdit(record);
                        }}
                        className="mt-5 inline-flex items-center gap-1 text-sm text-[var(--accent-sage)] hover:underline"
                      >
                        View Details
                        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </div>
                </WorkspaceCard>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    )}

    <RecordModal
      isOpen={showRecordModal}
      onClose={() => setShowRecordModal(false)}
      mode={modalMode}
      initialData={modalInitialData}
      onSubmit={handleModalSubmit}
      onDelete={modalMode === "edit" ? handleModalDelete : undefined}
      preselectedPatient={selectedPatient || undefined}
      patientLocked={!!selectedPatient}
      patients={patients}
      providers={providers}
    />
    </>
  );
}
