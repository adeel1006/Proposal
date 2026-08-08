// Note: html2pdf.js is loaded via script tag in layout.tsx
// This file only contains helper functions to generate HTML for PDF

export type ClientPdfFactory = () => ClientPdfFactoryInstance;

type ClientPdfFactoryInstance = {
  set: (options: Record<string, unknown>) => ClientPdfFactoryInstance;
  from: (element: HTMLElement) => ClientPdfFactoryInstance;
  outputPdf: (outputType: "dataurlstring") => Promise<string>;
};

export async function generatePdfBase64(
  html2pdf: ClientPdfFactory,
  htmlContent: string,
  filename: string,
): Promise<string> {
  const element = document.createElement("div");
  element.innerHTML = htmlContent;
  // html2canvas can return a blank canvas for elements positioned far outside
  // the viewport. Keep the temporary document inside the capture area and
  // remove it immediately after html2pdf finishes.
  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = "190mm";
  element.style.zIndex = "2147483647";
  element.style.pointerEvents = "none";
  document.body.appendChild(element);
  const captureElement =
    element.querySelector<HTMLElement>(".sheet, .proposal-sheet, .container") || element;

  let pdf: string;
  try {
    pdf = await html2pdf()
      .set({
        margin: 6,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(captureElement)
      .outputPdf("dataurlstring");
  } finally {
    element.remove();
  }
  const base64 = pdf.replace(/^data:application\/pdf;base64,/, "").trim();
  if (!base64) throw new Error(`Failed to generate ${filename}.`);
  return base64;
}

export function generateProposalHTML(
  proposal: {
    id: string;
    clientName: string;
    projectTitle: string;
    projectDescription?: string;
    clientEmail?: string;
    clientPhoneNumber?: string;
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
  const escapeHtml = (value: string | undefined | null) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  return `
    <style>
      * { box-sizing: border-box; }
      .proposal-sheet { width: 186mm; max-width: 100%; margin: 0; padding: 0 5mm 6mm; background: #fff; color: #1e293b; font-family: Arial, sans-serif; line-height: 1.45; }
      .proposal-accent { height: 3mm; margin: 0 0 13px; background: #0b1f4d; }
      .proposal-header { display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; }
      .proposal-logo { max-width: 145px; max-height: 56px; margin-bottom: 8px; object-fit: contain; }
      .proposal-company { color: #0b1f4d; font-size: 21px; font-weight: 800; }
      .proposal-contact { margin-top: 5px; color: #52627a; font-size: 10px; line-height: 1.55; }
      .proposal-label { color: #174ea6; font-size: 28px; font-weight: 800; letter-spacing: .06em; text-align: right; }
      .proposal-id { margin-top: 6px; color: #64748b; font-size: 10px; text-align: right; }
      .proposal-rule { border: 0; border-top: 1px solid #d8e0ec; margin: 21px 0 18px; }
      .proposal-meta { display: flex; gap: 14px; margin-bottom: 18px; }
      .meta-card { flex: 1; min-width: 0; padding: 10px; border: 1px solid #c8d5e8; border-radius: 7px; background: #f5f8fd; }
      .meta-label { margin-bottom: 4px; color: #174ea6; font-size: 9px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
      .meta-value { color: #172033; font-size: 11px; font-weight: 700; overflow-wrap: anywhere; }
      .section-title { margin: 20px 0 8px; color: #0b1f4d; font-size: 15px; font-weight: 800; }
      .overview { padding: 12px; border-left: 4px solid #174ea6; background: #edf3fc; color: #475569; font-size: 10px; line-height: 1.55; }
      .scope-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .scope-table th { padding: 9px 8px; background: #0b1f4d; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
      .scope-table td { padding: 10px 8px; border-bottom: 1px solid #e1e8f1; color: #475569; font-size: 9px; vertical-align: top; overflow-wrap: anywhere; }
      .scope-table td strong { color: #172033; font-size: 10px; }
      .scope-table .number { text-align: right; white-space: nowrap; }
      .investment { width: 245px; margin: 18px 0 0 auto; }
      .investment-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; font-size: 10px; }
      .investment-total { margin-top: 5px; padding: 10px 0; border-top: 2px solid #174ea6; border-bottom: 2px solid #174ea6; color: #0b1f4d; font-size: 15px; font-weight: 800; }
      .terms-grid { display: flex; gap: 12px; }
      .term-card { flex: 1; min-width: 0; padding: 11px; border: 1px solid #d8e0ec; border-radius: 7px; background: #fff; font-size: 10px; color: #52627a; }
      .term-card strong { display: block; margin-bottom: 4px; color: #174ea6; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
      .notes { margin-top: 16px; padding: 12px; border-left: 4px solid #174ea6; background: #edf3fc; color: #475569; font-size: 10px; line-height: 1.55; }
      .resources { margin-top: 16px; padding: 11px; border: 1px solid #d8e0ec; border-radius: 7px; color: #52627a; font-size: 9px; }
      .resource { margin-top: 5px; overflow-wrap: anywhere; }
      .proposal-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d8e0ec; color: #718096; font-size: 9px; text-align: center; }
      tr, .overview, .term-card, .notes, .resources { break-inside: avoid; page-break-inside: avoid; }
    </style>
    <div class="proposal-sheet">
      <div class="proposal-accent"></div>
      <div class="proposal-header"><div>
        ${company.logo ? `<img class="proposal-logo" src="${company.logo}" alt="${escapeHtml(company.businessName)} logo">` : ""}
        <div class="proposal-company">${escapeHtml(company.businessName)}</div>
        <div class="proposal-contact">${escapeHtml(company.email)}${company.mobileNumber ? `<br>${escapeHtml(company.mobileNumber)}` : ""}${company.address ? `<br>${escapeHtml(company.address)}` : ""}${company.website ? `<br>${escapeHtml(company.website)}` : ""}</div>
      </div><div><div class="proposal-label">PROPOSAL</div><div class="proposal-id">Proposal #${escapeHtml(proposal.id)}<br>${new Date().toLocaleDateString()}</div></div></div>
      <hr class="proposal-rule">
      <div class="proposal-meta"><div class="meta-card"><div class="meta-label">Prepared for</div><div class="meta-value">${escapeHtml(proposal.clientName)}</div></div><div class="meta-card"><div class="meta-label">Project</div><div class="meta-value">${escapeHtml(proposal.projectTitle)}</div></div><div class="meta-card"><div class="meta-label">Valid until</div><div class="meta-value">${escapeHtml(proposal.validUntil || "Further notice")}</div></div></div>
      ${proposal.projectDescription ? `<div class="section-title">Project Overview</div><div class="overview">${escapeHtml(proposal.projectDescription).replace(/\r?\n/g, "<br>")}</div>` : ""}
      <div class="section-title">Scope of Work</div>
      <table class="scope-table"><thead><tr><th style="width:44%">Service</th><th style="width:48%">Deliverables</th><th style="width:8%">Qty</th></tr></thead><tbody>${selectedItems.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.description)}</td><td class="number">${item.quantity}</td></tr>`).join("")}</tbody></table>
      <div class="section-title">Project Terms</div><div class="terms-grid"><div class="term-card"><strong>Timeline</strong>${escapeHtml(proposal.terms?.timeline || "To be agreed")}</div><div class="term-card"><strong>Payment</strong>${proposal.terms?.depositPercent ? `${proposal.terms.depositPercent}% deposit required` : "As agreed"}</div></div>
      ${proposal.notes ? `<div class="notes"><strong>Additional Notes</strong><br>${escapeHtml(proposal.notes).replace(/\r?\n/g, "<br>")}</div>` : ""}
      ${proposal.terms?.additionalTerms ? `<div class="notes"><strong>Terms &amp; Conditions</strong><br>${escapeHtml(proposal.terms.additionalTerms).replace(/\r?\n/g, "<br>")}</div>` : ""}
      ${proposal.attachments?.length ? `<div class="resources"><strong>Reference Links</strong>${proposal.attachments.map((attachment) => `<div class="resource">${escapeHtml(attachment.label)}: ${escapeHtml(attachment.url)}</div>`).join("")}</div>` : ""}
      <div class="proposal-footer">Thank you for considering ${escapeHtml(company.businessName)}. We look forward to working with you.</div>
    </div>`;
}

export function generateInvoiceHTML(
  proposal: {
    id: string;
    clientName: string;
    projectTitle: string;
    projectDescription?: string;
    clientEmail?: string;
    clientPhoneNumber?: string;
    validUntil?: string;
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
  }>,
): string {
  const currency = company.currency || "USD";
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const depositPercent = proposal.terms?.depositPercent || 0;
  const deposit = subtotal * (depositPercent / 100);
  const escapeHtml = (value: string | undefined | null) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #fff; color: #172033; font-family: Arial, sans-serif; }
      .sheet { width: 186mm; max-width: 100%; margin: 0; padding: 0 5mm 6mm; background: #fff; }
      .topbar { height: 3mm; margin: 0 0 13px; background: #0b1f4d; }
      .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
      .logo { max-width: 145px; max-height: 56px; object-fit: contain; margin-bottom: 10px; }
      .company { font-size: 21px; font-weight: 800; color: #0b1f4d; }
      .company-info { margin-top: 6px; color: #52627a; font-size: 10px; line-height: 1.55; }
      .invoice-label { text-align: right; color: #174ea6; font-size: 28px; font-weight: 800; letter-spacing: .06em; }
      .invoice-number { margin-top: 8px; color: #64748b; text-align: right; font-size: 11px; }
      .rule { border: 0; border-top: 1px solid #d8e0ec; margin: 24px 0 20px; }
      .details { display: flex; gap: 16px; margin-bottom: 22px; }
      .detail { flex: 1; min-width: 0; padding: 12px; border: 1px solid #c8d5e8; border-radius: 7px; background: #f5f8fd; }
      .detail-label { margin-bottom: 5px; color: #174ea6; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
      .detail-value { color: #172033; font-size: 13px; font-weight: 700; line-height: 1.5; }
      .detail-subvalue { margin-top: 4px; color: #64748b; font-size: 11px; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; }
      th { padding: 9px 8px; background: #0b1f4d; color: #fff; font-size: 9px; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
      th:last-child, td:last-child { text-align: right; }
      td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; color: #334155; font-size: 9px; vertical-align: top; }
      td strong { color: #111827; font-size: 11px; }
      .description { margin-top: 3px; color: #64748b; font-size: 9px; line-height: 1.35; }
      .summary { width: 250px; margin: 20px 0 0 auto; }
      .summary-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; font-size: 11px; }
      .summary-total { margin-top: 6px; padding: 10px 0; border-top: 2px solid #174ea6; border-bottom: 2px solid #174ea6; color: #0b1f4d; font-size: 16px; font-weight: 800; }
      .note { margin-top: 22px; padding: 12px; border-left: 4px solid #174ea6; background: #edf3fc; color: #475569; font-size: 10px; line-height: 1.5; }
      .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #d8e0ec; color: #718096; font-size: 9px; line-height: 1.5; text-align: center; }
    </style></head><body><div class="sheet">
      <div class="topbar"></div>
      <div class="header"><div>
        ${company.logo ? `<img class="logo" src="${company.logo}" alt="${escapeHtml(company.businessName)} logo">` : ""}
        <div class="company">${escapeHtml(company.businessName)}</div>
        <div class="company-info">${escapeHtml(company.email)}${company.mobileNumber ? `<br>${escapeHtml(company.mobileNumber)}` : ""}${company.address ? `<br>${escapeHtml(company.address)}` : ""}${company.website ? `<br>${escapeHtml(company.website)}` : ""}</div>
      </div><div><div class="invoice-label">INVOICE</div><div class="invoice-number">Invoice #${escapeHtml(proposal.id)}<br>${new Date().toLocaleDateString()}</div></div></div>
      <hr class="rule">
      <div class="details"><div class="detail"><div class="detail-label">Bill To</div><div class="detail-value">${escapeHtml(proposal.clientName)}</div><div class="detail-subvalue">${escapeHtml(proposal.clientEmail)}${proposal.clientPhoneNumber ? `<br>${escapeHtml(proposal.clientPhoneNumber)}` : ""}</div></div><div class="detail"><div class="detail-label">Project</div><div class="detail-value">${escapeHtml(proposal.projectTitle)}</div><div class="detail-subvalue">Payment terms: ${depositPercent ? `${depositPercent}% deposit` : "As agreed"}${proposal.validUntil ? `<br>Valid until: ${escapeHtml(proposal.validUntil)}` : ""}</div></div></div>
      <table><thead><tr><th style="width:48%">Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${selectedItems.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong><div class="description">${escapeHtml(item.description)}</div></td><td>${item.quantity}</td><td>${currency} ${item.price.toFixed(2)}</td><td>${currency} ${(item.price * item.quantity).toFixed(2)}</td></tr>`).join("")}</tbody></table>
      <div class="summary"><div class="summary-row"><span>Subtotal</span><span>${currency} ${subtotal.toFixed(2)}</span></div>${depositPercent ? `<div class="summary-row"><span>Deposit (${depositPercent}%)</span><span>${currency} ${deposit.toFixed(2)}</span></div>` : ""}<div class="summary-row summary-total"><span>Total</span><span>${currency} ${subtotal.toFixed(2)}</span></div></div>
      ${proposal.terms?.additionalTerms ? `<div class="note"><strong>Payment &amp; terms</strong><br>${escapeHtml(proposal.terms.additionalTerms).replace(/\r?\n/g, "<br>")}</div>` : ""}
      <div class="footer">Thank you for choosing ${escapeHtml(company.businessName)}.<br>This invoice was prepared for the project listed above.</div>
    </div></body></html>`;
}
