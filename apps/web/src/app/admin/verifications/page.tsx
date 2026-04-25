'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface Verification {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  documentType: string;
  documentUrl: string;
  selfieUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/verifications')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setVerifications(data.data ?? []);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load verifications', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleReview = useCallback(async (id: string, status: 'approved' | 'rejected', notes: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: notes || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({ title: 'Review failed', description: data.error?.message ?? 'Something went wrong', variant: 'destructive' });
        return;
      }

      setVerifications((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status, adminNotes: notes || null } : v)),
      );
      setActionId(null);
      setActionType(null);
      setAdminNotes('');
      toast({ title: `Verification ${status}`, description: `The verification has been ${status}` });
    } catch {
      toast({ title: 'Network error', description: 'Could not submit review', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Identity Verifications
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and manage user identity verification requests
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          {verifications.filter((v) => v.status === 'pending').length} pending
        </div>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  User
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Document Type
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Submitted
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/30 dark:bg-slate-900/30">
              {verifications.map((v) => (
                <>
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-white/60 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {v.userName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{v.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {v.documentType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(v.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusStyles[v.status] ?? ''}`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                          className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-50"
                        >
                          {expandedId === v.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setActionId(v.id);
                                setActionType('approved');
                                setAdminNotes('');
                              }}
                              className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            >
                              <CheckCircle2 className="mr-1 inline h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActionId(v.id);
                                setActionType('rejected');
                                setAdminNotes('');
                              }}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            >
                              <XCircle className="mr-1 inline h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {expandedId === v.id && (
                    <tr key={`${v.id}-detail`}>
                      <td colSpan={5} className="bg-white/50 px-8 py-4 dark:bg-slate-900/50">
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                              Document
                            </span>
                            <a
                              href={v.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              View document <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          {v.selfieUrl && (
                            <div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Selfie
                              </span>
                              <a
                                href={v.selfieUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                              >
                                View selfie <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {v.adminNotes && (
                            <div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Admin Notes
                              </span>
                              <p className="mt-1 text-slate-600 dark:text-slate-300">{v.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Action modal row */}
                  {actionId === v.id && actionType && (
                    <tr key={`${v.id}-action`}>
                      <td colSpan={5} className="bg-white/70 px-8 py-4 dark:bg-slate-900/70">
                        <div className="max-w-md space-y-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {actionType === 'approved' ? 'Approve' : 'Reject'} verification for{' '}
                            {v.userName}
                          </p>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Admin notes (optional)..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(v.id, actionType, adminNotes)}
                              disabled={submitting}
                              className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${
                                actionType === 'approved'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              {submitting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                              Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
                            </button>
                            <button
                              onClick={() => {
                                setActionId(null);
                                setActionType(null);
                                setAdminNotes('');
                              }}
                              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {verifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-sm text-slate-400">
                    No verification requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
