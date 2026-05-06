import { NextRequest, NextResponse } from "next/server";
import {
  CompanyBranding,
  Customer,
  Proposal,
  ProposalItem,
  getSelectedItemsTotal,
  normalizeProposalAttachments,
} from "@/app/lib/proposalTypes";
import { formatReadableId, slugifyIdSegment } from "@/lib/readableIds";
import { getSupabaseAdminClient } from "@/lib/supabase";

type GenerateProposalPayload = {
  proposal: Proposal;
  company: CompanyBranding;
  customer: Customer;
  agencyTone: string;
  scopeLimitations: string;
};

type GeneratedProposal = {
  projectTitle: string;
  projectDescription: string;
  introduction: string;
  businessUnderstanding: string;
  problemsOrOpportunities: string[];
  proposedSolutions: string[];
  scopeOfWork: string[];
  closingStatement: string;
  websiteSummary: string;
  confidenceNotes: string[];
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectTitle",
    "projectDescription",
    "introduction",
    "businessUnderstanding",
    "problemsOrOpportunities",
    "proposedSolutions",
    "scopeOfWork",
    "closingStatement",
    "websiteSummary",
    "confidenceNotes",
  ],
  properties: {
    projectTitle: { type: "string" },
    projectDescription: { type: "string" },
    introduction: { type: "string" },
    businessUnderstanding: { type: "string" },
    problemsOrOpportunities: {
      type: "array",
      items: { type: "string" },
    },
    proposedSolutions: {
      type: "array",
      items: { type: "string" },
    },
    scopeOfWork: {
      type: "array",
      items: { type: "string" },
    },
    closingStatement: { type: "string" },
    websiteSummary: { type: "string" },
    confidenceNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  return decodeHtmlEntities(regex.exec(html)?.[1] || "");
}

function extractWebsiteText(html: string) {
  const title = decodeHtmlEntities(
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "",
  );
  const description =
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description");
  const bodyText = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  return normalizeWhitespace([title, description, bodyText].filter(Boolean).join(" "));
}

async function fetchWebsiteOverview(rawUrl?: string) {
  if (!rawUrl) {
    return {
      url: "",
      text: "",
      fetchNote: "No customer website was provided.",
    };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      url: rawUrl,
      text: "",
      fetchNote: "The customer website URL is not valid.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      url: rawUrl,
      text: "",
      fetchNote: "Only http and https website URLs can be analyzed.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ProposalBot/1.0 (+https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        url: url.toString(),
        text: "",
        fetchNote: `Website fetch failed with HTTP ${response.status}.`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return {
        url: url.toString(),
        text: "",
        fetchNote: "The website did not return HTML content.",
      };
    }

    const html = await response.text();
    const extracted = extractWebsiteText(html).slice(0, 12000);

    return {
      url: url.toString(),
      text: extracted,
      fetchNote: extracted
        ? "Website content was fetched and summarized."
        : "Website returned HTML but no readable text was extracted.",
    };
  } catch (error) {
    return {
      url: url.toString(),
      text: "",
      fetchNote:
        error instanceof Error && error.name === "AbortError"
          ? "Website fetch timed out."
          : "Website fetch failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getResponseText(response: GeminiGenerateContentResponse) {
  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n") || ""
  );
}

function formatGeneratedNotes(generated: GeneratedProposal) {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

  return [
    `Introduction\n${generated.introduction}`,
    `Understanding of the Client's Business\n${generated.businessUnderstanding}`,
    `Identified Problems or Opportunities\n${list(generated.problemsOrOpportunities)}`,
    `Proposed Solutions\n${list(generated.proposedSolutions)}`,
    `Scope of Work\n${list(generated.scopeOfWork)}`,
    `Closing Statement\n${generated.closingStatement}`,
    `Website Overview\n${generated.websiteSummary}`,
    generated.confidenceNotes.length
      ? `Review Notes\n${list(generated.confidenceNotes)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiGenerateContent({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  const rawBody = await response.text();
  let data: (GeminiGenerateContentResponse & GeminiErrorResponse) | null = null;

  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody) as GeminiGenerateContentResponse &
        GeminiErrorResponse;
    } catch {
      data = {
        error: {
          message: rawBody.slice(0, 1000),
        },
      };
    }
  }

  return { response, data, rawBody };
}

function buildFallbackGeneratedProposal({
  company,
  customer,
  selectedServices,
  websiteOverview,
}: {
  company: CompanyBranding;
  customer: Customer;
  selectedServices: ProposalItem[];
  websiteOverview: Awaited<ReturnType<typeof fetchWebsiteOverview>>;
}): GeneratedProposal {
  const serviceNames = selectedServices
    .map((item) => item.name?.trim())
    .filter((name): name is string => Boolean(name));
  const primaryService =
    customer.requiredService?.trim() || serviceNames[0] || "business support";
  const title = `${customer.name || company.businessName} - ${primaryService}`;
  const summarySource =
    websiteOverview.text ||
    websiteOverview.fetchNote ||
    "No website content was available for review.";

  return {
    projectTitle: title,
    projectDescription:
      `A professional proposal prepared for ${customer.name || "the customer"} using the stored customer details, selected company services, and the available website review notes.`,
    introduction:
      `Thank you for considering ${company.businessName}. This draft was prepared from the available customer record, selected services, and website review information.`,
    businessUnderstanding:
      `Based on the saved data, ${customer.name || "the customer"} needs support around ${primaryService}. The proposal has been kept aligned to the provided scope and the website review notes only.`,
    problemsOrOpportunities: [
      `The customer has a documented need for ${primaryService}.`,
      "There is an opportunity to align the selected services into a clear and manageable proposal scope.",
      "Website review notes can be used to refine the messaging without inventing unsupported facts.",
    ],
    proposedSolutions: serviceNames.length
      ? serviceNames.map((name) => `Provide ${name} within the approved scope.`)
      : [
          "Provide the approved services within the defined proposal scope.",
        ],
    scopeOfWork: [
      ...serviceNames.map((name) => `${name} within the approved scope.`),
      "Any extra work, timelines, or promises must stay within the admin's stated scope limitations.",
    ],
    closingStatement:
      "We appreciate the opportunity to support this project and are ready to proceed once the proposal scope is reviewed and approved.",
    websiteSummary: summarySource.slice(0, 700),
    confidenceNotes: [
      "Generated from stored customer and company data because the Gemini service was temporarily unavailable.",
      `Website review note: ${websiteOverview.fetchNote}`,
    ],
  };
}

async function saveGeneratedDraft(
  proposal: Proposal,
  company: CompanyBranding,
  generated: GeneratedProposal,
) {
  const supabase = getSupabaseAdminClient();
  let draftId = proposal.id?.trim() || "";
  if (!draftId) {
    const label = proposal.clientName || generated.projectTitle || "draft";
    const { count } = await supabase
      .from("draft_proposals")
      .select("id", { count: "exact", head: true })
      .ilike("id", `prop-${slugifyIdSegment(label)}-%`);
    draftId = formatReadableId("prop", label, (count || 0) + 1);
  }

  const draftPayload = {
    id: draftId,
    company_id: proposal.companyId || null,
    customer_id: proposal.customerId || null,
    client_name: proposal.clientName || null,
    client_email: proposal.clientEmail || null,
    client_phone_number: proposal.clientPhoneNumber || null,
    project_title: generated.projectTitle,
    project_description: generated.projectDescription,
    selected_items: proposal.selectedItems,
    items: proposal.items,
    attachments: normalizeProposalAttachments(proposal.attachments),
    notes: formatGeneratedNotes(generated),
    valid_until: proposal.validUntil || null,
    terms: proposal.terms || {},
    company,
    total: getSelectedItemsTotal(proposal.selectedItems, proposal.items),
    status: "draft",
  };

  let result = await supabase
    .from("draft_proposals")
    .upsert(draftPayload, { onConflict: "id" })
    .select()
    .single();

  if (result.error?.message?.includes("customer_id")) {
    const fallbackPayload = { ...draftPayload };
    delete (fallbackPayload as Partial<typeof fallbackPayload>).customer_id;
    result = await supabase
      .from("draft_proposals")
      .upsert(fallbackPayload, { onConflict: "id" })
      .select()
      .single();
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in environment variables" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GenerateProposalPayload;
    const { proposal, company, customer, agencyTone, scopeLimitations } = body;

    if (!company?.id || !customer?.id) {
      return NextResponse.json(
        { error: "Company and customer are required" },
        { status: 400 },
      );
    }

    if (!proposal.selectedItems?.length) {
      return NextResponse.json(
        { error: "Select at least one service before generating a proposal" },
        { status: 400 },
      );
    }

    if (!scopeLimitations?.trim()) {
      return NextResponse.json(
        { error: "Scope limitations are required for AI proposal generation" },
        { status: 400 },
      );
    }

    const selectedServices = proposal.items.filter((item: ProposalItem) =>
      proposal.selectedItems.includes(item.id),
    );
    const websiteOverview = await fetchWebsiteOverview(customer.businessWebsite);
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const fallbackModels = Array.from(
      new Set([model, "gemini-2.5-flash-lite", "gemini-2.0-flash"]),
    );
    const prompt = JSON.stringify(
      {
        instructions:
          "Generate a concise, professional agency proposal. Use only provided customer data, website text, and selected services. Do not invent facts, metrics, guarantees, timelines, or services. If evidence is weak, say it cautiously in confidenceNotes. Return only JSON matching the schema.",
        agencyTone:
          agencyTone?.trim() ||
          "Professional, clear, consultative, and business-focused.",
        scopeLimitations: scopeLimitations.trim(),
        company: {
          businessName: company.businessName,
          website: company.website,
          email: company.email,
          currency: company.currency,
        },
        customer: {
          name: customer.name,
          email: customer.email,
          phoneNumber: customer.phoneNumber,
          businessWebsite: customer.businessWebsite,
          requiredService: customer.requiredService,
          notes: customer.notes,
        },
        websiteOverview,
        selectedServices,
        existingProposal: {
          projectTitle: proposal.projectTitle,
          projectDescription: proposal.projectDescription,
          notes: proposal.notes,
        },
        requiredSections: [
          "introduction",
          "businessUnderstanding",
          "problemsOrOpportunities",
          "proposedSolutions",
          "scopeOfWork",
          "closingStatement",
        ],
      },
      null,
      2,
    );

    let response: Response | null = null;
    let data: (GeminiGenerateContentResponse & GeminiErrorResponse) | null =
      null;
    let lastError: GeminiErrorResponse | null = null;
    let lastRawBody = "";

    for (const candidateModel of fallbackModels) {
      let attemptError: GeminiErrorResponse | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await callGeminiGenerateContent({
          apiKey,
          model: candidateModel,
          prompt,
        });

        response = result.response;
        data = result.data;
        lastRawBody = result.rawBody;

        if (response.ok) {
          break;
        }

        attemptError = data;
        const status = response.status;
        const shouldRetry = status === 429 || status === 503 || status === 504;

        if (!shouldRetry || attempt === 2) {
          break;
        }

        await wait(500 * 2 ** attempt);
      }

      if (response?.ok) {
        break;
      }

      lastError = attemptError;
    }

    if (!response || !data) {
      return NextResponse.json(
        { error: "AI proposal generation failed before receiving a response" },
        { status: 500 },
      );
    }

    if (!response.ok) {
      const upstreamStatus = response.status;
      const upstreamMessage =
        data.error?.message ||
        lastError?.error?.message ||
        lastRawBody.slice(0, 1000) ||
        "AI proposal generation failed";

      if (
        upstreamStatus === 429 ||
        upstreamStatus === 503 ||
        upstreamStatus === 504
      ) {
        console.warn(
          `[AI proposal] Gemini unavailable (${upstreamStatus}) after retries. Falling back to a local draft.`,
          {
            model,
            upstreamReason: data.error?.status || lastError?.error?.status,
            upstreamMessage,
          },
        );

        const generated = buildFallbackGeneratedProposal({
          company,
          customer,
          selectedServices,
          websiteOverview,
        });
        const notes = formatGeneratedNotes(generated);
        const draft = {
          ...proposal,
          projectTitle: generated.projectTitle,
          projectDescription: generated.projectDescription,
          notes,
          updatedAt: new Date().toISOString(),
        };

        const draftResult = await saveGeneratedDraft(draft, company, generated);
        if (draftResult.error) {
          return NextResponse.json(
            { error: draftResult.error.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            proposal: draft,
            generated,
            websiteFetchNote: websiteOverview.fetchNote,
            generationMode: "fallback",
            warning:
              "Gemini was temporarily unavailable, so a local draft was generated from the saved data instead.",
          },
        });
      }

      return NextResponse.json(
        {
          error: upstreamMessage,
          upstreamStatus,
          upstreamCode: data.error?.code || lastError?.error?.code,
          upstreamReason: data.error?.status || lastError?.error?.status,
          upstreamBody: lastRawBody.slice(0, 1000),
        },
        { status: upstreamStatus },
      );
    }

    const outputText = getResponseText(data);
    if (!outputText) {
      return NextResponse.json(
        { error: "AI returned an empty proposal" },
        { status: 500 },
      );
    }

    const generated = JSON.parse(outputText) as GeneratedProposal;
    const notes = formatGeneratedNotes(generated);
    const draft = {
      ...proposal,
      projectTitle: generated.projectTitle,
      projectDescription: generated.projectDescription,
      notes,
      updatedAt: new Date().toISOString(),
    };

    const draftResult = await saveGeneratedDraft(draft, company, generated);
    if (draftResult.error) {
      return NextResponse.json(
        { error: draftResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        proposal: draft,
        generated,
        websiteFetchNote: websiteOverview.fetchNote,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
