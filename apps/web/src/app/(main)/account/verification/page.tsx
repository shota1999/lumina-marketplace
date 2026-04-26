'use client';

import { Clock, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Input, Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface VerificationStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  documentType: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function VerificationPage() {
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState('passport');
  const [documentUrl, setDocumentUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  useEffect(() => {
    fetch('/api/verification/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.data) {
          setVerification(data.data);
        } else {
          setShowForm(true);
        }
      })
      .catch(() => {
        setShowForm(true);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, documentUrl, selfieUrl: selfieUrl || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Submission failed',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      setVerification({ ...data.data, status: 'pending' });
      setShowForm(false);
      toast({ title: 'Documents submitted', description: 'Your verification is under review' });
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not submit verification',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-xl py-8">
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="mb-8 h-5 w-72" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  // Show form state (no verification or resubmit)
  if (showForm || !verification) {
    return (
      <div className="container max-w-xl py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <ShieldCheck className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </div>

          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            Verify Your Identity
          </h1>
          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
            Identity verification helps build trust between hosts and guests on our platform.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Document Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>

            {/* Document URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Document URL
              </label>
              <Input
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://example.com/document.jpg"
                required
                type="url"
              />
              <p className="text-xs text-slate-400">Upload your document and paste the URL here</p>
            </div>

            {/* Selfie URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Selfie URL <span className="text-slate-400">(optional)</span>
              </label>
              <Input
                value={selfieUrl}
                onChange={(e) => setSelfieUrl(e.target.value)}
                placeholder="https://example.com/selfie.jpg"
                type="url"
              />
              <p className="text-xs text-slate-400">
                A selfie helps us verify your identity faster
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit for Verification
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Pending state
  if (verification.status === 'pending') {
    return (
      <div className="container max-w-xl py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            Verification Under Review
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We&apos;re reviewing your documents. This usually takes 1-2 business days. You&apos;ll
            receive a notification once the review is complete.
          </p>
          <div className="mt-6 rounded-lg bg-white/60 p-4 dark:bg-slate-900/40">
            <p className="text-xs font-medium text-slate-500">
              Submitted{' '}
              {new Date(verification.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="mt-1 text-xs capitalize text-slate-400">
              Document: {verification.documentType.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Approved state
  if (verification.status === 'approved') {
    return (
      <div className="container max-w-xl py-8">
        <div className="rounded-2xl border border-green-200 bg-green-50/50 p-8 dark:border-green-900/50 dark:bg-green-950/20">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
            <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            Identity Verified
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your identity has been successfully verified. This badge is now visible on your profile.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <ShieldCheck className="h-4 w-4" />
            Verified
          </div>
        </div>
      </div>
    );
  }

  // Rejected state
  return (
    <div className="container max-w-xl py-8">
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Verification Rejected
        </h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Unfortunately, we were unable to verify your identity with the documents provided.
        </p>
        {verification.adminNotes && (
          <div className="mb-6 rounded-lg bg-white/60 p-4 dark:bg-slate-900/40">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Reviewer Notes
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{verification.adminNotes}</p>
          </div>
        )}
        <Button
          onClick={() => {
            setVerification(null);
            setShowForm(true);
            setDocumentUrl('');
            setSelfieUrl('');
          }}
        >
          Resubmit Verification
        </Button>
      </div>
    </div>
  );
}
