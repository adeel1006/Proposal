import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const proposalId = url.searchParams.get("proposalId");
    const customerEmail = url.searchParams.get("email");
    const paymentLink =
      process.env.PROPOSAL_PAYMENT_LINK ||
      "https://example.com/add-payment-link-here";

    if (!proposalId) {
      return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });
    }

    try {
      const supabase = getSupabaseAdminClient();
      const responseAt = new Date().toISOString();
      const updateWithResponseAt = await supabase
        .from("proposals")
        .update({ status: "accepted", response_at: responseAt })
        .eq("id", proposalId);

      if (updateWithResponseAt.error) {
        const fallback = await supabase
          .from("proposals")
          .update({ status: "accepted" })
          .eq("id", proposalId);

        if (fallback.error) {
          console.error("Could not update proposal status to accepted:", fallback.error);
        }
      }
    } catch (error) {
      console.error("Could not update proposal status to accepted:", error);
    }

    return new NextResponse(
      `
      <html>
        <head>
          <title>Proposal Accepted</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
              max-width: 540px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 { color: #059669; margin: 0 0 10px 0; font-size: 28px; }
            p { color: #6b7280; margin: 10px 0; line-height: 1.6; }
            .info {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
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
              margin-top: 8px;
            }
            .note { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Proposal Accepted</h1>
            <p>Thank you for accepting the proposal.</p>
            <div class="info">
              <p><strong>Proposal ID:</strong><br>${proposalId}</p>
              ${customerEmail ? `<p><strong>Email:</strong><br>${customerEmail}</p>` : ""}
            </div>
            <a href="${paymentLink}" class="button" target="_blank" rel="noopener noreferrer">Continue to Payment</a>
            <p class="note">Set PROPOSAL_PAYMENT_LINK in your environment to replace this placeholder link.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error("Error accepting proposal:", error);
    return NextResponse.json({ error: "Failed to accept proposal" }, { status: 500 });
  }
}
