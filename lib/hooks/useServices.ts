import { useState, useCallback, useEffect } from 'react';
import { ProposalItem } from '@/app/lib/proposalTypes';

export function useServices(companyId: string | null) {
  const [services, setServices] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch services for a company
  const fetchServices = useCallback(async (id: string) => {
    if (!id) {
      setServices([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/services?companyId=${id}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch services');
      }
      
      setServices(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new service
  const createService = useCallback(async (service: Omit<ProposalItem, 'id'> & { companyId: string; id?: string }) => {
    setError(null);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create service');
      }
      
      setServices((prev) => [result.data, ...prev]);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to create service:', err);
      throw err;
    }
  }, []);

  // Update service
  const updateService = useCallback(async (service: ProposalItem) => {
    setError(null);
    try {
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update service');
      }
      
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? result.data : s))
      );
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to update service:', err);
      throw err;
    }
  }, []);

  // Delete service
  const deleteService = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete service');
      }
      
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to delete service:', err);
      throw err;
    }
  }, []);

  // Load services when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchServices(companyId);
    } else {
      setServices([]);
    }
  }, [companyId, fetchServices]);

  return {
    services,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
  };
}
