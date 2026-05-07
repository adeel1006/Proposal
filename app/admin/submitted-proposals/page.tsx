'use client';

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { ProposalTableSkeleton } from '@/app/components/LoadingSkeletons';

const PROPOSALS_CACHE_TTL_MS = 60 * 1000;

type ProposalItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity?: number;
  currency?: string;
};

type ProposalAttachment = {
  id: string;
  label: string;
  url: string;
};

type SubmittedProposal = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone_number?: string | null;
  project_title: string;
  project_description?: string | null;
  total: number;
  status: string;
  submitted_at: string;
  proposal_date?: string | null;
  response_at?: string | null;
  notes?: string | null;
  attachments?: ProposalAttachment[];
  payment_link?: string | null;
  selected_items?: string[];
  items?: ProposalItem[];
  company?: {
    businessName?: string;
    email?: string;
    mobileNumber?: string;
    address?: string;
    website?: string;
    currency?: string;
  } | null;
};

let proposalsCache: SubmittedProposal[] | null = null;
let proposalsCacheAt = 0;
let proposalsInFlight: Promise<SubmittedProposal[]> | null = null;

async function requestSubmittedProposals(): Promise<SubmittedProposal[]> {
  const response = await fetch('/api/proposals');
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load submitted proposals');
  }

  return Array.isArray(result.data) ? result.data : [];
}

function normalizeStatus(status: string) {
  if (status === 'approved' || status === 'accepted') return 'accepted';
  if (status === 'declined' || status === 'rejected') return 'rejected';
  if (status === 'pending payment') return 'pending payment';
  if (status === 'payment successful') return 'payment successful';
  return status || 'submitted';
}

function statusBadgeClass(status: string) {
  if (status === 'accepted' || status === 'payment successful') return 'bg-green-100 text-green-800 border border-green-300';
  if (status === 'pending payment') return 'bg-amber-100 text-amber-800 border border-amber-300';
  if (status === 'rejected') return 'bg-red-100 text-red-800 border border-red-300';
  return 'bg-slate-100 text-slate-800 border border-slate-300';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function SubmittedProposalsPage() {
  const [proposals, setProposals] = useState<SubmittedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<SubmittedProposal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const STATUS_OPTIONS = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending payment', label: 'Pending Payment' },
    { value: 'payment successful', label: 'Payment Successful' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const handleChangeProposalStatus = async (proposalId: string, newStatus: string) => {
    if (!proposalId || !newStatus) return;

    try {
      setError('');

      const response = await fetch('/api/proposals/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposalId, status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update status');
      }

      setProposals((prev) => {
        const updated = prev.map((proposal) =>
          proposal.id === proposalId ? { ...proposal, status: newStatus } : proposal
        );
        proposalsCache = updated;
        proposalsCacheAt = Date.now();
        return updated;
      });

      if (selectedProposal?.id === proposalId) {
        setSelectedProposal({ ...selectedProposal, status: newStatus });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleToggleStatusMenu = (event: ReactMouseEvent<HTMLButtonElement>, proposalId: string) => {
    event.stopPropagation();
    setOpenStatusMenuId((current) => (current === proposalId ? null : proposalId));
  };

  const handleSelectStatus = async (proposalId: string, newStatus: string) => {
    setOpenStatusMenuId(null);
    await handleChangeProposalStatus(proposalId, newStatus);
  };

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (openStatusMenuId && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setOpenStatusMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusMenuId]);

  useEffect(() => {
    const loadProposals = async () => {
      try {
        setError('');
        const hasFreshCache =
          proposalsCache &&
          Date.now() - proposalsCacheAt < PROPOSALS_CACHE_TTL_MS;

        if (hasFreshCache) {
          setProposals(proposalsCache || []);
          setLoading(false);
          return;
        }

        setLoading(!proposalsCache);
        if (!proposalsInFlight) {
          proposalsInFlight = requestSubmittedProposals();
        }

        const data = await proposalsInFlight;
        proposalsCache = data;
        proposalsCacheAt = Date.now();
        setProposals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submitted proposals');
      } finally {
        proposalsInFlight = null;
        setLoading(false);
      }
    };

    loadProposals();
  }, []);

  const handleDeleteProposal = async (proposalId: string) => {
    const confirmed = window.confirm('Delete this submitted proposal? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(proposalId);
      const response = await fetch(`/api/proposals?id=${proposalId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to delete proposal');
      }

      setProposals((prev) => {
        const updated = prev.filter((proposal) => proposal.id !== proposalId);
        proposalsCache = updated;
        proposalsCacheAt = Date.now();
        return updated;
      });
      setSelectedProposal((prev) => (prev?.id === proposalId ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete proposal');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResendProposal = async (proposal: SubmittedProposal) => {
    const confirmed = window.confirm('Resend this proposal to the client?');
    if (!confirmed) {
      return;
    }

    const paymentLink = window.prompt(
      'Payment URL for this proposal:',
      proposal.payment_link || ''
    );

    if (paymentLink === null) {
      return;
    }

    const trimmedPaymentLink = paymentLink.trim();
    if (!trimmedPaymentLink) {
      setError('Payment URL is required before resending the proposal.');
      return;
    }

    try {
      setResendingId(proposal.id);

      const response = await fetch('/api/proposals/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId: proposal.id,
          paymentLink: trimmedPaymentLink,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to resend proposal');
      }

      setProposals((prev) => {
        const updated = prev.map((item) =>
          item.id === proposal.id ? { ...item, payment_link: trimmedPaymentLink } : item
        );
        proposalsCache = updated;
        proposalsCacheAt = Date.now();
        return updated;
      });
      setSelectedProposal((prev) =>
        prev?.id === proposal.id ? { ...prev, payment_link: trimmedPaymentLink } : prev
      );
      alert('Proposal resent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend proposal');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submitted Proposals</h1>
            <p className="text-gray-600">Proposals list with status: submitted, pending payment, payment successful, accepted, rejected.</p>
          </div>
          <Link
            href="/admin/proposals"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Back to Admin
          </Link>
        </div>

        {loading && (
          <ProposalTableSkeleton />
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && proposals.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            No submitted proposals found.
          </div>
        )}

        {!loading && !error && proposals.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-gray-700">
                  <th className="px-4 py-3 font-semibold">Proposal ID</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted At</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => {
                  const status = normalizeStatus(proposal.status);
                  return (
                    <tr
                      key={proposal.id}
                      className="cursor-pointer border-b border-gray-100 text-gray-800 hover:bg-slate-50"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{proposal.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{proposal.client_name}</div>
                        <div className="text-xs text-gray-500">{proposal.client_email || '-'}</div>
                      </td>
                      <td className="px-4 py-3">{proposal.company?.businessName || '-'}</td>
                      <td className="px-4 py-3">{proposal.project_title}</td>
                      <td className="px-4 py-3">{Number(proposal.total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition duration-200 ${statusBadgeClass(status)} ${openStatusMenuId === proposal.id ? 'ring-2 ring-slate-300 shadow-sm' : 'hover:shadow-sm'}`}
                            onClick={(event) => handleToggleStatusMenu(event, proposal.id)}
                          >
                            {status}
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                              ▾
                            </span>
                          </button>

                          {openStatusMenuId === proposal.id && (
                            <div
                              ref={statusMenuRef}
                              className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm shadow-2xl ring-1 ring-slate-900/5"
                            >
                              <div className="space-y-1 p-2">
                                {STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleSelectStatus(proposal.id, option.value);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${proposal.status === option.value ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    <span>{option.label}</span>
                                    {proposal.status === option.value && (
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px]">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                                Click a status to update the proposal instantly.
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatDate(proposal.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleResendProposal(proposal);
                            }}
                            disabled={resendingId === proposal.id}
                            className={`rounded px-3 py-1.5 text-xs font-medium !text-white ${
                              resendingId === proposal.id
                                ? 'cursor-not-allowed bg-slate-300'
                                : 'bg-slate-900 hover:bg-slate-700'
                            }`}
                          >
                            {resendingId === proposal.id ? 'Resending...' : 'Resend'}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteProposal(proposal.id);
                            }}
                            disabled={deletingId === proposal.id}
                            className={`rounded px-3 py-1.5 text-xs font-medium !text-white ${
                              deletingId === proposal.id
                                ? 'cursor-not-allowed bg-red-300'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {deletingId === proposal.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Proposal Details</h2>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-6 p-6 text-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Proposal ID</div>
                  <div className="mt-1 font-mono text-xs">{selectedProposal.id}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(normalizeStatus(selectedProposal.status))}`}
                    >
                      {normalizeStatus(selectedProposal.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
                  <div className="mt-1 font-semibold">{Number(selectedProposal.total || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-900">Client</h3>
                  <p>{selectedProposal.client_name}</p>
                  <p className="text-gray-600">{selectedProposal.client_email || '-'}</p>
                  <p className="text-gray-600">{selectedProposal.client_phone_number || '-'}</p>
                </div>
                <div className="rounded border border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-900">Company</h3>
                  <p>{selectedProposal.company?.businessName || '-'}</p>
                  <p className="text-gray-600">{selectedProposal.company?.email || '-'}</p>
                  <p className="text-gray-600">{selectedProposal.company?.mobileNumber || '-'}</p>
                  <p className="text-gray-600">{selectedProposal.company?.website || '-'}</p>
                </div>
              </div>

              <div className="rounded border border-gray-200 p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Project</h3>
                <p className="font-medium">{selectedProposal.project_title}</p>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">
                  {selectedProposal.project_description || '-'}
                </p>
              </div>

              <div className="rounded border border-gray-200 p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Services</h3>
                {(selectedProposal.items || []).length === 0 ? (
                  <p className="text-gray-600">No services stored.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-2 py-2">Name</th>
                          <th className="px-2 py-2">Qty</th>
                          <th className="px-2 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedProposal.items || []).map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="px-2 py-2">{item.name}</td>
                            <td className="px-2 py-2">{item.quantity || 1}</td>
                            <td className="px-2 py-2 text-right">
                              {(item.currency || selectedProposal.company?.currency || 'USD')} {Number(item.price || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded border border-gray-200 p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Attachments</h3>
                {(selectedProposal.attachments || []).length === 0 ? (
                  <p className="text-gray-600">No attachments stored.</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedProposal.attachments || []).map((attachment) => (
                      <div key={attachment.id} className="rounded border border-gray-100 bg-gray-50 p-3">
                        <p className="font-medium text-gray-900">{attachment.label}</p>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-blue-600 hover:underline"
                        >
                          {attachment.url}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Proposal Date</div>
                  <div className="mt-1">{formatDate(selectedProposal.proposal_date)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Submitted At</div>
                  <div className="mt-1">{formatDate(selectedProposal.submitted_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Response At</div>
                  <div className="mt-1">{formatDate(selectedProposal.response_at)}</div>
                </div>
              </div>

              <div className="rounded border border-gray-200 p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Notes</h3>
                <p className="whitespace-pre-wrap text-gray-700">{selectedProposal.notes || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
