import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/emailService';
import { generateProfessionalPdfs } from '@/lib/serverPdfService';
import { formatInvoiceId, formatReadableId, slugifyIdSegment } from '@/lib/readableIds';
import {
  Proposal,
  ProposalItem,
  CompanyBranding,
  normalizeProposalAttachments,
  CustomerDetails,
  validateProposalAttachments,
} from '@/app/lib/proposalTypes';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function isLocalOrigin(value: string) {
  return value.includes('localhost') || value.includes('127.0.0.1');
}

function resolveAppUrl(request: NextRequest) {
  const envAppUrl = process.env.APP_URL?.trim();
  const requestOrigin = request.nextUrl.origin;

  if (envAppUrl && !isLocalOrigin(envAppUrl)) {
    return envAppUrl.replace(/\/$/, '');
  }

  if (requestOrigin && !isLocalOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, '');
  }

  return envAppUrl?.replace(/\/$/, '') || requestOrigin.replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const appUrl = resolveAppUrl(request);
    const { customerEmail, customerName, proposal, company, items, paymentLink, notesHeading, documentType } = body as {
      customerEmail: string;
      customerName: string;
      proposal: Proposal;
      company: CompanyBranding;
      items: ProposalItem[];
      paymentLink?: string;
      notesHeading?: string;
      documentType?: 'proposal' | 'invoice';
    };
    const resolvedDocumentType = documentType === 'invoice' ? 'invoice' : 'proposal';
    const resolvedPaymentLink = paymentLink?.trim() || proposal.paymentLink || '';
    const attachmentError = validateProposalAttachments(proposal.attachments);

    if (!customerEmail || !customerName || !proposal || !company) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (attachmentError) {
      return NextResponse.json(
        { success: false, error: attachmentError },
        { status: 400 }
      );
    }

    const normalizedProposal = {
      ...proposal,
      attachments: normalizeProposalAttachments(proposal.attachments),
    };

    let customerDetails: CustomerDetails = {
      name: customerName,
      email: proposal.clientEmail || customerEmail,
      phoneNumber: proposal.clientPhoneNumber || "",
    };
    const supabase = getSupabaseAdminClient();
    if (proposal.customerId) {
      const { data: customerRow } = await supabase
        .from("customers")
        .select("name, business_name, email, phone_number, business_website, required_service, notes")
        .eq("id", proposal.customerId)
        .maybeSingle();
      if (customerRow) {
        customerDetails = {
          name: customerRow.name || customerName,
          businessName: customerRow.business_name || "",
          email: customerRow.email || proposal.clientEmail || customerEmail,
          phoneNumber: customerRow.phone_number || proposal.clientPhoneNumber || "",
          businessWebsite: customerRow.business_website || "",
          requiredService: customerRow.required_service || "",
          notes: customerRow.notes || "",
        };
      }
    }

    let proposalId = proposal.id?.trim() || "";
    if (
      resolvedDocumentType === "invoice" &&
      (proposalId.toLowerCase().startsWith("prop-") || proposalId.toLowerCase().startsWith("inv-draft-"))
    ) {
      proposalId = "";
    }
    if (!proposalId) {
      const idPrefix = resolvedDocumentType === "invoice" ? "inv" : "prop";
      const label = proposal.clientName || proposal.projectTitle || resolvedDocumentType;
      const idPattern = resolvedDocumentType === "invoice"
        ? `inv-${new Date().getUTCFullYear()}-%`
        : `${idPrefix}-${slugifyIdSegment(label)}-%`;
      const { count } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .ilike("id", idPattern);
      proposalId = resolvedDocumentType === "invoice"
        ? formatInvoiceId((count || 0) + 1)
        : formatReadableId(idPrefix, label, (count || 0) + 1);
    }

    const proposalForDelivery = { ...normalizedProposal, id: proposalId };
    const pdfItems = Array.isArray(items) && items.length ? items : proposalForDelivery.items || [];
    const { pdfBase64, invoicePdfBase64 } = await generateProfessionalPdfs(
      proposalForDelivery,
      company,
      pdfItems,
      customerDetails,
    );

    try {
      let customerCreatedAt: string | null = null;
      if (proposal.customerId) {
        const { data: customerRow } = await supabase
          .from("customers")
          .select("created_at")
          .eq("id", proposal.customerId)
          .maybeSingle();
        customerCreatedAt = customerRow?.created_at || null;
      }
      await supabase
        .from('proposals')
        .upsert(
          {
            id: proposalId,
            company_id: proposal.companyId || null,
            customer_id: proposal.customerId || null,
            client_name: proposal.clientName,
            client_email: proposal.clientEmail || customerEmail,
            client_phone_number: proposal.clientPhoneNumber || null,
            project_title: proposal.projectTitle,
            project_description: proposal.projectDescription || null,
            selected_items: proposal.selectedItems || [],
            attachments: normalizedProposal.attachments,
            payment_link: resolvedPaymentLink || null,
            notes: proposal.notes || null,
            proposal_date: proposal.proposalDate || null,
            valid_until: proposal.validUntil || null,
            terms: proposal.terms || {},
            status: 'submitted',
            pdf_base64: pdfBase64,
            invoice_pdf_base64: invoicePdfBase64,
            submitted_at: new Date().toISOString(),
            items: pdfItems, // Store items
            company: company, // Store company
            customer_created_at: customerCreatedAt,
          },
          { onConflict: 'id' }
        );
    } catch (error) {
      console.error('Could not persist sent PDF to database:', error);
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      // If SMTP is not configured, return a demo success response for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEMO MODE] Email would be sent to:', customerEmail);
        console.log(`📧 [DEMO MODE] ${resolvedDocumentType === 'invoice' ? 'Invoice' : 'Proposal'}:`, proposal.projectTitle);
        console.log('📧 [DEMO MODE] Client:', customerName);
        return NextResponse.json({
          success: true,
          message: `✅ [DEMO MODE] ${resolvedDocumentType === 'invoice' ? 'Invoice' : 'Proposal'} ready to send to ${customerEmail}. Configure SMTP in .env.local to send real emails.`,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Email service not configured. Set SMTP credentials in .env.local for production.' },
        { status: 500 }
      );
    }

    await sendProposalEmail(
      customerEmail,
      customerName,
      proposalForDelivery,
      company,
      pdfItems,
      resolvedPaymentLink || undefined,
      {
        appUrl,
        notesHeading,
        pdfBase64,
        invoicePdfBase64,
        documentType: resolvedDocumentType,
        customerDetails,
      },
    );

    return NextResponse.json({
      success: true,
      message: `${resolvedDocumentType === 'invoice' ? 'Invoice' : 'Proposal'} sent to ${customerEmail}`,
      invoiceId: resolvedDocumentType === "invoice" ? proposalId : undefined,
    });
  } catch (error) {
    console.error('Error sending document:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to send document';
    
    if (error instanceof Error) {
      if (error.message.includes('Username and Password not accepted') || error.message.includes('EAUTH')) {
        errorMessage = 'Gmail Authentication Failed (Error 535). This means your SMTP credentials are wrong. Check SETUP.md for Gmail configuration - you likely need to use an App Password from https://myaccount.google.com/apppasswords instead of your Gmail password.';
      } else if (error.message.includes('connect ENOTFOUND') || error.message.includes('EHOSTUNREACH')) {
        errorMessage = 'Cannot connect to SMTP server. Check SMTP_HOST and SMTP_PORT in .env.local';
      } else if (error.message.includes('STARTTLS')) {
        errorMessage = 'SMTP connection error. Try setting SMTP_SECURE to false and SMTP_PORT to 587';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
