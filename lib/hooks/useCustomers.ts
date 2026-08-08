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

type CustomerRequestOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
};

type CustomerResponse = {
  data?: Customer[];
  error?: string;
  meta?: {
    totalCount?: number;
  };
};

const CUSTOMERS_CACHE_TTL_MS = 60 * 1000;
const customersCache = new Map<
  string,
  { at: number; data: Customer[]; totalCount: number }
>();
const customersInFlight = new Map<string, Promise<{ data: Customer[]; totalCount: number }>>();

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

function buildCustomersCacheKey(companyId?: string, options?: CustomerRequestOptions) {
  return JSON.stringify({
    companyId: companyId || "",
    page: options?.page || 0,
    pageSize: options?.pageSize || 0,
    search: options?.search?.trim() || "",
  });
}

async function requestCustomers(
  companyId?: string,
  options: CustomerRequestOptions = {},
): Promise<{ data: Customer[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (companyId) {
    params.set("companyId", companyId);
  }
  if (typeof options.page === "number") {
    params.set("page", String(options.page));
  }
  if (typeof options.pageSize === "number") {
    params.set("pageSize", String(options.pageSize));
  }
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  const response = await fetch(
    `/api/customers${params.toString() ? `?${params.toString()}` : ""}`,
  );
  const result = await readJsonResponse<CustomerResponse>(response);

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch customers");
  }

  const customers = (result.data || []).map((customer) => ({
    ...customer,
    companyId: customer.companyId || "",
    name: customer.name || "",
    email: customer.email || "",
    phoneNumber: customer.phoneNumber || "",
    businessWebsite: customer.businessWebsite || "",
    requiredService: customer.requiredService || "",
    notes: customer.notes || "",
  }));

  return {
    data: customers,
    totalCount: result.meta?.totalCount ?? customers.length,
  };
}

function invalidateCustomerCaches() {
  customersCache.clear();
  customersInFlight.clear();
}

export function useCustomers(
  companyId?: string,
  options: CustomerRequestOptions & { autoFetch?: boolean } = {},
) {
  const { autoFetch = true } = options;
  const page = options.page;
  const pageSize = options.pageSize;
  const search = options.search?.trim() || "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      const cacheKey = buildCustomersCacheKey(companyId, { page, pageSize, search });
      const cached = customersCache.get(cacheKey);
      const force = Boolean(opts?.force);
      const silent = Boolean(opts?.silent);
      const hasFreshCache =
        !force && cached && Date.now() - cached.at < CUSTOMERS_CACHE_TTL_MS;

      if (hasFreshCache) {
        setCustomers(cached.data);
        setTotalCount(cached.totalCount);
        setLoading(false);
        return cached.data;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        if (!customersInFlight.has(cacheKey)) {
          customersInFlight.set(cacheKey, requestCustomers(companyId, { page, pageSize, search }));
        }

        const result = await customersInFlight.get(cacheKey)!;
        customersCache.set(cacheKey, { at: Date.now(), data: result.data, totalCount: result.totalCount });
        setCustomers(result.data);
        setTotalCount(result.totalCount);
        return result.data;
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
    [companyId, page, pageSize, search],
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

      invalidateCustomerCaches();
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

      invalidateCustomerCaches();
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

      invalidateCustomerCaches();
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
    totalCount,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerWithProposals,
  };
}

export type { CustomerProposalHistory };
