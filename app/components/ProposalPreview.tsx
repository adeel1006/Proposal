'use client';

import { CompanyBranding, ProposalAttachment, ProposalItem } from '@/app/lib/proposalTypes';

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
  attachments?: ProposalAttachment[];
  usdTotal?: number;
  companyCurrencyTotal?: number;
  company?: CompanyBranding | null;
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
  attachments = [],
  usdTotal,
  companyCurrencyTotal,
  company,
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
      {/* <div className="flex flex-wrap gap-2 no-print">
        <button
          onClick={handlePrintPDF}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-slate-800"
        >
          📄 Print / Save as PDF
        </button>
        {showDownloadHtml && (
          <button
            onClick={handleDownloadHTML}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            ⬇️ Download HTML
          </button>
        )}
      </div> */}

      {/* Proposal Content */}
      <div
        id="proposal-content"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none print:p-0"
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50 px-8 py-6">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Proposal Document
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">Project Proposal</div>
          <div className="mt-2 text-sm text-slate-500" suppressHydrationWarning>
            Date: {formatDate(undefined)}
            {validUntil && ` | Valid Until: ${formatDate(validUntil)}`}
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-8 px-8 py-8">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              From
            </div>
            <div className="text-lg font-semibold text-slate-900">{company?.businessName || 'Your Company'}</div>
            <div className="text-sm text-slate-600">{company?.email || 'company@example.com'}</div>
            {company?.mobileNumber && <div className="text-sm text-slate-600">{company.mobileNumber}</div>}
            {company?.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-blue-600 break-all hover:underline"
              >
                {company.website}
              </a>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              To
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {clientName || 'Client Name'}
            </div>
            <div className="text-sm text-slate-600">{projectTitle || 'Project Title'}</div>
          </div>
        </div>

        {/* Project Title */}
        {projectTitle && (
          <div className="px-8 pb-2">
            <h1 className="mb-2 text-2xl font-semibold text-slate-900">{projectTitle}</h1>
            <p className="text-slate-600">For: {clientName || 'Client'}</p>
          </div>
        )}

        {/* Services */}
        <div className="px-8 pb-2">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Services Included
          </div>
          <table className="mb-4 w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-semibold text-slate-600">Service</th>
                <th className="py-2 text-left font-semibold text-slate-600">Description</th>
                <th className="py-2 text-right font-semibold text-slate-600">Price</th>
              </tr>
            </thead>
            <tbody>
              {selectedItemsList.length > 0 ? (
                selectedItemsList.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="py-3 text-sm text-slate-600">{item.description}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {item.currency} {(item.price * (item.quantity || 1)).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-500">
                    No services selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total */}
          <div className="mt-6 flex flex-col gap-4 pb-2">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex flex-wrap gap-8">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Subtotal</div>
                  <div className="text-xl font-semibold">{currency} {(companyCurrencyTotal || total).toFixed(2)}</div>
                  {currency !== 'USD' && usdTotal !== undefined && (
                    <div className="mt-1 text-xs text-slate-300">USD {usdTotal.toFixed(2)}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Total</div>
                  <div className="text-2xl font-semibold">{currency} {(companyCurrencyTotal || total).toFixed(2)}</div>
                  {currency !== 'USD' && usdTotal !== undefined && (
                    <div className="mt-1 text-xs text-slate-300">USD {usdTotal.toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Link</div>
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

        {attachments.length > 0 && (
          <div className="px-8 pb-2">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Attachments</div>
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">{attachment.label}</div>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 block break-all text-sm text-blue-600 hover:underline"
                  >
                    {attachment.url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="px-8 pb-2">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Additional Notes</div>
            <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              {notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 px-8 py-6">
          <p className="text-sm text-slate-600">
            Thank you for considering our proposal. Please contact us to discuss further.
          </p>
          {company?.website && (
            <p className="mt-3 text-sm text-slate-600">
              🌐 {' '}
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 hover:underline break-all"
              >
                {company.website}
              </a>
            </p>
          )}
          <div className="mt-4 text-xs text-slate-500">
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
