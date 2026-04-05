"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import { getAuthErrorDisplay, logAuthError } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/auth-validation";
import PageContainer from "@/components/PageContainer";
import AppButton from "@/components/AppButton";

const MIN_PASSWORD_LENGTH = 6;

const NOT_CONFIGURED_MESSAGE =
  "Add the environment variables shown above to .env.local and restart the dev server (npm run dev).";

export default function AccountPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailError("Please enter your email");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (trimmed.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      setEmailError("That is already your current email address.");
      return;
    }
    if (!supabase) {
      setEmailError(NOT_CONFIGURED_MESSAGE);
      return;
    }
    setEmailLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: `${window.location.origin}/account` }
      );
      if (err) {
        logAuthError("updateUser email", err);
        setEmailError(getAuthErrorDisplay(err).message);
        setEmailLoading(false);
        return;
      }
      setEmailSuccess(
        "If your project requires email confirmation, check your new inbox to verify the address. You may need to sign in again after verifying."
      );
      setNewEmail("");
      setEmailLoading(false);
    } catch (caught) {
      logAuthError("updateUser email catch", caught);
      setEmailError("Something went wrong. Please try again.");
      setEmailLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (!supabase) {
      setPasswordError(NOT_CONFIGURED_MESSAGE);
      return;
    }
    setPasswordLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) {
        logAuthError("updateUser password", err);
        setPasswordError(getAuthErrorDisplay(err).message);
        setPasswordLoading(false);
        return;
      }
      setPasswordSuccess("Your password has been updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordLoading(false);
    } catch (caught) {
      logAuthError("updateUser password catch", caught);
      setPasswordError("Something went wrong. Please try again.");
      setPasswordLoading(false);
    }
  }

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 py-6 text-white sm:py-8">
      <PageContainer maxWidthClass="max-w-2xl" className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your account details and security settings.
          </p>
        </header>

        {!supabase && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <SupabaseConfigHelp />
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Profile</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Email
              </dt>
              <dd className="mt-1 break-all text-zinc-200">
                {user?.email ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Login &amp; security</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Update the email or password you use to sign in.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => {
                setEmailPanelOpen((o) => !o);
                setPasswordPanelOpen(false);
                setEmailError(null);
                setEmailSuccess(null);
              }}
              className="w-full justify-start sm:w-auto"
            >
              Change email
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => {
                setPasswordPanelOpen((o) => !o);
                setEmailPanelOpen(false);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="w-full justify-start sm:w-auto"
            >
              Change password
            </AppButton>
          </div>

          {emailPanelOpen && (
            <form
              onSubmit={handleEmailSubmit}
              className="mt-6 space-y-4 border-t border-white/10 pt-6"
            >
              <h3 className="text-sm font-medium text-zinc-200">New email</h3>
              {emailError && (
                <div
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  role="alert"
                >
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div
                  className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
                  role="status"
                >
                  {emailSuccess}
                </div>
              )}
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-300">Email address</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                  disabled={emailLoading}
                  className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60"
                  placeholder="new@example.com"
                />
              </label>
              <button
                type="submit"
                disabled={emailLoading}
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {emailLoading ? "Updating email..." : "Update email"}
              </button>
            </form>
          )}

          {passwordPanelOpen && (
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-6 space-y-4 border-t border-white/10 pt-6"
            >
              <h3 className="text-sm font-medium text-zinc-200">New password</h3>
              {passwordError && (
                <div
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  role="alert"
                >
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div
                  className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
                  role="status"
                >
                  {passwordSuccess}
                </div>
              )}
              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                disabled={passwordLoading}
                minLength={MIN_PASSWORD_LENGTH}
              />
              <span className="block text-xs text-zinc-500">
                At least {MIN_PASSWORD_LENGTH} characters
              </span>
              <PasswordInput
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                disabled={passwordLoading}
                minLength={MIN_PASSWORD_LENGTH}
              />
              <AppButton type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
                {passwordLoading ? "Updating password..." : "Update password"}
              </AppButton>
            </form>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-zinc-200 touch-manipulation hover:border-sky-400/60 hover:text-sky-300 sm:min-h-0"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Arden24 is a product of Arden Ventures Ltd. For journaling, discipline and self-review
          only. Not financial advice.
        </p>
      </PageContainer>
    </main>
  );
}
