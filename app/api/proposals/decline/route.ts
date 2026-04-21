import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const proposalId = url.searchParams.get("proposalId");
    const customerEmail = url.searchParams.get("email");

    if (!proposalId) {
      return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });
    }

    try {
      const supabase = getSupabaseAdminClient();
      const responseAt = new Date().toISOString();
      const updateWithResponseAt = await supabase
        .from("proposals")
        .update({ status: "rejected", response_at: responseAt })
        .eq("id", proposalId);

      if (updateWithResponseAt.error) {
        const fallback = await supabase
          .from("proposals")
          .update({ status: "rejected" })
          .eq("id", proposalId);

        if (fallback.error) {
          console.error("Could not update proposal status to rejected:", fallback.error);
        }
      }
    } catch (error) {
      console.error("Could not update proposal status to rejected:", error);
    }

    return new NextResponse(
      `
      <html>
        <head>
          <title>Proposal Declined</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
              max-width: 540px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 { color: #dc2626; margin: 0 0 10px 0; font-size: 28px; }
            p { color: #6b7280; margin: 10px 0; line-height: 1.6; }
            .info {
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              color: #7f1d1d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Proposal Declined</h1>
            <p>Thank you for reviewing the proposal.</p>
            <div class="info">
              <p><strong>Proposal ID:</strong><br>${proposalId}</p>
              ${customerEmail ? `<p><strong>Email:</strong><br>${customerEmail}</p>` : ""}
            </div>
            <p>You can close this window.</p>
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
    console.error("Error declining proposal:", error);
    return NextResponse.json({ error: "Failed to decline proposal" }, { status: 500 });
  }
}
