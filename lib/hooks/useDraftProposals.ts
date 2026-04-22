import { useState, useCallback, useEffect } from 'react';
import { Proposal } from '@/app/lib/proposalTypes';

type DraftProposal = Proposal & {
  createdAt?: string;
  updatedAt?: string;
};

export function useDraftProposals() {
  const [drafts, setDrafts] = useState<DraftProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all draft proposals
  const fetchDrafts = useCallback(async (status = 'draft') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/draft-proposals?status=${status}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch drafts');
      }
      
      setDrafts(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save draft (create or update)
  const saveDraft = useCallback(async (proposal: Proposal & { status?: string }) => {
    setError(null);
    try {
      const response = await fetch('/api/draft-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save draft');
      }
      
      // Update or add to local state
      setDrafts((prev) => {
        const exists = prev.find((d) => d.id === proposal.id);
        if (exists) {
          return prev.map((d) => (d.id === proposal.id ? result.data : d));
        } else {
          return [result.data, ...prev];
        }
      });
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to save draft:', err);
      throw err;
    }
  }, []);

  // Update specific fields of a draft
  const updateDraftField = useCallback(async (id: string, updates: Partial<Proposal>) => {
    setError(null);
    try {
      const response = await fetch('/api/draft-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update draft');
      }
      
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? result.data : d))
      );
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to update draft:', err);
      throw err;
    }
  }, []);

  // Delete draft
  const deleteDraft = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/draft-proposals?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete draft');
      }
      
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to delete draft:', err);
      throw err;
    }
  }, []);

  // Load drafts on mount
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    loading,
    error,
    fetchDrafts,
    saveDraft,
    updateDraftField,
    deleteDraft,
  };
}
