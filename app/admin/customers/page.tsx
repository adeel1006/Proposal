"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Customer } from "@/app/lib/proposalTypes";
import { useCompanies } from "@/lib/hooks/useCompanies";
import {
  CustomerProposalHistory,
  useCustomers,
} from "@/lib/hooks/useCustomers";

type CustomerFormState = {
  id?: string;
  companyId: string;
  name: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  businessWebsite: string;
  requiredService: string;
  notes: string;
};

const emptyForm: CustomerFormState = {
  companyId: "",
  name: "",
  businessName: "",
  email: "",
  phoneNumber: "",
  businessWebsite: "",
  requiredService: "",
  notes: "",
};

const CUSTOMER_CSV_HEADERS = [
  "companyId",
  "name",
  "businessName",
  "email",
  "phoneNumber",
  "businessWebsite",
  "requiredService",
  "notes",
] as const;

const CUSTOMER_PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;

type CustomerCsvHeader = (typeof CUSTOMER_CSV_HEADERS)[number];
type CustomerCsvRow = Record<CustomerCsvHeader, string>;

function toFormState(customer: Customer): CustomerFormState {
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    businessName: customer.businessName || "",
    email: customer.email || "",
    phoneNumber: customer.phoneNumber || "",
    businessWebsite: customer.businessWebsite || "",
    requiredService: customer.requiredService || "",
    notes: customer.notes || "",
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not sent";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatAddedDate(value?: string) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getProposalStatusLabel(customer: Customer) {
  return customer.proposalStatus === "sent" || (customer.proposalCount || 0) > 0
    ? "Sent"
    : "Not sent";
}

function getStatusBadgeClass(customer: Customer) {
  return getProposalStatusLabel(customer) === "Sent"
    ? "border-emerald-400 bg-white text-emerald-700"
    : "border-rose-400 bg-white text-rose-700";
}

function getDateBadgeClass() {
  return "border-blue-400 bg-white text-blue-700";
}

const glassBadgeBase =
  "rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md";

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === "," && !isQuoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCustomerCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one customer row.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = CUSTOMER_CSV_HEADERS.filter(
    (header) => !headers.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingHeaders.join(", ")}`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const row = CUSTOMER_CSV_HEADERS.reduce((acc, header) => {
      const valueIndex = headers.indexOf(header);
      acc[header] = values[valueIndex]?.trim() || "";
      return acc;
    }, {} as CustomerCsvRow);

    return {
      rowNumber: rowIndex + 2,
      data: row,
    };
  });
}

export default function CustomersPage() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [proposalHistory, setProposalHistory] = useState<CustomerProposalHistory[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof CUSTOMER_PAGE_SIZE_OPTIONS)[number]>(10);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const {
    customers,
    totalCount,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerWithProposals,
  } = useCustomers(companyFilter || undefined, {
    autoFetch: true,
    page: currentPage,
    pageSize,
    search: query,
  });

  const totalCustomerPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalCustomerPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, companyFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalCustomerPages) {
      setCurrentPage(totalCustomerPages);
    }
  }, [currentPage, totalCustomerPages]);

  const paginationStart = Math.max(1, safeCurrentPage - 2);
  const paginationEnd = Math.min(totalCustomerPages, safeCurrentPage + 2);
  const paginationPages = Array.from(
    { length: paginationEnd - paginationStart + 1 },
    (_, index) => paginationStart + index,
  );

  const setTimedMessage = (nextMessage: { type: "success" | "error"; text: string }) => {
    setMessage(nextMessage);
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCompanyId = companyFilter || companies[0]?.id || "replace-with-company-id";
    const sampleRows = [
      CUSTOMER_CSV_HEADERS,
      [
        sampleCompanyId,
        "Acme Foods",
        "Acme Foods LLC",
        "owner@acmefoods.com",
        "+1 555 123 4567",
        "https://acmefoods.com",
        "SEO campaign",
        "Interested in improving local search visibility.",
      ],
      [
        sampleCompanyId,
        "Northstar Studio",
        "Northstar Studio Inc.",
        "hello@northstarstudio.com",
        "+1 555 987 6543",
        "https://northstarstudio.com",
        "Website redesign",
        "Needs a refreshed services page and stronger portfolio layout.",
      ],
    ];
    const csv = sampleRows
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers-sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUploadClick = () => {
    csvInputRef.current?.click();
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setTimedMessage({ type: "error", text: "Please upload a .csv file." });
      return;
    }

    setIsImportingCsv(true);
    try {
      const parsedRows = parseCustomerCsv(await file.text());
      const knownCompanyIds = new Set(companies.map((company) => company.id));
      const errors: string[] = [];
      let createdCount = 0;

      for (const { rowNumber, data } of parsedRows) {
        if (!data.companyId) {
          errors.push(`Row ${rowNumber}: companyId is required.`);
          continue;
        }

        if (!knownCompanyIds.has(data.companyId)) {
          errors.push(`Row ${rowNumber}: companyId "${data.companyId}" was not found.`);
          continue;
        }

        if (!data.name) {
          errors.push(`Row ${rowNumber}: name is required.`);
          continue;
        }

        if (!data.businessName) {
          errors.push(`Row ${rowNumber}: businessName is required.`);
          continue;
        }

        try {
          await createCustomer({
            companyId: data.companyId,
            name: data.name,
            businessName: data.businessName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            businessWebsite: data.businessWebsite,
            requiredService: data.requiredService,
            notes: data.notes,
          });
          createdCount += 1;
        } catch (error) {
          const text = error instanceof Error ? error.message : "Failed to create customer";
          errors.push(`Row ${rowNumber}: ${text}`);
        }
      }

      if (createdCount === 0 && errors.length > 0) {
        setTimedMessage({
          type: "error",
          text: `No customers imported. ${errors.slice(0, 3).join(" ")}`,
        });
        return;
      }

      await fetchCustomers({ force: true, silent: true });

      setTimedMessage({
        type: errors.length > 0 ? "error" : "success",
        text:
          errors.length > 0
            ? `Imported ${createdCount} customer(s). ${errors.length} row(s) need attention. ${errors.slice(0, 2).join(" ")}`
            : `Imported ${createdCount} customer(s) successfully.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to import CSV";
      setTimedMessage({ type: "error", text });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleNewCustomer = () => {
    setForm({
      ...emptyForm,
      companyId: companyFilter || companies[0]?.id || "",
    });
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setForm(toFormState(customer));
    setShowForm(true);
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLoadingHistory(true);
    try {
      const details = await fetchCustomerWithProposals(customer.id);
      setSelectedCustomer(details.customer);
      setProposalHistory(details.proposals);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load proposal history";
      setTimedMessage({ type: "error", text });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.companyId || !form.name.trim() || !form.businessName.trim()) {
      setTimedMessage({
        type: "error",
        text: "Company, customer name, and business name are required.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: form.id,
        companyId: form.companyId,
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        businessWebsite: form.businessWebsite.trim(),
        requiredService: form.requiredService.trim(),
        notes: form.notes.trim(),
      };
      const savedCustomer = form.id
        ? await updateCustomer(payload as Customer)
        : await createCustomer(payload);

      setShowForm(false);
      setForm(emptyForm);
      if (!form.id) {
        setCurrentPage(1);
      }
      await fetchCustomers({ force: true, silent: true });
      setTimedMessage({
        type: "success",
        text: form.id ? "Customer updated successfully." : "Customer created successfully.",
      });
      if (selectedCustomer?.id === savedCustomer.id) {
        await handleSelectCustomer(savedCustomer);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save customer";
      setTimedMessage({ type: "error", text });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete ${customer.name}? Their proposals will stay saved but no longer be linked.`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      await fetchCustomers({ force: true, silent: true });
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
        setProposalHistory([]);
      }
      setTimedMessage({ type: "success", text: "Customer deleted successfully." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to delete customer";
      setTimedMessage({ type: "error", text });
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Customer CRM
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Customers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage customer profiles, required services, websites, and every proposal linked to them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Download Sample CSV
            </button>
            <button
              type="button"
              onClick={handleCsvUploadClick}
              disabled={isImportingCsv || companiesLoading || companies.length === 0}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImportingCsv ? "Importing..." : "Upload Customers CSV"}
            </button>
            <button
              type="button"
              onClick={handleNewCustomer}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-slate-700"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {form.id ? "Edit Customer" : "Add Customer"}
                </h2>
                {/* <p className="mt-1 text-sm text-slate-500">
                  Customer ID is generated automatically and stays unique.
                </p> */}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Company *
                </label>
                <select
                  value={form.companyId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyId: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  disabled={companiesLoading}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Customer Name *
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. Acme Foods"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Business Name *
                </label>
                <input
                  value={form.businessName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. Acme Foods LLC"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Business Website
                </label>
                <input
                  type="url"
                  value={form.businessWebsite}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      businessWebsite: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="https://customer-site.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Required Service
                </label>
                <input
                  value={form.requiredService}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requiredService: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. Ecommerce website, SEO campaign"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Optional internal notes"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving..." : form.id ? "Update Customer" : "Create Customer"}
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Search by name, email, website, service, or ID"
              />
              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {totalCount}
                </span>{" "}
                customer{totalCount === 1 ? "" : "s"} found
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Show
                </label>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value) as (typeof CUSTOMER_PAGE_SIZE_OPTIONS)[number])
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {CUSTOMER_PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : totalCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="font-semibold text-slate-700">No customers found</p>
                <p className="mt-2 text-sm text-slate-500">
                  Add a customer profile first, then link them while creating proposals.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {customers.map((customer) => {
                  const company = companies.find((item) => item.id === customer.companyId);
                  const proposalStatusLabel = getProposalStatusLabel(customer);
                  return (
                    <article
                      key={customer.id}
                      className={`rounded-2xl border p-4 transition ${
                        selectedCustomer?.id === customer.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">
                              {customer.name}
                            </h3>
                            {customer.businessName && (
                              <span className="text-sm font-medium text-slate-600">
                                {customer.businessName}
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {customer.id}
                            </span>
                            <span
                              className={`${glassBadgeBase} ${getStatusBadgeClass(customer)}`}
                            >
                              Proposal: {proposalStatusLabel}
                            </span>
                            <span className={`${glassBadgeBase} ${getDateBadgeClass()}`}>
                              Added: {formatAddedDate(customer.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {company?.businessName || "Company not found"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            {customer.email && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                                {customer.email}
                              </span>
                            )}
                            {customer.businessWebsite && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                {customer.businessWebsite}
                              </span>
                            )}
                            {customer.requiredService && (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                {customer.requiredService}
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(customer)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-900">
                      {Math.min(safeCurrentPage * pageSize, totalCount)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {totalCount}
                    </span>{" "}
                    customers
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {paginationPages.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          page === safeCurrentPage
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalCustomerPages, page + 1))
                      }
                      disabled={safeCurrentPage >= totalCustomerPages}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            {selectedCustomer ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Customer Details
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {selectedCustomer.name}
                </h2>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">ID:</span> {selectedCustomer.id}
                  </p>
                  <p>
                    <span className="font-semibold">Proposal status:</span>{" "}
                    <span
                      className={`ml-2 ${glassBadgeBase} ${getStatusBadgeClass(selectedCustomer)}`}
                    >
                      {getProposalStatusLabel(selectedCustomer)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Added on:</span>{" "}
                    <span className={`ml-2 ${glassBadgeBase} ${getDateBadgeClass()}`}>
                      {formatAddedDate(selectedCustomer.createdAt)}
                    </span>
                  </p>
                  {selectedCustomer.email && (
                    <p>
                      <span className="font-semibold">Email:</span>{" "}
                      <a className="text-blue-700 hover:underline" href={`mailto:${selectedCustomer.email}`}>
                        {selectedCustomer.email}
                      </a>
                    </p>
                  )}
                  {selectedCustomer.phoneNumber && (
                    <p>
                      <span className="font-semibold">Phone:</span> {selectedCustomer.phoneNumber}
                    </p>
                  )}
                  {selectedCustomer.businessWebsite && (
                    <p>
                      <span className="font-semibold">Website:</span>{" "}
                      <a
                        className="break-all text-blue-700 hover:underline"
                        href={selectedCustomer.businessWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedCustomer.businessWebsite}
                      </a>
                    </p>
                  )}
                  {selectedCustomer.requiredService && (
                    <p>
                      <span className="font-semibold">Required service:</span>{" "}
                      {selectedCustomer.requiredService}
                    </p>
                  )}
                  {selectedCustomer.notes && (
                    <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4">
                      {selectedCustomer.notes}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Related Proposals
                  </h3>
                  <Link
                    href="/admin/proposals"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    New Proposal
                  </Link>
                </div>

                {isLoadingHistory ? (
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : proposalHistory.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No proposals are linked to this customer yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {proposalHistory.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-xs font-semibold text-slate-500">
                              {proposal.id}
                            </p>
                            <p className="mt-1 font-semibold text-slate-950">
                              {proposal.projectTitle || "Untitled proposal"}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {proposal.status || "submitted"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                          <span>{formatDate(proposal.submittedAt)}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(proposal.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-lg font-semibold text-slate-700">
                  Select a customer
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Their contact details and relevant proposals will appear here.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
