import type { CitationFormatter, ReferenceSource } from "./index";

function getLastName(name: string): string {
  const parts = name.split(/,\s*/);
  if (parts.length >= 2) return parts[0];
  const words = name.trim().split(/\s+/);
  return words[words.length - 1];
}

function formatAuthorChicago(name: string, invert: boolean): string {
  const parts = name.split(/,\s*/);
  if (parts.length === 2) {
    return invert ? `${parts[0]}, ${parts[1]}` : `${parts[1]} ${parts[0]}`;
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  const last = words[words.length - 1];
  const first = words.slice(0, -1).join(" ");
  return invert ? `${last}, ${first}` : `${first} ${last}`;
}

export class ChicagoFormatter implements CitationFormatter {
  formatInText(source: ReferenceSource): string {
    const authors = source.authors;
    let authorText: string;
    if (authors.length === 0) authorText = "Unknown";
    else if (authors.length === 1) authorText = getLastName(authors[0]);
    else if (authors.length === 2)
      authorText = `${getLastName(authors[0])} and ${getLastName(authors[1])}`;
    else authorText = `${getLastName(authors[0])} et al.`;

    const year = source.year || "n.d.";
    const pagesPart = source.pages ? `, ${source.pages}` : "";
    return `(${authorText} ${year}${pagesPart})`;
  }

  formatBibliography(source: ReferenceSource): string {
    const parts: string[] = [];

    // Authors: first author inverted, rest normal
    if (source.authors.length > 0) {
      const formatted = source.authors.map((a, i) => formatAuthorChicago(a, i === 0));
      if (formatted.length === 1) parts.push(`${formatted[0]}.`);
      else if (formatted.length === 2) parts.push(`${formatted[0]}, and ${formatted[1]}.`);
      else
        parts.push(`${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}.`);
    }

    // Title
    if (source.type === "journal" || source.type === "conference") {
      parts.push(`\u201C${source.title}.\u201D`);
    } else {
      parts.push(`<em>${source.title}</em>.`);
    }

    // Journal
    if (source.journal) {
      parts.push(`<em>${source.journal}</em>`);
      if (source.volume) parts.push(source.volume);
      if (source.issue) parts.push(`, no. ${source.issue}`);
      if (source.year) parts.push(`(${source.year})`);
      if (source.pages) parts.push(`: ${source.pages}`);
      parts.push(".");
    } else if (source.publisher) {
      parts.push(`${source.publisher},`);
      parts.push(`${source.year || "n.d."}.`);
    }

    if (source.doi) {
      parts.push(`https://doi.org/${source.doi}.`);
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
