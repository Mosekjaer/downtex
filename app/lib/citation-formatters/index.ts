// ---- Reference Source ----

export interface ReferenceSource {
  id: string;
  type: "journal" | "book" | "website" | "conference" | "thesis" | "other";
  title: string;
  authors: string[];
  year?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  pages?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  accessedDate?: string;
  createdAt: string;
}

// ---- Citation Standard ----

export type CitationStandard = "apa" | "harvard" | "ieee" | "chicago";

// ---- Document Layout Settings ----

export interface DocumentLayoutSettings {
  citationStandard: CitationStandard;
  tocEnabled: boolean;
  tocDepth: number;
  frontPageEnabled: boolean;
  frontPageTitle: string;
  frontPageSubtitle: string;
  frontPageAuthors: string;
  frontPageInstitution: string;
  frontPageDate: string;
  frontPageCustomField: string;
  headerContent: "title" | "section" | "custom" | "none";
  headerCustomText: string;
  footerPageFormat: "number" | "pageXofY" | "roman" | "none";
  pageNumberStart: "after-frontmatter" | "from-first";
}

export const DEFAULT_SETTINGS: DocumentLayoutSettings = {
  citationStandard: "apa",
  tocEnabled: true,
  tocDepth: 3,
  frontPageEnabled: true,
  frontPageTitle: "",
  frontPageSubtitle: "",
  frontPageAuthors: "",
  frontPageInstitution: "",
  frontPageDate: "",
  frontPageCustomField: "",
  headerContent: "title",
  headerCustomText: "",
  footerPageFormat: "number",
  pageNumberStart: "after-frontmatter",
};

// ---- Citation Formatter Interface ----

export interface CitationFormatter {
  /** Format an in-text citation marker. Order is the citation's position number in the document. */
  formatInText(source: ReferenceSource, order: number): string;

  /** Format a bibliography entry */
  formatBibliography(source: ReferenceSource): string;

  /** Sort sources for the bibliography section */
  sortBibliography(sources: ReferenceSource[]): ReferenceSource[];

  /** Format a page footnote entry */
  formatFootnote(source: ReferenceSource): string;
}

// ---- Formatter Factory ----

import { ApaFormatter } from "./apa";
import { HarvardFormatter } from "./harvard";
import { IeeeFormatter } from "./ieee";
import { ChicagoFormatter } from "./chicago";

const formatters: Record<CitationStandard, CitationFormatter> = {
  apa: new ApaFormatter(),
  harvard: new HarvardFormatter(),
  ieee: new IeeeFormatter(),
  chicago: new ChicagoFormatter(),
};

export function getFormatter(standard: CitationStandard): CitationFormatter {
  return formatters[standard] ?? formatters.apa;
}
