"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Plus, CheckCircle } from "lucide-react";
import "./PrescriptionInvoiceModal.css";
import { type PatientOption, type PrescriptionInvoicePayload } from "../../../lib/api";

type InvoiceLine = {
  id: string;
  description: string;
  amount: number;
};

type PrescriptionInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: PrescriptionInvoicePayload) => Promise<void> | void;
  preselectedPatient?: PatientOption;
  patients?: PatientOption[];
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function PrescriptionInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  preselectedPatient,
  patients = [],
}: PrescriptionInvoiceModalProps) {
  const [patientId, setPatientId] = useState(preselectedPatient?.id || "");
  const [patientName, setPatientName] = useState(preselectedPatient?.name || "");
  const [invoiceDate, setInvoiceDate] = useState(TODAY);
  const [status, setStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');
  const [lineDescription, setLineDescription] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPatientId(preselectedPatient?.id || "");
    setPatientName(preselectedPatient?.name || "");
    setInvoiceDate(TODAY);
    setStatus('pending');
    setLineDescription("");
    setLineAmount("");
    setLineItems([]);
    setErrors({});
    setSubmitting(false);
    setSuccess(false);
  }, [isOpen, preselectedPatient]);

  const selectedPatient = useMemo(() => {
    if (preselectedPatient) return preselectedPatient;
    return patients.find((patient) => patient.id === patientId) || null;
  }, [patientId, patients, preselectedPatient]);

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.amount, 0),
    [lineItems]
  );

  const canSubmit = !!selectedPatient && lineItems.length > 0;

  const addLineItem = () => {
    const errors: Record<string, string> = {};
    if (!lineDescription.trim()) errors.description = "Enter a prescription item description.";
    const amount = Number(lineAmount);
    if (Number.isNaN(amount) || amount <= 0) errors.amount = "Enter a valid amount.";
    if (Object.keys(errors).length) {
      setErrors(errors);
      return;
    }

    setLineItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: lineDescription.trim(),
        amount,
      },
    ]);
    setLineDescription("");
    setLineAmount("");
    setErrors({});
  };

  const removeLineItem = (id: string) => {
    setLineItems((current) => current.filter((item) => item.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!selectedPatient) nextErrors.patient = "Select a patient.";
    if (lineItems.length === 0) nextErrors.items = "Add at least one invoice line item.";
    if (!invoiceDate) nextErrors.invoiceDate = "Invoice date is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    // Type guard: ensured by validation above, but TypeScript needs explicit check
    if (!selectedPatient) {
      setErrors({ patient: "Patient not found." });
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        items: lineItems.map((item) => ({
          medicineId: item.id,
          medicineName: item.description,
          prescribedDosage: '',
          prescribedQuantity: 1,
          unitPrice: item.amount,
          totalPrice: item.amount,
        })),
        total_amount: totalAmount,
        invoice_date: invoiceDate,
        status,
      });
      setSuccess(true);
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Unable to save invoice.';
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="invoice-modal-backdrop" onClick={handleClose} />
      <div className="invoice-modal-container">
        <div className="invoice-modal-card">
          {success ? (
            <div className="invoice-success-state">
              <div className="invoice-success-icon">
                <CheckCircle size={48} />
              </div>
              <h2 className="invoice-success-title">Invoice Created</h2>
              <p className="invoice-success-text">The patient billing invoice has been generated successfully.</p>
              <button type="button" className="invoice-btn-primary" onClick={handleClose}>
                Close
              </button>
            </div>
          ) : (
            <form className="invoice-modal-form" onSubmit={handleSubmit}>
              <div className="invoice-modal-header">
                <div>
                  <p className="invoice-modal-eyebrow">New Prescription Invoice</p>
                  <h1 className="invoice-modal-title">Create billing details for this prescription</h1>
                </div>
                <button type="button" className="invoice-close-btn" onClick={handleClose}>
                  <X size={18} />
                </button>
              </div>

              <div className="invoice-section">
                <label className="invoice-label">Patient</label>
                {preselectedPatient ? (
                  <div className="invoice-readonly-box">{preselectedPatient.name}</div>
                ) : (
                  <select
                    className="invoice-input"
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                  >
                    <option value="">Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.patient ? <p className="invoice-field-error">{errors.patient}</p> : null}
              </div>

              <div className="invoice-grid">
                <div className="invoice-section">
                  <label className="invoice-label" htmlFor="invoiceDate">
                    Invoice Date
                  </label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="invoice-input"
                  />
                  {errors.invoiceDate ? <p className="invoice-field-error">{errors.invoiceDate}</p> : null}
                </div>
                <div className="invoice-section">
                  <label className="invoice-label" htmlFor="invoiceStatus">
                    Status
                  </label>
                  <select
                    id="invoiceStatus"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'pending' | 'paid' | 'cancelled')}
                    className="invoice-input"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="invoice-section">
                <div className="invoice-section-header">
                  <div>
                    <label className="invoice-label">Prescription line items</label>
                    <p className="invoice-help-text">Enter each billed prescription item and its amount.</p>
                  </div>
                </div>
                <div className="invoice-line-editor">
                  <input
                    type="text"
                    placeholder="Medicine name or description"
                    value={lineDescription}
                    onChange={(event) => setLineDescription(event.target.value)}
                    className="invoice-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={lineAmount}
                    onChange={(event) => setLineAmount(event.target.value)}
                    className="invoice-input"
                    min="0"
                    step="0.01"
                  />
                  <button type="button" className="invoice-btn-secondary" onClick={addLineItem}>
                    <Plus size={16} /> Add item
                  </button>
                </div>
                {errors.description || errors.amount ? (
                  <p className="invoice-field-error">{errors.description || errors.amount}</p>
                ) : null}
                {errors.items ? <p className="invoice-field-error">{errors.items}</p> : null}
              </div>

              <div className="invoice-lines">
                {lineItems.map((item) => (
                  <div key={item.id} className="invoice-line-row">
                    <div>
                      <p className="invoice-line-label">{item.description}</p>
                      <p className="invoice-line-meta">{item.amount.toFixed(2)}</p>
                    </div>
                    <button type="button" className="invoice-remove-btn" onClick={() => removeLineItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="invoice-summary">
                <span>Total</span>
                <strong>${totalAmount.toFixed(2)}</strong>
              </div>

              {errors.submit ? <p className="invoice-field-error">{errors.submit}</p> : null}

              <div className="invoice-actions">
                <button type="button" className="invoice-btn-outline" onClick={handleClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="invoice-btn-primary" disabled={submitting || !canSubmit}>
                  {submitting ? 'Saving...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
