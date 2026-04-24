import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import type { Proposal, ProposalItem, CompanyBranding } from "@/app/lib/proposalTypes";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

if (process.env.NODE_ENV === "development" && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP connection error:", error.message);
    } else {
      console.log("SMTP server is ready to send emails");
    }
  });
}

function resolveLogo(company: CompanyBranding) {
  if (!company.logo) {
    return { logoSrc: "", logoAttachment: null as Attachment | null };
  }

  const dataUriMatch = company.logo.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!dataUriMatch) {
    return { logoSrc: company.logo, logoAttachment: null as Attachment | null };
  }

  const mimeType = dataUriMatch[1];
  const base64Data = dataUriMatch[2];
  const extension = mimeType.split("/")[1] || "png";
  const logoCid = "company-logo@proposal";

  return {
    logoSrc: `cid:${logoCid}`,
    logoAttachment: {
      filename: `company-logo.${extension}`,
      content: Buffer.from(base64Data, "base64"),
      contentType: mimeType,
      cid: logoCid,
      contentDisposition: "inline",
    } as Attachment,
  };
}

function buildEmailHtml(
  customerName: string,
  customerEmail: string,
  proposal: Proposal,
  company: CompanyBranding,
  selectedItems: ProposalItem[],
  subtotal: number,
  logoSrc: string
) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const query = `proposalId=${encodeURIComponent(proposal.id)}&email=${encodeURIComponent(customerEmail)}`;
  const pdfLink = `${appUrl}/api/proposals/generate-pdf?${query}`;
  const acceptLink = `${appUrl}/api/proposals/accept?${query}`;
  const declineLink = `${appUrl}/api/proposals/decline?${query}`;
  const validUntilText =
    proposal.validUntil ||
    new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString();

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Proposal</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Inter, Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 28px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff;">
              ${logoSrc ? `<img src="${logoSrc}" alt="${company.businessName} logo" style="max-height: 64px; max-width: 180px; display: block; margin-bottom: 14px;" />` : ""}
              <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">Project Proposal</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.92;">${company.businessName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 14px 0;">Hello ${customerName},</p>
              <p style="margin: 0 0 20px 0; color: #334155;">
                Please review your proposal for <strong>${proposal.projectTitle}</strong>. You can download the PDF, accept and continue to payment, or decline.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 16px; width: 33.33%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Proposal ID</div>
                    <div style="font-size: 14px; font-weight: 600; word-break: break-word;">${proposal.id}</div>
                  </td>
                  <td style="padding: 14px 16px; width: 33.33%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Client</div>
                    <div style="font-size: 14px; font-weight: 600;">${proposal.clientName}</div>
                  </td>
                  <td style="padding: 14px 16px; width: 33.33%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Valid Until</div>
                    <div style="font-size: 14px; font-weight: 600;">${validUntilText}</div>
                  </td>
                </tr>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0;">Service</th>
                    <th style="text-align: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">Qty</th>
                    <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedItems
                    .map(
                      (item) => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong>${item.name}</strong><br />
                        <span style="font-size: 12px; color: #64748b;">${item.description}</span>
                      </td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity || 1}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${company.currency || "USD"} ${(item.price * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>

              <div style="text-align: right; margin-bottom: 22px;">
                <div style="font-size: 13px; color: #64748b;">Total</div>
                <div style="font-size: 24px; font-weight: 700;">${company.currency || "USD"} ${subtotal.toFixed(2)}</div>
              </div>

              <table style="width: 100%; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px; text-align: center;">
                    <a href="${pdfLink}" style="display: inline-block; padding: 10px 16px; background: #475569; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">Download PDF</a>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <a href="${acceptLink}" style="display: inline-block; padding: 10px 16px; background: #059669; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept and Pay</a>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <a href="${declineLink}" style="display: inline-block; padding: 10px 16px; background: #dc2626; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">Decline</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">
                Set <strong>PROPOSAL_PAYMENT_LINK</strong> in environment to define your payment destination.
              </p>

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
                <div><strong>${company.businessName}</strong></div>
                ${company.email ? `<div>${company.email}</div>` : ""}
                ${company.mobileNumber ? `<div>${company.mobileNumber}</div>` : ""}
                ${company.address ? `<div>${company.address}</div>` : ""}
                ${company.website ? `<div>${company.website}</div>` : ""}
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendProposalEmail(
  customerEmail: string,
  customerName: string,
  proposal: Proposal,
  company: CompanyBranding,
  items: ProposalItem[],
  options?: { forceFromName?: string; forceReplyTo?: string }
) {
  const selectedItems = items.filter((item) => proposal.selectedItems.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const { logoSrc, logoAttachment } = resolveLogo(company);
  const emailBody = buildEmailHtml(
    customerName,
    customerEmail,
    proposal,
    company,
    selectedItems,
    subtotal,
    logoSrc
  );

  const attachments: Attachment[] = [];

  if (logoAttachment) {
    attachments.push(logoAttachment);
  }

  // Dynamic company-based sender configuration
  const smtpUser = process.env.SMTP_USER;
  const fromName = options?.forceFromName || company.businessName;
  
  // Use replyToEmail if explicitly set, otherwise use company.email
  const replyToEmail = options?.forceReplyTo || company.replyToEmail || company.email;

  // Format: "Company Name <shared-smtp-email@domain.com>"
  const fromAddress = smtpUser ? `${fromName} <${smtpUser}>` : fromName;

  const mailOptions = {
    from: fromAddress,
    to: customerEmail,
    replyTo: replyToEmail || smtpUser, // Clients reply goes to company email
    subject: `Proposal: ${proposal.projectTitle} - ${company.businessName}`,
    html: emailBody,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}
