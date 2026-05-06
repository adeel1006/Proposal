import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/emailService';
import { getSupabaseAdminClient } from '@/lib/supabase';
import {
  normalizeProposalAttachments,
  type Proposal,
  type ProposalItem,
  type CompanyBranding,
} from '@/app/lib/proposalTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, paymentLink } = body as {
      proposalId: string;
      paymentLink?: string;
    };

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Fetch the proposal from database
    const { data: proposalData, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposalData) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Reconstruct the proposal object from database
    const proposal: Proposal = {
      id: proposalData.id,
      customerId: proposalData.customer_id || '',
      clientName: proposalData.client_name,
      clientEmail: proposalData.client_email || '',
      clientPhoneNumber: proposalData.client_phone_number || '',
      projectTitle: proposalData.project_title,
      projectDescription: proposalData.project_description || '',
      items: proposalData.items || [],
      selectedItems: proposalData.selected_items || [],
      companyId: proposalData.company_id || '',
      notes: proposalData.notes || '',
      attachments: normalizeProposalAttachments(proposalData.attachments),
      paymentLink: proposalData.payment_link || '',
      validUntil: proposalData.valid_until || '',
      terms: proposalData.terms || {},
    };

    const company: CompanyBranding = proposalData.company || {};
    const items: ProposalItem[] = proposalData.items || [];
    const resolvedPaymentLink =
      paymentLink?.trim() ||
      proposalData.payment_link ||
      proposal.paymentLink ||
      '';

    if (!proposalData.client_email || !proposalData.client_name) {
      return NextResponse.json(
        { success: false, error: 'Missing client email or name in proposal' },
        { status: 400 }
      );
    }

    if (!resolvedPaymentLink) {
      return NextResponse.json(
        { success: false, error: 'Payment URL is required to resend this proposal' },
        { status: 400 }
      );
    }

    if (resolvedPaymentLink !== proposalData.payment_link) {
      const { error: updatePaymentLinkError } = await supabase
        .from('proposals')
        .update({ payment_link: resolvedPaymentLink })
        .eq('id', proposalId);

      if (updatePaymentLinkError) {
        return NextResponse.json(
          { success: false, error: updatePaymentLinkError.message },
          { status: 500 }
        );
      }
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      // If SMTP is not configured, return a demo success response for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEMO MODE] Resending proposal to:', proposalData.client_email);
        console.log('📧 [DEMO MODE] Proposal:', proposalData.project_title);
        console.log('📧 [DEMO MODE] Client:', proposalData.client_name);
        return NextResponse.json({
          success: true,
          message: `✅ [DEMO MODE] Proposal resent to ${proposalData.client_email}. Configure SMTP in .env.local to send real emails.`,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Email service not configured. Set SMTP credentials in .env.local for production.' },
        { status: 500 }
      );
    }

    // Send the proposal email
    await sendProposalEmail(
      proposalData.client_email,
      proposalData.client_name,
      proposal,
      company,
      items,
      resolvedPaymentLink
    );

    return NextResponse.json({
      success: true,
      message: `Proposal resent to ${proposalData.client_email}`,
      paymentLink: resolvedPaymentLink,
    });
  } catch (error) {
    console.error('Error resending proposal:', error);

    let errorMessage = 'Failed to resend proposal';

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
