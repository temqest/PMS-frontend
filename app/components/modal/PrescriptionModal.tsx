"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pill,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Calendar,
} from "lucide-react";
import "./PrescriptionModal.css";
import type { PatientOption } from "../../../lib/api";

type PrescriptionData = {
  id?: string;
  patient?: { id: string; name: string } | null;
  medicationName?: string;
  dosage?: string;
  form?: "Tablet" | "Capsule" | "Liquid" | "Injection" | "Patch" | "Other";
  directionsForUse?: string;
  quantity?: number;
  refills?: number;
  pharmacy?: { id: string; name: string; address: string; phone: string } | null;
  prescriber?: string;
  startDate?: string;
  endDate?: string;
  substitutionAllowed?: boolean;
  additionalNotes?: string;
  originalIssueDate?: string;
};

const MEDICATIONS = [
  { name: "Lisinopril", dosages: ["5mg", "10mg", "20mg", "40mg"] },
  { name: "Metformin", dosages: ["500mg", "850mg", "1000mg"] },
  { name: "Atorvastatin", dosages: ["10mg", "20mg", "40mg", "80mg"] },
  { name: "Omeprazole", dosages: ["20mg", "40mg"] },
  { name: "Amoxicillin", dosages: ["250mg", "500mg", "875mg"] },
];

const FORMS = ["Tablet", "Capsule", "Liquid", "Injection", "Patch", "Other"];

const PHARMACIES = [
  { id: "ph1", name: "CVS Pharmacy", address: "123 Main St", phone: "(555) 123-4567" },
  { id: "ph2", name: "Walgreens", address: "456 Oak Ave", phone: "(555) 234-5678" },
  { id: "ph3", name: "Rite Aid", address: "789 Elm Rd", phone: "(555) 345-6789" },
];

const PROVIDERS = [
  { id: "dr1", name: "Dr. Amelia Doe" },
  { id: "dr2", name: "Dr. Maya Patel" },
  { id: "dr3", name: "Dr. Elena Ruiz" },
];

const TODAY = new Date().toISOString().split("T")[0];

export default function PrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  preselectedPatient,
  patients = [],
  initialData,
  mode = "create",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PrescriptionData) => Promise<void> | void;
  preselectedPatient?: { id: string; name: string };
  patients?: PatientOption[];
  initialData?: PrescriptionData;
  mode?: "create" | "edit" | "renew";
}) {
  const [form, setForm] = useState<PrescriptionData>({
    patient: preselectedPatient || null,
    medicationName: initialData?.medicationName || "",
    dosage: initialData?.dosage || "",
    form: initialData?.form || "Tablet",
    directionsForUse: initialData?.directionsForUse || "",
    quantity: initialData?.quantity || 30,
    refills: initialData?.refills || 0,
    pharmacy: initialData?.pharmacy || null,
    prescriber: initialData?.prescriber || "dr1",
    startDate: initialData?.startDate || TODAY,
    endDate: initialData?.endDate || "",
    substitutionAllowed: initialData?.substitutionAllowed !== false,
    additionalNotes: initialData?.additionalNotes || "",
    originalIssueDate: initialData?.originalIssueDate,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationSuggestions, setMedicationSuggestions] = useState<typeof MEDICATIONS>([]);
  const [showMedicationSuggestions, setShowMedicationSuggestions] = useState(false);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.name || "");
  const [submitError, setSubmitError] = useState("");

  const isDirty = useMemo(
    () =>
      !!(
        form.patient ||
        form.medicationName ||
        form.dosage ||
        form.form !== "Tablet" ||
        form.directionsForUse ||
        form.quantity !== 30 ||
        form.refills !== 0 ||
        form.pharmacy ||
        form.prescriber !== "dr1" ||
        form.startDate !== TODAY ||
        form.endDate ||
        !form.substitutionAllowed ||
        form.additionalNotes
      ),
    [form]
  );

  const resetForm = useCallback(() => {
    setForm({
      patient: preselectedPatient || null,
      medicationName: "",
      dosage: "",
      form: "Tablet",
      directionsForUse: "",
      quantity: 30,
      refills: 0,
      pharmacy: null,
      prescriber: "dr1",
      startDate: TODAY,
      endDate: "",
      substitutionAllowed: true,
      additionalNotes: "",
    });
    setChangedFields(new Set());
  }, [preselectedPatient]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isDirty && !success) {
          setShowDiscardConfirm(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isDirty, success, onClose]);

  // Close on success
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        onClose();
        setSuccess(false);
        resetForm();
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [success, onClose, resetForm]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.patient) newErrors.patient = "Patient is required";
    if (!form.medicationName?.trim()) newErrors.medicationName = "Medication name is required";
    if (!form.dosage?.trim()) newErrors.dosage = "Dosage is required";
    if (!form.directionsForUse?.trim()) newErrors.directionsForUse = "Directions for use are required";
    if (!form.quantity || form.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
    if (form.refills === undefined || form.refills < 0 || form.refills > 12)
      newErrors.refills = "Refills must be between 0 and 12";
    if (!form.startDate) newErrors.startDate = "Start date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      newErrors.endDate = "End date must be after start date";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      await onSubmit(form);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string; error?: string; detail?: string };
      setSubmitError(e?.message || e?.error || e?.detail || "Unable to save prescription.");
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

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    resetForm();
    onClose();
  };

  const handleMedicationChange = (value: string) => {
    setForm((prev) => ({ ...prev, medicationName: value }));
    setMedicationSearch(value);
    setChangedFields((prev) => new Set([...prev, "medicationName"]));
    setErrors((prev) => ({ ...prev, medicationName: "" }));

    if (value.length > 0) {
      const filtered = MEDICATIONS.filter((m) =>
        m.name.toLowerCase().includes(value.toLowerCase())
      );
      setMedicationSuggestions(filtered);
      setShowMedicationSuggestions(true);
    } else {
      setShowMedicationSuggestions(false);
    }
  };

  const selectMedication = (med: typeof MEDICATIONS[0]) => {
    setForm((prev) => ({ ...prev, medicationName: med.name }));
    setMedicationSearch(med.name);
    setShowMedicationSuggestions(false);
    setChangedFields((prev) => new Set([...prev, "medicationName"]));
  };

  if (!isOpen) return null;

  const filteredPatients = patientQuery.trim()
    ? patients
        .filter(
          (item) =>
            item.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(patientQuery.toLowerCase())
        )
        .slice(0, 8)
    : patients.slice(0, 8);

  const prescriptionName = form.medicationName || "New Prescription";
  const successMessage =
    mode === "create"
      ? "Sent to Pharmacy"
      : mode === "edit"
        ? "Changes Saved"
        : "Prescription Renewed";

  return (
    <>
      {/* Backdrop */}
      <div className="prescription-modal-backdrop" onClick={handleBackdropClick} />

      {/* Modal Card */}
      <div className="prescription-modal-container">
        <div className="prescription-modal-card">
          {/* Success State */}
          {success && (
            <div className="prescription-success-state">
              <div className="prescription-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="prescription-success-title">{successMessage}</h2>
              <p className="prescription-success-summary">
                {prescriptionName} for {form.patient?.name}
              </p>
              <button
                type="button"
                className="prescription-btn-done"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}

          {/* Main Form State */}
          {!success && (
            <>
              {/* Header */}
              <div className="prescription-header">
                <div className="prescription-header-left">
                  <div className="prescription-icon-circle">
                    <Pill size={20} strokeWidth={1.5} />
                  </div>
                  <div className="prescription-header-text">
                    <h1 className="prescription-header-title">
                      {mode === "create"
                        ? "New Prescription"
                        : mode === "edit"
                          ? "Edit Prescription"
                          : "Renew Prescription"}
                    </h1>
                    <p className="prescription-header-subtitle">
                      {mode === "create"
                        ? "Create a new prescription"
                        : mode === "edit"
                          ? "Update prescription details"
                          : "Renew an existing prescription"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="prescription-close-btn"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Renew Mode Banner */}
              {mode === "renew" && form.originalIssueDate && (
                <div className="prescription-renew-banner">
                  <AlertCircle size={16} strokeWidth={1.5} />
                  <div>
                    <p className="prescription-renew-title">Renewing Prescription</p>
                    <p className="prescription-renew-text">
                      Originally issued on {new Date(form.originalIssueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="prescription-form">
                {/* Patient Field */}
                <div className="prescription-field prescription-field-full">
                  <label className="prescription-label">Patient</label>
                  {preselectedPatient ? (
                    <div className="prescription-patient-chip-wrapper">
                      <div className="prescription-patient-chip">
                        <div className="prescription-patient-avatar">
                          {form.patient?.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span>{form.patient?.name}</span>
                      </div>
                      <button
                        type="button"
                        className="prescription-patient-change"
                        onClick={() => setPatientSearchOpen(true)}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="prescription-field">
                      <input
                        type="text"
                        placeholder="Search patient by name or ID..."
                        className={`prescription-input ${
                          errors.patient ? "prescription-input-error" : ""
                        }`}
                        value={patientQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPatientQuery(value);
                          setForm((prev) => ({
                            ...prev,
                            patient: null,
                          }));
                          setErrors((prev) => ({ ...prev, patient: "" }));
                        }}
                        onFocus={() => setPatientSearchOpen(true)}
                        onBlur={() => setTimeout(() => setPatientSearchOpen(false), 100)}
                      />
                      {patientSearchOpen && filteredPatients.length > 0 ? (
                        <div className="mt-2 max-h-40 overflow-auto rounded-[12px] border border-[#E5E7EB] bg-white p-1">
                          {filteredPatients.map((patient) => (
                            <button
                              key={patient.id}
                              type="button"
                              className="w-full rounded-[8px] px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#F3F4F6]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, patient }));
                                setPatientQuery(patient.name);
                                setPatientSearchOpen(false);
                                setErrors((prev) => ({ ...prev, patient: "" }));
                              }}
                            >
                              <span className="font-medium">{patient.name}</span>
                              <span className="ml-2 text-xs text-slate-400">{patient.id}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {errors.patient && (
                    <div className="prescription-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.patient}
                    </div>
                  )}
                </div>

                {/* Medication Section Header */}
                <div className="prescription-section-header">
                  <h2 className="prescription-section-title">Medication & Dosage</h2>
                </div>

                {/* Medication Name */}
                <div className="prescription-field prescription-field-full">
                  <label className="prescription-label">Medication Name</label>
                  <div className="prescription-medication-wrapper">
                    <input
                      type="text"
                      placeholder="Search or type medication..."
                      className={`prescription-input ${
                        changedFields.has("medicationName")
                          ? "prescription-input-changed"
                          : ""
                      } ${errors.medicationName ? "prescription-input-error" : ""}`}
                      value={medicationSearch}
                      onChange={(e) => handleMedicationChange(e.target.value)}
                      onFocus={() => medicationSearch && setShowMedicationSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowMedicationSuggestions(false), 200)
                      }
                    />
                    {showMedicationSuggestions && medicationSuggestions.length > 0 && (
                      <div className="prescription-medication-suggestions">
                        {medicationSuggestions.map((med) => (
                          <button
                            key={med.name}
                            type="button"
                            onClick={() => selectMedication(med)}
                            className="prescription-suggestion-item"
                          >
                            <Pill size={14} strokeWidth={1.5} />
                            {med.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.medicationName && (
                    <div className="prescription-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.medicationName}
                    </div>
                  )}
                </div>

                {/* Dosage & Form Row */}
                <div className="prescription-field-row prescription-field-row-2">
                  <div className="prescription-field">
                    <label className="prescription-label">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g., 10mg"
                      className={`prescription-input ${
                        changedFields.has("dosage") ? "prescription-input-changed" : ""
                      } ${errors.dosage ? "prescription-input-error" : ""}`}
                      value={form.dosage || ""}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, dosage: e.target.value }));
                        setChangedFields((prev) => new Set([...prev, "dosage"]));
                        setErrors((prev) => ({ ...prev, dosage: "" }));
                      }}
                    />
                    {errors.dosage && (
                      <div className="prescription-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.dosage}
                      </div>
                    )}
                  </div>

                  <div className="prescription-field">
                    <label className="prescription-label">Form</label>
                    <div className="prescription-select-wrapper">
                      <select
                        className={`prescription-select ${
                          changedFields.has("form") ? "prescription-input-changed" : ""
                        }`}
                        value={form.form || "Tablet"}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            form: e.target.value as PrescriptionData["form"],
                          }));
                          setChangedFields((prev) => new Set([...prev, "form"]));
                        }}
                      >
                        {FORMS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        strokeWidth={1.5}
                        className="prescription-select-caret"
                      />
                    </div>
                  </div>
                </div>

                {/* Directions for Use */}
                <div className="prescription-field prescription-field-full">
                  <label className="prescription-label">Directions for Use</label>
                  <textarea
                    className={`prescription-textarea ${
                      changedFields.has("directionsForUse")
                        ? "prescription-input-changed"
                        : ""
                    } ${errors.directionsForUse ? "prescription-input-error" : ""}`}
                    placeholder="e.g., Take 1 tablet by mouth twice daily with food"
                    value={form.directionsForUse || ""}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        directionsForUse: e.target.value,
                      }));
                      setChangedFields((prev) => new Set([...prev, "directionsForUse"]));
                      setErrors((prev) => ({ ...prev, directionsForUse: "" }));
                    }}
                  />
                  {errors.directionsForUse && (
                    <div className="prescription-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.directionsForUse}
                    </div>
                  )}
                </div>

                {/* Quantity & Refills Row */}
                <div className="prescription-field-row prescription-field-row-2">
                  <div className="prescription-field">
                    <label className="prescription-label">Quantity</label>
                    <input
                      type="number"
                      placeholder="30"
                      className={`prescription-input ${
                        changedFields.has("quantity") ? "prescription-input-changed" : ""
                      } ${errors.quantity ? "prescription-input-error" : ""}`}
                      value={form.quantity || ""}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 0,
                        }));
                        setChangedFields((prev) => new Set([...prev, "quantity"]));
                        setErrors((prev) => ({ ...prev, quantity: "" }));
                      }}
                      min="1"
                    />
                    {errors.quantity && (
                      <div className="prescription-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.quantity}
                      </div>
                    )}
                  </div>

                  <div className="prescription-field">
                    <label className="prescription-label">Refills (0-12)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className={`prescription-input ${
                        changedFields.has("refills") ? "prescription-input-changed" : ""
                      } ${errors.refills ? "prescription-input-error" : ""}`}
                      value={form.refills !== undefined ? form.refills : ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setForm((prev) => ({
                          ...prev,
                          refills: Math.min(Math.max(val, 0), 12),
                        }));
                        setChangedFields((prev) => new Set([...prev, "refills"]));
                        setErrors((prev) => ({ ...prev, refills: "" }));
                      }}
                      min="0"
                      max="12"
                    />
                    {errors.refills && (
                      <div className="prescription-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.refills}
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Information Accordion */}
                <div className="prescription-accordion">
                  <button
                    type="button"
                    className="prescription-accordion-header"
                    onClick={() => setSecondaryOpen(!secondaryOpen)}
                  >
                    <div className="prescription-accordion-text">
                      <h3 className="prescription-accordion-title">Additional Details</h3>
                      <p className="prescription-accordion-subtitle">
                        Pharmacy, dates, substitution, and notes
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.5}
                      className={`prescription-accordion-caret ${secondaryOpen ? "open" : ""}`}
                    />
                  </button>

                  {secondaryOpen && (
                    <div className="prescription-accordion-content">
                      {/* Pharmacy */}
                      <div className="prescription-field">
                        <label className="prescription-label">Preferred Pharmacy</label>
                        <div className="prescription-select-wrapper">
                          <select
                            className="prescription-select"
                            value={form.pharmacy?.id || ""}
                            onChange={(e) => {
                              const selected = PHARMACIES.find((p) => p.id === e.target.value);
                              setForm((prev) => ({
                                ...prev,
                                pharmacy: selected || null,
                              }));
                            }}
                          >
                            <option value="">Select pharmacy</option>
                            {PHARMACIES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} • {p.address}
                              </option>
                            ))}
                            <option value="new">+ Add New Pharmacy</option>
                          </select>
                          <ChevronDown
                            size={12}
                            strokeWidth={1.5}
                            className="prescription-select-caret"
                          />
                        </div>
                      </div>

                      {/* Prescriber */}
                      <div className="prescription-field">
                        <label className="prescription-label">Prescriber</label>
                        <div className="prescription-select-wrapper">
                          <select
                            className="prescription-select"
                            value={form.prescriber || "dr1"}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                prescriber: e.target.value,
                              }))
                            }
                          >
                            {PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            strokeWidth={1.5}
                            className="prescription-select-caret"
                          />
                        </div>
                      </div>

                      {/* Start & End Date Row */}
                      <div className="prescription-field-row prescription-field-row-2">
                        <div className="prescription-field">
                          <label className="prescription-label">Start Date</label>
                          <div className="prescription-date-input-wrapper">
                            <input
                              type="date"
                              className={`prescription-input ${
                                errors.startDate ? "prescription-input-error" : ""
                              }`}
                              value={form.startDate || ""}
                              onChange={(e) => {
                                setForm((prev) => ({
                                  ...prev,
                                  startDate: e.target.value,
                                }));
                                setErrors((prev) => ({ ...prev, startDate: "" }));
                              }}
                            />
                            <Calendar
                              size={16}
                              strokeWidth={1.5}
                              className="prescription-input-icon-right"
                            />
                          </div>
                          {errors.startDate && (
                            <div className="prescription-error-message">
                              <AlertCircle size={14} strokeWidth={1.5} />
                              {errors.startDate}
                            </div>
                          )}
                        </div>

                        <div className="prescription-field">
                          <label className="prescription-label">End Date (Optional)</label>
                          <div className="prescription-date-input-wrapper">
                            <input
                              type="date"
                              className={`prescription-input ${
                                errors.endDate ? "prescription-input-error" : ""
                              }`}
                              value={form.endDate || ""}
                              onChange={(e) => {
                                setForm((prev) => ({
                                  ...prev,
                                  endDate: e.target.value,
                                }));
                                setErrors((prev) => ({ ...prev, endDate: "" }));
                              }}
                            />
                            <Calendar
                              size={16}
                              strokeWidth={1.5}
                              className="prescription-input-icon-right"
                            />
                          </div>
                          {errors.endDate && (
                            <div className="prescription-error-message">
                              <AlertCircle size={14} strokeWidth={1.5} />
                              {errors.endDate}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Substitution Allowed Toggle */}
                      <div className="prescription-field">
                        <label className="prescription-label">Substitution Allowed</label>
                        <div className="prescription-toggle-wrapper">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                substitutionAllowed: !prev.substitutionAllowed,
                              }))
                            }
                            className={`prescription-toggle ${
                              form.substitutionAllowed ? "on" : "off"
                            }`}
                          >
                            <div className="prescription-toggle-knob" />
                          </button>
                          <span className="prescription-toggle-label">
                            {form.substitutionAllowed ? "Yes, generic substitution allowed" : "No, brand name only"}
                          </span>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div className="prescription-field">
                        <label className="prescription-label">
                          Additional Notes for Pharmacist
                        </label>
                        <textarea
                          className="prescription-textarea"
                          placeholder="e.g., Patient reports sensitivity to blue dye, avoid during meals..."
                          value={form.additionalNotes || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              additionalNotes: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
                {submitError ? (
                  <div className="prescription-error-message">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {submitError}
                  </div>
                ) : null}
              </form>

              {/* Footer */}
              <div className="prescription-footer">
                <div className="prescription-footer-buttons">
                  <button
                    type="button"
                    className="prescription-btn-cancel"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="prescription-btn-primary"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <div className="prescription-spinner" />
                        {mode === "create"
                          ? "Sending..."
                          : mode === "edit"
                            ? "Saving..."
                            : "Renewing..."}
                      </>
                    ) : mode === "create" ? (
                      "Send to Pharmacy"
                    ) : mode === "edit" ? (
                      "Save Changes"
                    ) : (
                      "Renew Prescription"
                    )}
                  </button>
                </div>
              </div>

              {/* Discard Confirmation Dialog */}
              {showDiscardConfirm && (
                <div className="prescription-confirm-backdrop">
                  <div className="prescription-confirm-dialog">
                    <h3 className="prescription-confirm-title">Discard Changes?</h3>
                    <p className="prescription-confirm-message">
                      You have unsaved changes. Are you sure you want to discard them?
                    </p>
                    <div className="prescription-confirm-buttons">
                      <button
                        type="button"
                        className="prescription-btn-confirm-keep"
                        onClick={() => setShowDiscardConfirm(false)}
                      >
                        Keep Editing
                      </button>
                      <button
                        type="button"
                        className="prescription-btn-confirm-discard"
                        onClick={handleDiscard}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
