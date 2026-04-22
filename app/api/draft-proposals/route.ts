import { NextRequest, NextResponse } from "next/server";
import { ProposalItem } from "@/app/lib/proposalTypes";
import { getSupabaseAdminClient } from "@/lib/supabase";

type SaveDraftPayload = {
  id: string;
  companyId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhoneNumber?: string;
  projectTitle?: string;
  projectDescription?: string;
  selectedItems: string[];
  items: ProposalItem[];
  notes?: string;
  validUntil?: string;
  terms?: Record<string, unknown>;
  company?: Record<string, unknown>;
  total?: number;
  status?: string;
};

type DraftProposalRow = {
  id: string;
  company_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone_number: string | null;
  project_title: string | null;
  project_description: string | null;
  selected_items: string[] | null;
  items: ProposalItem[] | null;
  notes: string | null;
  valid_until: string | null;
  terms: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  total: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// GET all draft proposals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "draft";

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("draft_proposals")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform from snake_case to camelCase
    const transformed = ((data || []) as DraftProposalRow[]).map((proposal) => ({
      id: proposal.id,
      companyId: proposal.company_id,
      clientName: proposal.client_name,
      clientEmail: proposal.client_email,
      clientPhoneNumber: proposal.client_phone_number,
      projectTitle: proposal.project_title,
      projectDescription: proposal.project_description,
      selectedItems: proposal.selected_items || [],
      items: proposal.items || [],
      notes: proposal.notes,
      validUntil: proposal.valid_until,
      terms: proposal.terms || {},
      company: proposal.company,
      total: proposal.total,
      status: proposal.status,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch drafts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create or update draft proposal
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveDraftPayload;
    const {
      id,
      companyId,
      clientName,
      clientEmail,
      clientPhoneNumber,
      projectTitle,
      projectDescription,
      selectedItems,
      items,
      notes,
      validUntil,
      terms,
      company,
      total = 0,
      status = "draft",
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Proposal ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Check if draft already exists
    const { data: existing } = await supabase
      .from("draft_proposals")
      .select("id")
      .eq("id", id)
      .single();

    let response;
    if (existing) {
      // Update existing draft
      response = await supabase
        .from("draft_proposals")
        .update({
          company_id: companyId || null,
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone_number: clientPhoneNumber || null,
          project_title: projectTitle || null,
          project_description: projectDescription || null,
          selected_items: selectedItems,
          items,
          notes: notes || null,
          valid_until: validUntil || null,
          terms: terms || {},
          company: company || null,
          total: total,
          status,
        })
        .eq("id", id)
        .select()
        .single();
    } else {
      // Create new draft
      response = await supabase
        .from("draft_proposals")
        .insert({
          id,
          company_id: companyId || null,
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone_number: clientPhoneNumber || null,
          project_title: projectTitle || null,
          project_description: projectDescription || null,
          selected_items: selectedItems,
          items,
          notes: notes || null,
          valid_until: validUntil || null,
          terms: terms || {},
          company: company || null,
          total: total,
          status,
        })
        .select()
        .single();
    }

    const { data, error } = response;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = {
      id: data.id,
      companyId: data.company_id,
      clientName: data.client_name,
      clientEmail: data.client_email,
      clientPhoneNumber: data.client_phone_number,
      projectTitle: data.project_title,
      projectDescription: data.project_description,
      selectedItems: data.selected_items || [],
      items: data.items || [],
      notes: data.notes,
      validUntil: data.valid_until,
      terms: data.terms || {},
      company: data.company,
      total: data.total,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update specific fields of a draft
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string } & Partial<SaveDraftPayload>;
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Proposal ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Convert camelCase to snake_case
    const snakeCaseUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      snakeCaseUpdates[snakeKey] = value;
    }

    const { data, error } = await supabase
      .from("draft_proposals")
      .update(snakeCaseUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE draft proposal
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

    const { error } = await supabase
      .from("draft_proposals")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Draft deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
