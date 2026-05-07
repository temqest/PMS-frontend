export type SessionClaims = {
  sub?: string;
  role?: string;
  patient_id?: string | null;
  fullName?: string;
  scope?: string[];
  exp?: number;
  iat?: number;
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

export function storeSessionToken(token: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem("pms_token", token);

  const claims = decodeSessionToken(token);
  const maxAge = claims?.exp ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : 60 * 60;
  document.cookie = `pms_token=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("pms_token");
  document.cookie = "pms_token=; Max-Age=0; Path=/; SameSite=Lax";
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

export function isTokenExpired(claims: SessionClaims | null, skewSeconds = 30) {
  if (!claims?.exp) return false;
  return claims.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export function getPortalPathForRole(role?: string | null) {
  return role === "patient" ? "/portal" : "/dashboard";
}

export function isPatientRole(role?: string | null) {
  return role === "patient";
}
