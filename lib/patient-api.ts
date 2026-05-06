const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

function authHeader() {
  try {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("pms_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function readBody(res: Response) {
  if (res.status === 204 || res.status === 205) return null;
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path: string, opts: RequestInit = {}) {
  const hasBody = typeof opts.body !== "undefined" && opts.body !== null;
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json", ...authHeader(), ...(opts.headers as Record<string, string> || {}) } as Record<string, string>;
  if (hasBody && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const body = await readBody(res);
  if (!res.ok) {
    const message = body && typeof body === "object" && "message" in body ? String((body as Record<string, unknown>).message || "") : "";
    const error = new Error(message || `Request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    return record.data || body;
  }
  return body;
}

const makeQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, typeof value === "boolean" ? (value ? "true" : "false") : String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export type PatientPortalRecord = Record<string, unknown>;
export type PatientPortalAppointment = Record<string, unknown>;

export type PatientPredictiveProfile = {
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
  ml_is_anomaly?: boolean;
  ml_anomaly_score?: number;
  ml_computed_at?: string;
  last_computed_at?: string;
  has_critical_labs?: boolean;
  has_overdue_vaccinations?: boolean;
  has_adherence_gaps?: boolean;
};

export type PatientLabTrendPoint = {
  date?: string;
  value?: number;
  status?: string;
};

export type PatientLabTrend = {
  test_name?: string;
  trend_direction?: string;
  trend_severity?: string;
  chart_data?: PatientLabTrendPoint[];
};

export type PatientLabForecast = {
  patient_id?: string;
  test_name?: string;
  predicted_value?: number;
  trend?: string;
  input_window?: number[];
  available_tests?: string[];
};

export type PatientAdherenceRow = {
  medicine?: string;
  score?: number;
  status?: string;
  longest_gap_days?: number;
};

export type PatientRiskRadarAxis = {
  axis?: string;
  value?: number;
};

export type PatientRiskRadar = {
  patient_id?: string;
  patient_name?: string;
  radar?: PatientRiskRadarAxis[];
  overall_score?: number;
  overall_risk_level?: string;
};

export type PatientAlertTimelineEvent = {
  date?: string;
  type?: string;
  severity?: string;
  title?: string;
  is_resolved?: boolean;
};

export const getMyAuthContext = () => request("/api/v1/auth/me") as Promise<{ user?: Record<string, unknown> }>;

export const getMyPatient = () => request("/api/v1/patients/me") as Promise<{ patient?: PatientPortalRecord }>;
export const updateMyPatient = (payload: Record<string, unknown>) =>
  request("/api/v1/patients/me", { method: "PATCH", body: JSON.stringify(payload) }) as Promise<{ patient?: PatientPortalRecord }>;

export const getMyAppointments = (params?: Record<string, string | number | boolean | undefined>) =>
  request(`/api/v1/appointments/me${makeQuery(params)}`) as Promise<{ appointments?: PatientPortalAppointment[] }>;
export const createMyAppointmentRequest = (payload: Record<string, unknown>) =>
  request("/api/v1/appointments", { method: "POST", body: JSON.stringify(payload) }) as Promise<{ appointment?: PatientPortalAppointment }>;
export const updateMyAppointmentRequest = (id: string, payload: Record<string, unknown>) =>
  request(`/api/v1/appointments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }) as Promise<{ appointment?: PatientPortalAppointment }>;
export const cancelMyAppointmentRequest = (id: string, reason = "") =>
  request(`/api/v1/appointments/${encodeURIComponent(id)}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }) as Promise<{ appointment?: PatientPortalAppointment }>;

export const getMyHealthRecords = (params?: Record<string, string | number | boolean | undefined>) =>
  request(`/api/v1/health-records/me${makeQuery(params)}`) as Promise<{ records?: PatientPortalRecord[] }>;

export const getMyPredictiveProfile = (patientId: string) =>
  request(`/api/v1/predictive-care/profiles/${encodeURIComponent(patientId)}`) as Promise<{
    profile?: PatientPredictiveProfile;
    predictive_care_disclaimer?: string;
  }>;

export const getMyPredictiveLabTrends = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/lab-trends`) as Promise<{
    trends?: PatientLabTrend[];
  }>;

export const getMyPredictiveLabForecast = (
  patientId: string,
  testName: string,
  lastValues: number[] = []
) =>
  request(
    `/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/lab-forecast${makeQuery({
      test_name: testName,
      last_values: lastValues.length ? lastValues.join(",") : undefined,
    })}`
  ) as Promise<PatientLabForecast>;

export const getMyPredictiveAdherence = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/adherence`) as Promise<{
    adherence?: PatientAdherenceRow[];
  }>;

export const getMyPredictiveRiskRadar = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/risk-radar`) as Promise<PatientRiskRadar>;

export const getMyPredictiveAlertTimeline = (patientId: string) =>
  request(`/api/v1/predictive-care/analytics/${encodeURIComponent(patientId)}/alert-timeline`) as Promise<{
    timeline?: PatientAlertTimelineEvent[];
  }>;
