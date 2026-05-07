"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  clearStoredSession,
  decodeSessionToken,
  getPortalPathForRole,
  getStoredToken,
  isTokenExpired,
  type SessionClaims,
} from "../../lib/session";

type AuthGuardProps = {
  children: ReactNode;
  area: "workspace" | "portal";
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const workspaceRoles = new Set([
  "system_admin",
  "front_desk",
  "physician",
  "billing_system",
  "appointment_system",
  "emr_system",
  "predictive_analytics",
]);

const adminRoles = new Set(["system_admin", "front_desk"]);

function makeLoginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath || "/dashboard")}`;
}

function isAuthorized(area: AuthGuardProps["area"], pathname: string, claims: SessionClaims) {
  if (area === "portal") {
    return claims.role === "patient";
  }

  if (!claims.role || !workspaceRoles.has(claims.role)) {
    return false;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminRoles.has(claims.role);
  }

  return true;
}

async function verifySession(token: string) {
  const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error(`Session check failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
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

      if (!token || !claims || isTokenExpired(claims)) {
        clearStoredSession();
        router.replace(makeLoginPath(currentPath));
        return;
      }

      if (!isAuthorized(area, pathname, claims)) {
        router.replace(getPortalPathForRole(claims.role));
        return;
      }

      if (verifiedTokenRef.current === token) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        await verifySession(token);
        if (!cancelled) {
          verifiedTokenRef.current = token;
          setReady(true);
        }
      } catch {
        clearStoredSession();
        router.replace(makeLoginPath(currentPath));
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
