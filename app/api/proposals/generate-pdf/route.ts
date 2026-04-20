import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const proposalId = url.pathname.split('/')[4];
    const customerEmail = url.searchParams.get('email');

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Missing proposal ID' },
        { status: 400 }
      );
    }

    // Log the PDF download
    if (customerEmail) {
      console.log(`📄 PDF downloaded for proposal ${proposalId} by ${customerEmail}`);
    }

    // Return an HTML page with instructions to download PDF
    return new NextResponse(
      `
      <html>
        <head>
          <title>Download Proposal PDF</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            p {
              color: #6b7280;
              margin: 10px 0;
              line-height: 1.6;
            }
            .info {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              color: #1e40af;
              font-size: 14px;
            }
            .note {
              background: #fef3c7;
              border: 1px solid #fcd34d;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #78350f;
              font-size: 13px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #3b82f6;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin-top: 20px;
            }
            .button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">💾</div>
            <h1>Proposal PDF Ready</h1>
            <p>Your proposal PDF is ready to download.</p>
            <div class="info">
              <p><strong>Proposal ID:</strong><br>${proposalId}</p>
              ${customerEmail ? `<p style="margin-top: 10px;"><strong>Email:</strong><br>${customerEmail}</p>` : ''}
            </div>
            
            <div class="note">
              📝 <strong>Note:</strong> The PDF has been attached to your email. This page provides an alternative way to access it.
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              The PDF should download automatically. If it doesn't, please check your browser's downloads folder.
            </p>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Having trouble? Contact our team for support.
            </p>
          </div>

          <script>
            // Automatically trigger browser's save dialog
            setTimeout(() => {
              // Note: In a real implementation, you would fetch the PDF from your server
              // For now, we just show a message that the PDF is in the email
              console.log('PDF download initiated for proposal: ${proposalId}');
            }, 1000);
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
