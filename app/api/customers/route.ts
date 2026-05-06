import { NextRequest, NextResponse } from "next/server";
import { Customer } from "@/app/lib/proposalTypes";
import { formatReadableId, slugifyIdSegment } from "@/lib/readableIds";
import { getSupabaseAdminClient } from "@/lib/supabase";

type CustomerPayload = Omit<Customer, "createdAt" | "updatedAt"> & {
  id?: string;
};

type CustomerRow = {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  phone_number: string | null;
  business_website: string | null;
  required_service: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ProposalHistoryRow = {
  id: string;
  customer_id: string | null;
  client_name: string | null;
  client_email: string | null;
  project_title: string | null;
  total: number | null;
  status: string | null;
  submitted_at: string | null;
  created_at?: string | null;
};

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyId: row.company_id || "",
    name: row.name || "",
    email: row.email || "",
    phoneNumber: row.phone_number || "",
    businessWebsite: row.business_website || "",
    requiredService: row.required_service || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposalHistory(row: ProposalHistoryRow) {
  return {
    id: row.id,
    customerId: row.customer_id || "",
    clientName: row.client_name || "",
    clientEmail: row.client_email || "",
    projectTitle: row.project_title || "",
    total: row.total || 0,
    status: row.status || "",
    submittedAt: row.submitted_at || row.created_at || "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search")?.trim();
    const includeProposals = searchParams.get("includeProposals") === "true";

    const supabase = getSupabaseAdminClient();

    if (id) {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      let proposals: ReturnType<typeof toProposalHistory>[] = [];
      if (includeProposals) {
        const { data: proposalRows, error: proposalsError } = await supabase
          .from("proposals")
          .select(
            "id, customer_id, client_name, client_email, project_title, total, status, submitted_at, created_at",
          )
          .eq("customer_id", id)
          .order("submitted_at", { ascending: false });

        if (proposalsError) {
          return NextResponse.json(
            { error: proposalsError.message },
            { status: 500 },
          );
        }

        proposals = ((proposalRows || []) as ProposalHistoryRow[]).map(
          toProposalHistory,
        );
      }

    return NextResponse.json({
      success: true,
      data: toCustomer(data as CustomerRow),
      proposals,
    });
    }

    let query = supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    if (search) {
      const escapedSearch = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        [
          `name.ilike.%${escapedSearch}%`,
          `email.ilike.%${escapedSearch}%`,
          `phone_number.ilike.%${escapedSearch}%`,
          `business_website.ilike.%${escapedSearch}%`,
          `required_service.ilike.%${escapedSearch}%`,
        ].join(","),
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: ((data || []) as CustomerRow[]).map(toCustomer),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CustomerPayload;
    const name = body.name?.trim();

    if (!name || !body.companyId) {
      return NextResponse.json(
        { error: "Customer name and company are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    let customerId = body.id?.trim() || "";
    if (!customerId) {
      const { count } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .ilike("id", `cus-${slugifyIdSegment(name)}-%`);
      customerId = formatReadableId("cus", name, (count || 0) + 1);
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        id: customerId,
        company_id: body.companyId,
        name,
        email: normalizeOptionalText(body.email),
        phone_number: normalizeOptionalText(body.phoneNumber),
        business_website: normalizeOptionalText(body.businessWebsite),
        required_service: normalizeOptionalText(body.requiredService),
        notes: normalizeOptionalText(body.notes),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: toCustomer(data as CustomerRow) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as CustomerPayload & { id: string };
    const name = body.name?.trim();

    if (!body.id || !name || !body.companyId) {
      return NextResponse.json(
        { error: "Customer ID, name, and company are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        company_id: body.companyId,
        name,
        email: normalizeOptionalText(body.email),
        phone_number: normalizeOptionalText(body.phoneNumber),
        business_website: normalizeOptionalText(body.businessWebsite),
        required_service: normalizeOptionalText(body.requiredService),
        notes: normalizeOptionalText(body.notes),
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toCustomer(data as CustomerRow),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Customer deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
