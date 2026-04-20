import nodemailer from 'nodemailer';
import type { Proposal, ProposalItem, CompanyBranding } from '@/app/lib/proposalTypes';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify transporter connection on startup (development only)
if (process.env.NODE_ENV === 'development' && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ SMTP Connection Error:', error.message);
      if (error.message.includes('Username and Password not accepted') || error.message.includes('EAUTH')) {
        console.error('   └─ This usually means your SMTP credentials are wrong.');
        console.error('   └─ For Gmail: Use an App Password, not your Gmail password.');
        console.error('   └─ See SETUP.md for detailed configuration instructions.');
      }
    } else {
      console.log('✅ SMTP server is ready to send emails');
    }
  });
}

export async function sendProposalEmail(
  customerEmail: string,
  customerName: string,
  proposal: Proposal,
  company: CompanyBranding,
  items: ProposalItem[],
  pdfBuffer: Buffer
) {
  const selectedItems = items.filter((item) => proposal.selectedItems.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const emailBody = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb;">
        <div style="max-width: 700px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">📋 Your Proposal</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">From: ${company.businessName}</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Hello ${customerName},</h2>
            
            <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
              Thank you for your interest! Please find your customized proposal for <strong>${proposal.projectTitle}</strong> below.
              Please review the details and let us know your decision by clicking one of the action buttons at the bottom.
            </p>

            <!-- Proposal Summary Box -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0284c7; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #1e40af;">Proposal ID:</strong><br>
                    <span style="color: #475569; font-family: monospace;">${proposal.id}</span>
                  </td>
                  <td style="padding: 8px 0; text-align: right;">
                    <strong style="color: #1e40af;">Valid Until:</strong><br>
                    <span style="color: #475569;">${new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Services Table -->
            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; margin-top: 30px;">📦 Services Included:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px;">Service</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; font-size: 13px;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; font-size: 13px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${selectedItems.map(item => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; color: #1f2937;">
                      <strong>${item.name}</strong><br>
                      <span style="color: #6b7280; font-size: 12px;">${item.description}</span>
                    </td>
                    <td style="padding: 12px; text-align: center; color: #374151;">${item.quantity || 1}</td>
                    <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 600;">
                      ${company.currency || 'USD'} ${(item.price * (item.quantity || 1)).toFixed(2)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Total Amount -->
            <div style="text-align: right; margin-bottom: 30px;">
              <table style="width: 100%; max-width: 300px; margin-left: auto;">
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; text-align: right;">Subtotal:</td>
                  <td style="padding: 12px 0 12px 20px; text-align: right; color: #1f2937; font-weight: 600;">
                    ${company.currency || 'USD'} ${subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; text-align: right;">Tax (0%):</td>
                  <td style="padding: 12px 0 12px 20px; text-align: right; color: #1f2937; font-weight: 600;">
                    ${company.currency || 'USD'} 0.00
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #1f2937; text-align: right; font-weight: 700; font-size: 16px;">Total:</td>
                  <td style="padding: 12px 0 12px 20px; text-align: right; color: #0284c7; font-weight: 700; font-size: 18px;">
                    ${company.currency || 'USD'} ${subtotal.toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Action Buttons -->
            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; margin-top: 30px;">👇 Take Action:</h3>
            <table style="width: 100%; margin-bottom: 30px;">
              <tr>
                <td style="padding: 10px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/api/proposals/generate-pdf/${proposal.id}?email=${customerEmail}" 
                    style="display: inline-block; padding: 12px 24px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    💾 Save as PDF
                  </a>
                </td>
                <td style="padding: 10px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/api/proposals/accept/${proposal.id}?email=${customerEmail}" 
                    style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    ✅ Accept Proposal
                  </a>
                </td>
                <td style="padding: 10px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/api/proposals/decline/${proposal.id}?email=${customerEmail}" 
                    style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    ❌ Decline Proposal
                  </a>
                </td>
              </tr>
            </table>

            <!-- Company Info -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #6b7280;">
              <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 14px;">🏢 Company Details:</h3>
              <p style="margin: 6px 0; color: #4b5563; font-size: 14px;">
                <strong>${company.businessName}</strong><br>
                ${company.email ? `📧 ${company.email}<br>` : ''}
                ${company.mobileNumber ? `📱 ${company.mobileNumber}<br>` : ''}
                ${company.address ? `📍 ${company.address}<br>` : ''}
                ${company.website ? `🌐 ${company.website}<br>` : ''}
              </p>
            </div>

            <!-- Terms -->
            <div style="background-color: #fff7ed; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #ea580c; font-size: 13px;">
              <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 14px;">⚖️ Terms & Conditions:</h3>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">50% deposit required to begin the project</li>
                <li style="margin-bottom: 6px;">Balance due upon project completion</li>
                <li>Timeline begins after deposit is received</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If you have any questions about this proposal or would like to discuss the details further, please don't hesitate to reach out. We look forward to working with you!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This is an automated email. Please do not reply directly to this address.</p>
            <p style="margin: 8px 0 0 0;">© 2025 ${company.businessName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    to: customerEmail,
    subject: `Proposal: ${proposal.projectTitle} - ${company.businessName}`,
    html: emailBody,
    attachments: [
      {
        filename: `${proposal.projectTitle || 'proposal'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}
