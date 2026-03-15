import type { ReferenceSource } from "~/lib/citation-formatters";

interface LookupResult {
  success: boolean;
  partial?: boolean;
  source?: Partial<ReferenceSource>;
  error?: string;
}

interface CrossRefWork {
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  publisher?: string;
  DOI?: string;
  URL?: string;
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  type?: string;
}

function crossRefTypeToSourceType(
  crType: string | undefined,
): ReferenceSource["type"] {
  switch (crType) {
    case "journal-article":
      return "journal";
    case "book":
    case "book-chapter":
    case "monograph":
      return "book";
    case "proceedings-article":
      return "conference";
    case "dissertation":
      return "thesis";
    default:
      return "other";
  }
}

export async function lookupDoi(doi: string): Promise<LookupResult> {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, "").trim();
  if (!cleanDoi) {
    return { success: false, error: "No DOI provided." };
  }

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: {
        "User-Agent": "Downtex/1.0 (mailto:contact@downtex.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return {
        success: false,
        error: "Could not resolve DOI. Please enter details manually.",
      };
    }

    const json = (await res.json()) as { message: CrossRefWork };
    const work = json.message;

    const dateParts =
      work["published-print"]?.["date-parts"]?.[0] ??
      work["published-online"]?.["date-parts"]?.[0];
    const year = dateParts?.[0]?.toString() ?? "";

    const authors = (work.author ?? []).map((a) => {
      const parts = [a.given, a.family].filter(Boolean);
      return parts.join(" ");
    });

    const source: Partial<ReferenceSource> = {
      type: crossRefTypeToSourceType(work.type),
      title: work.title?.[0] ?? "",
      authors,
      year,
      publisher: work.publisher ?? "",
      doi: work.DOI ?? cleanDoi,
      url: work.URL ?? `https://doi.org/${cleanDoi}`,
      journal: work["container-title"]?.[0] ?? "",
      volume: work.volume ?? "",
      issue: work.issue ?? "",
      pages: work.page ?? "",
    };

    const partial = !source.title || authors.length === 0;

    return { success: true, partial, source };
  } catch {
    return {
      success: false,
      error: "Failed to fetch DOI metadata. Please try again or enter details manually.",
    };
  }
}

export async function lookupUrl(url: string): Promise<LookupResult> {
  if (!url.trim()) {
    return { success: false, error: "No URL provided." };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Downtex/1.0 (mailto:contact@downtex.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        success: false,
        error: "Could not fetch URL. Please enter details manually.",
      };
    }

    const html = await res.text();

    const getMeta = (name: string): string => {
      // Match both name= and property= attributes
      const patterns = [
        new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
      return "";
    };

    const title =
      getMeta("og:title") ||
      getMeta("citation_title") ||
      getMeta("dc.title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      "";

    const authorMeta =
      getMeta("citation_author") || getMeta("author") || getMeta("dc.creator") || "";
    const authors = authorMeta ? authorMeta.split(/[;,]/).map((a) => a.trim()).filter(Boolean) : [];

    const year =
      getMeta("citation_date")?.slice(0, 4) ||
      getMeta("citation_publication_date")?.slice(0, 4) ||
      getMeta("dc.date")?.slice(0, 4) ||
      "";

    const doi = getMeta("citation_doi") || getMeta("dc.identifier") || "";

    const source: Partial<ReferenceSource> = {
      type: "website",
      title,
      authors,
      year,
      url,
      doi: doi || undefined,
      journal: getMeta("citation_journal_title") || undefined,
      volume: getMeta("citation_volume") || undefined,
      issue: getMeta("citation_issue") || undefined,
      pages: getMeta("citation_firstpage") || undefined,
    };

    return { success: true, partial: !title, source };
  } catch {
    return {
      success: false,
      error: "Failed to fetch URL. Please try again or enter details manually.",
    };
  }
}
