"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthButton, AuthField, AuthPasswordField, BrandMark, PasswordStrength } from "../components/clinic-ui";
import SharedDatePicker from "../components/SharedDatePicker";
import { decodeSessionToken, getPortalPathForRole, storeSessionToken } from "../../lib/session";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

type TouchedState = {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  contactNumber: boolean;
  dateOfBirth: boolean;
  gender: boolean;
  address: boolean;
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
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [touched, setTouched] = useState<TouchedState>({
    firstName: false,
    lastName: false,
    email: false,
    contactNumber: false,
    dateOfBirth: false,
    gender: false,
    address: false,
    password: false,
    confirmPassword: false,
    terms: false,
  });

  const passwordScore = getPasswordScore(form.password);
  const passwordLabel = getPasswordLabel(passwordScore);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors = {
    firstName:
      touched.firstName && form.firstName.trim().length < 2
        ? "Please enter your first name."
        : undefined,
    lastName:
      touched.lastName && form.lastName.trim().length < 2
        ? "Please enter your last name."
        : undefined,
    email:
      touched.email && !emailPattern.test(form.email.trim())
        ? "Enter a valid email address."
        : undefined,
    contactNumber:
      touched.contactNumber && !phonePattern.test(form.contactNumber.trim())
        ? "Enter a valid phone number."
        : undefined,
    dateOfBirth:
      touched.dateOfBirth && !form.dateOfBirth
        ? "Please enter your date of birth."
        : undefined,
    gender:
      touched.gender && !form.gender
        ? "Please select a gender."
        : undefined,
    address:
      touched.address && form.address.trim().length < 5
        ? "Please enter your address."
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
    firstName: form.firstName.trim().length >= 2,
    lastName: form.lastName.trim().length >= 2,
    email: emailPattern.test(form.email.trim()),
    contactNumber: phonePattern.test(form.contactNumber.trim()),
    dateOfBirth: Boolean(form.dateOfBirth),
    gender: Boolean(form.gender),
    address: form.address.trim().length >= 5,
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
      firstName: true,
      lastName: true,
      email: true,
      contactNumber: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });
    if (!valid.firstName || !valid.lastName || !valid.email || !valid.contactNumber || !valid.dateOfBirth || !valid.gender || !valid.address || !valid.password || !valid.confirmPassword || !valid.terms) return;

    (async () => {
      setError(null);
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
            first_name: form.firstName,
            last_name: form.lastName,
            date_of_birth: form.dateOfBirth,
            gender: form.gender,
            contact_number: form.contactNumber,
            address: form.address,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || (data && data.data && data.data.message) || "Registration failed");
        const token = data.token || (data.data && data.data.token);
        if (token) {
          storeSessionToken(token);
          const claims = decodeSessionToken(token);
          window.location.href = getPortalPathForRole(claims?.role);
        } else {
          throw new Error("No token received");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred");
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
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                id="first-name"
                label="First name"
                placeholder="Enter your first name"
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                onBlur={() => markTouched("firstName")}
                valid={touched.firstName && valid.firstName}
                error={errors.firstName}
                autoComplete="given-name"
              />

              <AuthField
                id="last-name"
                label="Last name"
                placeholder="Enter your last name"
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                onBlur={() => markTouched("lastName")}
                valid={touched.lastName && valid.lastName}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>

            <AuthField
              id="email"
              label="Email address"
              type="email"
              placeholder="name@example.com"
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
              placeholder="09123456789"
              value={form.contactNumber}
              onChange={(event) => setForm((current) => ({ ...current, contactNumber: event.target.value }))}
              onBlur={() => markTouched("contactNumber")}
              valid={touched.contactNumber && valid.contactNumber}
              error={errors.contactNumber}
              autoComplete="tel"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="date-of-birth">
                  Date of birth
                </label>
                <SharedDatePicker
                  ariaLabel="Date of birth"
                  value={form.dateOfBirth}
                  onChange={(dateOfBirth) => setForm((current) => ({ ...current, dateOfBirth }))}
                  onBlur={() => markTouched("dateOfBirth")}
                  error={Boolean(errors.dateOfBirth)}
                  variant="auth"
                />
                {errors.dateOfBirth ? <p className="text-sm text-[#EF4444]">{errors.dateOfBirth}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gender</label>
                <select
                  value={form.gender}
                  onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                  onBlur={() => markTouched("gender")}
                  className="h-11 w-full rounded-[12px] border border-[var(--border-soft)] bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[var(--accent-sage)]"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender ? <p className="text-sm text-[#EF4444]">{errors.gender}</p> : null}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Address</label>
              <textarea
                placeholder="Enter your address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                onBlur={() => markTouched("address")}
                rows={3}
                className="mt-2 w-full rounded-[12px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-[var(--accent-sage)]"
              />
              {errors.address ? <p className="mt-2 text-sm text-[#EF4444]">{errors.address}</p> : null}
            </div>

            <div className="space-y-3">
              <AuthPasswordField
                id="password"
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                onBlur={() => markTouched("password")}
                valid={touched.password && valid.password}
                error={errors.password}
                autoComplete="new-password"
              />
              <PasswordStrength score={passwordScore} label={passwordLabel} />
            </div>

            <AuthPasswordField
              id="confirm-password"
              label="Confirm password"
              placeholder="Confirm your password"
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
              {loading ? "Creating..." : "Create account"}
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
