import type { CitationFormatter, ReferenceSource } from "./index";

/** Format author names for APA: "Smith, J. A." */
function formatAuthorApa(name: string): string {
  const parts = name.split(/,\s*/);
  if (parts.length === 2) {
    // Already "Last, First" format
    const initials = parts[1]
      .split(/\s+/)
      .map((n) => n.charAt(0).toUpperCase() + ".")
      .join(" ");
    return `${parts[0]}, ${initials}`;
  }
  // "First Last" format
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  const last = words[words.length - 1];
  const initials = words
    .slice(0, -1)
    .map((n) => n.charAt(0).toUpperCase() + ".")
    .join(" ");
  return `${last}, ${initials}`;
}

function formatAuthorsApa(authors: string[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatAuthorApa(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorApa(authors[0])} & ${formatAuthorApa(authors[1])}`;
  }
  // 3+ authors: first author, et al. for in-text; all for bibliography
  return (
    authors.slice(0, -1).map(formatAuthorApa).join(", ") +
    ", & " +
    formatAuthorApa(authors[authors.length - 1])
  );
}

function formatInTextAuthors(authors: string[]): string {
  if (authors.length === 0) return "Unknown";
  const lastName = (name: string) => {
    const parts = name.split(/,\s*/);
    if (parts.length >= 2) return parts[0];
    const words = name.trim().split(/\s+/);
    return words[words.length - 1];
  };
  if (authors.length === 1) return lastName(authors[0]);
  if (authors.length === 2) return `${lastName(authors[0])} & ${lastName(authors[1])}`;
  return `${lastName(authors[0])} et al.`;
}

export class ApaFormatter implements CitationFormatter {
  formatInText(source: ReferenceSource): string {
    const author = formatInTextAuthors(source.authors);
    const year = source.year || "n.d.";
    return `(${author}, ${year})`;
  }

  formatBibliography(source: ReferenceSource): string {
    const parts: string[] = [];

    // Authors
    const authors = formatAuthorsApa(source.authors);
    if (authors) parts.push(authors);

    // Year
    parts.push(`(${source.year || "n.d."}).`);

    // Title
    if (source.type === "journal" || source.type === "conference") {
      parts.push(`${source.title}.`);
    } else {
      parts.push(`<em>${source.title}</em>.`);
    }

    // Journal/conference name (italic)
    if (source.journal) {
      parts.push(`<em>${source.journal}</em>`);
      const volIssue: string[] = [];
      if (source.volume) volIssue.push(source.volume);
      if (source.issue) volIssue.push(`(${source.issue})`);
      if (volIssue.length > 0) parts.push(volIssue.join(""));
      if (source.pages) parts.push(`, ${source.pages}.`);
      else parts.push(".");
    }

    // Publisher
    if (source.publisher && source.type !== "journal") {
      parts.push(`${source.publisher}.`);
    }

    // URL/DOI
    if (source.doi) {
      parts.push(`https://doi.org/${source.doi}`);
    } else if (source.url) {
      parts.push(source.url);
    }

    return parts.join(" ");
  }

  sortBibliography(sources: ReferenceSource[]): ReferenceSource[] {
    return [...sources].sort((a, b) => {
      const aAuthor = a.authors[0] || a.title;
      const bAuthor = b.authors[0] || b.title;
      return aAuthor.localeCompare(bAuthor);
    });
  }

  formatFootnote(source: ReferenceSource): string {
    return this.formatBibliography(source);
  }
}
