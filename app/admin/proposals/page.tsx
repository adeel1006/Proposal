"use client";

import { useState, useEffect } from "react";
import ItemEditor from "@/app/components/ItemEditor";
import {
  ProposalEditorSkeleton,
  SelectSkeleton,
  ServiceListSkeleton,
} from "@/app/components/LoadingSkeletons";
import ProposalPreview from "@/app/components/ProposalPreview";
import { generateProposalHTML } from "@/lib/clientPdfService";
import {
  Proposal,
  ProposalAttachment,
  ProposalItem,
  DEFAULT_ITEMS,
  DEFAULT_TERMS,
  MAX_PROPOSAL_ATTACHMENTS,
  generateProposalId,
  getSelectedItemsTotal,
  getSelectedItemsTotalUSD,
  getSelectedItemsTotalInCurrency,
  normalizeProposalAttachments,
  validateProposalAttachments,
} from "@/app/lib/proposalTypes";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { useServices } from "@/lib/hooks/useServices";
import { useDraftProposals } from "@/lib/hooks/useDraftProposals";

type Html2PdfInstance = {
  set: (options: Record<string, unknown>) => Html2PdfInstance;
  from: (element: HTMLElement) => Html2PdfInstance;
  outputPdf: (outputType: "dataurlstring") => Promise<string>;
};

type Html2PdfFactory = () => Html2PdfInstance;

function createAttachment(): ProposalAttachment {
  return {
    id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    url: "",
  };
}

function ensureProposalId(proposal: Proposal): Proposal {
  if (proposal.id && proposal.id.trim() !== "") {
    return {
      ...proposal,
      attachments: normalizeProposalAttachments(proposal.attachments),
    };
  }

  return {
    ...proposal,
    id: generateProposalId(),
    attachments: normalizeProposalAttachments(proposal.attachments),
  };
}

function createFreshProposal(
  companyId = "",
  items: ProposalItem[] = DEFAULT_ITEMS,
): Proposal {
  return {
    id: generateProposalId(),
    companyId,
    clientName: "",
    projectTitle: "",
    selectedItems: [],
    items,
    paymentLink: "",
    attachments: [],
    terms: DEFAULT_TERMS,
  };
}

export default function AdminDashboard() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const { services: companyServices, loading: servicesLoading } =
    useServices(selectedCompanyId);
  const { saveDraft } = useDraftProposals({ autoFetch: false });

  const [proposal, setProposal] = useState<Proposal>({
    id: "",
    companyId: "",
    clientName: "",
    projectTitle: "",
    selectedItems: [],
    items: DEFAULT_ITEMS,
    paymentLink: "",
    attachments: [],
    terms: DEFAULT_TERMS,
  });

  const [activeTab, setActiveTab] = useState<"general" | "items" | "preview">(
    "general",
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const selectedCompany =
    companies.find((c) => c.id === selectedCompanyId) || null;
  const setTimedMessage = (message: string, durationMs = 3000) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(""), durationMs);
  };
  const getSaveMessageTone = () => {
    if (saveMessage.startsWith("✅")) {
      return "bg-green-50 border-green-500 text-green-900";
    }

    if (saveMessage.startsWith("❌")) {
      return "bg-red-50 border-red-500 text-red-900";
    }

    return "bg-blue-50 border-blue-500 text-blue-900";
  };

  // Load proposal draft from localStorage & initialize ID on client side only
  useEffect(() => {
    const savedProposal = localStorage.getItem("currentProposal");
    if (savedProposal) {
      try {
        const loadedProposal = JSON.parse(savedProposal) as Proposal;
        const normalizedProposal = ensureProposalId(loadedProposal);
        setProposal(normalizedProposal);
        if (normalizedProposal.companyId) {
          setSelectedCompanyId(normalizedProposal.companyId);
        }
      } catch (e) {
        console.error("Error loading proposal:", e);
      }
    } else {
      setProposal((prev) => ({
        ...prev,
        id: generateProposalId(),
      }));
    }

    setIsHydrated(true);
  }, []);

  // Keep proposal services in sync with selected company services from DB
  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }

    setProposal((prev) => {
      const allowedItemIds = new Set(companyServices.map((item) => item.id));
      return {
        ...prev,
        items: companyServices,
        selectedItems: prev.selectedItems.filter((itemId) =>
          allowedItemIds.has(itemId),
        ),
      };
    });
  }, [selectedCompanyId, companyServices]);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("currentProposal", JSON.stringify(proposal));
  }, [proposal]);

  // Auto-save draft to database
  useEffect(() => {
    if (!isHydrated || !proposal.id) {
      return;
    }

    const timeout = setTimeout(() => {
      saveDraft({
        ...proposal,
        status: "draft",
      }).catch((err) => {
        console.error("Failed to auto-save draft:", err);
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [proposal, isHydrated, saveDraft]);

  const handleSaveItem = (updatedItem: ProposalItem) => {
    setProposal((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteItem = (id: string) => {
    setProposal((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      selectedItems: prev.selectedItems.filter((itemId) => itemId !== id),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddItem = () => {
    const newItem: ProposalItem = {
      id: `item-${Date.now()}`,
      name: "New Service",
      description: "Description here",
      price: 0,
      currency: "USD",
      category: "Custom",
      quantity: 1,
    };
    setProposal((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleItem = (id: string) => {
    setProposal((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(id)
        ? prev.selectedItems.filter((i) => i !== id)
        : [...prev.selectedItems, id],
    }));
  };

  const handleAddAttachment = () => {
    if ((proposal.attachments?.length || 0) >= MAX_PROPOSAL_ATTACHMENTS) {
      setTimedMessage(
        `Please keep attachments to ${MAX_PROPOSAL_ATTACHMENTS} or fewer.`,
        4000,
      );
      return;
    }

    setProposal((prev) => ({
      ...prev,
      attachments: [
        ...normalizeProposalAttachments(prev.attachments),
        createAttachment(),
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAttachmentChange = (
    attachmentId: string,
    field: "label" | "url",
    value: string,
  ) => {
    setProposal((prev) => ({
      ...prev,
      attachments: normalizeProposalAttachments(prev.attachments).map(
        (attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, [field]: value }
            : attachment,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setProposal((prev) => ({
      ...prev,
      attachments: normalizeProposalAttachments(prev.attachments).filter(
        (attachment) => attachment.id !== attachmentId,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleNewProposal = () => {
    if (confirm("Create a new proposal? Current changes will be saved.")) {
      const itemsToUse = selectedCompanyId ? companyServices : DEFAULT_ITEMS;
      setProposal(createFreshProposal(selectedCompanyId || "", itemsToUse));
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setProposal((prev) => ({
      ...prev,
      companyId,
      items: [],
      selectedItems: [],
    }));
  };

  const handleSendProposalEmail = async () => {
    if (!customerEmail || !proposal.clientName) {
      setTimedMessage("❌ Please enter customer email and client name");
      return;
    }

    if (!selectedCompany) {
      setTimedMessage("❌ Please select a company");
      return;
    }

    if (proposal.selectedItems.length === 0) {
      setTimedMessage("❌ Please select at least one service");
      return;
    }

    // Ensure proposal has an ID
    const proposalWithId = ensureProposalId(proposal);
    const attachmentError = validateProposalAttachments(
      proposalWithId.attachments,
    );
    if (attachmentError) {
      setTimedMessage(`Error: ${attachmentError}`, 5000);
      return;
    }

    const sanitizedProposal = {
      ...proposalWithId,
      attachments: normalizeProposalAttachments(proposalWithId.attachments),
    };

    if (sanitizedProposal.id !== proposal.id) {
      setProposal(sanitizedProposal);
    }

    setIsSendingEmail(true);
    setSaveMessage(""); // Clear previous messages

    try {
      // Validate PDF library
      const html2pdf = (window as Window & { html2pdf?: Html2PdfFactory })
        .html2pdf;
      if (!html2pdf) {
        throw new Error(
          "PDF library (html2pdf) not loaded. Please refresh the page and try again.",
        );
      }

      // Generate PDF HTML
      const selectedItems = sanitizedProposal.items.filter((item) =>
        sanitizedProposal.selectedItems.includes(item.id),
      );
      const proposalTotal = getSelectedItemsTotal(
        sanitizedProposal.selectedItems,
        sanitizedProposal.items,
      );

      setSaveMessage("Saving proposal to database...");

      const saveResponse = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal: sanitizedProposal,
          company: selectedCompany,
          total: proposalTotal,
          customerEmail,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveResult?.error || "Failed to save proposal to database",
        );
      }

      const htmlContent = generateProposalHTML(
        sanitizedProposal,
        selectedCompany,
        selectedItems.map((item) => ({
          ...item,
          quantity: item.quantity || 1,
        })),
      );

      // Create element and generate PDF
      const element = document.createElement("div");
      element.innerHTML = htmlContent;

      setSaveMessage("⏳ Generating PDF...");

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
          timeoutId = setTimeout(() => {
            reject(new Error("PDF generation timeout. Please try again."));
          }, 30000); // 30 second timeout

          html2pdf()
            .set({
              margin: 10,
              filename: `${proposal.projectTitle || "proposal"}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
              pagebreak: { mode: ["avoid-all", "css", "legacy"] },
            })
            .from(element)
            .outputPdf("dataurlstring")
            .then((pdf: string) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!pdf || typeof pdf !== "string") {
                throw new Error("PDF generation returned invalid data.");
              }
              const base64 = pdf.replace(/^data:application\/pdf;base64,/, "");
              if (!base64) {
                throw new Error("Failed to convert PDF to base64.");
              }
              resolve(base64);
            })
            .catch((error: unknown) => {
              if (timeoutId) clearTimeout(timeoutId);
              reject(error);
            });
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        }
      });

      setSaveMessage("📧 Sending proposal email...");

      // Send email with PDF
      const response = await fetch("/api/proposals/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail,
          customerName: sanitizedProposal.clientName,
          proposal: sanitizedProposal,
          company: selectedCompany,
          items: selectedItems,
          pdfBase64,
          paymentLink: sanitizedProposal.paymentLink || "",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const nextProposal = createFreshProposal(
          selectedCompanyId || "",
          selectedCompanyId ? companyServices : DEFAULT_ITEMS,
        );
        setProposal(nextProposal);
        setActiveTab("general");
        setTimedMessage(`✅ ${result.message}. New proposal started.`, 5000);
        setCustomerEmail("");
      } else {
        setTimedMessage(
          `❌ ${result.error || "Failed to send proposal"}`,
          5000,
        );
      }
    } catch (error) {
      console.error("Error sending proposal:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setTimedMessage(`❌ ${errorMessage}`, 5000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Currency conversion state
  const [usdTotal, setUsdTotal] = useState<number>(0);
  const [companyCurrencyTotal, setCompanyCurrencyTotal] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);

  // Calculate totals with currency conversion
  useEffect(() => {
    const calculateTotals = async () => {
      if (!proposal.selectedItems.length) {
        setUsdTotal(0);
        setCompanyCurrencyTotal(0);
        return;
      }

      setIsConverting(true);
      try {
        // Calculate USD total (always in USD)
        const usdAmount = await getSelectedItemsTotalUSD(
          proposal.selectedItems,
          proposal.items,
        );
        setUsdTotal(usdAmount);

        // Calculate total in company currency
        const companyCurrency = selectedCompany?.currency || "USD";
        const companyAmount = await getSelectedItemsTotalInCurrency(
          proposal.selectedItems,
          proposal.items,
          companyCurrency,
        );
        setCompanyCurrencyTotal(companyAmount);
      } catch (error) {
        console.error("Error calculating currency totals:", error);
        // Fallback to simple total
        const fallbackTotal = getSelectedItemsTotal(
          proposal.selectedItems,
          proposal.items,
        );
        setUsdTotal(fallbackTotal);
        setCompanyCurrencyTotal(fallbackTotal);
      } finally {
        setIsConverting(false);
      }
    };

    calculateTotals();
  }, [proposal.selectedItems, proposal.items, selectedCompany?.currency]);

  const total = getSelectedItemsTotal(proposal.selectedItems, proposal.items);

  if (!isHydrated) {
    return <ProposalEditorSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Proposal ID & Actions */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">Proposal ID</p>
              <p className="font-mono font-bold text-lg">{proposal.id}</p>
            </div>
          <div className="flex justify-start sm:justify-end">
            <button
              onClick={handleNewProposal}
              className="rounded-xl bg-slate-900 px-4 py-2 font-medium !text-white transition hover:bg-slate-700"
            >
              ✚ New Proposal
            </button>
            {/* <button
              onClick={handleExportProposal}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ⬇️ Export JSON
            </button> */}
          </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
          <button
            onClick={() => setActiveTab("general")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "general"
                ? "bg-slate-900 !text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📝 General Info
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "items"
                ? "bg-slate-900 !text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📦 Services ({proposal.items.length})
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "preview"
                ? "bg-slate-900 !text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            👁️ Preview
          </button>
        </div>

        {/* General Info Tab */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Edit Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Company</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Company *
                    </label>
                    {companiesLoading ? (
                      <SelectSkeleton />
                    ) : companies.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
                        <p>No companies found. </p>
                        <a
                          href="/admin/companies"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Create a company first
                        </a>
                      </div>
                    ) : (
                      <select
                        value={selectedCompanyId || ""}
                        onChange={(e) => handleSelectCompany(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        required
                      >
                        <option value="">-- Select a company --</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.businessName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedCompany && (
                    <div className="p-3 bg-blue-50 border border-blue-300 rounded text-sm">
                      <p className="font-medium text-gray-900">
                        {selectedCompany.businessName}
                      </p>
                      {selectedCompany.website && (
                        <p className="text-gray-600 text-xs break-all">
                          🌐 {selectedCompany.website}
                        </p>
                      )}
                      <p className="text-gray-600 text-xs">
                        📧 {selectedCompany.email}
                      </p>
                      <p className="text-gray-600 text-xs">
                        📱 {selectedCompany.mobileNumber}
                      </p>
                      <p className="text-gray-600 text-xs">
                        💱 {selectedCompany.currency}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Client Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={proposal.clientName}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          clientName: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Client company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={proposal.clientEmail || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          clientEmail: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="client@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Phone Number
                    </label>
                    <input
                      type="tel"
                      value={proposal.clientPhoneNumber || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          clientPhoneNumber: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      value={proposal.projectTitle}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          projectTitle: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., E-Commerce Platform"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Description
                    </label>
                    <textarea
                      value={proposal.projectDescription || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          projectDescription: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      rows={3}
                      placeholder="Describe the project..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Link
                    </label>
                    <input
                      type="url"
                      value={proposal.paymentLink || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          paymentLink: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://your-payment-page.com/checkout"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This link will be included in the proposal email and shown
                      in the preview.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proposal Date
                    </label>
                    <input
                      type="date"
                      value={proposal.proposalDate || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          proposalDate: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={proposal.notes || ""}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full border rounded px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Live Preview</h2>
                <ProposalPreview
                  clientName={proposal.clientName}
                  projectTitle={proposal.projectTitle}
                  selectedItems={proposal.selectedItems}
                  items={proposal.items}
                  notes={proposal.notes}
                  validUntil={proposal.validUntil}
                  showDownloadHtml={false}
                  currency={selectedCompany?.currency || "USD"}
                  usdTotal={usdTotal}
                  companyCurrencyTotal={companyCurrencyTotal}
                  paymentLink={proposal.paymentLink}
                  company={selectedCompany}
                />
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "items" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Item Selector */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">All Services</h2>
                  <button
                    onClick={handleAddItem}
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {servicesLoading ? (
                    <ServiceListSkeleton count={3} />
                  ) : (
                    proposal.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={proposal.selectedItems.includes(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {item.currency || "USD"} {item.price.toFixed(2)} ×{" "}
                            {item.quantity || 1}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {total.toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {proposal.selectedItems.length} of {proposal.items.length}{" "}
                    items selected
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Item Editor */}
            <div className="lg:col-span-2 space-y-4">
              {servicesLoading ? (
                <ServiceListSkeleton count={3} />
              ) : (
                proposal.items.map((item) => (
                  <ItemEditor
                    key={item.id}
                    item={item}
                    onSave={handleSaveItem}
                    onDelete={handleDeleteItem}
                    isNew={false}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Proposal Details Section */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900">
                📋 Proposal Details
              </h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Client Name
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {proposal.clientName || "Not Set"}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Project Title
                  </div>
                  <div className="mt-1 truncate font-semibold text-slate-900">
                    {proposal.projectTitle || "Not Set"}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Services
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {proposal.selectedItems.length} Selected
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-100 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Total Amount
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {selectedCompany?.currency || "USD"}{" "}
                    {companyCurrencyTotal.toFixed(2)}
                  </div>
                  {selectedCompany?.currency &&
                    selectedCompany.currency !== "USD" && (
                      <div className="mt-1 text-sm text-rose-700/80">
                        USD {usdTotal.toFixed(2)}
                        {isConverting && (
                          <span className="ml-1 text-xs">⟳</span>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Company Info */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  🏢 Company Information
                </div>
                <div className="text-sm text-gray-700">
                  <p>
                    <strong>
                      {selectedCompany?.businessName || "Company not selected"}
                    </strong>
                  </p>
                  {selectedCompany?.website && (
                    <p>
                      🌐{" "}
                      <a
                        href={selectedCompany.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {selectedCompany.website}
                      </a>
                    </p>
                  )}
                  {selectedCompany && (
                    <>
                      <p>📧 {selectedCompany.email}</p>
                      <p>📱 {selectedCompany.mobileNumber}</p>
                      {selectedCompany.address && (
                        <p>📍 {selectedCompany.address}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Services Table */}
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  🛍️ Services Included
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Service
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Description
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">
                          Qty
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.filter((i) =>
                        proposal.selectedItems.includes(i.id),
                      ).length > 0 ? (
                        proposal.items
                          .filter((item) =>
                            proposal.selectedItems.includes(item.id),
                          )
                          .map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-gray-200 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {item.description}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-900">
                                {item.quantity || 1}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                {selectedCompany?.currency || "USD"}{" "}
                                {(item.price * (item.quantity || 1)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 text-center text-gray-500"
                          >
                            No services selected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-8 rounded-lg border border-gray-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    Attachments
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    disabled={
                      (proposal.attachments?.length || 0) >=
                      MAX_PROPOSAL_ATTACHMENTS
                    }
                    className={`rounded px-3 py-1 text-sm font-medium text-white ${
                      (proposal.attachments?.length || 0) >=
                      MAX_PROPOSAL_ATTACHMENTS
                        ? "cursor-not-allowed bg-gray-300"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-3">
                  {normalizeProposalAttachments(proposal.attachments).map(
                    (attachment, index) => (
                      <div
                        key={attachment.id}
                        className="rounded border border-slate-200 bg-white p-3"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Attachment {index + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveAttachment(attachment.id)
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={attachment.label}
                            onChange={(e) =>
                              handleAttachmentChange(
                                attachment.id,
                                "label",
                                e.target.value,
                              )
                            }
                            className="w-full rounded border px-3 py-2"
                            placeholder="Text"
                          />
                          <input
                            type="url"
                            value={attachment.url}
                            onChange={(e) =>
                              handleAttachmentChange(
                                attachment.id,
                                "url",
                                e.target.value,
                              )
                            }
                            className="w-full rounded border px-3 py-2"
                            placeholder="Link (https://example.com/resource)"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="flex justify-end mb-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-sm">
                <div className="flex gap-12">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Subtotal
                      </div>
                      <div className="text-2xl font-semibold">
                        {selectedCompany?.currency || "USD"}{" "}
                        {companyCurrencyTotal.toFixed(2)}
                      </div>
                      {selectedCompany?.currency &&
                        selectedCompany.currency !== "USD" && (
                          <div className="mt-1 text-sm text-slate-300">
                            USD {usdTotal.toFixed(2)}
                            {isConverting && (
                              <span className="ml-1 text-xs">⟳</span>
                            )}
                          </div>
                        )}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Total
                      </div>
                      <div className="text-3xl font-semibold">
                        {selectedCompany?.currency || "USD"}{" "}
                        {companyCurrencyTotal.toFixed(2)}
                      </div>
                      {selectedCompany?.currency &&
                        selectedCompany.currency !== "USD" && (
                          <div className="mt-1 text-sm text-slate-300">
                            USD {usdTotal.toFixed(2)}
                            {isConverting && (
                              <span className="ml-1 text-xs">⟳</span>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes if any */}
              {proposal.notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    📝 Additional Notes
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {proposal.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Email & Send Section */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900">
                📧 Send Proposal to Customer
              </h2>

              <div className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Customer Email Address *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    disabled={isSendingEmail}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The proposal PDF will be sent to this email address
                  </p>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendProposalEmail}
                  disabled={
                    isSendingEmail ||
                    !customerEmail ||
                    !proposal.clientName ||
                    proposal.selectedItems.length === 0
                  }
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-semibold transition ${
                    isSendingEmail ||
                    !customerEmail ||
                    !proposal.clientName ||
                    proposal.selectedItems.length === 0
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {isSendingEmail ? (
                    <>
                      <span className="animate-spin">⏳</span> Sending
                      Proposal...
                    </>
                  ) : (
                    <>📧 Send Proposal via Email</>
                  )}
                </button>

                {/* Status Message */}
                {saveMessage && (
                  <div
                    className={`p-4 rounded-lg border-l-4 ${getSaveMessageTone()}`}
                  >
                    <p className="font-semibold text-sm">{saveMessage}</p>
                  </div>
                )}

                {/* Instructions */}
                {!isSendingEmail && !saveMessage && (
                  // <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                  //   <p className="text-sm text-blue-900">
                  //     <strong>✨ What the customer will receive:</strong><br />
                  //     • Professional HTML email with proposal details in a table<br />
                  //     • 3 Action buttons: Save as PDF, Accept, Decline<br />
                  //     • PDF attachment of the complete proposal<br />
                  //     • Your company contact information
                  //   </p>
                  // </div>
                  <></>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
