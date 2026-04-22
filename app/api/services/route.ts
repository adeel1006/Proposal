import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

type CreateServicePayload = {
  companyId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  category?: string;
  quantity?: number;
  id?: string;
};

type CompanyServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string | null;
  category: string | null;
  quantity: number | null;
  created_at: string;
  updated_at: string;
};

// GET services for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("company_services")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform from snake_case to camelCase
    const transformed = ((data || []) as CompanyServiceRow[]).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      currency: service.currency || "USD",
      category: service.category || "General",
      quantity: service.quantity || 1,
      createdAt: service.created_at,
      updatedAt: service.updated_at,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch services";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create new service
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateServicePayload;
    const {
      id,
      companyId,
      name,
      description,
      price,
      currency = "USD",
      category = "General",
      quantity = 1,
    } = body;

    if (!companyId || !name || price === undefined) {
      return NextResponse.json(
        { error: "Company ID, service name, and price are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const serviceId = id || `service-${Date.now()}`;

    const { data, error } = await supabase
      .from("company_services")
      .insert({
        id: serviceId,
        company_id: companyId,
        name,
        description,
        price,
        currency,
        category,
        quantity,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      category: data.category,
      quantity: data.quantity,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(
      { success: true, data: transformed },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update service
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateServicePayload & { id: string };
    const {
      id,
      name,
      description,
      price,
      currency,
      category,
      quantity,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("company_services")
      .update({
        name,
        description,
        price,
        currency,
        category,
        quantity,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      category: data.category,
      quantity: data.quantity,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE service
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("company_services")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Service deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
