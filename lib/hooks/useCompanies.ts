import { useState, useCallback, useEffect } from 'react';
import { CompanyBranding } from '@/app/lib/proposalTypes';

const COMPANIES_CACHE_TTL_MS = 60 * 1000;
let companiesCache: CompanyBranding[] | null = null;
let companiesCacheAt = 0;
let companiesInFlight: Promise<CompanyBranding[]> | null = null;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || 'Unexpected non-JSON response');
  }
}

async function requestCompanies(): Promise<CompanyBranding[]> {
  const response = await fetch('/api/companies');
  const result = await readJsonResponse<{ data?: CompanyBranding[]; error?: string }>(response);

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch companies');
  }

  return result.data || [];
}

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyBranding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies from API
  const fetchCompanies = useCallback(async (opts?: { force?: boolean; silent?: boolean }) => {
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    const hasFreshCache =
      !force &&
      companiesCache &&
      Date.now() - companiesCacheAt < COMPANIES_CACHE_TTL_MS;

    if (hasFreshCache) {
      setCompanies(companiesCache || []);
      setLoading(false);
      return companiesCache || [];
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!companiesInFlight) {
        companiesInFlight = requestCompanies();
      }

      const data = await companiesInFlight;
      companiesCache = data;
      companiesCacheAt = Date.now();
      setCompanies(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch companies:', err);
      throw err;
    } finally {
      companiesInFlight = null;
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
      
      const result = await readJsonResponse<{ data?: CompanyBranding; error?: string }>(response);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create company');
      }
      
      setCompanies((prev) => {
        const base = companiesCache || prev;
        const updated = [result.data, ...base];
        companiesCache = updated;
        companiesCacheAt = Date.now();
        return updated;
      });
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
      
      const result = await readJsonResponse<{ data?: CompanyBranding; error?: string }>(response);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update company');
      }
      
      setCompanies((prev) => {
        const base = companiesCache || prev;
        const updated = base.map((c) => (c.id === company.id ? result.data : c));
        companiesCache = updated;
        companiesCacheAt = Date.now();
        return updated;
      });
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
      
      const result = await readJsonResponse<{ error?: string; message?: string }>(response);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete company');
      }
      
      setCompanies((prev) => {
        const base = companiesCache || prev;
        const updated = base.filter((c) => c.id !== id);
        companiesCache = updated;
        companiesCacheAt = Date.now();
        return updated;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to delete company:', err);
      throw err;
    }
  }, []);

  // Load companies on mount
  useEffect(() => {
    if (companiesCache) {
      setCompanies(companiesCache);
      setLoading(false);
      void fetchCompanies({ silent: true });
      return;
    }

    void fetchCompanies();
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
