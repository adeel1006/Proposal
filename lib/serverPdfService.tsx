import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  CompanyBranding,
  Proposal,
  ProposalItem,
} from "@/app/lib/proposalTypes";

const NAVY = "#0B1F4D";
const ROYAL = "#174EA6";
const TEXT = "#1E293B";
const MUTED = "#64748B";
const BORDER = "#D8E0EC";
const PALE = "#F3F7FC";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 34,
    paddingBottom: 38,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: TEXT,
    backgroundColor: "#FFFFFF",
  },
  accent: { height: 6, backgroundColor: NAVY, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  brandBlock: { width: "62%" },
  logo: { width: 88, height: 38, objectFit: "contain", marginBottom: 6 },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  contact: { fontSize: 7.5, lineHeight: 1.45, color: MUTED },
  documentBlock: { width: "34%", alignItems: "flex-end" },
  documentTitle: { fontSize: 21, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, color: ROYAL },
  documentMeta: { marginTop: 5, fontSize: 7.5, lineHeight: 1.45, color: MUTED, textAlign: "right" },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 13 },
  cards: { flexDirection: "row", gap: 8, marginBottom: 14 },
  card: { flexGrow: 1, flexBasis: 0, padding: 9, borderWidth: 1, borderColor: BORDER, borderRadius: 3, backgroundColor: PALE },
  cardLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.7, color: ROYAL, marginBottom: 4 },
  cardValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: TEXT, lineHeight: 1.3 },
  cardSubvalue: { marginTop: 3, fontSize: 7, color: MUTED, lineHeight: 1.35 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 },
  overview: { padding: 10, borderLeftWidth: 3, borderLeftColor: ROYAL, backgroundColor: "#EDF3FC", fontSize: 8, color: MUTED, lineHeight: 1.5 },
  table: { borderWidth: 1, borderColor: BORDER },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", minHeight: 23, alignItems: "center" },
  tableHeaderText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.35, color: "#FFFFFF" },
  tableRow: { flexDirection: "row", minHeight: 31, borderTopWidth: 1, borderTopColor: BORDER, alignItems: "flex-start" },
  cell: { paddingVertical: 7, paddingHorizontal: 6, fontSize: 7.25, lineHeight: 1.35, color: MUTED },
  cellStrong: { fontFamily: "Helvetica-Bold", color: TEXT },
  right: { textAlign: "right" },
  summary: { width: 222, marginTop: 13, marginLeft: "auto" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, color: MUTED },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3, paddingVertical: 8, borderTopWidth: 2, borderBottomWidth: 2, borderColor: ROYAL },
  totalText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  termsRow: { flexDirection: "row", gap: 8 },
  termCard: { flexGrow: 1, flexBasis: 0, padding: 9, borderWidth: 1, borderColor: BORDER, borderRadius: 3 },
  termLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, color: ROYAL, marginBottom: 4 },
  termText: { fontSize: 7.5, lineHeight: 1.45, color: MUTED },
  notes: { padding: 10, backgroundColor: "#EDF3FC", borderLeftWidth: 3, borderLeftColor: ROYAL, fontSize: 7.5, color: MUTED, lineHeight: 1.5 },
  proposalContent: { gap: 7 },
  proposalSection: { padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 3, backgroundColor: "#FBFCFE" },
  proposalSectionFirst: { padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 3, backgroundColor: "#EDF3FC" },
  proposalHeading: { fontSize: 9, fontFamily: "Helvetica-Bold", color: ROYAL, marginBottom: 5 },
  proposalParagraph: { fontSize: 7.5, lineHeight: 1.5, color: MUTED, marginBottom: 4 },
  bulletRow: { flexDirection: "row", paddingVertical: 3 },
  bulletMark: { width: 10, fontSize: 8, color: ROYAL },
  bulletText: { flex: 1, fontSize: 7.5, lineHeight: 1.45, color: MUTED },
  resource: { marginBottom: 4, fontSize: 7.25, color: MUTED, lineHeight: 1.4 },
  footer: { position: "absolute", left: 34, right: 34, bottom: 18, paddingTop: 7, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6.5, color: "#8290A3" },
});

type PdfProps = {
  proposal: Proposal;
  company: CompanyBranding;
  items: ProposalItem[];
};

function selectedItems(proposal: Proposal, items: ProposalItem[]) {
  const selected = new Set(proposal.selectedItems || []);
  return items
    .filter((item) => !selected.size || selected.has(item.id))
    .map((item) => ({ ...item, quantity: item.quantity || 1 }));
}

function money(value: number, currency: string) {
  return `${currency} ${value.toFixed(2)}`;
}

function documentDate() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function logoSource(logo?: string) {
  if (!logo) return null;
  if (/^data:image\/(png|jpe?g);base64,/i.test(logo)) return logo;
  if (/^https?:\/\/.+\.(png|jpe?g)(?:\?.*)?$/i.test(logo)) return logo;
  return null;
}

const PROPOSAL_HEADINGS = new Map([
  ["introduction", "Introduction"],
  ["understanding of the client's business", "Understanding of the Client's Business"],
  ["identified problems or opportunities", "Identified Problems or Opportunities"],
  ["proposed solutions", "Proposed Solutions"],
  ["scope of work", "Detailed Scope Notes"],
  ["closing statement", "Closing Statement"],
  ["website overview", "Website Overview"],
  ["website findings", "Website Findings"],
  ["suggested keyword targets", "Suggested Keyword Targets"],
  ["review notes", "Review Notes"],
]);

type ProposalContentSection = {
  heading: string;
  paragraphs: string[];
  bullets: string[];
};

function parseProposalContent(notes?: string): ProposalContentSection[] {
  const lines = String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
  const sections: ProposalContentSection[] = [];
  let current: ProposalContentSection = {
    heading: "Proposal Overview",
    paragraphs: [],
    bullets: [],
  };

  const pushCurrent = () => {
    if (current.paragraphs.length || current.bullets.length) sections.push(current);
  };

  for (const line of lines) {
    if (!line) continue;
    const normalizedHeading = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/:$/, "")
      .trim();
    const mappedHeading = PROPOSAL_HEADINGS.get(normalizedHeading.toLowerCase());
    const isGenericHeading =
      line.length <= 70 &&
      !/[.!?]$/.test(line) &&
      (/^#{1,6}\s+/.test(line) || /^\d+[.)]\s+/.test(line) || /:$/.test(line));
    if (mappedHeading || isGenericHeading) {
      pushCurrent();
      current = { heading: mappedHeading || normalizedHeading, paragraphs: [], bullets: [] };
    } else if (/^[-*\u2022]\s+/.test(line)) {
      current.bullets.push(line.replace(/^[-*\u2022]\s+/, ""));
    } else {
      current.paragraphs.push(line);
    }
  }
  pushCurrent();
  return sections;
}

function ProposalContent({ notes }: { notes?: string }) {
  const sections = parseProposalContent(notes);
  if (!sections.length) return null;
  return (
    <View style={styles.proposalContent}>
      {sections.map((section, index) => (
        <View
          key={`${section.heading}-${index}`}
          style={index === 0 ? styles.proposalSectionFirst : styles.proposalSection}
        >
          <Text style={styles.proposalHeading} minPresenceAhead={28}>{section.heading}</Text>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text key={paragraphIndex} style={styles.proposalParagraph}>{paragraph}</Text>
          ))}
          {section.bullets.map((bullet, bulletIndex) => (
            <View key={bulletIndex} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>{"\u2022"}</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function CompanyHeader({ company, title, number }: { company: CompanyBranding; title: string; number: string }) {
  const logo = logoSource(company.logo);
  return (
    <>
      <View style={styles.accent} />
      <View style={styles.header}>
        <View style={styles.brandBlock}>
          {/* react-pdf Image does not support the DOM alt attribute. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logo ? <Image src={logo} style={styles.logo} /> : null}
          <Text style={styles.companyName}>{company.businessName}</Text>
          <Text style={styles.contact}>{company.email}</Text>
          {company.mobileNumber ? <Text style={styles.contact}>{company.mobileNumber}</Text> : null}
          {company.address ? <Text style={styles.contact}>{company.address}</Text> : null}
          {company.registrationNumber ? <Text style={styles.contact}>Registration: {company.registrationNumber}</Text> : null}
          {company.website ? <Text style={styles.contact}>{company.website}</Text> : null}
        </View>
        <View style={styles.documentBlock}>
          <Text style={styles.documentTitle}>{title}</Text>
          <Text style={styles.documentMeta}>{number}{"\n"}{documentDate()}</Text>
        </View>
      </View>
      <View style={styles.divider} />
    </>
  );
}

function PageFooter({ company }: { company: CompanyBranding }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{company.businessName}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function InvoiceDocument({ proposal, company, items }: PdfProps) {
  const rows = selectedItems(proposal, items);
  const currency = company.currency || "USD";
  const total = rows.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const depositPercent = proposal.terms?.depositPercent || 0;
  return (
    <Document title={`Invoice - ${proposal.projectTitle}`} author={company.businessName}>
      <Page size="A4" style={styles.page} wrap>
        <CompanyHeader company={company} title="INVOICE" number={`Invoice #${proposal.id}`} />
        <View style={styles.cards} wrap={false}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>BILL TO</Text>
            <Text style={styles.cardValue}>{proposal.clientName}</Text>
            {proposal.clientEmail ? <Text style={styles.cardSubvalue}>{proposal.clientEmail}</Text> : null}
            {proposal.clientPhoneNumber ? <Text style={styles.cardSubvalue}>{proposal.clientPhoneNumber}</Text> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PROJECT</Text>
            <Text style={styles.cardValue}>{proposal.projectTitle}</Text>
            <Text style={styles.cardSubvalue}>Payment terms: {depositPercent ? `${depositPercent}% deposit` : "As agreed"}</Text>
            {proposal.validUntil ? <Text style={styles.cardSubvalue}>Valid until: {proposal.validUntil}</Text> : null}
          </View>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.cell, styles.tableHeaderText, { width: "47%" }]}>DESCRIPTION</Text>
            <Text style={[styles.cell, styles.tableHeaderText, styles.right, { width: "9%" }]}>QTY</Text>
            <Text style={[styles.cell, styles.tableHeaderText, styles.right, { width: "20%" }]}>UNIT PRICE</Text>
            <Text style={[styles.cell, styles.tableHeaderText, styles.right, { width: "24%" }]}>AMOUNT</Text>
          </View>
          {rows.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <View style={[styles.cell, { width: "47%" }]}><Text style={styles.cellStrong}>{item.name}</Text><Text>{item.description}</Text></View>
              <Text style={[styles.cell, styles.right, { width: "9%" }]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.right, { width: "20%" }]}>{money(item.price, currency)}</Text>
              <Text style={[styles.cell, styles.right, { width: "24%" }]}>{money(item.price * item.quantity, currency)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryRow}><Text>Subtotal</Text><Text>{money(total, currency)}</Text></View>
          {depositPercent ? <View style={styles.summaryRow}><Text>Deposit ({depositPercent}%)</Text><Text>{money(total * depositPercent / 100, currency)}</Text></View> : null}
          <View style={styles.totalRow}><Text style={styles.totalText}>TOTAL</Text><Text style={styles.totalText}>{money(total, currency)}</Text></View>
        </View>
        {proposal.terms?.additionalTerms ? <View style={styles.section} wrap={false}><Text style={styles.sectionTitle}>Payment Terms</Text><Text style={styles.notes}>{proposal.terms.additionalTerms}</Text></View> : null}
        <PageFooter company={company} />
      </Page>
    </Document>
  );
}

function ProposalDocument({ proposal, company, items }: PdfProps) {
  const rows = selectedItems(proposal, items);
  return (
    <Document title={`Proposal - ${proposal.projectTitle}`} author={company.businessName}>
      <Page size="A4" style={styles.page} wrap>
        <CompanyHeader company={company} title="PROPOSAL" number={`Proposal #${proposal.id}`} />
        <View style={styles.cards} wrap={false}>
          <View style={styles.card}><Text style={styles.cardLabel}>PREPARED FOR</Text><Text style={styles.cardValue}>{proposal.clientName}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>PROJECT</Text><Text style={styles.cardValue}>{proposal.projectTitle}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>VALID UNTIL</Text><Text style={styles.cardValue}>{proposal.validUntil || "Further notice"}</Text></View>
        </View>
        {proposal.projectDescription ? <View style={styles.section} wrap={false}><Text style={styles.sectionTitle}>Project Overview</Text><Text style={styles.overview}>{proposal.projectDescription}</Text></View> : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.cell, styles.tableHeaderText, { width: "36%" }]}>SERVICE</Text>
              <Text style={[styles.cell, styles.tableHeaderText, { width: "56%" }]}>DELIVERABLES</Text>
              <Text style={[styles.cell, styles.tableHeaderText, styles.right, { width: "8%" }]}>QTY</Text>
            </View>
            {rows.map((item) => (
              <View key={item.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, styles.cellStrong, { width: "36%" }]}>{item.name}</Text>
                <Text style={[styles.cell, { width: "56%" }]}>{item.description}</Text>
                <Text style={[styles.cell, styles.right, { width: "8%" }]}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Project Terms</Text>
          <View style={styles.termsRow}>
            <View style={styles.termCard}><Text style={styles.termLabel}>TIMELINE</Text><Text style={styles.termText}>{proposal.terms?.timeline || "To be agreed"}</Text></View>
            <View style={styles.termCard}><Text style={styles.termLabel}>PAYMENT</Text><Text style={styles.termText}>{proposal.terms?.depositPercent ? `${proposal.terms.depositPercent}% deposit required` : "As agreed"}</Text></View>
          </View>
        </View>
        {proposal.terms?.additionalTerms ? <View style={styles.section} wrap={false}><Text style={styles.termLabel}>TERMS & CONDITIONS</Text><Text style={styles.notes}>{proposal.terms.additionalTerms}</Text></View> : null}
        {proposal.notes ? <View style={styles.section}><Text style={styles.sectionTitle}>Proposal</Text><ProposalContent notes={proposal.notes} /></View> : null}
        {proposal.attachments?.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Reference Links</Text>{proposal.attachments.map((attachment) => <Text key={attachment.id} style={styles.resource}>{attachment.label}: {attachment.url}</Text>)}</View> : null}
        <PageFooter company={company} />
      </Page>
    </Document>
  );
}

export async function generateProfessionalPdfs(
  proposal: Proposal,
  company: CompanyBranding,
  items: ProposalItem[],
) {
  const [invoice, proposalPdf] = await Promise.all([
    renderToBuffer(<InvoiceDocument proposal={proposal} company={company} items={items} />),
    renderToBuffer(<ProposalDocument proposal={proposal} company={company} items={items} />),
  ]);

  return {
    invoicePdfBase64: invoice.toString("base64"),
    pdfBase64: proposalPdf.toString("base64"),
    invoice,
    proposal: proposalPdf,
  };
}
