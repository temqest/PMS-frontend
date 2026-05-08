"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  clearStoredSession,
  decodeSessionToken,
  getPortalPathForRole,
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  normalizeAuthType,
  normalizeAuthUser,
  type SessionClaims,
} from "../../lib/session";
import { getFirstAllowedWorkspacePath, getRouteRequirement, hasPermission, isAdminRole, isWorkspaceRole } from "../../lib/access-control";
import { pushAuthDebug } from "../../lib/auth-debug";

type AuthGuardProps = {
  children: ReactNode;
  area: "workspace" | "portal" | "telehealth";
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH !== "false";
const AUTH_VERIFY_TIMEOUT_MS = 8000;
const ACTIVE_STATUS = "active";

function debugAuth(message: string, details?: Record<string, unknown>) {
  if (!DEBUG_AUTH) return;
  console.info("[auth]", message, details || {});
  pushAuthDebug(`guard.${message.replace(/\s+/g, "_")}`, details || {});
}

function makeLoginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath || "/dashboard")}`;
}

function mergeAuthSubject(claims: SessionClaims | null, storedUser: ReturnType<typeof normalizeAuthUser>) {
  const normalizedClaims = normalizeAuthUser(claims);
  const normalizedStoredUser = normalizeAuthUser(storedUser);

  if (!normalizedClaims && !normalizedStoredUser) return null;

  return normalizeAuthUser({
    ...(normalizedStoredUser || {}),
    ...(normalizedClaims || {}),
    permissions:
      normalizedClaims?.permissions && normalizedClaims.permissions.length > 0
        ? normalizedClaims.permissions
        : normalizedStoredUser?.permissions,
    services:
      normalizedClaims?.services && Object.keys(normalizedClaims.services).length > 0
        ? normalizedClaims.services
        : normalizedStoredUser?.services,
  });
}

function getRouteDecision(area: AuthGuardProps["area"], pathname: string, user: SessionClaims) {
  const normalizedUser = normalizeAuthUser(user);
  const role = normalizedUser?.role || "";
  const status = normalizedUser?.status || ACTIVE_STATUS;
  const authType = normalizeAuthType(normalizedUser?.authType, role);
  const routeRequirement = getRouteRequirement(pathname);
  const hasIdentity = Boolean(normalizedUser?.user_id || normalizedUser?.id);

  if (!hasIdentity) {
    return {
      allowed: false,
      clearSession: true,
      reason: "missing_user_identity",
    };
  }

  if (status !== ACTIVE_STATUS) {
    return {
      allowed: false,
      clearSession: true,
      reason: "inactive_status",
    };
  }

  if (area === "telehealth") {
    if (authType === "patient") {
      return { allowed: true, role, authType, reason: "patient_telehealth" };
    }

    if (authType !== "admin" || !isWorkspaceRole(role)) {
      return {
        allowed: false,
        clearSession: true,
        role,
        authType,
        reason: "invalid_telehealth_role",
      };
    }

    if (!hasPermission(normalizedUser, routeRequirement?.permission)) {
      return {
        allowed: false,
        redirectTo: getFirstAllowedWorkspacePath(normalizedUser) || "/dashboard",
        role,
        authType,
        reason: "missing_telehealth_permission",
      };
    }

    return { allowed: true, role, authType, reason: "workspace_telehealth" };
  }

  if (area === "portal") {
    if (authType === "patient") {
      return { allowed: true, role, authType, reason: "patient_portal" };
    }

    if (authType === "admin") {
      return {
        allowed: false,
        redirectTo: getFirstAllowedWorkspacePath(normalizedUser) || "/dashboard",
        role,
        authType,
        reason: "workspace_user_on_portal",
      };
    }

    return {
      allowed: false,
      clearSession: true,
      role,
      authType,
      reason: "invalid_portal_role",
    };
  }

  if (authType === "patient") {
    return {
      allowed: false,
      redirectTo: getPortalPathForRole(role, authType),
      role,
      authType,
      reason: "patient_on_workspace",
    };
  }

  if (authType !== "admin" || !isWorkspaceRole(role)) {
    return {
      allowed: false,
      clearSession: true,
      role,
      authType,
      reason: "invalid_workspace_role",
    };
  }

  if (routeRequirement?.adminOnly && !isAdminRole(role)) {
    return {
      allowed: false,
      redirectTo: getFirstAllowedWorkspacePath(normalizedUser) || "/dashboard",
      role,
      authType,
      reason: "non_admin_on_admin_route",
    };
  }

  if (!hasPermission(normalizedUser, routeRequirement?.permission)) {
    return {
      allowed: false,
      redirectTo: getFirstAllowedWorkspacePath(normalizedUser) || "/dashboard",
      role,
      authType,
      reason: "missing_route_permission",
    };
  }

  return { allowed: true, role, authType, reason: "workspace_route" };
}

async function verifySession(token: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Session check failed (${response.status})`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function AuthGuard({ children, area }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const verifiedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const currentPath =
        typeof window === "undefined" ? pathname : `${window.location.pathname}${window.location.search}`;

      const token = getStoredToken();
      const claims = token ? decodeSessionToken(token) : null;
      const storedUser = getStoredUser();
      const authUser = mergeAuthSubject(claims, storedUser);
      const permissionsCount = authUser?.permissions?.length || 0;

      debugAuth("auth check started", {
        area,
        pathname,
        tokenFound: Boolean(token),
        claimsFound: Boolean(claims),
        userFound: Boolean(storedUser),
        rawClaimRole: claims?.role || "",
        rawStoredRole: storedUser?.role || "",
        role: authUser?.role || claims?.role || storedUser?.role || "",
        status: authUser?.status || claims?.status || storedUser?.status || "",
        authType: authUser?.authType || claims?.authType || storedUser?.authType || "",
        permissionsCount,
      });

      if (!token || !claims || isTokenExpired(claims)) {
        debugAuth("auth blocked: missing or expired session", {
          tokenFound: Boolean(token),
          claimsFound: Boolean(claims),
        });
        clearStoredSession();
        router.replace(makeLoginPath(currentPath));
        return;
      }

      if (!authUser) {
        debugAuth("auth blocked: missing normalized user", { area, pathname });
        clearStoredSession();
        router.replace(makeLoginPath(currentPath));
        return;
      }

      const decision = getRouteDecision(area, pathname, authUser as SessionClaims);
      if (!decision.allowed) {
        debugAuth("auth blocked: role/status not allowed", {
          area,
          pathname,
          role: decision.role || authUser.role,
          status: authUser.status,
          authType: decision.authType || authUser.authType,
          permissionsCount,
          reason: decision.reason,
        });

        if (decision.clearSession) {
          pushAuthDebug("guard.clear_session", {
            area,
            pathname,
            reason: decision.reason,
            role: authUser.role || "",
            status: authUser.status || "",
            authType: authUser.authType || "",
          }, "warn");
          clearStoredSession();
          router.replace(makeLoginPath(currentPath));
          return;
        }

        const fallbackPath =
          decision.redirectTo && decision.redirectTo !== pathname
            ? decision.redirectTo
            : getFirstAllowedWorkspacePath(authUser) || getPortalPathForRole(authUser.role, authUser.authType);
        debugAuth("auth denied: redirecting", {
          area,
          pathname,
          redirectTo: fallbackPath,
          routeAllowed: false,
        });
        pushAuthDebug("guard.redirect_without_logout", {
          area,
          pathname,
          redirectTo: fallbackPath,
          reason: decision.reason,
          role: authUser.role || "",
          authType: authUser.authType || "",
        }, "warn");
        router.replace(fallbackPath);
        return;
      }

      if (verifiedTokenRef.current === token) {
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      try {
        await verifySession(token);
        if (!cancelled) {
          verifiedTokenRef.current = token;
          debugAuth("auth allowed: verification completed", {
            area,
            pathname,
            role: authUser.role,
            status: authUser.status,
            authType: authUser.authType,
            permissionsCount,
            routeAllowed: true,
          });
          setReady(true);
        }
      } catch (error) {
        const status = error && typeof error === "object" && "status" in error ? (error as { status?: number }).status : undefined;
        const isExplicitAuthFailure = status === 401 || status === 403;

        debugAuth("auth verification failed", {
          area,
          pathname,
          role: authUser.role,
          status: authUser.status,
          authType: authUser.authType,
          permissionsCount,
          verificationStatus: status || "",
          reason: error instanceof Error ? error.message : "unknown",
          explicitAuthFailure: isExplicitAuthFailure,
        });

        if (isExplicitAuthFailure) {
          pushAuthDebug("guard.verify_explicit_auth_failure", {
            area,
            pathname,
            verificationStatus: status || "",
            role: authUser.role || "",
            authType: authUser.authType || "",
          }, "warn");
          clearStoredSession();
          router.replace(makeLoginPath(currentPath));
          return;
        }

        if (!cancelled) {
          pushAuthDebug("guard.verify_transient_failure_but_allowing", {
            area,
            pathname,
            verificationStatus: status || "",
            role: authUser.role || "",
            authType: authUser.authType || "",
            error: error instanceof Error ? error.message : "unknown",
          }, "warn");
          verifiedTokenRef.current = token;
          setReady(true);
        }
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [area, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[var(--accent-sage)]" />
          <p className="text-sm">Checking secure access...</p>
        </div>
      </div>
    );
  }

  return children;
}
