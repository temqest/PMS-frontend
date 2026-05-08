"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Pill,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Search,
  Trash2,
} from "lucide-react";
import "./PrescriptionModal.css";
import { getPrescriptionMedicines, type PatientOption } from "../../../lib/api";
import SharedDatePicker from "../SharedDatePicker";

// =============================================================================
// TYPES
// =============================================================================

type Medicine = {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  price: number;
  expiry?: string;
  status: string;
};

type PrescriptionLineItem = {
  medicineId: string;
  medicineName: string;
  prescribedDosage: string;
  availableQuantity: number;
  prescribedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  expiry?: string;
  status: string;
};

type PrescriptionFormData = {
  patient?: { id: string; name: string } | null;
  directionsForUse: string;
  quantity: number;
  refills: number;
  additionalNotes: string;
  startDate: string;
  endDate: string;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const MEDICINE_CACHE_TTL = 60 * 1000;
let medicineCacheTimestamp = 0;
let medicineCacheData: Medicine[] = [];

const TODAY = new Date().toISOString().split("T")[0];
const isInStock = (status = "") => status.trim().toUpperCase() === "IN STOCK";

// =============================================================================
// COMPONENT
// =============================================================================

type PrescriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    patient?: { id: string; name: string } | null;
    medicines: PrescriptionLineItem[];
    directionsForUse: string;
    quantity: number;
    refills: number;
    additionalNotes: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  preselectedPatient?: { id: string; name: string };
  patientLocked?: boolean;
  patients?: PatientOption[];
};

export default function PrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  preselectedPatient,
  patientLocked = false,
  patients = [],
}: PrescriptionModalProps) {
  // Form State
  const [form, setForm] = useState<PrescriptionFormData>({
    patient: preselectedPatient || null,
    directionsForUse: "",
    quantity: 30,
    refills: 0,
    additionalNotes: "",
    startDate: TODAY,
    endDate: "",
  });

  // Medicine Search State
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [medicineLoadError, setMedicineLoadError] = useState("");
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Line Items State
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionLineItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedDosage, setSelectedDosage] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // UI State
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.name || "");

  // Dirty state tracking
  const isDirty = useMemo(
    () =>
      !!(
        form.patient ||
        form.directionsForUse ||
        form.startDate !== TODAY ||
        form.endDate ||
        prescriptionItems.length > 0 ||
        medicineSearch ||
        selectedMedicine
      ),
    [form, prescriptionItems.length, medicineSearch, selectedMedicine]
  );

  // =============================================================================
  // FORM RESET
  // =============================================================================

  const resetForm = useCallback(() => {
    setForm({
      patient: preselectedPatient || null,
      directionsForUse: "",
      quantity: 30,
      refills: 0,
      additionalNotes: "",
      startDate: TODAY,
      endDate: "",
    });
    setSelectedMedicine(null);
    setSelectedDosage("");
    setSelectedQuantity(1);
    setPrescriptionItems([]);
    setMedicineSearch("");
    setShowInventoryModal(false);
    setErrors({});
  }, [preselectedPatient]);

  // =============================================================================
  // EFFECTS - Load medicines when modal opens
  // =============================================================================

  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;
    const controller = new AbortController();

    const loadMedicines = async () => {
      setMedicineLoadError("");

      // Check cache first
      if (
        Date.now() - medicineCacheTimestamp < MEDICINE_CACHE_TTL &&
        medicineCacheData.length > 0
      ) {
        setMedicines(medicineCacheData);
        return;
      }

      setLoadingMedicines(true);
      try {
        const data = await getPrescriptionMedicines();

        // Validate and normalize medicines
        const normalized = data.filter(
          (item): item is Medicine =>
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.dosage === "string" &&
            typeof item.quantity === "number" &&
            typeof item.price === "number" &&
            typeof item.status === "string"
        );

        if (isActive) {
          setMedicines(normalized);
          medicineCacheTimestamp = Date.now();
          medicineCacheData = normalized;
        }
      } catch (err: unknown) {
        if (isActive) {
          const error = err as { message?: string };
          setMedicineLoadError(
            error?.message || "Failed to retrieve medicine inventory."
          );
          setMedicines([]);
        }
      } finally {
        if (isActive) setLoadingMedicines(false);
      }
    };

    loadMedicines();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isOpen]);

  // =============================================================================
  // EFFECTS - Handle Escape key and success state
  // =============================================================================

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

  // =============================================================================
  // MEDICINE SEARCH & SELECTION
  // =============================================================================

  const availableMedicines = useMemo(
    () => medicines.filter((item) => isInStock(item.status) && item.quantity > 0),
    [medicines]
  );

  const medicineSuggestions = useMemo(() => {
    const query = medicineSearch.trim().toLowerCase();
    if (!query) return availableMedicines.slice(0, 10);

    return availableMedicines
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.dosage.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [availableMedicines, medicineSearch]);

  const handleMedicationChange = (value: string) => {
    setMedicineSearch(value);
    setSelectedMedicine(null);
    setSelectedDosage("");
    setSelectedQuantity(1);
    setErrors((prev) => ({ ...prev, medicationName: "" }));
    setShowMedicineSuggestions(value.length > 0);
  };

  const selectMedication = (med: Medicine) => {
    setSelectedMedicine(med);
    setSelectedDosage(med.dosage);
    setSelectedQuantity(1);
    setMedicineSearch(`${med.name} (${med.dosage})`);
    setShowMedicineSuggestions(false);
    setErrors((prev) => ({ ...prev, medicationName: "" }));
  };

  // =============================================================================
  // LINE ITEM MANAGEMENT
  // =============================================================================

  const addLineItem = () => {
    if (!selectedMedicine) {
      setErrors((prev) => ({
        ...prev,
        medicationName: "Please select a medicine from inventory",
      }));
      return;
    }

    const quantity = Math.max(1, Math.min(selectedQuantity, selectedMedicine.quantity));

    const newItem: PrescriptionLineItem = {
      medicineId: selectedMedicine.id,
      medicineName: selectedMedicine.name,
      prescribedDosage: selectedDosage || selectedMedicine.dosage,
      availableQuantity: selectedMedicine.quantity,
      prescribedQuantity: quantity,
      unitPrice: selectedMedicine.price,
      totalPrice: Number((selectedMedicine.price * quantity).toFixed(2)),
      expiry: selectedMedicine.expiry,
      status: selectedMedicine.status,
    };

    // Check if medicine already exists and update or add
    setPrescriptionItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.medicineId === newItem.medicineId
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });

    // Reset selection
    setSelectedMedicine(null);
    setSelectedDosage("");
    setSelectedQuantity(1);
    setMedicineSearch("");
    setShowMedicineSuggestions(false);
    setErrors((prev) => ({ ...prev, medicationName: "" }));
  };

  const removeLineItem = (medicineId: string) => {
    setPrescriptionItems((prev) =>
      prev.filter((item) => item.medicineId !== medicineId)
    );
  };

  const editLineItem = (medicineId: string) => {
    const item = prescriptionItems.find((i) => i.medicineId === medicineId);
    if (item) {
      const medicine = medicines.find((m) => m.id === medicineId);
      if (medicine) {
        setSelectedMedicine(medicine);
        setSelectedDosage(item.prescribedDosage);
        setSelectedQuantity(item.prescribedQuantity);
        setMedicineSearch(`${medicine.name} (${medicine.dosage})`);
        removeLineItem(medicineId);
      }
    }
  };

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.patient) newErrors.patient = "Patient is required";
    if (prescriptionItems.length === 0)
      newErrors.medicines = "Add at least one medicine to the prescription";
    if (!form.directionsForUse?.trim())
      newErrors.directionsForUse = "Directions for use are required";
    if (!form.startDate) newErrors.startDate = "Start date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      newErrors.endDate = "End date must be after start date";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // FORM SUBMISSION
  // =============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitError("");
    setSubmitting(true);

    try {
      await onSubmit({
        patient: form.patient,
        medicines: prescriptionItems,
        directionsForUse: form.directionsForUse,
        quantity: prescriptionItems.reduce(
          (total, item) => total + item.prescribedQuantity,
          0
        ),
        refills: 0,
        additionalNotes: "",
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        error?: string;
        detail?: string;
      };
      setSubmitError(
        e?.message || e?.error || e?.detail || "Unable to save prescription."
      );
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

  // =============================================================================
  // PATIENT SELECTION
  // =============================================================================

  const filteredPatients = patientQuery.trim()
    ? patients
        .filter(
          (item) =>
            item.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(patientQuery.toLowerCase())
        )
        .slice(0, 8)
    : patients.slice(0, 8);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // =============================================================================
  // RENDER
  // =============================================================================

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="prescription-modal-backdrop"
        onClick={handleBackdropClick}
      />

      {/* Modal Card */}
      <div className="prescription-modal-container">
        <div className="prescription-modal-card">
          {/* Success State */}
          {success && (
            <div className="prescription-success-state">
              <div className="prescription-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="prescription-success-title">Prescription Sent</h2>
              <p className="prescription-success-summary">
                Prescription for {form.patient?.name}
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
                      New Prescription
                    </h1>
                    <p className="prescription-header-subtitle">
                      Create a prescription with multiple medicines
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

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="prescription-form">
                {/* ================= PATIENT SECTION ================= */}

                <div className="prescription-field prescription-field-full">
                  <label className="prescription-label">Patient *</label>
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
                      {!patientLocked ? (
                        <button
                          type="button"
                          className="prescription-patient-change"
                          onClick={() => setPatientSearchOpen(true)}
                        >
                          Change
                        </button>
                      ) : null}
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
                        onBlur={() =>
                          setTimeout(() => setPatientSearchOpen(false), 100)
                        }
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
                              <span className="ml-2 text-xs text-slate-400">
                                {patient.id}
                              </span>
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

                {/* ================= MEDICINE SEARCH & SELECTION SECTION ================= */}

                {/* Medicine Search Input */}
                <div className="prescription-field prescription-field-full">
                  <div className="prescription-medicine-toolbar">
                    <label className="prescription-medicine-search-wrapper">
                      <span className="prescription-sr-only">Search Medicines</span>
                      <Search
                        size={18}
                        strokeWidth={1.8}
                        className="prescription-search-icon"
                      />
                      <input
                        type="text"
                        placeholder="Search by name, dosage, or ID..."
                        className={`prescription-input prescription-medicine-search-input ${
                          errors.medicationName
                            ? "prescription-input-error"
                            : ""
                        }`}
                        value={medicineSearch}
                        onChange={(e) =>
                          handleMedicationChange(e.target.value)
                        }
                        onFocus={() =>
                          medicineSearch && setShowMedicineSuggestions(true)
                        }
                        onBlur={() =>
                          setTimeout(() => setShowMedicineSuggestions(false), 200)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="prescription-btn-secondary prescription-inventory-open-btn"
                      onClick={() => setShowInventoryModal(true)}
                      disabled={loadingMedicines}
                    >
                      <Pill size={15} strokeWidth={1.5} />
                      View Inventory
                    </button>
                  </div>

                  {/* Loading State */}
                  {loadingMedicines && (
                    <div className="prescription-medicine-suggestions">
                      <div className="prescription-suggestion-item">
                        <div className="prescription-spinner mr-2" />
                        Loading medicines...
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {!loadingMedicines && medicineLoadError && (
                    <div className="prescription-medicine-suggestions">
                      <div className="prescription-suggestion-item">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {medicineLoadError}
                      </div>
                    </div>
                  )}

                  {/* Suggestions Dropdown */}
                  {showMedicineSuggestions &&
                    !loadingMedicines &&
                    medicineSuggestions.length > 0 && (
                      <div className="prescription-medicine-suggestions">
                        {medicineSuggestions.map((med) => (
                          <button
                            key={med.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectMedication(med)}
                            className="prescription-suggestion-item"
                          >
                            <div className="w-full">
                              <div className="font-medium text-slate-900">
                                {med.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                <span className="inline-block mr-3">
                                  Dosage: {med.dosage}
                                </span>
                                <span className="inline-block mr-3">
                                  Stock: {med.quantity}
                                </span>
                                <span className="inline-block">
                                  ${med.price.toFixed(2)}
                                </span>
                              </div>
                              {med.expiry && (
                                <div className="text-xs text-slate-400 mt-1">
                                  Expires: {med.expiry}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                  {/* No suggestions */}
                  {showMedicineSuggestions &&
                    !loadingMedicines &&
                    medicineSuggestions.length === 0 &&
                    medicineSearch.trim() && (
                      <div className="prescription-medicine-suggestions">
                        <div className="prescription-suggestion-item text-slate-500">
                          No medicines found matching &quot;{medicineSearch}&quot;
                        </div>
                      </div>
                    )}

                  {errors.medicationName && (
                    <div className="prescription-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.medicationName}
                    </div>
                  )}
                </div>

                {/* Selected Medicine Display */}
                {selectedMedicine && (
                  <div className="prescription-selected-medicine">
                    <div className="prescription-selected-medicine-info">
                      <div className="prescription-selected-medicine-icon">
                        <Pill size={18} strokeWidth={1.6} />
                      </div>
                      <div>
                        <div className="prescription-selected-medicine-name">
                          {selectedMedicine.name}
                        </div>
                        <div className="prescription-selected-medicine-meta">
                          <span>Default dosage: {selectedMedicine.dosage}</span>
                          <span>Stock: {selectedMedicine.quantity}</span>
                          <span>${selectedMedicine.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="prescription-selected-medicine-clear"
                      onClick={() => {
                        setSelectedMedicine(null);
                        setSelectedDosage("");
                        setSelectedQuantity(1);
                        setMedicineSearch("");
                      }}
                      aria-label={`Clear ${selectedMedicine.name}`}
                    >
                      <X size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                )}

                {/* Dosage & Quantity Input Row */}
                {selectedMedicine && (
                  <div className="prescription-field-row prescription-field-row-2">
                    <div className="prescription-field">
                      <label className="prescription-label">
                        Prescribed Dosage
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 250mg"
                        className="prescription-input"
                        value={selectedDosage}
                        onChange={(e) => setSelectedDosage(e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Default: {selectedMedicine.dosage}
                      </p>
                    </div>

                    <div className="prescription-field">
                      <label className="prescription-label">
                        Quantity to Prescribe
                      </label>
                      <input
                        type="number"
                        placeholder="1"
                        className="prescription-input"
                        value={selectedQuantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 1;
                          setSelectedQuantity(
                            Math.min(value, selectedMedicine.quantity)
                          );
                        }}
                        min="1"
                        max={selectedMedicine.quantity}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Max: {selectedMedicine.quantity}
                      </p>
                    </div>
                  </div>
                )}

                {/* Add Medicine Button */}
                {selectedMedicine && (
                  <button
                    type="button"
                    className="prescription-btn-secondary w-full"
                    onClick={addLineItem}
                  >
                    Add to Prescription
                  </button>
                )}

                {/* ================= SELECTED MEDICINES TABLE ================= */}

                {prescriptionItems.length > 0 && (
                  <div className="prescription-items-section">
                    <h3 className="prescription-section-title">
                      Selected Medicines ({prescriptionItems.length})
                    </h3>

                    <div className="prescription-items-table-wrapper">
                      <div className="prescription-items-table-header">
                        <span className="col-name">Medicine</span>
                        <span className="col-dosage">Dosage</span>
                        <span className="col-qty">Qty</span>
                        <span className="col-price">Total Price</span>
                        <span className="col-actions" />
                      </div>

                      {prescriptionItems.map((item) => (
                        <div
                          key={item.medicineId}
                          className="prescription-items-table-row"
                        >
                          <span className="col-name">
                            <div className="font-medium text-slate-900">
                              {item.medicineName}
                            </div>
                            <div className="text-xs text-slate-500">
                              Stock: {item.availableQuantity}
                            </div>
                          </span>
                          <span className="col-dosage">
                            {item.prescribedDosage}
                          </span>
                          <span className="col-qty">
                            {item.prescribedQuantity}
                          </span>
                          <span className="col-price">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                          <span className="col-actions">
                            <button
                              type="button"
                              className="prescription-items-edit"
                              onClick={() => editLineItem(item.medicineId)}
                              title="Edit"
                            >
                              <ChevronDown size={14} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              className="prescription-items-remove"
                              onClick={() =>
                                removeLineItem(item.medicineId)
                              }
                              aria-label={`Remove ${item.medicineName}`}
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.medicines && (
                  <div className="prescription-error-message">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {errors.medicines}
                  </div>
                )}

                {/* ================= PRESCRIPTION DETAILS SECTION ================= */}

                <div className="prescription-section-header">
                  <h2 className="prescription-section-title">
                    Prescription Details
                  </h2>
                </div>

                {/* Directions for Use */}
                <div className="prescription-field prescription-field-full">
                  <label className="prescription-label">
                    Directions for Use *
                  </label>
                  <textarea
                    className={`prescription-textarea ${
                      errors.directionsForUse
                        ? "prescription-input-error"
                        : ""
                    }`}
                    placeholder="e.g., Take 1 tablet by mouth twice daily with food"
                    value={form.directionsForUse || ""}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        directionsForUse: e.target.value,
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        directionsForUse: "",
                      }));
                    }}
                    rows={3}
                  />
                  {errors.directionsForUse && (
                    <div className="prescription-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.directionsForUse}
                    </div>
                  )}
                </div>

                {/* Start & End Dates Row */}
                <div className="prescription-field-row prescription-field-row-2">
                  <div className="prescription-field">
                    <label className="prescription-label">Start Date *</label>
                    <SharedDatePicker
                      ariaLabel="Prescription start date"
                      value={form.startDate || ""}
                      onChange={(startDate) => {
                        setForm((prev) => ({
                          ...prev,
                          startDate,
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          startDate: "",
                        }));
                      }}
                      error={Boolean(errors.startDate)}
                    />
                    {errors.startDate && (
                      <div className="prescription-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.startDate}
                      </div>
                    )}
                  </div>

                  <div className="prescription-field">
                    <label className="prescription-label">
                      End Date (Optional)
                    </label>
                    <SharedDatePicker
                      ariaLabel="Prescription end date"
                      value={form.endDate || ""}
                      onChange={(endDate) => {
                        setForm((prev) => ({
                          ...prev,
                          endDate,
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          endDate: "",
                        }));
                      }}
                      error={Boolean(errors.endDate)}
                    />
                    {errors.endDate && (
                      <div className="prescription-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.endDate}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="prescription-error-message">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {submitError}
                  </div>
                )}
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
                        Sending...
                      </>
                    ) : (
                      "Send Prescription"
                    )}
                  </button>
                </div>
              </div>

              {/* Discard Confirmation Dialog */}
              {showDiscardConfirm && (
                <div className="prescription-confirm-backdrop">
                  <div className="prescription-confirm-dialog">
                    <h3 className="prescription-confirm-title">
                      Discard Changes?
                    </h3>
                    <p className="prescription-confirm-message">
                      You have unsaved changes. Are you sure you want to
                      discard them?
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

              {/* Inventory Modal */}
              {showInventoryModal && (
                <div className="prescription-inventory-backdrop">
                  <div className="prescription-inventory-dialog">
                    <div className="prescription-inventory-header">
                      <div>
                        <h3 className="prescription-inventory-title">
                          Medicine Inventory
                        </h3>
                        <p className="prescription-inventory-summary">
                          {medicines.length} items loaded
                        </p>
                      </div>
                      <button
                        type="button"
                        className="prescription-close-btn"
                        onClick={() => setShowInventoryModal(false)}
                        aria-label="Close inventory"
                      >
                        <X size={18} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="prescription-inventory-body">
                      {loadingMedicines ? (
                        <div className="prescription-inventory-empty">
                          <div className="prescription-spinner" />
                          Loading medicines...
                        </div>
                      ) : medicineLoadError ? (
                        <div className="prescription-inventory-empty prescription-inventory-error">
                          <AlertCircle size={16} strokeWidth={1.5} />
                          {medicineLoadError}
                        </div>
                      ) : medicines.length === 0 ? (
                        <div className="prescription-inventory-empty">
                          No medicines found.
                        </div>
                      ) : (
                        <div className="prescription-inventory-table">
                          <div className="prescription-inventory-row prescription-inventory-row-head">
                            <span>Medicine</span>
                            <span>Dosage</span>
                            <span>Stock</span>
                            <span>Price</span>
                            <span>Status</span>
                            <span />
                          </div>

                          {medicines.map((med) => {
                            const isSelectable =
                              isInStock(med.status) && med.quantity > 0;

                            return (
                              <button
                                type="button"
                                key={med.id}
                                className={`prescription-inventory-row prescription-inventory-row-action ${
                                  !isSelectable
                                    ? "prescription-inventory-row-disabled"
                                    : ""
                                }`}
                                onClick={() => {
                                  if (!isSelectable) return;
                                  selectMedication(med);
                                  setShowInventoryModal(false);
                                }}
                                disabled={!isSelectable}
                                aria-label={
                                  isSelectable
                                    ? `Select ${med.name}`
                                    : `${med.name} is not available`
                                }
                              >
                                <span>
                                  <strong>{med.name}</strong>
                                  <small>{med.id}</small>
                                </span>
                                <span>{med.dosage}</span>
                                <span>{med.quantity}</span>
                                <span>${med.price.toFixed(2)}</span>
                                <span>
                                  <span
                                    className={`prescription-inventory-status ${
                                      isSelectable
                                        ? "prescription-inventory-status-in"
                                        : "prescription-inventory-status-out"
                                    }`}
                                  >
                                    {med.status || "Unknown"}
                                  </span>
                                </span>
                                <span>
                                  <span className="prescription-inventory-select">
                                    Select
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </>,
    document.body
  );
}
