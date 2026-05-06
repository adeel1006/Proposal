import { NextRequest, NextResponse } from "next/server";
import {
  Proposal,
  CompanyBranding,
  normalizeProposalAttachments,
  validateProposalAttachments,
} from "@/app/lib/proposalTypes";
import { formatReadableId, slugifyIdSegment } from "@/lib/readableIds";
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
    const baseListColumns = [
      "id",
      "company_id",
      "customer_id",
      "client_name",
      "client_email",
      "client_phone_number",
      "project_title",
      "project_description",
      "selected_items",
      "items",
      "notes",
      "proposal_date",
      "attachments",
      "total",
      "status",
      "submitted_at",
      "company",
    ];

    const columnsWithoutCustomerId = baseListColumns.filter((column) => column !== "customer_id");
    const columnsWithoutCustomerIdAndAttachments = columnsWithoutCustomerId.filter(
      (column) => column !== "attachments",
    );
    const columnsWithPaymentLink = [...baseListColumns, "payment_link"];
    const columnsWithPaymentLinkWithoutCustomerId = [...columnsWithoutCustomerId, "payment_link"];
    const columnsWithPaymentLinkWithoutCustomerIdAndAttachments = [
      ...columnsWithoutCustomerIdAndAttachments,
      "payment_link",
    ];
    const listColumnsWithResponseAt = [...columnsWithPaymentLink, "response_at"].join(", ");

    let queryResult = await supabase
      .from("proposals")
      .select(listColumnsWithResponseAt)
      .order("submitted_at", { ascending: false });

    if (queryResult.error?.message?.includes("response_at")) {
      queryResult = await supabase
        .from("proposals")
        .select(columnsWithPaymentLink.join(", "))
        .order("submitted_at", { ascending: false });
    }

    if (queryResult.error?.message?.includes("customer_id")) {
      queryResult = await supabase
        .from("proposals")
        .select(columnsWithPaymentLinkWithoutCustomerId.join(", "))
        .order("submitted_at", { ascending: false });
    }

    if (queryResult.error?.message?.includes("payment_link")) {
      queryResult = await supabase
        .from("proposals")
        .select(columnsWithoutCustomerIdAndAttachments.join(", "))
        .order("submitted_at", { ascending: false });
    }

    if (queryResult.error?.message?.includes("attachments")) {
      queryResult = await supabase
        .from("proposals")
        .select(columnsWithPaymentLinkWithoutCustomerIdAndAttachments.join(", "))
        .order("submitted_at", { ascending: false });
    }

    const { data, error } = queryResult;

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

    const attachmentError = validateProposalAttachments(proposal.attachments);
    if (attachmentError) {
      return NextResponse.json({ error: attachmentError }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const proposalTotal =
      typeof total === "number" && Number.isFinite(total)
        ? total
        : computeProposalTotal(proposal);
    let proposalId = proposal.id?.trim() || "";
    if (!proposalId) {
      const label = proposal.clientName || proposal.projectTitle || "proposal";
      const { count } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .ilike("id", `prop-${slugifyIdSegment(label)}-%`);
      proposalId = formatReadableId("prop", label, (count || 0) + 1);
    }

    const payload: Record<string, unknown> = {
      id: proposalId,
      company_id: proposal.companyId || null,
      customer_id: proposal.customerId || null,
      client_name: proposal.clientName,
      client_email: proposal.clientEmail || customerEmail || null,
      client_phone_number: proposal.clientPhoneNumber || null,
      project_title: proposal.projectTitle,
      project_description: proposal.projectDescription || null,
      selected_items: proposal.selectedItems,
      items: proposal.items,
      notes: proposal.notes || null,
      attachments: normalizeProposalAttachments(proposal.attachments),
      payment_link: proposal.paymentLink || null,
      valid_until: proposal.validUntil || null,
      proposal_date: proposal.proposalDate || null,
      terms: proposal.terms || {},
      company: company || {},
      total: proposalTotal,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    };

    let queryResult = await supabase
      .from("proposals")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (queryResult.error?.message?.includes("customer_id")) {
      delete payload.customer_id;
      queryResult = await supabase
        .from("proposals")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
    }

    if (queryResult.error?.message?.includes("attachments")) {
      delete payload.attachments;
      queryResult = await supabase
        .from("proposals")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
    }

    if (queryResult.error?.message?.includes("payment_link")) {
      delete payload.payment_link;
      queryResult = await supabase
        .from("proposals")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
    }

    const { data, error } = queryResult;

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
