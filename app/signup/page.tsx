"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthButton, AuthField, BrandMark, PasswordStrength } from "../components/clinic-ui";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

type TouchedState = {
  fullName: boolean;
  email: boolean;
  phone: boolean;
  password: boolean;
  confirmPassword: boolean;
  terms: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\s-]{7,}$/;

function getPasswordScore(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

function getPasswordLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Strong";
  return "Very strong";
}

export default function SignUpPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [touched, setTouched] = useState<TouchedState>({
    fullName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
    terms: false,
  });

  const passwordScore = getPasswordScore(form.password);
  const passwordLabel = getPasswordLabel(passwordScore);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors = {
    fullName:
      touched.fullName && form.fullName.trim().length < 2
        ? "Please enter your full name."
        : undefined,
    email:
      touched.email && !emailPattern.test(form.email.trim())
        ? "Enter a valid email address."
        : undefined,
    phone:
      touched.phone && !phonePattern.test(form.phone.trim())
        ? "Enter a valid phone number."
        : undefined,
    password:
      touched.password && passwordScore < 3
        ? "Use at least 8 characters with letters, numbers, and a symbol."
        : undefined,
    confirmPassword:
      touched.confirmPassword && form.confirmPassword !== form.password
        ? "Passwords do not match."
        : undefined,
    terms:
      touched.terms && !form.terms
        ? "Please agree to continue."
        : undefined,
  };

  const valid = {
    fullName: form.fullName.trim().length >= 2,
    email: emailPattern.test(form.email.trim()),
    phone: phonePattern.test(form.phone.trim()),
    password: passwordScore >= 3,
    confirmPassword: form.confirmPassword.length > 0 && form.confirmPassword === form.password,
    terms: form.terms,
  };

  function markTouched(name: keyof TouchedState) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });
    if (!valid.fullName || !valid.email || !valid.password || !valid.confirmPassword || !valid.terms) return;

    (async () => {
      setError(null);
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || (data && data.data && data.data.message) || "Registration failed");
        const token = data.token || (data.data && data.data.token);
        if (token) {
          localStorage.setItem("pms_token", token);
          (window as any).location.href = "/dashboard";
        } else {
          throw new Error("No token received");
        }
      } catch (e: any) {
        setError(e.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <main className="page-enter flex min-h-screen items-center justify-center bg-white px-6 py-10 text-slate-900">
      <section className="w-full max-w-[30rem] space-y-8">
        <BrandMark align="center" />

        <div className="rounded-[16px] border border-[var(--border-soft)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.42em] text-[var(--accent-sage)]">
              Patient registration
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create your account</h1>
            <p className="text-sm leading-7 text-slate-500">
              Start with a quiet, secure profile that keeps future visits and records easy to manage.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <AuthField
              id="full-name"
              label="Full name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              onBlur={() => markTouched("fullName")}
              valid={touched.fullName && valid.fullName}
              error={errors.fullName}
              autoComplete="name"
            />

            <AuthField
              id="email"
              label="Email address"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              onBlur={() => markTouched("email")}
              valid={touched.email && valid.email}
              error={errors.email}
              autoComplete="email"
            />

            <AuthField
              id="phone"
              label="Phone number"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              onBlur={() => markTouched("phone")}
              valid={touched.phone && valid.phone}
              error={errors.phone}
              autoComplete="tel"
            />

            <div className="space-y-3">
              <AuthField
                id="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                onBlur={() => markTouched("password")}
                valid={touched.password && valid.password}
                error={errors.password}
                autoComplete="new-password"
              />
              <PasswordStrength score={passwordScore} label={passwordLabel} />
            </div>

            <AuthField
              id="confirm-password"
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              onBlur={() => markTouched("confirmPassword")}
              valid={touched.confirmPassword && valid.confirmPassword}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, terms: event.target.checked }))
                  }
                  onBlur={() => markTouched("terms")}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-[var(--accent-sage)]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/" className="text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/" className="text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.terms ? <p className="text-sm text-[#EF4444]">{errors.terms}</p> : null}
            </div>

            <AuthButton type="submit" className="w-full">
              {loading ? 'Creating…' : 'Create account'}
            </AuthButton>

            {error ? <p className="mt-2 text-sm text-[#EF4444] text-center">{error}</p> : null}

            <p className="pt-2 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[var(--accent-sage)] transition-colors hover:text-[var(--accent-blue)]"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}