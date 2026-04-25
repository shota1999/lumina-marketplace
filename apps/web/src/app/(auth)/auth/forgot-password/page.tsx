'use client';

import { ArrowLeft, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { toast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setSent(true);
        if (data.data?.devResetUrl) {
          setDevResetUrl(data.data.devResetUrl);
        }
        toast({ title: 'Check your email', description: 'If that email is registered, a reset link has been sent.' });
      } else {
        toast({ title: 'Error', description: data.error?.message ?? 'Something went wrong', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Branding */}
      <div className="mb-12 text-center">
        <Link href="/" className="mb-2 inline-block text-3xl font-bold tracking-tighter text-slate-900 dark:text-slate-50">
          Lumina
        </Link>
        <p className="font-medium tracking-tight text-slate-500 dark:text-slate-400">
          Premium Rental Marketplace
        </p>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl bg-white shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:bg-slate-900">
        <div className="p-8 md:p-10">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Check your email
              </h2>
              <p className="mb-8 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                If <strong className="text-slate-700 dark:text-slate-300">{email}</strong> is registered, you&apos;ll receive a reset link shortly. Check your spam folder if you don&apos;t see it.
              </p>
              {devResetUrl && (
                <div className="mb-8 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-left text-xs leading-relaxed dark:border-amber-700/50 dark:bg-amber-950/20">
                  <p className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Demo mode — email delivery disabled
                  </p>
                  <p className="mb-2 text-amber-900/80 dark:text-amber-200/80">
                    This is a portfolio demo, so we&apos;re skipping the email. Click the link below to continue the reset flow:
                  </p>
                  <Link
                    href={devResetUrl.replace(/^https?:\/\/[^/]+/, '')}
                    className="block break-all rounded bg-white px-3 py-2 font-mono text-[11px] text-slate-700 underline decoration-slate-300 hover:decoration-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {devResetUrl}
                  </Link>
                </div>
              )}
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                  Reset your password
                </h2>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    required
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-lg border-none bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-slate-50/10"
                  />
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send reset link
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
          )}
        </div>
      </div>
    </div>
  );
}
