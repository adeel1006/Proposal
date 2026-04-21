import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    console.log('Decline URL:', url.toString());
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

    // Log the decline (in a real app, store in database)
    console.log(`❌ Proposal ${proposalId} was declined by ${customerEmail}`);

    // Always return HTML response for email links
    return new NextResponse(
      `
      <html>
        <head>
          <title>Proposal Declined</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
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
              color: #dc2626;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            p {
              color: #6b7280;
              margin: 10px 0;
              line-height: 1.6;
            }
            .info {
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              color: #7f1d1d;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #0284c7;
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
            <div class="icon">❌</div>
            <h1>Proposal Declined</h1>
            <p>Thank you for reviewing our proposal.</p>
            <p>We appreciate the opportunity and would welcome the chance to discuss alternative solutions.</p>
            <div class="info">
              <p><strong>Proposal ID:</strong><br>${proposalId}</p>
              <p style="margin-top: 10px;"><strong>Your Email:</strong><br>${customerEmail}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Feel free to contact us if you have any questions or would like to discuss further.
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
    console.error('Error declining proposal:', error);
    return NextResponse.json(
      { error: 'Failed to decline proposal' },
      { status: 500 }
    );
  }
}
