const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
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
