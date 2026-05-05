'use client';

import { ProposalAttachment, ProposalItem, CompanyBranding } from '@/app/lib/proposalTypes';

interface ClientProposalViewProps {
  clientName: string;
  clientEmail?: string;
  clientPhoneNumber?: string;
  projectTitle: string;
  projectDescription?: string;
  selectedItems: string[];
  items: ProposalItem[];
  attachments?: ProposalAttachment[];
  notes?: string;
  proposalDate?: string;
  createdAt?: string;
  company?: CompanyBranding;
  terms?: {
    depositPercent?: number;
    timeline?: string;
    additionalTerms?: string;
  };
  onAccept?: () => void;
  onReject?: () => void;
}

export default function ClientProposalView({
  clientName,
  clientEmail,
  clientPhoneNumber,
  projectTitle,
  projectDescription,
  selectedItems,
  items,
  attachments = [],
  notes,
  proposalDate,
  company,
  terms,
  onAccept,
  onReject,
}: ClientProposalViewProps) {
  const selectedItemsList = items.filter((i) => selectedItems.includes(i.id));
  const total = selectedItemsList.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const formatDate = (date: string | undefined): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons - No Print */}
        <div className="mb-6 flex gap-3 no-print">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-blue-600 !text-white rounded hover:bg-blue-700"
          >
            📄 Print / Save as PDF
          </button>
          {onAccept && (
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ✅ Accept Proposal
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ❌ Decline
            </button>
          )}
        </div>

        {/* Proposal Content */}
        <div className="bg-white p-8 rounded-lg shadow print:shadow-none print:p-0 print:rounded-none">
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-6 mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">PROJECT PROPOSAL</div>
            <div className="text-sm text-gray-600" suppressHydrationWarning>
              Proposal Date: {formatDate(proposalDate)}
            </div>
          </div>

          {/* From & To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                From
              </div>
              {company?.logo && (
                <img src={company.logo} alt={company.businessName} className="h-12 mb-2 rounded" />
              )}
              <div className="font-semibold text-gray-900">{company?.businessName || 'Your Company'}</div>
              <div className="text-sm text-gray-600">{company?.email || 'company@example.com'}</div>
              {company?.mobileNumber && (
                <div className="text-sm text-gray-600">{company.mobileNumber}</div>
              )}
              {company?.address && (
                <div className="text-sm text-gray-600 mt-2">{company.address}</div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                To
              </div>
              <div className="font-semibold text-gray-900">{clientName}</div>
              {clientEmail && <div className="text-sm text-gray-600">{clientEmail}</div>}
              {clientPhoneNumber && <div className="text-sm text-gray-600">{clientPhoneNumber}</div>}
            </div>
          </div>

          {/* Project Title & Description */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{projectTitle}</h1>
            {projectDescription && (
              <p className="text-gray-700 whitespace-pre-wrap">{projectDescription}</p>
            )}
          </div>

          {/* Services Table */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services Included</h2>
            <table className="w-full mb-4 border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Service</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedItemsList.length > 0 ? (
                  selectedItemsList.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 px-2 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-2 text-gray-600 text-sm">{item.description}</td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900">
                        {item.currency || 'USD'} {item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-900">
                        {item.quantity || 1}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900">
                        {item.currency || 'USD'} {(item.price * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
                      No services included in this proposal
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end mb-6">
              <div className="bg-gray-900 text-white p-6 rounded">
                <div className="flex gap-8">
                  <div>
                    <div className="text-sm text-gray-300">SUBTOTAL</div>
                    <div className="text-2xl font-bold">
                      {selectedItemsList[0]?.currency || 'USD'} {total.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">TOTAL</div>
                    <div className="text-3xl font-bold">
                      {selectedItemsList[0]?.currency || 'USD'} {total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="rounded border border-gray-200 bg-gray-50 p-4">
                    <div className="font-medium text-gray-900">{attachment.label}</div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
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
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-300 whitespace-pre-wrap text-gray-700">
                {notes}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="mb-8 border-t-2 border-gray-300 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>

            <ul className="space-y-3 text-gray-700">
              {terms?.depositPercent && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>{terms.depositPercent}% deposit</strong> required to begin the project
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Balance due upon project completion</span>
              </li>
              {terms?.timeline && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{terms.timeline}</span>
                </li>
              )}
              {terms?.additionalTerms && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{terms.additionalTerms}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-6 mt-8">
            <p className="text-sm text-gray-600 mb-4">
              Thank you for considering our proposal. Please contact us if you have any questions.
            </p>
            <div className="text-xs text-gray-500">
              <p className="font-semibold mb-2">For questions, reach out:</p>
              <p>{company?.email || 'company@example.com'}</p>
              {company?.mobileNumber && <p>{company.mobileNumber}</p>}
              {company?.whatsapp && (
                <p>
                  WhatsApp:{' '}
                  <a
                    href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.whatsapp}
                  </a>
                </p>
              )}
              {company?.website && (
                <p>
                  🌐 {' '}
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </p>
              )}
              {company?.registrationNumber && (
                <p className="mt-2">Reg. Number: {company.registrationNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Bottom) - No Print */}
        <div className="mt-6 flex gap-3 no-print">
          <button
            onClick={handlePrintPDF}
            className="flex-1 px-4 py-3 bg-blue-600 !text-white rounded hover:bg-blue-700 font-semibold"
          >
            📄 Print / Save as PDF
          </button>
          {onAccept && (
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              ✅ Accept Proposal
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
            >
              ❌ Decline
            </button>
          )}
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
        }
      `}</style>
    </div>
  );
}
