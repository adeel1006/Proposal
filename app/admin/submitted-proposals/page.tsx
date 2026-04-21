'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ProposalItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity?: number;
  currency?: string;
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

function normalizeStatus(status: string) {
  if (status === 'approved') return 'accepted';
  if (status === 'declined') return 'rejected';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'submitted';
}

function statusBadgeClass(status: string) {
  if (status === 'accepted') return 'bg-green-100 text-green-800 border border-green-300';
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

  useEffect(() => {
    const loadProposals = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/proposals', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load submitted proposals');
        }

        setProposals(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submitted proposals');
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submitted Proposals</h1>
            <p className="text-gray-600">Database-backed list with live status: accepted, rejected, submitted.</p>
          </div>
          <Link
            href="/admin/proposals"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Admin
          </Link>
        </div>

        {loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            Loading submitted proposals...
          </div>
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
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(proposal.submitted_at)}</td>
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
                  <div className="mt-1">{normalizeStatus(selectedProposal.status)}</div>
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
