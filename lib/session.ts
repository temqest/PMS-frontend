export type SessionClaims = {
  sub?: string;
  role?: string;
  patient_id?: string | null;
  fullName?: string;
  scope?: string[];
};

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

export function decodeSessionToken(token: string): SessionClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export function getSessionClaims() {
  const token = getStoredToken();
  return token ? decodeSessionToken(token) : null;
}

export function getPortalPathForRole(role?: string | null) {
  return role === "patient" ? "/portal" : "/dashboard";
}

export function isPatientRole(role?: string | null) {
  return role === "patient";
}