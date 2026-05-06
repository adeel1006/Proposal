import { useCallback, useEffect, useState } from "react";
import { Customer } from "@/app/lib/proposalTypes";

type CustomerProposalHistory = {
  id: string;
  customerId: string;
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  total: number;
  status: string;
  submittedAt: string;
};

const CUSTOMERS_CACHE_TTL_MS = 60 * 1000;
const customersCache = new Map<string, { at: number; data: Customer[] }>();
const customersInFlight = new Map<string, Promise<Customer[]>>();

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Unexpected non-JSON response");
  }
}

async function requestCustomers(companyId?: string): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (companyId) {
    params.set("companyId", companyId);
  }

  const response = await fetch(
    `/api/customers${params.toString() ? `?${params.toString()}` : ""}`,
  );
  const result = await readJsonResponse<{ data?: Customer[]; error?: string }>(
    response,
  );

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch customers");
  }

  return (result.data || []).map((customer) => ({
    ...customer,
    companyId: customer.companyId || "",
    name: customer.name || "",
    email: customer.email || "",
    phoneNumber: customer.phoneNumber || "",
    businessWebsite: customer.businessWebsite || "",
    requiredService: customer.requiredService || "",
    notes: customer.notes || "",
  }));
}

function getCacheKey(companyId?: string) {
  return companyId || "all";
}

function invalidateCustomerCaches(customer?: Customer) {
  if (!customer) {
    customersCache.clear();
    return;
  }

  customersCache.delete("all");
  customersCache.delete(getCacheKey(customer.companyId));
}

export function useCustomers(companyId?: string, options: { autoFetch?: boolean } = {}) {
  const { autoFetch = true } = options;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      const cacheKey = getCacheKey(companyId);
      const cached = customersCache.get(cacheKey);
      const force = Boolean(opts?.force);
      const silent = Boolean(opts?.silent);
      const hasFreshCache =
        !force && cached && Date.now() - cached.at < CUSTOMERS_CACHE_TTL_MS;

      if (hasFreshCache) {
        setCustomers(cached.data);
        setLoading(false);
        return cached.data;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        if (!customersInFlight.has(cacheKey)) {
          customersInFlight.set(cacheKey, requestCustomers(companyId));
        }

        const data = await customersInFlight.get(cacheKey)!;
        customersCache.set(cacheKey, { at: Date.now(), data });
        setCustomers(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Failed to fetch customers:", err);
        throw err;
      } finally {
        customersInFlight.delete(cacheKey);
        setLoading(false);
      }
    },
    [companyId],
  );

  const createCustomer = useCallback(async (customer: Omit<Customer, "id"> & { id?: string }) => {
    setError(null);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      const result = await readJsonResponse<{ data?: Customer; error?: string }>(
        response,
      );

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Failed to create customer");
      }

      invalidateCustomerCaches(result.data);
      setCustomers((prev) => {
        if (companyId && result.data!.companyId !== companyId) {
          return prev;
        }
        return [result.data!, ...prev];
      });
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to create customer:", err);
      throw err;
    }
  }, [companyId]);

  const updateCustomer = useCallback(async (customer: Customer) => {
    setError(null);
    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      const result = await readJsonResponse<{ data?: Customer; error?: string }>(
        response,
      );

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Failed to update customer");
      }

      invalidateCustomerCaches(result.data);
      setCustomers((prev) =>
        prev.map((item) => (item.id === result.data!.id ? result.data! : item)),
      );
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to update customer:", err);
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/customers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const result = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete customer");
      }

      customersCache.clear();
      setCustomers((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to delete customer:", err);
      throw err;
    }
  }, []);

  const fetchCustomerWithProposals = useCallback(async (id: string) => {
    const params = new URLSearchParams({ id, includeProposals: "true" });
    const response = await fetch(`/api/customers?${params.toString()}`);
    const result = await readJsonResponse<{
      data?: Customer;
      proposals?: CustomerProposalHistory[];
      error?: string;
    }>(response);

    if (!response.ok || !result.data) {
      throw new Error(result.error || "Failed to fetch customer details");
    }

    return {
      customer: result.data,
      proposals: result.proposals || [],
    };
  }, []);

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }

    void fetchCustomers();
  }, [autoFetch, fetchCustomers]);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerWithProposals,
  };
}

export type { CustomerProposalHistory };
