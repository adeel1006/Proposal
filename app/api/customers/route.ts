import { NextRequest, NextResponse } from "next/server";
import { Customer } from "@/app/lib/proposalTypes";
import { formatReadableId, slugifyIdSegment } from "@/lib/readableIds";
import { getSupabaseAdminClient } from "@/lib/supabase";

type CustomerPayload = Omit<
  Customer,
  "createdAt" | "updatedAt" | "proposalStatus" | "proposalCount" | "lastProposalSentAt"
> & {
  id?: string;
};

type ProposalSummary = {
  count: number;
  lastSentAt: string;
};

type CustomerRow = {
  id: string;
  company_id: string | null;
  name: string;
  business_name: string | null;
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

type ProposalSummaryRow = {
  customer_id: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toCustomer(row: CustomerRow, proposalSummary?: ProposalSummary): Customer {
  return {
    id: row.id,
    companyId: row.company_id || "",
    name: row.name || "",
    businessName: row.business_name || "",
    email: row.email || "",
    phoneNumber: row.phone_number || "",
    businessWebsite: row.business_website || "",
    requiredService: row.required_service || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    proposalStatus: proposalSummary?.count ? "sent" : "not_sent",
    proposalCount: proposalSummary?.count || 0,
    lastProposalSentAt: proposalSummary?.lastSentAt || "",
  };
}

function getLatestDate(current: string, next?: string | null) {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function summarizeProposalRows(rows: ProposalSummaryRow[]) {
  return rows.reduce((summaryMap, row) => {
    if (!row.customer_id) {
      return summaryMap;
    }

    const existing = summaryMap.get(row.customer_id) || {
      count: 0,
      lastSentAt: "",
    };
    existing.count += 1;
    existing.lastSentAt = getLatestDate(
      existing.lastSentAt,
      row.submitted_at || row.created_at,
    );
    summaryMap.set(row.customer_id, existing);
    return summaryMap;
  }, new Map<string, ProposalSummary>());
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
    const pageParam = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSizeParam = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize =
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(pageSizeParam, 100)
        : null;
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

      const proposalSummary = summarizeProposalRows(
        proposals.map((proposal) => ({
          customer_id: proposal.customerId,
          submitted_at: proposal.submittedAt,
          created_at: proposal.submittedAt,
        })),
      ).get(id);

      return NextResponse.json({
        success: true,
        data: toCustomer(data as CustomerRow, proposalSummary),
        proposals,
      });
    }

    let totalCount = 0;
    if (pageSize) {
      let countQuery = supabase
        .from("customers")
        .select("id", { count: "exact", head: true });

      if (companyId) {
        countQuery = countQuery.eq("company_id", companyId);
      }

      if (search) {
        const escapedSearch = search.replace(/[%_]/g, "\\$&");
        countQuery = countQuery.or(
          [
            `name.ilike.%${escapedSearch}%`,
            `business_name.ilike.%${escapedSearch}%`,
            `email.ilike.%${escapedSearch}%`,
            `phone_number.ilike.%${escapedSearch}%`,
            `business_website.ilike.%${escapedSearch}%`,
            `required_service.ilike.%${escapedSearch}%`,
          ].join(","),
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.warn("Failed to count customers:", countError);
      } else {
        totalCount = count || 0;
      }
    }

    let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    if (search) {
      const escapedSearch = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        [
          `name.ilike.%${escapedSearch}%`,
          `business_name.ilike.%${escapedSearch}%`,
          `email.ilike.%${escapedSearch}%`,
          `phone_number.ilike.%${escapedSearch}%`,
          `business_website.ilike.%${escapedSearch}%`,
          `required_service.ilike.%${escapedSearch}%`,
        ].join(","),
      );
    }

    if (pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const customerRows = (data || []) as CustomerRow[];
    const customerIds = customerRows.map((customer) => customer.id).filter(Boolean);
    let proposalSummaries = new Map<string, ProposalSummary>();

    if (customerIds.length > 0) {
      const { data: proposalRows, error: proposalsError } = await supabase
        .from("proposals")
        .select("customer_id, submitted_at, created_at")
        .in("customer_id", customerIds);

      if (!proposalsError) {
        proposalSummaries = summarizeProposalRows(
          (proposalRows || []) as ProposalSummaryRow[],
        );
      } else {
        console.warn("Failed to load customer proposal summaries:", proposalsError);
      }
    }

    if (!pageSize) {
      totalCount = customerRows.length;
    }

    return NextResponse.json(
      {
        success: true,
        data: customerRows.map((customer) =>
          toCustomer(customer, proposalSummaries.get(customer.id)),
        ),
        meta: {
          page,
          pageSize: pageSize || customerRows.length || 0,
          totalCount,
          totalPages: pageSize ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1,
        },
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
    const businessName = body.businessName?.trim();

    if (!name || !businessName || !body.companyId) {
      return NextResponse.json(
        { error: "Customer name, business name, and company are required" },
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
        business_name: businessName,
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
    const businessName = body.businessName?.trim();

    if (!body.id || !name || !businessName || !body.companyId) {
      return NextResponse.json(
        { error: "Customer ID, name, business name, and company are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        company_id: body.companyId,
        name,
        business_name: businessName,
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
