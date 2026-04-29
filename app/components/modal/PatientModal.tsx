"use client";

import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, parse } from "date-fns";
import {
  User,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "./PatientModal.css";

type PatientData = {
  id?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: "Male" | "Female" | "Non-binary" | "Prefer not to say";
  phone?: string;
  email?: string;
  // Secondary info
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  bloodType?: "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "Unknown";
  allergies?: string[];
  medications?: string[];
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  notes?: string;
  isActive?: boolean;
};

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "Unknown"];

export default function PatientModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientData) => Promise<any> | void;
  initialData?: PatientData;
  mode?: "create" | "edit";
}) {
  const [form, setForm] = useState<PatientData>({
    id: initialData?.id || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    sex: initialData?.sex || undefined,
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    street: initialData?.street || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zip: initialData?.zip || "",
    emergencyContactName: initialData?.emergencyContactName || "",
    emergencyContactRelationship: initialData?.emergencyContactRelationship || "",
    emergencyContactPhone: initialData?.emergencyContactPhone || "",
    bloodType: initialData?.bloodType || undefined,
    allergies: initialData?.allergies || [],
    medications: initialData?.medications || [],
    insuranceProvider: initialData?.insuranceProvider || "",
    policyNumber: initialData?.policyNumber || "",
    groupNumber: initialData?.groupNumber || "",
    notes: initialData?.notes || "",
    isActive: initialData?.isActive !== false,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [allergyInput, setAllergyInput] = useState("");
  const [medicationInput, setMedicationInput] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Track dirty state
  useEffect(() => {
    const hasChanges =
      form.firstName !== (initialData?.firstName || "") ||
      form.lastName !== (initialData?.lastName || "") ||
      form.dateOfBirth !== (initialData?.dateOfBirth || "") ||
      form.sex !== initialData?.sex ||
      form.phone !== (initialData?.phone || "") ||
      form.email !== (initialData?.email || "") ||
      form.street !== (initialData?.street || "") ||
      form.city !== (initialData?.city || "") ||
      form.state !== (initialData?.state || "") ||
      form.zip !== (initialData?.zip || "") ||
      form.emergencyContactName !== (initialData?.emergencyContactName || "") ||
      form.emergencyContactRelationship !== (initialData?.emergencyContactRelationship || "") ||
      form.emergencyContactPhone !== (initialData?.emergencyContactPhone || "") ||
      form.bloodType !== initialData?.bloodType ||
      JSON.stringify(form.allergies) !== JSON.stringify(initialData?.allergies || []) ||
      JSON.stringify(form.medications) !== JSON.stringify(initialData?.medications || []) ||
      form.insuranceProvider !== (initialData?.insuranceProvider || "") ||
      form.policyNumber !== (initialData?.policyNumber || "") ||
      form.groupNumber !== (initialData?.groupNumber || "") ||
      form.notes !== (initialData?.notes || "") ||
      (mode === "edit" && form.isActive !== (initialData?.isActive !== false));
    setIsDirty(hasChanges);
  }, [form, initialData, mode]);

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
        setIsDirty(false);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [success, onClose]);

  const resetForm = () => {
    setForm({
      id: initialData?.id || "",
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      dateOfBirth: initialData?.dateOfBirth || "",
      sex: initialData?.sex || undefined,
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      street: initialData?.street || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zip: initialData?.zip || "",
      emergencyContactName: initialData?.emergencyContactName || "",
      emergencyContactRelationship: initialData?.emergencyContactRelationship || "",
      emergencyContactPhone: initialData?.emergencyContactPhone || "",
      bloodType: initialData?.bloodType || undefined,
      allergies: initialData?.allergies || [],
      medications: initialData?.medications || [],
      insuranceProvider: initialData?.insuranceProvider || "",
      policyNumber: initialData?.policyNumber || "",
      groupNumber: initialData?.groupNumber || "",
      notes: initialData?.notes || "",
      isActive: initialData?.isActive !== false,
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.firstName?.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName?.trim()) newErrors.lastName = "Last name is required";
    if (!form.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!form.sex) newErrors.sex = "Sex is required";
    if (!form.phone?.trim()) newErrors.phone = "Phone number is required";
    if (!form.email?.trim()) newErrors.email = "Email is required";
    else if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Invalid email address";
    if (!form.street?.trim()) newErrors.address = "Address is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(form as PatientData);
      setSuccess(true);
    } catch (err: any) {
      if (err && err.errors) {
        setErrors(err.errors);
      }
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
    setIsDirty(false);
    onClose();
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !form.allergies?.includes(allergyInput.trim())) {
      setForm((prev) => ({
        ...prev,
        allergies: [...(prev.allergies || []), allergyInput.trim()],
      }));
      setAllergyInput("");
    }
  };

  const removeAllergy = (index: number) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies?.filter((_, i) => i !== index) || [],
    }));
  };

  const addMedication = () => {
    if (medicationInput.trim() && !form.medications?.includes(medicationInput.trim())) {
      setForm((prev) => ({
        ...prev,
        medications: [...(prev.medications || []), medicationInput.trim()],
      }));
      setMedicationInput("");
    }
  };

  const removeMedication = (index: number) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications?.filter((_, i) => i !== index) || [],
    }));
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  if (!isOpen) return null;

  const fullName = form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : "New Patient";

  return (
    <>
      {/* Backdrop */}
      <div
        className="patient-modal-backdrop"
        onClick={handleBackdropClick}
      />

      {/* Modal Card */}
      <div className="patient-modal-container">
        <div className="patient-modal-card">
          {/* Success State */}
          {success && (
            <div className="patient-success-state">
              <div className="patient-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="patient-success-title">
                {mode === "create" ? "Patient Added" : "Patient Updated"}
              </h2>
              <p className="patient-success-summary">{fullName}</p>
              <button
                type="button"
                className="patient-btn-done"
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
              <div className="patient-header">
                <div className="patient-header-left">
                  <div className="patient-icon-circle">
                    <User size={20} strokeWidth={1.5} />
                  </div>
                  <div className="patient-header-text">
                    <h1 className="patient-header-title">
                      {mode === "create" ? "Add Patient" : "Edit Patient"}
                    </h1>
                    <p className="patient-header-subtitle">
                      {mode === "create"
                        ? "Register a new patient"
                        : "Update patient information"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="patient-close-btn"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="patient-form">
                {/* Primary Section Header */}
                <div className="patient-section-header">
                  <h2 className="patient-section-title">Personal Information</h2>
                </div>

                {/* First Name & Last Name Row */}
                <div className="patient-field-row patient-field-row-2">
                  <div className="patient-field">
                    <label className="patient-label">First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      className={`patient-input ${
                        errors.firstName ? "patient-input-error" : ""
                      }`}
                      value={form.firstName || ""}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, firstName: "" }));
                      }}
                    />
                    {errors.firstName && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.firstName}
                      </div>
                    )}
                  </div>

                  <div className="patient-field">
                    <label className="patient-label">Last Name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      className={`patient-input ${
                        errors.lastName ? "patient-input-error" : ""
                      }`}
                      value={form.lastName || ""}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, lastName: "" }));
                      }}
                    />
                    {errors.lastName && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.lastName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date of Birth & Sex Row */}
                <div className="patient-field-row patient-field-row-2">
                  <div className="patient-field">
                    <label className="patient-label">Date of Birth</label>
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full patient-input cursor-pointer flex items-center justify-between pr-4 ${
                          errors.dateOfBirth ? "patient-input-error" : ""
                        }`}
                      >
                        <span className="flex-1 text-left">{form.dateOfBirth ? format(parse(form.dateOfBirth, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : "Select date"}</span>
                        <CalendarIcon size={18} strokeWidth={1.5} className="text-[#D1D5DB] flex-shrink-0 ml-2" />
                      </button>
                      {showCalendar && (
                        <div className="absolute top-full left-0 z-50 mt-2 rounded-lg border border-[#E5E7EB] bg-white shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            selected={form.dateOfBirth ? parse(form.dateOfBirth, 'yyyy-MM-dd', new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const isoDate = format(date, 'yyyy-MM-dd');
                                setForm((prev) => ({
                                  ...prev,
                                  dateOfBirth: isoDate,
                                }));
                                setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                              }
                              setShowCalendar(false);
                            }}
                            disabled={(date) => date > new Date()}
                          />
                        </div>
                      )}
                    </div>
                    {errors.dateOfBirth && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.dateOfBirth}
                      </div>
                    )}
                  </div>

                  <div className="patient-field">
                    <label className="patient-label">Sex</label>
                    <div className="patient-select-wrapper">
                      <select
                        className={`patient-select ${
                          errors.sex ? "patient-input-error" : ""
                        }`}
                        value={form.sex || ""}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            sex: e.target.value as any,
                          }));
                          setErrors((prev) => ({ ...prev, sex: "" }));
                        }}
                      >
                        <option value="">Select sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <ChevronDown
                        size={12}
                        strokeWidth={1.5}
                        className="patient-select-caret"
                      />
                    </div>
                    {errors.sex && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.sex}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information Section Header */}
                <div className="patient-section-header patient-section-header-secondary">
                  <h2 className="patient-section-title">Contact Information</h2>
                </div>

                {/* Phone & Email Row */}
                <div className="patient-field-row patient-field-row-2">
                  <div className="patient-field">
                    <label className="patient-label">Phone Number</label>
                    <div className="patient-phone-input-wrapper">
                      <Phone
                        size={16}
                        strokeWidth={1.5}
                        className="patient-input-icon-left"
                      />
                      <input
                        type="tel"
                        placeholder="(123) 456-7890"
                        className={`patient-input patient-phone-input ${
                          errors.phone ? "patient-input-error" : ""
                        }`}
                        value={formatPhone(form.phone || "")}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            phone: e.target.value.replace(/\D/g, ""),
                          }));
                          setErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                      />
                    </div>
                    {errors.phone && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.phone}
                      </div>
                    )}
                  </div>

                  <div className="patient-field">
                    <label className="patient-label">Email Address</label>
                    <div className="patient-email-input-wrapper">
                      <Mail
                        size={16}
                        strokeWidth={1.5}
                        className="patient-input-icon-left"
                      />
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className={`patient-input patient-email-input ${
                          errors.email ? "patient-input-error" : ""
                        }`}
                        value={form.email || ""}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                          setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                      />
                    </div>
                    {errors.email && (
                      <div className="patient-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Field */}
                <div className="patient-field">
                  <label className="patient-label">Address</label>
                  <input
                    type="text"
                    placeholder="123 Main Street, City, State ZIP"
                    className={`patient-input ${
                      errors.address ? "patient-input-error" : ""
                    }`}
                    value={form.street || ""}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }));
                      setErrors((prev) => ({ ...prev, address: "" }));
                    }}
                  />
                  {errors.address && (
                    <div className="patient-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.address}
                    </div>
                  )}
                </div>

                {/* Additional information section removed per request */}
              </form>

              {/* Footer */}
              <div className="patient-footer">
                {mode === "edit" && (
                  <button
                    type="button"
                    className="patient-footer-action"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: !prev.isActive,
                      }))
                    }
                  >
                    {form.isActive ? "Mark as Inactive" : "Mark as Active"}
                  </button>
                )}
                <div className="patient-footer-buttons">
                  <button
                    type="button"
                    className="patient-btn-cancel"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="patient-btn-primary"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <div className="patient-spinner" />
                        {mode === "create" ? "Adding..." : "Saving..."}
                      </>
                    ) : mode === "create" ? (
                      "Add Patient"
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>

              {/* Discard Confirmation Dialog */}
              {showDiscardConfirm && (
                <div className="patient-confirm-backdrop">
                  <div className="patient-confirm-dialog">
                    <h3 className="patient-confirm-title">Discard Changes?</h3>
                    <p className="patient-confirm-message">
                      You have unsaved changes. Are you sure you want to discard them?
                    </p>
                    <div className="patient-confirm-buttons">
                      <button
                        type="button"
                        className="patient-btn-confirm-keep"
                        onClick={() => setShowDiscardConfirm(false)}
                      >
                        Keep Editing
                      </button>
                      <button
                        type="button"
                        className="patient-btn-confirm-discard"
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
