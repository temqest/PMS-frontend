import { clearAuthDebugLog, pushAuthDebug } from "./auth-debug";

export type AuthType = "admin" | "patient";
export type CanonicalRole = "Admin" | "Doctor" | "Staff" | "Nurse" | "Patient";

export type SessionClaims = {
  sub?: string;
  id?: string;
  user_id?: string;
  email?: string;
  username?: string;
  role?: string;
  subsystem?: string;
  status?: string;
  authType?: string;
  patient_id?: string | null;
  fullName?: string;
  scope?: string[];
  permissions?: string[];
  services?: Record<string, boolean>;
  exp?: number;
  iat?: number;
};

export type AuthUser = {
  sub?: string;
  id?: string;
  user_id?: string;
  email?: string;
  username?: string;
  role?: CanonicalRole | string;
  subsystem?: string;
  status?: string;
  authType?: AuthType | string;
  fullName?: string;
  patient_id?: string | null;
  is_active?: boolean;
  permissions?: string[];
  services?: Record<string, boolean>;
};

const CANONICAL_ROLE_BY_KEY: Record<string, CanonicalRole> = {
  admin: "Admin",
  administrator: "Admin",
  system_admin: "Admin",
  systemadmin: "Admin",
  "system admin": "Admin",
  doctor: "Doctor",
  physician: "Doctor",
  staff: "Staff",
  care_team: "Staff",
  "care team": "Staff",
  carecenter: "Staff",
  care_center: "Staff",
  "care center": "Staff",
  front_desk: "Staff",
  frontdesk: "Staff",
  "front desk": "Staff",
  receptionist: "Staff",
  appointment_system: "Staff",
  "appointment system": "Staff",
  nurse: "Nurse",
  patient: "Patient",
};

const ROLE_ACCESS_PROFILES: Record<Exclude<CanonicalRole, "Patient">, { permissions: string[]; services: Record<string, boolean> }> = {
  Admin: {
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:create",
      "patients:update",
      "patients:delete",
      "appointments:view",
      "appointments:create",
      "appointments:update",
      "health_records:view",
      "health_records:create",
      "health_records:update",
      "health_records:delete",
      "prescriptions:view",
      "prescriptions:create",
      "prescriptions:update",
      "telehealth:view",
      "telehealth:start",
      "admin_users:view",
      "admin_users:manage",
      "audit_logs:view",
    ],
    services: {
      dashboard: true,
      patients: true,
      appointments: true,
      health_records: true,
      prescriptions: true,
      telehealth: true,
      admin_users: true,
      audit_logs: true,
    },
  },
  Doctor: {
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:create",
      "patients:update",
      "appointments:view",
      "appointments:create",
      "appointments:update",
      "health_records:view",
      "health_records:create",
      "health_records:update",
      "prescriptions:view",
      "prescriptions:create",
      "telehealth:view",
      "telehealth:start",
    ],
    services: {
      dashboard: true,
      patients: true,
      appointments: true,
      health_records: true,
      prescriptions: true,
      telehealth: true,
    },
  },
  Staff: {
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:create",
      "patients:update",
      "appointments:view",
      "appointments:create",
      "appointments:update",
      "telehealth:view",
      "audit_logs:view",
    ],
    services: {
      dashboard: true,
      patients: true,
      appointments: true,
      telehealth: true,
      audit_logs: true,
    },
  },
  Nurse: {
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:update",
      "appointments:view",
      "appointments:update",
      "health_records:view",
      "health_records:create",
      "health_records:update",
      "prescriptions:view",
      "telehealth:view",
      "telehealth:start",
    ],
    services: {
      dashboard: true,
      patients: true,
      appointments: true,
      health_records: true,
      prescriptions: true,
      telehealth: true,
    },
  },
};

function normalizeRoleKey(role?: string | null) {
  return String(role || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitRoleCandidates(role?: string | null) {
  const raw = String(role || "").trim().toLowerCase();
  if (!raw) return [];

  const normalized = normalizeRoleKey(raw);
  const underscored = normalized.replace(/\s+/g, "_");
  const colonSplit = raw.split(":").map((part) => part.trim()).filter(Boolean);
  const spaceSplit = normalized.split(/\s+/).filter(Boolean);
  const suffixes: string[] = [];

  if (colonSplit.length > 1) {
    suffixes.push(normalizeRoleKey(colonSplit[colonSplit.length - 1]));
  }

  if (spaceSplit.length > 1) {
    suffixes.push(spaceSplit[spaceSplit.length - 1]);
    suffixes.push(spaceSplit.slice(-2).join(" "));
  }

  return Array.from(
    new Set(
      [
        raw,
        raw.replace(/[^a-z0-9]+/g, "_"),
        normalized,
        underscored,
        ...suffixes,
        ...suffixes.map((value) => value.replace(/\s+/g, "_")),
      ].filter(Boolean)
    )
  );
}

function sanitizePermissions(permissions?: string[]) {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((permission): permission is string => typeof permission === "string" && permission.length > 0);
}

function sanitizeServices(services?: Record<string, boolean>) {
  if (!services || typeof services !== "object") return {};
  return Object.fromEntries(
    Object.entries(services).filter(
      (entry): entry is [string, boolean] => typeof entry[0] === "string" && entry[0].length > 0 && entry[1] === true
    )
  );
}

export function normalizeRole(role?: string | null): CanonicalRole | "" {
  const candidates = splitRoleCandidates(role);

  for (const candidate of candidates) {
    if (CANONICAL_ROLE_BY_KEY[candidate]) {
      return CANONICAL_ROLE_BY_KEY[candidate];
    }
  }

  if (candidates.some((candidate) => candidate.includes("admin"))) return "Admin";
  if (candidates.some((candidate) => candidate.includes("doctor") || candidate.includes("physician"))) return "Doctor";
  if (candidates.some((candidate) => candidate.includes("nurse"))) return "Nurse";
  if (
    candidates.some(
      (candidate) =>
        candidate.includes("staff") ||
        candidate.includes("front_desk") ||
        candidate.includes("reception") ||
        candidate.includes("appointment_system") ||
        candidate.includes("care_team") ||
        candidate.includes("care_center")
    )
  ) {
    return "Staff";
  }
  if (candidates.some((candidate) => candidate.includes("patient"))) return "Patient";

  return "";
}

export function normalizeStatus(status?: string | boolean | null, isActive?: boolean) {
  if (typeof status === "boolean") return status ? "active" : "inactive";
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized) return normalized;
  if (typeof isActive === "boolean") return isActive ? "active" : "inactive";
  return "active";
}

export function normalizeAuthType(authType?: string | null, role?: string | null) {
  const normalized = String(authType || "").trim().toLowerCase();
  if (normalized === "admin" || normalized === "patient") return normalized;
  return normalizeRole(role) === "Patient" ? "patient" : "admin";
}

function getLocalAccessProfile(role?: string | null) {
  const canonicalRole = normalizeRole(role);
  if (!canonicalRole || canonicalRole === "Patient") return null;
  return ROLE_ACCESS_PROFILES[canonicalRole];
}

function mergePermissions(role?: string | null, permissions?: string[]) {
  const localPermissions = getLocalAccessProfile(role)?.permissions || [];
  return Array.from(new Set([...sanitizePermissions(permissions), ...localPermissions]));
}

function mergeServices(role?: string | null, services?: Record<string, boolean>) {
  return {
    ...getLocalAccessProfile(role)?.services,
    ...sanitizeServices(services),
  };
}

function inferCanonicalRole(
  rawRole: string | null | undefined,
  authType: AuthType,
  permissions?: string[],
  services?: Record<string, boolean>
): CanonicalRole | "" {
  const direct = normalizeRole(rawRole);
  if (direct) return direct;
  if (authType === "patient") return "Patient";

  const normalizedPermissions = sanitizePermissions(permissions);
  const normalizedServices = sanitizeServices(services);

  if (normalizedPermissions.includes("admin_users:manage") || normalizedPermissions.includes("admin_users:view")) {
    return "Admin";
  }

  if (normalizedPermissions.includes("prescriptions:create")) {
    return "Doctor";
  }

  if (normalizedPermissions.includes("health_records:create") && normalizedPermissions.includes("telehealth:start")) {
    return "Nurse";
  }

  if (
    normalizedPermissions.length > 0 ||
    normalizedServices.dashboard ||
    normalizedServices.patients ||
    normalizedServices.appointments
  ) {
    return "Staff";
  }

  return "";
}

export function normalizeAuthUser(user?: AuthUser | SessionClaims | null): AuthUser | null {
  if (!user) return null;

  const authType = normalizeAuthType("authType" in user ? user.authType : undefined, user.role);
  const canonicalRole = inferCanonicalRole(user.role, authType, user.permissions, user.services);
  const identity = String(user.user_id || user.id || user.sub || "").trim();
  const username = String(user.username || user.email || "").trim();
  const permissions = mergePermissions(canonicalRole, user.permissions);
  const services = mergeServices(canonicalRole, user.services);

  if (!identity && !username && !canonicalRole) return null;

  return {
    id: identity || undefined,
    user_id: identity || undefined,
    email: user.email,
    username,
    role: canonicalRole || undefined,
    subsystem: user.subsystem || (authType === "patient" ? "Patient" : "Admin"),
    status: normalizeStatus(user.status, "is_active" in user ? user.is_active : undefined),
    authType,
    fullName: user.fullName,
    patient_id: user.patient_id || null,
    is_active: "is_active" in user ? user.is_active : undefined,
    permissions,
    services,
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function getStoredToken() {
  try {
    return typeof window === "undefined" ? "" : localStorage.getItem("pms_token") || "";
  } catch {
    return "";
  }
}

export function storeSessionToken(token: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem("pms_token", token);

  const claims = decodeSessionToken(token);
  const maxAge = claims?.exp ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : 60 * 60;
  document.cookie = `pms_token=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function getStoredAdminAccessToken() {
  try {
    return typeof window === "undefined" ? "" : localStorage.getItem("pms_admin_access_token") || "";
  } catch {
    return "";
  }
}

export function storeAuthenticatedSession(token: string, user?: AuthUser | null, adminAccessToken?: string | null) {
  clearAuthDebugLog();
  storeSessionToken(token);
  if (typeof window === "undefined") return;

  const tokenClaims = decodeSessionToken(token);
  const normalizedUser = normalizeAuthUser({
    ...(tokenClaims || {}),
    ...(user || {}),
    permissions: user?.permissions && user.permissions.length > 0 ? user.permissions : tokenClaims?.permissions,
    services: user?.services && Object.keys(user.services).length > 0 ? user.services : tokenClaims?.services,
  });

  if (normalizedUser) {
    localStorage.setItem("pms_user", JSON.stringify(normalizedUser));
  } else {
    localStorage.removeItem("pms_user");
  }

  if (adminAccessToken) {
    localStorage.setItem("pms_admin_access_token", adminAccessToken);
  } else {
    localStorage.removeItem("pms_admin_access_token");
  }

  pushAuthDebug("session.store_authenticated", {
    tokenExists: Boolean(token),
    userId: normalizedUser?.user_id || "",
    rawRole:
      (user && "role" in user && typeof user.role === "string" ? user.role : "") ||
      (tokenClaims?.role && typeof tokenClaims.role === "string" ? tokenClaims.role : ""),
    role: normalizedUser?.role || "",
    status: normalizedUser?.status || "",
    authType: normalizedUser?.authType || "",
    permissionsCount: normalizedUser?.permissions?.length || 0,
    hasAdminAccessToken: Boolean(adminAccessToken),
  });
}

export function getStoredUser(): AuthUser | null {
  try {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem("pms_user");
    return value ? normalizeAuthUser(JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;

  const priorUser = getStoredUser();
  const hadToken = Boolean(getStoredToken());
  pushAuthDebug("session.clear", {
    pathname: window.location.pathname,
    search: window.location.search,
    hadToken,
    priorRole: priorUser?.role || "",
    priorStatus: priorUser?.status || "",
    priorAuthType: priorUser?.authType || "",
    permissionsCount: priorUser?.permissions?.length || 0,
  }, "warn");

  localStorage.removeItem("pms_token");
  localStorage.removeItem("pms_user");
  localStorage.removeItem("pms_admin_access_token");
  document.cookie = "pms_token=; Max-Age=0; Path=/; SameSite=Lax";
}

export function decodeSessionToken(token: string): SessionClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const normalizedUser = normalizeAuthUser(payload as SessionClaims);
    return {
      ...(payload as SessionClaims),
      id: normalizedUser?.id,
      user_id: normalizedUser?.user_id,
      username: normalizedUser?.username,
      role: normalizedUser?.role,
      subsystem: normalizedUser?.subsystem,
      status: normalizedUser?.status,
      authType: normalizedUser?.authType,
      patient_id: normalizedUser?.patient_id,
      permissions: normalizedUser?.permissions,
      services: normalizedUser?.services,
    };
  } catch {
    return null;
  }
}

export function getSessionClaims() {
  const token = getStoredToken();
  return token ? decodeSessionToken(token) : null;
}

export function isTokenExpired(claims: SessionClaims | null, skewSeconds = 30) {
  if (!claims?.exp) return false;
  return claims.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export function getPortalPathForRole(role?: string | null, authType?: string | null) {
  return normalizeAuthType(authType, role) === "patient" ? "/portal" : "/dashboard";
}

export function isPatientRole(role?: string | null) {
  return normalizeRole(role) === "Patient";
}
