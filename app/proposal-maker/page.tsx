'use client';

import { useState } from 'react';
import ProposalDashboard from '@/app/components/ProposalDashboard';
import ProposalPreview from '@/app/components/ProposalPreview';
import { DEFAULT_ITEMS, getSelectedItemsTotal } from '@/app/lib/proposalTypes';

export default function ProposalMaker() {
  const [proposalData, setProposalData] = useState({
    clientName: '',
    projectTitle: '',
    selectedItems: [] as string[],
    items: DEFAULT_ITEMS,
    notes: '',
    validUntil: '',
  });

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const total = getSelectedItemsTotal(proposalData.selectedItems, proposalData.items);

  const handleExportToSheets = async () => {
    setExporting(true);
    setExportMessage('');

    try {
      const response = await fetch('/api/export-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposalData,
          total,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setExportMessage(`❌ ${result.error}`);
      } else {
        setExportMessage('✅ Proposal saved to Google Sheets!');
        setTimeout(() => setExportMessage(''), 3000);
      }
    } catch (error) {
      setExportMessage(`❌ ${error instanceof Error ? error.message : 'Export failed'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💼 Proposal Maker</h1>
          <p className="text-slate-700">Create, preview, and export professional proposals</p>
        </div>

        {/* Export Message */}
        {exportMessage && (
          <div className={`mb-4 p-3 rounded ${
            exportMessage.startsWith('✅')
              ? 'bg-green-100 text-green-900 border border-green-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}>
            {exportMessage}
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Dashboard */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ProposalDashboard
                items={proposalData.items}
                onItemsChange={setProposalData}
              />

              {/* Export Button */}
              <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
                <button
                  onClick={handleExportToSheets}
                  disabled={exporting || !proposalData.clientName}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {exporting ? '⏳ Exporting...' : '📊 Export to Google Sheets'}
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">
                  Saves proposal to your Google Sheet
                </p>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-2">
            <ProposalPreview
              clientName={proposalData.clientName}
              projectTitle={proposalData.projectTitle}
              selectedItems={proposalData.selectedItems}
              items={proposalData.items}
              notes={proposalData.notes}
              validUntil={proposalData.validUntil}
            />
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none;
          }
          .print\\:shadow-none {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
