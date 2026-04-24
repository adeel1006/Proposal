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
  terms?: ProposalTerms;
  createdAt?: string;
  updatedAt?: string;
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

export const getSelectedItemsTotal = (
  selectedIds: string[],
  items: ProposalItem[]
): number => {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
};

export const generateProposalId = (): string => {
  return `PROP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const generateCompanyId = (): string => {
  return `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

