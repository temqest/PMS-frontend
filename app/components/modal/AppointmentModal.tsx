"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, parse } from "date-fns";
import {
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "./AppointmentModal.css";
import type { PatientOption } from "../../../lib/api";

export type AppointmentData = {
  patient?: { id: string; name: string } | null;
  appointmentType?: "In-Person" | "Telehealth";
  date?: string;
  time?: string;
  duration?: number;
  reason?: string;
  priority?: "Routine" | "Urgent" | "Follow-up";
  sendEmailReminder?: boolean;
  sendSmsReminder?: boolean;
  internalNotes?: string;
  sendConfirmation?: boolean;
  status?: "Pending" | "Confirmed" | "Cancelled" | "Completed";
};

const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return formatted;
});

export default function AppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  preselectedPatient,
  initialData,
  patients = [],
  mode = "create",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentData) => Promise<void> | void;
  preselectedPatient?: { id: string; name: string };
  initialData?: AppointmentData | null;
  patients?: PatientOption[];
  mode?: "create" | "edit";
}) {
  const getDefaultForm = (): AppointmentData => ({
    patient: preselectedPatient || null,
    appointmentType: "In-Person",
    date: "",
    time: "09:00",
    duration: 30,
    reason: "",
    priority: "Routine",
    sendEmailReminder: false,
    sendSmsReminder: false,
    internalNotes: "",
    sendConfirmation: true,
    status: "Pending",
  });

  const [form, setForm] = useState<AppointmentData>({
    ...getDefaultForm(),
    ...(initialData || {}),
    patient: initialData?.patient || preselectedPatient || null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [patientQuery, setPatientQuery] = useState(initialData?.patient?.name || preselectedPatient?.name || "");
  const [patientOpen, setPatientOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const isDirty = useMemo(
    () =>
      !!(
        form.patient ||
        form.appointmentType !== "In-Person" ||
        form.date ||
        form.time !== "09:00" ||
        form.duration !== 30 ||
        form.reason ||
        form.priority !== "Routine" ||
        form.sendEmailReminder ||
        form.sendSmsReminder ||
        form.internalNotes ||
        !form.sendConfirmation
      ),
    [form]
  );
  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 8);
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isDirty, success, onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.patient) newErrors.patient = "Patient is required";
    if (!form.date) newErrors.date = "Date is required";
    if (!form.time) newErrors.time = "Time is required";
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
      const message = e?.message || e?.error || e?.detail || "Unable to save appointment.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    if (!success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="appointment-modal-backdrop"
        onClick={handleBackdropClick}
      />

      {/* Modal Card */}
      <div className="appointment-modal-container">
        <div className="appointment-modal-card">
          {/* Success State */}
          {success && (
            <div className="appointment-success-state">
              <div className="appointment-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="appointment-success-title">Appointment Confirmed</h2>
              <p className="appointment-success-summary">
                {form.patient?.name} • {form.date} at {form.time}
              </p>
              <button
                type="button"
                className="appointment-btn-done"
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
              <div className="appointment-header">
                <div className="appointment-header-left">
                  <div className="appointment-icon-circle">
                    <CalendarIcon size={20} strokeWidth={1.5} />
                  </div>
                  <div className="appointment-header-text">
                    <h1 className="appointment-header-title">{mode === "edit" ? "Reschedule Appointment" : "New Appointment"}</h1>
                    <p className="appointment-header-subtitle">
                      {mode === "edit" ? "Update schedule details" : "Schedule a patient visit"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="appointment-close-btn"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="appointment-form">
                {/* Patient Field */}
                <div className="appointment-field appointment-field-full">
                  <label className="appointment-label">Patient</label>
                  <div className="appointment-patient-input-wrapper">
                    <Search
                      size={18}
                      strokeWidth={1.5}
                      className="appointment-input-icon-left"
                    />
                    <input
                      type="text"
                      placeholder="Search by name or patient ID..."
                      className={`appointment-input appointment-patient-input ${
                        errors.patient ? "appointment-input-error" : ""
                      }`}
                      value={patientQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPatientQuery(value);
                        if (!value) {
                          setForm((prev) => ({ ...prev, patient: null }));
                        }
                        setErrors((prev) => ({ ...prev, patient: "" }));
                      }}
                      onFocus={() => setPatientOpen(true)}
                      onBlur={() => setTimeout(() => setPatientOpen(false), 100)}
                    />
                    {form.patient && (
                      <button
                        type="button"
                        className="appointment-patient-chip"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, patient: null }));
                        }}
                      >
                        <div className="appointment-patient-avatar">
                          {form.patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span>{form.patient.name}</span>
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                  {patientOpen && filteredPatients.length > 0 ? (
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
                            setPatientOpen(false);
                            setErrors((prev) => ({ ...prev, patient: "" }));
                          }}
                        >
                          <span className="font-medium">{patient.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{patient.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {errors.patient && (
                    <div className="appointment-error-message">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      {errors.patient}
                    </div>
                  )}
                </div>

                {/* Date, Time, Duration */}
                <div className="appointment-field-row appointment-field-row-3">
                  <div className="appointment-field">
                    <label className="appointment-label">Date</label>
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full appointment-input cursor-pointer flex items-center justify-between pr-4 ${
                          errors.date ? "appointment-input-error" : ""
                        }`}
                      >
                        <span className="flex-1 text-left">
                          {form.date ? format(parse(form.date, "yyyy-MM-dd", new Date()), "MMM d, yyyy") : "Select date"}
                        </span>
                        <CalendarIcon size={18} strokeWidth={1.5} className="text-[#D1D5DB] flex-shrink-0 ml-2" />
                      </button>
                      {showCalendar && (
                        <div className="absolute top-full left-0 z-50 mt-2 rounded-lg border border-[#E5E7EB] bg-white shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            selected={form.date ? parse(form.date, "yyyy-MM-dd", new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const isoDate = format(date, "yyyy-MM-dd");
                                setForm((prev) => ({ ...prev, date: isoDate }));
                                setErrors((prev) => ({ ...prev, date: "" }));
                              }
                              setShowCalendar(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {errors.date && (
                      <div className="appointment-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.date}
                      </div>
                    )}
                  </div>

                  <div className="appointment-field">
                    <label className="appointment-label">Time</label>
                    <div className="appointment-select-wrapper">
                      <select
                        className={`appointment-select ${
                          errors.time ? "appointment-input-error" : ""
                        }`}
                        value={form.time}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            time: e.target.value,
                          }));
                          setErrors((prev) => ({ ...prev, time: "" }));
                        }}
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        strokeWidth={1.5}
                        className="appointment-select-caret"
                      />
                    </div>
                    {errors.time && (
                      <div className="appointment-error-message">
                        <AlertCircle size={14} strokeWidth={1.5} />
                        {errors.time}
                      </div>
                    )}
                  </div>

                  <div className="appointment-field">
                    <label className="appointment-label">Duration</label>
                    <div className="appointment-select-wrapper">
                      <select
                        className="appointment-select"
                        value={form.duration}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            duration: parseInt(e.target.value),
                          }))
                        }
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                      <ChevronDown
                        size={12}
                        strokeWidth={1.5}
                        className="appointment-select-caret"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="appointment-field-row appointment-field-row-2">
                  <div className="appointment-field">
                    <label className="appointment-label">Priority</label>
                    <div className="appointment-priority-chips">
                      {(["Routine", "Urgent", "Follow-up"] as const).map(
                        (p) => (
                          <button
                            key={p}
                            type="button"
                            className={`appointment-chip ${
                              form.priority === p ? "active" : ""
                            }`}
                            onClick={() =>
                              setForm((prev) => ({ ...prev, priority: p }))
                            }
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason for Visit */}
                <div className="appointment-field appointment-field-full">
                  <label className="appointment-label">Reason for Visit</label>
                  <textarea
                    className="appointment-textarea"
                    placeholder="Briefly describe symptoms or purpose."
                    value={form.reason}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                  />
                </div>

                {submitError ? (
                  <div className="appointment-error-message">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {submitError}
                  </div>
                ) : null}
              </form>

              {/* Footer */}
              <div className="appointment-footer-buttons-full">
                <button
                  type="button"
                  className="appointment-btn-cancel-full"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="appointment-btn-primary-full"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <div className="appointment-spinner" />
                      {mode === "edit" ? "Saving..." : "Booking..."}
                    </>
                  ) : (
                    mode === "edit" ? "Save Changes" : "Book Appointment"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
