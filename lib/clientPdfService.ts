// Note: html2pdf.js is loaded via script tag in layout.tsx
// This file only contains helper functions to generate HTML for PDF

export function generateProposalHTML(
  proposal: {
    id: string;
    clientName: string;
    projectTitle: string;
    notes?: string;
    validUntil?: string;
    attachments?: Array<{ id: string; label: string; url: string }>;
    terms?: { depositPercent?: number; timeline?: string; additionalTerms?: string };
  },
  company: {
    businessName: string;
    email?: string;
    mobileNumber?: string;
    address?: string;
    website?: string;
    currency?: string;
    logo?: string;
  },
  selectedItems: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
  }>
): string {
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.6; background: white; }
          .container { max-width: 850px; margin: 0 auto; padding: 40px; }
          .header { margin-bottom: 40px; }
          .company-name { font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .company-info { font-size: 12px; color: #475569; line-height: 1.5; }
          .proposal-title { font-size: 28px; font-weight: bold; color: #0f172a; margin: 30px 0 10px; }
          .proposal-meta { display: flex; gap: 40px; margin: 20px 0 30px; font-size: 12px; }
          .meta-item { flex: 1; }
          .meta-label { color: #475569; font-weight: bold; margin-bottom: 3px; }
          .meta-value { color: #111; }
          .services-title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 30px 0 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead { background: #f8fafc; }
          th { border-bottom: 2px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; font-size: 12px; color: #0f172a; }
          td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 12px; }
          .price { text-align: right; }
          .total-section { margin-top: 30px; display: flex; justify-content: flex-end; }
          .totals { width: 300px; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 12px; }
          .total-row.grand { border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; font-size: 14px; font-weight: bold; }
          .notes { margin-top: 30px; padding: 15px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px; font-size: 12px; color: #475569; }
          .attachments { margin-top: 30px; }
          .attachment-card { margin-bottom: 12px; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: #f8fafc; }
          .attachment-label { font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
          .attachment-link { font-size: 12px; color: #2563eb; word-break: break-all; text-decoration: underline; }
          .terms { margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 11px; white-space: pre-wrap; color: #475569; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${company.logo ? `
              <img src="${company.logo}" alt="${company.businessName} Logo" style="max-width: 150px; max-height: 80px; margin-bottom: 15px; object-fit: contain;">
            ` : ''}
            <div class="company-name">${company.businessName}</div>
            <div class="company-info">
              ${company.email ? `Email: ${company.email}<br>` : ''}
              ${company.mobileNumber ? `Phone: ${company.mobileNumber}<br>` : ''}
              ${company.address ? `Address: ${company.address}<br>` : ''}
              ${company.website ? `Website: ${company.website}<br>` : ''}
            </div>
          </div>

          <h1 class="proposal-title">PROPOSAL</h1>
          
          <div class="proposal-meta">
            <div class="meta-item">
              <div class="meta-label">Proposal ID</div>
              <div class="meta-value">${proposal.id}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Client</div>
              <div class="meta-value">${proposal.clientName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Project</div>
              <div class="meta-value">${proposal.projectTitle}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Date</div>
              <div class="meta-value">${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <h2 class="services-title">Services</h2>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Description</th>
                <th class="price">Qty</th>
                <th class="price">Unit Price</th>
                <th class="price">Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedItems.map(item => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.description}</td>
                  <td class="price">${item.quantity}</td>
                  <td class="price">${company.currency || 'USD'} ${item.price.toFixed(2)}</td>
                  <td class="price">${company.currency || 'USD'} ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${proposal.attachments && proposal.attachments.length > 0 ? `
            <div class="attachments">
              <h2 class="services-title">Attachments</h2>
              ${proposal.attachments.map((attachment) => `
                <div class="attachment-card">
                  <div class="attachment-label">${attachment.label}</div>
                  <div class="attachment-link">${attachment.url}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="total-section">
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${company.currency || 'USD'} ${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row grand">
                <span>TOTAL:</span>
                <span>${company.currency || 'USD'} ${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${proposal.notes ? `
            <div class="notes">
              <strong>Notes:</strong><br>
              ${proposal.notes}
            </div>
          ` : ''}

          ${proposal.terms?.additionalTerms ? `
            <div class="terms">
              <strong>Terms & Conditions:</strong><br><br>
              ${proposal.terms.additionalTerms}
            </div>
          ` : ''}

          <div class="footer">
            <p>This proposal is valid until ${proposal.validUntil || 'further notice'}.</p>
            <p style="margin-top: 10px;">Thank you for your business!</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
