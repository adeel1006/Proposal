import { useState, useCallback, useEffect } from 'react';
import { CompanyBranding } from '@/app/lib/proposalTypes';

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyBranding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies from API
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/companies');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch companies');
      }
      
      setCompanies(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new company
  const createCompany = useCallback(async (company: Omit<CompanyBranding, 'id'> & { id?: string }) => {
    setError(null);
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create company');
      }
      
      setCompanies((prev) => [result.data, ...prev]);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to create company:', err);
      throw err;
    }
  }, []);

  // Update company
  const updateCompany = useCallback(async (company: CompanyBranding) => {
    setError(null);
    try {
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update company');
      }
      
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? result.data : c))
      );
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to update company:', err);
      throw err;
    }
  }, []);

  // Delete company
  const deleteCompany = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/companies?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete company');
      }
      
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to delete company:', err);
      throw err;
    }
  }, []);

  // Load companies on mount
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    error,
    fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
