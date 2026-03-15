import type { CitationFormatter, ReferenceSource } from "./index";

function formatAuthorIeee(name: string): string {
  const parts = name.split(/,\s*/);
  if (parts.length === 2) {
    const initials = parts[1]
      .split(/\s+/)
      .map((n) => n.charAt(0).toUpperCase() + ".")
      .join(" ");
    return `${initials} ${parts[0]}`;
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  const last = words[words.length - 1];
  const initials = words
    .slice(0, -1)
    .map((n) => n.charAt(0).toUpperCase() + ".")
    .join(" ");
  return `${initials} ${last}`;
}

export class IeeeFormatter implements CitationFormatter {
  formatInText(_source: ReferenceSource, order: number): string {
    return `[${order}]`;
  }

  formatBibliography(source: ReferenceSource): string {
    const parts: string[] = [];
    const authors = source.authors.map(formatAuthorIeee).join(", ");
    if (authors) parts.push(`${authors},`);

    parts.push(`\u201C${source.title},\u201D`);

    if (source.journal) {
      parts.push(`<em>${source.journal}</em>,`);
      if (source.volume) parts.push(`vol. ${source.volume},`);
      if (source.issue) parts.push(`no. ${source.issue},`);
      if (source.pages) parts.push(`pp. ${source.pages},`);
    }

    if (source.publisher && source.type !== "journal") {
      parts.push(`${source.publisher},`);
    }

    if (source.year) parts.push(`${source.year}.`);
    else parts.push("n.d.");

    if (source.doi) {
      parts.push(`doi: ${source.doi}.`);
    } else if (source.url) {
      parts.push(`[Online]. Available: ${source.url}`);
    }

    return parts.join(" ");
  }

  sortBibliography(sources: ReferenceSource[]): ReferenceSource[] {
    // IEEE: order of first appearance (already in order)
    return [...sources];
  }

  formatFootnote(source: ReferenceSource): string {
    return this.formatBibliography(source);
  }
}
