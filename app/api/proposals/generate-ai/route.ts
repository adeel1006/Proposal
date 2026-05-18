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
  provider?: "openai" | "gemini";
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
  websiteFindings: string[];
  keywordTargets: string[];
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

type OpenAIResponsesApiResponse = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

const COMMON_STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "between",
  "both",
  "but",
  "by",
  "can",
  "do",
  "for",
  "from",
  "get",
  "had",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "more",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "out",
  "over",
  "same",
  "so",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "to",
  "up",
  "use",
  "using",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

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
    "websiteFindings",
    "keywordTargets",
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
    websiteFindings: {
      type: "array",
      items: { type: "string" },
    },
    keywordTargets: {
      type: "array",
      items: { type: "string" },
    },
    confidenceNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function removeEmDashes(value: string) {
  return value.replace(/—/g, "-").replace(/–/g, "-");
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

function extractHeadings(html: string, tag: "h1" | "h2") {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match = regex.exec(html);

  while (match && results.length < 6) {
    const value = normalizeWhitespace(
      decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ")),
    );
    if (value) {
      results.push(value);
    }
    match = regex.exec(html);
  }

  return results;
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
    const title = decodeHtmlEntities(
      /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "",
    );
    const metaDescription =
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "og:description");
    const h1Headings = extractHeadings(html, "h1");
    const h2Headings = extractHeadings(html, "h2");
    const extracted = extractWebsiteText(html).slice(0, 12000);

    return {
      url: url.toString(),
      title,
      metaDescription,
      h1Headings,
      h2Headings,
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

type WebsiteOverview = Awaited<ReturnType<typeof fetchWebsiteOverview>>;

function buildWebsiteFindings({
  focus,
  websiteOverview,
  customer,
}: {
  focus: string;
  websiteOverview: WebsiteOverview;
  customer: Customer;
}) {
  const findings: string[] = [];
  const title = websiteOverview.title?.trim();
  const metaDescription = websiteOverview.metaDescription?.trim();
  const primaryHeading = websiteOverview.h1Headings?.[0]?.trim();
  const secondaryHeading = websiteOverview.h2Headings?.[0]?.trim();
  const text = websiteOverview.text || "";

  if (title) {
    findings.push(`Page title theme: ${title}`);
  }
  if (primaryHeading) {
    findings.push(`Primary page heading: ${primaryHeading}`);
  }
  if (secondaryHeading && secondaryHeading !== primaryHeading) {
    findings.push(`Supporting page topic: ${secondaryHeading}`);
  }
  if (!metaDescription && focus === "seo") {
    findings.push("No clear meta description was detected from the page response.");
  }
  if (customer.requiredService?.trim()) {
    findings.push(`Saved customer need: ${customer.requiredService.trim()}`);
  }

  if (focus === "seo") {
    findings.push(
      text.length < 500
        ? "Limited crawlable copy was found, so keyword and on-page opportunities may be narrower."
        : "Visible website copy provides usable signals for keyword targeting and on-page recommendations.",
    );
  }

  if (focus === "web-design") {
    findings.push(
      "Proposal should reflect page clarity, trust, structure, and conversion flow based on visible website messaging.",
    );
  }

  if (focus === "graphic-design") {
    findings.push(
      "Proposal should reflect brand presentation, visual consistency, and communication quality suggested by the website content.",
    );
  }

  if (focus === "google-ads" || focus === "meta-ads") {
    findings.push(
      "Proposal should connect campaign strategy to the landing-page message, offer clarity, and conversion readiness.",
    );
  }

  return findings.slice(0, 5);
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
    generated.websiteFindings.length
      ? `Website Findings\n${list(generated.websiteFindings)}`
      : "",
    generated.keywordTargets.length
      ? `Suggested Keyword Targets\n${list(generated.keywordTargets)}`
      : "",
    generated.confidenceNotes.length
      ? `Review Notes\n${list(generated.confidenceNotes)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function truncateAtWordBoundary(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(removeEmDashes(value));
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const shortened = normalized.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${(lastSpace > 40 ? shortened.slice(0, lastSpace) : shortened).trim()}.`;
}

function sanitizeKeywordPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSeoKeywordHints(text: string) {
  const normalized = sanitizeKeywordPhrase(text);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 3 &&
        token.length <= 24 &&
        !COMMON_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );

  const phraseCounts = new Map<string, number>();
  const singleCounts = new Map<string, number>();

  for (const token of tokens) {
    singleCounts.set(token, (singleCounts.get(token) || 0) + 1);
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    if (!first || !second) {
      continue;
    }

    const phrase = `${first} ${second}`;
    if (phrase.length > 40) {
      continue;
    }

    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  }

  const topPhrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 1)
    .sort((left, right) => right[1] - left[1])
    .map(([phrase]) => phrase);

  const topSingles = Array.from(singleCounts.entries())
    .filter(([, count]) => count >= 1)
    .sort((left, right) => right[1] - left[1])
    .map(([token]) => token);

  return Array.from(new Set([...topPhrases, ...topSingles])).slice(0, 8);
}

function inferProposalFocus(
  selectedServices: ProposalItem[],
  scopeLimitations: string,
) {
  const haystack = normalizeWhitespace(
    [
      scopeLimitations,
      ...selectedServices.map((service) =>
        [service.name, service.category, service.description]
          .filter(Boolean)
          .join(" "),
      ),
    ].join(" "),
  ).toLowerCase();

  if (haystack.includes("seo") || haystack.includes("search engine")) {
    return "seo";
  }
  if (haystack.includes("google ads") || haystack.includes("adwords") || haystack.includes("ppc")) {
    return "google-ads";
  }
  if (
    haystack.includes("meta ads") ||
    haystack.includes("facebook ads") ||
    haystack.includes("instagram ads")
  ) {
    return "meta-ads";
  }
  if (haystack.includes("graphic design") || haystack.includes("branding") || haystack.includes("logo")) {
    return "graphic-design";
  }
  if (haystack.includes("web design") || haystack.includes("website") || haystack.includes("ui") || haystack.includes("ux")) {
    return "web-design";
  }
  return "general";
}

function buildProposalQualityInstructions({
  focus,
  customer,
  selectedServices,
  seoKeywordHints,
}: {
  focus: string;
  customer: Customer;
  selectedServices: ProposalItem[];
  seoKeywordHints: string[];
}) {
  const serviceNames = selectedServices.map((service) => service.name).filter(Boolean);
  const customerName = customer.name || "the client";

  const commonInstructions = [
    `Every section must feel written specifically for ${customerName}, not like a generic template.`,
    "Use the selected services as the real scope and connect them to the client's business context and website observations.",
    "Make the proposal persuasive by highlighting business relevance, clarity, and likely upside without making guarantees.",
    "Avoid repeating the same idea across multiple sections. Each point must add something new.",
    "Only write about the selected service or services. Do not mix information, deliverables, strategy, keywords, SEO work, ad work, design work, or development work from services that were not selected.",
    "The proposal must clearly show client issues or opportunities and then the proposed solutions that address them.",
    "Keep the proposal clean, service-specific, and professionally structured with no unnecessary overlap between services.",
    "Do not use em dashes in any output text.",
  ];

  if (focus === "seo") {
    return [
      ...commonInstructions,
      `The proposal focus is SEO using these selected services: ${serviceNames.join(", ") || "selected services"}.`,
      seoKeywordHints.length > 0
        ? `Use these website-derived keyword hints to shortlist 3 to 5 likely target keywords naturally inside the proposal: ${seoKeywordHints.join(", ")}.`
        : "Shortlist 3 to 5 likely target keywords from the available website text and business context, and mention them naturally inside the proposal.",
      "The SEO points must reference content themes, search intent, page relevance, or visibility opportunities seen on the website whenever evidence exists.",
      "Do not write vague SEO filler like 'improve rankings' unless you also tie it to specific keyword themes, content gaps, or on-page opportunities.",
      "Do not mention paid ads, web development deliverables, or unrelated design services unless they are explicitly selected.",
    ].join(" ");
  }

  if (focus === "google-ads") {
    return [
      ...commonInstructions,
      "The proposal focus is Google Ads.",
      "Make the points feel commercially sharp: search intent, campaign structure, lead quality, landing-page alignment, and measurable decision-making.",
      "Avoid generic ad copy advice unless it is tied to the client's offer or website context.",
      "Do not include SEO strategy, website development scope, or unrelated creative services unless they are explicitly selected.",
    ].join(" ");
  }

  if (focus === "meta-ads") {
    return [
      ...commonInstructions,
      "The proposal focus is Meta Ads.",
      "Make the points feel conversion-aware: audience targeting, creative angles, offer clarity, and funnel alignment for Facebook and Instagram.",
      "Avoid generic social media advice unless it is tied to the client's business or website context.",
      "Do not include SEO strategy, website development scope, or unrelated non-advertising deliverables unless they are explicitly selected.",
    ].join(" ");
  }

  if (focus === "web-design") {
    return [
      ...commonInstructions,
      "The proposal focus is web design.",
      "Reference clarity of offer, trust, conversion flow, user experience, messaging, and structure based on the website where possible.",
      "Do not include SEO campaigns, advertising strategy, targeting plans, or unrelated marketing deliverables unless they are explicitly selected.",
    ].join(" ");
  }

  if (focus === "graphic-design") {
    return [
      ...commonInstructions,
      "The proposal focus is graphic design.",
      "Reference brand clarity, visual consistency, presentation quality, and client-facing impact where relevant.",
      "Do not include website development scope, SEO strategy, or advertising campaign details unless they are explicitly selected.",
    ].join(" ");
  }

  return commonInstructions.join(" ");
}

function trimList(items: string[], maxItems: number, maxLength: number) {
  return items
    .map((item) => truncateAtWordBoundary(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeGeneratedProposal(
  generated: GeneratedProposal,
): GeneratedProposal {
  return {
    projectTitle: removeEmDashes(generated.projectTitle || ""),
    projectDescription: removeEmDashes(generated.projectDescription || ""),
    introduction: removeEmDashes(generated.introduction || ""),
    businessUnderstanding: removeEmDashes(generated.businessUnderstanding || ""),
    problemsOrOpportunities: (generated.problemsOrOpportunities || []).map(removeEmDashes),
    proposedSolutions: (generated.proposedSolutions || []).map(removeEmDashes),
    scopeOfWork: (generated.scopeOfWork || []).map(removeEmDashes),
    closingStatement: removeEmDashes(generated.closingStatement || ""),
    websiteSummary: removeEmDashes(generated.websiteSummary || ""),
    websiteFindings: (generated.websiteFindings || []).map(removeEmDashes),
    keywordTargets: (generated.keywordTargets || []).map(removeEmDashes),
    confidenceNotes: (generated.confidenceNotes || []).map(removeEmDashes),
  };
}

function shortenGeneratedProposal(
  generated: GeneratedProposal,
): GeneratedProposal {
  return {
    projectTitle: truncateAtWordBoundary(generated.projectTitle, 90),
    projectDescription: truncateAtWordBoundary(
      generated.projectDescription,
      170,
    ),
    introduction: truncateAtWordBoundary(generated.introduction, 180),
    businessUnderstanding: truncateAtWordBoundary(
      generated.businessUnderstanding,
      180,
    ),
    problemsOrOpportunities: trimList(
      generated.problemsOrOpportunities,
      2,
      120,
    ),
    proposedSolutions: trimList(generated.proposedSolutions, 2, 120),
    scopeOfWork: trimList(generated.scopeOfWork, 2, 120),
    closingStatement: truncateAtWordBoundary(generated.closingStatement, 160),
    websiteSummary: truncateAtWordBoundary(generated.websiteSummary, 220),
    websiteFindings: trimList(generated.websiteFindings, 3, 130),
    keywordTargets: trimList(generated.keywordTargets, 5, 45),
    confidenceNotes: trimList(generated.confidenceNotes, 2, 120),
  };
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

function getOpenAIOutputText(response: OpenAIResponsesApiResponse) {
  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .filter((content) => content.type === "output_text" && content.text)
      .map((content) => content.text || "")
      .join("\n") || ""
  );
}

async function callOpenAIResponses({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You write short, persuasive agency proposals and must return strict JSON that matches the provided schema.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "proposal_response",
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
        verbosity: "low",
      },
      max_output_tokens: 1200,
    }),
  });

  const rawBody = await response.text();
  let data: OpenAIResponsesApiResponse | null = null;

  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody) as OpenAIResponsesApiResponse;
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
  seoKeywordHints,
  websiteFindings,
}: {
  company: CompanyBranding;
  customer: Customer;
  selectedServices: ProposalItem[];
  websiteOverview: Awaited<ReturnType<typeof fetchWebsiteOverview>>;
  seoKeywordHints: string[];
  websiteFindings: string[];
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
  const keywordLine = seoKeywordHints.length
    ? ` Likely keyword themes: ${seoKeywordHints.slice(0, 5).join(", ")}.`
    : "";

  return {
    projectTitle: title,
    projectDescription:
      `A professional proposal prepared for ${customer.name || "the customer"} using the stored customer details, selected company services, and the available website review notes.`,
    introduction:
      `Thank you for considering ${company.businessName}. This draft was prepared from the available customer record, selected services, and website review information.`,
    businessUnderstanding:
      `Based on the saved data, ${customer.name || "the customer"} needs support around ${primaryService}. The proposal has been kept aligned to the provided scope and the website review notes only.`,
    problemsOrOpportunities: [
      `The current website and brief indicate a clear need around ${primaryService}.`,
      `There is room to align ${primaryService} with a more focused client-facing strategy and clearer execution scope.${keywordLine}`,
    ],
    proposedSolutions: serviceNames.length
      ? serviceNames.map((name) => `Use ${name} to address the most relevant gaps seen in the client's current presence.`)
      : [
          "Deliver the approved services within a focused, high-value scope.",
        ],
    scopeOfWork: [
      ...serviceNames.map((name) => `${name} delivered within the agreed scope and tailored to the client's immediate needs.`),
      "Any extra work, timelines, or promises must stay within the approved scope limitations.",
    ],
    closingStatement:
      "This proposal is designed to be practical, focused, and easy to move forward with once the scope is approved.",
    websiteSummary: summarySource.slice(0, 700),
    websiteFindings,
    keywordTargets: seoKeywordHints.slice(0, 5),
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
    const body = (await request.json()) as GenerateProposalPayload;
    const {
      proposal,
      company,
      customer,
      agencyTone,
      scopeLimitations,
      provider = "openai",
    } = body;

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
    const seoKeywordHints = extractSeoKeywordHints(websiteOverview.text);
    const proposalFocus = inferProposalFocus(
      selectedServices,
      scopeLimitations,
    );
    const proposalQualityInstructions = buildProposalQualityInstructions({
      focus: proposalFocus,
      customer,
      selectedServices,
      seoKeywordHints,
    });
    const websiteFindings = buildWebsiteFindings({
      focus: proposalFocus,
      websiteOverview,
      customer,
    });
    const prompt = JSON.stringify(
      {
        instructions:
          "Generate a very concise, persuasive agency proposal. Keep the full proposal short, direct, and interesting for the client. Write each paragraph in 1 to 2 short sentences maximum. Return exactly 2 concise items for problemsOrOpportunities, 2 for proposedSolutions, and 2 for scopeOfWork. Keep projectDescription to one short sentence, websiteSummary to no more than 2 short sentences, websiteFindings to 2 or 3 specific findings, keywordTargets to 3 to 5 relevant keywords when SEO or search intent is involved, and confidenceNotes to at most 2 brief notes. Use only provided customer data, website text, and the selected services. Do not invent facts, metrics, guarantees, timelines, or services. Keep the proposal strictly limited to the selected service scope and do not mix in details from unselected services. Always include clear client issues or opportunities and then proposed solutions that directly address them. Do not use em dashes in any output. Return only JSON matching the schema.",
        agencyTone:
          agencyTone?.trim() ||
          "Professional, concise, persuasive, and business-focused.",
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
        seoKeywordHints,
        websiteFindings,
        proposalFocus,
        proposalQualityInstructions,
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

    let outputText = "";
    let upstreamStatus = 500;
    let upstreamMessage = "AI proposal generation failed";
    let upstreamCode: string | number | undefined;
    let upstreamReason: string | undefined;
    let lastRawBody = "";

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing OPENAI_API_KEY in environment variables" },
          { status: 500 },
        );
      }

      const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
      const result = await callOpenAIResponses({
        apiKey,
        model,
        prompt,
      });

      upstreamStatus = result.response.status;
      lastRawBody = result.rawBody;
      upstreamMessage =
        result.data?.error?.message ||
        result.rawBody.slice(0, 1000) ||
        "OpenAI proposal generation failed";
      upstreamCode = result.data?.error?.code;
      upstreamReason = result.data?.error?.type;

      if (result.response.ok && result.data) {
        outputText = getOpenAIOutputText(result.data);
      } else if (upstreamStatus === 429 || upstreamStatus === 503 || upstreamStatus === 504) {
        console.warn(
          `[AI proposal] OpenAI unavailable (${upstreamStatus}). Falling back to a local draft.`,
          {
            model,
            upstreamMessage,
          },
        );

        const generated = shortenGeneratedProposal(
          buildFallbackGeneratedProposal({
            company,
            customer,
            selectedServices,
            websiteOverview,
            seoKeywordHints,
            websiteFindings,
          }),
        );
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
              "OpenAI was temporarily unavailable, so a shorter local draft was generated from the saved data instead.",
          },
        });
      }
    } else {
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing GEMINI_API_KEY in environment variables" },
          { status: 500 },
        );
      }

      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const fallbackModels = Array.from(
        new Set([model, "gemini-2.5-flash-lite", "gemini-2.0-flash"]),
      );
      let response: Response | null = null;
      let data: (GeminiGenerateContentResponse & GeminiErrorResponse) | null =
        null;
      let lastError: GeminiErrorResponse | null = null;

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
          upstreamStatus = response.status;
          const shouldRetry =
            upstreamStatus === 429 ||
            upstreamStatus === 503 ||
            upstreamStatus === 504;

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

      upstreamStatus = response.status;
      upstreamMessage =
        data.error?.message ||
        lastError?.error?.message ||
        lastRawBody.slice(0, 1000) ||
        "Gemini proposal generation failed";
      upstreamCode = data.error?.code || lastError?.error?.code;
      upstreamReason = data.error?.status || lastError?.error?.status;

      if (!response.ok) {
        if (
          upstreamStatus === 429 ||
          upstreamStatus === 503 ||
          upstreamStatus === 504
        ) {
          console.warn(
            `[AI proposal] Gemini unavailable (${upstreamStatus}) after retries. Falling back to a local draft.`,
            {
              model,
              upstreamReason,
              upstreamMessage,
            },
          );

          const generated = shortenGeneratedProposal(
            buildFallbackGeneratedProposal({
              company,
              customer,
              selectedServices,
              websiteOverview,
              seoKeywordHints,
              websiteFindings,
            }),
          );
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
                "Gemini was temporarily unavailable, so a shorter local draft was generated from the saved data instead.",
            },
          });
        }
      } else {
        outputText = getResponseText(data);
      }
    }

    if (!outputText) {
      return NextResponse.json(
        {
          error: upstreamMessage,
          upstreamStatus,
          upstreamCode,
          upstreamReason,
          upstreamBody: lastRawBody.slice(0, 1000),
        },
        { status: upstreamStatus },
      );
    }

    const generated = shortenGeneratedProposal(
      sanitizeGeneratedProposal(JSON.parse(outputText) as GeneratedProposal),
    );
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
