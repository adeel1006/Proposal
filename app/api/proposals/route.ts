import { NextRequest, NextResponse } from "next/server";
import { Proposal, CompanyBranding } from "@/app/lib/proposalTypes";
import { getSupabaseAdminClient } from "@/lib/supabase";

type SaveProposalPayload = {
  proposal: Proposal;
  company?: CompanyBranding | null;
  total?: number;
  customerEmail?: string;
};

function computeProposalTotal(proposal: Proposal) {
  return proposal.items
    .filter((item) => proposal.selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Keep list payload light: exclude heavy fields like pdf_base64.
    const listColumns = [
      "id",
      "company_id",
      "client_name",
      "client_email",
      "client_phone_number",
      "project_title",
      "project_description",
      "selected_items",
      "items",
      "notes",
      "proposal_date",
      "total",
      "status",
      "submitted_at",
      "company",
    ].join(", ");

    const { data, error } = await supabase
      .from("proposals")
      .select(listColumns)
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: data ?? [] },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch proposals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveProposalPayload;
    const { proposal, company, total, customerEmail } = body;

    if (!proposal?.id || !proposal?.clientName || !proposal?.projectTitle) {
      return NextResponse.json(
        { error: "Proposal ID, client name, and project title are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const proposalTotal =
      typeof total === "number" && Number.isFinite(total)
        ? total
        : computeProposalTotal(proposal);

    const payload = {
      id: proposal.id,
      company_id: proposal.companyId || null,
      client_name: proposal.clientName,
      client_email: proposal.clientEmail || customerEmail || null,
      client_phone_number: proposal.clientPhoneNumber || null,
      project_title: proposal.projectTitle,
      project_description: proposal.projectDescription || null,
      selected_items: proposal.selectedItems,
      items: proposal.items,
      notes: proposal.notes || null,
      valid_until: proposal.validUntil || null,
      proposal_date: proposal.proposalDate || null,
      terms: proposal.terms || {},
      company: company || {},
      total: proposalTotal,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("proposals")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Proposal ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("proposals").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Proposal deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
