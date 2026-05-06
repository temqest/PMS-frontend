"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  NotebookText,
  Pill,
  ScanSearch,
  Search,
  Syringe,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import "./RecordModal.css";
import SharedDatePicker from "../SharedDatePicker";

export type RecordType = "Visit" | "Lab Result" | "Imaging" | "Prescription" | "Vaccination" | "Note";
type LabStatus = "Normal" | "Abnormal" | "Critical";
export type RecordSaveState = "draft" | "final";

export type PatientSummary = {
  id: string;
  name: string;
};

export type ProviderOption = {
  id: string;
  name: string;
};

type UploadedRecordFile = {
  id: string;
  name: string;
  size: number;
};

export type RecordForm = {
  patient: PatientSummary | null;
  recordType: RecordType;
  date: string;
  provider: string;
  visitReason: string;
  visitType: "Follow-up" | "Annual Physical" | "Urgent" | "Consultation" | "Procedure";
  chiefComplaint: string;
  visitDisposition: "" | "Routine" | "Urgent" | "Referred" | "Observation" | "Other";
  followUpDueDate: string;
  visitBpSystolic: string;
  visitBpDiastolic: string;
  visitHeartRate: string;
  visitRespiratoryRate: string;
  visitTemperature: string;
  visitWeight: string;
  visitHeight: string;
  visitAssessment: string;
  labTestName: string;
  labResultValue: string;
  labUnit: string;
  labReferenceRange: string;
  labStatus: LabStatus;
  labFlagForReview: boolean;
  labOrderingProvider: string;
  labNotes: string;
  imagingStudyType: "X-Ray" | "CT" | "MRI" | "Ultrasound" | "PET" | "Mammography";
  imagingBodyPart: string;
  imagingFindings: string;
  imagingImpression: string;
  imagingFiles: UploadedRecordFile[];
  imagingRadiologist: string;
  prescriptionMedicationName: string;
  prescriptionDosage: string;
  prescriptionForm: "Tablet" | "Capsule" | "Liquid" | "Injection" | "Topical";
  prescriptionDirections: string;
  prescriptionQuantity: string;
  prescriptionRefills: string;
  prescriptionPharmacy: string;
  prescriptionStartDate: string;
  prescriptionEndDate: string;
  substitutionAllowed: boolean;
  prescriptionNotes: string;
  vaccinationName: string;
  vaccinationLotNumber: string;
  vaccinationExpirationDate: string;
  vaccinationSite: "Left Arm" | "Right Arm" | "Left Thigh" | "Right Thigh" | "Other";
  vaccinationRoute: "Intramuscular" | "Subcutaneous" | "Oral" | "Nasal";
  vaccinationDoseNumber: string;
  vaccinationSeriesComplete: boolean;
  vaccinationNextDoseDue: string;
  vaccinationVisGiven: boolean;
  vaccinationAdministeredBy: string;
  vaccinationNotes: string;
  noteType: "Progress Note" | "Consultation Note" | "Nursing Note" | "Discharge Summary" | "Phone Call";
  noteContent: string;
  noteIsAddendum: boolean;
  previousNote: string;
};

const DEFAULT_PROVIDERS: ProviderOption[] = [
  { id: "dr-sarah-johnson", name: "Dr. Sarah Johnson" },
  { id: "dr-michael-chen", name: "Dr. Michael Chen" },
  { id: "dr-patricia-williams", name: "Dr. Patricia Williams" },
  { id: "dr-james-smith", name: "Dr. James Smith" },
];

const DEFAULT_PATIENTS: PatientSummary[] = [
  { id: "pt-1001", name: "Mia Thompson" },
  { id: "pt-1002", name: "Ethan Rivera" },
  { id: "pt-1003", name: "Sophia Grant" },
  { id: "pt-1004", name: "Noah Patel" },
];

const TEST_NAMES = ["CBC Panel", "Lipid Panel", "HbA1c", "BMP", "CMP", "TSH", "Urinalysis"];
const MEDICATIONS = ["Lisinopril", "Metformin", "Atorvastatin", "Amoxicillin", "Omeprazole", "Amlodipine"];
const PHARMACIES = ["CVS Pharmacy", "Walgreens", "Rite Aid", "Publix Pharmacy", "Express Scripts"];
const NOTES = ["Progress Note - Apr 18", "Consultation Note - Apr 11", "Discharge Summary - Mar 30"];

const TODAY = getTodayString();

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyFile(file: File): UploadedRecordFile {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    size: file.size,
  };
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createInitialForm(
  preselectedPatient?: PatientSummary,
  initialData?: Partial<RecordForm>,
  providers: ProviderOption[] = DEFAULT_PROVIDERS
): RecordForm {
  const defaultProvider = providers[0]?.id || "";
  return {
    patient: initialData?.patient ?? preselectedPatient ?? null,
    recordType: initialData?.recordType ?? "Visit",
    date: initialData?.date ?? TODAY,
    provider: initialData?.provider ?? defaultProvider,
    visitReason: initialData?.visitReason ?? "",
    visitType: initialData?.visitType ?? "Follow-up",
    chiefComplaint: initialData?.chiefComplaint ?? "",
    visitDisposition: initialData?.visitDisposition ?? "",
    followUpDueDate: initialData?.followUpDueDate ?? "",
    visitBpSystolic: initialData?.visitBpSystolic ?? "",
    visitBpDiastolic: initialData?.visitBpDiastolic ?? "",
    visitHeartRate: initialData?.visitHeartRate ?? "",
    visitRespiratoryRate: initialData?.visitRespiratoryRate ?? "",
    visitTemperature: initialData?.visitTemperature ?? "",
    visitWeight: initialData?.visitWeight ?? "",
    visitHeight: initialData?.visitHeight ?? "",
    visitAssessment: initialData?.visitAssessment ?? "",
    labTestName: initialData?.labTestName ?? "",
    labResultValue: initialData?.labResultValue ?? "",
    labUnit: initialData?.labUnit ?? "",
    labReferenceRange: initialData?.labReferenceRange ?? "",
    labStatus: initialData?.labStatus ?? "Normal",
    labFlagForReview: initialData?.labFlagForReview ?? false,
    labOrderingProvider: initialData?.labOrderingProvider ?? defaultProvider,
    labNotes: initialData?.labNotes ?? "",
    imagingStudyType: initialData?.imagingStudyType ?? "X-Ray",
    imagingBodyPart: initialData?.imagingBodyPart ?? "",
    imagingFindings: initialData?.imagingFindings ?? "",
    imagingImpression: initialData?.imagingImpression ?? "",
    imagingFiles: initialData?.imagingFiles ?? [],
    imagingRadiologist: initialData?.imagingRadiologist ?? "",
    prescriptionMedicationName: initialData?.prescriptionMedicationName ?? "",
    prescriptionDosage: initialData?.prescriptionDosage ?? "",
    prescriptionForm: initialData?.prescriptionForm ?? "Tablet",
    prescriptionDirections: initialData?.prescriptionDirections ?? "",
    prescriptionQuantity: initialData?.prescriptionQuantity ?? "",
    prescriptionRefills: initialData?.prescriptionRefills ?? "0",
    prescriptionPharmacy: initialData?.prescriptionPharmacy ?? "",
    prescriptionStartDate: initialData?.prescriptionStartDate ?? TODAY,
    prescriptionEndDate: initialData?.prescriptionEndDate ?? "",
    substitutionAllowed: initialData?.substitutionAllowed ?? true,
    prescriptionNotes: initialData?.prescriptionNotes ?? "",
    vaccinationName: initialData?.vaccinationName ?? "",
    vaccinationLotNumber: initialData?.vaccinationLotNumber ?? "",
    vaccinationExpirationDate: initialData?.vaccinationExpirationDate ?? "",
    vaccinationSite: initialData?.vaccinationSite ?? "Left Arm",
    vaccinationRoute: initialData?.vaccinationRoute ?? "Intramuscular",
    vaccinationDoseNumber: initialData?.vaccinationDoseNumber ?? "",
    vaccinationSeriesComplete: initialData?.vaccinationSeriesComplete ?? false,
    vaccinationNextDoseDue: initialData?.vaccinationNextDoseDue ?? "",
    vaccinationVisGiven: initialData?.vaccinationVisGiven ?? false,
    vaccinationAdministeredBy: initialData?.vaccinationAdministeredBy ?? defaultProvider,
    vaccinationNotes: initialData?.vaccinationNotes ?? "",
    noteType: initialData?.noteType ?? "Progress Note",
    noteContent: initialData?.noteContent ?? "",
    noteIsAddendum: initialData?.noteIsAddendum ?? false,
    previousNote: initialData?.previousNote ?? "",
  };
}

function buildDefaultErrors() {
  return {} as Record<string, string>;
}

function saveLabelForType(recordType: RecordType) {
  switch (recordType) {
    case "Lab Result":
      return "Save Lab Result";
    case "Imaging":
      return "Save Imaging";
    case "Prescription":
      return "Save Prescription";
    case "Vaccination":
      return "Save Vaccination";
    case "Note":
      return "Save Note";
    default:
      return "Save Visit";
  }
}

export default function RecordModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  preselectedPatient,
  patientLocked = false,
  initialData,
  mode = "create",
  patients = DEFAULT_PATIENTS,
  providers = DEFAULT_PROVIDERS,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecordForm & { saveState: RecordSaveState }) => Promise<void>;
  onDelete?: () => Promise<void>;
  preselectedPatient?: PatientSummary;
  patientLocked?: boolean;
  initialData?: Partial<RecordForm>;
  mode?: "create" | "edit";
  patients?: PatientSummary[];
  providers?: ProviderOption[];
}) {
  const [form, setForm] = useState<RecordForm>(() => createInitialForm(preselectedPatient, initialData, providers));
  const [initialSnapshot, setInitialSnapshot] = useState<RecordForm>(() => createInitialForm(preselectedPatient, initialData, providers));
  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(buildDefaultErrors());
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.name ?? "");
  const [testQuery, setTestQuery] = useState("");
  const [medicationQuery, setMedicationQuery] = useState("");
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [previousNoteQuery, setPreviousNoteQuery] = useState("");
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [patientLockedState, setPatientLockedState] = useState(patientLocked);
  const [submitError, setSubmitError] = useState("");
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => {
      const nextForm = createInitialForm(preselectedPatient, initialData, providers);
      setForm(nextForm);
      setInitialSnapshot(nextForm);
      setIsDirty(false);
      setSubmitting(false);
      setSuccess(false);
      setErrors(buildDefaultErrors());
      setShowDiscardConfirm(false);
      setShowDeleteConfirm(false);
      setPatientSearchOpen(false);
      setPatientQuery(nextForm.patient?.name ?? "");
      setTestQuery("");
      setMedicationQuery("");
      setPharmacyQuery("");
      setPreviousNoteQuery("");
      setIsVitalsOpen(false);
      setDragActive(false);
      setPatientLockedState(patientLocked);
      setSubmitError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen, preselectedPatient, initialData, patientLocked, providers]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isOpen) return;
      if (isDirty && !success) {
        setShowDiscardConfirm(true);
      } else {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isDirty, success, onClose]);

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => {
      onClose();
      setSuccess(false);
      setForm(initialSnapshot);
      setIsDirty(false);
      setErrors(buildDefaultErrors());
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [success, onClose, initialSnapshot]);

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => patient.name.toLowerCase().includes(query) || patient.id.toLowerCase().includes(query));
  }, [patientQuery, patients]);

  const filteredTests = useMemo(() => {
    const query = testQuery.trim().toLowerCase();
    if (!query) return TEST_NAMES;
    return TEST_NAMES.filter((item) => item.toLowerCase().includes(query));
  }, [testQuery]);

  const filteredMedications = useMemo(() => {
    const query = medicationQuery.trim().toLowerCase();
    if (!query) return MEDICATIONS;
    return MEDICATIONS.filter((item) => item.toLowerCase().includes(query));
  }, [medicationQuery]);

  const filteredPharmacies = useMemo(() => {
    const query = pharmacyQuery.trim().toLowerCase();
    if (!query) return PHARMACIES;
    return PHARMACIES.filter((item) => item.toLowerCase().includes(query));
  }, [pharmacyQuery]);

  const filteredNotes = useMemo(() => {
    const query = previousNoteQuery.trim().toLowerCase();
    if (!query) return NOTES;
    return NOTES.filter((item) => item.toLowerCase().includes(query));
  }, [previousNoteQuery]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.patient) nextErrors.patient = "Patient is required";
    if (!form.date) nextErrors.date = "Date is required";
    if (!form.provider) nextErrors.provider = "Provider is required";

    if (form.recordType === "Visit") {
      if (!form.visitReason.trim()) nextErrors.visitReason = "Reason for visit is required";
    }

    if (form.recordType === "Lab Result") {
      if (!form.labTestName.trim()) nextErrors.labTestName = "Test name is required";
      if (!form.labResultValue.trim()) nextErrors.labResultValue = "Result value is required";
    }

    if (form.recordType === "Imaging") {
      if (!form.imagingStudyType) nextErrors.imagingStudyType = "Study type is required";
      if (!form.imagingFindings.trim()) nextErrors.imagingFindings = "Findings are required";
    }

    if (form.recordType === "Prescription") {
      if (!form.prescriptionMedicationName.trim()) nextErrors.prescriptionMedicationName = "Medication name is required";
      if (!form.prescriptionDosage.trim()) nextErrors.prescriptionDosage = "Dosage is required";
      if (!form.prescriptionDirections.trim()) nextErrors.prescriptionDirections = "Directions are required";
    }

    if (form.recordType === "Vaccination") {
      if (!form.vaccinationName.trim()) nextErrors.vaccinationName = "Vaccine name is required";
      if (!form.vaccinationExpirationDate) nextErrors.vaccinationExpirationDate = "Expiration date is required";
    }

    if (form.recordType === "Note") {
      if (!form.noteContent.trim()) nextErrors.noteContent = "Note content is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const markDirty = () => setIsDirty(true);

  const handleSubmit = async (event: React.FormEvent, saveState: RecordSaveState) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      await onSubmit({ ...form, saveState });
      setSuccess(true);
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || "Unable to save record.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    if (isDirty && !success) {
      setShowDiscardConfirm(true);
    } else if (!success) {
      onClose();
    }
  };

  const resetToInitial = () => {
    setForm(initialSnapshot);
    setIsDirty(false);
    setErrors(buildDefaultErrors());
    setPatientQuery(initialSnapshot.patient?.name ?? "");
    setTestQuery("");
    setMedicationQuery("");
    setPharmacyQuery("");
    setPreviousNoteQuery("");
    setIsVitalsOpen(false);
    setDragActive(false);
    setPatientSearchOpen(false);
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    resetToInitial();
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      resetToInitial();
      onClose();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || "Unable to delete record.";
      setSubmitError(message);
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectPatient = (patient: PatientSummary) => {
    setForm((previous) => ({ ...previous, patient }));
    setPatientQuery(patient.name);
    setPatientSearchOpen(false);
    setErrors((previous) => ({ ...previous, patient: "" }));
    markDirty();
  };

  const updateFiles = (incomingFiles: FileList | File[]) => {
    const newFiles = Array.from(incomingFiles).slice(0, 10).map(createEmptyFile);
    if (!newFiles.length) return;
    setForm((previous) => ({ ...previous, imagingFiles: [...previous.imagingFiles, ...newFiles] }));
    setDragActive(false);
    markDirty();
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      updateFiles(event.target.files);
      event.target.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setForm((previous) => ({
      ...previous,
      imagingFiles: previous.imagingFiles.filter((file) => file.id !== fileId),
    }));
    markDirty();
  };

  const showFieldError = (fieldName: string) => Boolean(errors[fieldName]);

  const recordTypeOptions: RecordType[] = ["Visit", "Lab Result", "Imaging", "Prescription", "Vaccination", "Note"];

  const saveLabel = saveLabelForType(form.recordType);

  if (!isOpen) return null;

  return (
    <>
      <div className="record-modal-backdrop" onClick={handleBackdropClick} />

      <div className="record-modal-container">
        <div className="record-modal-card">
          {success ? (
            <div className="record-success-state">
              <div className="record-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="record-success-title">Record Saved</h2>
              <p className="record-success-summary">
                {form.patient?.name ?? "Patient"} • {form.recordType}
              </p>
              <button type="button" className="record-btn-done" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="record-header">
                <div className="record-header-left">
                  <div className="record-icon-circle">
                    {form.recordType === "Lab Result" ? <FlaskConical size={20} strokeWidth={1.5} /> : null}
                    {form.recordType === "Imaging" ? <ScanSearch size={20} strokeWidth={1.5} /> : null}
                    {form.recordType === "Prescription" ? <Pill size={20} strokeWidth={1.5} /> : null}
                    {form.recordType === "Vaccination" ? <Syringe size={20} strokeWidth={1.5} /> : null}
                    {form.recordType === "Note" ? <NotebookText size={20} strokeWidth={1.5} /> : null}
                    {form.recordType === "Visit" ? <FileText size={20} strokeWidth={1.5} /> : null}
                  </div>
                  <div className="record-header-text">
                    <h1 className="record-header-title">{mode === "edit" ? "Edit Record" : "New Record"}</h1>
                    <p className="record-header-subtitle">
                      {mode === "edit" ? "Update this clinical entry" : "Add a clinical entry to the patient's history"}
                    </p>
                  </div>
                </div>
                <button type="button" className="record-close-btn" onClick={onClose} aria-label="Close modal">
                  Close
                </button>
              </div>

              <form className="record-form" onSubmit={(event) => handleSubmit(event, "final")}>
                <div className="record-field">
                  <label className="record-label">Record Type</label>
                  <div className="record-segmented-control">
                    {recordTypeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`record-segment ${form.recordType === option ? "active" : ""}`}
                        onClick={() => {
                          setForm((previous) => ({ ...previous, recordType: option }));
                          setErrors((previous) => ({ ...previous, visitReason: "", labTestName: "", labResultValue: "", imagingStudyType: "", imagingFindings: "", prescriptionMedicationName: "", prescriptionDosage: "", prescriptionDirections: "", vaccinationName: "", vaccinationExpirationDate: "", noteContent: "" }));
                          markDirty();
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="record-field">
                  <label className="record-label">Patient</label>
                  {patientLockedState && form.patient ? (
                    <div className="record-locked-patient">
                      <div className="record-patient-chip is-static">
                        <div className="record-chip-avatar">
                          {form.patient.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <span>{form.patient.name}</span>
                      </div>
                      <button
                        type="button"
                        className="record-link-button"
                        onClick={() => {
                          setPatientLockedState(false);
                          setPatientSearchOpen(true);
                          markDirty();
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="record-search-wrapper">
                      <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                      <input
                        type="text"
                        className={`record-input record-search-input ${showFieldError("patient") ? "record-input-error" : ""}`}
                        placeholder="Search by name or patient ID..."
                        value={patientQuery}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPatientQuery(value);
                          setPatientSearchOpen(true);
                          setForm((previous) => ({
                            ...previous,
                            patient: value ? { id: value.toLowerCase().replace(/\s+/g, "-"), name: value } : null,
                          }));
                          setErrors((previous) => ({ ...previous, patient: "" }));
                        }}
                        onFocus={() => setPatientSearchOpen(true)}
                        onBlur={() => window.setTimeout(() => setPatientSearchOpen(false), 150)}
                      />
                      {patientSearchOpen && filteredPatients.length > 0 ? (
                        <div className="record-suggestion-list">
                          {filteredPatients.map((patient) => (
                            <button key={patient.id} type="button" className="record-suggestion-item" onMouseDown={() => selectPatient(patient)}>
                              <span>{patient.name}</span>
                              <span>{patient.id}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {form.patient && !patientLockedState ? (
                    <button
                      type="button"
                      className="record-patient-chip"
                      onClick={() => {
                        setForm((previous) => ({ ...previous, patient: null }));
                        setPatientQuery("");
                        markDirty();
                      }}
                    >
                      <div className="record-chip-avatar">{form.patient.name.split(" ").map((part) => part[0]).join("")}</div>
                      <span>{form.patient.name}</span>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  ) : null}
                  {showFieldError("patient") ? (
                    <div className="record-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.patient}
                    </div>
                  ) : null}
                </div>

                <div className="record-field-grid record-field-grid-2">
                  <div className="record-field">
                    <label className="record-label">Date</label>
                    <SharedDatePicker
                      ariaLabel="Record date"
                      value={form.date}
                      onChange={(date) => {
                        setForm((previous) => ({ ...previous, date }));
                        setErrors((previous) => ({ ...previous, date: "" }));
                        markDirty();
                      }}
                      onBlur={() => {
                        if (!form.date) setErrors((previous) => ({ ...previous, date: "Date is required" }));
                      }}
                      error={showFieldError("date")}
                    />
                    {showFieldError("date") ? (
                      <div className="record-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.date}
                      </div>
                    ) : null}
                  </div>

                  <div className="record-field">
                    <label className="record-label">Provider</label>
                    <div className="record-select-with-icon">
                      <User size={16} strokeWidth={1.5} className="record-input-icon-left record-input-icon-left-select" />
                      <select
                        className={`record-select ${showFieldError("provider") ? "record-input-error" : ""}`}
                        value={form.provider}
                        onChange={(event) => {
                          setForm((previous) => ({ ...previous, provider: event.target.value, labOrderingProvider: event.target.value, vaccinationAdministeredBy: event.target.value }));
                          setErrors((previous) => ({ ...previous, provider: "" }));
                          markDirty();
                        }}
                        onBlur={() => {
                          if (!form.provider) setErrors((previous) => ({ ...previous, provider: "Provider is required" }));
                        }}
                      >
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                    </div>
                    {showFieldError("provider") ? (
                      <div className="record-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.provider}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div key={form.recordType} className="record-zone-transition">
                  {form.recordType === "Visit" ? (
                    <>
                      <div className="record-field">
                        <label className="record-label">Reason for Visit</label>
                        <textarea
                          className={`record-textarea ${showFieldError("visitReason") ? "record-input-error" : ""}`}
                          placeholder="Briefly describe symptoms or purpose."
                          value={form.visitReason}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, visitReason: event.target.value }));
                            setErrors((previous) => ({ ...previous, visitReason: "" }));
                            markDirty();
                          }}
                          onBlur={() => {
                            if (!form.visitReason.trim()) setErrors((previous) => ({ ...previous, visitReason: "Reason for visit is required" }));
                          }}
                        />
                        {showFieldError("visitReason") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.visitReason}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field">
                        <label className="record-label">Visit Type</label>
                        <div className="record-select-with-icon">
                          <select
                            className="record-select"
                            value={form.visitType}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, visitType: event.target.value as RecordForm["visitType"] }));
                              markDirty();
                            }}
                          >
                            <option value="Follow-up">Follow-up</option>
                            <option value="Annual Physical">Annual Physical</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Procedure">Procedure</option>
                          </select>
                          <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Chief complaint (optional)</label>
                        <input
                          className="record-input"
                          maxLength={500}
                          placeholder="Short chief complaint for predictive care"
                          value={form.chiefComplaint}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, chiefComplaint: event.target.value }));
                            markDirty();
                          }}
                        />
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Disposition (optional)</label>
                          <div className="record-select-with-icon">
                            <select
                              className="record-select"
                              value={form.visitDisposition}
                              onChange={(event) => {
                                setForm((previous) => ({
                                  ...previous,
                                  visitDisposition: event.target.value as RecordForm["visitDisposition"],
                                }));
                                markDirty();
                              }}
                            >
                              <option value="">—</option>
                              <option value="Routine">Routine</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Referred">Referred</option>
                              <option value="Observation">Observation</option>
                              <option value="Other">Other</option>
                            </select>
                            <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                          </div>
                        </div>
                        <div className="record-field">
                          <label className="record-label">Follow-up due (optional)</label>
                          <SharedDatePicker
                            ariaLabel="Follow-up due date"
                            value={form.followUpDueDate}
                            onChange={(followUpDueDate) => {
                              setForm((previous) => ({ ...previous, followUpDueDate }));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      <div className="record-accordion">
                        <button type="button" className="record-accordion-header" onClick={() => setIsVitalsOpen((previous) => !previous)}>
                          <span>Vital Signs</span>
                          <ChevronDown size={16} strokeWidth={1.5} className={`record-accordion-caret ${isVitalsOpen ? "open" : ""}`} />
                        </button>
                        {isVitalsOpen ? (
                          <div className="record-accordion-body">
                            <div className="record-field-grid record-field-grid-2">
                              <div className="record-field">
                                <label className="record-label">Blood Pressure Systolic</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitBpSystolic} onChange={(event) => { setForm((previous) => ({ ...previous, visitBpSystolic: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">mmHg</span>
                                </div>
                              </div>
                              <div className="record-field">
                                <label className="record-label">Blood Pressure Diastolic</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitBpDiastolic} onChange={(event) => { setForm((previous) => ({ ...previous, visitBpDiastolic: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">mmHg</span>
                                </div>
                              </div>
                            </div>
                            <div className="record-field-grid record-field-grid-3">
                              <div className="record-field">
                                <label className="record-label">Heart Rate</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitHeartRate} onChange={(event) => { setForm((previous) => ({ ...previous, visitHeartRate: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">bpm</span>
                                </div>
                              </div>
                              <div className="record-field">
                                <label className="record-label">Respiratory Rate</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitRespiratoryRate} onChange={(event) => { setForm((previous) => ({ ...previous, visitRespiratoryRate: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">breaths/min</span>
                                </div>
                              </div>
                              <div className="record-field">
                                <label className="record-label">Temperature</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitTemperature} onChange={(event) => { setForm((previous) => ({ ...previous, visitTemperature: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">°F</span>
                                </div>
                              </div>
                            </div>
                            <div className="record-field-grid record-field-grid-2">
                              <div className="record-field">
                                <label className="record-label">Weight</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitWeight} onChange={(event) => { setForm((previous) => ({ ...previous, visitWeight: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">lbs</span>
                                </div>
                              </div>
                              <div className="record-field">
                                <label className="record-label">Height</label>
                                <div className="record-input-unit-row">
                                  <input className="record-input" type="number" value={form.visitHeight} onChange={(event) => { setForm((previous) => ({ ...previous, visitHeight: event.target.value })); markDirty(); }} />
                                  <span className="record-unit-label">in</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field">
                        <label className="record-label">Assessment / Notes</label>
                        <textarea
                          className="record-textarea record-textarea-large"
                          placeholder="Assessment, plan, and clinical notes."
                          value={form.visitAssessment}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, visitAssessment: event.target.value }));
                            markDirty();
                          }}
                        />
                      </div>

                    </>
                  ) : null}

                  {form.recordType === "Lab Result" ? (
                    <>
                      <div className="record-field">
                        <label className="record-label">Test Name</label>
                        <div className="record-search-wrapper">
                          <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                          <input
                            className={`record-input record-search-input ${showFieldError("labTestName") ? "record-input-error" : ""}`}
                            placeholder="CBC Panel, Lipid Panel, HbA1c, etc."
                            value={form.labTestName}
                            onChange={(event) => {
                              const value = event.target.value;
                              setForm((previous) => ({ ...previous, labTestName: value }));
                              setTestQuery(value);
                              setErrors((previous) => ({ ...previous, labTestName: "" }));
                              markDirty();
                            }}
                            onFocus={() => setTestQuery(form.labTestName)}
                            onBlur={() => window.setTimeout(() => setTestQuery(""), 150)}
                          />
                          {testQuery && filteredTests.length > 0 ? (
                            <div className="record-suggestion-list">
                              {filteredTests.map((item) => (
                                <button key={item} type="button" className="record-suggestion-item" onMouseDown={() => { setForm((previous) => ({ ...previous, labTestName: item })); setTestQuery(item); setErrors((previous) => ({ ...previous, labTestName: "" })); markDirty(); }}>
                                  <span>{item}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {showFieldError("labTestName") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.labTestName}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className={`record-field record-result-row ${form.labStatus !== "Normal" ? `record-result-row-${form.labStatus.toLowerCase()}` : ""}`}>
                          <div className="record-field-grid record-field-grid-2">
                            <div className="record-field">
                              <label className="record-label">Result Value</label>
                              <input
                                className={`record-input ${showFieldError("labResultValue") ? "record-input-error" : ""}`}
                                type="text"
                                value={form.labResultValue}
                                onChange={(event) => {
                                  setForm((previous) => ({ ...previous, labResultValue: event.target.value }));
                                  setErrors((previous) => ({ ...previous, labResultValue: "" }));
                                  markDirty();
                                }}
                              />
                            </div>
                            <div className="record-field">
                              <label className="record-label">Unit</label>
                              <input
                                className="record-input"
                                type="text"
                                value={form.labUnit}
                                onChange={(event) => {
                                  setForm((previous) => ({ ...previous, labUnit: event.target.value }));
                                  markDirty();
                                }}
                              />
                            </div>
                          </div>
                          {form.labStatus !== "Normal" ? (
                            <div className="record-result-flag-row">
                              <label className="record-checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={form.labFlagForReview}
                                  onChange={(event) => {
                                    setForm((previous) => ({ ...previous, labFlagForReview: event.target.checked }));
                                    markDirty();
                                  }}
                                />
                                Flag for Review
                              </label>
                            </div>
                          ) : null}
                        </div>

                        <div className="record-field">
                          <label className="record-label">Reference Range</label>
                          <input
                            className="record-input"
                            type="text"
                            placeholder="4.0–11.0 K/uL"
                            value={form.labReferenceRange}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, labReferenceRange: event.target.value }));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Status</label>
                        <div className="record-segmented-control record-segmented-control-status">
                          {(["Normal", "Abnormal", "Critical"] as LabStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`record-segment ${form.labStatus === status ? "active" : ""} record-segment-${status.toLowerCase()}`}
                              onClick={() => {
                                setForm((previous) => ({ ...previous, labStatus: status }));
                                markDirty();
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Ordering Provider</label>
                        <div className="record-select-with-icon">
                          <select
                            className="record-select"
                            value={form.labOrderingProvider}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, labOrderingProvider: event.target.value }));
                              markDirty();
                            }}
                          >
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Notes</label>
                        <textarea
                          className="record-textarea"
                          placeholder="Interpretation and follow-up notes."
                          value={form.labNotes}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, labNotes: event.target.value }));
                            markDirty();
                          }}
                        />
                      </div>
                    </>
                  ) : null}

                  {form.recordType === "Imaging" ? (
                    <>
                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Study Type</label>
                          <div className="record-select-with-icon">
                            <select
                              className={`record-select ${showFieldError("imagingStudyType") ? "record-input-error" : ""}`}
                              value={form.imagingStudyType}
                              onChange={(event) => {
                                setForm((previous) => ({ ...previous, imagingStudyType: event.target.value as RecordForm["imagingStudyType"] }));
                                setErrors((previous) => ({ ...previous, imagingStudyType: "" }));
                                markDirty();
                              }}
                            >
                              <option value="X-Ray">X-Ray</option>
                              <option value="CT">CT</option>
                              <option value="MRI">MRI</option>
                              <option value="Ultrasound">Ultrasound</option>
                              <option value="PET">PET</option>
                              <option value="Mammography">Mammography</option>
                            </select>
                            <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                          </div>
                        </div>
                        <div className="record-field">
                          <label className="record-label">Body Part / Region</label>
                          <input className="record-input" type="text" value={form.imagingBodyPart} onChange={(event) => { setForm((previous) => ({ ...previous, imagingBodyPart: event.target.value })); markDirty(); }} />
                        </div>
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Findings</label>
                          <textarea
                            className={`record-textarea record-textarea-medium ${showFieldError("imagingFindings") ? "record-input-error" : ""}`}
                            placeholder="Detailed description of imaging findings."
                            value={form.imagingFindings}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, imagingFindings: event.target.value }));
                              setErrors((previous) => ({ ...previous, imagingFindings: "" }));
                              markDirty();
                            }}
                          />
                          {showFieldError("imagingFindings") ? (
                            <div className="record-error-message">
                              <AlertCircle size={14} strokeWidth={1.5} />
                              {errors.imagingFindings}
                            </div>
                          ) : null}
                        </div>
                        <div className="record-field">
                          <label className="record-label">Impression</label>
                          <textarea
                            className="record-textarea record-textarea-medium"
                            placeholder="Clinical impression and recommendations."
                            value={form.imagingImpression}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, imagingImpression: event.target.value }));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Images</label>
                        <div
                          className={`record-upload-zone ${dragActive ? "drag-active" : ""}`}
                          onClick={() => hiddenFileInputRef.current?.click()}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragActive(true);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragActive(true);
                          }}
                          onDragLeave={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragActive(false);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            updateFiles(event.dataTransfer.files);
                          }}
                        >
                          <Upload size={24} strokeWidth={1.5} />
                          <div className="record-upload-copy">
                            <span>Drop DICOM or images, or click to browse</span>
                            <span>Max 20MB</span>
                          </div>
                          <input ref={hiddenFileInputRef} type="file" hidden multiple onChange={handleFileInput} accept="image/*,.dcm" />
                        </div>
                        {form.imagingFiles.length > 0 ? (
                          <div className="record-file-chip-list">
                            {form.imagingFiles.map((file) => (
                              <span key={file.id} className="record-file-chip">
                                <ImageIcon size={14} strokeWidth={1.5} />
                                <span>{file.name}</span>
                                <span>{formatFileSize(file.size)}</span>
                                <button type="button" className="record-chip-remove" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.name}`}>
                                  <X size={12} strokeWidth={1.5} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field">
                        <label className="record-label">Radiologist</label>
                        <div className="record-select-with-icon">
                          <select
                            className="record-select"
                            value={form.imagingRadiologist}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, imagingRadiologist: event.target.value }));
                              markDirty();
                            }}
                          >
                            <option value="">Same as ordering provider</option>
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                        </div>
                      </div>
                    </>
                  ) : null}

                  {form.recordType === "Prescription" ? (
                    <>
                      <div className="record-field">
                        <label className="record-label">Medication Name</label>
                        <div className="record-search-wrapper">
                          <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                          <input
                            className={`record-input record-search-input ${showFieldError("prescriptionMedicationName") ? "record-input-error" : ""}`}
                            placeholder="Search or type a medication"
                            value={form.prescriptionMedicationName}
                            onChange={(event) => {
                              const value = event.target.value;
                              setForm((previous) => ({ ...previous, prescriptionMedicationName: value }));
                              setMedicationQuery(value);
                              setErrors((previous) => ({ ...previous, prescriptionMedicationName: "" }));
                              markDirty();
                            }}
                            onFocus={() => setMedicationQuery(form.prescriptionMedicationName)}
                            onBlur={() => window.setTimeout(() => setMedicationQuery(""), 150)}
                          />
                          {medicationQuery && filteredMedications.length > 0 ? (
                            <div className="record-suggestion-list">
                              {filteredMedications.map((item) => (
                                <button key={item} type="button" className="record-suggestion-item" onMouseDown={() => { setForm((previous) => ({ ...previous, prescriptionMedicationName: item })); setMedicationQuery(item); setErrors((previous) => ({ ...previous, prescriptionMedicationName: "" })); markDirty(); }}>
                                  <span>{item}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {showFieldError("prescriptionMedicationName") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.prescriptionMedicationName}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Dosage</label>
                          <input
                            className={`record-input ${showFieldError("prescriptionDosage") ? "record-input-error" : ""}`}
                            type="text"
                            placeholder="10mg"
                            value={form.prescriptionDosage}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, prescriptionDosage: event.target.value }));
                              setErrors((previous) => ({ ...previous, prescriptionDosage: "" }));
                              markDirty();
                            }}
                          />
                        </div>
                        <div className="record-field">
                          <label className="record-label">Form</label>
                          <div className="record-select-with-icon">
                            <select
                              className="record-select"
                              value={form.prescriptionForm}
                              onChange={(event) => {
                                setForm((previous) => ({ ...previous, prescriptionForm: event.target.value as RecordForm["prescriptionForm"] }));
                                markDirty();
                              }}
                            >
                              <option value="Tablet">Tablet</option>
                              <option value="Capsule">Capsule</option>
                              <option value="Liquid">Liquid</option>
                              <option value="Injection">Injection</option>
                              <option value="Topical">Topical</option>
                            </select>
                            <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                          </div>
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Directions / Sig</label>
                        <textarea
                          className={`record-textarea ${showFieldError("prescriptionDirections") ? "record-input-error" : ""}`}
                          placeholder="Take 1 tablet by mouth twice daily with food"
                          value={form.prescriptionDirections}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, prescriptionDirections: event.target.value }));
                            setErrors((previous) => ({ ...previous, prescriptionDirections: "" }));
                            markDirty();
                          }}
                        />
                        {showFieldError("prescriptionDirections") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.prescriptionDirections}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Quantity</label>
                          <input
                            className="record-input"
                            type="number"
                            value={form.prescriptionQuantity}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, prescriptionQuantity: event.target.value }));
                              markDirty();
                            }}
                          />
                        </div>
                        <div className="record-field">
                          <label className="record-label">Refills</label>
                          <input
                            className="record-input"
                            type="number"
                            min={0}
                            max={12}
                            value={form.prescriptionRefills}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, prescriptionRefills: event.target.value }));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Pharmacy</label>
                        <div className="record-search-wrapper">
                          <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                          <input
                            className="record-input record-search-input"
                            placeholder="Search pharmacy"
                            value={form.prescriptionPharmacy}
                            onChange={(event) => {
                              const value = event.target.value;
                              setForm((previous) => ({ ...previous, prescriptionPharmacy: value }));
                              setPharmacyQuery(value);
                              markDirty();
                            }}
                            onFocus={() => setPharmacyQuery(form.prescriptionPharmacy)}
                            onBlur={() => window.setTimeout(() => setPharmacyQuery(""), 150)}
                          />
                          {pharmacyQuery && filteredPharmacies.length > 0 ? (
                            <div className="record-suggestion-list">
                              {filteredPharmacies.map((item) => (
                                <button key={item} type="button" className="record-suggestion-item" onMouseDown={() => { setForm((previous) => ({ ...previous, prescriptionPharmacy: item })); setPharmacyQuery(item); markDirty(); }}>
                                  <span>{item}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <button type="button" className="record-link-button record-link-button-inline">Add New Pharmacy</button>
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Start Date</label>
                          <SharedDatePicker
                            ariaLabel="Prescription start date"
                            value={form.prescriptionStartDate}
                            onChange={(prescriptionStartDate) => {
                              setForm((previous) => ({ ...previous, prescriptionStartDate }));
                              markDirty();
                            }}
                          />
                        </div>
                        <div className="record-field">
                          <label className="record-label">End Date</label>
                          <SharedDatePicker
                            ariaLabel="Prescription end date"
                            value={form.prescriptionEndDate}
                            onChange={(prescriptionEndDate) => {
                              setForm((previous) => ({ ...previous, prescriptionEndDate }));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-checkbox-row record-checkbox-toggle-row">
                          <span>Substitution Allowed?</span>
                          <button
                            type="button"
                            className={`record-toggle ${form.substitutionAllowed ? "on" : "off"}`}
                            onClick={() => {
                              setForm((previous) => ({ ...previous, substitutionAllowed: !previous.substitutionAllowed }));
                              markDirty();
                            }}
                          >
                            <span className="record-toggle-thumb" />
                            <span>{form.substitutionAllowed ? "Yes" : "No"}</span>
                          </button>
                        </label>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Notes for Pharmacist</label>
                        <textarea className="record-textarea" value={form.prescriptionNotes} onChange={(event) => { setForm((previous) => ({ ...previous, prescriptionNotes: event.target.value })); markDirty(); }} />
                      </div>
                    </>
                  ) : null}

                  {form.recordType === "Vaccination" ? (
                    <>
                      <div className="record-field">
                        <label className="record-label">Vaccine Name</label>
                        <div className="record-search-wrapper">
                          <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                          <input
                            className={`record-input record-search-input ${showFieldError("vaccinationName") ? "record-input-error" : ""}`}
                            placeholder="Influenza, COVID-19, Tdap, MMR, Hepatitis B..."
                            value={form.vaccinationName}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, vaccinationName: event.target.value }));
                              setErrors((previous) => ({ ...previous, vaccinationName: "" }));
                              markDirty();
                            }}
                          />
                        </div>
                        {showFieldError("vaccinationName") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.vaccinationName}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Lot Number</label>
                          <input className="record-input" type="text" value={form.vaccinationLotNumber} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationLotNumber: event.target.value })); markDirty(); }} />
                        </div>
                        <div className="record-field">
                          <label className="record-label">Expiration Date</label>
                          <SharedDatePicker
                            ariaLabel="Vaccination expiration date"
                            value={form.vaccinationExpirationDate}
                            onChange={(vaccinationExpirationDate) => {
                              setForm((previous) => ({ ...previous, vaccinationExpirationDate }));
                              setErrors((previous) => ({ ...previous, vaccinationExpirationDate: "" }));
                              markDirty();
                            }}
                            error={showFieldError("vaccinationExpirationDate")}
                          />
                          {showFieldError("vaccinationExpirationDate") ? (
                            <div className="record-error-message">
                              <AlertCircle size={14} strokeWidth={1.5} />
                              {errors.vaccinationExpirationDate}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Site</label>
                          <div className="record-select-with-icon">
                            <select className="record-select" value={form.vaccinationSite} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationSite: event.target.value as RecordForm["vaccinationSite"] })); markDirty(); }}>
                              <option value="Left Arm">Left Arm</option>
                              <option value="Right Arm">Right Arm</option>
                              <option value="Left Thigh">Left Thigh</option>
                              <option value="Right Thigh">Right Thigh</option>
                              <option value="Other">Other</option>
                            </select>
                            <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                          </div>
                        </div>
                        <div className="record-field">
                          <label className="record-label">Route</label>
                          <div className="record-select-with-icon">
                            <select className="record-select" value={form.vaccinationRoute} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationRoute: event.target.value as RecordForm["vaccinationRoute"] })); markDirty(); }}>
                              <option value="Intramuscular">Intramuscular</option>
                              <option value="Subcutaneous">Subcutaneous</option>
                              <option value="Oral">Oral</option>
                              <option value="Nasal">Nasal</option>
                            </select>
                            <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                          </div>
                        </div>
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Dose Number</label>
                          <input className="record-input" type="text" placeholder="1 of 2" value={form.vaccinationDoseNumber} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationDoseNumber: event.target.value })); markDirty(); }} />
                        </div>
                        <div className="record-field">
                          <label className="record-checkbox-row record-checkbox-toggle-row">
                            <span>Series Complete?</span>
                            <input type="checkbox" checked={form.vaccinationSeriesComplete} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationSeriesComplete: event.target.checked })); markDirty(); }} />
                          </label>
                        </div>
                      </div>

                      <div className="record-field-grid record-field-grid-2">
                        <div className="record-field">
                          <label className="record-label">Next Dose Due</label>
                          <SharedDatePicker
                            ariaLabel="Vaccination next dose due date"
                            value={form.vaccinationNextDoseDue}
                            onChange={(vaccinationNextDoseDue) => {
                              setForm((previous) => ({ ...previous, vaccinationNextDoseDue }));
                              markDirty();
                            }}
                          />
                        </div>
                        <div className="record-field">
                          <label className="record-checkbox-row record-checkbox-toggle-row">
                            <span>VIS Given?</span>
                            <input type="checkbox" checked={form.vaccinationVisGiven} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationVisGiven: event.target.checked })); markDirty(); }} />
                          </label>
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Administered By</label>
                        <div className="record-select-with-icon">
                          <select className="record-select" value={form.vaccinationAdministeredBy} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationAdministeredBy: event.target.value })); markDirty(); }}>
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Notes</label>
                        <textarea className="record-textarea" value={form.vaccinationNotes} onChange={(event) => { setForm((previous) => ({ ...previous, vaccinationNotes: event.target.value })); markDirty(); }} />
                      </div>
                    </>
                  ) : null}

                  {form.recordType === "Note" ? (
                    <>
                      <div className="record-field">
                        <label className="record-label">Note Type</label>
                        <div className="record-select-with-icon">
                          <select className="record-select" value={form.noteType} onChange={(event) => { setForm((previous) => ({ ...previous, noteType: event.target.value as RecordForm["noteType"] })); markDirty(); }}>
                            <option value="Progress Note">Progress Note</option>
                            <option value="Consultation Note">Consultation Note</option>
                            <option value="Nursing Note">Nursing Note</option>
                            <option value="Discharge Summary">Discharge Summary</option>
                            <option value="Phone Call">Phone Call</option>
                          </select>
                          <ChevronDown size={12} strokeWidth={1.5} className="record-select-caret" />
                        </div>
                      </div>

                      <div className="record-field">
                        <label className="record-label">Content</label>
                        <textarea
                          className={`record-textarea record-textarea-xl ${showFieldError("noteContent") ? "record-input-error" : ""}`}
                          placeholder="Document the clinical note."
                          value={form.noteContent}
                          onChange={(event) => {
                            setForm((previous) => ({ ...previous, noteContent: event.target.value }));
                            setErrors((previous) => ({ ...previous, noteContent: "" }));
                            markDirty();
                          }}
                        />
                        {showFieldError("noteContent") ? (
                          <div className="record-error-message">
                            <AlertCircle size={14} strokeWidth={1.5} />
                            {errors.noteContent}
                          </div>
                        ) : null}
                      </div>

                      <div className="record-field">
                        <label className="record-checkbox-row record-checkbox-toggle-row">
                          <span>This is an addendum to a previous note</span>
                          <input
                            type="checkbox"
                            checked={form.noteIsAddendum}
                            onChange={(event) => {
                              setForm((previous) => ({ ...previous, noteIsAddendum: event.target.checked }));
                              markDirty();
                            }}
                          />
                        </label>
                      </div>

                      {form.noteIsAddendum ? (
                        <div className="record-field">
                          <label className="record-label">Link to Previous Note</label>
                          <div className="record-search-wrapper">
                            <Search size={18} strokeWidth={1.5} className="record-input-icon-left" />
                            <input
                              className="record-input record-search-input"
                              placeholder="Search previous note"
                              value={form.previousNote}
                              onChange={(event) => {
                                const value = event.target.value;
                                setForm((previous) => ({ ...previous, previousNote: value }));
                                setPreviousNoteQuery(value);
                                markDirty();
                              }}
                              onFocus={() => setPreviousNoteQuery(form.previousNote)}
                              onBlur={() => window.setTimeout(() => setPreviousNoteQuery(""), 150)}
                            />
                            {previousNoteQuery && filteredNotes.length > 0 ? (
                              <div className="record-suggestion-list">
                                {filteredNotes.map((item) => (
                                  <button key={item} type="button" className="record-suggestion-item" onMouseDown={() => { setForm((previous) => ({ ...previous, previousNote: item })); setPreviousNoteQuery(item); markDirty(); }}>
                                    <span>{item}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {submitError ? (
                  <div className="record-error-message">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {submitError}
                  </div>
                ) : null}
                <div className="record-footer-buttons">
                  <div className="record-footer-left">
                    {mode === "edit" ? (
                      <button type="button" className="record-btn-text record-btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 size={14} strokeWidth={1.5} />
                        Delete Record
                      </button>
                    ) : (
                      <button type="button" className="record-btn-text" onClick={(event) => handleSubmit(event as unknown as React.FormEvent, "draft")}>Save as Draft</button>
                    )}
                  </div>

                  <div className="record-footer-right">
                    <button type="button" className="record-btn-cancel" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="record-btn-primary"
                      disabled={submitting}
                      onClick={(event) => handleSubmit(event, "final")}
                    >
                      {submitting ? "Saving..." : saveLabel}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {showDiscardConfirm ? (
        <div className="record-confirm-overlay">
          <div className="record-confirm-card">
            <h4 className="record-confirm-title">You have unsaved changes</h4>
            <p className="record-confirm-copy">Discard your changes and close?</p>
            <div className="record-confirm-actions">
              <button type="button" className="record-btn-cancel" onClick={() => setShowDiscardConfirm(false)}>
                Keep Editing
              </button>
              <button type="button" className="record-btn-primary record-btn-primary-danger" onClick={handleDiscard}>
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="record-confirm-overlay">
          <div className="record-confirm-card">
            <h4 className="record-confirm-title">Delete this record?</h4>
            <p className="record-confirm-copy">This action cannot be undone.</p>
            <div className="record-confirm-actions">
              <button type="button" className="record-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="record-btn-primary record-btn-primary-danger" onClick={handleDelete}>
                Delete Record
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
