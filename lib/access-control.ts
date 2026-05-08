import type { AuthUser, SessionClaims } from "./session";

export type AccessSubject = AuthUser | SessionClaims | null | undefined;

type RouteRequirement = {
  pattern: RegExp;
  permission: string;
  adminOnly?: boolean;
};

const routeRequirements: RouteRequirement[] = [
  { pattern: /^\/dashboard(?:\/|$)/, permission: "dashboard:view" },
  { pattern: /^\/patients(?:\/|$)/, permission: "patients:view" },
  { pattern: /^\/appointments(?:\/|$)/, permission: "appointments:view" },
  { pattern: /^\/records(?:\/|$)/, permission: "health_records:view" },
  { pattern: /^\/analytics(?:\/|$)/, permission: "dashboard:view" },
  { pattern: /^\/admin(?:\/|$)/, permission: "admin_users:view", adminOnly: true },
  { pattern: /^\/audit-logs(?:\/|$)/, permission: "audit_logs:view", adminOnly: true },
  { pattern: /^\/telehealth(?:\/|$)/, permission: "telehealth:view" },
];

const ADMIN_ROLES = new Set(["Admin"]);
const WORKSPACE_ROLES = new Set(["Admin", "Doctor", "Staff", "Nurse"]);
const WORKSPACE_HOME_BY_PERMISSION = [
  { permission: "dashboard:view", path: "/dashboard" },
  { permission: "patients:view", path: "/patients" },
  { permission: "appointments:view", path: "/appointments" },
  { permission: "health_records:view", path: "/records" },
  { permission: "admin_users:view", path: "/admin" },
  { permission: "audit_logs:view", path: "/audit-logs" },
];

function getPermissions(subject: AccessSubject) {
  if (!subject || !Array.isArray(subject.permissions)) return [];
  return subject.permissions.filter((permission): permission is string => typeof permission === "string" && permission.length > 0);
}

export function hasPermission(subject: AccessSubject, permission?: string | null) {
  if (!permission) return true;
  return getPermissions(subject).includes(permission);
}

export function hasAnyPermission(subject: AccessSubject, permissions: string[]) {
  if (!permissions.length) return true;
  const granted = getPermissions(subject);
  return permissions.some((permission) => granted.includes(permission));
}

export function getRouteRequirement(pathname: string) {
  return routeRequirements.find((requirement) => requirement.pattern.test(pathname)) || null;
}

export function isAdminRole(role?: string | null) {
  return ADMIN_ROLES.has(String(role || ""));
}

export function isWorkspaceRole(role?: string | null) {
  return WORKSPACE_ROLES.has(String(role || ""));
}

export function getFirstAllowedWorkspacePath(subject: AccessSubject) {
  for (const route of WORKSPACE_HOME_BY_PERMISSION) {
    if (hasPermission(subject, route.permission)) {
      return route.path;
    }
  }

  return "";
}
