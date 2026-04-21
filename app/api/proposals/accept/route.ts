import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    console.log('Accept URL:', url.toString());
    console.log('Pathname:', url.pathname);
    console.log('Path segments:', url.pathname.split('/'));

    const proposalId = url.pathname.split('/')[4];
    const customerEmail = url.searchParams.get('email');

    console.log('Extracted proposalId:', proposalId);
    console.log('Extracted customerEmail:', customerEmail);

    if (!proposalId || !customerEmail) {
      console.error('Missing data:', { proposalId, customerEmail });
      return NextResponse.json(
        { error: 'Missing proposal ID or customer email', debug: { proposalId, customerEmail, url: url.toString() } },
        { status: 400 }
      );
    }

    // Log the acceptance (in a real app, store in database)
    console.log(`✅ Proposal ${proposalId} was accepted by ${customerEmail}`);

    // Always return HTML response for email links
    return new NextResponse(
      `
      <html>
        <head>
          <title>Proposal Accepted</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
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
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #059669;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            p {
              color: #6b7280;
              margin: 10px 0;
              line-height: 1.6;
            }
            .info {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              color: #166534;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #059669;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Proposal Accepted!</h1>
            <p>Thank you for accepting our proposal.</p>
            <p>We will be in touch shortly with next steps.</p>
            <div class="info">
              <p><strong>Proposal ID:</strong><br>${proposalId}</p>
              <p style="margin-top: 10px;"><strong>Your Email:</strong><br>${customerEmail}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              You can now close this window or wait for further communication from our team.
            </p>
          </div>
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
    console.error('Error accepting proposal:', error);
    return NextResponse.json(
      { error: 'Failed to accept proposal' },
      { status: 500 }
    );
  }
}
