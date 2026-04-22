import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

type CreateCompanyPayload = {
  businessName: string;
  email: string;
  mobileNumber?: string;
  whatsapp?: string;
  address?: string;
  currency?: string;
  logo?: string;
  id?: string;
};

type CompanyRow = {
  id: string;
  business_name: string;
  email: string;
  mobile_number: string | null;
  whatsapp: string | null;
  address: string | null;
  currency: string | null;
  logo: string | null;
  created_at: string;
  updated_at: string;
};

// GET all companies
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform from snake_case to camelCase for frontend
    const transformed = ((data || []) as CompanyRow[]).map((company) => ({
      id: company.id,
      businessName: company.business_name,
      email: company.email,
      mobileNumber: company.mobile_number,
      whatsapp: company.whatsapp,
      address: company.address,
      currency: company.currency || "USD",
      logo: company.logo,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create new company
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCompanyPayload;
    const {
      id,
      businessName,
      email,
      mobileNumber,
      whatsapp,
      address,
      currency = "USD",
      logo,
    } = body;

    if (!businessName || !email) {
      return NextResponse.json(
        { error: "Business name and email are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const companyId = id || `company-${Date.now()}`;

    const { data, error } = await supabase
      .from("companies")
      .insert({
        id: companyId,
        business_name: businessName,
        email,
        mobile_number: mobileNumber,
        whatsapp,
        address,
        currency,
        logo,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = {
      id: data.id,
      businessName: data.business_name,
      email: data.email,
      mobileNumber: data.mobile_number,
      whatsapp: data.whatsapp,
      address: data.address,
      currency: data.currency,
      logo: data.logo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(
      { success: true, data: transformed },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update company
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCompanyPayload & { id: string };
    const {
      id,
      businessName,
      email,
      mobileNumber,
      whatsapp,
      address,
      currency,
      logo,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("companies")
      .update({
        business_name: businessName,
        email,
        mobile_number: mobileNumber,
        whatsapp,
        address,
        currency,
        logo,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = {
      id: data.id,
      businessName: data.business_name,
      email: data.email,
      mobileNumber: data.mobile_number,
      whatsapp: data.whatsapp,
      address: data.address,
      currency: data.currency,
      logo: data.logo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE company
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Company deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
