export interface CompanyBranding {
  id: string;
  businessName: string;
  email: string; // Used as reply-to address in emails
  mobileNumber: string;
  whatsapp?: string;
  address: string;
  registrationNumber?: string;
  website?: string;
  logo?: string; // Base64 or URL
  currency: string;
  replyToEmail?: string; // Optional: override for reply-to address (defaults to email)
  // Social Media Links
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  pinterest?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * DYNAMIC EMAIL SENDING
   * When a proposal is sent with this company:
   * - From: "[businessName] <[shared-smtp@domain]>"
   * - Reply-To: "[replyToEmail or email]"
   * - Email body includes company logo, branding, and contact info
   * - Clients receive professionally branded emails from their company
   */
}

export interface ProposalItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  category?: string;
  quantity?: number;
}

export interface ProposalAttachment {
  id: string;
  label: string;
  url: string;
}

export interface ProposalTerms {
  depositPercent?: number;
  timeline?: string;
  additionalTerms?: string;
}

export interface Proposal {
  id: string;
  companyId: string; // ID of selected company branding
  clientName: string;
  clientEmail?: string;
  clientPhoneNumber?: string;
  projectTitle: string;
  projectDescription?: string;
  selectedItems: string[];
  items: ProposalItem[];
  notes?: string;
  validUntil?: string;
  proposalDate?: string;
  paymentLink?: string;
  attachments?: ProposalAttachment[];
  terms?: ProposalTerms;
  createdAt?: string;
  updatedAt?: string;
}

export const MAX_PROPOSAL_ATTACHMENTS = 20;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeProposalAttachments(
  attachments?: ProposalAttachment[] | null
): ProposalAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.slice(0, MAX_PROPOSAL_ATTACHMENTS).map((attachment, index) => ({
    id: String(attachment?.id || `attachment-${index + 1}`),
    label: String(attachment?.label || "").trim(),
    url: String(attachment?.url || "").trim(),
  }));
}

export function getCompleteProposalAttachments(
  attachments?: ProposalAttachment[] | null
): ProposalAttachment[] {
  return normalizeProposalAttachments(attachments).filter(
    (attachment) => attachment.label && attachment.url
  );
}

export function validateProposalAttachments(
  attachments?: ProposalAttachment[] | null
): string | null {
  if (!Array.isArray(attachments)) {
    return null;
  }

  if (attachments.length > MAX_PROPOSAL_ATTACHMENTS) {
    return `You can add up to ${MAX_PROPOSAL_ATTACHMENTS} attachments.`;
  }

  const normalizedAttachments = normalizeProposalAttachments(attachments);
  for (const [index, attachment] of normalizedAttachments.entries()) {
    if (!attachment.label && !attachment.url) {
      continue;
    }

    if (!attachment.label || !attachment.url) {
      return `Attachment ${index + 1} must include both text and link.`;
    }

    if (!isHttpUrl(attachment.url)) {
      return `Attachment ${index + 1} must use a valid http or https link.`;
    }
  }

  return null;
}

export const DEFAULT_ITEMS: ProposalItem[] = [
  {
    id: "web-design",
    name: "Web Design",
    description: "Custom responsive website design with Figma mockups",
    price: 1500,
    currency: "USD",
    category: "Design",
    quantity: 1,
  },
  {
    id: "web-dev",
    name: "Web Development",
    description: "Full-stack web application development using React and Node.js",
    price: 3000,
    currency: "USD",
    category: "Development",
    quantity: 1,
  },
  {
    id: "mobile-dev",
    name: "Mobile Development",
    description: "iOS/Android native or cross-platform app with backend integration",
    price: 4000,
    currency: "USD",
    category: "Development",
    quantity: 1,
  },
  {
    id: "api",
    name: "API Development",
    description: "RESTful API development, authentication, and database integration",
    price: 2000,
    currency: "USD",
    category: "Development",
    quantity: 1,
  },
  {
    id: "db",
    name: "Database Setup",
    description: "Database design, optimization, and deployment",
    price: 1000,
    currency: "USD",
    category: "Development",
    quantity: 1,
  },
  {
    id: "seo",
    name: "SEO Optimization",
    description: "Search engine optimization, analytics, and reporting",
    price: 800,
    currency: "USD",
    category: "Marketing",
    quantity: 1,
  },
  {
    id: "content",
    name: "Content Writing",
    description: "Professional copywriting, blog posts, and content strategy",
    price: 600,
    currency: "USD",
    category: "Marketing",
    quantity: 1,
  },
  {
    id: "maintenance",
    name: "Maintenance & Support",
    description: "3 months of ongoing maintenance, bug fixes, and support",
    price: 1200,
    currency: "USD",
    category: "Support",
    quantity: 1,
  },
];

export const DEFAULT_TERMS: ProposalTerms = {
  depositPercent: 50,
  timeline: "Project timeline begins after deposit is received",
  additionalTerms: "",
};

// Import currency conversion utilities
import { convertToUSD, convertCurrency } from '@/lib/currencyService';

export const getSelectedItemsTotal = (
  selectedIds: string[],
  items: ProposalItem[]
): number => {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
};

/**
 * Calculate total in USD with currency conversion
 * Handles mixed currencies from different items
 */
export const getSelectedItemsTotalUSD = async (
  selectedIds: string[],
  items: ProposalItem[]
): Promise<number> => {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  let totalUSD = 0;
  for (const item of selectedItems) {
    const itemCurrency = item.currency || 'USD';
    const itemTotal = item.price * (item.quantity || 1);

    // Convert to USD if not already in USD
    if (itemCurrency !== 'USD') {
      try {
        const usdAmount = await convertToUSD(itemTotal, itemCurrency);
        totalUSD += usdAmount;
      } catch (error) {
        console.error(`Failed to convert ${itemCurrency} to USD:`, error);
        // Fallback: add as-is if conversion fails
        totalUSD += itemTotal;
      }
    } else {
      totalUSD += itemTotal;
    }
  }

  return totalUSD;
};

/**
 * Calculate total in company currency
 * Converts all items to company currency for display
 */
export const getSelectedItemsTotalInCurrency = async (
  selectedIds: string[],
  items: ProposalItem[],
  targetCurrency: string = 'USD'
): Promise<number> => {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  let total = 0;
  for (const item of selectedItems) {
    const itemCurrency = item.currency || 'USD';
    const itemTotal = item.price * (item.quantity || 1);

    // Convert to target currency if different
    if (itemCurrency !== targetCurrency) {
      try {
        const convertedAmount = await convertCurrency(itemTotal, itemCurrency, targetCurrency);
        total += convertedAmount;
      } catch (error) {
        console.error(`Failed to convert ${itemCurrency} to ${targetCurrency}:`, error);
        // Fallback: convert to USD first, then to target
        try {
          const usdAmount = await convertToUSD(itemTotal, itemCurrency);
          const targetAmount = await convertCurrency(usdAmount, 'USD', targetCurrency);
          total += targetAmount;
        } catch (fallbackError) {
          console.error('Fallback conversion also failed:', fallbackError);
          total += itemTotal; // Last resort
        }
      }
    } else {
      total += itemTotal;
    }
  }

  return total;
};

export const generateProposalId = (): string => {
  return `PROP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const generateCompanyId = (): string => {
  return `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

