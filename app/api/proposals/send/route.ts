import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/emailService';
import { Proposal, ProposalItem, CompanyBranding } from '@/app/lib/proposalTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerEmail, customerName, proposal, company, items } = body as {
      customerEmail: string;
      customerName: string;
      proposal: Proposal;
      company: CompanyBranding;
      items: ProposalItem[];
    };

    if (!customerEmail || !customerName || !proposal || !company) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, we'll generate the PDF on the client and send it as base64
    // In a production app, you'd generate the PDF server-side
    const pdfBase64 = body.pdfBase64;
    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'PDF not provided' },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

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

    await sendProposalEmail(customerEmail, customerName, proposal, company, items, pdfBuffer);

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
