import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/emailService';
import { Proposal, ProposalItem, CompanyBranding } from '@/app/lib/proposalTypes';
import { getSupabaseAdminClient } from '@/lib/supabase';

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
    const { customerEmail, customerName, proposal, company, items, paymentLink, proposalId } = body as {
      customerEmail: string;
      customerName: string;
      proposal: Proposal;
      company: CompanyBranding;
      items: ProposalItem[];
      paymentLink?: string;
      proposalId?: string;
    };

    if (!customerEmail || !customerName || !proposal || !company) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let pdfBase64 = body.pdfBase64;

    // If resending, fetch the PDF from the database
    if (proposalId && !pdfBase64) {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('proposals')
        .select('pdf_base64')
        .eq('id', proposalId)
        .single();

      if (error || !data?.pdf_base64) {
        return NextResponse.json(
          { success: false, error: 'PDF not found for resend' },
          { status: 404 }
        );
      }

      pdfBase64 = data.pdf_base64;
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'PDF not provided' },
        { status: 400 }
      );
    }

    try {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from('proposals')
        .upsert(
          {
            id: proposal.id,
            company_id: proposal.companyId || null,
            client_name: proposal.clientName,
            client_email: proposal.clientEmail || customerEmail,
            project_title: proposal.projectTitle,
            status: 'submitted',
            pdf_base64: pdfBase64,
            submitted_at: new Date().toISOString(),
            items: items, // Store items
            company: company, // Store company
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
        console.log('📧 [DEMO MODE] Proposal:', proposal.projectTitle);
        console.log('📧 [DEMO MODE] Client:', customerName);
        return NextResponse.json({
          success: true,
          message: `✅ [DEMO MODE] Proposal ready to send to ${customerEmail}. Configure SMTP in .env.local to send real emails.`,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Email service not configured. Set SMTP credentials in .env.local for production.' },
        { status: 500 }
      );
    }

    await sendProposalEmail(customerEmail, customerName, proposal, company, items, paymentLink, {
      appUrl,
    });

    return NextResponse.json({
      success: true,
      message: `Proposal sent to ${customerEmail}`,
    });
  } catch (error) {
    console.error('Error sending proposal:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to send proposal';
    
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
