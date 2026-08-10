import { NextRequest, NextResponse } from "next/server";
import { sendManualProposalEmail } from "@/lib/emailService";
import { formatReadableId, slugifyIdSegment } from "@/lib/readableIds";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CompanyBranding } from "@/app/lib/proposalTypes";

export const runtime = "nodejs";

const MAX_MANUAL_PDF_SIZE_BYTES = 10 * 1024 * 1024;

type CompanyRow = {
  id: string;
  business_name: string;
  email: string;
  mobile_number: string | null;
  whatsapp: string | null;
  address: string | null;
  registration_number: string | null;
  website: string | null;
  currency: string | null;
  reply_to_email: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  youtube: string | null;
  pinterest: string | null;
  logo: string | null;
};

type CustomerRow = {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
};

function toCompanyBranding(row: CompanyRow): CompanyBranding {
  return {
    id: row.id,
    businessName: row.business_name || "",
    email: row.email || "",
    mobileNumber: row.mobile_number || "",
    whatsapp: row.whatsapp || "",
    address: row.address || "",
    registrationNumber: row.registration_number || "",
    website: row.website || "",
    currency: row.currency || "USD",
    replyToEmail: row.reply_to_email || "",
    instagram: row.instagram || "",
    linkedin: row.linkedin || "",
    twitter: row.twitter || "",
    facebook: row.facebook || "",
    youtube: row.youtube || "",
    pinterest: row.pinterest || "",
    logo: row.logo || "",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safePdfFilename(value: string) {
  const filename = value.replace(/[^a-zA-Z0-9._ -]/g, "").trim() || "proposal.pdf";
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

function isMissingPdfColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("pdf_base64") && message.includes("schema cache");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const companyId = String(formData.get("companyId") || "").trim();
    const customerId = String(formData.get("customerId") || "").trim();
    const recipientEmail = String(formData.get("recipientEmail") || "").trim();
    const proposalTitle = String(formData.get("proposalTitle") || "").trim();
    const introMessage = String(formData.get("introMessage") || "").trim();
    const file = formData.get("pdf");

    if (!companyId || !customerId || !recipientEmail || !proposalTitle) {
      return NextResponse.json(
        { success: false, error: "Company, customer, recipient email, and proposal title are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid recipient email address." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Attach a proposal PDF before sending." },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > MAX_MANUAL_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "The proposal PDF must be between 1 byte and 10 MB." },
        { status: 400 },
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    if (pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { success: false, error: "The uploaded file is not a valid PDF." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const [{ data: companyData, error: companyError }, { data: customerData, error: customerError }] =
      await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase
          .from("customers")
          .select("id, company_id, name, email, phone_number, created_at")
          .eq("id", customerId)
          .eq("company_id", companyId)
          .single(),
      ]);

    if (companyError || !companyData) {
      return NextResponse.json({ success: false, error: "Company not found." }, { status: 404 });
    }

    if (customerError || !customerData) {
      return NextResponse.json(
        { success: false, error: "Customer not found for the selected company." },
        { status: 404 },
      );
    }

    const company = toCompanyBranding(companyData as CompanyRow);
    const customer = customerData as CustomerRow;
    const { count, error: countError } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .ilike("id", `prop-${slugifyIdSegment(proposalTitle)}-%`);

    if (countError) {
      throw new Error(countError.message);
    }

    const proposalId = formatReadableId("prop", proposalTitle, (count || 0) + 1);
    const pdfBase64 = pdfBuffer.toString("base64");
    const proposalRecord = {
      id: proposalId,
      company_id: company.id,
      customer_id: customer.id,
      client_name: customer.name,
      client_email: recipientEmail,
      client_phone_number: customer.phone_number,
      project_title: proposalTitle,
      selected_items: [],
      items: [],
      notes: introMessage || null,
      terms: {},
      company,
      total: 0,
      status: "submitted",
      pdf_base64: pdfBase64,
      customer_created_at: customer.created_at,
      submitted_at: new Date().toISOString(),
    };

    let pdfWasPersisted = true;
    let { error: saveError } = await supabase.from("proposals").insert(proposalRecord);

    // Keep delivery available while a legacy database catches up with the PDF migration.
    if (isMissingPdfColumnError(saveError)) {
      const recordWithoutPdf = { ...proposalRecord };
      Reflect.deleteProperty(recordWithoutPdf, "pdf_base64");
      pdfWasPersisted = false;
      ({ error: saveError } = await supabase.from("proposals").insert(recordWithoutPdf));
      console.warn(
        "Manual proposal was saved without its PDF archive because proposals.pdf_base64 is missing.",
      );
    }

    if (saveError) {
      throw new Error(saveError.message);
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      if (process.env.NODE_ENV === "development") {
        console.log("[DEMO MODE] Manual proposal would be sent to:", recipientEmail);
        return NextResponse.json({
          success: true,
          message: `[DEMO MODE] Manual proposal is ready to send to ${recipientEmail}. Configure SMTP to send real email.`,
        });
      }

      return NextResponse.json(
        { success: false, error: "Email service is not configured." },
        { status: 500 },
      );
    }

    await sendManualProposalEmail({
      customerEmail: recipientEmail,
      customerName: customer.name,
      company,
      proposalTitle,
      introMessage,
      pdf: {
        filename: safePdfFilename(file.name),
        content: pdfBuffer,
      },
    });

    return NextResponse.json({
      success: true,
      message: pdfWasPersisted
        ? `Manual proposal sent to ${recipientEmail}.`
        : `Manual proposal sent to ${recipientEmail}. The database PDF archive will be enabled after the pending migration is applied.`,
    });
  } catch (error) {
    console.error("Error sending manual proposal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send manual proposal.",
      },
      { status: 500 },
    );
  }
}
