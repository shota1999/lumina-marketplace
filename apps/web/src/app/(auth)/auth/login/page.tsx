'use client';

import { Eye, EyeOff, Lock, LogIn, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { loginSchema } from '@lumina/shared';

import { toast } from '@/hooks/use-toast';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') {
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!data.success) {
        const msg = data.error?.message ?? 'Login failed';
        setError(msg);
        toast({ title: 'Login failed', description: msg, variant: 'destructive' });
        return;
      }

      toast({ title: 'Welcome back!', description: 'You have been signed in successfully' });
      router.push('/');
      router.refresh();
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
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h2>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Sign in to your Lumina account to manage your curated rentals and experiences.
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
                htmlFor="email"
                className="ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                aria-invalid={!!fieldErrors.email}
                className={`w-full rounded-lg border-none bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 ${
                  fieldErrors.email
                    ? 'ring-2 ring-red-500/30 focus:ring-red-500/40'
                    : 'focus:ring-slate-900/10 dark:focus:ring-slate-50/10'
                }`}
              />
              {fieldErrors.email && (
                <p className="ml-1 text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-slate-900 transition-colors hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-6 py-4 font-semibold text-white shadow-lg shadow-slate-900/10 transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-50/10 dark:hover:bg-slate-200"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 border-t border-slate-100 pt-8 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?
              <Link
                href="/auth/register"
                className="ml-1 font-bold text-slate-900 decoration-2 underline-offset-4 transition-all hover:underline dark:text-slate-50"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="mt-8 space-y-4 text-center">
        <div className="flex items-center justify-center gap-6">
          <Shield className="h-5 w-5 text-slate-300 dark:text-slate-600" />
          <Lock className="h-5 w-5 text-slate-300 dark:text-slate-600" />
          <svg
            className="h-5 w-5 text-slate-300 dark:text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Secure Bank-Level Encryption
        </p>
      </div>
    </div>
  );
}
