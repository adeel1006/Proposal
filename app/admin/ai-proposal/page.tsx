"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_TERMS,
  Proposal,
  ProposalItem,
} from "@/app/lib/proposalTypes";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useServices } from "@/lib/hooks/useServices";

type GenerateResponse = {
  data?: {
    proposal: Proposal;
    websiteFetchNote?: string;
    generationMode?: "ai" | "fallback";
    warning?: string;
  };
  error?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();
  throw new Error(text || "Unexpected non-JSON response");
}

function createDraftProposal(
  companyId: string,
  customerId: string,
  customerName: string,
  customerEmail: string,
  customerPhoneNumber: string,
  selectedItems: string[],
  items: ProposalItem[],
): Proposal {
  return {
    id: "",
    companyId,
    customerId,
    clientName: customerName,
    clientEmail: customerEmail,
    clientPhoneNumber: customerPhoneNumber,
    projectTitle: "",
    projectDescription: "",
    selectedItems,
    items,
    paymentLink: "",
    attachments: [],
    terms: DEFAULT_TERMS,
  };
}

export default function AiProposalPage() {
  const router = useRouter();
  const { companies, loading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const { services, loading: servicesLoading } = useServices(selectedCompanyId);
  const { customers, loading: customersLoading } = useCustomers(
    selectedCompanyId || undefined,
    { autoFetch: Boolean(selectedCompanyId) },
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [agencyTone, setAgencyTone] = useState(
    "Professional, clear, consultative, and business-focused.",
  );
  const [scopeLimitations, setScopeLimitations] = useState("");
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(
    null,
  );
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyId) || null;
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null;

  useEffect(() => {
    setSelectedCustomerId("");
    setSelectedServiceIds([]);
    setGeneratedProposal(null);
  }, [selectedCompanyId]);

  const setTimedMessage = (
    nextMessage: { type: "success" | "error" | "info"; text: string },
    durationMs = 4500,
  ) => {
    setMessage(nextMessage);
    setTimeout(() => setMessage(null), durationMs);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const buildProposalPayload = () => {
    if (!selectedCustomer) {
      return null;
    }

    return createDraftProposal(
      selectedCompanyId,
      selectedCustomer.id,
      selectedCustomer.name,
      selectedCustomer.email || "",
      selectedCustomer.phoneNumber || "",
      selectedServiceIds,
      services,
    );
  };

  const handleGenerate = async () => {
    if (!selectedCompany || !selectedCustomer) {
      setTimedMessage({
        type: "error",
        text: "Select both company and customer first.",
      });
      return;
    }

    if (selectedServiceIds.length === 0) {
      setTimedMessage({
        type: "error",
        text: "Select at least one service before generating.",
      });
      return;
    }

    if (!scopeLimitations.trim()) {
      setTimedMessage({
        type: "error",
        text: "Add scope limitations before generating.",
      });
      return;
    }

    const proposal = buildProposalPayload();
    if (!proposal) {
      return;
    }

    setIsGenerating(true);
    setMessage({ type: "info", text: "Generating proposal draft..." });

    try {
      const response = await fetch("/api/proposals/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal,
          company: selectedCompany,
          customer: selectedCustomer,
          agencyTone,
          scopeLimitations,
        }),
      });

      const result = await readJsonResponse<GenerateResponse>(response);

      if (!response.ok || !result.data?.proposal) {
        throw new Error(result.error || "Failed to generate proposal");
      }

      setGeneratedProposal(result.data.proposal);
      const responseMode =
        result.data.generationMode === "fallback"
          ? "Draft generated with a fallback template."
          : "Draft generated and saved.";
      setTimedMessage({
        type: result.data.generationMode === "fallback" ? "info" : "success",
        text: [
          responseMode,
          result.data.websiteFetchNote,
          result.data.warning,
        ]
          .filter(Boolean)
          .join(" "),
      });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to generate proposal";
      setTimedMessage({ type: "error", text }, 6500);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!generatedProposal || !selectedCompany) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/draft-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...generatedProposal,
          company: selectedCompany,
          status: "draft",
        }),
      });
      const result = await readJsonResponse<{ data?: Proposal; error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Failed to save draft edits");
      }

      if (result.data) {
        setGeneratedProposal(result.data);
      }

      setTimedMessage({ type: "success", text: "Draft edits saved." });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to save draft edits";
      setTimedMessage({ type: "error", text }, 6500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInEditor = () => {
    if (!generatedProposal) {
      return;
    }

    localStorage.setItem(
      "pendingProposalDraft",
      JSON.stringify(generatedProposal),
    );
    localStorage.setItem("currentProposal", JSON.stringify(generatedProposal));
    router.push("/admin/proposals");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              AI proposal
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Generate Proposal Draft
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Build a structured draft from company services, customer data, and
              the customer&apos;s website.
            </p>
          </div>
          <Link
            href="/admin/proposals"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Manual editor
          </Link>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : message.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Source Details
              </h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Company
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(event) =>
                      setSelectedCompanyId(event.target.value)
                    }
                    disabled={companiesLoading}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(event) =>
                      setSelectedCustomerId(event.target.value)
                    }
                    disabled={!selectedCompanyId || customersLoading}
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {selectedCustomer.name}
                    </p>
                    <p>{selectedCustomer.email || "No email saved"}</p>
                    <p>
                      Website:{" "}
                      {selectedCustomer.businessWebsite || "No website saved"}
                    </p>
                    <p>
                      Required service:{" "}
                      {selectedCustomer.requiredService || "Not specified"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Services
              </h2>
              <div className="mt-4 space-y-2">
                {servicesLoading ? (
                  <div className="text-sm text-slate-500">
                    Loading services...
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Select a company with saved services.
                  </div>
                ) : (
                  services.map((service) => (
                    <label
                      key={service.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">
                          {service.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {service.description || "No description"}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                AI Instructions
              </h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Agency Tone
                  </label>
                  <textarea
                    value={agencyTone}
                    onChange={(event) => setAgencyTone(event.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Scope Limitations
                  </label>
                  <textarea
                    value={scopeLimitations}
                    onChange={(event) =>
                      setScopeLimitations(event.target.value)
                    }
                    rows={5}
                    placeholder="Only propose selected services. Do not promise ad spend results, fixed timelines, services not listed, or unsupported facts."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    !selectedCompany ||
                    !selectedCustomer ||
                    selectedServiceIds.length === 0 ||
                    !scopeLimitations.trim()
                  }
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isGenerating ||
                    !selectedCompany ||
                    !selectedCustomer ||
                    selectedServiceIds.length === 0 ||
                    !scopeLimitations.trim()
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 !text-white hover:bg-slate-700"
                  }`}
                >
                  {isGenerating ? "Generating draft..." : "Generate draft"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Editable Draft
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Generated content is saved as a draft before review.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={!generatedProposal || isSaving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaving ? "Saving..." : "Save edits"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenInEditor}
                  disabled={!generatedProposal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Open in editor
                </button>
              </div>
            </div>

            {generatedProposal ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Project Title
                  </label>
                  <input
                    value={generatedProposal.projectTitle ?? ""}
                    onChange={(event) =>
                      setGeneratedProposal((current) =>
                        current
                          ? { ...current, projectTitle: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Project Description
                  </label>
                  <textarea
                    value={generatedProposal.projectDescription ?? ""}
                    onChange={(event) =>
                      setGeneratedProposal((current) =>
                        current
                          ? {
                              ...current,
                              projectDescription: event.target.value,
                            }
                          : current,
                      )
                    }
                    rows={6}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Proposal Body / Notes
                  </label>
                  <textarea
                    value={generatedProposal.notes ?? ""}
                    onChange={(event) =>
                      setGeneratedProposal((current) =>
                        current
                          ? { ...current, notes: event.target.value }
                          : current,
                      )
                    }
                    rows={18}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Select source details, add scope limitations, and generate a
                draft to review here.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
