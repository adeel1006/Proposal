'use client';

import { useState, useEffect } from 'react';
import ItemEditor from '@/app/components/ItemEditor';
import { ProposalEditorSkeleton, SelectSkeleton, ServiceListSkeleton } from '@/app/components/LoadingSkeletons';
import ProposalPreview from '@/app/components/ProposalPreview';
import { generateProposalHTML } from '@/lib/clientPdfService';
import {
  Proposal,
  ProposalItem,
  DEFAULT_ITEMS,
  DEFAULT_TERMS,
  generateProposalId,
  getSelectedItemsTotal,
  getSelectedItemsTotalUSD,
  getSelectedItemsTotalInCurrency,
} from '@/app/lib/proposalTypes';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { useServices } from '@/lib/hooks/useServices';
import { useDraftProposals } from '@/lib/hooks/useDraftProposals';

type Html2PdfInstance = {
  set: (options: Record<string, unknown>) => Html2PdfInstance;
  from: (element: HTMLElement) => Html2PdfInstance;
  outputPdf: (outputType: 'dataurlstring') => Promise<string>;
};

type Html2PdfFactory = () => Html2PdfInstance;

function ensureProposalId(proposal: Proposal): Proposal {
  if (proposal.id && proposal.id.trim() !== '') {
    return proposal;
  }

  return {
    ...proposal,
    id: generateProposalId(),
  };
}

export default function AdminDashboard() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { services: companyServices, loading: servicesLoading } = useServices(selectedCompanyId);
  const { saveDraft } = useDraftProposals({ autoFetch: false });

  const [proposal, setProposal] = useState<Proposal>({
    id: '',
    companyId: '',
    clientName: '',
    projectTitle: '',
    selectedItems: [],
    items: DEFAULT_ITEMS,
    paymentLink: '',
    terms: DEFAULT_TERMS,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'preview'>('general');
  const [saveMessage, setSaveMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;
  const setTimedMessage = (message: string, durationMs = 3000) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(''), durationMs);
  };

  // Load proposal draft from localStorage & initialize ID on client side only
  useEffect(() => {
    const savedProposal = localStorage.getItem('currentProposal');
    if (savedProposal) {
      try {
        const loadedProposal = JSON.parse(savedProposal) as Proposal;
        const normalizedProposal = ensureProposalId(loadedProposal);
        setProposal(normalizedProposal);
        if (normalizedProposal.companyId) {
          setSelectedCompanyId(normalizedProposal.companyId);
        }
      } catch (e) {
        console.error('Error loading proposal:', e);
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
        selectedItems: prev.selectedItems.filter((itemId) => allowedItemIds.has(itemId)),
      };
    });
  }, [selectedCompanyId, companyServices]);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('currentProposal', JSON.stringify(proposal));
  }, [proposal]);

  // Auto-save draft to database
  useEffect(() => {
    if (!isHydrated || !proposal.id) {
      return;
    }

    const timeout = setTimeout(() => {
      saveDraft({
        ...proposal,
        status: 'draft',
      }).catch((err) => {
        console.error('Failed to auto-save draft:', err);
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [proposal, isHydrated, saveDraft]);

  const handleSaveItem = (updatedItem: ProposalItem) => {
    setProposal((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
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
      name: 'New Service',
      description: 'Description here',
      price: 0,
      currency: 'USD',
      category: 'Custom',
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

  const handleExportProposal = () => {
    const dataStr = JSON.stringify(proposal, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr));
    element.setAttribute('download', `${proposal.projectTitle || 'proposal'}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setTimedMessage('✅ Proposal exported!');
  };

  const handleNewProposal = () => {
    if (confirm('Create a new proposal? Current changes will be saved.')) {
      const itemsToUse = selectedCompanyId ? companyServices : DEFAULT_ITEMS;

      setProposal({
        id: generateProposalId(),
        companyId: selectedCompanyId || '',
        clientName: '',
        projectTitle: '',
        selectedItems: [],
        items: itemsToUse,
        paymentLink: '',
        terms: DEFAULT_TERMS,
      });
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
      setTimedMessage('❌ Please enter customer email and client name');
      return;
    }

    if (!selectedCompany) {
      setTimedMessage('❌ Please select a company');
      return;
    }

    if (proposal.selectedItems.length === 0) {
      setTimedMessage('❌ Please select at least one service');
      return;
    }

    // Ensure proposal has an ID
    const proposalWithId = ensureProposalId(proposal);
    if (proposalWithId.id !== proposal.id) {
      setProposal(proposalWithId);
    }

    setIsSendingEmail(true);
    setSaveMessage(''); // Clear previous messages

    try {
      // Validate PDF library
      const html2pdf = (window as Window & { html2pdf?: Html2PdfFactory }).html2pdf;
      if (!html2pdf) {
        throw new Error('PDF library (html2pdf) not loaded. Please refresh the page and try again.');
      }

      // Generate PDF HTML
      const selectedItems = proposalWithId.items.filter((item) =>
        proposalWithId.selectedItems.includes(item.id)
      );
      const proposalTotal = getSelectedItemsTotal(
        proposalWithId.selectedItems,
        proposalWithId.items
      );

      setSaveMessage('Saving proposal to database...');

      const saveResponse = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: proposalWithId,
          company: selectedCompany,
          total: proposalTotal,
          customerEmail,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || 'Failed to save proposal to database');
      }

      const htmlContent = generateProposalHTML(
        proposalWithId,
        selectedCompany,
        selectedItems.map(item => ({
          ...item,
          quantity: item.quantity || 1,
        }))
      );

      // Create element and generate PDF
      const element = document.createElement('div');
      element.innerHTML = htmlContent;

      setSaveMessage('⏳ Generating PDF...');

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
          timeoutId = setTimeout(() => {
            reject(new Error('PDF generation timeout. Please try again.'));
          }, 30000); // 30 second timeout

          html2pdf()
            .set({
              margin: 10,
              filename: `${proposal.projectTitle || 'proposal'}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
              pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
            })
            .from(element)
            .outputPdf('dataurlstring')
            .then((pdf: string) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!pdf || typeof pdf !== 'string') {
                throw new Error('PDF generation returned invalid data.');
              }
              const base64 = pdf.replace(/^data:application\/pdf;base64,/, '');
              if (!base64) {
                throw new Error('Failed to convert PDF to base64.');
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

      setSaveMessage('📧 Sending proposal email...');

      // Send email with PDF
      const response = await fetch('/api/proposals/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail,
          customerName: proposalWithId.clientName,
          proposal: proposalWithId,
          company: selectedCompany,
          items: selectedItems,
          pdfBase64,
          paymentLink: proposalWithId.paymentLink || '',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTimedMessage(`✅ ${result.message}`, 5000);
        setCustomerEmail('');
      } else {
        setTimedMessage(`❌ ${result.error || 'Failed to send proposal'}`, 5000);
      }
    } catch (error) {
      console.error('Error sending proposal:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
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
        const usdAmount = await getSelectedItemsTotalUSD(proposal.selectedItems, proposal.items);
        setUsdTotal(usdAmount);

        // Calculate total in company currency
        const companyCurrency = selectedCompany?.currency || 'USD';
        const companyAmount = await getSelectedItemsTotalInCurrency(
          proposal.selectedItems,
          proposal.items,
          companyCurrency
        );
        setCompanyCurrencyTotal(companyAmount);
      } catch (error) {
        console.error('Error calculating currency totals:', error);
        // Fallback to simple total
        const fallbackTotal = getSelectedItemsTotal(proposal.selectedItems, proposal.items);
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Save Message */}
        {saveMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-900 rounded border border-green-300">
            {saveMessage}
          </div>
        )}

        {/* Proposal ID & Actions */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600">Proposal ID</p>
            <p className="font-mono font-bold text-lg">{proposal.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNewProposal}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 rounded font-medium transition ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📝 General Info
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`px-6 py-3 rounded font-medium transition ${
              activeTab === 'items'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📦 Services ({proposal.items.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 rounded font-medium transition ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            👁️ Preview
          </button>
        </div>

        {/* General Info Tab */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Edit Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Company</h2>

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
                        <a href="/admin/companies" className="text-blue-600 hover:underline font-medium">
                          Create a company first
                        </a>
                      </div>
                    ) : (
                      <select
                        value={selectedCompanyId || ''}
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
                      <p className="font-medium text-gray-900">{selectedCompany.businessName}</p>
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
                        setProposal((prev) => ({ ...prev, clientName: e.target.value }))
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
                      value={proposal.clientEmail || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, clientEmail: e.target.value }))
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
                      value={proposal.clientPhoneNumber || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, clientPhoneNumber: e.target.value }))
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
                        setProposal((prev) => ({ ...prev, projectTitle: e.target.value }))
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
                      value={proposal.projectDescription || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, projectDescription: e.target.value }))
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
                      value={proposal.paymentLink || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, paymentLink: e.target.value }))
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://your-payment-page.com/checkout"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This link will be included in the proposal email and shown in the preview.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proposal Date
                    </label>
                    <input
                      type="date"
                      value={proposal.proposalDate || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, proposalDate: e.target.value }))
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={proposal.notes || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({ ...prev, notes: e.target.value }))
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
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Live Preview</h2>
                <ProposalPreview
                  clientName={proposal.clientName}
                  projectTitle={proposal.projectTitle}
                  selectedItems={proposal.selectedItems}
                  items={proposal.items}
                  notes={proposal.notes}
                  validUntil={proposal.validUntil}
                  showDownloadHtml={false}
                  currency={selectedCompany?.currency || 'USD'}
                  usdTotal={usdTotal}
                  companyCurrencyTotal={companyCurrencyTotal}
                  paymentLink={proposal.paymentLink}
                />
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Item Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">All Services</h2>
                  <button
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {servicesLoading ? (
                    <ServiceListSkeleton count={3} />
                  ) : (
                    proposal.items.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={proposal.selectedItems.includes(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            {item.currency || 'USD'} {item.price.toFixed(2)} × {item.quantity || 1}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{total.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {proposal.selectedItems.length} of {proposal.items.length} items selected
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
        {activeTab === 'preview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Proposal Details Section */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">📋 Proposal Details</h2>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Client Name</div>
                  <div className="mt-1 font-bold text-gray-900">{proposal.clientName || 'Not Set'}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Project Title</div>
                  <div className="mt-1 font-bold text-gray-900 truncate">{proposal.projectTitle || 'Not Set'}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Services</div>
                  <div className="mt-1 font-bold text-gray-900">{proposal.selectedItems.length} Selected</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Total Amount</div>
                  <div className="mt-1 font-bold text-gray-900">
                    {selectedCompany?.currency || 'USD'} {companyCurrencyTotal.toFixed(2)}
                  </div>
                  {selectedCompany?.currency && selectedCompany.currency !== 'USD' && (
                    <div className="text-sm text-orange-500 mt-1">
                      USD {usdTotal.toFixed(2)}
                      {isConverting && <span className="ml-1 text-xs">⟳</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">🏢 Company Information</div>
                <div className="text-sm text-gray-700">
                  <p><strong>{selectedCompany?.businessName || 'Company not selected'}</strong></p>
                  {selectedCompany && (
                    <>
                      <p>📧 {selectedCompany.email}</p>
                      <p>📱 {selectedCompany.mobileNumber}</p>
                      {selectedCompany.address && <p>📍 {selectedCompany.address}</p>}
                    </>
                  )}
                </div>
              </div>

              {/* Services Table */}
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 mb-3">🛍️ Services Included</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Service</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Qty</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.filter(i => proposal.selectedItems.includes(i.id)).length > 0 ? (
                        proposal.items
                          .filter((item) => proposal.selectedItems.includes(item.id))
                          .map((item) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                              <td className="py-3 px-4 text-gray-600">{item.description}</td>
                              <td className="py-3 px-4 text-center text-gray-900">{item.quantity || 1}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                {selectedCompany?.currency || 'USD'} {(item.price * (item.quantity || 1)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-500">
                            No services selected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Amount */}
              <div className="flex justify-end mb-8">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-lg">
                  <div className="flex gap-12">
                    <div>
                      <div className="text-xs text-gray-300 uppercase tracking-wide">Subtotal</div>
                      <div className="text-2xl font-bold">{selectedCompany?.currency || 'USD'} {companyCurrencyTotal.toFixed(2)}</div>
                      {selectedCompany?.currency && selectedCompany.currency !== 'USD' && (
                        <div className="text-sm text-gray-400 mt-1">
                          USD {usdTotal.toFixed(2)}
                          {isConverting && <span className="ml-1 text-xs">⟳</span>}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-300 uppercase tracking-wide">Total</div>
                      <div className="text-3xl font-bold">{selectedCompany?.currency || 'USD'} {companyCurrencyTotal.toFixed(2)}</div>
                      {selectedCompany?.currency && selectedCompany.currency !== 'USD' && (
                        <div className="text-sm text-gray-400 mt-1">
                          USD {usdTotal.toFixed(2)}
                          {isConverting && <span className="ml-1 text-xs">⟳</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes if any */}
              {proposal.notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-semibold text-gray-900 mb-2">📝 Additional Notes</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.notes}</div>
                </div>
              )}
            </div>

            {/* Customer Email & Send Section */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">📧 Send Proposal to Customer</h2>

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
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSendingEmail}
                  />
                  <p className="mt-1 text-xs text-gray-600">The proposal PDF will be sent to this email address</p>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendProposalEmail}
                  disabled={isSendingEmail || !customerEmail || !proposal.clientName || proposal.selectedItems.length === 0}
                  className={`w-full px-6 py-4 font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                    isSendingEmail || !customerEmail || !proposal.clientName || proposal.selectedItems.length === 0
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSendingEmail ? (
                    <>
                      <span className="animate-spin">⏳</span> Sending Proposal...
                    </>
                  ) : (
                    <>
                      📧 Send Proposal via Email
                    </>
                  )}
                </button>

                {/* Status Message */}
                {saveMessage && (
                  <div className={`p-4 rounded-lg border-l-4 ${
                    saveMessage.startsWith('✅') 
                      ? 'bg-green-50 border-green-500 text-green-900' 
                      : 'bg-red-50 border-red-500 text-red-900'
                  }`}>
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
