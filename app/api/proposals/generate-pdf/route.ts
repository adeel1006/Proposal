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

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("proposals")
      .select("id, project_title, pdf_base64")
      .eq("id", proposalId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.pdf_base64) {
      return NextResponse.json(
        { error: "PDF is not available for this proposal yet" },
        { status: 404 }
      );
    }

    if (customerEmail) {
      console.log(`PDF downloaded for proposal ${proposalId} by ${customerEmail}`);
    }

    const pdfBuffer = Buffer.from(data.pdf_base64, "base64");
    const fileName = `${data.project_title || "proposal"}.pdf`
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
