"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthButton, AuthField, AuthPasswordField, BrandMark } from "../components/clinic-ui";
import {
  clearStoredSession,
  decodeSessionToken,
  getPortalPathForRole,
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  normalizeAuthType,
  normalizeAuthUser,
  storeAuthenticatedSession,
} from "../../lib/session";
import { pushAuthDebug } from "../../lib/auth-debug";

type LoginMode = "staff" | "patient";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameLabel = mode === "patient" ? "Email address" : "Username";
  const usernamePlaceholder = mode === "patient" ? "name@example.com" : "Enter your username";
  const usernameAutoComplete = mode === "patient" ? "email" : "username";

  function getAllowedNextPath(nextPath: string, role?: string | null, authType?: string | null) {
    if (!nextPath) return "";
    const normalizedAuthType = normalizeAuthType(authType, role);
    if (normalizedAuthType === "patient" && nextPath.startsWith("/portal")) return nextPath;
    if (normalizedAuthType === "admin" && !nextPath.startsWith("/portal")) return nextPath;
    return "";
  }

  useEffect(() => {
    const token = getStoredToken();
    const claims = token ? decodeSessionToken(token) : null;
    const storedUser = getStoredUser();
    const authUser = normalizeAuthUser({
      ...(claims || {}),
      ...(storedUser || {}),
      permissions: storedUser?.permissions && storedUser.permissions.length > 0 ? storedUser.permissions : claims?.permissions,
      services: storedUser?.services && Object.keys(storedUser.services).length > 0 ? storedUser.services : claims?.services,
    });

    if (!token || !claims || isTokenExpired(claims) || !authUser) {
      if (token || storedUser) {
        pushAuthDebug("login.invalid_existing_session", {
          tokenExists: Boolean(token),
          claimsFound: Boolean(claims),
          userFound: Boolean(storedUser),
        }, "warn");
        clearStoredSession();
      }
      return;
    }

    if (authUser.status !== "active") {
      pushAuthDebug("login.inactive_existing_session", {
        role: authUser.role || "",
        status: authUser.status || "",
        authType: authUser.authType || "",
      }, "warn");
      clearStoredSession();
      return;
    }

    const nextPath =
      typeof window === "undefined" ? "" : getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
    const redirectTarget =
      getAllowedNextPath(nextPath, authUser.role, authUser.authType) || getPortalPathForRole(authUser.role, authUser.authType);

    console.info("[auth]", "authenticated session found on login", {
      tokenExists: true,
      role: authUser.role || "",
      status: authUser.status || "",
      authType: authUser.authType || "",
      permissionsCount: authUser.permissions?.length || 0,
      redirectTarget,
    });
    pushAuthDebug("login.redirect_existing_session", {
      role: authUser.role || "",
      status: authUser.status || "",
      authType: authUser.authType || "",
      redirectTarget,
    });

    router.replace(redirectTarget);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          auth_type: mode === "patient" ? "patient" : "admin",
        }),
      });
      pushAuthDebug("login.fetch_completed", {
        mode,
        status: res.status,
        ok: res.ok,
      }, res.ok ? "info" : "warn");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || (data && data.data && data.data.message) || "Login failed");
      const payload = data.data || data;
      const token = payload.accessToken || payload.token;
      if (token) {
        pushAuthDebug("login.response_received", {
          mode,
          tokenExists: Boolean(token),
          hasUserPayload: Boolean(payload.user),
          hasAdminAccessToken: Boolean(payload.adminAccessToken),
        });
        storeAuthenticatedSession(token, payload.user || null, payload.adminAccessToken || null);
        const claims = decodeSessionToken(token);
        const storedUser = getStoredUser();
        const authUser = normalizeAuthUser({
          ...(claims || {}),
          ...(storedUser || {}),
          permissions: storedUser?.permissions && storedUser.permissions.length > 0 ? storedUser.permissions : claims?.permissions,
          services: storedUser?.services && Object.keys(storedUser.services).length > 0 ? storedUser.services : claims?.services,
        });
        const nextPath =
          typeof window === "undefined" ? "" : getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
        const redirectTarget =
          getAllowedNextPath(nextPath, authUser?.role, authUser?.authType) || getPortalPathForRole(authUser?.role, authUser?.authType);

        console.info("[auth]", "login session stored", {
          mode,
          tokenExists: Boolean(token),
          rawRole: (payload.user && typeof payload.user.role === "string" ? payload.user.role : "") || claims?.role || "",
          role: authUser?.role || "",
          status: authUser?.status || "",
          authType: authUser?.authType || "",
          permissionsCount: authUser?.permissions?.length || 0,
          redirectTarget,
        });
        pushAuthDebug("login.redirect_after_submit", {
          mode,
          rawRole: (payload.user && typeof payload.user.role === "string" ? payload.user.role : "") || claims?.role || "",
          role: authUser?.role || "",
          status: authUser?.status || "",
          authType: authUser?.authType || "",
          redirectTarget,
        });

        router.push(redirectTarget);
      } else {
        throw new Error("No token received");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An error occurred";
      pushAuthDebug("login.submit_failed", {
        mode,
        message,
      }, "error");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-enter flex min-h-screen items-center justify-center bg-white px-6 py-10 text-slate-900">
      <section className="w-full max-w-md space-y-8">
        <BrandMark align="center" />

        <div className="rounded-[16px] border border-[var(--border-soft)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.42em] text-[var(--accent-sage)]">
              Secure access
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-sm leading-7 text-slate-500">
              Sign in to review schedules, records, and care updates in one quiet place.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid grid-cols-2 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-1">
              <button
                type="button"
                onClick={() => setMode("staff")}
                className={`rounded-[9px] px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "staff"
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Care team
              </button>
              <button
                type="button"
                onClick={() => setMode("patient")}
                className={`rounded-[9px] px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "patient"
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Patient
              </button>
            </div>

            <AuthField
              id="username"
              label={usernameLabel}
              type={mode === "patient" ? "email" : "text"}
              placeholder={usernamePlaceholder}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete={usernameAutoComplete}
            />
            <AuthPasswordField
              id="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-end">
              <Link
                href="/"
                className="text-sm text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]"
              >
                Forgot password?
              </Link>
            </div>

            <AuthButton type="submit" className="w-full">
              {loading ? "Signing in..." : "Log in"}
            </AuthButton>

            {error ? <p className="mt-2 text-center text-sm text-[#EF4444]">{error}</p> : null}

            <p className="pt-2 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
