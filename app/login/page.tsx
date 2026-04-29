"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthButton, AuthField, BrandMark } from "../components/clinic-ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || (data && data.data && data.data.message) || "Login failed");
      const token = data.token || (data.data && data.data.token);
      if (token) {
        localStorage.setItem("pms_token", token);
        console.log("Token stored successfully in localStorage");
        router.push("/dashboard");
      } else {
        console.error("No token in response:", data);
        throw new Error("No token received");
      }
    } catch (e: any) {
      console.error("Login error:", e);
      setError(e.message || "An error occurred");
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
            <AuthField id="email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            <AuthField id="password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />

            <div className="flex items-center justify-end">
              <Link
                href="/"
                className="text-sm text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]"
              >
                Forgot password?
              </Link>
            </div>

            <AuthButton type="submit" className="w-full">
              {loading ? 'Signing in…' : 'Log in'}
            </AuthButton>

            {error ? <p className="mt-2 text-sm text-[#EF4444] text-center">{error}</p> : null}

            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.32em] text-slate-400">
              <span className="h-px flex-1 bg-[var(--border-soft)]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[var(--border-soft)]" />
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--border-soft)] bg-white text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-blue)] hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Continue with SSO
            </button>

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