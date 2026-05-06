const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DEBUG_API_ERRORS = process.env.NEXT_PUBLIC_DEBUG_API === "true";

function authHeader() {
  try {
    if (typeof window === 'undefined') {
      return {};
    }
    const token = localStorage.getItem('pms_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  } catch (e) {
    console.error('Error retrieving auth token:', e);
    return {};
  }
}

async function readResponseBody(res: Response): Promise<unknown> {
  // 204/205 must not have a body; also treat empty body as "no payload"
  if (res.status === 204 || res.status === 205) return null;

  const contentType = res.headers.get("content-type") || "";

  // Prefer reading text once, then parsing if applicable.
  const text = await res.text().catch(() => "");
  if (!text) return null;

  if (contentType.includes("application/json") || contentType.includes("+json")) {
    try {
      return JSON.parse(text);
    } catch {
      // Fall through to return raw text (useful for debugging bad JSON)
    }
  }

  return text;
}

async function request(path: string, opts: RequestInit = {}) {
  const hasBody = typeof opts.body !== "undefined" && opts.body !== null;
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const baseHeaders: Record<string, string> = { Accept: "application/json" };
  if (hasBody && !isFormData) {
    baseHeaders["Content-Type"] = "application/json";
  }
  const headers = Object.assign(baseHeaders, authHeader(), opts.headers || {});

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const body = await readResponseBody(res);
  if (!res.ok) {
    const messageFromJson =
      body && typeof body === "object" && "message" in (body as Record<string, unknown>)
        ? (body as { message?: unknown }).message
        : undefined;
    const message =
      typeof messageFromJson === "string" && messageFromJson.trim()
        ? messageFromJson
        : typeof body === "string" && body.trim()
          ? body
          : `Request failed (${res.status})`;

    // Avoid noisy console errors for handled failures.
    // Enable with NEXT_PUBLIC_DEBUG_API=true when you actually want to see them.
    if (DEBUG_API_ERRORS) {
      console.error("API Error Response:", { status: res.status, path, body });
    }

    const error = new Error(message) as Error & { status: number; body: unknown; path: string };
    error.status = res.status;
    error.body = body;
    error.path = path;
    throw error;
  }
  // apiResponse.success wraps payload under `data` so return that if present
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    return record.token || record.data || body;
  }
  return body;
}

type AppointmentPayload = {
  patient_id: string;
  patient_name: string;
  appointment_type: "In-Person" | "Telehealth";
  date: string;
  time: string;
  duration_minutes: number;
  reason?: string;
  priority?: "Routine" | "Urgent" | "Follow-up";
  status?: "Pending" | "Confirmed" | "Cancelled" | "Completed";
  send_email_reminder?: boolean;
  send_sms_reminder?: boolean;
  send_confirmation?: boolean;
  internal_notes?: string;
};

export type HealthRecordType = "Visit" | "Lab Result" | "Imaging" | "Prescription" | "Vaccination" | "Note";
export type HealthRecordSaveState = "draft" | "final";

export type HealthRecordPayload = {
  patient_id: string;
  patient_name: string;
  record_type: HealthRecordType;
  record_date: string;
  provider: string;
  save_state?: HealthRecordSaveState;
  summary?: string;
  details?: Record<string, unknown>;
};

export type ConditionCategory =
  | "cardiovascular"
  | "metabolic"
  | "respiratory"
  | "renal"
  | "mental_health"
  | "cancer"
  | "uncategorized";

export type UiHealthRecord = {
  id: string;
  title: string;
  date: string;
  dateIso: string;
  provider: string;
  summary: string;
  recordType: HealthRecordType;
  saveState: HealthRecordSaveState;
  conditionCategory: ConditionCategory;
  patient: PatientOption;
  details: Record<string, unknown>;
};

export type PrescriptionPayload = {
  patient_id: string;
  patient_name: string;
  provider: string;
  record_date: string;
  save_state?: HealthRecordSaveState;
  medicines: PrescriptionMedicineLineItem[];
  directions_for_use: string;
  start_date: string;
  end_date?: string;
};

export type PrescriptionMedicineLineItem = {
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

export type PrescriptionInvoiceItem = {
  medicineId: string;
  medicineName: string;
  prescribedDosage: string;
  prescribedQuantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PrescriptionInvoicePayload = {
  patient_id: string;
  patient_name: string;
  health_record_id?: string;
  items: PrescriptionInvoiceItem[];
  total_amount: number;
  invoice_date?: string;
  status?: 'pending' | 'paid' | 'cancelled';
};

export type UiPrescription = {
  id: string;
  patient: PatientOption;
  provider: string;
  dateIso: string;
  medicationName: string;
  dosage: string;
  form: string;
  medicines: PrescriptionMedicineLineItem[];
  directionsForUse: string;
  quantity: number;
  refills: number;
  startDate: string;
  endDate: string;
  saveState: HealthRecordSaveState;
};

export type UiAppointment = {
  id: string;
  time: string;
  date: string;
  scheduledAtIso: string;
  name: string;
  patientId: string;
  type: "In-person" | "Telehealth";
  reason: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  duration: string;
  durationMinutes: number;
  priority: "Routine" | "Urgent" | "Follow-up";
  sendEmailReminder: boolean;
  sendSmsReminder: boolean;
  sendConfirmation: boolean;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string;
  cancelReason: string;
};

export type PatientOption = { id: string; name: string };

export type PrescriptionMedicine = {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  price: number;
  expiry?: string;
  status: string;
};

const toUiType = (type?: string): "In-person" | "Telehealth" => (
  type === "Telehealth" ? "Telehealth" : "In-person"
);

const toUiStatus = (status?: string): "Confirmed" | "Pending" | "Cancelled" | "Completed" => {
  if (status === "Confirmed") return "Confirmed";
  if (status === "Cancelled") return "Cancelled";
  if (status === "Completed") return "Completed";
  return "Pending";
};

export const mapAppointmentToUi = (item: Record<string, unknown>): UiAppointment => {
  const source = item as {
    scheduled_at?: string;
    duration_minutes?: number;
    appointment_id?: string;
    _id?: string;
    patient_name?: string;
    patient_id?: string;
    appointment_type?: string;
    reason?: string;
    status?: string;
    priority?: "Routine" | "Urgent" | "Follow-up";
    send_email_reminder?: boolean;
    send_sms_reminder?: boolean;
    send_confirmation?: boolean;
    internal_notes?: string;
    created_at?: string;
    updated_at?: string;
    cancelled_at?: string;
    cancel_reason?: string;
  };
  const scheduledAt = source.scheduled_at ? new Date(source.scheduled_at) : null;
  const hh = scheduledAt ? String(scheduledAt.getHours()).padStart(2, "0") : "09";
  const mm = scheduledAt ? String(scheduledAt.getMinutes()).padStart(2, "0") : "00";
  const yyyy = scheduledAt ? scheduledAt.getFullYear() : 1970;
  const mon = scheduledAt ? String(scheduledAt.getMonth() + 1).padStart(2, "0") : "01";
  const dd = scheduledAt ? String(scheduledAt.getDate()).padStart(2, "0") : "01";
  const duration = Number(source.duration_minutes || 30);

  return {
    id: source.appointment_id || source._id || "",
    time: `${hh}:${mm}`,
    date: `${yyyy}-${mon}-${dd}`,
    scheduledAtIso: source.scheduled_at || "",
    name: source.patient_name || "",
    patientId: source.patient_id || "",
    type: toUiType(source.appointment_type),
    reason: source.reason || "",
    status: toUiStatus(source.status),
    duration: `${duration}m`,
    durationMinutes: duration,
    priority: source.priority || "Routine",
    sendEmailReminder: !!source.send_email_reminder,
    sendSmsReminder: !!source.send_sms_reminder,
    sendConfirmation: source.send_confirmation !== false,
    internalNotes: source.internal_notes || "",
    createdAt: source.created_at || "",
    updatedAt: source.updated_at || "",
    cancelledAt: source.cancelled_at || "",
    cancelReason: source.cancel_reason || "",
  };
};

const toUiRecordDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fallbackTitle = (recordType: HealthRecordType) => {
  if (recordType === "Lab Result") return "Lab Result";
  if (recordType === "Imaging") return "Imaging Study";
  if (recordType === "Prescription") return "Prescription";
  if (recordType === "Vaccination") return "Vaccination";
  if (recordType === "Note") return "Clinical Note";
  return "Visit";
};

export const mapHealthRecordToUi = (item: Record<string, unknown>): UiHealthRecord => {
  const source = item as {
    record_id?: string;
    _id?: string;
    patient_id?: string;
    patient_name?: string;
    record_type?: HealthRecordType;
    record_date?: string;
    provider?: string;
    save_state?: HealthRecordSaveState;
    summary?: string;
    condition_category?: ConditionCategory;
    details?: Record<string, unknown>;
  };

  const recordType = source.record_type || "Visit";
  const details = source.details || {};
  const summaryFromDetails = typeof details.summary === "string" ? details.summary : "";
  const titleFromDetails = typeof details.title === "string" ? details.title : "";

  return {
    id: source.record_id || source._id || "",
    title: titleFromDetails || fallbackTitle(recordType),
    date: toUiRecordDate(source.record_date),
    dateIso: source.record_date || "",
    provider: source.provider || "",
    summary: source.summary || summaryFromDetails || "",
    recordType,
    saveState: source.save_state || "final",
    conditionCategory: source.condition_category || "uncategorized",
    patient: {
      id: source.patient_id || "",
      name: source.patient_name || "",
    },
    details,
  };
};

export const mapHealthRecordToUiPrescription = (item: Record<string, unknown>): UiPrescription => {
  const source = item as {
    record_id?: string;
    _id?: string;
    patient_id?: string;
    patient_name?: string;
    provider?: string;
    save_state?: HealthRecordSaveState;
    record_date?: string;
    details?: Record<string, unknown>;
  };
  const details = source.details || {};
  const medicines = Array.isArray(details.medicines)
    ? (details.medicines as PrescriptionMedicineLineItem[])
    : [];
  const firstMedicine = medicines[0];
  return {
    id: source.record_id || source._id || "",
    patient: {
      id: source.patient_id || "",
      name: source.patient_name || "",
    },
    provider: source.provider || "",
    dateIso: source.record_date || "",
    medicationName:
      typeof details.medicationName === "string"
        ? details.medicationName
        : firstMedicine?.medicineName || "",
    dosage:
      typeof details.dosage === "string"
        ? details.dosage
        : firstMedicine?.prescribedDosage || "",
    form: typeof details.form === "string" ? details.form : "Prescription",
    medicines,
    directionsForUse:
      typeof details.directionsForUse === "string" ? details.directionsForUse : "",
    quantity: Number(details.quantity || 0),
    refills: Number(details.refills || 0),
    startDate: typeof details.startDate === "string" ? details.startDate : "",
    endDate: typeof details.endDate === "string" ? details.endDate : "",
    saveState: source.save_state || "final",
  };
};

const toPrescriptionHealthRecordPayload = (payload: PrescriptionPayload): HealthRecordPayload => ({
  patient_id: payload.patient_id,
  patient_name: payload.patient_name,
  record_type: "Prescription",
  record_date: payload.record_date,
  provider: payload.provider,
  save_state: payload.save_state || "final",
  summary: payload.directions_for_use || "",
  details: {
    title: payload.medicines.map((item) => item.medicineName).join(", "),
    summary: payload.directions_for_use || "",
    medicines: payload.medicines,
    medicationName: payload.medicines[0]?.medicineName || "",
    dosage: payload.medicines[0]?.prescribedDosage || "",
    directionsForUse: payload.directions_for_use,
    quantity: payload.medicines.reduce(
      (total, item) => total + Number(item.prescribedQuantity || 0),
      0
    ),
    startDate: payload.start_date,
    endDate: payload.end_date || "",
  },
});

const makeQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "boolean") {
      search.set(key, value ? "true" : "false");
      return;
    }
    if (`${value}` !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const getPatients = (query = '') => request(`/api/v1/patients${query}`);
export const getPatient = (id: string) => request(`/api/v1/patients/${id}`);
export const createPatient = (payload: Record<string, unknown>) => request(`/api/v1/patients`, { method: 'POST', body: JSON.stringify(payload) });
export const updatePatient = (id: string, payload: Record<string, unknown>) => request(`/api/v1/patients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deletePatient = (id: string) => request(`/api/v1/patients/${id}`, { method: 'DELETE' });

export const getAppointments = (params?: Record<string, string | number | undefined>) => request(`/api/v1/appointments${makeQuery(params)}`);
export const createAppointment = (payload: AppointmentPayload) => request(`/api/v1/appointments`, { method: "POST", body: JSON.stringify(payload) });
export const updateAppointment = (id: string, payload: Partial<AppointmentPayload>) => request(`/api/v1/appointments/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const cancelAppointment = (id: string, reason = "") => request(`/api/v1/appointments/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const getHealthRecords = (params?: Record<string, string | number | undefined>) =>
  request(`/api/v1/health-records${makeQuery(params)}`);
export const getHealthRecordById = (id: string) => request(`/api/v1/health-records/${id}`);
export const createHealthRecord = (payload: HealthRecordPayload) =>
  request(`/api/v1/health-records`, { method: "POST", body: JSON.stringify(payload) });
export const updateHealthRecord = (id: string, payload: Partial<HealthRecordPayload>) =>
  request(`/api/v1/health-records/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteHealthRecord = (id: string) =>
  request(`/api/v1/health-records/${id}`, { method: "DELETE" });
export const getPrescriptionMedicines = async (): Promise<PrescriptionMedicine[]> => {
  const res = await fetch("/api/prescription-medicines", {
    headers: { Accept: "application/json" },
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw result;
  }
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

export const getPrescriptions = (params?: Record<string, string | number | undefined>) =>
  request(
    `/api/v1/health-records${makeQuery({ ...params, record_type: "Prescription" })}`
  );
export const createPrescription = (payload: PrescriptionPayload) =>
  createHealthRecord(toPrescriptionHealthRecordPayload(payload));
export const createPrescriptionInvoice = (payload: PrescriptionInvoicePayload) =>
  request(`/api/v1/prescription-invoices`, { method: 'POST', body: JSON.stringify(payload) });

/** Predictive care dashboard aggregate row */
export type RiskBucketRow = { _id: string | null; count: number };

/** Predictive care unresolved alert counts by alert_type */
export type AlertTypeCount = { _id: string | null; count: number };

export type TopHighRiskPatient = {
  patient_id?: string;
  patient_name?: string;
  overall_risk_score?: number;
  overall_risk_level?: string;
};

export type PredictiveDashboardPayload = {
  riskDistribution?: RiskBucketRow[];
  alertCounts?: AlertTypeCount[];
  topHighRisk?: TopHighRiskPatient[];
};

export type PredictiveCareRiskFactor = {
  feature?: string;
  importance?: number;
};

export type PredictiveCareMlExplanationRow = {
  feature?: string;
  importance?: number;
  resolved_value?: unknown;
};

export type PredictiveCareProfile = {
  patient_id?: string;
  patient_name?: string;
  overall_risk_level?: string;
  overall_risk_score?: number;
  chronic_disease_risk?: number;
  readmission_risk?: number;
  no_show_risk?: number;
  adherence_risk?: number;
  ml_readmission_prob?: number;
  ml_readmission_level?: string;
  ml_chronic_level?: string;
  ml_chronic_confidence?: number;
  ml_top_risk_factors?: PredictiveCareRiskFactor[];
  ml_is_anomaly?: boolean;
  ml_anomaly_score?: number;
  ml_computed_at?: string;
  ml_service_used?: boolean;
  ml_feature_version?: string;
  ml_label_definition?: string;
  ml_last_feature_snapshot?: Record<string, unknown>;
  ml_explanation?: PredictiveCareMlExplanationRow[];
};

export type PredictiveCareAdherenceRow = {
  medicine?: string;
  score?: number;
  status?: string;
  longest_gap_days?: number;
};

export type PredictiveCareRadarAxis = { axis?: string; value?: number };

export type PredictiveCareRadarPayload = {
  patient_id?: string;
  patient_name?: string;
  radar?: PredictiveCareRadarAxis[];
  overall_score?: number;
  overall_risk_level?: string;
};

export type PredictiveCareTimelineEvent = {
  date?: string;
  type?: string;
  severity?: string;
  title?: string;
  is_resolved?: boolean;
};

export type PredictiveCareLabTrendPoint = {
  date?: string;
  value?: number;
  status?: string;
};

export type PredictiveCareLabTrend = {
  test_name?: string;
  trend_direction?: string;
  trend_severity?: string;
  chart_data?: PredictiveCareLabTrendPoint[];
};

export type PredictiveCareLabForecast = {
  patient_id?: string;
  test_name?: string;
  predicted_value?: number;
  trend?: string;
  input_window?: number[];
  available_tests?: string[];
};

export type CareAlertSeverity = 'Info' | 'Warning' | 'Critical';

export type CareAlertType =
  | 'LAB_TREND'
  | 'CHRONIC_RISK'
  | 'VACCINATION_GAP'
  | 'ADHERENCE_GAP'
  | 'NO_SHOW_RISK'
  | 'READMISSION_RISK'
  | 'CRITICAL_LAB';

export type CareAlertItem = {
  _id?: string;
  patient_id?: string;
  patient_name?: string;
  alert_type?: CareAlertType | string;
  severity?: CareAlertSeverity | string;
  title?: string;
  message?: string;
  is_read?: boolean;
  is_resolved?: boolean;
  triggered_at?: string;
  metadata?: Record<string, unknown>;
};

/** GET /predictive-care/analytics/dashboard → { riskDistribution, alertCounts, topHighRisk } */
export const getPredictiveDashboard = () =>
  request(`/api/v1/predictive-care/analytics/dashboard`) as Promise<PredictiveDashboardPayload>;

export type PredictiveAlertsQueryParams = Record<string, string | number | boolean | undefined>;
export const getPredictiveCareProfile = (patientId: string) =>
  request(`/api/v1/predictive-care/profiles/${encodeURIComponent(patientId)}`) as Promise<{
    profile?: PredictiveCareProfile;
    predictive_care_disclaimer?: string;
  }>;

export const computePredictiveCareProfile = (patientId: string) =>
  request(`/api/v1/predictive-care/profiles/${encodeURIComponent(patientId)}/compute`, {
    method: 'POST',
  }) as Promise<{
    message?: string;
    profile?: PredictiveCareProfile;
    predictive_care_disclaimer?: string;
  }>;

export const getPredictiveCareLabTrends = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/lab-trends`) as Promise<{
    trends?: PredictiveCareLabTrend[];
  }>;

export const getPredictiveCareLabForecast = (
  patientId: string,
  testName: string,
  lastValues: number[] = []
) =>
  request(
    `/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/lab-forecast${makeQuery({
      test_name: testName,
      last_values: lastValues.length > 0 ? lastValues.join(',') : undefined,
    })}`
  ) as Promise<PredictiveCareLabForecast>;

export const getPredictiveCareAdherence = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/adherence`) as Promise<{
    adherence?: PredictiveCareAdherenceRow[];
  }>;

export const getPredictiveCareRiskRadar = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/risk-radar`) as Promise<
    PredictiveCareRadarPayload
  >;

export const getPredictiveCareAlertTimeline = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/alert-timeline`) as Promise<{
    timeline?: PredictiveCareTimelineEvent[];
  }>;

/** GET /predictive-care/alerts — returns `{ alerts }` plus pagination meta is not unwrapped by `request` meta; use alerts list from result */
export const getPredictiveAlerts = (params?: PredictiveAlertsQueryParams) =>
  request(`/api/v1/predictive-care/alerts${makeQuery(params)}`) as Promise<{ alerts?: CareAlertItem[] }>;

export const getPendingUsers = () => request(`/api/v1/auth/users/pending`);
export const getAllUsers = () => request(`/api/v1/auth/users`);
export const activateUser = (userId: string) => request(`/api/v1/auth/users/${userId}/activate`, { method: 'POST' });
export const deactivateUser = (userId: string) => request(`/api/v1/auth/users/${userId}/deactivate`, { method: 'POST' });

const api = {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getPrescriptionMedicines,
  getPrescriptions,
  createPrescription,
  createPrescriptionInvoice,
  getPredictiveDashboard,
  getPredictiveAlerts,
  getPredictiveCareProfile,
  computePredictiveCareProfile,
  getPredictiveCareLabTrends,
  getPredictiveCareLabForecast,
  getPredictiveCareAdherence,
  getPredictiveCareRiskRadar,
  getPredictiveCareAlertTimeline,
  getPendingUsers,
  getAllUsers,
  activateUser,
  deactivateUser,
  mapAppointmentToUi,
  mapHealthRecordToUi,
  mapHealthRecordToUiPrescription,
};

export default api;
