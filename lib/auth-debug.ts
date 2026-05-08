type AuthDebugLevel = "info" | "warn" | "error";

type AuthDebugEntry = {
  at: string;
  level: AuthDebugLevel;
  event: string;
  details: Record<string, unknown>;
};

const STORAGE_KEY = "pms_auth_debug_log";
const MAX_ENTRIES = 200;
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_AUTH !== "false";

function readEntries(): AuthDebugEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuthDebugEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: AuthDebugEntry[]) {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Best effort only.
  }
}

export function pushAuthDebug(event: string, details: Record<string, unknown> = {}, level: AuthDebugLevel = "info") {
  if (!DEBUG_ENABLED || typeof window === "undefined") return;

  const entry: AuthDebugEntry = {
    at: new Date().toISOString(),
    level,
    event,
    details,
  };

  const entries = [...readEntries(), entry];
  writeEntries(entries);
  (window as Window & { __PMS_AUTH_DEBUG__?: AuthDebugEntry[] }).__PMS_AUTH_DEBUG__ = entries;

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger("[auth-debug]", event, details);
}

export function clearAuthDebugLog() {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(STORAGE_KEY);
    delete (window as Window & { __PMS_AUTH_DEBUG__?: AuthDebugEntry[] }).__PMS_AUTH_DEBUG__;
  } catch {
    // Best effort only.
  }
}

export function getAuthDebugLog() {
  return readEntries();
}

if (typeof window !== "undefined") {
  (window as Window & { getPmsAuthDebugLog?: typeof getAuthDebugLog }).getPmsAuthDebugLog = getAuthDebugLog;
}
