import type { CitationFormatter, ReferenceSource } from "./index";

function getLastName(name: string): string {
  const parts = name.split(/,\s*/);
  if (parts.length >= 2) return parts[0];
  const words = name.trim().split(/\s+/);
  return words[words.length - 1];
}

function formatAuthorHarvard(name: string): string {
  const parts = name.split(/,\s*/);
  if (parts.length === 2) {
    const initials = parts[1]
      .split(/\s+/)
      .map((n) => n.charAt(0).toUpperCase() + ".")
      .join(" ");
    return `${parts[0]}, ${initials}`;
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  const last = words[words.length - 1];
  const initials = words
    .slice(0, -1)
    .map((n) => n.charAt(0).toUpperCase() + ".")
    .join(" ");
  return `${last}, ${initials}`;
}

export class HarvardFormatter implements CitationFormatter {
  formatInText(source: ReferenceSource): string {
    const authors = source.authors;
    let authorText: string;
    if (authors.length === 0) authorText = "Unknown";
    else if (authors.length === 1) authorText = getLastName(authors[0]);
    else if (authors.length === 2)
      authorText = `${getLastName(authors[0])} & ${getLastName(authors[1])}`;
    else authorText = `${getLastName(authors[0])} et al.`;

    const year = source.year || "n.d.";
    return `(${authorText} ${year})`;
  }

  formatBibliography(source: ReferenceSource): string {
    const parts: string[] = [];
    const authors = source.authors.map(formatAuthorHarvard).join(", ");
    if (authors) parts.push(authors);

    parts.push(`(${source.year || "n.d."}).`);
    parts.push(`<em>${source.title}</em>.`);

    if (source.journal) {
      parts.push(`${source.journal}`);
      if (source.volume) parts.push(`, vol. ${source.volume}`);
      if (source.issue) parts.push(`, no. ${source.issue}`);
      if (source.pages) parts.push(`, pp. ${source.pages}`);
      parts.push(".");
    }

    if (source.publisher && source.type !== "journal") {
      parts.push(`${source.publisher}.`);
    }

    if (source.doi) {
      parts.push(`https://doi.org/${source.doi}`);
    } else if (source.url) {
      parts.push(`Available at: ${source.url}`);
      if (source.accessedDate) parts.push(`(Accessed: ${source.accessedDate}).`);
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
