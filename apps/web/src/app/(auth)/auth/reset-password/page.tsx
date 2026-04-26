'use client';

import { ArrowLeft, Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { resetPasswordSchema } from '@lumina/shared';

import { toast } from '@/hooks/use-toast';

type FieldErrors = Partial<Record<'password' | 'confirmPassword' | 'token', string>>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Invalid reset link
        </h2>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          This link is missing or malformed. Please request a new password reset.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Request new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({
      token: token ?? '',
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'password' || key === 'confirmPassword' || key === 'token') {
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: parsed.data.token, password: parsed.data.password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast({
          title: 'Password reset!',
          description: 'You can now sign in with your new password.',
        });
      } else {
        const msg = data.error?.message ?? 'Something went wrong';
        setError(msg);
        toast({ title: 'Reset failed', description: msg, variant: 'destructive' });
      }
    } catch {
      setError('Something went wrong. Please try again.');
      toast({
        title: 'Something went wrong',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Password reset
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
          Choose a new password
        </h2>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Enter your new password below. Must be at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              aria-invalid={!!fieldErrors.password}
              className={`w-full rounded-lg border-none bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 ${
                fieldErrors.password
                  ? 'ring-2 ring-red-500/30 focus:ring-red-500/40'
                  : 'focus:ring-slate-900/10 dark:focus:ring-slate-50/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-50"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="ml-1 text-xs text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.confirmPassword}
            className={`w-full rounded-lg border-none bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 ${
              fieldErrors.confirmPassword
                ? 'ring-2 ring-red-500/30 focus:ring-red-500/40'
                : 'focus:ring-slate-900/10 dark:focus:ring-slate-50/10'
            }`}
          />
          {fieldErrors.confirmPassword && (
            <p className="ml-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-6 py-4 font-semibold text-white shadow-lg shadow-slate-900/10 transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-50/10 dark:hover:bg-slate-200"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Reset password
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 flex justify-center border-t border-slate-100 pt-8 dark:border-slate-800">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      {/* Branding */}
      <div className="mb-12 text-center">
        <Link
          href="/"
          className="mb-2 inline-block text-3xl font-bold tracking-tighter text-slate-900 dark:text-slate-50"
        >
          Lumina
        </Link>
        <p className="font-medium tracking-tight text-slate-500 dark:text-slate-400">
          Premium Rental Marketplace
        </p>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl bg-white shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:bg-slate-900">
        <div className="p-8 md:p-10">
          <Suspense
            fallback={<div className="py-12 text-center text-sm text-slate-400">Loading...</div>}
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
