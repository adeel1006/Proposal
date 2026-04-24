'use client';

import { ProposalItem } from '@/app/lib/proposalTypes';

interface ProposalPreviewProps {
  clientName: string;
  projectTitle: string;
  selectedItems: string[];
  items: ProposalItem[];
  notes?: string;
  validUntil?: string;
  showDownloadHtml?: boolean;
  currency?: string;
  paymentLink?: string;
  usdTotal?: number;
  companyCurrencyTotal?: number;
}

export default function ProposalPreview({
  clientName,
  projectTitle,
  selectedItems,
  items,
  notes,
  validUntil,
  showDownloadHtml = true,
  currency = 'USD',
  paymentLink,
  usdTotal,
  companyCurrencyTotal,
}: ProposalPreviewProps) {
  const selectedItemsList = items.filter((i) => selectedItems.includes(i.id));
  const total = selectedItemsList.reduce((sum, item) => sum + item.price, 0);

  const formatDate = (date: string | undefined): string => {
    if (!date) return new Date().toLocaleDateString();
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    const html = document.getElementById('proposal-content')?.outerHTML;
    if (!html) return;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
    element.setAttribute('download', `${projectTitle || 'proposal'}.html`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 no-print">
        <button
          onClick={handlePrintPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          📄 Print / Save as PDF
        </button>
        {showDownloadHtml && (
          <button
            onClick={handleDownloadHTML}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ⬇️ Download HTML
          </button>
        )}
      </div>

      {/* Proposal Content */}
      <div
        id="proposal-content"
        className="bg-white p-8 rounded-lg shadow print:shadow-none print:p-0"
      >
        {/* Header */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">PROJECT PROPOSAL</div>
          <div className="text-sm text-gray-600" suppressHydrationWarning>
            Date: {formatDate(undefined)}
            {validUntil && ` | Valid Until: ${formatDate(validUntil)}`}
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              From
            </div>
            <div className="font-semibold text-gray-900">Your Company</div>
            <div className="text-sm text-gray-600">company@example.com</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              To
            </div>
            <div className="font-semibold text-gray-900">
              {clientName || 'Client Name'}
            </div>
            <div className="text-sm text-gray-600">{projectTitle || 'Project Title'}</div>
          </div>
        </div>

        {/* Project Title */}
        {projectTitle && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{projectTitle}</h1>
            <p className="text-gray-600">For: {clientName || 'Client'}</p>
          </div>
        )}

        {/* Services */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Services Included</h2>
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 font-semibold text-gray-700">Service</th>
                <th className="text-left py-2 font-semibold text-gray-700">Description</th>
                <th className="text-right py-2 font-semibold text-gray-700">Price</th>
              </tr>
            </thead>
            <tbody>
              {selectedItemsList.length > 0 ? (
                selectedItemsList.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="py-3 text-gray-600 text-sm">{item.description}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {item.currency} {(item.price * (item.quantity || 1)).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No services selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex flex-col gap-4 justify-end mb-6">
            <div className="bg-gray-900 text-white p-4 rounded">
              <div className="flex gap-8 flex-wrap">
                <div>
                  <div className="text-sm text-gray-300">SUBTOTAL</div>
                  <div className="text-xl font-bold">{currency} {(companyCurrencyTotal || total).toFixed(2)}</div>
                  {currency !== 'USD' && usdTotal !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">USD {usdTotal.toFixed(2)}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-300">TOTAL</div>
                  <div className="text-2xl font-bold">{currency} {(companyCurrencyTotal || total).toFixed(2)}</div>
                  {currency !== 'USD' && usdTotal !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">USD {usdTotal.toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">Payment Link</div>
              {paymentLink ? (
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-blue-600 break-words hover:underline"
                >
                  {paymentLink}
                </a>
              ) : (
                <div className="text-sm text-gray-500">No payment link configured yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            <div className="bg-gray-50 p-4 rounded border border-gray-300 whitespace-pre-wrap text-gray-700">
              {notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <p className="text-sm text-gray-600">
            Thank you for considering our proposal. Please contact us to discuss further.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Terms & Conditions:</p>
            <ul className="list-disc list-inside mt-2">
              <li>50% deposit required to begin the project</li>
              <li>Balance due upon project completion</li>
              <li>Timeline begins after deposit is received</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
